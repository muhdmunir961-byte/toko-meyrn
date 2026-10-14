# Deployment guide

## Prerequisites

- Docker with BuildKit + Compose v2.
- Secrets stored in a secrets manager / CI environment (not committed).
- Reviewed Prisma migrations present in `prisma/migrations`.
- A reverse-proxy domain with DNS pointed at the load balancer, and ACME email set.

## 1. First-time provisioning

1. Copy the environment template and fill every secret:
   ```sh
   cp .env.production.example .env.production
   # generate secrets:
   openssl rand -base64 48   # JWT_SECRET / API_KEY_PEPPER
   openssl rand -base64 32   # CREDENTIAL_ENCRYPTION_KEY_BASE64 / BACKUP_ENCRYPTION_KEY_BASE64
   ```
2. Build and start (migrations run first, then API/worker/proxy/backup):
   ```sh
   docker compose -f docker-compose.production.yml up -d --build
   ```
3. Verify:
   ```sh
   curl -fsS https://$DOMAIN/health
   curl -fsS https://$DOMAIN/ready
   ```

## 2. Migrations

- Generate a migration locally against a dev DB: `npx prisma migrate dev --name <name>`.
- Review the generated SQL — only **expand-and-contract** changes in production.
- The `migrate` service runs `prisma migrate deploy` on startup. **Never** use
  `prisma db push` in production.
- Migrations are committed on purpose. `backend/.gitignore` must keep
  `!prisma/migrations/**/*.sql` and `!prisma/migrations/migration_lock.toml`
  negations, otherwise the blanket `*.sql` rule silently drops them from git and
  the `migrate` service has nothing to apply.
- The initial migration lives at `prisma/migrations/20261013000000_init` and is
  already applied to the production database (`migrate status` → "Database schema
  is up to date!").

## 3. Rolling updates & rollback

- Deploy: `docker compose -f docker-compose.production.yml up -d --build` (or your
  orchestrator's equivalent). API and worker scale independently.
- Rollback: redeploy the previous image tag (`API_IMAGE`/`API_TAG`). Because changes
  are expand-and-contract, the previous app version works against the same DB schema.
- If a bad migration is deployed, restore from backup (see `OPERATIONS_RUNBOOK.md` §2).

## 4. Secret rotation

- `JWT_SECRET`: generate a new value, deploy, then drain old sessions (clients re-auth).
- `API_KEY_PEPPER`: rotation invalidates all existing API key hashes — re-issue keys to
  tenants after rotating.
- `CREDENTIAL_ENCRYPTION_KEY_BASE64`: rotation requires re-encrypting all stored
  provider/payment credentials (the ciphertext is keyed to the old key). Rotate only via
  a reviewed data-migration script; never rotate without re-encrypting.
- `BACKUP_ENCRYPTION_KEY_BASE64`: new backups use the new key; keep old keys long enough
  to decrypt retained backups (store them in your secrets manager with rotation history).

## 5. Custom (seller) domains & TLS

- Only issue certificates for **verified** seller domains. Phase 4 provides DNS-ownership
  verification (`/api/v1/seller/domains/:id/verify`).
- Add verified domains to `SELLER_DOMAINS` (comma-separated) and reload Caddy:
  ```sh
  docker compose -f docker-compose.production.yml exec caddy caddy reload \
    --config /etc/caddy/Caddyfile
  ```
- Never add unverified domains — issuing a cert implies control you have not confirmed.

## 6. Environments & promotion

CI gates are: PR → verify (typecheck + tests + audit) → build/scan → staging (auto on
main) → production (manual approval). See `.github/workflows/ci.yml`.