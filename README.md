# FENIX JEWELRY — Website Package

Luxury jewelry storefront for **FENIX JEWELRY (Marmaris)**.
"Born from fire. Worn forever."

## Pages
| File | Purpose |
|------|---------|
| `index.html` | Home / landing page (hero slideshow, collections, location, contact) |
| `category.html` | Collection listing — reads `?cat=<key>` (e.g. `category.html?cat=rings`). Product grid with square photos. |
| `product.html` | Product detail — reads `?cat=<key>&id=<n>`. Single product photo, name, and Order button. |
| `FENIX Jewelry (standalone).html` | **Fully self-contained single-file version** — all CSS, JS and images inlined. Works offline, no server needed. Just open in a browser. |

## Shared assets (`/assets`)
- `fenix.css` — full stylesheet + design tokens (`:root` variables)
- `fenix.js` — shared behaviour (nav, reveal-on-scroll, hero slideshow, contact dropdown, WhatsApp float)
- `fenix.data.js` — collection metadata and the legacy placeholder generator
- `fenix.products.js` — generated live product catalog used by category and product pages
- `img/` — all imagery (heroes, category covers, logo, placeholder)

## Data (`/data`) — JSON exports
Portable JSON mirrors of the catalog, for reuse in a CMS, app, or backend.
- `categories.json` — the 8 collections (title, code, hero image, intro copy)
- `products.json` — every product keyed by category (20 per collection)
- `products/<category>.json` — one file per collection
- `site.json` — brand strings, contact details, navigation order, marquee text
- `theme.json` — design tokens (colors, fonts, easing)

## Contact
- Phone: **+90 533 409 99 01**
- WhatsApp: wa.me/905334099901
- Maps: https://maps.app.goo.gl/Qcufd2CRMY3cD5rm6

The **Contact** button in the navigation opens a menu with: Call · WhatsApp Message · WhatsApp Call.

## Product image import
Run the production catalog importer from the project root:

```powershell
npm run import-products
```

The default source is `D:\fenix_gorseller`. Override it when needed:

```powershell
npm run import-products -- --source "D:\another-folder"
```

The importer copies images to `public/products/<category>/` and generates:
- `src/data/products.json`
- `src/data/import-report.json`
- `assets/fenix.products.js` for the live category and product pages

Rebuild the offline single-file home page after shared home/CSS/JS changes:

```powershell
npm run build-standalone
```

## Editing
- To change collection metadata, edit `assets/fenix.data.js`.
- To refresh products and images, update `D:\fenix_gorseller` and run `npm run import-products`.
- The `/data` JSON files are an export — regenerate them if you change the data source.
- After editing `standalone-src.html` (the standalone source), re-bundle to refresh `FENIX Jewelry (standalone).html`.

© 2026 FENIX JEWELRY
