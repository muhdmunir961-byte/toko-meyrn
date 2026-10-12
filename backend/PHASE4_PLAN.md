# Phase 4 plan — SaaS business expansion & scalability

## Existing functionality (verified in repository)

- Fastify modular monolith (`src/app.ts`), TypeScript, Prisma/PostgreSQL, Zod, Swagger, JWT/Argon2 auth, tenant-scoped rows with `tenantId` derived from authenticated membership.
- Order engine with immutable per-item price/cost snapshots (`unitPriceMinor`, `costMinor`), idempotency keys, and outbox events.
- Provider adapter layer (`provider.ts`) with `MockProvider` and fail-closed `DigiflazzAdapter`; routing with MANUAL/PRIORITY/LOWEST_COST/HEALTH_BASED; provider attempts/health/sync logs.
- Payment engine (`payment.ts`, `MockPaymentGateway`), webhooks (`webhooks.ts`, `webhook-dispatcher.ts`), WhatsApp mock, crypto (`crypto.ts` AES-256-GCM + API-key hashing).
- BullMQ workers (`workers/*.ts`) for provider sync/fulfillment/reconciliation, webhook dispatch, WhatsApp notifications, payment reconciliation.
- Subscription models (`SubscriptionPlan`, `PlanEntitlement`, `Subscription`) seeded with Free/Starter/Pro/Business; no enforcement logic yet.
- Phase 3 AI layer (`src/ai/*`): gateway, quota, tools, analytics, knowledge, approval; AI Prisma models.
- Tests: `tests/app.test.ts`, `tests/integrations.test.ts` (Vitest).

## Missing dependencies / gaps

- No runtime enforcement of subscription entitlements (reseller count, custom domains, white-label, API access, quotas).
- No reseller, pricing-rule precedence, commission, custom-domain, branding, fraud, analytics-snapshot, or monitoring models.
- No WEIGHTED_SCORE routing strategy; no circuit breaker / maintenance mode / balance-aware routing.
- No operational health/metrics endpoints or structured request correlation.
- No Node/npm runtime in this environment — Prisma generate/migrate, `tsc`, and Vitest cannot be executed here.

## Migration requirements

- Additive only: new enums + models + nullable foreign keys (`Order.resellerId`, `ExternalApiKey.resellerId`, `Store` relations, `Tenant` back-refs). No destructive changes.
- Preserve existing pricing fields (`SellerPricingRule`, `SellerProduct.markup*`) for historical price logic.

## Implementation stages

1. **4.1 Reseller management & hierarchy** — self-referential `Reseller` tree with depth cap, cycle prevention, tenant isolation, commission-enabled flag, reseller API keys.
2. **4.2 Advanced pricing & commission** — deterministic pricing precedence (reseller > product > promotional > category > default), immutable snapshots, commission ledger state machine.
3. **4.3 Custom domains & white-label** — domain ownership verification, host-header safety, structured branding config.
4. **4.4 Advanced provider routing** — WEIGHTED_SCORE strategy, deterministic scoring, unknown-outcome reconciliation safety.
5. **4.5 Advanced analytics** — deterministic aggregation distinguishing platform vs seller vs provider vs reseller vs subscription revenue.
6. **4.6 Fraud/risk & subscription enforcement** — rule-based risk engine + entitlement authorization/usage.
7. **4.7 Monitoring & scalability** — operational health/metrics, liveness/readiness, correlation IDs.
8. **4.8 Integration & regression tests + documentation**.

## Acceptance criteria

- Resellers are tenant-isolated; hierarchy cycles are rejected; max depth enforced.
- Pricing is deterministic; identical inputs always produce identical prices; historical order totals are immutable.
- Commissions are idempotent (one ledger entry per eligible transaction) and reversible.
- Custom domains require verified ownership; host-header spoofing is rejected.
- White-label branding is tenant-specific and sanitized against injection.
- Advanced routing preserves transaction safety; unknown provider outcomes never trigger unsafe failover.
- Analytics correctly attribute financial ownership (never merge platform subscription revenue with seller GMV).
- Fraud events are reviewable; risk scores never auto-block without review.
- Subscription entitlements gate reseller/domain/white-label/API features.
- Monitoring exposes health without leaking credentials/PII.
- Phase 1–3 regression tests still pass (where runnable).

## Blockers

- No Node/npm/Docker runtime available here — build, migration, and tests must run in a Node environment.
- No live provider/payment/domain/SSL credentials — verified via deterministic mocks; certificate issuance is never claimed without provider confirmation.

## Run (in a Node environment)

```bash
npm install
npm run db:generate
npx prisma migrate dev --name phase4
npm run build
npm test
```