#!/bin/sh
# Verify the integrity of a backup archive against its `.sha256` manifest and,
# when encrypted, confirm it decrypts cleanly (without writing plaintext to disk).
#
# Usage: verify-backup.sh <archive> [backup-encryption-key-base64]
#   - If a key is provided, decryption is verified by streaming to /dev/null.
#   - Exit 0 = archive intact; non-zero = verification failed.

set -eu

ARCHIVE="${1:?usage: verify-backup.sh <archive> [key-b64]}"
KEY_B64="${2:-${BACKUP_ENCRYPTION_KEY_BASE64:-}}"

[ -f "${ARCHIVE}" ] || { echo "archive not found: ${ARCHIVE}" >&2; exit 1; }

DIR="$(dirname "${ARCHIVE}")"
BASE="$(basename "${ARCHIVE}")"
MANIFEST="${ARCHIVE}.sha256"

[ -f "${MANIFEST}" ] || { echo "manifest not found: ${MANIFEST}" >&2; exit 1; }

# Verify SHA-256 from the manifest (relative to the archive directory).
(cd "${DIR}" && sha256sum -c "${BASE}.sha256") || { echo "integrity check failed" >&2; exit 1; }

# If the archive is encrypted, confirm it decrypts without error.
if [ -n "${KEY_B64}" ]; then
  PASS_FILE="$(mktemp)"
  trap 'rm -f "${PASS_FILE}"' EXIT
  printf '%s' "${KEY_B64}" > "${PASS_FILE}"
  if ! openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:${PASS_FILE}" -in "${ARCHIVE}" 2>/dev/null | gzip -t -; then
    echo "decryption/integrity check failed" >&2
    exit 1
  fi
fi

echo "verified: ${ARCHIVE}"