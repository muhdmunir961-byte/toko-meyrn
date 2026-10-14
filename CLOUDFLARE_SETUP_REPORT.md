# Cloudflare Setup Report — Multi-Seller SaaS

**Domain:** `tokomeyrn.web.id`
**Backend:** Coolify @ VPS `43.134.91.79` (PostgreSQL + Redis + worker)
**Frontend:** Cloudflare Pages (React/Vite SPA, repo GitHub)
**Repo GitHub:** `muhdmunir961-byte/toko-meyrn`

## Keputusan seni bina (berdasarkan jawapan anda)

1. Frontend statik → **Cloudflare Pages** (auto-deploy dari GitHub).
2. Backend → **kekal di Coolify/VPS** (memerlukan proses Node + PostgreSQL +
   Redis + worker — tidak sesuai untuk Cloudflare Workers).
3. **Satu domain** untuk semua (marketing + seller + admin), guna laluan
   (`/dash`, `/admin`) bukan subdomain.
4. **Tiada subdomain seller** — kedai diselesaikan melalui slug (`/slug`).
5. **Tiada custom domain seller** buat masa ini.

## Fail yang disediakan (dalam repo anda)

| Fail | Tujuan |
|---|---|
| `frontend/functions/api/[[path]].js` | Proxy `/api/*` → `API_ORIGIN` (backend Coolify) |
| `frontend/public/_headers` | Header keselamatan aset statik |
| `frontend/public/_redirects` | Fallback SPA (semua laluan → index.html) |
| `frontend/public/robots.txt` | Benarkan semua crawler |
| `frontend/.env.pages.example` | Contoh environment variables Pages |

## Environment variables (tetapkan di Cloudflare Pages)

| Nama | Nilai | Nota |
|---|---|---|
| `API_ORIGIN` | `https://api.tokomeyrn.web.id` | URL backend API (subdomain api) |
| `PUBLIC_BASE_URL` | `https://tokomeyrn.web.id` | URL awam |

> ⚠️ **Wajib di-set sebelum deploy.** `frontend/functions/api/[[path]].js`
> membaca `env.API_ORIGIN`; jika ia kosong, proxy `/api/*` akan gagal dan
> semua panggilan API dari SPA akan rosak (405 / HTML, bukan JSON).
> Semak: `curl -X POST https://tokomeyrn.web.id/api/v1/auth/login` mesti
> balas JSON (`401 {"error":"invalid credentials"}`), bukan HTML.

> ⚠️ **`wrangler pages deploy` mesti dijalankan dari dalam `frontend/`.**
> wrangler mencari Pages Functions pada `$PWD/functions`; jika dijalankan dari
> repo root, `functions/` tidak akan dihantar dan proxy `/api/*` hilang.

> ⚠️ **PENTING (perlu anda sahkan):** URL Coolify yang anda beri
> (`http://43.134.91.79:8000/...`) ialah **panel kawalan Coolify** (port 8000),
> BUKAN API aplikasi anda. Anda perlu tentukan alamat sebenar yang menghala ke
> service "api" dalam Coolify. Lihat bahagian "Persediaan Coolify" di bawah.

## Persediaan Coolify (backend) — untuk menerima trafik Cloudflare

1. Buka Coolify → service "api" → "Domains".
2. Tambah domain `api.tokomeyrn.web.id` (atau dedahkan port aplikasi).
3. Pastikan `PUBLIC_BASE_URL=https://tokomeyrn.web.id` ditetapkan.
4. **Trusted proxy:** Backend Fastify anda mesti percaya header `X-Forwarded-*`
   daripada Cloudflare supaya IP pelanggan & proto betul. Cloudflare hantar:
   - `CF-Connecting-IP` (IP pelanggan sebenar)
   - `X-Forwarded-Proto: https`
   Lihat `backend/src/server.ts` — jika tiada tetapan `trustProxy`, perlu
   ditambah (saya boleh bantu sediakan, tetapi ia perubahan kod backend).

## Langkah yang TELAH selesai

- [x] Pemeriksaan projek automatik
- [x] Soal jawab (10 soalan)
- [x] Fail konfigurasi Pages (`functions/`, `public/_headers`, `_redirects`,
      `robots.txt`, `.env.pages.example`)
- [x] Dokumen `CLOUDFLARE_DNS.md`, `DEPLOYMENT_STATUS.md`,
      `CLOUDFLARE_TROUBLESHOOTING.md`

## Langkah yang BELUM selesai (perlu tindakan anda / kelulusan)

- [ ] Cipta projek Cloudflare Pages + sambung GitHub
- [ ] Tetapkan environment variables (`API_ORIGIN`, `PUBLIC_BASE_URL`)
- [ ] Tetapkan DNS rekod (apex → Pages, `api` → VPS)
- [ ] SSL/TLS mode `Full (strict)`
- [ ] Tambah domain API di Coolify
- [ ] (Jika perlu) tetapkan `trustProxy` di backend Fastify
- [ ] Ujian end-to-end (lihat `DEPLOYMENT_STATUS.md`)

## Isu keselamatan yang belum selesai

1. **`API_ORIGIN` mesti HTTPS**, bukan HTTP, untuk elakkan bocor data antara
   Cloudflare → VPS. (Jika Coolify belum ada HTTPS, selesaikan dulu.)
2. **`trustProxy` backend** — jika tidak ditetapkan, backend akan nampak semua
   trafik datang dari Cloudflare (IP pelanggan hilang) dan `X-Forwarded-Proto`
   tidak dihormati. Perlu pengesahan/kod.
3. **CSP** — sudah ada dalam `index.html`; pastikan `API_ORIGIN` disenarai dalam
   `connect-src` jika anda tukar kepada domain berasingan (sekarang guna
   same-origin jadi `connect-src 'self'` sudah cukup).
