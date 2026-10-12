# Phase 5 plan — Production deployment, DevOps & autonomous operations

## 1. Repository audit (verified against source)

### Stack
- Fastify 5 (TypeScript, ESM/NodeNext), Prisma 6 + PostgreSQL, Zod 3, `@fastify/jwt`/`cors`/`helmet`/`rate-limit`/`swagger`, BullMQ 5 + IORedis, Argon2.
- Modular monolith: HTTP API in `src/app.ts` + `src/server.ts`; BullMQ workers in `src/workers/*`.
- Phase 1–4 business logic in `src/business/*`, `src/integrations/*`, `src/ai/*`.
- Tests: `tests/app.test.ts`, `tests/integrations.test.ts`, `tests/phase4.test.ts` (Vitest).

### What already exists (do not rebuild)
- Auth (JWT/Argon2, role-based), tenant isolation (`tenantId` from membership), orders with immutable price/cost snapshots + idempotency, provider adapter layer (mock + fail-closed Digiflazz), payment/webhook/WhatsApp mocks, BullMQ queues (`provider-sync`, `provider-fulfillment`, `provider-reconciliation`, `webhook-dispatch`, `whatsapp-notifications`, `payment-reconciliation`), AI gateway, reseller/pricing/commission/domain/branding/routing/analytics/fraud/subscription logic, basic `/health` + `/ready` + `/api/v1/admin/operations/health`.

### Missing / gaps for production
- No `Dockerfile`, production compose, `.dockerignore`, `.env.production.example`.
- No reverse proxy/TLS config; no custom-domain cert issuance (by design — gated on verified DNS ownership).
- No CI/CD pipeline, no staging environment config.
- No backup/restore/verify scripts; no `Backup`/`Deployment`/`AuditLog` records in the schema.
- No Prometheus-compatible metrics endpoint; no structured correlation ID propagation across jobs/providers; no centralized logging.
- No alerting config; no incident acknowledge flow (`OperationalIncident` has no `acknowledgedAt`).
- Workers: fixed concurrency (5), no per-job timeout, no stalled-job recovery tuning, no graceful-shutdown entrypoint (`src/workers/index.ts` registers workers but has no long-running `run` entry).
- `src/server.ts` has no SIGTERM/SIGINT graceful shutdown.
- No load-test scripts (k6); no security regression tests; no audit-log model for recovery actions.
- No `package-lock.json` committed (lockfile verification must be introduced in CI).

### Constraints / blockers (unchanged from prior phases)
- This environment has **no Node.js/npm/Docker runtime**: `npm install`, `prisma generate/migrate`, `tsc`, `vitest`, and `docker build` cannot be executed here. All Phase 5 artifacts are verified by static review (brace balance, relation symmetry, import alignment, shell syntax with `bash -n`).
- No live provider/payment/domain/SSL/alerting credentials; everything is mock/placeholder and must be configured before a real launch.

## 2. Stages

1. **5.1 Repository audit & readiness assessment** — this document + `PRODUCTION_READINESS.md`.
2. **5.2 Production Docker & reverse proxy** — `Dockerfile`, `docker-compose.production.yml`, `.dockerignore`, `.env.production.example`, `Caddyfile`.
3. **5.3 CI/CD & staging** — GitHub Actions workflow, staging compose overrides, environment gating.
4. **5.4 Backup & disaster recovery** — `scripts/backup-database.sh`, `restore-database.sh`, `verify-backup.sh`; `OPERATIONS_RUNBOOK.md` recovery section.
5. **5.5 Monitoring, logging & alerting** — Prometheus-compatible metrics module + endpoint, queue/health endpoints, alert rules doc.
6. **5.6 Queue reliability & safe recovery** — worker settings (timeout, stalled, backoff), graceful shutdown entrypoint, idempotency guarantees.
7. **5.7 Security hardening & load testing** — k6 scripts, security regression tests, secret-rotation procedure.
8. **5.8 Release, rollback & readiness docs** — `DEPLOYMENT.md`, `OPERATIONS_RUNBOOK.md`, production acceptance checklist.

## 3. Acceptance criteria

- Production containers build (verified in a Node/Docker environment).
- API and workers start independently and shut down gracefully.
- Environment configuration is validated at startup; PostgreSQL and Redis are never publicly exposed.
- CI passes (typecheck, unit/integration tests, image build/scan); staging deployable.
- Migrations are reviewed and expand-and-contract only; `prisma db push` is never used in production.
- Backups can be created, verified, and restored only in isolated environments with explicit confirmation.
- Monitoring returns real data (no fabricated health/backup status); alerts are configurable via env and deduplicated.
- Queue recovery never auto-retries provider purchases with unknown outcomes; Redis is never the sole source of truth for financial state.
- Load tests produce real measurements (no invented benchmark numbers).
- Security checks pass or blockers are explicitly recorded.
- Phase 1–4 tests continue to pass (where runnable).
- Runbooks and rollback procedures are documented; production launch requires explicit authorization.

## 4. Blockers
- No runtime here to execute build/migration/test/docker steps.
- No live credentials for provider/payment/TLS/alerting — must be supplied before launch.
- `DigiflazzAdapter` and `OfficialWhatsAppAdapter` remain intentionally disabled pending verified configuration.