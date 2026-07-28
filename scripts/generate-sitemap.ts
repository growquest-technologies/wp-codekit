import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getRoutes } from './routes';

const BASE_URL = 'https://www.wpcodekit.com';
const OUT_PATH = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url));
const REPO_ROOT = fileURLToPath(new URL('..', import.meta.url));

/**
 * Last commit date for the files that actually determine a route's content.
 *
 * The previous version stamped `new Date()` on all 59 URLs on every
 * regeneration, so editing one tool told Google that every page on the site
 * changed today. Google learns to distrust a sitemap that does that and then
 * ignores `lastmod` entirely — which costs us the one signal that genuinely
 * helps recrawling. Deriving it from git means a date is only claimed when the
 * page's own sources really changed.
 */
function lastModified(paths: string[], fallback: string): string {
  const existing = paths.filter(Boolean);
  if (!existing.length) return fallback;
  try {
    const out = execFileSync('git', ['log', '-1', '--format=%cs', '--', ...existing], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
    }).trim();
    return out || fallback;
  } catch {
    return fallback;
  }
}

/** Source files whose content ends up rendered on a given route. */
function sourcesFor(path: string): string[] {
  const shared = ['src/components/generator/ToolContentSection.tsx', 'src/data/tools.ts'];
  const toolMatch = path.match(/^\/tools\/(.+)$/);
  if (toolMatch) return [`src/data/toolContent/${toolMatch[1]}.ts`, ...shared];
  if (path.startsWith('/category/')) return ['src/pages/CategoryHub.tsx', 'src/data/tools.ts'];
  if (path === '/tools') return ['src/pages/ToolsIndex.tsx', 'src/data/tools.ts'];
  if (path === '/') return ['src/pages/Home.tsx', 'src/data/tools.ts'];
  if (path === '/about') return ['src/pages/About.tsx'];
  if (path === '/contact') return ['src/pages/Contact.tsx'];
  return [];
}

function main() {
  const routes = getRoutes().filter((r) => r.sitemap);
  const today = new Date().toISOString().slice(0, 10);

  const body = routes
    .map((r) => {
      const lastmod = lastModified(sourcesFor(r.path), today);
      return `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${lastmod}</lastmod>
  </url>`;
    })
    .join('\n');

  // `<priority>` and `<changefreq>` are both ignored by Google and dropped here
  // rather than carried as decoration.
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  writeFileSync(OUT_PATH, xml);
  console.log(`Wrote ${routes.length} URLs to public/sitemap.xml (lastmod from git history)`);
}

main();
