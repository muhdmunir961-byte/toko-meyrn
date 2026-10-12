// Cloudflare Pages SPA fallback — untuk react-router.
// Jika fail sebenar tidak wujud, hantar index.html supaya refresh pada
// mana-mana laluan (cth /dash/orders) tidak memberi 404.
export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Jangan ganggu laluan /api (diurus oleh functions/api).
  if (url.pathname.startsWith('/api/')) {
    return next();
  }

  // Jika laluan mengandungi titik (fail aset sebenar: .js/.css/.png), teruskan.
  if (url.pathname.includes('.')) {
    return next();
  }

  // Fallback kepada index.html.
  return env.ASSETS.fetch(new Request(`${url.origin}/index.html`, request));
}
