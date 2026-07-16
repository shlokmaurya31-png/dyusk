"""
Port the hand-coded DYUSK static site into Odoo as real website pages.

Approach (high fidelity, isolated from Odoo's native pages):
  - upload all image assets as public attachments
  - each page = an Odoo website page using website.layout with header/footer HIDDEN,
    so only the DYUSK markup shows
  - the site's own CSS + JS are inlined per page (no global asset bleed onto /shop)
  - asset URLs and internal links are rewritten to Odoo equivalents
  - HTML is cleaned to XML (self-closed <img>, escaped &, numeric entities) for QWeb

Idempotent: re-running updates the same pages/attachments instead of duplicating.

Pages created (staging URLs — promote /dyusk to homepage once approved):
  /dyusk               <- index.html
  /product-full-sleeve <- product-full-sleeve.html
  /product-half-sleeve <- product-half-sleeve.html

Run:  .venv/Scripts/python.exe port_site.py
"""
import base64
import os
import re

import odoorpc
from dotenv import load_dotenv

SITE = r"D:\Dyusk\Dyusk j\website j\dyusk-website"
FONT_IMPORT = ("@import url('https://fonts.googleapis.com/css2?"
               "family=Archivo:wght@400;500;700;900&"
               "family=Noto+Sans+Devanagari:wght@700;900&"
               "family=Great+Vibes&display=swap');\n")

PAGES = [
    {"src": "index.html", "url": "/dyusk", "key": "dyusk.home", "name": "DYUSK Home"},
    {"src": "shop.html", "url": "/shop-all", "key": "dyusk.shop", "name": "DYUSK Shop"},
    {"src": "product-full-sleeve.html", "url": "/product-full-sleeve",
     "key": "dyusk.product_full", "name": "DYUSK Full Sleeve"},
    {"src": "product-half-sleeve.html", "url": "/product-half-sleeve",
     "key": "dyusk.product_half", "name": "DYUSK Half Sleeve"},
    {"src": "kahani.html", "url": "/kahani", "key": "dyusk.kahani", "name": "DYUSK Kahani"},
    {"src": "about.html", "url": "/about-us", "key": "dyusk.about", "name": "DYUSK About Us"},
    {"src": "artisans.html", "url": "/artisans", "key": "dyusk.artisans", "name": "DYUSK Artisans"},
    {"src": "philanthropy.html", "url": "/philanthropy",
     "key": "dyusk.philanthropy", "name": "DYUSK Philanthropy"},
    {"src": "blog.html", "url": "/blog", "key": "dyusk.blog", "name": "DYUSK Blog"},
    {"src": "contact.html", "url": "/contact-us", "key": "dyusk.contact", "name": "DYUSK Contact"},
]


def connect():
    load_dotenv()
    host = os.environ["ODOO_HOST"].replace("https://", "").replace("http://", "").strip("/")
    o = odoorpc.ODOO(host, port=int(os.environ.get("ODOO_PORT", "443")),
                     protocol=os.environ.get("ODOO_PROTOCOL", "jsonrpc+ssl"))
    o.login(os.environ["ODOO_DB"], os.environ["ODOO_LOGIN"], os.environ["ODOO_API_KEY"])
    return o


def upload_images(o):
    """Upload every png under assets/, return {site_relative_path: /web/image/<id>}."""
    Att = o.env["ir.attachment"]
    files = ["assets/mark-white.png", "assets/wordmark-cream.png",
             "assets/ornament-corner.png", "assets/machine-sketch.png",
             "assets/border-side.png", "assets/needle.png"]
    prod_dir = os.path.join(SITE, "assets", "products")
    for fn in sorted(os.listdir(prod_dir)):
        if fn.endswith(".png"):
            files.append(f"assets/products/{fn}")
    # art marquee panels — swap the files in assets/art/ and re-run to change them
    art_dir = os.path.join(SITE, "assets", "art")
    if os.path.isdir(art_dir):
        for fn in sorted(os.listdir(art_dir)):
            if fn.endswith(".png"):
                files.append(f"assets/art/{fn}")

    url_map = {}
    for rel in files:
        path = os.path.join(SITE, *rel.split("/"))
        name = f"dyusk_{rel.replace('/', '_')}"
        with open(path, "rb") as fh:
            data = base64.b64encode(fh.read()).decode()
        # NOTE: on Odoo 19 the writable binary field is `raw` (base64 string),
        # not `datas` — writing `datas` silently stores nothing (file_size 0),
        # which makes /web/image serve the placeholder. Recreate fresh each run
        # so bytes land and the URL busts any cached copy.
        existing = Att.search([("name", "=", name)])
        if existing:
            Att.unlink(existing)
        mimetype = "image/jpeg" if rel.endswith((".jpg", ".jpeg")) else "image/png"
        aid = Att.create({"name": name, "raw": data, "public": True,
                          "mimetype": mimetype})
        size = Att.read([aid], ["file_size"])[0]["file_size"]
        url_map[rel] = f"/web/image/{aid}"
        print(f"  img {rel} -> /web/image/{aid} ({size} bytes)")
    return url_map


def upload_binaries(o):
    """Upload non-image binary assets (e.g. .glb) via /web/content, not /web/image
    (which applies image-specific processing and would mangle a model file)."""
    files = [("assets/3d/dyusk-showcase.glb", "model/gltf-binary")]
    Att = o.env["ir.attachment"]
    url_map = {}
    for rel, mimetype in files:
        path = os.path.join(SITE, *rel.split("/"))
        if not os.path.exists(path):
            continue
        name = f"dyusk_{rel.replace('/', '_')}"
        with open(path, "rb") as fh:
            data = base64.b64encode(fh.read()).decode()
        existing = Att.search([("name", "=", name)])
        if existing:
            Att.unlink(existing)
        aid = Att.create({"name": name, "raw": data, "public": True, "mimetype": mimetype})
        size = Att.read([aid], ["file_size"])[0]["file_size"]
        url_map[rel] = f"/web/content/{aid}"
        print(f"  bin {rel} -> /web/content/{aid} ({size} bytes)")
    return url_map


def fetch_variants(o):
    """Map the site's sleeve-color-size keys to Odoo product variant ids so the
    front-end cart can be pushed into a real Odoo order at checkout."""
    Prod = o.env["product.product"]
    Tmpl = o.env["product.template"]
    tok = {"Onyx": "black", "Steel": "steel", "Arctic": "white"}
    names = {"Full Sleeve Compression": "full", "Half Sleeve Compression": "half"}
    out = {}
    for tname, sleeve in names.items():
        tids = Tmpl.search([("name", "=", tname)], limit=1)
        if not tids:
            continue
        tid = tids[0]
        for v in Prod.browse(Prod.search([("product_tmpl_id", "=", tid)])):
            color = size = None
            for ptav in v.product_template_attribute_value_ids:
                an = ptav.attribute_id.name
                if an == "Color":
                    color = tok.get(ptav.name)
                elif an == "Size":
                    size = ptav.name
            if color and size:
                out[f"{sleeve}-{color}-{size}"] = {"id": v.id, "tmpl": tid}
    print(f"  variants mapped: {len(out)}")
    return out


def build_js(url_map, variants=None):
    with open(os.path.join(SITE, "assets", "js", "site.js"), encoding="utf-8") as fh:
        js = fh.read()
    # rewrite product image path -> lookup table
    js = js.replace(
        "photo.src = 'assets/products/' + sleeve + '-' + state.view + '-' + state.color + '.png';",
        "photo.src = (window.DYUSK_IMG||{})[sleeve + '-' + state.view + '-' + state.color] || '';")
    # rewrite internal product link -> Odoo page path
    js = js.replace(
        "card.setAttribute('href', 'product-' + sleeve + '-sleeve.html?color=' + state.color);",
        "card.setAttribute('href', '/product-' + sleeve + '-sleeve?color=' + state.color);")

    # commerce layer (cart, drawer, shop, PDP controls) — uses window.DYUSK_IMG
    with open(os.path.join(SITE, "assets", "js", "commerce.js"), encoding="utf-8") as fh:
        cjs = fh.read()
    cjs = cjs.replace('href="shop.html"', 'href="/shop-all"')

    # artisans-page heritage pins — harmless no-op on every other page
    # (querySelectorAll just finds nothing), so it's fine bundled globally
    with open(os.path.join(SITE, "assets", "js", "heritage-globe.js"), encoding="utf-8") as fh:
        hgjs = fh.read()

    # image lookup table (keys like full-front-black)
    entries = []
    for rel, url in url_map.items():
        if rel.startswith("assets/products/"):
            key = rel.split("/")[-1][:-4]  # strip dir + .png
            entries.append(f"'{key}':'{url}'")
    table = "window.DYUSK_IMG = {" + ",".join(entries) + "};\n"
    if variants:
        ventries = ",".join(
            f"'{k}':{{id:{v['id']},tmpl:{v['tmpl']}}}" for k, v in variants.items())
        table += "window.DYUSK_VARIANTS = {" + ventries + "};\n"
    # theme-init, run early (cream default; dark/red restored from storage)
    prefix = ("try{var _t=localStorage.getItem('dyusk-theme');"
              "if(_t==='dark'||_t==='red'){"
              "document.documentElement.setAttribute('data-theme',_t);}}catch(e){}\n")
    return table + prefix + js + "\n;\n" + cjs + "\n;\n" + hgjs


def build_css():
    with open(os.path.join(SITE, "assets", "css", "site.css"), encoding="utf-8") as fh:
        return FONT_IMPORT + fh.read()


NAMED = {"&larr;": "&#8592;", "&rarr;": "&#8594;", "&hellip;": "&#8230;",
         "&mdash;": "&#8212;", "&copy;": "&#169;"}
AMP_OK = re.compile(r"&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)")


def clean_body(html, url_map):
    """Extract <body> inner HTML, rewrite URLs/links, make it XML-valid."""
    body = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)
    # strip external asset scripts (their content is inlined by build_js); keep inline <script> blocks
    body = re.sub(r'<script[^>]*src=["\']assets/js/[^"\']+["\'][^>]*>\s*</script>', "", body)

    # asset URLs
    for rel, url in url_map.items():
        body = body.replace(rel, url)

    # internal links
    body = body.replace("product-full-sleeve.html", "/product-full-sleeve")
    body = body.replace("product-half-sleeve.html", "/product-half-sleeve")
    body = body.replace("shop.html", "/shop-all")
    body = body.replace("index.html", "/dyusk")
    body = body.replace("kahani.html", "/kahani")
    body = body.replace("about.html", "/about-us")
    body = body.replace("artisans.html", "/artisans")
    body = body.replace("philanthropy.html", "/philanthropy")
    body = body.replace("blog.html", "/blog")
    body = body.replace("contact.html", "/contact-us")

    # named entities -> numeric (before generic & escaping)
    for k, v in NAMED.items():
        body = body.replace(k, v)
    # escape stray & (e.g. inside unsplash query strings) but keep valid entities
    body = AMP_OK.sub("&amp;", body)
    # self-close void elements for XML (QWeb)
    body = re.sub(r"<img\b([^>]*?)\s*/?>", r"<img\1/>", body)
    body = re.sub(r"<input\b([^>]*?)\s*/?>", r"<input\1/>", body)
    body = re.sub(r"<br\b([^>]*?)\s*/?>", r"<br\1/>", body)
    body = re.sub(r"<hr\b([^>]*?)\s*/?>", r"<hr\1/>", body)
    return body.strip()


def make_arch(page, css, js, body):
    head_extra = ""
    return (
        f'<t name="{page["name"]}" t-name="{page["key"]}">\n'
        f'  <t t-call="website.layout">\n'
        f'    <div id="wrap" class="oe_structure">\n'
        f'      {head_extra}'
        f'      <style type="text/css"><![CDATA[\n{css}\n]]></style>\n'
        f'{body}\n'
        f'      <script type="text/javascript"><![CDATA[\n{js}\n]]></script>\n'
        f'    </div>\n'
        f'  </t>\n'
        f'</t>'
    )


def upsert_page(o, page, arch):
    View = o.env["ir.ui.view"]
    Page = o.env["website.page"]
    existing = Page.search([("url", "=", page["url"])], limit=1)
    if existing:
        rec = Page.browse(existing[0])
        View.write([rec.view_id.id], {"arch": arch})
        Page.write([existing[0]], {"website_published": True, "is_published": True,
                                   "header_visible": False, "footer_visible": False})
        print(f"  updated page {page['url']} (view {rec.view_id.id})")
        return
    view_id = View.create({"name": page["name"], "type": "qweb", "key": page["key"],
                           "arch": arch, "mode": "primary"})
    Page.create({"name": page["name"], "url": page["url"], "view_id": view_id,
                 "website_published": True, "is_published": True,
                 "header_visible": False, "footer_visible": False})
    print(f"  created page {page['url']} (view {view_id})")


def main():
    o = connect()
    print("Uploading images...")
    url_map = upload_images(o)
    print("Uploading binaries...")
    url_map.update(upload_binaries(o))
    print("Mapping product variants...")
    variants = fetch_variants(o)
    css = build_css()
    js = build_js(url_map, variants)
    print("\nBuilding pages...")
    for page in PAGES:
        with open(os.path.join(SITE, page["src"]), encoding="utf-8") as fh:
            html = fh.read()
        body = clean_body(html, url_map)
        arch = make_arch(page, css, js, body)
        upsert_page(o, page, arch)
    print("\nDone. Preview:")
    print("  https://dyusk.odoo.com/dyusk")
    print("  https://dyusk.odoo.com/product-full-sleeve")
    print("  https://dyusk.odoo.com/product-half-sleeve")


if __name__ == "__main__":
    main()
