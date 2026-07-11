# DYUSK — Engineered Pressure

Marketing site for DYUSK compression wear. Static HTML/CSS/JS — no build step, no framework.

**Live repo:** https://github.com/shlokmaurya31-png/dyusk

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Landing page — hero, fit comparison, pressure map, lineup |
| `shop.html` | Collection page — filterable product grid, quick-add |
| `product-full-sleeve.html` | Full Sleeve product detail (₹2,499) — gallery, size/colour, add to cart |
| `product-half-sleeve.html` | Half Sleeve product detail (₹2,199) — gallery, size/colour, add to cart |

Lineup and shop cards link to the product pages and carry the selected colorway via `?color=` (e.g. `product-full-sleeve.html?color=steel`).

## Commerce

`assets/js/commerce.js` runs on every page and powers the storefront:

- **Cart** — a slide-out drawer with line items, quantity steppers, a free-shipping progress bar (₹2,999 threshold) and subtotal. State persists in `localStorage` (`dyusk-cart`), so the bag survives navigation.
- **Announcement bar** — rotating messages; slides away on scroll while the header docks to the top.
- **Shop page** — filter by fit and colour, sort by price, and quick-add a size without leaving the grid.
- **Product pages** — colour + size selection (S–XXL), size guide, quantity, and an Add to Bag that opens the cart.

The cart/checkout is client-side today (for design + demo). When the paid Odoo plan is live, checkout swaps to Odoo's real `website_sale` cart — the storefront UI stays as-is.

## Structure

```
dyusk-website/
├── index.html
├── product-full-sleeve.html
├── product-half-sleeve.html
└── assets/
    ├── css/site.css          # shared styles (all pages)
    ├── js/site.js            # shared behavior (all pages)
    ├── mark-white.png        # DK logo mark
    ├── wordmark-cream.png    # DYUSK wordmark
    └── products/             # product photos: {full|half}-{front|back}-{black|steel|white}.png
```

## Features

- **Dark / light theme** — toggle in the header, persisted in `localStorage` (`dyusk-theme`). Logo marks invert automatically in light mode.
- **Product colorways** — three per fit (Onyx / Steel / Arctic), each with front/back views. Swatches and the flip button swap images client-side.
- **Fit comparison** — scroll-linked toggle between Full Sleeve and Half Sleeve specs; the accent color shifts per mode.
- **Auto-scrolling "Built For" carousel** — pauses on hover/touch, respects `prefers-reduced-motion`.
- **Mobile-audited** — verified at 375px and 320px: no horizontal overflow, `100svh` hero, 32–44px touch targets, anchor links clear the fixed header.

## Run locally

Any static server works:

```bash
cd dyusk-website
python -m http.server 8791
# open http://localhost:8791
```

To preview on a phone on the same Wi-Fi, open `http://<your-lan-ip>:8791`.

## Deploy

**Vercel:** import the repo, set **Framework Preset: Other**, leave build command empty. Attach the domain under Project → Settings → Domains. Every push to `main` redeploys automatically.

## Odoo migration (in progress)

The storefront is moving to **Odoo Online** (database `dyusk` at https://dyusk.odoo.com) for real commerce — cart, inventory, Razorpay payments. All migration tooling and docs live in [`odoo/`](odoo/):

| File | Purpose |
|---|---|
| `odoo/MIGRATION_PLAN.md` | The full phased plan (catalog → design → payments → go-live) and open decisions |
| `odoo/ODOO_NOTES.md` | How Odoo Online fits the stack, API auth, useful models, CLI examples |
| `odoo/BRAND_PALETTE.md` | The 5-color DYUSK palette and its mapping to Odoo theme slots |
| `odoo/odoo_tool.py` | CLI to read/write Odoo data (models / read / write) |
| `odoo/set_palette.py` | Applies the brand palette to Odoo's website theme — **done, live** |
| `odoo/port_site.py` | Ports these static pages into Odoo as website pages — **done, live** |
| `odoo/load_catalog.py` | Creates products + color variants + photos in Odoo eCommerce — ready, not yet run |

**Status:** DNS for `www.dyusk.com` already points at Odoo (CNAME live). Four pages are staged on dyusk.odoo.com with the full design + commerce layer intact: `/dyusk`, `/shop-all`, `/product-full-sleeve`, `/product-half-sleeve`. Blocked on a paid Odoo subscription for the custom domain + native Odoo checkout.

**Setup for teammates:** copy `odoo/.env.example` → `odoo/.env`, fill in your own Odoo login + API key (Odoo → My Profile → Account Security → New API Key), then `pip install odoorpc python-dotenv`. Never commit `.env`.

## Design tokens

Defined as CSS custom properties in `assets/css/site.css`:

| Token | Dark | Role |
|---|---|---|
| `--ink` | `#242423` | Background |
| `--paper` | `#ffffff` | Text |
| `--pressure` | `#f5cb5c` | Accent (Full Sleeve mode) |
| `--flux` | `#cfdbd5` | Accent (Half Sleeve mode) |

Type: **Big Shoulders Display** (display), **Inter** (body), **JetBrains Mono** (labels/data) — loaded from Google Fonts.

## Known gaps

- `assets/favicon-*.png` referenced in `<head>` don't exist yet (harmless 404s).
- "Add to Bag", About, Contact, and social links are placeholders — no commerce backend yet.
