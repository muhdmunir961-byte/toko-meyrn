#!/usr/bin/env bash
# ============================================================
# AUTO-DEPLOY FRONTEND KE CLOUDFLARE PAGES
#
# Cara guna (Sekali je setup):
#   1. cp .env.example .env
#   2. Isi CLOUDFLARE_API_TOKEN dalam .env (jangan commit .env!)
#   3. Jalankan:  ./deploy.sh
#
# Selepas setup, setiap kali nak update frontend, cuma jalankan:
#   ./deploy.sh
#
# Tiada token hardcode — dibaca dari .env / environment sahaja.
# ============================================================
set -euo pipefail

# Muatkan .env jika wujud (tanpa papar nilai)
if [ -f .env ]; then
  set -a
  # shellcheck disable=SC1091
  source .env
  set +a
fi

# Token mesti ada (dari .env atau environment)
if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "❌ CLOUDFLARE_API_TOKEN tidak dijumpai."
  echo "   Sila isi .env (cp .env.example .env) ATAU export CLOUDFLARE_API_TOKEN."
  exit 1
fi

PROJECT="${CLOUDFLARE_PAGES_PROJECT:-toko-meyrn}"

echo "=== 1. Build frontend ==="
cd frontend
npm run build

echo "=== 2. Deploy dist/ ke Cloudflare Pages: $PROJECT ==="
# PENTING: wrangler mesti dijalankan DARI DALAM frontend/, bukan repo root.
# wrangler mencari Pages Functions pada "$PWD/functions". Jika dijalankan dari
# root, ia cari ./functions (tiada) dan fungsi proxy /api/* TIDAK akan dihantar
# — menyebabkan semua panggilan API dari SPA gagal (405 / HTML, bukan JSON).
npx wrangler pages deploy dist --project-name "$PROJECT"

echo ""
echo "✅ Deploy selesai. URL: https://$PROJECT.pages.dev"
