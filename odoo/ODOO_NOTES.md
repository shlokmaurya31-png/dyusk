# Odoo Online — study notes for dyusk

Working notes on how Odoo Online fits dyusk's stack (website + operations) and how to drive it
through the `odoo_tool.py` CLI already scaffolded in this folder. **Odoo 19 is the current latest
major version** — a new Odoo Online signup will be provisioned on 19.0. Everything below applies
to 19.0 unless a note says otherwise (older links are kept only where 19's docs didn't have a
direct equivalent page at the time of writing).

## 1. How the pieces fit together

| Odoo app | What it does for dyusk |
|---|---|
| **Website** | Hosts the public dyusk.com site — pages, blog, theme/branding. |
| **eCommerce** | Sits on top of Website — product catalog, cart, checkout, payment providers. This is the storefront. |
| **Sales** | Quotations → sales orders → invoicing. Every online order becomes a sales order here. |
| **Inventory** | Stock levels, warehouses, delivery orders. Confirming a sales order auto-creates a delivery in Inventory. |

The chain for a real order: customer checks out on the **eCommerce** site → a **Sales** order is
created and confirmed → a delivery is generated in **Inventory** → invoice is raised from the
Sales order. All four apps read/write the same underlying models (`product.template`,
`sale.order`, `stock.picking`, `res.partner`), so the CLI in this folder can inspect or touch any
stage of that chain.

## 2. The CLI (`odoo_tool.py`)

It's a thin wrapper over **OdooRPC**, which itself wraps Odoo's XML-RPC/JSON-RPC external API.
It does not touch backend Python code — it only reads/writes data through your logged-in user's
permissions, same as clicking around the UI.

Auth flow under the hood:
1. `xmlrpc/2/common` → `authenticate(db, login, api_key, {})` → returns a `uid`.
2. `xmlrpc/2/object` → `execute_kw(db, uid, api_key, model, method, args, kwargs)` for every actual
   read/write.

**API key, not password.** Generate one in Odoo under your user icon → *My Profile* →
*Account Security* → *New API Key*. Copy it immediately — Odoo cannot show it again after you
navigate away. If 2FA is enabled on the account (recommended), a plain password won't
authenticate RPC calls at all — the API key is mandatory in that case. Treat the key like a
password: it grants the same access your user has, just can't log into the web UI with it.

Setup still pending here: copy `.env.example` → `.env` and fill in `ODOO_HOST`, `ODOO_DB`,
`ODOO_LOGIN`, `ODOO_API_KEY`. Nothing is configured yet (`.env` doesn't exist), so the tool can't
connect until that's done.

**Plan-tier gotcha to verify before relying on this tool.** Odoo's own docs state that external
API access (this includes the XML-RPC path `odoorpc` uses) is only available on **Custom** Odoo
Online pricing plans — not the standard/entry plans. Worth confirming dyusk's Odoo Online plan
actually includes API access before spending more time wiring this up; if it doesn't, either
upgrade the plan or fall back to doing data changes through the Odoo web UI directly.

**Odoo 19 also ships a new JSON-2 API** (`/json/2/<model>/<method>`), authenticated with a bearer
token (`Authorization: bearer <api_key>`) instead of the `uid`+key pair XML-RPC uses. It's the
forward-looking option — the legacy XML-RPC/JSON-RPC endpoints (`/xmlrpc/2/*`, what `odoorpc`
speaks) still work today but are slated for removal in **Odoo 22 (fall 2028)**. No rush to migrate
off `odoorpc` now, but if this tool gets rebuilt from scratch later, JSON-2 is the one to build
against instead.

### Commands available today
```powershell
.\.venv\Scripts\python.exe .\odoo_tool.py models --search product
.\.venv\Scripts\python.exe .\odoo_tool.py read res.partner --fields id,name,email --limit 10
.\.venv\Scripts\python.exe .\odoo_tool.py write res.partner --ids 12 --values '{ "name": "New Name" }'
```

### Models worth knowing for dyusk's use case
| Model | Purpose | Useful fields |
|---|---|---|
| `product.template` | Catalog items (a garment, before variants) | `name`, `list_price`, `standard_price`, `sale_ok`, `website_published` |
| `product.product` | Actual sellable variant (size/color) | `product_tmpl_id`, `default_code` (SKU), `qty_available` |
| `sale.order` | Orders/quotations from checkout or manual entry | `partner_id`, `state`, `amount_total`, `order_line` |
| `res.partner` | Customers, vendors, contacts | `name`, `email`, `phone`, `customer_rank` |
| `stock.picking` | Delivery/receipt operations | `state`, `partner_id`, `scheduled_date` |
| `stock.quant` | On-hand quantity per location | `product_id`, `quantity`, `location_id` |

Example checks once `.env` is filled in:
```powershell
# Check stock on a SKU
.\.venv\Scripts\python.exe .\odoo_tool.py read product.product --domain '[["default_code","=","DYK-TSHIRT-BLK-M"]]' --fields default_code,qty_available

# Pull recent orders
.\.venv\Scripts\python.exe .\odoo_tool.py read sale.order --fields name,partner_id,amount_total,state --limit 20

# Find a customer by email
.\.venv\Scripts\python.exe .\odoo_tool.py read res.partner --domain '[["email","=","someone@example.com"]]' --fields id,name,phone
```

## 3. eCommerce essentials (customer-facing side)

- **Products**: pricing, variants (size/color for apparel), cross-sell/upsell, catalog structure.
- **Checkout**: the browsing → cart → payment flow; configurable steps and guest checkout.
- **Payment providers**: Odoo integrates multiple gateways (Razorpay is relevant for INR pricing
  in the ₹3,000–3,500 band).
- **Delivery methods**: shipping options tied into Inventory's delivery orders.
- **B2B/B2C**: can run both — relevant if dyusk ever sells wholesale to the importers/retailers
  segment alongside direct retail.
- **Customer accounts**: registration, order history — matters for a premium repeat-purchase
  brand.

## 4. Sales + Inventory essentials (operations side)

- **Sales**: quotations → orders → invoicing, pricelists, discounts, loyalty/gift cards.
- **Inventory**: stock levels, warehouses, automatic delivery order creation on order confirmation,
  make-to-order/reordering rules if replenishment needs automating later.
- These two apps are what "operations management" in Odoo actually means day to day — everything
  else (Website/eCommerce) just feeds orders into this pipeline.

## 5. Open items / next steps

- [ ] **Confirm the Odoo Online plan is on the Custom tier** — external API access (what this CLI
      needs) isn't included on lower tiers per Odoo's docs.
- [ ] Fill in `.env` with real host/db/login/API key (not done yet — do this before any command
      will run).
- [ ] Decide whether dyusk needs Website+eCommerce Enterprise features (e.g. certain payment
      providers, B2B pricing) vs. what's in the standard Online plan.
- [ ] Once connected, run `models --search product` and `models --search sale` to confirm which
      modules are actually installed on this database (Online plans don't always ship every app).

## Sources
- [External JSON-2 API — Odoo 19.0 documentation](https://www.odoo.com/documentation/19.0/developer/reference/external_api.html)
- [External RPC API (legacy XML-RPC/JSON-RPC) — Odoo 19.0 documentation](https://www.odoo.com/documentation/19.0/developer/reference/external_rpc_api.html)
- [eCommerce — Odoo 19.0 documentation](https://www.odoo.com/documentation/19.0/applications/websites/ecommerce.html)
- [Website — Odoo 19.0 documentation](https://www.odoo.com/documentation/19.0/applications/websites/website.html)
- [Sales — Odoo 19.0 documentation](https://www.odoo.com/documentation/19.0/applications/sales/sales.html)
- [Inventory — Odoo 19.0 documentation](https://www.odoo.com/documentation/19.0/applications/inventory_and_mrp/inventory.html)
- [OdooRPC documentation](https://odoorpc.readthedocs.io/)
- [OdooRPC — Execute RPC queries](https://pythonhosted.org/OdooRPC/tuto_rpc_queries.html)

(Sales/Inventory/eCommerce content above was cross-checked against the 18.0 doc pages too, since
18.0 and 19.0 don't differ meaningfully in these areas — links point to 19.0 as the current
version.)
