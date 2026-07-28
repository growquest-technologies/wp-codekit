import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getRoutes } from './routes';

const BASE_URL = 'https://www.wpcodekit.com';
const OUT_PATH = fileURLToPath(new URL('../public/sitemap.xml', import.meta.url));

function main() {
  const routes = getRoutes().filter((r) => r.sitemap);
  const today = new Date().toISOString().slice(0, 10);

  const body = routes
    .map(
      (r) => `  <url>
    <loc>${BASE_URL}${r.path}</loc>
    <lastmod>${today}</lastmod>
    <priority>${r.priority}</priority>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${body}
</urlset>
`;

  writeFileSync(OUT_PATH, xml);
  console.log(`Wrote ${routes.length} URLs to public/sitemap.xml`);
}

main();
