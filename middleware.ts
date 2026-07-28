import { next } from '@vercel/edge';
import { TOOLS, CATS } from './src/data/tools';

const TOOL_IDS: Set<string> = new Set(TOOLS.map((t) => t.id));
const CAT_IDS: Set<string> = new Set(CATS.map((c) => c.id));

/** Every path the SPA actually serves. Anything else is a real 404. */
const STATIC_PATHS = new Set([
  '/', '/tools', '/about', '/contact', '/login', '/pricing', '/account', '/404',
]);

/**
 * Run on everything except real files and Vercel internals, so an unknown path
 * anywhere — not just under /tools and /category — gets a real 404 status.
 */
export const config = {
  matcher: ['/((?!api/|_next/|_vercel/|.*\\..*).*)'],
};

/**
 * Static rewrites in vercel.json send every unmatched path to index.html with a 200 status —
 * the classic SPA soft-404. Worse, `scripts/copy-prerendered.mjs` overwrites that index.html
 * with the prerendered *homepage*, so a bogus URL used to return 200 plus the full homepage
 * content and a canonical pointing at "/" — which is exactly how a crawler learns to index
 * junk URLs as duplicates of the front page.
 *
 * This validates the path against the same source of truth (`src/data/tools.ts`) the rest of
 * the app uses and returns a real 404 status for anything unknown, while still serving the SPA
 * shell so the client-side "not found" UI renders normally.
 */
export default async function middleware(request: Request) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, '') || '/';

  const toolMatch = path.match(/^\/tools\/([^/]+)$/);
  const catMatch = path.match(/^\/category\/([^/]+)$/);

  let known: boolean;
  if (toolMatch) known = TOOL_IDS.has(decodeURIComponent(toolMatch[1]));
  else if (catMatch) known = CAT_IDS.has(decodeURIComponent(catMatch[1]));
  else known = STATIC_PATHS.has(path);

  if (!known) {
    const indexRes = await fetch(new URL('/index.html', request.url));
    return new Response(indexRes.body, {
      status: 404,
      headers: indexRes.headers,
    });
  }

  return next();
}
