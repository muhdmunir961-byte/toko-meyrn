# Cloudflare DNS — `tokomeyrn.web.id`

Rekod DNS yang perlu wujud untuk seni bina anda. Semua nilai di bawah perlu
disahkan/dibuat melalui **Cloudflare Dashboard → domain → DNS**, atau dengan
kelulusan anda sahaja.

> ⚠️ Jangan ubah sebarang rekod live tanpa kelulusan. Ini hanya panduan.

## Rekod yang diperlukan

### 1. Apex domain → Cloudflare Pages (frontend)

| Jenis | Nama | Kandungan | Proksi |
|---|---|---|---|
| `CNAME` | `@` (tokomeyrn.web.id) | `<pages-project>.pages.dev` | ✅ (Proxied — ikon oren) |

- Selepas anda cipta projek Pages, Cloudflare akan bagi subdomain `*.pages.dev`.
  Gantikan `<pages-project>` dengan nama sebenar.
- Untuk apex domain, Cloudflare biasanya guna `CNAME` dengan "CNAME flattening"
  (automatik). Jika dashboard minta `A` record, gunakan IP yang diberi oleh
  Cloudflare semasa menambah "Custom domain" pada projek Pages.

### 2. Subdomain API → VPS Coolify (backend)

| Jenis | Nama | Kandungan | Proksi |
|---|---|---|---|
| `A` | `api` (api.tokomeyrn.web.id) | `43.134.91.79` | ✅ (Proxied) |

- Ini menghala trafik `/api` kepada VPS anda melalui Cloudflare (mendapat
  HTTPS + perlindungan DDoS).
- Di Coolify, service "api" mesti menerima trafik dari Cloudflare (lihat
  `CLOUDFLARE_SETUP_REPORT.md` untuk tetapan trusted proxy).

### 3. (Pilihan) `www` → apex

| Jenis | Nama | Kandungan | Proksi |
|---|---|---|---|
| `CNAME` | `www` | `@` | ✅ |

## Tetapan SSL/TLS

- **Mode:** `Full (strict)` — Cloudflare akan minta sijil sah dari pelayan asal
  anda. Coolify/Caddy sudah sediakan sijil (atau boleh guna sijil Cloudflare
  Origin).
- Jangan guna `Flexible` — itu tidak selamat (trafik asal tidak disulitkan).

## Senarai semak DNS

- [ ] `CNAME @` → `*.pages.dev` (frontend)
- [ ] `A api` → `43.134.91.79` (backend)
- [ ] (pilihan) `CNAME www` → `@`
- [ ] SSL/TLS mode = `Full (strict)`
