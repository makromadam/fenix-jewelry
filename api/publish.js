/* ============================================================
   FENIX JEWELRY — publish catalog overrides to the KV store (admin only)
   ------------------------------------------------------------
   GET  -> { configured: boolean }   (is the backend ready to publish?)
   POST -> saves the overrides document so it goes live for everyone.
           Requires header  x-admin-token: <ADMIN_TOKEN>.
   The write key (ADMIN_TOKEN) is the real security boundary — the admin
   panel's PIN is only a client-side convenience.
   Zero dependencies (global fetch + Upstash/Vercel KV REST API).
   Auto-detects the REST URL/token regardless of env-var prefix.
   ============================================================ */

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
  res.setHeader('Cache-Control', 'no-store');

  var kv = resolveKV(false);
  var url = kv.url;
  var writeToken = kv.token;
  var adminToken = process.env.ADMIN_TOKEN;

  if(req.method === 'GET'){
    res.status(200).json({ configured: !!(url && writeToken && adminToken) });
    return;
  }
  if(req.method !== 'POST'){
    res.setHeader('Allow', 'GET, POST');
    res.status(405).json({ error: 'Yalnızca GET/POST' });
    return;
  }
  if(!url || !writeToken){ res.status(501).json({ error: 'KV bağlı değil' }); return; }
  if(!adminToken){ res.status(501).json({ error: 'ADMIN_TOKEN ayarlı değil' }); return; }
  if((req.headers['x-admin-token'] || '') !== adminToken){
    res.status(401).json({ error: 'Yetkisiz: yayın anahtarı hatalı' });
    return;
  }

  var body = req.body;
  if(typeof body === 'string'){
    try{ body = JSON.parse(body); }catch(e){ res.status(400).json({ error: 'Geçersiz JSON' }); return; }
  }
  if(!body || typeof body !== 'object' || Array.isArray(body)){
    res.status(400).json({ error: 'Geçersiz gövde' });
    return;
  }

  var value = JSON.stringify(body);
  if(value.length > 2000000){
    res.status(413).json({ error: 'Çok büyük — görselleri dosya yerine bağlantı (URL) ile ekleyin' });
    return;
  }

  try{
    var r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + writeToken, 'Content-Type': 'application/json' },
      body: JSON.stringify(['SET', 'fenix:overrides', value])
    });
    if(!r.ok){ res.status(502).json({ error: 'KV yazılamadı (' + r.status + ')' }); return; }
    res.status(200).json({ ok: true, bytes: value.length });
  }catch(e){
    res.status(502).json({ error: 'KV bağlantı hatası' });
  }
};
