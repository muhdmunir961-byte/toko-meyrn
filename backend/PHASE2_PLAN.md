# Phase 2 implementation plan

## Existing compatible components

- Fastify 5 application in `src/app.ts`
- Prisma PostgreSQL persistence with tenant IDs on seller-owned records
- JWT authentication and Argon2 password hashing
- Zod validation, Swagger UI, rate limiting, Helmet, and Vitest
- Mock payment completion route and provider transaction model

## Missing functionality

- Provider adapter contract and provider configuration persistence
- Verified provider integration details (Digiflazz documentation/credentials are not available in this workspace)
- Provider routing and safe failover states
- Hashed seller API keys and persistent idempotency records
- Signed webhook endpoints/delivery records and SSRF validation
- WhatsApp transport abstraction and message persistence
- Redis/BullMQ workers and durable outbox dispatch

## Required database changes

Add tenant-scoped provider configurations/attempts/health/sync logs, API keys and idempotency records, webhook endpoints/events/deliveries, WhatsApp integrations/messages, payment gateway configurations/events, and an outbox event table. Existing models are reused rather than duplicated.

## Implementation order

1. Pure provider contracts, normalization, routing, crypto, and SSRF utilities.
2. Prisma model extensions and seller integration routes.
3. Universal API authentication and idempotency.
4. Webhook persistence/signing/dispatch primitives.
5. WhatsApp adapter and notification persistence.
6. Queue wiring once Redis/BullMQ dependencies are available.

## Risks and blockers

- No Node/npm runtime is installed, so generated Prisma client, migrations, typechecks, and tests cannot execute here.
- Digiflazz live endpoint/signature/response behavior must be verified against current official documentation before enabling live calls. No live transaction is implemented.
- Outbound HTTP should be implemented behind a worker with DNS revalidation and redirect refusal; this slice provides the validation/signature primitives.

## Acceptance tests

- Provider routing never fails over an UNKNOWN attempt.
- API keys are hashed, scoped, tenant-bound, expirable, and revocable.
- Reusing an idempotency key with a different payload is rejected.
- Webhook signatures are deterministic and SSRF checks reject loopback/private/link-local destinations.
- Existing health and Phase 1 routes remain available.