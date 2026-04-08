import subprocess
import re


def parse_query(query: str) -> dict:
    """
    Parses the user's input into a command and optional parameters.

    Examples:
        "ls"      → {"command": "ls"}
        "ls -la"  → {"command": "ls", "params": ["-l", "-a"]}
        "ls foo"  → {"command": "ls", "error": "Invalid input: 'foo'."}
    """
    query = query.strip()
    parts = query.split()
    command = parts[0]

    if len(parts) == 1:
        return {"command": command}

    # Handle flags like -la (expands to ["-l", "-a"]) or --long
    params = []
    for part in parts[1:]:
        if part.startswith("-"):
            if part.startswith("--"):
                params.append(part)
            else:
                # -la → ["-l", "-a"]
                for char in part[1:]:
                    params.append(f"-{char}")
        else:
            return {"command": command, "error": f"Invalid input: '{part}'."}

    return {"command": command, "params": params}


def get_man_page(query: str) -> dict:
    """
    Fetches and parses the man page for a given command.
    If parameters are provided, filters the output to show only matching options.

    Returns {"success": True, "command": str, "sections": list}
    or {"success": False, "error": str} on failure.
    """
    parsed = parse_query(query)

    if "error" in parsed:
        return {"success": False, "error": parsed["error"]}

    command = parsed["command"]
    params = parsed.get("params")

    try:
        result = subprocess.run(
            ["man", command],
            env={"MANPAGER": "cat", "PATH": "/usr/bin:/bin:/usr/local/bin"},
            capture_output=True,
            text=True,
            timeout=5
        )
    except FileNotFoundError:
        return {"success": False, "error": "'man' command not found on this system."}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": f"Timeout while fetching manual for '{command}'."}

    if result.returncode != 0:
        return {"success": False, "error": f"No manual entry for '{command}'."}

    # Strip backspace formatting and ANSI escape codes from raw man output
    raw_text = result.stdout
    clean_text = re.sub(r'.\x08', '', raw_text)
    clean_text = re.sub(r'\x1b\[[0-9;]*m', '', clean_text)

    sections = parse_sections(clean_text)

    if not sections:
        return {"success": False, "error": f"Could not parse manual for '{command}'."}

    if params:
        return filter_params(command, sections, params)

    return {"success": True, "command": command, "sections": sections}


def parse_sections(text: str) -> list:
    """
    Splits a man page into sections based on uppercase section headers.
    Each section is a dict with "title" and "content".
    """
    sections = []
    current_title = None
    current_lines = []

    for line in text.splitlines():
        # Section headers are all-uppercase lines at the start of a line
        if re.match(r'^[A-Z][A-Z0-9 _-]{1,}$', line.rstrip()):
            if current_title is not None:
                content = "\n".join(current_lines).strip()
                if content:
                    sections.append({"title": current_title, "content": content})
            current_title = line.strip()
            current_lines = []
        else:
            if current_title is not None:
                current_lines.append(line)

    if current_title is not None:
        content = "\n".join(current_lines).strip()
        if content:
            sections.append({"title": current_title, "content": content})

    return sections


def filter_params(command: str, sections: list, params: list) -> dict:
    """
    Filters the man page sections to show only the blocks matching the given params.
    Looks in OPTIONS first, falls back to DESCRIPTION.

    Returns {"success": True, "sections": list} with matching option blocks,
    or {"success": False, "error": str} if nothing is found.
    """
    options_section = None
    for title in ("OPTIONS", "DESCRIPTION"):
        for section in sections:
            if section["title"] == title:
                options_section = section
                break
        if options_section:
            break

    if not options_section:
        return {"success": False, "error": f"No OPTIONS section found for '{command}'."}

    blocks = parse_option_blocks(options_section["content"])

    found_sections = []
    not_found = []

    for param in params:
        matched_block = None
        for block in blocks:
            if param_matches_block(param, block["header"]):
                matched_block = block
                break

        if matched_block:
            found_sections.append({
                "title": matched_block["header"],
                "content": matched_block["body"]
            })
        else:
            not_found.append(param)

    if not found_sections:
        return {
            "success": False,
            "error": f"Parameters {', '.join(params)} not found in OPTIONS for '{command}'."
        }

    if not_found:
        found_sections.append({
            "title": "NOT FOUND",
            "content": f"The following parameters were not found: {', '.join(not_found)}"
        })

    return {
        "success": True,
        "command": command,
        "sections": found_sections,
        "filtered_params": params
    }


def parse_option_blocks(options_text: str) -> list:
    """
    Splits the OPTIONS section text into individual option blocks.
    Each block has a "header" (the option line) and a "body" (its description).
    Detects option lines by indentation level and leading dash.
    """
    blocks = []
    current_header = None
    current_body_lines = []

    for line in options_text.splitlines():
        stripped = line.lstrip()
        indent = len(line) - len(stripped)

        # Option lines start with - or -- and have low indentation
        is_option_line = (
            indent <= 10
            and bool(re.match(r'-{1,2}\w', stripped))
        )

        if is_option_line:
            if current_header is not None:
                blocks.append({
                    "header": current_header,
                    "body": "\n".join(current_body_lines).strip()
                })
            current_header = stripped
            current_body_lines = []
        else:
            if current_header is not None:
                current_body_lines.append(stripped)

    if current_header is not None:
        blocks.append({
            "header": current_header,
            "body": "\n".join(current_body_lines).strip()
        })

    return blocks


def param_matches_block(param: str, header: str) -> bool:
    """
    Checks if a parameter (e.g. "-l") matches an option block header.
    Handles comma-separated options like "-l, --long".
    """
    option_part = re.split(r'\s{2,}|\t', header)[0].strip()
    pattern = r'(^|(?<=,\s)|(?<=\s))' + re.escape(param) + r'(?=[,\s]|$)'
    return bool(re.search(pattern, option_part))