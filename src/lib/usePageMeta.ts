import { useEffect } from 'react';
import { trackPageView } from './analytics';

const SITE_NAME = 'WP CodeKit';
const BASE_URL = 'https://www.wpcodekit.com';
const INDEXABLE_ROBOTS = 'index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1';

function setMeta(selector: string, content: string) {
  const el = document.querySelector(selector);
  if (el) el.setAttribute('content', content);
}

/**
 * Trims a description to fit the ~160-char SERP budget without cutting mid-word.
 * Google truncates past roughly that point, so an over-long description just
 * means the differentiating text is the part that gets dropped.
 */
export function clampDescription(text: string, max = 158): string {
  const s = text.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const cut = s.slice(0, max);
  const lastStop = Math.max(cut.lastIndexOf('. '), cut.lastIndexOf(' — '));
  // Prefer ending on a sentence if one lands in the last third; else last word.
  if (lastStop > max * 0.6) return cut.slice(0, lastStop + 1).trim();
  return cut.slice(0, cut.lastIndexOf(' ')).trim() + '…';
}

/** Sets document title, meta description, canonical URL and the matching OG/Twitter tags for the current route. */
export function usePageMeta(title: string, description: string, path: string, options?: { noindex?: boolean; rawTitle?: boolean }) {
  useEffect(() => {
    const fullTitle = options?.rawTitle || title === SITE_NAME ? title : `${title} — ${SITE_NAME}`;
    const url = BASE_URL + path;
    const desc = clampDescription(description);

    document.title = fullTitle;
    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', fullTitle);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[name="twitter:title"]', fullTitle);
    setMeta('meta[name="twitter:description"]', desc);

    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);

    // Indexable routes keep the permissive directive from index.html rather than
    // dropping the tag — removing it would silently give back the default
    // snippet cap, which truncates exactly the answer paragraphs we want quoted
    // in AI Overviews.
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement('meta');
      robots.setAttribute('name', 'robots');
      document.head.appendChild(robots);
    }
    robots.setAttribute(
      'content',
      options?.noindex ? 'noindex, follow' : INDEXABLE_ROBOTS,
    );

    trackPageView(fullTitle, path);
  }, [title, description, path, options?.noindex, options?.rawTitle]);
}
