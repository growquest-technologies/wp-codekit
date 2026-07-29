import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function RootLayout() {
  const location = useLocation();
  // Every page in the source passes cta="browse" to SiteHeader — the "readme" CTA variant
  // is a schema option that's never actually used anywhere in the real site.
  const isToolPage = location.pathname.startsWith('/tools/');

  /**
   * React Router keeps the window's scroll offset across navigations, so following
   * a link from the bottom of a long page — the related-tools grid, most obviously —
   * landed you at that same offset on the next page, which reads as the link having
   * done nothing at all. An in-page anchor (#conversion on the colour tools) still
   * gets to do its own scrolling.
   */
  useEffect(() => {
    if (location.hash) return;
    window.scrollTo(0, 0);
  }, [location.pathname, location.hash]);

  return (
    <div className="gfw-page">
      <SiteHeader />
      <main className="gfw-main">
        <Outlet />
      </main>
      {/* Marketing pages (home/tools/about/contact) hide the footer's browse row;
          tool pages show it — this is the opposite of what it might look like at a glance. */}
      <SiteFooter showBrowseRow={isToolPage} />
    </div>
  );
}
