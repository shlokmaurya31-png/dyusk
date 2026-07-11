"""
DYUSK catalog loader — Phase 1 of the Odoo migration.

Idempotent: creates the Color attribute + values, the two products, their color
variants, and loads all 12 product photos. Safe to re-run — it finds existing
records by name instead of duplicating.

Size (S/M/L/XL) is intentionally NOT added yet — pending confirmation of the run.

Run from this folder:
    .venv/Scripts/python.exe load_catalog.py
"""

import base64
import os

import odoorpc
from dotenv import load_dotenv

IMG_DIR = r"D:\Dyusk\Dyusk j\website j\dyusk-website\assets\products"

# name -> hex swatch, and the photo filename token
COLORS = [
    ("Onyx", "#111112", "black"),
    ("Steel", "#4b4d50", "steel"),
    ("Arctic", "#e8e8e5", "white"),
]

PRODUCTS = [
    {
        "prefix": "full",
        "name": "Full Sleeve Compression",
        "headline": "Total Arm Compression",
        "price": 2499.0,
        "desc": ("Sleeve-to-cuff pressure that stays consistent through full range of "
                 "motion — built for cold starts, long sessions, and joints that need "
                 "to be told what to do."),
        "specs": [("240 gsm", "Core Fabric Weight"), ("92%", "4-Way Stretch Recovery"),
                  ("6", "Flatlock Seam Zones"), ("3.1x", "Moisture Transfer Rate")],
    },
    {
        "prefix": "half",
        "name": "Half Sleeve Compression",
        "headline": "Open Arm, Full Core",
        "price": 2199.0,
        "desc": ("Same core-to-shoulder compression, cropped at the cuff for heat-heavy "
                 "sessions and lifts that want a free wrist and open forearm."),
        "specs": [("210 gsm", "Core Fabric Weight"), ("89%", "4-Way Stretch Recovery"),
                  ("4", "Flatlock Seam Zones"), ("3.6x", "Moisture Transfer Rate")],
    },
]


def connect():
    load_dotenv()
    host = os.environ["ODOO_HOST"].replace("https://", "").replace("http://", "").strip("/")
    odoo = odoorpc.ODOO(host, port=int(os.environ.get("ODOO_PORT", "443")),
                        protocol=os.environ.get("ODOO_PROTOCOL", "jsonrpc+ssl"))
    odoo.login(os.environ["ODOO_DB"], os.environ["ODOO_LOGIN"], os.environ["ODOO_API_KEY"])
    return odoo


def b64(path):
    with open(path, "rb") as fh:
        return base64.b64encode(fh.read()).decode()


def only_existing(model, values):
    """Drop keys that aren't real fields on this Odoo version, so writes don't blow up."""
    fields = model.fields_get(list(values.keys()))
    return {k: v for k, v in values.items() if k in fields}


def find_or_create(model, domain, values, label):
    ids = model.search(domain, limit=1)
    if ids:
        print(f"  = {label} exists (id {ids[0]})")
        return ids[0]
    new_id = model.create(only_existing(model, values))
    print(f"  + created {label} (id {new_id})")
    return new_id


def spec_html(p):
    rows = "".join(f"<li><strong>{n}</strong> — {lbl}</li>" for n, lbl in p["specs"])
    return (f'<h3 style="font-family:\'Big Shoulders Display\',sans-serif;'
            f'text-transform:uppercase;letter-spacing:.02em;">{p["headline"]}</h3>'
            f'<p>{p["desc"]}</p><ul>{rows}</ul>')


def main():
    odoo = connect()
    Attr = odoo.env["product.attribute"]
    AttrVal = odoo.env["product.attribute.value"]
    Tmpl = odoo.env["product.template"]
    Prod = odoo.env["product.product"]
    TmplImg = odoo.env["product.image"]
    PTAV = odoo.env["product.template.attribute.value"]

    print("Connected. Loading DYUSK catalog...\n")

    # 1. Color attribute + values -------------------------------------------------
    print("Color attribute:")
    color_attr = find_or_create(
        Attr, [("name", "=", "Color")],
        {"name": "Color", "display_type": "color", "create_variant": "always"},
        "attribute 'Color'")
    color_val_ids = {}
    for cname, chex, _token in COLORS:
        vid = find_or_create(
            AttrVal, [("name", "=", cname), ("attribute_id", "=", color_attr)],
            {"name": cname, "attribute_id": color_attr, "html_color": chex},
            f"color '{cname}'")
        color_val_ids[cname] = vid

    # 2. Products -----------------------------------------------------------------
    for p in PRODUCTS:
        print(f"\nProduct: {p['name']}")
        tmpl_id = find_or_create(
            Tmpl, [("name", "=", p["name"])],
            {"name": p["name"], "list_price": p["price"], "sale_ok": True,
             "is_published": True, "website_published": True, "type": "consu",
             "is_storable": True, "description_sale": p["desc"],
             "website_description": spec_html(p)},
            f"template '{p['name']}'")

        # ensure the sale/publish/price fields are set even if it pre-existed
        Tmpl.write([tmpl_id], only_existing(Tmpl, {
            "list_price": p["price"], "sale_ok": True,
            "website_published": True, "is_published": True,
            "description_sale": p["desc"], "website_description": spec_html(p)}))

        # 3. Attach Color attribute line -> variants auto-generate ----------------
        tmpl = Tmpl.browse(tmpl_id)
        has_color_line = any(l.attribute_id.id == color_attr for l in tmpl.attribute_line_ids)
        if not has_color_line:
            Tmpl.write([tmpl_id], {"attribute_line_ids": [(0, 0, {
                "attribute_id": color_attr,
                "value_ids": [(6, 0, list(color_val_ids.values()))],
            })]})
            print("  + attached Color variants (Onyx / Steel / Arctic)")
        else:
            print("  = Color line already attached")

        # 4. Per-color front image on each variant --------------------------------
        variant_ids = Prod.search([("product_tmpl_id", "=", tmpl_id)])
        for v in Prod.browse(variant_ids):
            # find this variant's color name via its template attribute values
            cname = None
            for ptav in v.product_template_attribute_value_ids:
                if ptav.attribute_id.id == color_attr:
                    cname = ptav.name
            if not cname:
                continue
            token = dict((c[0], c[2]) for c in COLORS)[cname]
            front = os.path.join(IMG_DIR, f"{p['prefix']}-front-{token}.png")
            if os.path.exists(front):
                Prod.write([v.id], {"image_1920": b64(front)})
                print(f"  + {cname} variant image set ({os.path.basename(front)})")

        # set template main image = Onyx front
        main_img = os.path.join(IMG_DIR, f"{p['prefix']}-front-black.png")
        if os.path.exists(main_img):
            Tmpl.write([tmpl_id], {"image_1920": b64(main_img)})

        # 5. Back photos as extra gallery media on the template -------------------
        existing_media = set(i.name for i in TmplImg.browse(
            TmplImg.search([("product_tmpl_id", "=", tmpl_id)])))
        for cname, _hex, token in COLORS:
            back = os.path.join(IMG_DIR, f"{p['prefix']}-back-{token}.png")
            label = f"{cname} — back"
            if os.path.exists(back) and label not in existing_media:
                TmplImg.create({"name": label, "product_tmpl_id": tmpl_id,
                                "image_1920": b64(back)})
                print(f"  + gallery image added ({label})")

    print("\nDone. Review at https://dyusk.odoo.com/shop")


if __name__ == "__main__":
    main()
