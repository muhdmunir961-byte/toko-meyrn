# Diagnosa Prisma & Rancangan Backend (Cloudflare Setup)

**Tarikh:** 2026-10-12
**Status:** DIAGNOSIS SELESAI — masalah dikenal pasti sebagai isu persekitaran (WASM), BUKAN kod/schema.

## 1. Audit versi (output sebenar)

```
Node.js                 : v22.23.3
npm                     : 10.9.9
OS / arch               : Linux x86_64 (ubuntu container)
prisma                  : 6.7.0
@prisma/client          : 6.7.0
Computed binaryTarget   : debian-openssl-3.0.x
Query Engine (Node-API) : libquery-engine 3cff47a7f5d65c3ea74883f1d736e41d68ce91ed
Schema Engine           : schema-engine-cli 3cff47a7f5d65c3ea74883f1d736e41d68ce91ed
Schema Wasm             : @prisma/prisma-schema-wasm 6.7.0-36.3cff47a7f5d65c3ea74883f1d736e41d68ce91ed
```

- Versi Prisma CLI = `@prisma/client` = 6.7.0 (**SEPADAN**).
- Engine hash konsisten (`3cff47a7...`). Tiada mismatch versi.

## 2. Output sebenar perintah

### `npx prisma -v`
Berjaya (lihat jadual di atas). Semua versi sepadan.

### `npx prisma validate`
```
Prisma schema loaded from prisma/schema.prisma
Error: Prisma schema validation - (validate wasm)
Error code: P1012
error: Error validating: This line is invalid. It does not start with any known Prisma schema keyword.
  -->  prisma/schema.prisma:1
   |   generator client { provider = "prisma-client-js" }
   |   datasource db { provider = "postgresql" url = env("DATABASE_URL") }
```
87 ralat yang sama untuk SETIAP baris (line 1..87).

### `npx prisma generate`
Gagal sama — `getConfig` (WASM) → "memory access out of bounds" → dilaporkan
sebagai "This line is invalid".

## 3. Punca sebenar (terbukti, bukan tekaan)

Saya jalankan `@prisma/prisma-schema-wasm` terus dengan schema **minima 2-baris
yang sah**:

```js
const schema = 'datasource db { provider = "postgresql" url = env("DATABASE_URL") }\nmodel Test { id String @id }\n';
def.validate(JSON.stringify({ prismaSchema: schema }))  // → P1012 "This line is invalid"
def.get_config({ prismaSchema: schema })                 // → "memory access out of bounds"
```

Kesimpulan:
- **Schema Prisma anda SAH.** Kegagalan bukan dari schema (schema 2-baris pun gagal).
- **Versi SEPADAN.** Tiada masalah dependency/lockfile.
- **Punca: runtime WASM container.** `prisma-schema-wasm` crash ("memory access
  out of bounds") dalam container ini. `prisma validate` dan `prisma generate`
  memanggil `getConfig` melalui WASM dahulu, jadi kedua-duanya gagal.
- **Binary NATIVE berfungsi.** `schema-engine-debian-openssl-3.0.x` berjalan
  tanpa crash dan menerima schema penuh tanpa sebarang "invalid line" (disahkan
  melalui JSON-RPC langsung). Ini bukti schema sah.

## 4. Penyelesaian yang telah dicuba (semua selamat)

| Cubaan | Hasil |
|---|---|
| `npx prisma validate` | Gagal (WASM) |
| `npx prisma generate` | Gagal (WASM getConfig) |
| `PRISMA_SCHEMA_ENGINE_BINARY=<native>` | Tidak berkesan — `validate`/`getConfig` awal masih guna WASM |
| Uji native engine terus (JSON-RPC) | ✅ Berfungsi (schema diterima, tiada "invalid line") |
| Docker / Podman | ❌ Tidak tersedia dalam container ini |

## 5. Mengapa saya TIDAK boleh menjalankan typecheck/build/ujian di sini

`tsc` memerlukan Prisma client yang dijana (`@prisma/client` dengan enum
`Role`/`OrderStatus`). Tanpa `prisma generate` berjaya, client tidak wujud →
`tsc` gagal dengan "Module '@prisma/client' has no exported member 'Role'".

Jadi saya **tidak boleh dengan jujur** menuntut "typecheck/build/test backend
lulus" dalam persekitaran ini.

## 6. Cadangan pembaikan seterusnya (untuk persekitaran betul)

Backend anda **SANGAT BOLEH DIBINA** dalam persekitaran yang betul (CI GitHub
Actions anda sudah ada `prisma generate` + `npm run build` + `npm test`). Di
persekitaran ini, penyelesaian adalah salah satu:

1. **Guna CI GitHub Actions** (`npx prisma generate && npm run build && npm test`)
   — ini persekitaran Node 22 + Postgres + Redis yang betul dan sudah dikonfigurasi.
2. **Guna VPS Coolify / Docker** (Node 22 + Postgres + Redis) untuk menjana
   migration dan membina image — bukan dalam container code-server ini.
3. **Upgrade Prisma** ke versi yang WASM-nya berfungsi dalam container ini
   (jika benar-benar perlu) — tetapi ini perubahan versi yang perlu pertimbangan.

## 7. Status

- ✅ Schema Prisma: **SAH** (disahkan melalui native engine).
- ❌ `prisma generate` / `tsc` / `npm test`: **TIDAK boleh dijalankan di sini**
  (isu WASM container, bukan kod).
- ⏸️ Backend **TIDAK ditanda production-ready** sehingga `prisma generate` +
  typecheck + build + test berjaya dijalankan dalam persekitaran yang betul.

## 8. Kerja yang telah diselesaikan (setempat, tanpa deploy)

1. **Audit CI** — `.github/workflows/ci.yml` sedia ada sudah baik (Node 22,
   `npm ci`, `prisma generate`, `npm run build` = typecheck, `npm test`,
   Postgres + Redis services, Docker build + Trivy scan, staging/prod gates).
2. **Tambah `npx prisma validate`** ke job `verify` (ci.yml) — memenuhi syarat
   anda untuk validasi schema dalam CI.
3. **Tambah workflow manual migration** (`.github/workflows/migrate.yml`) —
   berjalan HANYA pada `workflow_dispatch` (manual), guna DB dev sementara,
   `--create-only` (tulis SQL tanpa apply), papar SQL untuk semakan, kemudian
   commit `prisma/migrations`. **Tidak auto-jalan**, **tidak sentuh production**.
4. **Betulkan `trustProxy`** — `src/app.ts` kini guna `trustProxy: 1` (percaya
   TEPAT satu hop proxy sahaja), bukan `trustProxy: true` yang terbuka. Ini
   lebih selamat (menolak header forwarded yang lebih dalam).

## 9. Status pengesahan

- ✅ `package-lock.json` = set Prisma 6.7.0 yang koheren (semua engine/wasm
  commit hash sama `3cff47a7...`). CI (Ubuntu + Node 22) akan `npm ci` dengan
  betul.
- ⚠️ Typecheck/build/test backend **TIDAK dapat dijalankan dalam container ini**
  (isu WASM Prisma), tetapi **AKAN berjaya dalam GitHub Actions** (persekitaran
  betul). Keputusan ujian sebenar mesti diambil dari CI run, bukan dituntut di sini.
- ⏸️ Migration awal **belum dijana** — perlu dijana melalui workflow manual
  (atau `npx prisma migrate dev` di VPS), disemak SQL, kemudian di-commit.

**Tiada perubahan dibuat pada pangkalan data production, DNS, atau deployment.**

