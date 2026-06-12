'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SOURCE = path.join(ROOT, 'standalone-src.html');
const OUTPUT = path.join(ROOT, 'FENIX Jewelry (standalone).html');

const MIME_TYPES = {
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

function dataUri(filename) {
  const extension = path.extname(filename).toLocaleLowerCase('en-US');
  const mime = MIME_TYPES[extension] || 'application/octet-stream';
  return `data:${mime};base64,${fs.readFileSync(filename).toString('base64')}`;
}

async function inlineGoogleFonts(css) {
  const importPattern = /@import url\(['"]([^'"]+)['"]\);?/g;
  const imports = Array.from(css.matchAll(importPattern));
  for (const match of imports) {
    const response = await fetch(match[1], {
      headers: { 'User-Agent': 'Mozilla/5.0 FENIX standalone builder' }
    });
    if (!response.ok) throw new Error(`Could not download font CSS: ${match[1]}`);
    let fontCss = await response.text();
    const fontUrls = Array.from(new Set(
      Array.from(fontCss.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g))
        .map((fontMatch) => fontMatch[1])
    ));
    for (const fontUrl of fontUrls) {
      const fontResponse = await fetch(fontUrl);
      if (!fontResponse.ok) throw new Error(`Could not download font: ${fontUrl}`);
      const bytes = Buffer.from(await fontResponse.arrayBuffer());
      const extension = path.extname(new URL(fontUrl).pathname).toLocaleLowerCase('en-US');
      const mime = MIME_TYPES[extension] || 'font/woff2';
      fontCss = fontCss.split(fontUrl).join(`data:${mime};base64,${bytes.toString('base64')}`);
    }
    css = css.replace(match[0], fontCss);
  }
  return css;
}

function inlineLocalImages(html) {
  const matches = Array.from(new Set(
    Array.from(html.matchAll(/assets\/img\/[A-Za-z0-9._-]+(?:\?[^"'()\s]+)?/g))
      .map((match) => match[0])
  ));
  for (const match of matches) {
    const relativePath = match.split('?')[0];
    const filename = path.join(ROOT, ...relativePath.split('/'));
    if (!fs.existsSync(filename)) throw new Error(`Missing standalone image: ${relativePath}`);
    html = html.split(match).join(dataUri(filename));
  }
  return html;
}

async function main() {
  let html = fs.readFileSync(SOURCE, 'utf8');
  let css = fs.readFileSync(path.join(ROOT, 'assets', 'fenix.css'), 'utf8');
  const javascript = fs.readFileSync(path.join(ROOT, 'assets', 'fenix.js'), 'utf8');

  css = await inlineGoogleFonts(css);
  html = html.replace(
    /<link rel="stylesheet" href="assets\/fenix\.css[^"]*">/,
    `<style>${css}</style>`
  );
  html = html.replace(
    /<script src="assets\/fenix\.js[^"]*"><\/script>/,
    `<script>${javascript.replace(/<\/script/gi, '<\\/script')}</script>`
  );

  const resources = {};
  html = html.replace(
    /<meta name="ext-resource-dependency" content="([^"]+)" data-resource-id="([^"]+)" \/>/g,
    (fullMatch, relativePath, resourceId) => {
      resources[resourceId] = dataUri(path.join(ROOT, ...relativePath.split('/')));
      return '';
    }
  );
  html = html.replace(
    '</head>',
    `<script>window.__resources=${JSON.stringify(resources)};</script>\n</head>`
  );
  html = inlineLocalImages(html);

  fs.writeFileSync(OUTPUT, html, 'utf8');
  console.log(`Standalone build: ${OUTPUT}`);
}

main().catch((error) => {
  console.error(`Standalone build failed: ${error.message}`);
  process.exitCode = 1;
});
