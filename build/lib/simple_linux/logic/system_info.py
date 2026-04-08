import subprocess
import platform
import psutil
import os


def get_os_info() -> dict:
    """
    Returns basic OS information: distro name, kernel version, architecture and hostname.
    Reads /etc/os-release for the distro name, falls back to platform.system().
    """
    try:
        distro = ""
        if os.path.exists("/etc/os-release"):
            with open("/etc/os-release") as f:
                for line in f:
                    if line.startswith("PRETTY_NAME="):
                        distro = line.split("=")[1].strip().strip('"')
                        break
        return {
            "distro": distro or platform.system(),
            "kernel": platform.release(),
            "arch": platform.machine(),
            "hostname": platform.node(),
        }
    except Exception as e:
        return {"error": str(e)}


def get_cpu_info() -> dict:
    """
    Returns CPU usage, model, core count, frequency and temperature.
    Reads /proc/cpuinfo for the model name.
    Temperature is read via psutil sensors — tries common sensor keys
    for Intel (coretemp), AMD (k10temp, zenpower) and ARM (cpu_thermal).
    """
    try:
        usage = psutil.cpu_percent(interval=0.5)
        freq = psutil.cpu_freq()
        cores = psutil.cpu_count(logical=False)
        threads = psutil.cpu_count(logical=True)

        model = ""
        try:
            with open("/proc/cpuinfo") as f:
                for line in f:
                    if "model name" in line:
                        model = line.split(":")[1].strip()
                        break
        except Exception:
            model = platform.processor()

        temp = None
        try:
            temps = psutil.sensors_temperatures()
            for key in ["coretemp", "k10temp", "zenpower", "cpu_thermal"]:
                if key in temps and temps[key]:
                    temp = round(temps[key][0].current, 1)
                    break
        except Exception:
            pass

        return {
            "model": model,
            "cores": cores,
            "threads": threads,
            "freq_ghz": round(freq.current / 1000, 1) if freq else None,
            "usage": round(usage, 1),
            "temp": temp,
        }
    except Exception as e:
        return {"error": str(e)}


def get_ram_info() -> dict:
    """
    Returns total, used and available RAM in GB, plus usage percentage.
    Uses psutil virtual_memory — "free" reflects available memory, not just unused.
    """
    try:
        ram = psutil.virtual_memory()
        return {
            "total_gb": round(ram.total / 1024**3, 1),
            "used_gb": round(ram.used / 1024**3, 1),
            "free_gb": round(ram.available / 1024**3, 1),
            "percent": round(ram.percent, 1),
        }
    except Exception as e:
        return {"error": str(e)}


def get_disk_info() -> list:
    """
    Returns disk usage for all mounted partitions, excluding loop devices (snaps).
    Each entry contains mountpoint, total/used/free in GB and usage percentage.
    """
    try:
        partitions = []
        for part in psutil.disk_partitions():
            if "loop" in part.device:
                continue
            try:
                usage = psutil.disk_usage(part.mountpoint)
                partitions.append({
                    "mountpoint": part.mountpoint,
                    "total_gb": round(usage.total / 1024**3, 1),
                    "used_gb": round(usage.used / 1024**3, 1),
                    "free_gb": round(usage.free / 1024**3, 1),
                    "percent": round(usage.percent, 1),
                })
            except Exception:
                continue
        return partitions
    except Exception as e:
        return [{"error": str(e)}]


def get_gpu_info() -> dict:
    """
    Returns GPU info: model, usage, VRAM, temperature and driver version.
    Tries three detection methods in order:
    1. nvidia-smi for NVIDIA GPUs
    2. rocm-smi for AMD GPUs
    3. lspci as a fallback (model name only, no usage data)
    """

    # NVIDIA
    try:
        result = subprocess.run(
            ["nvidia-smi", "--query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu,driver_version",
             "--format=csv,noheader,nounits"],
            capture_output=True, text=True, timeout=3
        )
        if result.returncode == 0:
            parts = [p.strip() for p in result.stdout.strip().split(",")]
            return {
                "vendor": "nvidia",
                "model": parts[0],
                "usage": float(parts[1]),
                "vram_used_gb": round(float(parts[2]) / 1024, 1),
                "vram_total_gb": round(float(parts[3]) / 1024, 1),
                "temp": float(parts[4]),
                "driver": parts[5],
            }
    except Exception:
        pass

    # AMD
    try:
        result = subprocess.run(
            ["rocm-smi", "--showuse", "--showtemp", "--showmeminfo", "vram", "--json"],
            capture_output=True, text=True, timeout=3
        )
        if result.returncode == 0:
            import json
            data = json.loads(result.stdout)
            card = list(data.values())[0]
            return {
                "vendor": "amd",
                "model": card.get("Card Series", "AMD GPU"),
                "usage": float(card.get("GPU use (%)", 0)),
                "vram_used_gb": round(float(card.get("VRAM Total Used Memory (B)", 0)) / 1024**3, 1),
                "vram_total_gb": round(float(card.get("VRAM Total Memory (B)", 0)) / 1024**3, 1),
                "temp": float(card.get("Temperature (Sensor edge) (°C)", 0)),
                "driver": None,
            }
    except Exception:
        pass

    # Fallback — lspci (model name only, no usage data)
    try:
        result = subprocess.run(
            ["lspci"],
            capture_output=True, text=True, timeout=3
        )
        for line in result.stdout.splitlines():
            if "VGA" in line or "3D" in line or "Display" in line:
                model = line.split(":")[-1].strip()
                return {
                    "vendor": "unknown",
                    "model": model,
                    "usage": None,
                    "vram_used_gb": None,
                    "vram_total_gb": None,
                    "temp": None,
                    "driver": None,
                }
    except Exception:
        pass

    return {"error": "GPU not detected"}


def get_uptime() -> str:
    """
    Returns system uptime as a human-readable string (e.g. "1d 4h", "3h 22m", "45m").
    Calculated from psutil boot time.
    """
    try:
        import time
        elapsed = int(time.time() - psutil.boot_time())
        days = elapsed // 86400
        hours = (elapsed % 86400) // 3600
        minutes = (elapsed % 3600) // 60
        if days > 0:
            return f"{days}d {hours}h"
        elif hours > 0:
            return f"{hours}h {minutes}m"
        else:
            return f"{minutes}m"
    except Exception:
        return "—"


def get_network_info() -> dict:
    """
    Returns info for all active network interfaces, excluding loopback (lo).
    Each entry contains the IPv4 address and total bytes sent/received in GB.
    """
    try:
        interfaces = {}
        net_io = psutil.net_io_counters(pernic=True)
        addrs = psutil.net_if_addrs()

        for name, addr_list in addrs.items():
            if name == "lo":
                continue
            ip = None
            for addr in addr_list:
                if addr.family.name == "AF_INET":
                    ip = addr.address
                    break
            io = net_io.get(name)
            interfaces[name] = {
                "ip": ip or "—",
                "bytes_recv_gb": round(io.bytes_recv / 1024**3, 2) if io else 0,
                "bytes_sent_gb": round(io.bytes_sent / 1024**3, 2) if io else 0,
            }
        return interfaces
    except Exception as e:
        return {"error": str(e)}


def get_system_info() -> dict:
    """
    Aggregates all system info into a single dict.
    Called by the API and refreshed every 2 seconds in the frontend.
    """
    return {
        "os": get_os_info(),
        "cpu": get_cpu_info(),
        "ram": get_ram_info(),
        "disk": get_disk_info(),
        "gpu": get_gpu_info(),
        "uptime": get_uptime(),
        "network": get_network_info(),
    }