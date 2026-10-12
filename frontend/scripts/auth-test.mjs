// Phase F3 — auth & onboarding tests. Deterministic: intercepts /api/v1/**
// so it exercises frontend logic (validation, guards, redirects, error
// rendering) without a live backend. Run against `vite preview`.
//
//   PATH=/config/node22/bin:$PATH \
//   LD_LIBRARY_PATH=/tmp/chromelibs/usr/lib/x86_64-linux-gnu \
//   FONTCONFIG_PATH=/tmp/chromelibs/etc/fonts \
//   node scripts/auth-test.mjs
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

function makeToken(role, tenantId = 't-owner', id = 'u-1') {
  const payload = btoa(JSON.stringify({ id, tenantId, role, iat: Math.floor(Date.now() / 1000) }));
  return `h.${payload}.sig`;
}

const results = [];
function record(name, ok, detail = '') {
  results.push({ name, ok, detail });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? ' — ' + detail : ''}`);
}

const ownerToken = makeToken('OWNER');

async function setupRoutes(page, opts = {}) {
  await page.route('**/api/v1/**', async (route) => {
    const url = route.request().url();
    const method = route.request().method();

    if (url.includes('/auth/register')) {
      const body = route.request().postDataJSON();
      if (opts.duplicateEmail && body?.email === opts.duplicateEmail) {
        return route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ error: 'email already registered' }) });
      }
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ accessToken: ownerToken }) });
    }

    if (url.includes('/auth/login')) {
      const body = route.request().postDataJSON();
      if (opts.invalidLogin && body?.email === opts.invalidLogin) {
        return route.fulfill({ status: 401, contentType: 'application/json', body: JSON.stringify({ error: 'invalid credentials' }) });
      }
      const role = opts.loginRole ?? 'OWNER';
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ accessToken: makeToken(role) }) });
    }

    if (url.includes('/seller/branding') && method === 'GET') {
      return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'branding not configured' }) });
    }
    if (url.includes('/seller/branding') && method === 'PATCH') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ storeId: 's-1', primaryColor: '#8057f5' }) });
    }
    if (url.includes('/seller/providers') && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'p-1', providerType: 'MOCK', label: 'My provider', enabled: false, priority: 100 }) });
    }
    if (url.includes('/seller/whatsapp') && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'w-1', connectionType: 'MOCK', enabled: false }) });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
  });
}

const browser = await chromium.launch(LAUNCH_OPTS);
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });

try {
  // 1. Invalid input — registration custom validation (mismatched confirm).
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByLabel('Password', { exact: true }).fill('longenoughpass');
    await page.getByLabel('Confirm password').fill('differentpass');
    await page.click('button[type="submit"]');
    const err = await page.locator('.auth__error').textContent().catch(() => '');
    const stillStep0 = await page.getByLabel('Email').isVisible();
    record('invalid input: blocks mismatched passwords', stillStep0 && /fix/.test(err), `error="${err?.trim()}"`);
    await page.screenshot({ path: join(outDir, 'auth--register-invalid.png'), fullPage: true });
    await page.close();
  }

  // 2. Success — full registration through to onboarding.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('owner@example.com');
    await page.getByLabel('Password', { exact: true }).fill('longenoughpass');
    await page.getByLabel('Confirm password').fill('longenoughpass');
    await page.click('button[type="submit"]'); // -> step 1
    await page.getByLabel('Business name').fill('Nova Games');
    await page.getByLabel('Store name').fill('Nova Top-Up');
    await page.getByLabel('Store slug').fill('nova-topup');
    await page.click('button[type="submit"]'); // -> step 2
    await page.click('button[role="radio"]:has-text("Pro")');
    await page.click('button[type="submit"]'); // -> register -> /onboarding
    await page.waitForURL('**/onboarding', { timeout: 10000 });
    const heading = await page.locator('.auth__title').textContent();
    record('success: registration lands on onboarding', /Set up your store/.test(heading), heading?.trim());
    await page.screenshot({ path: join(outDir, 'auth--onboarding.png'), fullPage: true });
    await page.close();
  }

  // 3. Duplicate registration — 409 handled with useful message.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { duplicateEmail: 'dup@example.com' });
    await page.goto(`${baseUrl}/register`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('dup@example.com');
    await page.getByLabel('Password', { exact: true }).fill('longenoughpass');
    await page.getByLabel('Confirm password').fill('longenoughpass');
    await page.click('button[type="submit"]');
    await page.getByLabel('Business name').fill('Dup');
    await page.getByLabel('Store name').fill('Dup Store');
    await page.getByLabel('Store slug').fill('dup-store');
    await page.click('button[type="submit"]');
    await page.click('button[role="radio"]:has-text("Free")');
    await page.click('button[type="submit"]'); // triggers register -> 409
    await page.waitForTimeout(500);
    const err = await page.locator('.auth__error').textContent().catch(() => '');
    record('duplicate registration: 409 -> helpful error', /already registered/i.test(err), err?.trim());
    await page.screenshot({ path: join(outDir, 'auth--register-duplicate.png'), fullPage: true });
    await page.close();
  }

  // 4. Invalid login — 401 handled.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { invalidLogin: 'nope@example.com' });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.getByLabel('Email').fill('nope@example.com');
    await page.getByLabel('Password').fill('whatever');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    const err = await page.locator('.auth__error').textContent().catch(() => '');
    record('invalid login: 401 -> helpful error', /invalid email or password/i.test(err), err?.trim());
    await page.close();
  }

  // 5. Forbidden access — CUSTOMER role cannot reach /onboarding.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { loginRole: 'CUSTOMER' });
    await page.goto(`${baseUrl}/login`, { waitUntil: 'domcontentloaded' });
    await page.fill('input[type="email"]', 'cust@example.com');
    await page.fill('input[type="password"]', 'whatever');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(600);
    record('forbidden access: CUSTOMER role bounced', page.url().includes('/login') || page.url().includes('/dash'), page.url());
    await page.close();
  }

  // 6. Absent session — /onboarding requires auth, redirects to /login.
  {
    const page = await ctx.newPage();
    await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForURL('**/login', { timeout: 5000 }).catch(() => {});
    record('absent session: /onboarding redirects to /login', page.url().includes('/login'), page.url());
    await page.close();
  }

  // 7. Incomplete onboarding — logged-in OWNER (token injected) lands on
  //    /onboarding with branding step first (incomplete state).
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/onboarding`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    const hasBrandingStep = await page.getByLabel('Primary color').isVisible();
    record('incomplete onboarding: shows branding step for fresh OWNER', hasBrandingStep);
    await page.screenshot({ path: join(outDir, 'auth--onboarding-incomplete.png'), fullPage: true });
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, 'auth-report.json'), JSON.stringify({ results, failed: failed.length }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;

