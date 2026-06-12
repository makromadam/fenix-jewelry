# FENIX JEWELRY — Project Guide (for Codex)

Static, dependency-free luxury jewelry storefront for **FENIX JEWELRY (Marmaris)**.
Tagline: *"Born from fire. Worn forever."* No build step, no framework — plain HTML/CSS/JS.
Open `index.html` in a browser (or serve the folder) to run.

## Structure
```
index.html                       Home: hero slideshow, collections film-strip, location, contact, map
category.html?cat=<key>          Collection grid (20 generated products). Reads ?cat= from the URL.
product.html?cat=<key>&id=<n>    Product detail. Reads ?cat= and ?id= from the URL.
standalone-src.html              SOURCE for the offline single-file build (see "Standalone" below)
FENIX Jewelry (standalone).html  COMPILED single-file build — all CSS/JS/images inlined. Do not hand-edit.
assets/
  fenix.css                      All styles + design tokens (:root variables)
  fenix.js                       Shared behaviour: nav, reveal-on-scroll, hero slideshow, contact menu, WhatsApp float
  fenix.data.js                  Catalog data + product generator (source of truth for the live pages)
  fenix.products.js              GENERATED imported product catalog used by category/product pages
  img/                           Imagery: hero1-4, slider-*, *-hero, logo, phoenix-location, placeholder
data/                            Portable JSON export of the catalog (categories, products, site, theme)
public/products/                 GENERATED imported product images
src/data/products.json           GENERATED imported product data
src/data/import-report.json      GENERATED import audit report
scripts/import-products.js       Product image/catalog importer
```

## The 8 collections
`rings`, `necklaces`, `bracelets`, `earrings`, `bridal`, `gemstones`, `high-jewelry`, `gifts`
Defined in `assets/fenix.data.js` (`FENIX.categories`) and the home film-strip script in `index.html`.

## Editing rules
- **Collection metadata** used by the live pages → edit `assets/fenix.data.js`.
- **Imported products/images** → update `D:\fenix_gorseller`, then run `npm run import-products`.
- Never hand-edit generated `assets/fenix.products.js`, `src/data/*.json`, or `public/products/`.
- **Home collections film-strip** is built by an inline `<script>` at the bottom of `index.html` (the `cats` array).
- `data/*.json` is an EXPORT for reuse (CMS/app/backend) — regenerate it if you change the data source.
- **Navigation / footer category lists** are duplicated across `index.html`, `category.html`, `product.html` — keep them in sync.

## Standalone (offline single-file) build
`standalone-src.html` mirrors `index.html` plus bundler hints:
- `<template id="__bundler_thumbnail">` — splash/no-JS fallback art.
- `<meta name="ext-resource-dependency" ... data-resource-id="...">` — declares images referenced as
  STRINGS inside JS (the film-strip slider images) so they get inlined; the film-strip script reads them
  from `window.__resources`.

When you change `index.html`, port the same change into `standalone-src.html`, then re-bundle it into
`FENIX Jewelry (standalone).html` (inline all CSS/JS/images into one self-contained file). Never edit the
compiled file directly — it is overwritten on every rebuild.

## Contact (single source of truth — phone number appears in several places)
- Phone: **+90 533 409 99 01** → `tel:+905334099901`
- WhatsApp: `wa.me/905334099901`
- Maps: https://maps.app.goo.gl/Qcufd2CRMY3cD5rm6

© 2026 FENIX JEWELRY
