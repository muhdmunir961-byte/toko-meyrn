// Phase F9 — super admin console E2E tests (sandbox, route-intercepted).
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
const adminToken = makeToken('SUPER_ADMIN');

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

async function setupRoutes(page, opts = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.endsWith('/admin/operations/health')) {
      if (opts.healthError) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'admin permission required' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok', components: { database: 'ok' } }) });
    }
    if (url.endsWith('/admin/subscription/plans') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'p-1', name: 'Free', monthlyPriceMinor: 0, active: true, entitlements: [] },
        { id: 'p-2', name: 'Pro', monthlyPriceMinor: 2500000, active: true, entitlements: [{ id: 'e-1', planId: 'p-2', feature: 'analytics', limit: null }] },
      ]) });
    }
    if (url.includes('/admin/subscription/plans/') && method === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'p-2', name: 'Pro', monthlyPriceMinor: 3000000, active: true, entitlements: [] }) });
    }
    if (url.endsWith('/admin/fraud/events')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([
        { id: 'fe-1', tenantId: 't-1', category: 'PAYMENT_ATTEMPT', score: 85, action: 'FLAG', details: {}, orderId: 'ord-1', actorId: 'u-1', createdAt: new Date().toISOString(), reviews: [] },
        { id: 'fe-2', tenantId: 't-2', category: 'ORDER_FREQUENCY', score: 40, action: 'ALLOW', details: {}, orderId: null, actorId: null, createdAt: new Date().toISOString(), reviews: [] },
      ]) });
    }
    if (url.includes('/admin/fraud/events/') && url.endsWith('/review')) {
      if (opts.reviewError) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'event not found' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
  });
}

const browser = await chromium.launch(LAUNCH_OPTS);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

try {
  // 1. Admin overview: health + plans.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), adminToken);
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const ops = await page.getByText('Operations', { exact: true }).isVisible();
    const plan = await page.getByText('Subscription plans', { exact: true }).isVisible();
    record('admin overview: health + plans', ops && plan);
    await page.screenshot({ path: join(outDir, 'f9--overview.png'), fullPage: true });
    await page.close();
  }

  // 2. Fraud review: list + confirm dialog.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), adminToken);
    await page.goto(`${baseUrl}/admin/fraud`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const row = await page.getByText('PAYMENT_ATTEMPT').isVisible();
    await page.locator('button:has-text("Block")').first().click();
    await page.waitForTimeout(200);
    const confirm = await page.getByText(/Block fraud event/).isVisible();
    record('fraud review: list + confirm dialog', row && confirm);
    await page.screenshot({ path: join(outDir, 'f9--fraud.png'), fullPage: true });
    await page.close();
  }

  // 3. Plans: edit + confirm dialog.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), adminToken);
    await page.goto(`${baseUrl}/admin/plans`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.locator('button:has-text("Edit")').first().click();
    await page.waitForTimeout(200);
    await page.locator('button:has-text("Review")').click();
    await page.waitForTimeout(200);
    const confirm = await page.getByText('Apply plan change?').isVisible();
    record('plans: edit + confirm dialog', confirm);
    await page.screenshot({ path: join(outDir, 'f9--plans.png'), fullPage: true });
    await page.close();
  }

  // 4. Operations health: status + timestamp.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), adminToken);
    await page.goto(`${baseUrl}/admin/operations`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const ok = await page.getByText('ok', { exact: true }).first().isVisible();
    const lastChecked = await page.getByText(/last checked/).isVisible();
    record('operations: health status + timestamp', ok && lastChecked);
    await page.close();
  }

  // 5. Non-admin OWNER bounced from /admin.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const payload = btoa(JSON.stringify({ id: 'u-9', tenantId: 't-1', role: 'OWNER', iat: Math.floor(Date.now() / 1000) }));
      window.sessionStorage.setItem('tpt.accessToken', `h.${payload}.sig`);
    });
    await page.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const bounced = page.url().includes('/dash') || page.url().includes('/login');
    record('non-admin OWNER: bounced from /admin', bounced, page.url());
    await page.close();
  }

  // 6. Non-admin CUSTOMER bounced from /admin/fraud.
  {
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const payload = btoa(JSON.stringify({ id: 'u-8', tenantId: 't-1', role: 'CUSTOMER', iat: Math.floor(Date.now() / 1000) }));
      window.sessionStorage.setItem('tpt.accessToken', `h.${payload}.sig`);
    });
    await page.goto(`${baseUrl}/admin/fraud`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const bounced = page.url().includes('/dash') || page.url().includes('/login');
    record('non-admin CUSTOMER: bounced from /admin/fraud', bounced, page.url());
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, 'f9-report.json'), JSON.stringify({ results, failed: failed.length }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;

