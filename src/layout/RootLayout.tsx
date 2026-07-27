import { Outlet, useLocation } from 'react-router-dom';
import { SiteHeader } from './SiteHeader';
import { SiteFooter } from './SiteFooter';

export function RootLayout() {
  const location = useLocation();
  // Every page in the source passes cta="browse" to SiteHeader — the "readme" CTA variant
  // is a schema option that's never actually used anywhere in the real site.
  const isToolPage = location.pathname.startsWith('/tools/');

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
