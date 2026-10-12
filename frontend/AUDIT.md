# Frontend Phase F0 — Repository Audit Report

> Author: Lead frontend architect
> Date: 2026-10-12
> Scope: **Audit only.** No pages, components, or tooling implemented. The
> `frontend/` scaffold currently contains only a placeholder `README.md`.

Every endpoint, schema, permission, and business rule below was traced to a
concrete route handler or Prisma model in the backend source. Nothing is assumed.

---

## 1. Architecture inventory

### Repository layout (post-reorganization)

```
.
├── backend/                     # Fastify + TypeScript + Prisma/PostgreSQL API
│   ├── prisma/schema.prisma     # Data model (single source of truth)
│   ├── prisma/seed.ts           # Demo category, master product, 4 subscription plans
│   ├── src/
│   │   ├── app.ts               # ~153 lines; ALL routes + handlers in one file
│   │   ├── server.ts            # API entrypoint (graceful shutdown)
│   │   ├── env.ts               # Zod env validation, fail-fast
│   │   ├── business/            # pricing, analytics, reseller, commission, domain,
│   │   │                        #   branding, fraud, subscription, routing-score, metrics, observability
│   │   ├── ai/                  # gateway (mock), quota, tools, knowledge, analytics, approval
│   │   ├── integrations/        # provider, payment, webhooks, crypto, outbox, retry, routing, whatsapp
│   │   └── workers/             # BullMQ queues + worker entrypoints
│   ├── tests/                   # app, integrations, phase4, security, load (k6)
│   ├── Dockerfile, docker-compose*.yml, Caddyfile, .dockerignore
│   └── *.md                     # ARCHITECTURE, DEPLOYMENT, OPERATIONS_RUNBOOK, PHASE2-5 plans, etc.
├── frontend/                    # SCAFFOLD ONLY (README.md placeholder)
├── .github/workflows/ci.yml     # Must remain at repo root (GitHub requirement)
└── README.md                    # Monorepo root README
```

### Backend stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Runtime | Node 22 (ESM `"type":"module"`) | CI pins Node 22 |
| Framework | Fastify 5.x | Modular monolith (single `buildApp`) |
| ORM | Prisma 6.7 + PostgreSQL | `postgresql` datasource |
| Auth | `@fastify/jwt` + `argon2` | JWT bearer, Argon2 password hashing |
| Validation | Zod 3 | Inline `z.object(...)` schemas |
| Queue | BullMQ + ioredis (Redis) | 6 queues, retry + per-job timeout |
| API docs | `@fastify/swagger` + swagger-ui | Live OpenAPI at `/docs` |
| Observability | Prometheus text at `/metrics` + `/health` + `/ready` | No PII/secrets/tenant ids |
| Secrets | AES-256-GCM (credential), HMAC-SHA256 (webhook), SHA-256+pepper (API keys) | `crypto.ts` |
| AI | `AIModelGateway` + `MockAIProvider` | **Mock only**; no live provider wired |
| Payments/Providers | `MockProvider`, `MockPaymentGateway`, `DigiflazzAdapter` (fail-closed) | No live integrations |
| Tests | Vitest + k6 load scripts | **Not executed** (no Node runtime here) |

### Key architectural facts for the frontend

- **Money is integer minor units** (IDR by default), stored as `*Minor` ints
  (`totalMinor`, `unitPriceMinor`, `costMinor`, `amountMinor`). The frontend MUST
  render by dividing by 100 and formatting — never floating-point math.
- **Tenant isolation is server-derived** — `tenant(request)` reads
  `request.user.tenantId` from the verified JWT, never from body/query.
- **CORS is `origin: false`** (same-origin only). The SPA is expected to be
  served from the same origin as the API (via Caddy), or a backend CORS change
  will be required for split-origin hosting.
- **Global rate limit: 100 req/min/IP** — dashboards must batch/coalesce.
- **Request body limit: 1 MB.**
- All list endpoints are **unpaginated** (return full collections).
- Outbound webhooks are HMAC-SHA256 signed; there is **no inbound** payment/
  webhook gateway callback route yet.

---

## 2. Backend endpoint map

Guard legend: **PUBLIC** = no auth; **JWT** = valid JWT via global `preHandler`;
**JWT+ROLE** = explicit in-handler role check; **API_KEY** = scoped `sk_…` key.

### Health / ops (public)

| Method | Path | Guard |
| --- | --- | --- |
| GET | `/health` | PUBLIC |
| GET | `/ready` | PUBLIC |
| GET | `/metrics` | PUBLIC |
| GET | `/docs` (Swagger UI) | PUBLIC |

### Auth

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/auth/register` | PUBLIC | Creates User(OWNER)+Tenant+Store; returns `accessToken` |
| POST | `/api/v1/auth/login` | PUBLIC | Returns `accessToken` only (no profile object) |

### Public storefront

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/storefront/:slug` | PUBLIC | Store meta by slug |
| GET | `/api/v1/storefront/:slug/products` | PUBLIC | All active products (no pagination/filter) |
| GET | `/api/v1/public/store/:slug/branding` | PUBLIC | Sanitized white-label branding |

### Orders

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/orders` | JWT | Requires `Idempotency-Key` header; creates order + outbox |
| POST | `/api/v1/orders/:id/mock-payment` | JWT | Mock-only payment completion |

### Seller (dashboard)

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/seller/products` | JWT | |
| POST | `/api/v1/seller/products` | JWT | Upsert by `masterProductId` |
| GET | `/api/v1/seller/orders` | JWT | |
| POST | `/api/v1/seller/api-keys` | JWT | Returns raw key **once** (`sk_…`) |
| DELETE | `/api/v1/seller/api-keys/:id` | JWT | |
| GET | `/api/v1/seller/providers` | JWT | |
| POST | `/api/v1/seller/providers` | JWT | |
| POST | `/api/v1/seller/providers/:id/test` | JWT | |
| POST | `/api/v1/seller/providers/:id/sync` | JWT | Enqueues BullMQ job |
| POST | `/api/v1/seller/providers/routing` | JWT | |
| POST | `/api/v1/seller/whatsapp` | JWT | Upsert integration |
| GET | `/api/v1/seller/whatsapp` | JWT | |
| GET | `/api/v1/seller/webhook-deliveries` | JWT | |
| POST | `/api/v1/seller/webhook-deliveries/:id/replay` | JWT | |
| GET | `/api/v1/seller/resellers` | JWT+ROLE (OWNER/STAFF) | |
| POST | `/api/v1/seller/resellers` | JWT+ROLE (OWNER/STAFF) | |
| GET | `/api/v1/seller/resellers/:id` | JWT | |
| PATCH | `/api/v1/seller/resellers/:id` | JWT | Cycle/depth validated |
| POST | `/api/v1/seller/resellers/:id/suspend` | JWT | |
| GET | `/api/v1/seller/resellers/:id/orders` | JWT | |
| GET | `/api/v1/seller/resellers/:id/commissions` | JWT | |
| GET | `/api/v1/seller/resellers/:id/analytics` | JWT | |
| GET | `/api/v1/seller/pricing/rules` | JWT | |
| POST | `/api/v1/seller/pricing/rules` | JWT | |
| POST | `/api/v1/seller/pricing/preview` | JWT | Deterministic pricing engine |
| POST | `/api/v1/seller/domains` | JWT+ROLE (OWNER/STAFF) | Validates domain |
| GET | `/api/v1/seller/domains` | JWT | |
| POST | `/api/v1/seller/domains/:id/verify` | JWT | Sets state `VERIFYING` only |
| DELETE | `/api/v1/seller/domains/:id` | JWT | Suspends |
| GET | `/api/v1/seller/branding` | JWT | |
| PATCH | `/api/v1/seller/branding` | JWT | Sanitized, upsert |
| GET | `/api/v1/seller/routing` | JWT | |
| PATCH | `/api/v1/seller/routing` | JWT | |
| GET | `/api/v1/seller/routing/health` | JWT | |
| GET | `/api/v1/seller/analytics/advanced` | JWT+ROLE (OWNER/STAFF) | |
| GET | `/api/v1/seller/analytics/products` | JWT | |
| GET | `/api/v1/seller/analytics/providers` | JWT | |
| GET | `/api/v1/seller/analytics/resellers` | JWT | |

### AI

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| POST | `/api/v1/ai/chat` | JWT | Mock gateway; order-ownership check |
| POST | `/api/v1/seller/ai/analytics` | JWT+ROLE (OWNER/STAFF) | |
| GET | `/api/v1/seller/ai/usage` | JWT | |
| GET | `/api/v1/seller/ai/knowledge` | JWT | |
| POST | `/api/v1/seller/ai/knowledge` | JWT | Prompt-injection guarded |
| DELETE | `/api/v1/seller/ai/knowledge/:id` | JWT | |
| POST | `/api/v1/seller/ai/provider/analyze` | JWT | Creates PENDING_APPROVAL proposal |
| GET | `/api/v1/seller/ai/workflows` | JWT | |
| GET | `/api/v1/seller/ai/workflows/:id` | JWT | |

### External API (server-to-server, `sk_…` keys)

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/external/account` | API_KEY | Returns tenantId + keyId |
| GET | `/api/v1/external/products` | API_KEY (`products:read`) | |
| GET | `/api/v1/external/orders` | API_KEY (`orders:read`) | |
| GET | `/api/v1/external/orders/:id` | API_KEY (`orders:read`) | |
| POST | `/api/v1/external/orders` | API_KEY (`orders:write`) | Idempotent; `success/error/request_id` envelope |
| POST | `/api/v1/external/webhooks` | API_KEY | Returns webhook secret **once** |
| GET | `/api/v1/external/webhooks` | API_KEY | |
| DELETE | `/api/v1/external/webhooks/:id` | API_KEY | Soft-delete |

### Admin (super admin)

| Method | Path | Guard | Notes |
| --- | --- | --- | --- |
| GET | `/api/v1/admin/fraud/events` | JWT+ROLE (SUPER_ADMIN) | |
| POST | `/api/v1/admin/fraud/events/:id/review` | JWT+ROLE (SUPER_ADMIN) | ALLOW/BLOCK |
| GET | `/api/v1/admin/operations/health` | JWT+ROLE (SUPER_ADMIN) | |
| GET | `/api/v1/admin/subscription/plans` | JWT+ROLE (SUPER_ADMIN) | |
| PATCH | `/api/v1/admin/subscription/plans/:id` | JWT+ROLE (SUPER_ADMIN) | |

---

## 3. Authentication & RBAC matrix

### Roles (Prisma `enum Role`)

| Role | Meaning | Notes |
| --- | --- | --- |
| `SUPER_ADMIN` | Platform operator | Only `/api/v1/admin/*` checks this |
| `OWNER` | Tenant owner | Created on register |
| `STAFF` | Tenant staff | No CRUD endpoints exist to create/invite staff |
| `CUSTOMER` | End buyer | No endpoints create customers today |

### How auth works today

1. **Register** creates a `User` (role `OWNER`), a `Tenant`, a `TenantMember`
   (`OWNER`), and a `Store`, then returns a signed JWT `{ id, tenantId, role }`.
2. **Login** verifies credentials and signs a JWT from the **first membership
   only** (`user.memberships[0]`) — multi-tenant users are not yet supported.
3. A **global `preHandler`** enforces JWT on any URL starting with
   `/api/v1/seller` or `/api/v1/orders`. It checks **validity only, not role**.
4. Role checks are **scattered and inconsistent**:
   - `/api/v1/admin/*` → `SUPER_ADMIN` (enforced).
   - Resellers, domains (POST), `analytics/advanced`, `ai/analytics` →
     `OWNER`/`STAFF` (enforced).
   - **Products, orders, providers, API keys, WhatsApp, webhook-deliveries,
     branding, routing, pricing → no role check** (any valid JWT passes).

### JWT facts

- Signed via `app.jwt.sign(...)` with **no `expiresIn`** → tokens do **not
  expire**. No refresh-token flow. No logout endpoint (client-side discard only).
- Payload: `{ id, tenantId, role }`. The frontend may decode (not trust) it for
  UI hints; authorization must always come from server responses.

### External API keys

- Format `sk_<base64url>`, stored hashed (SHA-256 + `API_KEY_PEPPER`).
- Scopes: `orders:read`, `orders:write`, `products:read`, `*`.
- `externalKey()` validates presence, revocation, expiry, and scope.
- Key returned in plaintext **only once** at creation.

### RBAC matrix (endpoint → minimum required)

| Surface | Auth required | Role gate |
| --- | --- | --- |
| Health/metrics/docs | none | — |
| Auth register/login | none | — |
| Public storefront / branding | none | — |
| Orders (create, mock-pay) | JWT | none (any role) |
| Seller catalog/orders/providers/keys/whatsapp/webhooks/branding/routing/pricing | JWT | **none today** ⚠️ |
| Seller resellers/domains/advanced-analytics/ai-analytics | JWT | OWNER / STAFF |
| AI chat | JWT | none (customer-owned order check when `orderId` supplied) |
| Admin fraud/health/plans | JWT | SUPER_ADMIN |
| External API | `sk_…` key | scope-based |

---

## 4. Tenant & domain resolution flow

### Tenant resolution (authenticated)

1. JWT verified by the global `preHandler`.
2. `tenant(request)` returns `request.user.tenantId` (from the JWT).
3. Every tenant-scoped query filters by that `tenantId`. Browser-supplied tenant
   id is **never** trusted.

### Public storefront resolution (unauthenticated)

- Resolution is by **slug path param** (`/api/v1/storefront/:slug`), not host.
  `slug` is globally unique.
- `Store` → `tenantId` → `SellerProduct[]` (active) joined to `MasterProduct`.

### Custom domain resolution (white-label) — **NOT YET WIRED**

- `StoreDomain` model + `assertTrustedHost()` exist in
  `src/business/domain.ts`, and `Caddyfile` has a `{$SELLER_DOMAINS}` block for
  verified domains.
- **However, `assertTrustedHost` is not called by any request handler.** There is
  no host-header → tenant resolution in the API today. Custom-domain storefront
  resolution is defined at the proxy level (Caddy allowlist) but **not
  implemented end-to-end**. This must be confirmed/implemented before custom
  domains can serve a storefront from the frontend.
- Domain verification (`POST /seller/domains/:id/verify`) only flips state to
  `VERIFYING`; the actual DNS check and SSL issuance are operator-controlled.

---

## 5. Frontend route map (proposed)

Derived from backend capability, not yet implemented. Grouped by application.

### Seller dashboard (`/dash/...`, OWNER/STAFF)

| Route | Backing endpoints |
| --- | --- |
| `/dash` | `GET /seller/analytics/advanced` |
| `/dash/orders` | `GET /seller/orders`, `GET /seller/analytics/products` |
| `/dash/orders/:id` | `GET /seller/orders` (client filter) |
| `/dash/catalog` | `GET/POST /seller/products` |
| `/dash/pricing` | `GET/POST /seller/pricing/rules`, `POST /seller/pricing/preview` |
| `/dash/resellers` | reseller CRUD + orders/commissions/analytics |
| `/dash/providers` | provider CRUD/test/sync/routing, `/seller/routing/health` |
| `/dash/api-keys` | API key create/delete |
| `/dash/webhooks` | webhook-deliveries list/replay |
| `/dash/whatsapp` | `GET/POST /seller/whatsapp` |
| `/dash/domains` | domain CRUD/verify |
| `/dash/branding` | `GET/PATCH /seller/branding` |
| `/dash/analytics` | advanced/products/providers/resellers analytics |
| `/dash/ai` | `GET /seller/ai/usage`, knowledge CRUD, workflows |

### Customer storefront (`/:slug` public + auth for checkout)

| Route | Backing endpoints |
| --- | --- |
| `/{slug}` | `GET /storefront/:slug`, `GET /public/store/:slug/branding` |
| `/{slug}/product/:id` | `GET /storefront/:slug/products` (client filter) |
| `/{slug}/checkout` | `POST /orders` (requires JWT) |

### Admin console (`/admin/...`, SUPER_ADMIN)

| Route | Backing endpoints |
| --- | --- |
| `/admin/fraud` | `GET /admin/fraud/events`, `POST /admin/fraud/events/:id/review` |
| `/admin/operations` | `GET /admin/operations/health` |
| `/admin/plans` | `GET/PATCH /admin/subscription/plans` |

### Auth

| Route | Backing endpoints |
| --- | --- |
| `/register` | `POST /auth/register` |
| `/login` | `POST /auth/login` |

---

## 6. API integration plan

1. **Transport**: Same-origin fetch against `/api/v1` (Caddy serves SPA + API on
   one origin). Use a small typed client, not ad-hoc `fetch` everywhere.
2. **Auth token storage**: `accessToken` in memory + (for persistence)
   `localStorage` with documented XSS trade-offs; persist `{ role, tenantId }`
   at login. Recommend requesting a backend `GET /api/v1/auth/me` (see §8).
3. **Error envelope inconsistency** — normalize in the client:
   - Most REST routes: `{ error: string }` with HTTP status.
   - External API routes: `{ success, data|error: { code, message }, request_id }`.
4. **Money**: parse `*Minor` ints → format `IDR` (÷100). Shared `formatMinor()`;
   no floating-point display math.
5. **Idempotency**: checkout MUST send `Idempotency-Key` (UUID) and reuse it on
   retry.
6. **Rate limiting (100/min/IP)**: batch analytics fetches, avoid N+1 polling;
   use react-query/SWR dedupe + shared cache.
7. **States**: implement loading, empty, error, success, and permission-denied
   for every data view.
8. **OpenAPI**: generate typed request/response types from `/docs` OpenAPI JSON
   (e.g. `openapi-typescript`), but treat runtime behavior as contract of record —
   several responses are inline Prisma `select`s without declared schemas.
9. **Webhooks**: outbound only; frontend displays delivery status and replay.
10. **No mock data** in production flows; demo fixtures isolated behind a clearly
    labeled dev-only flag.

---

## 7. Design system plan

Locked direction: **Premium Purple Gaming Commerce** (Takapedia / Midasbuy /
UniPin *inspired*, no copying). Dark + light, purple accent, mobile-first,
WCAG-accessible, tenant-isolated branding.

### Semantic tokens (initial)

| Token | Dark | Light |
| --- | --- | --- |
| `bg` | `#0B0D17` | `#F6F7FC` |
| `surface` | `#171B2C` | `#FFFFFF` |
| `surface-elevated` | `#22283C` | `#FFFFFF` (shadow) |
| `primary` | `#8057F5` | `#8057F5` |
| `primary-hover` | `#9877FF` | `#9877FF` |

Token strategy:
- Semantic tokens (`bg`, `surface`, `primary`, `text`, `success`, `warning`,
  `danger`, `info`, `muted`, `border`) mapped to dark/light palettes via CSS
  custom properties.
- Tenant branding (`primaryColor`, `secondaryColor`, `theme`) from
  `GET /public/store/:slug/branding` overrides **only** accent tokens in the
  storefront app, never dashboard/admin.
- Brand colors are sanitized server-side (`#RRGGBB` only).

### Proposed foundation

- **Framework**: React 18 + TypeScript + Vite (SPA) OR Next.js — **deferred**.
- **Styling**: CSS Modules or Tailwind with token integration; tokens centralized;
  no hardcoded hex in components.
- **State/data**: react-query (or SWR) + a small auth store.
- **Routing**: react-router (SPA) or Next.js file routing.
- **Accessibility**: semantic HTML, full keyboard nav, focus management,
  `prefers-reduced-motion`, ARIA for transactional states, contrast ≥ WCAG AA in
  both themes.
- **Form/validation**: Zod (parity with backend) or schema-driven form lib.

---

## 8. Missing backend contracts (confirmed gaps)

The frontend cannot assume any of these until the backend adds/confirms them.

1. **No `GET /api/v1/auth/me`** (session introspection). Login returns only
   `accessToken`; role/tenant are only inside the JWT.
2. **No refresh token / token expiry.** JWTs have no `expiresIn`. Token rotation
   has no contract.
3. **No logout endpoint.** Client-side discard only is acceptable, but confirm.
4. **No public guest checkout.** `POST /orders` requires a JWT, but the storefront
   is public. No guest/payment-intent order path exists; a customer must have an
   account to purchase. Confirm whether guest checkout is in scope.
5. **No master-catalog listing endpoint.** Sellers can only add products by a
   known `masterProductId`; there is no `GET /master-products` to populate the
   "add product" picker.
6. **No staff/customer member management.** `TenantMember` exists, but no
   endpoints to invite STAFF or create CUSTOMER users. RBAC roles beyond OWNER
   cannot yet be exercised end-to-end.
7. **No seller-facing subscription/usage view.** `SubscriptionUsage`/
   `SubscriptionInvoice` exist but no route exposes them to a seller.
8. **No inbound payment/webhook gateway callback route.** `PaymentGatewayEvent`
   exists, but there is no public inbound handler; checkout → paid → fulfilled
   cannot be driven from the frontend (only `mock-payment`).
9. **No pagination/search/filter** on list endpoints (products, orders,
   resellers, deliveries, fraud events).
10. **No upload endpoint** for logos/favicons (branding accepts URLs only).
11. **No order-status push** (no SSE/WebSocket); UI must poll.
12. **RBAC gap**: seller routes without role checks are reachable by any valid
    JWT (including a future CUSTOMER). Backend should enforce role; frontend
    should still gate by `role` defensively and render 403 states.
13. **Custom-domain host resolution not wired** in the API (see §4).
14. **AI is mock-only**; any AI surface must be labeled as such and not claim
    production behavior.
15. **External API key vs JWT both use `Authorization: Bearer`** on different
    route groups — the client must not confuse the two token kinds.

---

## 9. Implementation risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| RBAC not enforced on many seller routes | High | Treat UI role-gating as non-authoritative; flag to backend; never rely on client for security |
| No guest checkout / no payment webhook | High | Clarify scope; otherwise checkout is demo-only (`mock-payment`) |
| Unpaginated lists + 100/min rate limit | Medium | Client caching/dedupe; request backend pagination |
| Envelope inconsistency (`{error}` vs `{success,error:{code}}`) | Medium | Normalize in a single API client layer |
| JWT never expires; no refresh | Medium | Session policy needs a backend contract first |
| Money as minor units | Medium | Central `formatMinor`; unit tests for rounding |
| OpenAPI types may drift from inline `select`s | Medium | Generate types but verify against handlers |
| CORS `origin:false` | Medium | Serve same-origin via Caddy; otherwise needs backend change |
| Custom domains + white-label branding not fully wired | Medium | Build storefront against slug first; defer custom domains |
| No Node runtime in this env (tests/build not run) | Medium | Re-run `npm test`/`tsc` in CI once Node available; do not claim green |
| AI/payment/provider all mock | Medium | Label clearly; do not claim integrations work |

---

## 10. Recommended frontend directory structure

```
frontend/
├── package.json
├── tsconfig.json
├── vite.config.ts            (or next.config.* if Next.js chosen)
├── index.html
├── src/
│   ├── main.tsx              # entry
│   ├── app/                  # router + providers (theme, auth, query)
│   ├── api/                  # typed API client + generated types
│   │   ├── client.ts         # fetch wrapper, error normalization, idempotency
│   │   ├── auth.ts
│   │   ├── seller.ts
│   │   ├── storefront.ts
│   │   ├── admin.ts
│   │   └── types/            # openapi-generated (committed or gitignored)
│   ├── auth/                 # login, register, token store, guards
│   ├── components/           # shared UI (design-system primitives)
│   │   ├── ui/               # Button, Input, Card, Table, Modal, Badge, etc.
│   │   └── feedback/         # Loading, Empty, Error, PermissionDenied, Success
│   ├── features/
│   │   ├── seller/           # dashboard feature modules
│   │   ├── storefront/       # customer storefront modules
│   │   └── admin/            # admin console modules
│   ├── lib/                  # formatMinor, zod schemas, utils, constants
│   ├── styles/               # tokens.css (CSS custom props), global.css, themes
│   └── hooks/
├── public/                   # static assets, favicon
└── tests/
```

### Stack decision (deferred, per instructions)

Recommended decision point: **React + TypeScript + Vite (SPA)** vs **Next.js**.

- Vite SPA: strong fit for three app surfaces behind one API; simplest build/
  deploy; single Caddy-served origin.
- Next.js: SSR/ISR for storefront SEO + API-route proxying, at the cost of server
  runtime and split-origin complexity.
- Either way: shared design-system module, shared typed API client, shared Zod
  schemas.

---

## 11. Scope boundaries (what was NOT done)

- No frontend code, pages, or tooling implemented (scaffold only).
- No backend changes made.
- No `package-lock.json` generated (no Node runtime in this environment).
- No live integrations claimed; provider/payment/AI are mock or fail-closed.

**This report is the Phase F0 deliverable. Request approval before proceeding to
any implementation phase (stack selection, design-system scaffolding, or pages).**