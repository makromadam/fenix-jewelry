/* ============================================================
   FENIX JEWELRY — public read of the published catalog overrides
   ------------------------------------------------------------
   Returns a tiny JS file that sets window.FENIX_OVERRIDES from the KV
   store, so every visitor sees the admin's edits WITHOUT a re-deploy.
   The storefront loads this right after the shipped
   assets/fenix.overrides.js, so:
     - backend has data  -> it wins (live edits)
     - backend empty/off  -> no-op, the shipped static file stays in effect
   Zero dependencies (uses the global fetch + Upstash/Vercel KV REST API).
   Works with Vercel KV env vars (KV_REST_API_URL / *_TOKEN).
   ============================================================ */
module.exports = async function handler(req, res){
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');

  var url = process.env.KV_REST_API_URL;
  var token = process.env.KV_REST_API_READ_ONLY_TOKEN || process.env.KV_REST_API_TOKEN;
  if(!url || !token){
    res.status(200).send('/* FENIX: backend not configured */');
    return;
  }
  try{
    var r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(['GET', 'fenix:overrides'])
    });
    var data = await r.json();
    var doc = null;
    if(data && typeof data.result === 'string'){
      try{ doc = JSON.parse(data.result); }catch(e){ doc = null; }
    }
    res.status(200).send('window.FENIX_OVERRIDES = ' + JSON.stringify(doc) + ';');
  }catch(e){
    res.status(200).send('/* FENIX: backend read error */');
  }
};
