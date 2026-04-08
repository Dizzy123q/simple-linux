import urllib.request
import urllib.parse
import json
from simple_linux.logic.config import load_config


def translate(text: str) -> dict:
    """
    Translates text using the DeepL API.
    Reads the API key and target language from the config.

    Returns {"success": True, "translation": str}
    or {"success": False, "error": str} on failure.
    """
    config = load_config()
    api_key = config.get("deepl_key", "").strip()
    target_lang = config.get("target_lang", "RO")

    if not api_key:
        return {"success": False, "error": "No DeepL API key found. Add one in Settings."}

    # Free accounts use a different endpoint (keys end with :fx)
    if api_key.endswith(":fx"):
        url = "https://api-free.deepl.com/v2/translate"
    else:
        url = "https://api.deepl.com/v2/translate"

    data = urllib.parse.urlencode({
        "text": text,
        "target_lang": target_lang,
    }).encode("utf-8")

    request = urllib.request.Request(
        url,
        data=data,
        headers={
            "Authorization": f"DeepL-Auth-Key {api_key}",
            "Content-Type": "application/x-www-form-urlencoded",
        }
    )

    try:
        with urllib.request.urlopen(request, timeout=10) as response:
            result = json.loads(response.read().decode("utf-8"))
            translation = result["translations"][0]["text"]
            return {"success": True, "translation": translation}
    except urllib.error.HTTPError as e:
        if e.code == 403:
            return {"success": False, "error": "Invalid API key."}
        elif e.code == 456:
            return {"success": False, "error": "DeepL character limit exceeded."}
        else:
            return {"success": False, "error": f"HTTP error {e.code}."}
    except urllib.error.URLError:
        return {"success": False, "error": "No internet connection."}
    except Exception as e:
        return {"success": False, "error": f"Unexpected error: {str(e)}"}