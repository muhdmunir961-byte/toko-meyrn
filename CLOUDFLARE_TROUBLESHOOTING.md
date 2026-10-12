# Cloudflare Troubleshooting — Panduan Penyelesaian Masalah

## 1. Laman web tidak muncul / 404

**Gejala:** `https://tokomeyrn.web.id` tidak boleh diakses.

- Semak DNS: Cloudflare → domain → DNS → rekod `@` mesti "Proxied" (ikon oren).
- Semak projek Pages: mesti ada "Custom domain" `tokomeyrn.web.id`.
- Tunggu penyebaran DNS (boleh 5–30 minit, kadang 1 jam).

## 2. Refresh pada `/dash` atau `/login` bagi 404

**Gejala:** Buka terus `https://tokomeyrn.web.id/dash/orders` → 404.

- Pastikan `public/_redirects` dan `functions/_middleware.js` sudah dideploy.
- Di Pages → Settings → "Functions" pastikan Functions diaktifkan.

## 3. API tidak dihubungi / "Network error"

**Gejala:** Halaman muncul tetapi data kosong, atau "Network error".

- Sahkan environment variable `API_ORIGIN` betul (URL API sebenar, bukan port 8000).
- Cuba akses `https://api.tokomeyrn.web.id/health` di pelayar → mesti `{"status":"ok"}`.
- Jika `api` subdomain belum wujud, buat dulu rekod DNS `A` → IP VPS.

## 4. CORS error

**Gejala:** Konsol pelayar tunjuk "CORS policy" error.

- Frontend guna same-origin proxy (`/api`), jadi CORS sepatutnya tiada.
- Jika anda panggil `api.tokomeyrn.web.id` terus (bukan `/api`), backend `origin:false`
  akan menolak. Guna `/api` sahaja.

## 5. HTTPS "not secure" / sijil tidak sah

- SSL/TLS mode mesti `Full (strict)`.
- Pastikan backend (Coolify/Caddy) ada sijil sah (atau guna Cloudflare Origin cert).
- Jangan guna `Flexible`.

## 6. IP pelanggan semua nampak sama (semua dari Cloudflare)

- Backend Fastify perlu `trustProxy: true` supaya guna `X-Forwarded-For`.
- Ini perubahan kod backend (perlu kelulusan).

## 7. Perubahan kod tidak muncul

- Pastikan tolak ke GitHub (branch yang disambung ke Pages).
- Semak Pages → "Deployments" → status hijau.
- Binaan gagal? Buka log deployment dan baca ralat.

## 8. Panggilan `/api` kembali 502

- `API_ORIGIN` salah atau backend turun.
- Semak log Functions di Pages (console).
- Sahkan backend boleh diakses dari internet (bukan hanya localhost VPS).

## Nota penting

- Jangan ubah nameserver, DNS pengeluaran, URL callback pembayaran, atau deploy
  live tanpa kelulusan.
- Jangan letak token API Cloudflare dalam chat — masukkan melalui
  environment variable / dashboard.
