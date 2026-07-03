/* ============================================================
   FENIX JEWELRY — catalog store / admin override layer
   ------------------------------------------------------------
   Loads the base catalog (window.FENIX.categories + window.FENIX_PRODUCTS),
   layers the admin's edits on top, and rewrites those globals so every
   storefront page (index / category / product) renders the customer's
   changes. Also exposes window.FENIXStore for the admin panel (/admin)
   to read the base catalog, read/write edits and export a publishable file.

   Two sources of overrides, in priority order:
     1. localStorage ("fenix:catalog:v1") — the admin's live working copy.
        Visible instantly, but only in the browser where the edits were made.
     2. window.FENIX_OVERRIDES (assets/fenix.overrides.js) — the PUBLISHED
        copy that ships with the site, so every visitor sees the changes.

   The admin panel edits (1); "Publish" downloads a new (2) to deploy.
   This file is dependency-free and must never throw on the storefront.
   ============================================================ */
(function(){
  'use strict';

  var LS_KEY = 'fenix:catalog:v1';

  /* key -> display label for the gold colour variants the product page knows */
  var COLOR_KEYS = {
    'yellow-gold':'Yellow Gold',
    'white-gold':'White Gold',
    'rose-gold':'Rose Gold',
    'gold':'Gold',
    'silver':'Silver'
  };

  function clone(value){
    try{ return value == null ? value : JSON.parse(JSON.stringify(value)); }
    catch(e){ return value; }
  }

  /* ---- pristine base, captured BEFORE any override is applied ---- */
  var baseProducts   = Array.isArray(window.FENIX_PRODUCTS) ? clone(window.FENIX_PRODUCTS) : [];
  var baseCategories = (window.FENIX && window.FENIX.categories) ? clone(window.FENIX.categories) : {};

  /* ---- override document shape ---- */
  function emptyDoc(){
    return { v:1, products:{ patch:{}, add:[], remove:[] }, categories:{ patch:{} } };
  }
  function normalizeDoc(doc){
    doc = (doc && typeof doc === 'object') ? doc : {};
    doc.v = 1;
    doc.products = (doc.products && typeof doc.products === 'object') ? doc.products : {};
    doc.products.patch  = (doc.products.patch && typeof doc.products.patch === 'object') ? doc.products.patch : {};
    doc.products.add    = Array.isArray(doc.products.add) ? doc.products.add : [];
    doc.products.remove = Array.isArray(doc.products.remove) ? doc.products.remove : [];
    doc.categories = (doc.categories && typeof doc.categories === 'object') ? doc.categories : {};
    doc.categories.patch = (doc.categories.patch && typeof doc.categories.patch === 'object') ? doc.categories.patch : {};
    return doc;
  }

  function readLocal(){
    try{
      var raw = window.localStorage ? localStorage.getItem(LS_KEY) : null;
      return raw ? normalizeDoc(JSON.parse(raw)) : null;
    }catch(e){ return null; }
  }
  function readPublished(){
    return (window.FENIX_OVERRIDES && typeof window.FENIX_OVERRIDES === 'object')
      ? normalizeDoc(clone(window.FENIX_OVERRIDES)) : null;
  }
  /* effective document: local working copy wins, else published, else empty */
  function currentDoc(){
    return readLocal() || readPublished() || emptyDoc();
  }
  function writeLocal(doc){
    doc = normalizeDoc(doc);
    localStorage.setItem(LS_KEY, JSON.stringify(doc)); /* may throw QuotaExceededError — caller handles */
    return doc;
  }
  function clearLocal(){
    try{ localStorage.removeItem(LS_KEY); }catch(e){}
  }

  function slugify(value){
    return String(value || '').toLowerCase().trim()
      .replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'') || 'item';
  }

  /* Build the derived image fields the product page relies on. */
  function normalizeImages(list){
    var images = [], colors = [], variantColors = [], variantImages = {}, seen = {};
    (list || []).forEach(function(entry){
      var path  = typeof entry === 'string' ? entry : (entry && (entry.path || entry.safePath)) || '';
      if(!path) return;
      var color = (entry && typeof entry === 'object' && entry.color) ? entry.color : 'default';
      images.push({ path:path, safePath:path, color:color });
      colors.push(color);
      if(COLOR_KEYS[color]){
        if(!variantImages[color]) variantImages[color] = path;
        if(!seen[color]){ seen[color] = true; variantColors.push(COLOR_KEYS[color]); }
      }
    });
    return { images:images, colors:colors, variantColors:variantColors, variantImages:variantImages };
  }

  function applyProductPatch(item, patch){
    ['title','category','price','description','slug'].forEach(function(field){
      if(patch[field] != null) item[field] = patch[field];
    });
    if(patch.hidden != null) item.hidden = !!patch.hidden;
    if(Array.isArray(patch.images)){
      var norm = normalizeImages(patch.images);
      item.images        = norm.images;
      item.imageCount    = norm.images.length;
      item.colors        = norm.colors;
      item.variantColors = norm.variantColors;
      item.variantImages = norm.variantImages;
    }
    if(Array.isArray(patch.variantColors)) item.variantColors = patch.variantColors;
    return item;
  }

  function normalizeAdded(entry){
    if(!entry || !entry.title) return null;
    var category = entry.category || 'rings';
    var slug = entry.slug ? slugify(entry.slug) : slugify(entry.title);
    var id = entry.id || (category + '/' + slug);
    var norm = normalizeImages(entry.images || []);
    if(!norm.images.length){
      norm.images = [{ path:'assets/img/image-placeholder.png', safePath:'assets/img/image-placeholder.png', color:'default' }];
      norm.colors = ['default'];
    }
    var item = {
      id:id, slug:slug, category:category, title:entry.title,
      images:norm.images, imageCount:norm.images.length, colors:norm.colors,
      variantColors:(entry.variantColors && entry.variantColors.length) ? entry.variantColors : norm.variantColors,
      variantImages:norm.variantImages,
      _custom:true
    };
    if(entry.price != null)       item.price = entry.price;
    if(entry.description != null) item.description = entry.description;
    if(entry.hidden != null)      item.hidden = !!entry.hidden;
    return item;
  }

  /* ---- compute the effective catalog from a document ---- */
  function computeCategories(doc){
    var out = clone(baseCategories);
    var patch = doc.categories.patch || {};
    Object.keys(patch).forEach(function(key){
      if(!out[key]) return; /* only patch known collections */
      var p = patch[key] || {};
      ['label','title','sub','intro','type','hero','heroPos','img'].forEach(function(field){
        if(p[field] != null) out[key][field] = p[field];
      });
      if(p.hidden != null) out[key].hidden = !!p.hidden;
    });
    return out;
  }

  function computeProducts(doc){
    var removed = {};
    (doc.products.remove || []).forEach(function(id){ removed[id] = true; });
    var patch = doc.products.patch || {};
    var out = [];
    baseProducts.forEach(function(product){
      if(removed[product.id]) return;
      var item = clone(product);
      if(patch[product.id]) applyProductPatch(item, patch[product.id]);
      if(item.hidden) return;
      out.push(item);
    });
    (doc.products.add || []).forEach(function(entry){
      var item = normalizeAdded(entry);
      if(item && !item.hidden) out.push(item);
    });
    return out;
  }

  function applyToWindow(){
    try{
      var doc = currentDoc();
      var cats = computeCategories(doc);
      if(window.FENIX) window.FENIX.categories = cats;
      window.FENIX_PRODUCTS = computeProducts(doc);
    }catch(e){
      if(window.console && console.warn) console.warn('[FENIX store] apply failed', e);
    }
  }

  /* ---- export helpers for the admin panel ---- */
  function exportDoc(){ return normalizeDoc(clone(currentDoc())); }

  function exportOverridesFile(){
    var doc = exportDoc();
    return '/* FENIX JEWELRY — published catalog overrides.\n' +
      '   Generated by the admin panel (/admin).\n' +
      '   Replace assets/fenix.overrides.js with this file and re-deploy to make\n' +
      '   your changes live for every visitor. Do not edit by hand. */\n' +
      'window.FENIX_OVERRIDES = ' + JSON.stringify(doc, null, 2) + ';\n';
  }
  function exportProductsFile(){
    var products = computeProducts(currentDoc()).map(function(p){
      var q = clone(p); delete q.hidden; delete q._custom; return q;
    });
    return '/* FENIX JEWELRY — product catalog. Exported from the admin panel (/admin). */\n' +
      'window.FENIX_PRODUCTS = ' + JSON.stringify(products) + ';\n';
  }

  window.FENIXStore = {
    LS_KEY: LS_KEY,
    COLOR_KEYS: COLOR_KEYS,
    base: { products: baseProducts, categories: baseCategories },
    clone: clone,
    slugify: slugify,
    emptyDoc: emptyDoc,
    normalizeDoc: normalizeDoc,
    normalizeImages: normalizeImages,
    getDoc: currentDoc,
    getLocal: readLocal,
    getPublished: readPublished,
    save: writeLocal,
    clearLocal: clearLocal,
    effectiveProducts: function(){ return computeProducts(currentDoc()); },
    effectiveCategories: function(){ return computeCategories(currentDoc()); },
    computeProducts: function(doc){ return computeProducts(normalizeDoc(doc)); },
    computeCategories: function(doc){ return computeCategories(normalizeDoc(doc)); },
    applyToWindow: applyToWindow,
    exportDoc: exportDoc,
    exportOverridesFile: exportOverridesFile,
    exportProductsFile: exportProductsFile
  };

  /* Apply immediately so storefront pages render the edits. */
  applyToWindow();
})();
