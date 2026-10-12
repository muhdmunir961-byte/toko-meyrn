# Operations runbook

Runbooks for the Topup SaaS platform. Every recovery action that mutates production
state requires explicit authorization and, where noted, a written approval record.
Never fabricate a healthy status; investigate before declaring an incident resolved.

## 1. Incidents — open, acknowledge, resolve

1. **Detect** — alert fires (metric threshold, queue depth, health check).
2. **Triage** — check `/api/v1/admin/operations/health` (SUPER_ADMIN) and `/metrics`.
3. **Acknowledge** — record the incident in `OperationalIncident` and notify the
   on-call channel. Do not auto-resolve.
4. **Contain** — stop the bleeding (e.g. disable a failing provider, pause a queue)
   *before* root-causing.
5. **Fix** — make the change behind a reviewed PR; record the fix in the incident.
6. **Resolve** — set `resolvedAt` only after the underlying condition is fixed and
   verified. Post-incident review follows.

## 2. Database backup & recovery

Backups run automatically (see `backup` service). Each archive has a `.sha256`
manifest; restores are only performed in isolated environments.

### Verify a backup
```sh
./scripts/verify-backup.sh /backups/daily/topup-YYYYMMDDHHMMSS.sql.gz.enc "$BACKUP_KEY"
```

### Restore to an isolated database (rehearsal)
1. Create a dedicated target DB (never the live one).
2. Confirm the archive verifies (step above).
3. Run:
   ```sh
   RESTORE_CONFIRM='I-understand-this-overwrites-the-target-database' \
   ./scripts/restore-database.sh <archive> <target-db-url> "$BACKUP_KEY"
   ```
4. Smoke-test the restored DB; record the result.

**Never** restore over the live database outside an approved, rehearsed DR plan.

### Recovery point/objective
- RPO: interval of the last successful backup (default daily; tune for your SLA).
- RTO: time to restore + validate (measure during rehearsal; record it here).

## 3. Queue operations

Queues: `provider-sync`, `provider-fulfillment`, `provider-reconciliation`,
`webhook-dispatch`, `whatsapp-notifications`, `payment-reconciliation`.

- **Stalled jobs**: workers auto-recover stalled jobs up to `WORKER_MAX_STALLED` times.
- **Poison messages**: after retries are exhausted jobs land in `failed`; inspect the
  error, fix the cause, and re-enqueue manually — never bulk-retry provider purchases
  with unknown outcomes (risk of double-submission). The database is the source of truth
  for financial state, not Redis.
- **Idempotency**: provider submissions use an idempotency key so a safe retry is a
  no-op; webhooks are de-duplicated by `(endpointId, eventId)`.

## 4. Monitoring & alerting

- **Metrics**: Prometheus-compatible text at `/metrics` (no secrets/PII/tenant ids).
- **Liveness**: `/health` (process only). **Readiness**: `/ready` (checks the DB).
- **Alert channels**: configured via `ALERT_CHANNEL_ID` and `ALERT_WEBHOOK_URL`; secret
  tokens are supplied via env/secrets, never committed. Alerts are deduplicated by a
  stable incident key so a persistent failure fires once until acknowledged.

Alert thresholds (defaults; adjust after measuring real baselines):

| Metric | Threshold | Severity |
| --- | --- | --- |
| `http_requests_total` error rate | >1% over 5m | warning |
| `/ready` failing | any | critical |
| queue depth (provider-sync) | >500 for 5m | warning |
| worker stalled count | >0 sustained | critical |
| backup age | >1.5x interval | critical |

## 5. Security incident response

1. **Isolate** — revoke the affected API key/credential immediately.
2. **Rotate** — rotate `JWT_SECRET`, `API_KEY_PEPPER`, and
   `CREDENTIAL_ENCRYPTION_KEY_BASE64` (see `DEPLOYMENT.md` — secret rotation).
3. **Investigate** — review audit-relevant tables and access logs.
4. **Notify** — per your data-breach policy.
5. **Harden** — record the finding in `PRODUCTION_READINESS.md` security section.

## 6. Rollback

Application rollback is re-deploying the previous image tag. Database rollback is a
restore from the last good backup (rehearsed). See `DEPLOYMENT.md` for the procedure.