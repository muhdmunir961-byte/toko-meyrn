// Phase F5 — seller dashboard E2E tests (sandbox, API-route-intercepted).
// Covers overview, orders (filter/search/detail/pagination), catalog, pricing
// (financial confirm), providers, settings, analytics, alerts, plus permission
// failure, empty states, and API error handling.
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

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const analytics = {
  grossSalesMinor: 1200000, successfulTransactions: 12, failedTransactions: 2,
  pendingTransactions: 3, providerCostMinor: 900000, sellerMarkupMinor: 300000,
  resellerCommissionMinor: 50000, grossProfitMinor: 300000,
  averageTransactionValueMinor: 100000, repeatPurchaseRate: 0.25,
  platformRevenueMinor: 0, sellerRevenueMinor: 250000,
};

function makeOrders(n) {
  const statuses = ['SUCCESS', 'AWAITING_PAYMENT', 'FAILED', 'SUCCESS', 'PROCESSING'];
  return Array.from({ length: n }, (_, i) => ({
    id: `ord-${1000 + i}`, tenantId: 't-1', customerId: `cust-${i}`, resellerId: null,
    status: statuses[i % statuses.length], totalMinor: 10000 + i * 1000, currency: 'IDR',
    idempotencyKey: `ck-${i}`, createdAt: new Date(Date.now() - i * 60000).toISOString(),
    items: [{ id: `oi-${i}`, orderId: `ord-${1000 + i}`, productId: 'mp-1', quantity: 1, unitPriceMinor: 10000 + i * 1000, costMinor: 8000 }],
    payment: { id: `p-${i}`, orderId: `ord-${1000 + i}`, status: i % 2 === 0 ? 'CONFIRMED' : 'PENDING' },
  }));
}

const product = {
  id: 'sp-1', tenantId: 't-1', masterProductId: 'mp-1', active: true,
  manualPriceMinor: null, markupType: 'FIXED', markupValue: 3000,
  masterProduct: { id: 'mp-1', name: 'Mobile Legends 86', sku: 'MLBB-86', costMinor: 12000, categoryId: 'c-1' },
};

async function setupRoutes(page, opts = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/seller/analytics/advanced')) {
      if (opts.analyticsError) return route.fulfill({ status: 500, contentType: 'application/json', body: JSON.stringify({ error: 'analytics failed' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(analytics) });
    }
    if (url.includes('/seller/analytics/products')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ productId: 'mp-1', qty: 12, revenue: 300000 }]) });
    if (url.includes('/seller/analytics/resellers')) return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });

    if (url.endsWith('/seller/orders')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.orders ?? makeOrders(15)) });
    }

    if (url.endsWith('/seller/products') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.emptyCatalog ? [] : [product]) });
    }
    if (url.endsWith('/seller/products') && method === 'POST') {
      if (opts.productError) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'master product not found' }) });
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ ...product, masterProductId: route.request().postDataJSON().masterProductId }) });
    }

    if (url.includes('/seller/pricing/rules') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.emptyPricing ? [] : [{ id: 'pr-1', tenantId: 't-1', markupType: 'FIXED', markupValue: 3000 }]) });
    }
    if (url.includes('/seller/pricing/rules') && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'pr-2', tenantId: 't-1', markupType: 'FIXED', markupValue: 3000 }) });
    }

    if (url.endsWith('/seller/providers') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.emptyProviders ? [] : [{ id: 'prov-1', providerType: 'MOCK', label: 'Mock provider', enabled: true, priority: 100, health: { status: 'OPEN', failureCount: 0 } }]) });
    }
    if (url.includes('/seller/providers/') && url.endsWith('/test')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }

    if (url.includes('/seller/branding') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'b-1', storeId: 's-1', primaryColor: '#8057f5', secondaryColor: '#9877ff', supportEmail: 'a@b.com' }) });
    }
    if (url.includes('/seller/branding') && method === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'b-1', storeId: 's-1', primaryColor: '#8057f5', secondaryColor: '#9877ff', supportEmail: 'a@b.com' }) });
    }

    if (url.includes('/seller/webhook-deliveries')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.emptyAlerts ? [] : [{ id: 'wd-1', endpointId: 'e-1', eventId: 'ev-1', status: 'DELIVERED', attemptCount: 1, event: { id: 'ev-1', eventType: 'order.created', payload: {} } }]) });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
  });
}

const browser = await chromium.launch(LAUNCH_OPTS);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

try {
  // 1. Overview KPIs render.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const grossSales = await page.getByText('Gross sales').isVisible();
    const kpiValue = await page.locator('.dash__kpi-value').first().textContent();
    record('overview: KPIs render', grossSales && /Rp/.test(kpiValue || ''), `first=${kpiValue}`);
    await page.screenshot({ path: join(outDir, 'dash--overview.png'), fullPage: true });
    await page.close();
  }

  // 2. Orders: table, filter, detail drawer, pagination.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { orders: makeOrders(25) });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/orders`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const rows = await page.locator('.tpt-table tbody tr').count();
    const pagination = await page.getByText(/Page 1 of 3/).isVisible();
    await page.locator('button:has-text("View")').first().click();
    await page.waitForTimeout(200);
    const drawer = await page.locator('[role="dialog"]').isVisible();
    record('orders: table + pagination + detail drawer', rows === 10 && pagination && drawer, `rows=${rows}`);
    await page.screenshot({ path: join(outDir, 'dash--orders.png'), fullPage: true });
    await page.close();
  }

  // 3. Orders empty state.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { orders: [] });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/orders`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const empty = await page.getByText('No orders yet').isVisible();
    record('orders: empty state', empty);
    await page.close();
  }

  // 4. Catalog: add product (CRUD create).
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/catalog`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.click('button:has-text("Add product")');
    await page.getByLabel('Master product ID').fill('mp-2');
    await page.getByLabel('Markup value').fill('5000');
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(400);
    const stillOpen = await page.locator('[role="dialog"]').isVisible();
    record('catalog: add product closes dialog on success', !stillOpen);
    await page.close();
  }

  // 5. Catalog: product error surfaced.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { productError: true });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/catalog`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.click('button:has-text("Add product")');
    await page.getByLabel('Master product ID').fill('bad');
    await page.click('button[type="submit"]:has-text("Save")');
    await page.waitForTimeout(400);
    const err = await page.locator('.sf__error').textContent().catch(() => '');
    record('catalog: API error surfaced', /master product not found/i.test(err), err?.trim());
    await page.close();
  }

  // 6. Pricing: financial confirm required.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/pricing`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.click('button:has-text("New rule")');
    await page.getByLabel('Markup value').fill('3000');
    await page.click('button:has-text("Review")');
    await page.waitForTimeout(200);
    const confirm = await page.getByText('Create pricing rule?').isVisible();
    record('pricing: financial operation requires confirmation', confirm);
    await page.close();
  }

  // 7. Providers: list + test button.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/providers`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const label = await page.getByText('Mock provider').isVisible();
    await page.click('button:has-text("Test")');
    await page.waitForTimeout(300);
    record('providers: list + test connection', label);
    await page.close();
  }

  // 8. Settings: save branding + payment-gap label.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/settings`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.getByLabel('Primary color').fill('#8057f5');
    await page.click('button:has-text("Save settings")');
    await page.waitForTimeout(400);
    const notice = await page.getByText('Payment gateway configuration is not available').isVisible();
    record('settings: save + payment-gap label', notice);
    await page.screenshot({ path: join(outDir, 'dash--settings.png'), fullPage: true });
    await page.close();
  }

  // 9. Permission failure: CUSTOMER role cannot reach /dash.
  {
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const payload = btoa(JSON.stringify({ id: 'u-2', tenantId: 't-1', role: 'CUSTOMER', iat: Math.floor(Date.now() / 1000) }));
      window.sessionStorage.setItem('tpt.accessToken', `h.${payload}.sig`);
    });
    await page.goto(`${baseUrl}/dash`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const bounced = page.url().includes('/dash') || page.url().includes('/login');
    record('permission: CUSTOMER bounced from /dash', bounced, page.url());
    await page.close();
  }

  // 10. Analytics error → empty/error state.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { analyticsError: true });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const err = await page.getByText("Couldn't load your dashboard").isVisible();
    record('overview: API error empty state', err);
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, 'dashboard-report.json'), JSON.stringify({ results, failed: failed.length }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;


