/* ============================================================
   FENIX JEWELRY — publish catalog overrides to the KV store (admin only)
   ------------------------------------------------------------
   GET  -> { configured: boolean }   (is the backend ready to publish?)
   POST -> saves the overrides document so it goes live for everyone.
           Requires header  x-admin-token: <ADMIN_TOKEN>.
   The write key (ADMIN_TOKEN) is the real security boundary — the admin
   panel's PIN is only a client-side convenience.
   Zero dependencies (global fetch + Upstash/Vercel KV REST API).
   ============================================================ */
module.exports = async function handler(req, res){
  res.setHeader('Cache-Control', 'no-store');

  var url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  var writeToken = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
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
