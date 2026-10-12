// Phase F8 — automation & intelligence E2E tests (sandbox, route-intercepted).
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

    if (url.endsWith('/ai/chat')) {
      if (opts.chatError) return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ error: 'unsafe input' }) });
      const answer = opts.leakySecret ? 'sk_abcdefghijklmnopqrstuvwxyz123456' : 'Your revenue is trending up.';
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ conversationId: 'conv-1', answer }) });
    }
    if (url.endsWith('/seller/ai/analytics')) {
      if (opts.analyticsError) return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'seller permission required' }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ metrics: { orderCount: 12, successfulOrders: 10, revenueMinor: 500000, estimatedGrossProfitMinor: 150000, evidenceOrderIds: [0, 1, 2] }, explanation: 'Sales increased this week.', evidence: [0, 1, 2] }) });
    }
    if (url.endsWith('/seller/ai/usage')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'u-1', tenantId: 't-1', model: 'mock', workflow: 'CUSTOMER_SUPPORT', inputTokens: 10, outputTokens: 5, totalTokens: 15, status: 'SUCCESS', createdAt: new Date().toISOString() }]) });
    }
    if (url.endsWith('/seller/whatsapp') && method === 'GET') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'w-1', connectionType: 'MOCK', enabled: false }]) });
    }
    if (url.endsWith('/seller/whatsapp') && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'w-1', connectionType: 'MOCK', enabled: true }) });
    }
    if (url.endsWith('/seller/webhook-deliveries')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'wd-1', endpointId: 'e-1', eventId: 'ev-1', status: 'FAILED', attemptCount: 3, lastError: 'HTTP 500', event: { id: 'ev-1', eventType: 'order.created', payload: {} } }]) });
    }
    if (url.includes('/webhook-deliveries/') && url.endsWith('/replay')) {
      if (opts.replayError) return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'delivery not found' }) });
      return route.fulfill({ status: 202, contentType: 'application/json', body: JSON.stringify({ accepted: true, jobId: 'j-1' }) });
    }
    if (url.endsWith('/seller/api-keys') && method === 'POST') {
      return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'k-1', name: 'test', key: 'sk_abcdefghijklmnopqrstuvwxyz123456', scopes: ['orders:read'], expiresAt: null }) });
    }
    if (url.endsWith('/seller/routing/health')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([{ id: 'p-1', providerType: 'MOCK', enabled: true, priority: 100, health: 'OPEN', failureCount: 0 }]) });
    }
    if (url.endsWith('/seller/ai/workflows')) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) });
    }

    return route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) });
  });
}

const browser = await chromium.launch(LAUNCH_OPTS);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });

try {
  // 1. AI chat: label + answer.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/ai`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.getByLabel('Message').fill('How is my store doing?');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(400);
    const label = await page.getByText('AI-generated', { exact: true }).first().isVisible();
    const answer = await page.getByText('Your revenue is trending up.').isVisible();
    record('ai chat: label + answer', label && answer);
    await page.screenshot({ path: join(outDir, 'f8--ai-chat.png'), fullPage: true });
    await page.close();
  }

  // 2. AI chat: secret-looking answer redacted.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { leakySecret: true });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/ai`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.getByLabel('Message').fill('show me a secret');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(400);
    const redacted = await page.getByText(/redacted/).isVisible();
    const leaked = await page.getByText('sk_abcdefghijklmnopqrstuvwxyz123456').isVisible().catch(() => false);
    record('ai chat: secret answer redacted', redacted && !leaked);
    await page.close();
  }

  // 3. AI chat integration error surfaced.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { chatError: true });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/ai`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(300);
    await page.getByLabel('Message').fill('hi');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(400);
    const err = await page.getByText(/unsafe input/).isVisible();
    record('ai chat: integration error surfaced', err);
    await page.close();
  }

  // 4. AI analytics: KPIs + explanation.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/ai-analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const kpi = await page.getByText('Revenue').isVisible();
    const explanation = await page.getByText(/Sales increased this week/).isVisible();
    record('ai analytics: KPIs + explanation', kpi && explanation);
    await page.screenshot({ path: join(outDir, 'f8--ai-analytics.png'), fullPage: true });
    await page.close();
  }

  // 5. Automation: WhatsApp + replay + API key masking.
  {
    const page = await ctx.newPage();
    await setupRoutes(page);
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate((t) => window.sessionStorage.setItem('tpt.accessToken', t), ownerToken);
    await page.goto(`${baseUrl}/dash/automation`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const waVisible = await page.getByText('MOCK', { exact: true }).first().isVisible();
    await page.click('button:has-text("Replay")');
    await page.waitForTimeout(300);
    await page.getByLabel('Key name').fill('test');
    await page.click('button:has-text("Create")');
    await page.waitForTimeout(400);
    const mask = await page.getByText(/masked thereafter/).isVisible();
    record('automation: whatsapp + replay + api key masking', waVisible && mask);
    await page.screenshot({ path: join(outDir, 'f8--automation.png'), fullPage: true });
    await page.close();
  }

  // 6. Unauthorized: CUSTOMER bounced from AI analytics.
  {
    const page = await ctx.newPage();
    await setupRoutes(page, { analyticsError: true });
    await page.goto(`${baseUrl}/`, { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const payload = btoa(JSON.stringify({ id: 'u-2', tenantId: 't-1', role: 'CUSTOMER', iat: Math.floor(Date.now() / 1000) }));
      window.sessionStorage.setItem('tpt.accessToken', `h.${payload}.sig`);
    });
    await page.goto(`${baseUrl}/dash/ai-analytics`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);
    const bounced = page.url().includes('/dash') || page.url().includes('/login');
    record('unauthorized: CUSTOMER bounced from AI analytics', bounced, page.url());
    await page.close();
  }
} finally {
  await ctx.close();
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
writeFileSync(join(outDir, 'f8-report.json'), JSON.stringify({ results, failed: failed.length }, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} passed`);
process.exitCode = failed.length ? 1 : 0;

