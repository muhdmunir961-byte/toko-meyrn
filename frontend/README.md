# Topup SaaS — Frontend

React + Vite + TypeScript SPA built on the Premium Purple Gaming Commerce
design system. Phase F1: shared foundation (tokens, UI kit, layouts, API
client, auth/session, guards, tenant theme boundary). Phase F2: the marketing
landing page (`HomePage`). Phase F3: authentication & seller onboarding.
Phase F4: the public tenant storefront. Phase F5: the seller operations
dashboard. Phase F6: storefront customization. Phase F8: automation &
intelligence. Phase F9: the super admin console.

## Stack

- **Vite 5 + React 18 + TypeScript** (SPA — see `AUDIT.md` for the decision)
- **react-router-dom 6** for routing
- **Zero UI libraries** — the design system is hand-built with CSS custom
  properties (`src/styles/tokens.css`) so tenant theming can override a narrow
  accent surface without leaking globally
- **Playwright** (dev-only) for screenshot capture

## Commands

```bash
npm install        # install dependencies
npm run dev        # dev server on :5173 (proxies /api -> :3000)
npm run typecheck  # tsc --noEmit
npm run lint       # eslint, zero warnings allowed
npm run build      # typecheck + production build to dist/
npm run preview    # serve dist/ on :4173
```

## Structure

```
src/
  styles/          tokens.css (design tokens), global.css, components.css,
                   layout.css, home.css (landing page)
  lib/             theme.tsx, tenantTheme.tsx, money.ts (formatIDR),
                   plans.ts (seed-mirrored subscription plans),
                   validation.ts (client-side form validation)
  onboarding/      OnboardingContext.tsx (client-side progress tracker)
  storefront/      StorefrontContext.tsx, CheckoutContext.tsx, StorefrontLayout,
                   HomePage, ProductPage, CheckoutPage, OrderPage, LookupPage
  features/home/   landing-page content model (nav anchors, game covers)
  api/             client.ts (fetch wrapper), errors.ts (normalized ApiError),
                   auth.ts, seller.ts, storefront.ts
  auth/            session.ts, AuthContext.tsx, guards.tsx, permissions.ts
  components/
    ui/            Button, Input, Select, Card, Dialog, Tabs, Table, Badge,
                   Toast, Skeleton, EmptyState, Icon (35 inline glyphs)
    layout/        Navbar (marketing), Sidebar + DashboardShell (dashboard)
  pages/           Home, Login, Register, Dashboard, Showcase, Placeholder
  app/App.tsx      routes + guards (Navbar receives landing anchor links)
```

## Landing page (Phase F2)

`src/pages/HomePage.tsx` + `src/styles/home.css` implement the marketing
surface: sticky navbar with anchor navigation, cinematic hero, featured
storefront cover cards, interactive tenant-theming preview (accent swatches),
seller dashboard preview, feature grid (orders / providers / payments /
resellers / AI / analytics), 3-step onboarding, subscription pricing, FAQ
accordion, final CTA, and footer.

Data fidelity:

- **Pricing** mirrors the backend seed (`backend/prisma/seed.ts`): Free 0 /
  Starter 1,000,000 / Pro 2,500,000 / Business 5,000,000 IDR minor units
  (`src/lib/plans.ts`). The only plans endpoint (`GET /admin/subscription/plans`)
  is SUPER_ADMIN-only, so values are mirrored client-side and the per-plan
  feature lists are explicitly labeled *illustrative*.
- **Money** renders through `formatIDR()` (integer minor units ÷ 100).
- **Preview-only content** (game covers, dashboard mockup, plan features) is
  marked as such in the UI copy.

## Authentication & onboarding (Phase F3)

- **Register** (`/register`) — three-step wizard (account → store/slug → plan)
  that mirrors the backend `/auth/register` contract exactly:
  `{ email, password (min 12), tenantName, storeName, slug }`. Duplicate email
  (409) and validation errors are surfaced inline.
- **Login** (`/login`) — `/auth/login` → `{ accessToken }`; 401 shows a friendly
  message. Redirects back to the requested route (`state.from`) after sign-in.
- **Onboarding** (`/onboarding`, guarded) — branding (colors/support email/logo
  via `/seller/branding`), plan selection (preview-only), provider/WhatsApp
  config (`/seller/providers`, `/seller/whatsapp`), and a completion dashboard.
- **Password recovery** — not offered: the backend has no reset contract.

### Contract fidelity & known gaps

- Wired: `POST /auth/register`, `POST /auth/login`, `GET/PATCH /seller/branding`,
  `GET/POST /seller/providers`, `POST /seller/providers/:id/test`,
  `GET/POST /seller/whatsapp`.
- **Not invented**: no `/auth/me`, no refresh/logout/password-reset, no
  seller-facing subscription endpoint (plans are SUPER_ADMIN-only), no
  payment-gateway config endpoint, no slug-availability lookup. These are
  preview-only or clearly labeled "pending backend support" in the UI.
- **Session security**: the JWT is held in memory + `sessionStorage` (NOT
  `localStorage`), so it never persists across browser sessions. See
  `src/auth/session.ts` for the full trade-off rationale (tokens don't expire
  and there's no refresh/rotation contract — flagged as a backend follow-up).

### Auth tests

`scripts/auth-test.mjs` (Playwright, API-route-intercepted, no live backend)
covers: invalid input, successful registration → onboarding, duplicate
registration (409), invalid login (401), forbidden role (CUSTOMER), absent
session redirect, and incomplete-onboarding state.

```bash
npm run build && npm run preview &
node scripts/auth-test.mjs
```

Results in `screenshots/auth-report.json` + `screenshots/auth--*.png`.

## Public storefront (Phase F4)

Slug-scoped storefront (`/:slug`) with pages: homepage (categories/search),
product detail (denomination + player info), checkout (confirmation + payment
method), order status (payment vs fulfillment), transaction lookup, and order
results.

Key decisions (verified against the backend):

- **Tenant resolution is by SLUG** (`/storefront/:slug`) — the backend's
  host/domain resolution (`domain.ts`) is **not wired** to any handler, so
  host-based white-labeling is a documented gap, not emulated here.
- **Seller branding** is applied via `TenantTheme` (scoped `--color-*`
  overrides) from `GET /public/store/:slug/branding`, never globally.
- **Authoritative pricing** comes from `POST /orders` — the storefront sends
  only `{productId, quantity}` and renders the server-returned `totalMinor`
  and `unitPriceMinor`. Client prices are display-only estimates.
- **Idempotency**: `POST /orders` requires an `Idempotency-Key` header; the
  checkout context generates one stable key per attempt and reuses it on retry,
  preventing duplicate orders.
- **Payment vs fulfillment** are rendered as distinct rows: `order.payment.status`
  (PENDING/CONFIRMED/FAILED/EXPIRED) vs `order.status`
  (AWAITING_PAYMENT/…/SUCCESS/FAILED/…). Only states the backend actually emits
  are handled — **no invented `REFUNDED`** (0 references in the backend).

Hard gaps (clearly labeled in the UI, not faked): no player-id/target field in
the order contract; no denomination/stock/payment-method endpoints (MOCK
gateway only); no customer-facing order-lookup endpoint.

### Storefront tests

`scripts/storefront-test.mjs` (Playwright, API-route-intercepted sandbox)
covers: homepage + branding, search, invalid player ID, the full
browse→checkout→confirm→pay→fulfilled journey (asserting distinct payment vs
fulfillment states), duplicate-submission protection, unavailable product, and
payment failure.

```bash
npm run build && npm run preview &
node scripts/storefront-test.mjs
```

Results in `screenshots/storefront-report.json` + `screenshots/sf--*.png`.

## Seller operations dashboard (Phase F5)

Routes under `/dash/*` (authenticated, OWNER/STAFF):

| Route | Module | Backing endpoints |
| --- | --- | --- |
| `/dash` | Overview + KPI cards | `GET /seller/analytics/advanced`, `/seller/analytics/products`, `/seller/orders` |
| `/dash/orders` | Orders table (filters/search/detail drawer/pagination) | `GET /seller/orders` |
| `/dash/catalog` | Product catalog management | `GET/POST /seller/products` |
| `/dash/pricing` | Pricing & margin management (confirm-gated) | `GET/POST /seller/pricing/rules` |
| `/dash/providers` | Provider availability & routing visibility | `GET /seller/providers`, `POST /seller/providers/:id/test` |
| `/dash/resellers` | Reseller hierarchy management (OWNER/STAFF) | `GET/POST /seller/resellers`, `PATCH /seller/resellers/:id`, `POST /seller/resellers/:id/suspend` |
| `/dash/analytics` | Revenue & order analytics | `/seller/analytics/advanced|products|resellers` |
| `/dash/settings` | Store settings (branding) | `GET/PATCH /seller/branding` |
| `/dash/alerts` | Notifications & operational alerts | `GET /seller/webhook-deliveries`, `POST .../replay` |

Key decisions (verified against the backend):

- **No server-side pagination/filtering** on any list endpoint — pagination,
  filter, and search are performed CLIENT-SIDE and documented as such.
- **Financial operations require confirmation** — creating a pricing rule uses
  a confirm dialog before the `POST`.
- **Payment integration is a gap** — the `PaymentGatewayConfiguration` model
  exists but has no endpoint, so Settings shows it as "not available" rather
  than a fake form.
- **Notifications are a gap** — no seller-facing incidents endpoint exists; the
  Alerts page surfaces webhook-delivery status (the closest real feed) and
  labels the gap.
- **No master-catalog listing** — add-product requires a known
  `masterProductId` (documented).
- All monetary figures come from server responses (`*Minor` ÷ 100); statuses
  are mapped to badges via `lib/status.ts` (unknown states → neutral).

### Dashboard tests

`scripts/dashboard-test.mjs` (Playwright, API-route-intercepted) covers:
overview KPIs, orders (table/pagination/detail drawer/empty state), catalog CRUD
(success + API error), pricing financial confirmation, provider test, settings
save, permission failure (CUSTOMER), and analytics API error.

```bash
npm run build && npm run preview &
node scripts/dashboard-test.mjs
```

Results in `screenshots/dashboard-report.json` + `screenshots/dash--*.png`.

## Storefront customization (Phase F6)

`/dash/customization` — a two-column editor (form + live responsive preview).

**Persisted via verified endpoints:**
- Branding (`logoUrl`, `faviconUrl`, `primaryColor`, `secondaryColor`,
  `supportEmail`, `supportPhone`, `theme.darkMode`) → `PATCH /seller/branding`.
  Content is sanitized server-side (`sanitizeBranding`).
- Custom domains → `GET/POST /seller/domains`, `POST .../verify` (→VERIFYING),
  `DELETE .../:id` (→SUSPENDED). Domain state + SSL badge (`sslCertificateIssued`)
  come from the real `StoreDomain` model.

**Preview-only (no backend contract, clearly labeled, never persisted):**
banner/promotions, homepage section visibility/ordering, featured products,
navigation/footer config, SEO title/description/social preview. These are held
in local state to demonstrate the UX, but the backend has no fields/endpoints
for them — persistence is **not** fabricated.

**Explicit limitations (not faked):**
- Brand name rename — no endpoint (name set at registration).
- Image uploads — no upload endpoint; logo/favicon are http(s) URLs only
  (validated client-side, sanitized server-side).
- Draft/publish — the backend has a single persisted row, no draft state.

**Safety:** unsaved-change warnings (`beforeunload` + dirty banner), URL/color/
email/phone validation, destructive domain removal requires confirmation,
tenant-scoped via JWT, and the live preview is display-only (does not affect
checkout accessibility).

### Customization tests

`scripts/customization-test.mjs` covers preview consistency, saving (dirty
clears), unsaved-change warning, domain list/add/verify, tenant separation, and
mobile (375px) layout.

```bash
npm run build && npm run preview &
node scripts/customization-test.mjs
```

Results in `screenshots/customization-report.json` + `screenshots/custom--*.png`.

## Automation & intelligence (Phase F8)

| Route | Module | Backing endpoints |
| --- | --- | --- |
| `/dash/ai` | AI assistant chat | `POST /ai/chat`, `GET /seller/ai/usage` |
| `/dash/ai-analytics` | AI business insights | `POST /seller/ai/analytics` |
| `/dash/automation` | WhatsApp, webhooks, API keys, routing, workflows | `/seller/whatsapp`, `/seller/webhook-deliveries`, `/seller/api-keys`, `/seller/routing/health`, `/seller/ai/workflows` |

Safety & labeling (verified against backend):

- **AI is mock-only** (`MockAIProvider`) — every AI surface is labeled
  "AI-generated · non-authoritative".
- **Secrets never leak**: API keys are shown once at creation, then masked
  (`maskApiKey`); chat answers that look like secrets are redacted in the UI.
  The backend already rejects prompt injection and never echoes credentials.
- **Connection status is truthful**: WhatsApp `MOCK` is functional, `OFFICIAL`
  is fail-closed until verified credentials exist.
- **Retry/failure info**: webhook delivery logs show `attemptCount` + `lastError`
  and offer replay (`POST .../replay`); routing health shows `failureCount`.
- **Confirmation before destructive actions**: API-key revoke uses a confirm
  dialog.
- **Accessible charts**: AI analytics renders a bar chart with a fallback
  `<table>` for screen readers.

### Automation tests

`scripts/f8-test.mjs` covers AI chat (label + answer, secret redaction,
integration error), AI analytics, WhatsApp toggle + webhook replay + API key
masking, and unauthorized (CUSTOMER) access.

```bash
npm run build && npm run preview &
node scripts/f8-test.mjs
```

Results in `screenshots/f8-report.json` + `screenshots/f8--*.png`.

## Super admin console (Phase F9)

Routes under `/admin/*` (SUPER_ADMIN only, server-enforced):

| Route | Module | Backing endpoints |
| --- | --- | --- |
| `/admin` | Overview (health + plans) | `GET /admin/operations/health`, `GET /admin/subscription/plans` |
| `/admin/fraud` | Fraud review | `GET /admin/fraud/events`, `POST /admin/fraud/events/:id/review` |
| `/admin/operations` | Infrastructure health | `GET /admin/operations/health` |
| `/admin/plans` | Subscription & billing | `GET/PATCH /admin/subscription/plans` |

Key decisions (verified against backend):

- **Only 4 admin endpoints exist** (all `SUPER_ADMIN`-gated) — the console wires
  exactly these. Modules with no backend contract (tenant management, seller
  accounts, billing oversight, platform order monitoring, provider health,
  payment alerts, audit log, backup status, feature flags) are **explicitly
  listed as "not available"** rather than fabricated.
- **Strict authorization** — `RequireAuth` + `RequireRole([SUPER_ADMIN])` on
  every `/admin` route; non-admin roles (OWNER/CUSTOMER) are bounced.
- **Privileged actions require confirmation** — fraud review (Allow/Block) and
  plan edits both use confirm dialogs.
- **Search/filter/pagination** are client-side (the admin endpoints accept no
  query params and return latest 200).
- **Accurate health + timestamps** — operations health shows DB status with a
  "last checked" timestamp.

### Admin tests

`scripts/f9-test.mjs` covers admin overview, fraud review (list + confirm),
plan edit + confirm, operations health/timestamp, and non-admin OWNER/CUSTOMER
access denial.

```bash
npm run build && npm run preview &
node scripts/f9-test.mjs
```

Results in `screenshots/f9-report.json` + `screenshots/f9--*.png`.

## Component showcase

Instead of Storybook, `/showcase` renders every primitive in both themes and
is responsive. Run `npm run preview` and open
[http://localhost:4173/showcase](http://localhost:4173/showcase).

## Screenshots & landing-page test

`scripts/home-test.mjs` (Playwright) captures the landing page at 375 / 768 /
1024 / 1440 px (dark) plus 1440 & 375 light, checks horizontal overflow and
console errors, and exercises the FAQ + accent-swatch interactions:

```bash
npm run build && npm run preview &
node scripts/home-test.mjs
# In this container the headless browser needs extracted libs/fonts:
# PATH=/config/node22/bin:$PATH \
# LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu \
# FONTCONFIG_PATH=/tmp/chromelibs/etc/fonts \
# node scripts/home-test.mjs
```

Results land in `screenshots/` with a machine-readable
`screenshots/home-report.json` (screenshots + any issues found).

## Backend contract notes

- All API calls use **relative same-origin URLs** (`/api/v1/...`) because the
  backend sets `origin: false` CORS. In dev, Vite proxies `/api`.
- **Authenticated requests attach the session bearer token automatically.** The
  fetch wrapper (`src/api/client.ts`) pulls the current token via
  `getAccessToken()` unless a caller passes an explicit `token`. Without this
  every `/seller/*` call is rejected with `401 authentication required` (the
  Playwright suites missed it because they intercept routes).
- Only endpoints verified in the F0 audit are wired (`/auth/login`,
  `/auth/register`). No `/auth/me`, refresh, or logout contract exists yet.
- The JWT is decoded (not verified) client-side for UI hints only; the server
  remains the source of truth for authorization.
- Money is integer minor units (IDR); the display layer divides by 100.