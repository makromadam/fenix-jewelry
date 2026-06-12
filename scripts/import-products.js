'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE = 'D:\\fenix_gorseller';
const SOURCE_ROOT = path.resolve(
  readArgument('--source') || process.env.FENIX_PRODUCTS_SOURCE || DEFAULT_SOURCE
);
const PUBLIC_ROOT = path.join(PROJECT_ROOT, 'public', 'products');
const DATA_ROOT = path.join(PROJECT_ROOT, 'src', 'data');
const MANIFEST_PATH = path.join(SOURCE_ROOT, 'manifest.csv');

const CATEGORY_FOLDERS = new Map([
  ['01_rings', 'rings'],
  ['02_necklaces', 'necklaces'],
  ['03_bracelets', 'bracelets'],
  ['04_earrings', 'earrings'],
  ['05_bridal', 'bridal'],
  ['06_gemstones', 'gemstones'],
  ['07_high-jewelry', 'high-jewelry'],
  ['08_gifts', 'gifts']
]);

const IMAGE_EXTENSIONS = new Set([
  '.avif', '.gif', '.jpeg', '.jpg', '.png', '.svg', '.webp'
]);

function readArgument(name) {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : null;
}

function normalizeSlashes(value) {
  return String(value || '').replace(/\\/g, '/').replace(/^\.?\//, '');
}

function comparisonKey(value) {
  return normalizeSlashes(value).normalize('NFC').toLocaleLowerCase('en-US');
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('en-US')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

function productSlugFromFilename(filename) {
  const stem = path.parse(filename).name
    .replace(/(?:[_-](?:image|img|photo))?[_-]\d{1,4}$/i, '')
    .replace(/\s*\(\d+\)$/i, '');
  return slugify(stem) || 'product';
}

function titleFromSlug(slug) {
  return slug
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function detectColor(filename) {
  const value = slugify(path.parse(filename).name);
  const rules = [
    ['yellow-gold', /(?:^|-)yellow-gold(?:-|$)/],
    ['white-gold', /(?:^|-)white-gold(?:-|$)/],
    ['rose-gold', /(?:^|-)rose-gold(?:-|$)/],
    ['silver', /(?:^|-)silver(?:-|$)/],
    ['diamond', /(?:^|-)diamond(?:-|$)/],
    ['gold', /(?:^|-)gold(?:-|$)/]
  ];
  const match = rules.find(([, pattern]) => pattern.test(value));
  return match ? match[0] : 'default';
}

function normalizeVariantColor(value) {
  const normalized = String(value || '').toLocaleLowerCase('en-US');
  if (/rose go(?:d|ld)/.test(normalized)) return 'rose-gold';
  if (normalized.includes('white gold')) return 'white-gold';
  if (normalized.includes('yellow gold')) return 'yellow-gold';
  if (normalized.includes('silver')) return 'silver';
  if (normalized === 'gold' || normalized.includes('multi gold')) return 'gold';
  return null;
}

function analyzeImageColors(products) {
  const candidates = products.filter((product) =>
    product.variantColors.some((value) => normalizeVariantColor(value))
  );
  const request = [];
  const seen = new Set();
  for (const product of candidates) {
    for (const image of product.images) {
      if (seen.has(image.sourceRelativePath)) continue;
      seen.add(image.sourceRelativePath);
      request.push({
        sourceRelativePath: image.sourceRelativePath,
        absolutePath: path.join(SOURCE_ROOT, ...image.sourceRelativePath.split('/'))
      });
    }
  }
  if (!request.length) return new Map();

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'fenix-colors-'));
  const inputPath = path.join(tempRoot, 'input.json');
  const outputPath = path.join(tempRoot, 'output.json');
  fs.writeFileSync(inputPath, JSON.stringify(request), 'utf8');

  try {
    execFileSync('powershell.exe', [
      '-NoProfile',
      '-ExecutionPolicy', 'Bypass',
      '-File', path.join(__dirname, 'analyze-image-colors.ps1'),
      '-InputPath', inputPath,
      '-OutputPath', outputPath
    ], { stdio: 'pipe', timeout: 300000 });
    const text = fs.readFileSync(outputPath, 'utf8').replace(/^\uFEFF/, '');
    return new Map(JSON.parse(text).map((metric) => [metric.sourceRelativePath, metric]));
  } catch (error) {
    console.warn(`Color image analysis skipped: ${error.message}`);
    return new Map();
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function assignVariantImages(products) {
  const metrics = analyzeImageColors(products);
  const unresolved = [];

  for (const product of products) {
    const variantKeys = Array.from(new Set(
      product.variantColors.map((value) => normalizeVariantColor(value)).filter(Boolean)
    ));
    if (!variantKeys.length) continue;

    product.variantImages = {};
    const usedPaths = new Set();
    for (const key of variantKeys) {
      const exact = product.images.find((image) => image.color === key);
      if (exact) {
        product.variantImages[key] = exact.safePath || exact.path;
        usedPaths.add(exact.sourceRelativePath);
      }
    }

    const studioImages = product.images
      .map((image) => ({ image, metric: metrics.get(image.sourceRelativePath) }))
      .filter((entry) => entry.metric && entry.metric.whiteRatio >= 0.45);

    const scoreName = {
      'yellow-gold': 'yellowScore',
      'rose-gold': 'roseScore',
      'white-gold': 'neutralScore',
      gold: 'yellowScore',
      silver: 'neutralScore'
    };
    const assignmentOrder = ['yellow-gold', 'rose-gold', 'white-gold', 'gold', 'silver'];

    for (const key of assignmentOrder) {
      if (!variantKeys.includes(key) || product.variantImages[key]) continue;
      const score = scoreName[key];
      const match = studioImages
        .filter((entry) => !usedPaths.has(entry.image.sourceRelativePath))
        .sort((left, right) => right.metric[score] - left.metric[score])[0];
      if (!match) continue;
      if ((key === 'yellow-gold' || key === 'rose-gold' || key === 'gold') &&
          match.metric[score] < 2) continue;
      product.variantImages[key] = match.image.safePath || match.image.path;
      match.image.color = key;
      usedPaths.add(match.image.sourceRelativePath);
    }

    for (const key of variantKeys) {
      if (!product.variantImages[key]) unresolved.push({ product: product.id, color: key });
    }
  }

  return unresolved;
}

function parseVariantColors(value) {
  if (!value) return [];
  const seen = new Set();
  return String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((item) => {
      const key = item.toLocaleLowerCase('en-US');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      quoted = true;
    } else if (character === ',') {
      row.push(field);
      field = '';
    } else if (character === '\n') {
      row.push(field.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += character;
    }
  }

  if (quoted) throw new Error('manifest.csv contains an unterminated quoted field.');
  if (field || row.length) {
    row.push(field.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) {
    return { entries: [], byPath: new Map(), duplicatePaths: [] };
  }

  const rows = parseCsv(fs.readFileSync(MANIFEST_PATH, 'utf8').replace(/^\uFEFF/, ''));
  const headers = (rows.shift() || []).map((header) => header.trim());
  const required = ['kategori', 'urun', 'dosya'];
  for (const header of required) {
    if (!headers.includes(header)) {
      throw new Error(`manifest.csv is missing the required "${header}" column.`);
    }
  }

  const column = Object.fromEntries(headers.map((header, index) => [header, index]));
  const entries = [];
  const byPath = new Map();
  const duplicatePaths = [];

  rows.forEach((row, rowIndex) => {
    if (!row.some((value) => String(value || '').trim())) return;
    const categoryFolder = String(row[column.kategori] || '').trim();
    const relativePath = normalizeSlashes(row[column.dosya] || '');
    const entry = {
      row: rowIndex + 2,
      categoryFolder,
      title: String(row[column.urun] || '').trim(),
      relativePath,
      variantColors: parseVariantColors(row[column.varyant_renkleri]),
      sourceUrl: String(row[column.kaynak_url] || '').trim()
    };
    entries.push(entry);
    const key = comparisonKey(relativePath);
    if (byPath.has(key)) {
      duplicatePaths.push({
        path: relativePath,
        manifestRows: [byPath.get(key).row, entry.row]
      });
    } else {
      byPath.set(key, entry);
    }
  });

  return { entries, byPath, duplicatePaths };
}

function scanDirectory(directory) {
  const files = [];
  const stack = [directory];
  while (stack.length) {
    const current = stack.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(fullPath);
      else if (entry.isFile()) files.push(fullPath);
    }
  }
  return files.sort((left, right) =>
    left.localeCompare(right, 'en', { numeric: true, sensitivity: 'base' })
  );
}

function encodeWebPath(value) {
  return normalizeSlashes(value)
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
}

function writeJson(filename, value) {
  fs.mkdirSync(path.dirname(filename), { recursive: true });
  fs.writeFileSync(filename, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function writeCatalogScript(products) {
  const filename = path.join(PROJECT_ROOT, 'assets', 'fenix.products.js');
  const contents = [
    '/* Generated by scripts/import-products.js. Do not edit by hand. */',
    `window.FENIX_PRODUCTS=${JSON.stringify(products)};`,
    ''
  ].join('\n');
  fs.writeFileSync(filename, contents, 'utf8');
  return filename;
}

function main() {
  if (!fs.existsSync(SOURCE_ROOT)) {
    throw new Error(`Source folder does not exist: ${SOURCE_ROOT}`);
  }

  const manifest = loadManifest();
  const productsByKey = new Map();
  const importedManifestPaths = new Set();
  const importedImagesWithoutManifest = [];
  const invalidFiles = [];
  const filenameLocations = new Map();
  const imagesPerCategory = {};
  const productsPerCategory = {};

  fs.rmSync(PUBLIC_ROOT, { recursive: true, force: true });
  fs.mkdirSync(PUBLIC_ROOT, { recursive: true });

  for (const [folderName, category] of CATEGORY_FOLDERS) {
    const sourceCategory = path.join(SOURCE_ROOT, folderName);
    if (!fs.existsSync(sourceCategory)) {
      throw new Error(`Required category folder does not exist: ${sourceCategory}`);
    }

    const destinationCategory = path.join(PUBLIC_ROOT, category);
    fs.mkdirSync(destinationCategory, { recursive: true });
    imagesPerCategory[category] = 0;

    for (const sourceFile of scanDirectory(sourceCategory)) {
      const stat = fs.statSync(sourceFile);
      const extension = path.extname(sourceFile).toLocaleLowerCase('en-US');
      const relativeWithinCategory = normalizeSlashes(path.relative(sourceCategory, sourceFile));
      const sourceRelativePath = `${folderName}/${relativeWithinCategory}`;

      if (!IMAGE_EXTENSIONS.has(extension) || stat.size === 0) {
        invalidFiles.push({
          category,
          sourcePath: sourceRelativePath,
          reason: stat.size === 0 ? 'empty-file' : 'unsupported-extension'
        });
        continue;
      }

      const destinationFile = path.join(destinationCategory, ...relativeWithinCategory.split('/'));
      fs.mkdirSync(path.dirname(destinationFile), { recursive: true });
      fs.copyFileSync(sourceFile, destinationFile);

      const manifestEntry = manifest.byPath.get(comparisonKey(sourceRelativePath)) || null;
      if (manifestEntry) importedManifestPaths.add(comparisonKey(sourceRelativePath));
      else importedImagesWithoutManifest.push(sourceRelativePath);

      const productSlug = productSlugFromFilename(path.basename(sourceFile));
      const productKey = `${category}/${productSlug}`;
      let product = productsByKey.get(productKey);
      if (!product) {
        product = {
          id: productKey,
          slug: productSlug,
          category,
          title: manifestEntry?.title || titleFromSlug(productSlug),
          variantColors: [],
          images: []
        };
        productsByKey.set(productKey, product);
      } else if (!product.title && manifestEntry?.title) {
        product.title = manifestEntry.title;
      }

      const variantColors = manifestEntry?.variantColors || [];
      for (const color of variantColors) {
        if (!product.variantColors.includes(color)) product.variantColors.push(color);
      }

      const webRelativePath = `${category}/${relativeWithinCategory}`;
      product.images.push({
        originalFilename: path.basename(sourceFile),
        sourceRelativePath,
        path: `/products/${normalizeSlashes(webRelativePath)}`,
        safePath: `/products/${encodeWebPath(webRelativePath)}`,
        color: detectColor(path.basename(sourceFile)),
        manifestMatched: Boolean(manifestEntry),
        sourceUrl: manifestEntry?.sourceUrl || null
      });

      const filenameKey = comparisonKey(path.basename(sourceFile));
      const locations = filenameLocations.get(filenameKey) || [];
      locations.push(sourceRelativePath);
      filenameLocations.set(filenameKey, locations);
      imagesPerCategory[category] += 1;
    }
  }

  const products = Array.from(productsByKey.values())
    .map((product) => ({
      ...product,
      imageCount: product.images.length,
      colors: Array.from(new Set(product.images.map((image) => image.color)))
    }))
    .sort((left, right) =>
      left.category.localeCompare(right.category) ||
      left.slug.localeCompare(right.slug, 'en', { numeric: true })
    );

  const unmappedColorVariants = assignVariantImages(products);
  for (const product of products) {
    product.colors = Array.from(new Set(product.images.map((image) => image.color)));
  }

  for (const category of CATEGORY_FOLDERS.values()) {
    productsPerCategory[category] = products.filter(
      (product) => product.category === category
    ).length;
  }

  const duplicateFilenames = Array.from(filenameLocations.entries())
    .filter(([, locations]) => locations.length > 1)
    .map(([filename, locations]) => ({ filename, count: locations.length, locations }));

  const manifestEntriesWithoutFiles = manifest.entries
    .filter((entry) => !importedManifestPaths.has(comparisonKey(entry.relativePath)))
    .map((entry) => ({
      manifestRow: entry.row,
      categoryFolder: entry.categoryFolder,
      title: entry.title,
      path: entry.relativePath
    }));

  const report = {
    generatedAt: new Date().toISOString(),
    sourceRoot: SOURCE_ROOT,
    outputRoot: PUBLIC_ROOT,
    totalImportedImages: Object.values(imagesPerCategory).reduce((sum, count) => sum + count, 0),
    totalProducts: products.length,
    totalImagesPerCategory: imagesPerCategory,
    totalProductsPerCategory: productsPerCategory,
    missingManifestItems: importedImagesWithoutManifest,
    manifestEntriesWithoutFiles,
    duplicateFilenames,
    duplicateManifestPaths: manifest.duplicatePaths,
    unmappedColorVariants,
    invalidFiles
  };

  writeJson(path.join(DATA_ROOT, 'products.json'), products);
  writeJson(path.join(DATA_ROOT, 'import-report.json'), report);
  const catalogScript = writeCatalogScript(products);

  console.log(`Imported ${report.totalImportedImages} images as ${report.totalProducts} products.`);
  console.log(`Products: ${path.join(DATA_ROOT, 'products.json')}`);
  console.log(`Report:   ${path.join(DATA_ROOT, 'import-report.json')}`);
  console.log(`Website:  ${catalogScript}`);
}

try {
  main();
} catch (error) {
  console.error(`Product import failed: ${error.message}`);
  process.exitCode = 1;
}
