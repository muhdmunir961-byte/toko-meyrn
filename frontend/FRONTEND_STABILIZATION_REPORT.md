# Frontend Stabilization Report (Phase F11)

**Date:** 2026-10-12 · **Scope:** `frontend/` stabilization following the F10 conditional NO-GO.

## 1. Confirmed defects fixed

### D1 — React render/runtime errors (Priority 1) — FIXED

Three routes threw uncaught `TypeError`s because they read nested fields without
guarding for `undefined` when the backend returned an unexpected/empty shape:

| Route | Exact error | Fix |
|---|---|---|
| `/dash/ai-analytics` | `TypeError: Cannot read properties of undefined (reading 'orderCount')` | Guard `data?.metrics` + `?? 0` on `orderCount`/`successfulOrders`/`revenueMinor`/`estimatedGrossProfitMinor`; `data.evidence?.length` |
| `/admin` | `TypeError: Cannot read properties of undefined (reading 'database')` | `health?.components?.database` (optional chaining) |
| `/admin/operations` | `TypeError: Cannot read properties of undefined (reading 'database')` | `health?.components?.database` |

**Verification (before/after):** a new `scripts/f11-smoke.mjs` visits all 22
routes capturing `pageerror` + `console.error`.

- **Before fix:** 3 routes with `pageerror` (the three above).
- **After fix:** `Routes with pageerror: 0`, `Routes with console errors: 0`.

### D1b — No React error boundary — FIXED

Added `src/components/ErrorBoundary.tsx` (class component with
`getDerivedStateFromError` + `componentDidCatch`) and wrapped `<App />` in
`main.tsx`. An uncaught render error now shows an on-brand fallback with a
Reload action instead of blanking the whole app.

### D2 — Missing Content-Security-Policy — FIXED

- Added a strict CSP `<meta>` to `index.html`:
  `default-src 'self'; script-src 'self' 'sha256-<theme-script-hash>'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'`
- Added the same CSP as an HTTP header in `backend/Caddyfile` (the authoritative
  place for `frame-ancestors 'none'`, which is ignored in a `<meta>`).
- The inline theme bootstrap script is allow-listed via its exact SHA-256 hash
  (`sha256-nhSN5+7axuJ9LL6bgEqjgZGwul3l+pWTugG6qU0BngQ=`), computed by
  `scripts/hash-csp.cjs` — no `'unsafe-inline'` for scripts.
- `style-src 'unsafe-inline'` is required because the design system uses inline
  `style={{}}` attributes (React inline styles); documented, not a gap.

### D3 — No unit tests — FIXED

- Added `vitest` (dev dependency) and `npm run test` / `test:watch` scripts.
- Added `src/lib/__tests__/lib.test.ts` — **14 real unit tests** covering pure
  logic: money formatting/truncation, API-key masking, secret detection,
  slug/color/url/email/phone validation, status→tone mapping, and plan prices
  (asserting exact parity with the backend seed).

**Result:** `npm test` → `14 passed (14)`, 1 file passed.

## 2. Unresolved defects (carried from F10, not fixed this phase)

| # | Severity | Defect | Status |
|---|---|---|---|
| D4 | Medium | SEO/meta for public pages (no OG, robots, sitemap, favicon) | Partially addressed (added `<meta name="description">`); OG/robots/sitemap/favicon still absent |
| D5 | Medium | No code-splitting/lazy routes (single ~315 kB JS chunk) | Unchanged |
| D6 | Low | `ApiError.retryable` flag exists but no automatic retry | Unchanged (manual "Retry" buttons only) |
| D7 | Low | Sourcemaps ship in production build (~1.18 MB map) | Unchanged (`sourcemap: true`) |
| D8 | Low | `storefront-test.mjs` teardown flake (`browserContext.close` after all pass) | Unchanged (harness-only; all 8 assertions still pass) |
| D9 | Low | No automated a11y/contrast scan (axe); CWV not measured | Unchanged |
| D10 | Low | No frontend deploy/rollback runbook; no browserslist/cross-browser matrix | Unchanged |

## 3. Changed files

| File | Change |
|---|---|
| `src/pages/AIAnalyticsPage.tsx` | Defensive guards on `data.metrics` |
| `src/pages/AdminOverviewPage.tsx` | `health?.components?.database` |
| `src/pages/AdminOperationsPage.tsx` | `health?.components?.database` |
| `src/components/ErrorBoundary.tsx` | **New** — top-level error boundary |
| `src/main.tsx` | Wrap `<App />` in `<ErrorBoundary>` |
| `index.html` | Added CSP meta + `<meta name="description">` |
| `backend/Caddyfile` | Added `Content-Security-Policy` header |
| `package.json` | Added `vitest` dev dep + `test`/`test:watch` scripts |
| `src/lib/__tests__/lib.test.ts` | **New** — 14 unit tests |
| `scripts/f11-smoke.mjs` | **New** — 22-route smoke test (pageerror/console capture) |
| `scripts/hash-csp.cjs` | **New** — CSP script-hash helper |

## 4. Exact test commands and results

```
npm run typecheck           # tsc --noEmit  → clean (no output)
npm run lint                # eslint --max-warnings 0 → clean
npm test                    # vitest run → 14 passed (14)
npm run build               # tsc --noEmit && vite build → ✓ 107 modules, 315.13 kB JS / 50.38 kB CSS
node scripts/f11-smoke.mjs  # 22 routes → pageerror: 0, console errors: 0
node scripts/auth-test.mjs          # 7/7 passed
node scripts/storefront-test.mjs    # 8/8 passed
node scripts/dashboard-test.mjs     # 10/10 passed
node scripts/customization-test.mjs # 6/6 passed
node scripts/f8-test.mjs            # 6/6 passed
node scripts/f9-test.mjs            # 6/6 passed
node scripts/home-test.mjs          # 6 screenshots, issues: none
```

(Playwright suites run against `vite preview` with
`LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu` and
`FONTCONFIG_PATH=/tmp/chromelibs/etc/fonts` in this container.)

## 5. Confirmed vs unverified

**Confirmed defects (reproduced + fixed):** the three `TypeError` crashes and
the missing error boundary/CSP/unit-tests — all now resolved and verified.

**Unverified concerns (flagged, not reproduced as failures):** CWV not measured
(no Lighthouse trace), contrast not machine-scanned (no axe), cross-browser
untested (Chromium only), SEO OG/robots/sitemap absent, no frontend deploy
runbook. These are documented as risks, not claimed failures.
