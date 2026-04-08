import subprocess


def get_all_services() -> list:
    """
    Returns all systemd services on the system with their current status.
    Combines data from list-unit-files (all known services) and
    list-units (currently loaded services) to get accurate statuses.

    Returns a list of {"name": str, "status": str}
    where status is one of: "active", "inactive", "failed".
    Sorted by status (active first, then failed, then inactive), then alphabetically.
    """
    try:
        # Get all known service files, including inactive ones
        unit_files = subprocess.run(
            ["systemctl", "list-unit-files", "--type=service", "--no-pager", "--no-legend"],
            capture_output=True, text=True, timeout=10
        )

        # Get currently loaded services with their runtime status
        units = subprocess.run(
            ["systemctl", "list-units", "--type=service", "--all", "--no-pager", "--no-legend"],
            capture_output=True, text=True, timeout=10
        )

    except FileNotFoundError:
        return []
    except subprocess.TimeoutExpired:
        return []

    # Parse unit-files → {name: enabled/disabled}
    unit_file_map = {}
    for line in unit_files.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 1:
            name = parts[0].replace(".service", "")
            unit_file_map[name] = parts[1] if len(parts) >= 2 else "unknown"

    # Parse units → {name: active/inactive/failed}
    unit_status_map = {}
    for line in units.stdout.splitlines():
        parts = line.split()
        if len(parts) >= 3:
            name = parts[0].replace(".service", "")
            active_state = parts[2]
            unit_status_map[name] = active_state

    # Merge: use runtime status if available, fall back to "inactive"
    services = []
    for name in unit_file_map:
        status = unit_status_map.get(name, "inactive")
        services.append({"name": name, "status": status})

    # Sort: active first, then failed, then inactive
    order = {"active": 0, "failed": 1, "inactive": 2}
    services.sort(key=lambda s: (order.get(s["status"], 3), s["name"]))

    return services


def get_service_details(name: str) -> dict:
    """
    Returns detailed information about a specific systemd service.

    Returns {"success": True, "name": str, "description": str,
             "status": str, "pid": str, "load_state": str}
    or {"success": False, "error": str} on failure.
    """
    try:
        result = subprocess.run(
            ["systemctl", "show", f"{name}.service",
             "--property=Description,ActiveState,SubState,MainPID,LoadState"],
            capture_output=True, text=True, timeout=5
        )
    except FileNotFoundError:
        return {"success": False, "error": "systemctl not found on this system."}
    except subprocess.TimeoutExpired:
        return {"success": False, "error": "Timeout."}

    if result.returncode != 0:
        return {"success": False, "error": f"Could not get details for '{name}'."}

    # Parse key=value pairs from systemctl output
    props = {}
    for line in result.stdout.splitlines():
        if "=" in line:
            key, _, value = line.partition("=")
            props[key.strip()] = value.strip()

    # Combine ActiveState and SubState for a more descriptive status
    status = props.get("ActiveState", "unknown")
    sub_state = props.get("SubState", "")
    full_status = f"{status} ({sub_state})" if sub_state else status

    return {
        "success": True,
        "name": name,
        "description": props.get("Description", "No description available."),
        "status": full_status,
        "pid": props.get("MainPID", "—"),
        "load_state": props.get("LoadState", "unknown"),
    }