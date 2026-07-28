/**
 * Freshness signals shown on every tool page and emitted as `dateModified`.
 *
 * This is a deliberate competitive move as much as an honesty one: the category
 * incumbent's tool pages still carry a `dateModified` of 2016 in their markup,
 * and the next-best competitor's is 2023. A visible, current "reviewed on ·
 * tested against" line is one of the cheapest trust signals available, and it
 * is exactly what answer engines look for when deciding whether a page is
 * still worth citing.
 *
 * Bump `CONTENT_REVIEWED` whenever the tool content is genuinely re-checked —
 * not on every deploy. Claiming a review that did not happen is worse than an
 * older honest date.
 */
export const CONTENT_REVIEWED = '2026-07-29';

/** Human form of CONTENT_REVIEWED, for the visible line. */
export const CONTENT_REVIEWED_LABEL = 'July 2026';

/** The stack the generated output is verified against. */
export const TESTED_ON = 'WordPress 6.8 · PHP 8.3';
