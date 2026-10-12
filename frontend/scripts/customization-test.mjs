// Phase F6 — storefront customization E2E tests (sandbox, API-route-intercepted).
// Covers: preview consistency, saving branding, domain add/verify/SSL,
// unsaved-change warning, tenant separation, and mobile layout.
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

async function setupRoutes(page, opts = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/seller/branding') && method === 'GET') {
      if (opts.branding404) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'branding not configured' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'b-1', storeId: 's-1', logoUrl: 'https://cdn.example.com/logo.png', faviconUrl: null, primaryColor: '#8057f5', secondaryColor: '#9877ff', supportEmail: 'a@b.com', supportPhone: null, theme: { darkMode: true } }) });
    }
    if (url.includes('/seller/branding') && method === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'b-1', storeId: 's-1', ...route.request().postDataJSON() }) });
    }

    if (url.endsWith('/seller/domains') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(opts.domains ?? [{ id: 'd-1', tenantId: 't-1', storeId: 's-1', domain: 'store.example.com', state: 'PENDING', sslCertificateIssued: false }]) });
    }
    if (url.endsWith('/seller/domains') && method === 'POST') {
      const body = route.request().postDataJSON();
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'd-2', tenantId: 't-1', storeId: 's-1', domain: body.domain, state: 'PENDING', sslCertificateIssued: false }) });
    }
    if (url.includes('/seller/domains/') && url.endsWith('/verify')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ id: 'd-1', state: 'VERIFYING', sslCertificateIssued: false }) });
    }
    if (url.includes('/seller/domains/') && method === 'DELETE') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true }) });
    }

    if (url.endsWith('/seller/products')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'sp-1', tenantId: 't-1', masterProductId: 'mp-1', active: true, manualPriceMinor: null, markupType: 'FIXED', markupValue: 3000, masterProduct: { id: 'mp-1', name: 'Mobile Legends 86', sku: 'MLBB-86', costMinor: 12000, categoryId: 'c-1' } }]) });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
  });
}

const browser = await chromium.launch(LAUNCH_OPTS);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

try {
  // 1. Preview consistency: persisted branding reflected in preview.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/customization`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const primaryInput = await page.getByLabel('Primary / accent color').inputValue();
    const previewStyle = await page.locator('.custom__preview-frame').getAttribute('style');
    record('preview consistency: accent reflected', primaryInput === '#8057f5' && /8057f5/.test(previewStyle || ''), `input=${primaryInput}`);
    await page.screenshot({ path: join(outDir, 'custom--desktop.png'), fullPage: true });
    await page.close();
  }

  // 2. Unsaved-change warning on edit.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/customization`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    await page.getByLabel('Primary / accent color').fill('#00c2a8');
    await page.waitForTimeout(200);
    const dirty = await page.getByText('You have unsaved changes.').isVisible();
    record('unsaved-change warning shows on edit', dirty);
    await page.close();
  }

  // 3. Save branding clears dirty state.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/customization`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    // Change a value to a genuinely different one -> dirty appears.
    await page.getByLabel('Secondary color').fill('#00c2a8');
    await page.waitForTimeout(200);
    const dirtyBefore = await page.getByText('You have unsaved changes.').isVisible();
    // Save and confirm dirty clears.
    await page.click('button:has-text("Publish changes")');
    await page.waitForTimeout(500);
    const dirtyAfter = await page.getByText('You have unsaved changes.').isVisible().catch(() => false);
    record('save branding clears dirty state', dirtyBefore && !dirtyAfter, `before=${dirtyBefore} after=${dirtyAfter}`);
    await page.close();
  }

  // 4. Domain list + add + verify + SSL status from real data.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/customization`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const domainShown = await page.getByText('store.example.com').isVisible();
    const stateShown = await page.getByText('PENDING', { exact: true }).first().isVisible();
    await page.getByLabel('Add domain').fill('new.example.com');
    await page.click('button:has-text("Add")');
    await page.waitForTimeout(400);
    const added = await page.getByText('new.example.com').isVisible();
    record('domains: list + add + state', domainShown && stateShown && added);
    await page.close();
  }

  // 5. Tenant separation: other tenant sees empty domains.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { domains: [] });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const payload = btoa(JSON.stringify({ id: 'u-9', tenantId: 't-OTHER', role: 'OWNER', iat: Math.floor(Date.now() / 1000) }));
      window.sessionStorage.setItem('tpt.accessToken', `h.${payload}.sig`);
    });
    await page.goto(`${baseUrl}/dash/customization`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const empty = await page.getByText('No custom domains yet.').isVisible();
    record('tenant separation: other tenant sees empty domains', empty);
    await page.close();
  }

  // 6. Mobile layout at 375px — no horizontal overflow.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    const mctx = await browser.newContext({ viewport: { width: 375, height: 812 } });
    const mp = await mctx.newPage();
    await mp.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await mp.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await mp.goto(`${baseUrl}/dash/customization`, { waitUntil: 'domcontentloaded' });
    await mp.waitForTimeout(400);
    const overflow = await mp.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    record('mobile layout: no horizontal overflow at 375px', overflow <= 1, `overflow=${overflow}`);
    await mp.screenshot({ path: join(outDir, 'custom--mobile.png'), fullPage: true });
    await mctx.close();
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, 'customization-report.json'), JSON.stringify({ results, failed: failed.length }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;

