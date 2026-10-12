// Capture screenshots of key surfaces at multiple breakpoints using Playwright.
// Run: node scripts/capture.mjs [--out /path]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = process.argv.includes('--out')
  ? process.argv[process.argv.indexOf('--out') + 1]
  : join(__dirname, '..', 'screenshots');
const baseUrl = process.env.PREVIEW_URL ?? 'http://localhost:4173';

mkdirSync(outDir, { recursive: true });

const viewports = {
  mobile: { width: 390, height: 844 },
  tablet: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

const pages = [
  { name: 'home', path: '/', auth: false },
  { name: 'showcase', path: '/showcase', auth: false },
  { name: 'login', path: '/login', auth: false },
];

const LAUNCH_OPTS = {
  args: [
    '--no-sandbox',
    '--disable-gpu',
    '--disable-dev-shm-usage',
    '--disable-software-rasterizer',
    '--font-render-hinting=none',
  ],
};

async function capturePage(vpName, vp, page, scheme = 'dark') {
  const browser = await chromium.launch(LAUNCH_OPTS);
  try {
    const ctx = await browser.newContext({ viewport: vp, colorScheme: scheme });
    const p = await ctx.newPage();
    await p.goto(`${baseUrl}${page.path}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await p.waitForTimeout(300);
    const file = `${page.name}--${vpName}${scheme === 'light' ? '-light' : ''}.png`;
    await p.screenshot({ path: join(outDir, file), fullPage: true });
    console.log('captured', file);
    await ctx.close();
  } finally {
    await browser.close();
  }
}

for (const [vpName, vp] of Object.entries(viewports)) {
  for (const page of pages) {
    await capturePage(vpName, vp, page, 'dark');
  }
}

// Light theme variant of the homepage + showcase to demonstrate both themes.
await capturePage('desktop', viewports.desktop, pages[0], 'light');
await capturePage('desktop', viewports.desktop, pages[1], 'light');