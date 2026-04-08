import json
import os

# Absolute path to the config file, located in the same directory as this file
CONFIG_PATH = os.path.join(os.path.dirname(__file__), "config.json")


def load_config() -> dict:
    """
    Loads the config from config.json.
    If the file doesn't exist, returns default values.
    """
    if os.path.exists(CONFIG_PATH):
        with open(CONFIG_PATH, "r") as f:
            return json.load(f)
    return {"deepl_key": "", "target_lang": "RO", "zoom": 1.0}


def save_config(data: dict):
    """
    Saves the config dict to config.json.
    Overwrites the existing file.
    """
    with open(CONFIG_PATH, "w") as f:
        json.dump(data, f, indent=2)