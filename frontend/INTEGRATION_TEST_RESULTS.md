# Integration Test Results (Phase F11)

**Date:** 2026-10-12 · **Method:** Playwright (Chromium) against `vite preview`,
with `page.route('**/api/v1/**')` interception using **real backend contract
shapes** (request/response fields copied from `backend/src/app.ts` handlers).
No mock *APIs* were introduced as production code; interception is test-only.

## 1. End-to-end suites

| Suite | Scope | Result |
|---|---|---|
| `auth-test.mjs` | register/login/duplicate/401/CUSTOMER-bounce/absent-session/incomplete-onboarding | **7/7 passed** |
| `storefront-test.mjs` | catalog → product → checkout → confirm → mock-pay → fulfilled; idempotency (1 key); unavailable product; payment failure | **8/8 passed** |
| `dashboard-test.mjs` | overview KPIs, orders (table/pagination/drawer/empty), catalog CRUD, pricing confirm, providers, settings, permission, API error | **10/10 passed** |
| `customization-test.mjs` | preview consistency, save (dirty clears), domain list/add, tenant separation, mobile 375px | **6/6 passed** |
| `f8-test.mjs` | AI chat (label/secret-redaction/error), AI analytics, WhatsApp/replay/api-key-masking, CUSTOMER denied | **6/6 passed** |
| `f9-test.mjs` | admin overview, fraud (list+confirm), plans (edit+confirm), operations health, OWNER/CUSTOMER denied | **6/6 passed** |
| `home-test.mjs` | responsive 375/768/1024/1440 + light, overflow, console errors, FAQ/swatch interactions | **issues: none** |

**Total:** 7 suites, **49 passing assertions**, 0 failures.

## 2. Runtime-error smoke (all routes)

`f11-smoke.mjs` visits **22 routes** (public + owner + admin) capturing
`pageerror` and `console.error`:

```
Visited 22 routes.
Routes with pageerror: 0
Routes with console errors: 0
```

## 3. Unit tests

`npm test` (Vitest): **14 passed (14)** — money, security (API-key masking +
secret detection), validation (slug/color/url/email/phone), status mapping, and
plan-price parity with the backend seed.

## 4. Tenant isolation & role permissions (test evidence)

| Scenario | Suite | Result |
|---|---|---|
| CUSTOMER → `/onboarding` | auth | bounced (→`/dash`/`/login`) |
| CUSTOMER → `/dash` | auth/dashboard | bounced |
| CUSTOMER → `/dash/ai-analytics` | f8 | bounced |
| OWNER → `/admin` | f9 | bounced |
| CUSTOMER → `/admin/fraud` | f9 | bounced |
| Tenant A vs tenant B (empty domains) | customization | separation verified |

Server-side authorization is enforced by `RequireAuth` + `RequireRole` in the
SPA **and** by the backend's `SUPER_ADMIN`/`OWNER`/`STAFF` checks; the SPA guards
are non-authoritative UI shaping (documented).

## 5. Checkout (sandbox transaction)

`storefront-test.mjs` exercises the full purchase journey against the
intercepted `/orders` and `/orders/:id/mock-payment` contracts: product →
player-info → checkout → confirm (authoritative server total) → mock-pay →
`SUCCESS`/`CONFIRMED` → fulfilled. Idempotency verified (single `Idempotency-Key`
reused across a double-submit; only 1 key observed).

## 6. CSRF / secret-safety verification

- **CSRF:** API uses `Authorization: Bearer` JWT (not cookies) → no ambient
  credential, so CSRF is structurally mitigated; `CORS origin: false` enforces
  same-origin. Verified against `client.ts` (`authHeaders`) and backend CORS.
- **Secrets:** API keys masked after creation (`maskApiKey`, f8 test asserts
  masked output); AI chat answers that look like secrets are redacted (f8 test).

## 7. CSP verification

The strict CSP (script hash + no `unsafe-inline` for scripts) is present in both
`index.html` (meta) and `backend/Caddyfile` (header). Smoke test confirms no CSP
violations block rendering (0 console errors). The `frame-ancestors` directive
is correctly placed in the Caddyfile header (it is ignored in a `<meta>`).

## 8. Unverified / not run

- Lighthouse/Core Web Vitals trace (no Chrome trace tooling in this container).
- axe-core automated accessibility scan.
- Firefox / WebKit / Safari cross-browser runs.
- Live backend integration (all suites use route interception; the backend
  itself cannot be built in this environment — see F7/F9 blocker notes).
