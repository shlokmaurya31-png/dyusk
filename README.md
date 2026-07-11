# DYUSK — Engineered Pressure

Marketing site for DYUSK compression wear. Static HTML/CSS/JS — no build step, no framework.

**Live repo:** https://github.com/shlokmaurya31-png/dyusk

## Pages

| Page | Purpose |
|---|---|
| `index.html` | Landing page — hero, fit comparison, pressure map, lineup |
| `product-full-sleeve.html` | Full Sleeve product detail (₹2,499) |
| `product-half-sleeve.html` | Half Sleeve product detail (₹2,199) |

Lineup cards link to the product pages and carry the selected colorway via `?color=` (e.g. `product-full-sleeve.html?color=steel`).

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

**Planned:** migration to Odoo (website module/theme) once the storefront needs real commerce — cart, inventory, payments.

## Design tokens

Defined as CSS custom properties in `assets/css/site.css`:

| Token | Dark | Role |
|---|---|---|
| `--ink` | `#242423` | Background |
| `--paper` | `#e8eddf` | Text |
| `--pressure` | `#f5cb5c` | Accent (Full Sleeve mode) |
| `--flux` | `#cfdbd5` | Accent (Half Sleeve mode) |

Type: **Big Shoulders Display** (display), **Inter** (body), **JetBrains Mono** (labels/data) — loaded from Google Fonts.

## Known gaps

- `assets/favicon-*.png` referenced in `<head>` don't exist yet (harmless 404s).
- "Add to Bag", About, Contact, and social links are placeholders — no commerce backend yet.
