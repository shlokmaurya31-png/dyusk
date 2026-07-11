"""
Apply the DYUSK brand palette to Odoo's website theme colors (o-color-1..5),
using the same supported mechanism the Website editor's colour picker uses.

Run:  .venv/Scripts/python.exe set_palette.py
"""
import os
import odoorpc
from dotenv import load_dotenv

PALETTE_SCSS = "/website/static/src/scss/options/colors/user_theme_color_palette.scss"
VALUES = {
    "o-color-1": "#f5cb5c",  # Pressure  — accent / CTA
    "o-color-2": "#333533",  # Slate     — secondary
    "o-color-3": "#cfdbd5",  # Flux      — light
    "o-color-4": "#ffffff",  # Paper     — lightest
    "o-color-5": "#242423",  # Ink       — darkest
}


def connect():
    load_dotenv()
    host = os.environ["ODOO_HOST"].replace("https://", "").replace("http://", "").strip("/")
    o = odoorpc.ODOO(host, port=int(os.environ.get("ODOO_PORT", "443")),
                     protocol=os.environ.get("ODOO_PROTOCOL", "jsonrpc+ssl"))
    o.login(os.environ["ODOO_DB"], os.environ["ODOO_LOGIN"], os.environ["ODOO_API_KEY"])
    return o


def main():
    o = connect()
    candidates = ["website.assets", "web_editor.assets", "web.editor.assets"]
    last_err = None
    for model in candidates:
        try:
            o.env[model]  # raises if model missing
        except Exception as e:
            last_err = e
            continue
        try:
            o.env[model].make_scss_customization(PALETTE_SCSS, VALUES)
            print(f"OK: palette written via {model}.make_scss_customization")
            print("Values:", VALUES)
            return
        except Exception as e:
            last_err = e
            print(f"  {model}.make_scss_customization failed: {e}")
    print("\nCould not apply via API. Last error:", last_err)


if __name__ == "__main__":
    main()
