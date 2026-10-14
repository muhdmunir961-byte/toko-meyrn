# Google Sign-In — panduan setup (5 minit)

Butang **Google Sign-In** sudah siap sepenuhnya dalam kod. Ia **tersembunyi**
secara automatik sehingga anda isi Client ID. Ikut langkah di bawah sekali sahaja.

> Tiada client **secret** diperlukan. Aliran ini guna *ID token* (browser dapat
> token, server sahkan tandatangan) — jadi tiada rahsia disimpan.

---

## Bahagian A — Dapatkan Client ID (di Google Cloud Console)

1. Buka <https://console.cloud.google.com/> dan log masuk.
2. **Cipta projek** (atas kiri) → nama cth `Toko Meyrn` → **Create**.
3. Pergi **APIs & Services → OAuth consent screen**:
   - User type: **External** → **Create**
   - App name: `Toko Meyrn`
   - User support email: email anda
   - Developer contact email: email anda
   - **Save and Continue** (skip Scopes dan Test users → Save)
4. Pergi **APIs & Services → Credentials** → **Create Credentials** →
   **OAuth client ID**:
   - Application type: **Web application**
   - Name: `Toko Meyrn Web`
   - **Authorized JavaScript origins** → **Add URI**, tambah KEDUA-DUA:
     ```
     https://tokomeyrn.web.id
     https://toko-meyrn.pages.dev
     ```
   - **Authorized redirect URIs** → **biar kosong** (tidak perlu untuk ID token)
   - **Create**
5. Salin **Client ID** yang keluar (bentuknya macam
   `1234567890-abc123.apps.googleusercontent.com`).

---

## Bahagian B — Masukkan Client ID ke 2 tempat

Client ID yang **sama** perlu ada di backend (untuk sahkan token) dan di frontend
(untuk paparkan butang).

### 1. Backend (Coolify)

Coolify → app `toko-meyrn-api` → **Environment Variables** → tambah:

```
GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com
```

Kemudian **Redeploy** app tersebut.

### 2. Frontend (Cloudflare Pages)

Ini di-**bakar ke dalam build** (Vite), jadi ia tidak boleh jadi env var runtime.
Guna salah satu cara:

**Cara mudah (guna deploy.sh):**

```bash
cd /config/workspace/frontend
echo 'VITE_GOOGLE_CLIENT_ID=1234567890-abc123.apps.googleusercontent.com' > .env
cd .. && ./deploy.sh
```

> `frontend/.env` sudah di-ignore oleh git — selamat, tidak akan ter-commit.

---

## Bahagian C — Uji

1. Buka <https://tokomeyrn.web.id/login> → butang **Continue with Google** patut muncul.
2. Klik → pilih akaun Google → patut masuk dashboard.

**Kalau butang tak muncul:**
- Pastikan `VITE_GOOGLE_CLIENT_ID` betul dan anda sudah `./deploy.sh` semula
  (perlu build semula — env var dibaca masa build, bukan masa runtime).

**Kalau butang muncul tapi klik gagal:**
- Pastikan domain anda ada dalam **Authorized JavaScript origins** (Bahagian A langkah 4).
- Pastikan `GOOGLE_CLIENT_ID` di Coolify **sama** dengan frontend, dan app
  sudah di-redeploy.

---

## Nota teknikal

- Server sahkan token terhadap JWKS Google (`node:crypto`, tiada dependency baharu).
- Semakan yang dibuat: algoritma (`RS256` sahaja), `kid` (dengan refresh bila
  Google rotate key), tandatangan, `iss`, `aud`, `exp`, dan **email mesti verified**.
- Email Google yang belum verified **ditolak** — supaya tiada siapa boleh rampas
  akaun orang lain.
- Login kali pertama: akaun + tenant + kedai dicipta automatik (201).
  Login seterusnya: akaun sedia ada dipautkan (200).
- Kalau `GOOGLE_CLIENT_ID` kosong, endpoint balas **503** dan login biasa
  (email+password) tetap berfungsi seperti biasa.
- CSP dalam `index.html` sudah benarkan `accounts.google.com`.
