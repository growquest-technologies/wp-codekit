import { chromium, type Browser } from 'playwright-core';
import { preview } from 'vite';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { getRoutes, type RouteEntry } from './routes';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const OUT_DIR = `${ROOT}prerendered`;
const PORT = 4174;
const CONCURRENCY = 5;
const NAV_TIMEOUT = 20000;

/**
 * Crawls the app's own already-working client rendering with a real headless browser —
 * no SSR, no changes to any generator's code. Every generator reads localStorage during
 * its first render (useEditorState), which doesn't exist in Node, so a Node-based
 * renderToString/SSG approach can't be used here without touching all 48 tools. A real
 * browser has real localStorage (empty, since each crawl uses a fresh context), so it
 * renders the same freshProject() defaults a first-time visitor would see, then we just
 * capture the resulting DOM. This must never run on Vercel's build machine — see
 * scripts/copy-prerendered.mjs and the "build" script in package.json for why.
 */
async function waitForRouteReady(page: import('playwright-core').Page) {
  await page.waitForLoadState('networkidle', { timeout: NAV_TIMEOUT });
  await page.waitForFunction(() => !document.body.textContent?.includes('Loading…'), null, { timeout: NAV_TIMEOUT });
  await page.waitForSelector('footer', { timeout: NAV_TIMEOUT });
}

function outputPathFor(routePath: string): string {
  if (routePath === '/') return `${OUT_DIR}/index.html`;
  return `${OUT_DIR}${routePath}/index.html`;
}

async function crawlRoute(browser: Browser, baseUrl: string, route: RouteEntry) {
  const page = await browser.newPage();
  try {
    await page.goto(`${baseUrl}${route.path}`, { waitUntil: 'domcontentloaded', timeout: NAV_TIMEOUT });
    await waitForRouteReady(page);
    const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML);
    const outPath = outputPathFor(route.path);
    mkdirSync(dirname(outPath), { recursive: true });
    writeFileSync(outPath, html);
    console.log(`  ok  ${route.path}`);
  } finally {
    await page.close();
  }
}

async function main() {
  if (existsSync(OUT_DIR)) rmSync(OUT_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  console.log('Starting local preview server against dist/ ...');
  const server = await preview({ preview: { port: PORT, strictPort: true }, logLevel: 'silent' });
  const baseUrl = (server.resolvedUrls?.local[0] ?? `http://localhost:${PORT}/`).replace(/\/$/, '');

  let browser: Browser;
  try {
    browser = await chromium.launch();
  } catch {
    console.error('\nCould not launch Chromium. Run `npx playwright install chromium` once, then try again.');
    server.httpServer.close();
    process.exit(1);
  }

  const routes = getRoutes();
  console.log(`Crawling ${routes.length} routes (concurrency ${CONCURRENCY})...`);

  let cursor = 0;
  const failures: { path: string; error: string }[] = [];

  async function worker() {
    while (cursor < routes.length) {
      const route = routes[cursor++];
      try {
        await crawlRoute(browser, baseUrl, route);
      } catch (err) {
        failures.push({ path: route.path, error: err instanceof Error ? err.message : String(err) });
        console.error(`  FAIL ${route.path}`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  await browser.close();
  server.httpServer.close();

  console.log(`\nPrerendered ${routes.length - failures.length}/${routes.length} routes into prerendered/`);
  if (failures.length > 0) {
    console.error('\nFailed routes:');
    for (const f of failures) console.error(`  ${f.path}: ${f.error}`);
    process.exit(1);
  }
}

main();
