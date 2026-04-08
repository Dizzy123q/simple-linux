from simple_linux.logic.services_manager import get_all_services, get_service_details
from simple_linux.logic.man_parser import get_man_page
from simple_linux.logic.translator import translate
from simple_linux.logic.config import load_config, save_config
from simple_linux.logic.system_info import get_system_info
from simple_linux.logic.scheduled import get_all_scheduled
from simple_linux.logic.logs import get_log_categories, get_logs
import subprocess
import os


class Api:
    """
    Main API class exposed to the frontend via pywebview.
    All public methods are callable from JavaScript as window.pywebview.api.<method>.
    """

    # ─── SERVICES ────────────────────────────────────────────

    def get_services(self) -> list:
        """Returns all systemd services with their current status."""
        return get_all_services()

    def get_service_details(self, name: str) -> dict:
        """
        Returns detailed info for a specific service.
        Also checks if a man page exists for it and adds has_man to the result.
        """
        result = get_service_details(name)
        result["has_man"] = self._has_man(name)
        return result

    # ─── MAN PAGE ────────────────────────────────────────────

    def get_man_page(self, query: str) -> dict:
        """Fetches and parses the man page for a given command or command + flags."""
        return get_man_page(query)

    # ─── TRANSLATE ───────────────────────────────────────────

    def translate(self, text: str) -> dict:
        """Translates text using the DeepL API with the key and language from config."""
        return translate(text)

    # ─── SETTINGS ────────────────────────────────────────────

    def get_settings(self) -> dict:
        """Returns the current config (API key, target language, zoom level)."""
        return load_config()

    def save_settings(self, data: dict) -> dict:
        """
        Saves the provided config dict to disk.
        Returns {"success": True} or {"success": False, "error": str}.
        """
        try:
            save_config(data)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    # ─── ENVIRONMENT ─────────────────────────────────────────

    def get_env_variables(self) -> list:
        """Returns all environment variables as a sorted list of {name, value} dicts."""
        return sorted(
            [{"name": k, "value": v} for k, v in os.environ.items()],
            key=lambda x: x["name"]
        )

    # ─── ZOOM ────────────────────────────────────────────────

    def get_zoom(self) -> float:
        """Returns the current zoom level from config. Defaults to 1.0."""
        return load_config().get("zoom", 1.0)

    def save_zoom(self, zoom: float) -> None:
        """Saves the zoom level to config without overwriting other settings."""
        config = load_config()
        config["zoom"] = round(zoom, 1)
        save_config(config)

    # ─── SYSTEM INFO ─────────────────────────────────────────

    def get_system_info(self) -> dict:
        """Returns full system info: OS, CPU, RAM, GPU, disk, uptime and network."""
        return get_system_info()

    # ─── SCHEDULED ───────────────────────────────────────────

    def get_scheduled(self) -> list:
        """Returns all scheduled tasks — systemd timers and cron jobs combined."""
        return get_all_scheduled()

    # ─── LOGS ────────────────────────────────────────────────

    def get_log_categories(self) -> list:
        """Returns the list of available log categories for the UI."""
        return get_log_categories()

    def get_logs(self, category: str, lines: int = 100) -> dict:
        """Fetches the last N lines of logs for a given category."""
        return get_logs(category, lines)

    # ─── HELPERS ─────────────────────────────────────────────

    def _has_man(self, name: str) -> bool:
        """Checks if a man page exists for the given name using 'man -w'."""
        try:
            result = subprocess.run(
                ["man", "-w", name],
                capture_output=True, text=True, timeout=3
            )
            return result.returncode == 0
        except Exception:
            return False