# Multi-seller top-up SaaS API

Phase 1 modular-monolith foundation using Fastify, TypeScript, Prisma/PostgreSQL, JWT, Argon2id, Zod, and Swagger.

## Run locally

1. Install Node.js LTS and npm.
2. Copy `.env.example` to `.env` and replace `JWT_SECRET`.
3. Start infrastructure: `docker compose up -d`.
4. Install and generate: `npm install && npm run db:generate`.
5. Create the first migration: `npx prisma migrate dev --name init`.
6. Seed: `npm run db:seed`.
7. Start: `npm run dev`.

OpenAPI UI is available at `http://localhost:3000/docs`; health is at `/health`.

## Implemented API slice

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/storefront/:slug`
- `GET /api/v1/storefront/:slug/products`
- `GET/POST /api/v1/seller/products`
- `POST /api/v1/orders` (requires `Idempotency-Key`)
- `POST /api/v1/orders/:id/mock-payment`
- `GET /api/v1/seller/orders`

Phase 2 additions include scoped external API keys, external order idempotency, provider configuration/testing/sync queue endpoints, routing rules, webhook registration, WhatsApp mock configuration, and BullMQ queue definitions. Digiflazz and official WhatsApp operations remain disabled until their official credentials/configuration are verified.

Phase 3 (AI intelligence layer) adds a deterministic AI model gateway with capability checks and JSON-schema output validation, tenant-scoped quota reservation, a customer/seller tool authorization boundary, prompt-injection filtering, deterministic seller analytics, and a tenant-isolated knowledge base with chunking/content hashing. New endpoints include `POST /api/v1/ai/chat`, `POST /api/v1/seller/ai/analytics`, `GET/POST /api/v1/seller/ai/knowledge`, `DELETE /api/v1/seller/ai/knowledge/:id`, `POST /api/v1/seller/ai/provider/analyze`, `GET /api/v1/seller/ai/usage`, and `GET /api/v1/seller/ai/workflows`. Provider mapping proposals are declarative JSON that require separate human approval before activation, and the LLM can never authorize payments, fulfillment, or provider activation on its own.

The mock payment endpoint is development-only behavior. No real gateway or provider is claimed. Provider fulfillment, refresh-token rotation, webhooks, and BullMQ workers are explicit follow-up work.

Phase 4 (SaaS business expansion & scalability) adds a tenant-isolated multi-level reseller hierarchy (bounded depth, cycle prevention, reseller-scoped API keys), a deterministic pricing engine with explicit precedence (reseller override > product override > promotional > category > default, plus minimum-margin enforcement and immutable checkout snapshots), an immutable commission ledger gated on both payment confirmation and successful fulfillment, custom-domain ownership verification with host-header spoofing protection, sanitized white-label branding, weighted provider routing scoring, analytics that keep platform subscription revenue distinct from seller GMV, a rule-based fraud engine that never auto-blocks without human review, and subscription entitlement/limit/grace enforcement. New endpoints include `POST/GET/PATCH /api/v1/seller/resellers` (+`/:id/suspend`, `/:id/orders`, `/:id/commissions`, `/:id/analytics`), `GET/POST /api/v1/seller/pricing/rules`, `POST /api/v1/seller/pricing/preview`, `POST/GET /api/v1/seller/domains` (+`/:id/verify`, `DELETE /api/v1/seller/domains/:id`), `GET/PATCH /api/v1/seller/branding`, `GET /api/v1/public/store/:slug/branding`, `GET/PATCH /api/v1/seller/routing` (+`/health`), `GET /api/v1/seller/analytics/advanced|products|providers|resellers`, and `GET /api/v1/admin/fraud/events`, `POST /api/v1/admin/fraud/events/:id/review`, `GET /api/v1/admin/operations/health`, `GET/PATCH /api/v1/admin/subscription/plans`.

SSL certificates are never claimed issued without provider confirmation; domain activation requires verified DNS ownership. Reseller commission settlement workers, fraud signal ingestion, and scheduled analytics snapshots remain follow-up work (async BullMQ workers), and all Phase 4 logic is verified with deterministic unit tests pending a Node.js runtime.