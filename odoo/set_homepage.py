"""Promote the DYUSK home page to the website root (homepage)."""
import os
import odoorpc
from dotenv import load_dotenv

HOME_URL = "/dyusk"


def connect():
    load_dotenv()
    host = os.environ["ODOO_HOST"].replace("https://", "").replace("http://", "").strip("/")
    o = odoorpc.ODOO(host, port=int(os.environ.get("ODOO_PORT", "443")),
                     protocol=os.environ.get("ODOO_PROTOCOL", "jsonrpc+ssl"))
    o.login(os.environ["ODOO_DB"], os.environ["ODOO_LOGIN"], os.environ["ODOO_API_KEY"])
    return o


def main():
    o = connect()
    Website = o.env["website"]
    fields = Website.fields_get([], ["string", "type", "relation"])
    home_fields = {k: v for k, v in fields.items() if "home" in k.lower()}
    print("website homepage-related fields:")
    for k, v in home_fields.items():
        print(f"  {k}: {v.get('type')} {v.get('relation') or ''} — {v.get('string')}")

    wid = Website.search([], limit=1)[0]
    Page = o.env["website.page"]
    pid = Page.search([("url", "=", HOME_URL)], limit=1)
    pid = pid[0] if pid else None
    print(f"\nwebsite id={wid}, {HOME_URL} page id={pid}")

    applied = []
    # Try the known homepage fields across Odoo versions.
    if "homepage_id" in fields and pid:
        try:
            Website.write([wid], {"homepage_id": pid})
            applied.append("homepage_id")
        except Exception as e:
            print("  homepage_id failed:", e)
    if "homepage_url" in fields:
        try:
            Website.write([wid], {"homepage_url": HOME_URL})
            applied.append("homepage_url")
        except Exception as e:
            print("  homepage_url failed:", e)

    print("\nApplied:", applied or "NONE — need manual review of fields above")


if __name__ == "__main__":
    main()
