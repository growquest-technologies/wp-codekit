declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

/**
 * Fires a GA4 page_view manually — this is a client-routed SPA, so GA4's own automatic
 * "page changes based on browser history events" would double up with this if both were
 * enabled. index.html sets `send_page_view: false` in the gtag config for exactly this
 * reason; this is the only thing that fires page_view.
 */
export function trackPageView(title: string, path: string) {
  window.gtag?.('event', 'page_view', {
    page_title: title,
    page_location: window.location.origin + path,
    page_referrer: document.referrer,
  });
}

type AnalyticsParams = Record<string, string | number | boolean>;

/** No-ops safely if gtag was never loaded — e.g. during the local prerender crawl, or if the request is blocked by an ad blocker. */
export function trackEvent(name: string, params: AnalyticsParams = {}) {
  window.gtag?.('event', name, params);
}
