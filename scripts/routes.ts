import { TOOLS, CATS } from '../src/data/tools';

export interface RouteEntry {
  path: string;
  /** Sitemap priority, only meaningful when sitemap is true. */
  priority: string;
  /** Whether this route belongs in sitemap.xml (public, indexable content). */
  sitemap: boolean;
}

/**
 * Single source of truth for every route the sitemap and prerender crawl need to know
 * about. Add a tool to src/data/tools.ts and it appears here automatically — nothing
 * else to maintain by hand. /login and /pricing are prerendered (so the static shell for
 * those paths has correct title/noindex content instead of falling back to the homepage's
 * snapshot) but excluded from the sitemap since they're noindex placeholder pages.
 * /account is intentionally excluded entirely — it's auth-gated and redirects
 * unauthenticated visitors, so a static snapshot of it would be misleading; it stays a
 * pure client-rendered SPA route, same as the standard advice for any private/dynamic page.
 */
export function getRoutes(): RouteEntry[] {
  const staticRoutes: RouteEntry[] = [
    { path: '/', priority: '1.0', sitemap: true },
    { path: '/tools', priority: '0.9', sitemap: true },
    { path: '/about', priority: '0.5', sitemap: true },
    { path: '/contact', priority: '0.4', sitemap: true },
    { path: '/login', priority: '0.1', sitemap: false },
    { path: '/pricing', priority: '0.1', sitemap: false },
  ];
  const categoryRoutes: RouteEntry[] = CATS.map((c) => ({ path: `/category/${c.id}`, priority: '0.7', sitemap: true }));
  const toolRoutes: RouteEntry[] = TOOLS.map((t) => ({ path: `/tools/${t.id}`, priority: '0.8', sitemap: true }));
  return [...staticRoutes, ...categoryRoutes, ...toolRoutes];
}
