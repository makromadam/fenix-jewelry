/* ============================================================
   FENIX JEWELRY — public read of the published catalog overrides
   ------------------------------------------------------------
   Returns a tiny JS file that sets window.FENIX_OVERRIDES from the KV
   store, so every visitor sees the admin's edits WITHOUT a re-deploy.
   Loaded right after the shipped assets/fenix.overrides.js, so:
     - backend has data  -> it wins (live edits)
     - backend empty/off -> no-op, the shipped static file stays in effect
   Zero dependencies (global fetch + Upstash/Vercel KV REST API).
   Auto-detects the REST URL/token regardless of the env-var prefix the
   Vercel integration uses (KV_*, UPSTASH_*, or a custom STORAGE_* prefix).
   ============================================================ */

/* Find the Upstash/KV REST endpoint + token from the environment, whatever
   prefix Vercel applied (e.g. KV_REST_API_URL, UPSTASH_REDIS_REST_URL,
   STORAGE_KV_REST_API_URL, ...). */
function resolveKV(readOnly){
  var env = process.env, url = null, writeTok = null, roTok = null, k, v;
  for(k in env){
    v = env[k];
    if(!v) continue;
    if(!url && /REST(_API)?_URL$/.test(k) && /^https?:/i.test(v)) url = v;
    if(/TOKEN$/.test(k) && /REST/.test(k)){
      if(/READ_ONLY/.test(k)){ if(!roTok) roTok = v; }
      else if(!writeTok){ writeTok = v; }
    }
  }
  url = url || env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL || null;
  writeTok = writeTok || env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN || null;
  roTok = roTok || env.KV_REST_API_READ_ONLY_TOKEN || null;
  return { url: url, token: readOnly ? (roTok || writeTok) : writeTok };
}

module.exports = async function handler(req, res){
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=20, stale-while-revalidate=60');

  var kv = resolveKV(true);
  if(!kv.url || !kv.token){
    res.status(200).send('/* FENIX: backend not configured */');
    return;
  }
  try{
    var r = await fetch(kv.url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + kv.token, 'Content-Type': 'application/json' },
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
