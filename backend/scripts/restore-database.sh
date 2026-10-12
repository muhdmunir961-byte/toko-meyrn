#!/bin/sh
# Restore a verified, encrypted backup into a PostgreSQL database.
#
# IMPORTANT — run only against an isolated/staging database. This script is
# intentionally NOT wired into any automated pipeline. It requires an explicit
# confirmation flag so a stray invocation cannot wipe a production database.
#
# Usage: restore-database.sh <archive> <target-database-url> <key-b64>
#   The target URL must point to a dedicated restore database (never the live one).

set -eu

ARCHIVE="${1:?usage: restore-database.sh <archive> <target-db-url> <key-b64>}"
TARGET="${2:?target DATABASE_URL is required}"
KEY_B64="${3:?encryption key (base64) is required}"

# Explicit, non-interactive confirmation token guards against accidental runs.
CONFIRM="${RESTORE_CONFIRM:-}"
if [ "${CONFIRM}" != "I-understand-this-overwrites-the-target-database" ]; then
  echo "refusing to restore without explicit confirmation" >&2
  echo "set RESTORE_CONFIRM='I-understand-this-overwrites-the-target-database' to proceed" >&2
  exit 1
fi

[ -f "${ARCHIVE}" ] || { echo "archive not found: ${ARCHIVE}" >&2; exit 1; }

PASS_FILE="$(mktemp)"
trap 'rm -f "${PASS_FILE}"' EXIT
printf '%s' "${KEY_B64}" > "${PASS_FILE}"

# Decrypt -> decompress -> restore in a single stream. `--clean` drops and recreates
# objects; it never creates the database itself, so the target DB must already exist.
openssl enc -d -aes-256-cbc -pbkdf2 -pass "file:${PASS_FILE}" -in "${ARCHIVE}" \
  | gzip -dc \
  | psql "${TARGET}" --single-transaction --set ON_ERROR_STOP=1

echo "restore complete from: ${ARCHIVE}"