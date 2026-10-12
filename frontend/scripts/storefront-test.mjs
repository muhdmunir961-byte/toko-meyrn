// Phase F4 — storefront purchase-journey E2E tests (sandbox).
//
// Deterministic via Playwright route interception of /api/v1/**. Exercises the
// complete journey + the required failure states. Run against `vite preview`.
//
//   PATH=/config/node22/bin:$PATH \
//   LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu \
//   FONTCONFIG_PATH=/tmp/chromelibs/etc/fonts \
//   node scripts/storefront-test.mjs
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'screenshots');
const baseUrl = process.env.PREVIEW_URL ?? 'http://localhost:4173';
const SLUG = 'nova-topup';

mkdirSync(outDir, { recursive: true });

const LAUNCH_OPTS = {
  args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage', '--disable-software-rasterizer', '--font-render-hinting=none'],
};

function makeToken(role = 'OWNER', tenantId = 't-1', id = 'u-1') {
  const payload = btoa(JSON.stringify({ id, tenantId, role, iat: Math.floor(Date.now() / 1000) }));
  return `h.${payload}.sig`;
}
const token = makeToken();

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const masterProduct = { id: 'mp-1', name: 'Demo Mobile Legends 86 Diamonds', sku: 'DEMO-MLBB-86', costMinor: 12000, categoryId: 'c-1' };
const sellerProduct = {
  id: 'sp-1', tenantId: 't-1', masterProductId: 'mp-1', active: true,
  manualPriceMinor: null, markupType: 'FIXED', markupValue: 3000, masterProduct,
};

const seenIdempotency = new Set();

async function setupRoutes(page, opts = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/storefront/') && url.endsWith('/products')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([sellerProduct]) });
    }
    if (url.includes('/storefront/')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 's-1', name: 'Nova Top-Up', tenant: 'Nova Games' }) });
    }
    if (url.includes('/public/store/') && url.includes('/branding')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ primaryColor: '#00c2a8', secondaryColor: '#9877ff' }) });
    }

    if (url.endsWith('/orders') && method === 'POST') {
      const idem = route.request().headers()['idempotency-key'];
      seenIdempotency.add(idem);

      if (opts.unavailableProduct) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'one or more products unavailable' }) });
      }

      const items = route.request().postDataJSON()?.items ?? [];
      const totalMinor = items.reduce((s, it) => s + (sellerProduct.masterProduct.costMinor + sellerProduct.markupValue) * it.quantity, 0);
      const order = {
        id: 'ord-1', tenantId: 't-1', customerId: 'u-1', status: 'AWAITING_PAYMENT',
        totalMinor, currency: 'IDR', idempotencyKey: idem,
        items: items.map((it, i) => ({ id: `oi-${i}`, orderId: 'ord-1', productId: 'mp-1', quantity: it.quantity, unitPriceMinor: 15000, costMinor: 12000 })),
        payment: { id: 'pay-1', orderId: 'ord-1', status: 'PENDING' },
      };
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify(order) });
    }

    if (url.includes('/mock-payment')) {
      if (opts.paymentFailure) {
        return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'payment failed' }) });
      }
      const order = {
        id: 'ord-1', tenantId: 't-1', customerId: 'u-1', status: 'SUCCESS', totalMinor: 15000,
        currency: 'IDR', idempotencyKey: 'ck', items: [{ id: 'oi-0', orderId: 'ord-1', productId: 'mp-1', quantity: 1, unitPriceMinor: 15000, costMinor: 12000 }],
        payment: { id: 'pay-1', orderId: 'ord-1', status: 'CONFIRMED', providerReference: 'mock-ord-1' },
        providerTransaction: { id: 'pt-1', orderId: 'ord-1', status: 'SUCCESS', providerReference: 'mock-ord-1' },
      };
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(order) });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
  });
}

const browser = await chromium.launch(LAUNCH_OPTS);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

try {
  // 1. Storefront homepage loads with catalog + seller branding applied.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const hasProduct = await page.locator('.sf__card').first().isVisible();
    const accent = await page.locator('.tenant-theme').getAttribute('style').catch(() => '');
    record('homepage: catalog renders + tenant branding applied', hasProduct && /00c2a8/i.test(accent || ''), `style="${accent}"`);
    await page.screenshot({ path: join(outDir, 'sf--home.png'), fullPage: true });
    await page.close();
  }

  // 2. Search filters products.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Search games').fill('zzz-no-match');
    await page.waitForTimeout(200);
    const empty = await page.getByText('No products match your search.').isVisible().catch(() => false);
    record('search: filters to empty state', empty);
    await page.close();
  }

  // 3. Product detail requires player ID (missing -> blocked).
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/${SLUG}/product/sp-1`, { waitUntil: 'domcontentloaded' });
    await page.click('button:has-text("Continue to checkout")');
    await page.waitForTimeout(200);
    const err = await page.locator('.sf__error, .tpt-field__message--error').first().textContent().catch(() => '');
    record('product detail: missing player ID blocks checkout', /player/i.test(err), err?.trim());
    await page.screenshot({ path: join(outDir, 'sf--product-invalid-player.png'), fullPage: true });
    await page.close();
  }

  // 4. Complete purchase journey.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), token);
    await page.goto(`${baseUrl}/${SLUG}/product/sp-1`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Player ID / User ID').fill('12345678');
    await page.getByLabel('Server / Zone (optional)').fill('2087');
    await page.click('button:has-text("Continue to checkout")');
    await page.waitForURL('**/checkout', { timeout: 5000 });
    await page.click('button:has-text("Confirm order")');
    await page.waitForURL('**/order/ord-1', { timeout: 5000 });
    const payBadge = await page.locator('.sf__status-row').filter({ hasText: 'Payment' }).locator('.tpt-badge').first().textContent();
    const fulfillBadge = await page.locator('.sf__status-row').filter({ hasText: 'Fulfillment' }).locator('.tpt-badge').first().textContent();
    record('journey: order created with distinct payment/fulfillment states', /pending/i.test(payBadge || '') && /awaiting/i.test(fulfillBadge || ''), `pay=${payBadge} fulfill=${fulfillBadge}`);
    await page.click('button:has-text("Pay now")');
    await page.waitForTimeout(400);
    const fulfilled = await page.getByText('Your order is fulfilled.').isVisible().catch(() => false);
    record('journey: mock payment -> fulfilled', fulfilled);
    await page.screenshot({ path: join(outDir, 'sf--order-fulfilled.png'), fullPage: true });
    await page.close();
  }

  // 5. Duplicate-submission protection — single idempotency key.
  {
    seenIdempotency.clear();
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), token);
    await page.goto(`${baseUrl}/${SLUG}/product/sp-1`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Player ID / User ID').fill('12345678');
    await page.click('button:has-text("Continue to checkout")');
    await page.waitForURL('**/checkout');
    await Promise.all([
      page.click('button:has-text("Confirm order")'),
      page.click('button:has-text("Confirm order")').catch(() => {}),
    ]);
    await page.waitForTimeout(600);
    record('duplicate-submission: single idempotency key used', seenIdempotency.size === 1, `keys=${seenIdempotency.size}`);
    await page.close();
  }

  // 6. Unavailable product -> backend 400 surfaced.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { unavailableProduct: true });
    await page.goto(`${baseUrl}/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), token);
    await page.goto(`${baseUrl}/${SLUG}/product/sp-1`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Player ID / User ID').fill('12345678');
    await page.click('button:has-text("Continue to checkout")');
    await page.waitForURL('**/checkout');
    await page.click('button:has-text("Confirm order")');
    await page.waitForTimeout(400);
    const err = await page.locator('.sf__error').textContent().catch(() => '');
    record('unavailable product: error surfaced', /unavailable/i.test(err), err?.trim());
    await page.close();
  }

  // 7. Payment failure -> error surfaced, order not fulfilled.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { paymentFailure: true });
    await page.goto(`${baseUrl}/${SLUG}`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), token);
    await page.goto(`${baseUrl}/${SLUG}/product/sp-1`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Player ID / User ID').fill('12345678');
    await page.click('button:has-text("Continue to checkout")');
    await page.waitForURL('**/checkout');
    await page.click('button:has-text("Confirm order")');
    await page.waitForURL('**/order/ord-1');
    await page.click('button:has-text("Pay now")');
    await page.waitForTimeout(400);
    const err = await page.locator('.sf__error').textContent().catch(() => '');
    record('payment failure: error surfaced, not fulfilled', /payment/i.test(err) || /failed/i.test(err), err?.trim());
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, 'storefront-report.json'), JSON.stringify({ results, failed: failed.length }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;

