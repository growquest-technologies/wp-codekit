/**
 * The long-form content block rendered under every generator's workspace.
 *
 * This is the site's indexable prose: the tool itself is an interactive app that
 * search engines and answer engines can't evaluate, so everything a crawler or an
 * LLM needs to understand (and cite) the tool lives here. Ported from the design's
 * own section structure — About / Why / How / FAQ / Related.
 *
 * Every field is required so no tool ships a half-filled section; a missing entry
 * is caught by `assertToolContentCoverage()` in toolContent.ts rather than
 * silently rendering an empty block.
 */

/** Inline markup allowed in body copy: `code` spans, written as backticks. */
export type RichText = string;

export interface SpecCard {
  /** The WP/WooCommerce hook, function or file this generator targets. Shown mono. */
  hook: string;
  /** What you can export — snippet / functions.php / plugin file / .zip etc. */
  outputs: RichText;
  /** Minimum WordPress / PHP / plugin versions. */
  requires: string;
  /**
   * What the output is verified against, for the visible freshness line.
   * Defaults to the WordPress/PHP stack in contentMeta; tools that don't emit
   * WordPress code (the Color Tool) override it with something meaningful.
   */
  testedOn?: string;
}

export interface FeatureCard {
  title: string;
  body: RichText;
}

export interface HowStep {
  title: string;
  body: RichText;
}

export interface WorkedExample {
  /** e.g. "Worked example — £4.90 cash-on-delivery fee, waived over £100" */
  title: string;
  /** One or two sentences framing what the snippet does. */
  intro: RichText;
  /** Real generated PHP/JSON, exactly as the tool would emit it. */
  code: string;
  /** Optional closing note under the code block. */
  note?: RichText;
}

export interface RefLink {
  /** Always an official docs URL (developer.wordpress.org, woocommerce.com, etc). */
  href: string;
  title: string;
  description: string;
}

export interface FaqItem {
  /** A question people genuinely ask — sourced from PAA/forums, not invented. */
  question: string;
  answer: RichText;
}

export interface ToolContent {
  /** H2 under the tool. Convention: "<Tool name> Generator Online". */
  aboutTitle: string;
  /** Lead paragraph — what you build and what you get out. */
  aboutLead: RichText;
  /** Second paragraph — the live/preview angle plus the free/private promise. */
  aboutSupport: RichText;
  spec: SpecCard;

  /** H2, e.g. "Why the Cart Fees Generator beats a generic fee snippet". */
  whyTitle: string;
  whyIntro: RichText;
  /** Exactly six, matching the design's 3x2 grid. */
  features: FeatureCard[];

  /** H2, e.g. "How does the Cart Fees Generator work?". */
  howTitle: string;
  howIntro: RichText;
  /** Exactly four numbered steps. Also feeds HowTo schema. */
  steps: HowStep[];
  example: WorkedExample;
  /** 4-6 official documentation links. All rendered nofollow. */
  refLinks: RefLink[];

  /** H2, e.g. "Cart fees & discounts — frequently asked questions". */
  faqTitle: string;
  faqIntro: RichText;
  /** 5-6 items. Feeds FAQPage schema, so answers must stand alone. */
  faqs: FaqItem[];

  /**
   * Tool ids to feature in "More <category> generators". Same-category tools
   * first (per the brief), then genuinely related cross-category ones.
   * Rendered with a one-line reason each, from `relatedNote`.
   */
  related: { id: string; note: string }[];
}
