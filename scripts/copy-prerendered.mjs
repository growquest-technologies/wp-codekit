import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, dirname, relative } from 'node:path';

// Runs as part of `npm run build`, so it's the only prerender-related step Vercel ever
// executes — no Playwright, no browser, just text processing. It overlays the committed
// prerendered/ snapshots (generated locally via `npm run prerender`) onto the dist/ that
// vite build just produced.
//
// The snapshots' own <script type="module">/<link rel="stylesheet"> tags reference
// whatever hashed asset filenames existed the last time someone ran the crawl locally.
// If a later commit changes any source file without re-running the crawl, vite build
// produces new hashes and those old references would 404 — breaking the SPA entirely on
// every prerendered page. To make that impossible, this step always rewrites each
// snapshot's asset tags to match the ACTUAL tags in the dist/index.html that was just
// built, regardless of how stale the snapshot's own copy is. Only the tag values are
// synced; the snapshot's rendered content (title, body, JSON-LD) stays whatever it was
// at prerender time — a forgotten crawl means slightly stale *content*, never a broken page.
const root = fileURLToPath(new URL('..', import.meta.url));
const src = `${root}prerendered`;
const dest = `${root}dist`;

if (!existsSync(src)) {
  console.log('No prerendered/ directory found — skipping (run `npm run prerender` locally to generate one).');
  process.exit(0);
}

const freshIndexHtml = readFileSync(`${dest}/index.html`, 'utf8');
const scriptTag = freshIndexHtml.match(/<script type="module"[^>]*><\/script>/)?.[0];
const styleTag = freshIndexHtml.match(/<link rel="stylesheet"[^>]*>/)?.[0];

if (!scriptTag || !styleTag) {
  console.error('Could not find the built <script>/<link> tags in dist/index.html — aborting prerender overlay.');
  process.exit(1);
}

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

let count = 0;
for (const file of walk(src)) {
  let html = readFileSync(file, 'utf8');
  html = html.replace(/<script type="module"[^>]*><\/script>/, scriptTag);
  html = html.replace(/<link rel="stylesheet"[^>]*>/, styleTag);

  const outPath = join(dest, relative(src, file));
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, html);
  count++;
}

console.log(`Overlaid ${count} prerendered snapshot(s) onto dist/ (asset tags synced to the current build).`);
