// Cloudflare Pages Functions — proxy /api/* kepada backend Coolify anda.
// Ini menjadikan frontend (Pages) dan API (VPS) kelihatan pada domain yang sama,
// supaya panggilan relatif `/api/v1/...` dalam frontend terus berfungsi.
//
// Pastikan tetapkan environment variable API_ORIGIN di Pages:
//   API_ORIGIN = http://43.134.91.79:8000  (ganti dengan URL Coolify API anda)
//
// NOTA: Port 8000 dalam URL Coolify anda ialah panel kawalan Coolify, BUKAN API
// aplikasi. Anda perlu guna port/host yang menghala ke service "api" sebenar
// dalam Coolify (biasanya port 80/443 atau domain khusus). Sila sahkan di
// Coolify → service "api" → "Domains/Ports".

export async function onRequest(context) {
  const { request, env } = context;

  // Hanya proksi laluan /api/.
  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, env.API_ORIGIN);

  const headers = new Headers(request.headers);
  // Cloudflare letakkan IP pelanggan sebenar dalam header ini.
  headers.set('X-Forwarded-For', request.headers.get('cf-connecting-ip') || '');
  headers.set('X-Forwarded-Proto', 'https');
  headers.set('X-Forwarded-Host', url.host);
  // Hapus header hop-by-hop.
  headers.delete('host');

  const init = {
    method: request.method,
    headers,
    redirect: 'manual',
  };

  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  try {
    const resp = await fetch(target.toString(), init);
    const out = new Response(resp.body, resp);
    // Benarkan asal yang sama sahaja (CORS origin:false di backend).
    out.headers.set('Access-Control-Allow-Origin', url.origin);
    return out;
  } catch (err) {
    return new Response(JSON.stringify({ error: 'API tidak dapat dihubungi' }), {
      status: 502,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
