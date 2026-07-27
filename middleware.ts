import { next } from '@vercel/edge';
import { TOOLS, CATS } from './src/data/tools';

const TOOL_IDS: Set<string> = new Set(TOOLS.map((t) => t.id));
const CAT_IDS: Set<string> = new Set(CATS.map((c) => c.id));

export const config = {
  matcher: ['/tools/:path*', '/category/:path*'],
};

/**
 * Static rewrites in vercel.json send every unmatched path to index.html with a 200 status —
 * the classic SPA soft-404. This checks /tools/:id and /category/:cat against the known id
 * lists (the same source of truth src/data/tools.ts drives everywhere else) and returns a
 * real 404 status for unknown ones, while still serving the full SPA shell so the client-side
 * "not found" UI renders normally.
 */
export default async function middleware(request: Request) {
  const url = new URL(request.url);

  const toolMatch = url.pathname.match(/^\/tools\/([^/]+)\/?$/);
  const catMatch = url.pathname.match(/^\/category\/([^/]+)\/?$/);

  const isUnknownTool = toolMatch && !TOOL_IDS.has(decodeURIComponent(toolMatch[1]));
  const isUnknownCategory = catMatch && !CAT_IDS.has(decodeURIComponent(catMatch[1]));

  if (isUnknownTool || isUnknownCategory) {
    const indexRes = await fetch(new URL('/index.html', request.url));
    return new Response(indexRes.body, {
      status: 404,
      headers: indexRes.headers,
    });
  }

  return next();
}
