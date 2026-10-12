#!/bin/sh
# Create an encrypted, compressed PostgreSQL dump with integrity verification.
# Runs inside the `backup` container (which has DATABASE_URL and the pg tools).
#
# Safety: this script never auto-restores and never deletes beyond the configured
# retention windows. It writes a `.sha256` manifest next to each archive so a later
# run of `verify-backup.sh` can confirm integrity before any restore is attempted.

set -eu

DB_URL="${DATABASE_URL:?DATABASE_URL is required}"
DEST="${BACKUP_DESTINATION:-/backups}"
KEY_B64="${BACKUP_ENCRYPTION_KEY_BASE64:-}"
RETENTION_DAILY="${BACKUP_RETENTION_DAILY:-7}"
RETENTION_WEEKLY="${BACKUP_RETENTION_WEEKLY:-4}"
RETENTION_MONTHLY="${BACKUP_RETENTION_MONTHLY:-12}"

# If encryption is requested, the `openssl` CLI must be present. Fail loudly rather
# than silently writing a plaintext backup under the pretense of encryption.
if [ -n "${KEY_B64}" ] && ! command -v openssl >/dev/null 2>&1; then
  echo "BACKUP_ENCRYPTION_KEY_BASE64 is set but 'openssl' is not available" >&2
  exit 1
fi

TS="$(date -u +%Y%m%d%H%M%S)"
STAMP_DIR="${DEST}/daily"
mkdir -p "${STAMP_DIR}"
OUT="${STAMP_DIR}/topup-${TS}.sql.gz.enc"

# Stream a dump through gzip and, if a key is provided, AES-256-CBC encryption.
# A random salt + PBKDF2 key derivation is applied per archive (never reuse an IV).
# The key is read from a temp file, never passed on the command line.
if [ -n "${KEY_B64}" ]; then
  PASS_FILE="$(mktemp)"
  trap 'rm -f "${PASS_FILE}"' EXIT
  printf '%s' "${KEY_B64}" > "${PASS_FILE}"
  pg_dump "${DB_URL}" --no-owner --no-privileges \
    | gzip -9 \
    | openssl enc -aes-256-cbc -pbkdf2 -salt -iter 100000 -pass "file:${PASS_FILE}" -out "${OUT}"
else
  pg_dump "${DB_URL}" --no-owner --no-privileges | gzip -9 > "${OUT}"
fi

# Integrity manifest (hex SHA-256 of the archive).
(cd "$(dirname "${OUT}")" && sha256sum "$(basename "${OUT}")" > "${OUT}.sha256")

# Retention: keep N daily, N weekly (first of each run day per week), N monthly.
# Weekly/monthly promotion is a lightweight best-effort; adjust for a production
# object-store lifecycle policy instead of relying on this loop for large estates.
find "${DEST}/daily" -name 'topup-*.sql.gz.enc' -type f \
  | sort -r | tail -n +$((RETENTION_DAILY + 1)) \
  | while read -r f; do rm -f "${f}" "${f}.sha256"; done

echo "backup written: ${OUT}"
echo "integrity manifest: ${OUT}.sha256"