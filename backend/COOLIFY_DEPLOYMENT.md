# Coolify Deployment — Backend (API + Worker)

Panduan untuk deploy backend ke Coolify menggunakan **satu Dockerfile multi-stage**
yang sedia ada. Dua service berasingan (API + Worker) guna **image yang sama**,
cuma **command** yang berbeza.

## Status Prisma (kemas kini)

- Prisma **6.19.0** (sepadan prisma/client/engines), 2 dep wasm pencemar dibuang.
- `prisma validate`/`generate` gagal dalam **code-server** (isu WASM runtime
  container, BUKAN kod). Ia **AKAN berjaya dalam Docker `node:22-alpine`**.
- Pengesahan sebenar mesti dibuat di sini (Docker build), bukan code-server.

## Fakta yang disahkan (dari kod)

| Perkara | Nilai |
|---|---|
| Dockerfile | `backend/Dockerfile` (multi-stage: build → migrate → runtime) |
| API entrypoint | `node dist/src/server.js` (port 3000) |
| Worker entrypoint | `node dist/src/workers/run.js` |
| Prisma client | Dijana semasa build (`npx prisma generate` dalam Dockerfile) |
| Port API | 3000 |
| Pangkalan data | PostgreSQL (private network Coolify) |
| Queue | Redis (BullMQ, 6 queue) |

## Langkah bina & sahkan (di Coolify/VPS)

```bash
cd /path/ke/backend
docker build -t topup-api .     # jalankan prisma generate + npm run build
docker images | grep topup-api  # sahkan image wujud (build hijau)
```

Jika build hijau → backend **boleh dibina**. Ini pengesahan sebenar yang
code-server tak dapat beri.

## 1. Dockerfile (TIADA perubahan diperlukan)

Dockerfile sedia ada sudah betul:
- Multi-stage (`node:22-alpine`).
- `npm ci` guna lockfile.
- `npx prisma generate` + `npm run build` (typecheck) semasa build.
- Non-root user `app`.
- Healthcheck API di `/health`.

> ⚠️ Satu keperluan: **migration mesti wujud** dalam `prisma/migrations` sebelum
> deploy production. Sila jana melalui workflow manual `.github/workflows/migrate.yml`
> dahulu (lihat PRISMA_DIAGNOSIS.md §8).

## 2. Service 1 — API

Di Coolify → tambah resource → **"Dockerfile"** (bukan "Application" generik,
jika Coolify ada pilihan ini) atau **"Application"** dengan Dockerfile path.

| Tetapan | Nilai |
|---|---|
| Build pack | Dockerfile |
| Dockerfile location | `backend/Dockerfile` |
| Build context | `backend/` |
| Port (expose) | **3000** |
| Command | (biarkan default — `node dist/src/server.js`) |
| Environment | lihat jadual env di bawah |

## 3. Service 2 — BullMQ Worker

Sama seperti Service 1, tetapi **tukar Command**.

| Tetapan | Nilai |
|---|---|
| Build pack | Dockerfile (image sama) |
| Command | `node dist/src/workers/run.js` |
| Port | (tiada — worker tidak dedah port) |
| Environment | sama seperti API |

## 4. Environment variables (kedua-dua service)

| Nama | Nota |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `DATABASE_URL` | URL PostgreSQL dalaman Coolify (cth `postgresql://...:5432/topup`) |
| `REDIS_URL` | URL Redis dalaman Coolify (cth `redis://...:6379`) |
| `REDIS_PASSWORD` | jika Redis anda guna password |
| `JWT_SECRET` | rahsia panjang (≥32 aksara) |
| `API_KEY_PEPPER` | rahsia panjang (≥32 aksara) |
| `CREDENTIAL_ENCRYPTION_KEY_BASE64` | base64 32-byte |
| `PUBLIC_BASE_URL` | `https://tokomeyrn.web.id` (atau domain API) |

> JANGAN masukkan nilai rahsia dalam chat atau commit. Letakkan dalam
> **Coolify Secrets** atau environment variables yang disulitkan.

## 5. PostgreSQL & Redis (private network)

- Jika anda sudah ada service PostgreSQL & Redis di Coolify (seperti dinyatakan),
  **GUNA semula** — jangan cipta pendua.
- Pastikan ketiga-tiga (API, Worker, Postgres, Redis) berada dalam **project/network
  yang sama** di Coolify supaya boleh capai melalui nama service dalaman.
- `DATABASE_URL` dan `REDIS_URL` guna host = nama service dalaman Coolify
  (bukan IP awam).

## 6. trustProxy (sudah dibaiki)

`src/app.ts` kini guna `trustProxy: 1` (percaya tepat satu hop proxy). Ini sesuai
untuk Coolify → Cloudflare → Fastify. Jika anda letak Cloudflare di hadapan,
satu hop adalah betul.

## 7. Migration (SEBELUM production)

1. Jana migration awal: jalankan workflow manual `Generate migration` di GitHub
   Actions → semak SQL yang dihasilkan.
2. Commit `prisma/migrations` ke repo.
3. Deploy — service `migrate` (jika guna docker-compose) atau jalankan
   `npx prisma migrate deploy` sekali.

## 8. Status semasa

- ✅ Dockerfile multi-stage sedia ada & betul.
- ✅ trustProxy dibaiki (`trustProxy: 1`).
- ⏸️ Migration awal belum dijana (perlu workflow manual).
- ⏸️ CI belum dijalankan di GitHub (perlu tolak kod ke repo).
- ⏸️ Tiada deploy ke Coolify/production (belum ada kelulusan).
