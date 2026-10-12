// F11 — comprehensive smoke test: visit every route, capture pageerror
// (React render crashes) and console errors. Report exact findings.
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'screenshots');
const baseUrl = process.env.PREVIEW_URL ?? 'http://localhost:4173';

mkdirSync(outDir, { recursive: true });

const LAUNCH_OPTS = {
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer', '--font-render-hinting=none'],
};

function makeToken(role, tenantId = 't-1', id = 'u-1') {
  const payload = btoa(JSON.stringify({ id, tenantId, role, iat: Math.floor(Date.now() / 1000) }));
  return `h.${payload}.sig`;
}
const ownerToken = makeToken('OWNER');
const adminToken = makeToken('SUPER_ADMIN');

// Minimal catch-all API interception so authenticated pages don't crash on
// unmocked endpoints (returns [] / empty shapes).
async function intercept(page) {
  await page.route('**/api/v1/**', (route) => {
    const url = route.request().url();
    if (url.includes('/analytics/advanced')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ grossSalesMinor: 0, grossProfitMinor: 0, sellerRevenueMinor: 0, averageTransactionValueMinor: 0, successfulTransactions: 0, failedTransactions: 0, pendingTransactions: 0, providerCostMinor: 0, sellerMarkupMinor: 0, resellerCommissionMinor: 0, repeatPurchaseRate: 0, platformRevenueMinor: 0 }) });
    }
    if (url.includes('/storefront/') || url.includes('/public/store/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(url.includes('products') ? [] : url.includes('branding') ? {} : { id: 's-1', name: 'Demo', tenant: 'Demo' }) });
    }
    // Default: empty array for list endpoints, empty object otherwise.
    const isList = /(products|orders|resellers|providers|domains|deliveries|knowledge|workflows|events|plans|usage|whatsapp|rules|health|analytics)/.test(url);
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(isList ? [] : {}) });
  });
}

const routes = {
  public: ['/', '/login', '/register', '/showcase', '/nova-topup'],
  owner: ['/onboarding', '/dash', '/dash/orders', '/dash/catalog', '/dash/pricing', '/dash/providers', '/dash/analytics', '/dash/settings', '/dash/alerts', '/dash/customization', '/dash/ai', '/dash/ai-analytics', '/dash/automation'],
  admin: ['/admin', '/admin/fraud', '/admin/operations', '/admin/plans'],
};

const findings = [];
const browser = await chromium.launch(LAUNCH_OPTS);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

async function visit(path, token) {
  const page = await ctx.newPage();
  const pageErrors = [];
  const consoleErrors = [];
  page.on('pageerror', (e) => pageErrors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
  await intercept(page);
  if (token) {
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), token);
  }
  await page.goto(`${baseUrl}${path}`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(400);
  const h1 = await page.locator('h1').count();
  findings.push({ path, pageErrors, consoleErrors, h1Count: h1 });
  await page.close();
}

for (const p of routes.public) await visit(p, null);
for (const p of routes.owner) await visit(p, ownerToken);
for (const p of routes.admin) await visit(p, adminToken);

await ctx.close();
await browser.close();

const withErrors = findings.filter((f) => f.pageErrors.length || f.consoleErrors.length);
console.log(`\nVisited ${findings.length} routes.`);
console.log(`Routes with pageerror: ${findings.filter((f) => f.pageErrors.length).length}`);
console.log(`Routes with console errors: ${findings.filter((f) => f.consoleErrors.length).length}`);
console.log('\n--- Detailed findings (errors only) ---');
for (const f of withErrors) {
  console.log(`\n${f.path}`);
  for (const e of f.pageErrors) console.log(`  [pageerror] ${e}`);
  for (const e of f.consoleErrors) console.log(`  [console.error] ${e}`);
}
writeFileSync(join(outDir, 'f11-smoke.json'), JSON.stringify(findings, null, 2));
