# DYUSK → Odoo migration plan (Path A: real eCommerce)

Rebuild the DYUSK storefront as a genuine Odoo eCommerce store — real cart, checkout,
inventory, and Razorpay payments — with the visual design re-created on-brand inside Odoo's
Website Builder. This is the path chosen on 2026-07-11.

Source site: `D:\Dyusk\Dyusk j\website j\dyusk-website\` (static HTML/CSS/JS, also on
Vercel + GitHub). Odoo target: database `dyusk` at `dyusk.odoo.com` (Website + eCommerce +
Payment already installed).

---

## What "transfer" means here (read once)

Odoo Online cannot host raw HTML files or a custom theme module — the site is **rebuilt inside
Odoo's Website Builder**, not copied. So the migration splits cleanly into two tracks:

- **Data track** (products, variants, images, inventory) — can be created via the API / the
  `odoo_tool.py` CLI in this folder. Fast, scriptable, works on the trial.
- **Design track** (page layout, hero, brand styling) — done in Odoo's in-browser Website
  Builder using blocks + custom CSS. Manual, guided step by step.

The bespoke animations from the coded site (preloader, cursor-glow, scroll-linked fit
comparison, auto-scroll carousel) **will not carry over 1:1** — Odoo Online restricts custom JS.
The rebuild will look on-brand (same fonts, colors, tone, photography) but is not a pixel clone.
That trade was accepted in exchange for working commerce.

---

## Product data (captured from the source site)

Two products, three colorways each. The site defines **no sizes** — apparel needs them, so
S/M/L/XL is proposed below (decision flagged).

### Full Sleeve — "Total Arm Compression"
- **Price:** ₹2,499
- **Description:** Sleeve-to-cuff pressure that stays consistent through full range of motion —
  built for cold starts, long sessions, and joints that need to be told what to do.
- **Colorways:** Onyx `#111112` · Steel `#4b4d50` · Arctic `#e8e8e5`
- **Specs (for the product page):** 240 gsm core fabric · 92% 4-way stretch recovery ·
  6 flatlock seam zones · 3.1× moisture transfer rate
- **Photos:** `full-{front|back}-{black|steel|white}.png` (6 images)

### Half Sleeve — ₹2,199
- **Colorways:** Onyx · Steel · Arctic (same set)
- **Photos:** `half-{front|back}-{black|steel|white}.png` (6 images)
- (Half-sleeve description/specs to be lifted from `product-half-sleeve.html` at build time.)

### Attribute model in Odoo
- **Color** attribute → display type **Color** (circles): Onyx, Steel, Arctic.
- **Size** attribute → display type **Pills**: S, M, L, XL *(proposed — needs confirmation)*.
- Variant creation: **Dynamically** (don't pre-spawn all 12 combos as stock records until sold).
- Per-variant image: assign the correct colorway photo to each color value.

---

## Phases

### Phase 0 — Prerequisites (blocking, needs the user)
- [ ] **Subscribe to a paid Odoo plan.** Trial cannot attach the custom domain, and go-live
      needs it. (Custom domain works on **Standard**; the API this CLI uses needs **Custom** —
      see [[ODOO_NOTES]]. Decide which tier.) DNS is already correct and waiting.
- [ ] **Confirm sizes** (S/M/L/XL?) and whether both fits share the same size run.
- [ ] **Confirm launch inventory** — stock qty per size/color, or launch as made-to-order.
- [ ] **Razorpay account** — need Key Id, Key Secret, Webhook Secret to enable live payments.

### Phase 1 — Catalog (data track, scriptable via API)
1. Create the **Color** and **Size** attributes + values.
2. Create the two **products** (`product.template`) with prices, descriptions, specs.
3. Attach attributes → variants generate. Assign per-color photos.
4. Upload the 12 product images.
5. Set inventory (Phase 0 decision) via `stock.quant` if tracking stock.
   - *Requires adding a `create` command to `odoo_tool.py` (currently read/write only).*

### Phase 2 — Storefront design (design track, Website Builder)
1. ~~Set brand theme colors~~ **DONE** — the 5-color DYUSK palette is applied to Odoo's theme
   (`o-color-1..5`) via `set_palette.py` and verified live in the compiled CSS. See [[BRAND_PALETTE]].
   Still to do: set the **fonts** (Big Shoulders Display / Inter / JetBrains Mono) and confirm the
   dark-first default in the Website editor.
2. Rebuild the **homepage**: hero ("Engineered for pressure."), lineup grid linking to the two
   product pages, technology/compression section, footer.
3. Upload logo assets (`mark-white.png`, `wordmark-cream.png`) as the site logo/favicon
   (also fixes the missing-favicon 404s noted in the site README).
4. Let eCommerce auto-generate the **/shop** and product detail pages; restyle to match.

### Phase 3 — Commerce config
1. **Razorpay**: Finance → Payment Providers → Razorpay → enter credentials → Test, then Enable.
2. **Delivery methods**: shipping rates / couriers for India.
3. **Taxes**: GST configuration for the ₹ prices (tax-inclusive display for D2C).
4. **Checkout**: enable guest checkout + accounts, cart, order-confirmation emails.

### Phase 4 — Go-live
1. Test a full order end-to-end in Razorpay test mode.
2. Switch Razorpay to live.
3. In Odoo (paid plan): map domain → **Verify** `www.dyusk.com` (DNS already set) → SSL auto-issues.
4. In GoDaddy: add Forwarding `dyusk.com` → `https://www.dyusk.com` (301) for the naked domain.
5. Keep Shopify live until `www.dyusk.com` on Odoo is confirmed working, then retire it.

---

## Decisions still open
1. **Plan tier** — Standard (domain only) vs Custom (domain + keep API automation). See [[ODOO_NOTES]].
2. **Sizes** — S/M/L/XL, or a different run? Same for both fits?
3. **Inventory** — real stock numbers at launch, or made-to-order?
4. **Design fidelity** — how close to the coded site's look is "good enough," given animations
   won't transfer? (Sets how much custom-CSS effort Phase 2 needs.)

## Order of operations
Phase 1 (catalog) can start on the **trial today** via the API — it's reversible and populates the
store. Phases 3–4 (payments, domain, go-live) are gated on the **paid plan** (Phase 0). So the
practical next move once you're ready: green-light Phase 1, and I'll extend `odoo_tool.py` with a
`create` command and load the products + photos.
