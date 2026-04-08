import subprocess


def get_systemd_timers() -> list:
    """
    Returns all systemd timers on the system with their schedule and next run time.
    Reads the timer unit file directly to get a human-readable schedule.

    Returns a list of {"name": str, "schedule": str, "next": str, "type": "timer"}.
    """
    try:
        result = subprocess.run(
            ["systemctl", "list-timers", "--all", "--no-pager", "--no-legend"],
            capture_output=True, text=True, timeout=10
        )
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return []

    timers = []
    for line in result.stdout.splitlines():
        parts = line.split()
        if len(parts) < 8:
            continue

        next_run = f"{parts[0]} {parts[1]}" if len(parts) > 1 else "—"

        # Find the timer name in the line (ends with .timer)
        name = ""
        for part in parts:
            if part.endswith(".timer"):
                name = part.replace(".timer", "")
                break

        if not name:
            continue

        schedule = _get_on_calendar(name)
        timers.append({
            "name": name,
            "schedule": schedule,
            "next": next_run,
            "type": "timer"
        })

    return timers


def _get_on_calendar(name: str) -> str:
    """
    Reads the timer unit file to extract a human-readable schedule.
    Checks for OnCalendar, OnBootSec, and OnUnitInactiveSec in that order.
    Falls back to "systemd" if nothing is found.
    """
    try:
        # Get the path to the unit file via systemctl
        result = subprocess.run(
            ["systemctl", "show", f"{name}.timer", "--property=FragmentPath"],
            capture_output=True, text=True, timeout=5
        )
        path = ""
        for line in result.stdout.splitlines():
            if line.startswith("FragmentPath="):
                path = line.split("=", 1)[1].strip()
                break

        if not path:
            return "systemd"

        # Read the unit file and look for schedule directives
        with open(path, "r") as f:
            content = f.read()

        for line in content.splitlines():
            line = line.strip()
            if line.startswith("OnCalendar="):
                return line.split("=", 1)[1].strip()
            if line.startswith("OnBootSec="):
                return f"boot + {line.split('=', 1)[1].strip()}"
            if line.startswith("OnUnitInactiveSec="):
                return f"every {line.split('=', 1)[1].strip()}"

    except Exception:
        pass

    return "systemd"


def get_cron_jobs() -> list:
    """
    Returns cron jobs from two sources:
    - The current user's crontab (via crontab -l)
    - System-wide jobs in /etc/cron.d/

    Returns a list of {"name": str, "schedule": str, "next": str, "type": "cron"}.
    Note: next run time is not available for cron jobs, so it defaults to "—".
    """
    jobs = []

    # User crontab
    try:
        result = subprocess.run(
            ["crontab", "-l"],
            capture_output=True, text=True, timeout=5
        )
        if result.returncode == 0:
            for line in result.stdout.splitlines():
                line = line.strip()
                if not line or line.startswith("#"):
                    continue
                parts = line.split(None, 5)
                if len(parts) < 6:
                    continue
                schedule = " ".join(parts[:5])
                command = parts[5]
                jobs.append({
                    "name": command.split("/")[-1][:30],
                    "schedule": schedule,
                    "next": "—",
                    "type": "cron"
                })
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    # System-wide cron jobs in /etc/cron.d/
    try:
        result = subprocess.run(
            ["ls", "/etc/cron.d/"],
            capture_output=True, text=True, timeout=5
        )
        for name in result.stdout.splitlines():
            name = name.strip()
            if not name:
                continue
            jobs.append({
                "name": name,
                "schedule": "/etc/cron.d/",
                "next": "—",
                "type": "cron"
            })
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass

    return jobs


def get_all_scheduled() -> list:
    """
    Returns all scheduled tasks on the system — both systemd timers and cron jobs.
    Sorted alphabetically by name.
    """
    timers = get_systemd_timers()
    crons = get_cron_jobs()
    all_jobs = timers + crons
    all_jobs.sort(key=lambda x: x["name"].lower())
    return all_jobs