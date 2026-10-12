# Deployment Status — Cloudflare Setup

**Tarikh:** (dijana semasa setup)
**Domain:** `tokomeyrn.web.id`

## Status semasa

| Komponen | Status | URL / Nilai |
|---|---|---|
| Frontend build | ⏳ Belum dideploy ke Pages | — |
| Backend | ✅ Berjalan di Coolify | VPS `43.134.91.79` |
| PostgreSQL | ✅ Berjalan di Coolify | — |
| Redis | ✅ Berjalan di Coolify | — |
| Cloudflare Pages | ⏳ Belum dicipta | — |
| DNS apex | ⏳ Belum disahkan | — |
| DNS api | ⏳ Belum disahkan | — |
| SSL/TLS | ⏳ Belum disahkan | — |

## Live URLs (selepas selesai)

| Tujuan | URL |
|---|---|
| Laman web (marketing) | `https://tokomeyrn.web.id` |
| Seller / admin | `https://tokomeyrn.web.id/dash`, `/admin` |
| API | `https://api.tokomeyrn.web.id` (atau same-origin via proxy) |

## Langkah seterusnya (urutan)

1. Sahkan alamat API sebenar di Coolify (bukan port 8000).
2. Cipta projek Cloudflare Pages + sambung GitHub.
3. Tetapkan environment variables.
4. Tetapkan DNS (apex + api).
5. Sahkan HTTPS (Full strict).
6. Jalankan ujian (lihat senarai di bawah).

## Senarai ujian (belum dijalankan)

- [ ] `npm run build` (frontend) — berjaya secara lokal ✅ (sudah diverifikasi)
- [ ] Laman web boleh diakses di `https://tokomeyrn.web.id`
- [ ] Sijil HTTPS sah
- [ ] API boleh dihubungi (`/health` → `{"status":"ok"}`)
- [ ] CORS (panggilan API dari frontend)
- [ ] Login / daftar berfungsi
- [ ] Refresh SPA (tidak 404)
- [ ] Checkout sandbox
- [ ] Webhook boleh diakses
- [ ] Header keselamatan (CSP, HSTS)

> Tiada ujian "live" boleh dijalankan sehingga domain + Pages + DNS selesai.
> Saya TIDAK akan menuntut kejayaan tanpa verifikasi sebenar.

## Belum disahkan / disekat

- URL API sebenar di Coolify (perlu pengesahan anda).
- `trustProxy` backend (perubahan kod, perlukan kelulusan).
