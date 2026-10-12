// Capture + a11y check for the landing page across the required breakpoints.
// Run: node scripts/home-test.mjs  (expects a preview server on 4173)
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'screenshots');
const baseUrl = process.env.PREVIEW_URL ?? 'http://localhost:4173';

mkdirSync(outDir, { recursive: true });

const viewports = {
  '375': { width: 375, height: 812 },
  '768': { width: 768, height: 1024 },
  '1024': { width: 1024, height: 768 },
  '1440': { width: 1440, height: 900 },
};

const LAUNCH_OPTS = {
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--font-render-hinting=none',
  ],
};

const report = { screenshots: [], issues: [] };

async function capture(vpName, vp, scheme) {
  const browser = await chromium.launch(LAUNCH_OPTS);
  try {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme });
    const p = await ctx.newPage();
    const errors = [];
    p.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    p.on('pageerror', (e) => errors.push(String(e)));

    await p.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 20000 });
    await p.waitForTimeout(200);

    // Horizontal overflow check.
    const overflow = await p.evaluate(() => {
      const doc = document.documentElement;
      return doc.scrollWidth - doc.clientWidth;
    });
    if (overflow > 1) {
      report.issues.push(`${vpName}/${scheme}: horizontal overflow ${overflow}px`);
    }

    const file = `home--${vpName}${scheme === 'light' ? '-light' : ''}.png`;
    await p.screenshot({ path: join(outDir, file), fullPage: true });
    report.screenshots.push(file);

    if (errors.length) {
      report.issues.push(`${vpName}/${scheme}: console errors: ${errors.join(' | ')}`);
    }
    await ctx.close();
  } finally {
    await browser.close();
  }
}

// A11y: snapshot of the desktop page for manual + automated inspection.
async function a11y() {
  const browser = await chromium.launch(LAUNCH_OPTS);
  try {
    const ctx = await browser.newContext({ viewport: viewports['1440'] });
    const p = await ctx.newPage();
    await p.goto(`${baseUrl}/`, { waitUntil: 'networkidle', timeout: 20000 });

    // Basic checks: single h1, images have alt (we use inline SVG w/ aria-hidden),
    // buttons have accessible names, links have text.
    const summary = await p.evaluate(() => {
      const h1 = document.querySelectorAll('h1').length;
      const emptyButtons = [...document.querySelectorAll('button')]
        .filter((b) => !(b.textContent || '').trim() && !b.getAttribute('aria-label'))
        .length;
      const emptyLinks = [...document.querySelectorAll('a')]
        .filter((a) => !(a.textContent || '').trim() && !a.getAttribute('aria-label'))
        .length;
      const tabIndexBad = [...document.querySelectorAll('[tabindex]')]
        .filter((el) => Number(el.getAttribute('tabindex')) < 0 && !['button','input','select','a','textarea'].includes(el.tagName.toLowerCase()) && !el.getAttribute('role'))
        .length;
      return { h1, emptyButtons, emptyLinks };
    });
    if (summary.h1 !== 1) report.issues.push(`a11y: expected 1 <h1>, found ${summary.h1}`);
    if (summary.emptyButtons) report.issues.push(`a11y: ${summary.emptyButtons} buttons without accessible name`);
    if (summary.emptyLinks) report.issues.push(`a11y: ${summary.emptyLinks} links without accessible text`);

    // FAQ interaction: open one item.
    await p.click('.home__faq-q');
    const expanded = await p.getAttribute('.home__faq-q', 'aria-expanded');
    if (expanded !== 'true') report.issues.push('a11y: FAQ toggle did not set aria-expanded=true');

    // Accent swatch interaction.
    await p.click('.home__swatch[aria-label="Accent 3"]');
    const accent = await p.getAttribute('.home__seller-window', 'style');
    if (!accent || !accent.includes('f97316')) report.issues.push('interaction: accent swatch did not apply #f97316');

    await ctx.close();
  } finally {
    await browser.close();
  }
}

for (const [name, vp] of Object.entries(viewports)) {
  await capture(name, vp, 'dark');
}
await capture('1440', viewports['1440'], 'light');
await capture('375', viewports['375'], 'light');
await a11y();

writeFileSync(join(outDir, 'home-report.json'), JSON.stringify(report, null, 2));
console.log('screenshots:', report.screenshots.length);
console.log('issues:', report.issues.length ? report.issues : 'none');
