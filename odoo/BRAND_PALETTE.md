# DYUSK brand palette

Source: https://coolors.co/palette/cfdbd5-e8eddf-f5cb5c-242423-333533
Matches the coded site's design tokens in `assets/css/site.css`.

| Hex | Name | Role in brand | Odoo theme slot |
|---|---|---|---|
| `#f5cb5c` | Pressure | Accent / CTA — buttons, highlights, Full-Sleeve mode | `o-color-1` (primary) |
| `#333533` | Slate | Dark surface / secondary | `o-color-2` (secondary) |
| `#cfdbd5` | Flux | Light secondary — Half-Sleeve mode accent | `o-color-3` (light) |
| `#e8eddf` | Paper | Light background / text on dark | `o-color-4` (lightest) |
| `#242423` | Ink | Darkest — page background, headers, footer | `o-color-5` (darkest) |

## Odoo theme mapping rationale
Odoo websites expose **five theme colors** (`o-color-1`…`o-color-5`). DYUSK runs a
dark-first identity: near-black **Ink** grounds, warm **Pressure** yellow is the single
accent, and the two light tones (**Paper**, **Flux**) carry text and light sections.

- **o-color-1 = Pressure `#f5cb5c`** — every button / CTA / link accent pulls from here.
- **o-color-5 = Ink `#242423`** — header, footer, hero, dark sections.
- **o-color-4 = Paper `#e8eddf`** — primary text colour on the dark ground.

## Typography (pairs with the palette)
- Display: **Big Shoulders Display** (500/700/900)
- Body: **Inter** (400–700)
- Labels / data: **JetBrains Mono** (400/500)
