/**
 * Readme Studio — data model, readme.txt serializer/parser, rich-text tokenizer and
 * WordPress.org listing validation. Ported from the `Readme Studio.dc.html` design
 * prototype's `<script type="text/x-dc">` block (class Component's free functions),
 * kept as pure logic so the page component and ListingPreview can both use it.
 */

// ───────────────────────────── ids ─────────────────────────────

let idCounter = 0;
export function uid(prefix: string): string {
  idCounter += 1;
  return `${prefix}_${idCounter}_${Math.random().toString(36).slice(2, 7)}`;
}

// ───────────────────────────── blocks ─────────────────────────────

export type BlockType = 'paragraph' | 'subheading' | 'blockquote' | 'code' | 'video';

export interface ListItem {
  id: string;
  value: string;
}

export interface TextBlockData {
  text: string;
}
export interface VideoBlockData {
  url: string;
}

export interface ParagraphBlock { id: string; type: 'paragraph'; data: TextBlockData; }
export interface SubheadingBlock { id: string; type: 'subheading'; data: TextBlockData; }
export interface BlockquoteBlock { id: string; type: 'blockquote'; data: TextBlockData; }
export interface CodeBlock { id: string; type: 'code'; data: TextBlockData; }
export interface VideoBlock { id: string; type: 'video'; data: VideoBlockData; }

export type Block = ParagraphBlock | SubheadingBlock | BlockquoteBlock | CodeBlock | VideoBlock;

export const BLOCK_TYPES: { type: BlockType; label: string }[] = [
  { type: 'paragraph', label: 'Paragraph' },
  { type: 'subheading', label: 'Subheading' },
  { type: 'blockquote', label: 'Blockquote' },
  { type: 'code', label: 'Code Block' },
  { type: 'video', label: 'Video' },
];

export function makeBlock(type: BlockType): Block {
  const id = uid('blk');
  if (type === 'video') return { id, type: 'video', data: { url: '' } };
  return { id, type, data: { text: '' } } as ParagraphBlock | SubheadingBlock | BlockquoteBlock | CodeBlock;
}

/** Bulleted/numbered list lines as readme.txt writes them: `* item` / `1. item`. */
function listItemsToText(style: 'bulleted' | 'numbered', items: ListItem[]): string {
  return items
    .filter((it) => it.value && it.value.trim())
    .map((it, i) => (style === 'numbered' ? `${i + 1}. ${it.value}` : `* ${it.value}`))
    .join('\n');
}

/**
 * Pre-Tiptap projects (and the 5 "New project" fictitious templates) could still
 * carry a standalone `type: 'list'` block — that block type was removed in favor of
 * authoring real bulleted/numbered lists directly inside a paragraph block's rich
 * text (Tiptap's BulletList/OrderedList). Converts any surviving legacy list block
 * into an equivalent paragraph block with literal `* item` / `1. item` lines, which
 * round-trip through readme.txt identically to how the old list block used to.
 */
export function migrateLegacyListBlocks(project: ReadmeProject): ReadmeProject {
  let changed = false;
  const sections = project.sections.map((s) => {
    if (s.kind !== 'description' && s.kind !== 'installation') return s;
    const blocks = s.blocks.map((b) => {
      const raw = b as unknown as { id: string; type: string; data: { style?: 'bulleted' | 'numbered'; items?: ListItem[] } };
      if (raw.type !== 'list') return b;
      changed = true;
      return { id: raw.id, type: 'paragraph', data: { text: listItemsToText(raw.data.style || 'bulleted', raw.data.items || []) } } satisfies ParagraphBlock;
    });
    return { ...s, blocks };
  });
  return changed ? { ...project, sections } : project;
}

// ───────────────────────────── sections ─────────────────────────────

export type SectionKind = 'description' | 'installation' | 'screenshots' | 'faq' | 'changelog' | 'upgradeNotice';

export const STANDARD_KINDS: SectionKind[] = ['description', 'installation', 'screenshots', 'faq', 'changelog', 'upgradeNotice'];

export const SECTION_TITLES: Record<SectionKind, string> = {
  description: 'Description',
  installation: 'Installation',
  screenshots: 'Screenshots',
  faq: 'Frequently Asked Questions',
  changelog: 'Changelog',
  upgradeNotice: 'Upgrade Notice',
};

export interface Screenshot { id: string; description: string; filename: string; }
export interface FAQ { id: string; question: string; answer: string; }
export interface ChangelogVersion { id: string; version: string; description: string; }
export interface UpgradeNotice { id: string; version: string; description: string; }

export interface GenericSection { id: string; kind: 'description' | 'installation'; title: string; enabled: boolean; blocks: Block[]; }
export interface ScreenshotsSection { id: string; kind: 'screenshots'; title: string; enabled: boolean; screenshots: Screenshot[]; }
export interface FAQSection { id: string; kind: 'faq'; title: string; enabled: boolean; faqs: FAQ[]; }
export interface ChangelogSection { id: string; kind: 'changelog'; title: string; enabled: boolean; versions: ChangelogVersion[]; }
export interface UpgradeNoticeSection { id: string; kind: 'upgradeNotice'; title: string; enabled: boolean; notices: UpgradeNotice[]; }

export type Section = GenericSection | ScreenshotsSection | FAQSection | ChangelogSection | UpgradeNoticeSection;

export function makeSection(kind: SectionKind): Section {
  const id = uid('sec');
  const title = SECTION_TITLES[kind];
  if (kind === 'faq') return { id, kind, title, enabled: true, faqs: [] };
  if (kind === 'screenshots') return { id, kind, title, enabled: true, screenshots: [] };
  if (kind === 'changelog') return { id, kind, title, enabled: true, versions: [] };
  if (kind === 'upgradeNotice') return { id, kind, title, enabled: true, notices: [] };
  return { id, kind, title, enabled: true, blocks: [] };
}

// ───────────────────────────── project ─────────────────────────────

export interface CustomMeta { id: string; name: string; value: string; }

export interface ProjectMeta {
  contributors: string[];
  donateLink: string;
  tags: string[];
  requiresAtLeast: string;
  testedUpTo: string;
  requiresPHP: string;
  stableTag: string;
  license: string;
  licenseURI: string;
  custom: CustomMeta[];
  shortDescription: string;
}

export interface ReadmeProject {
  name: string;
  meta: ProjectMeta;
  sections: Section[];
}

export interface ProjectFile {
  schemaVersion: 1;
  data: ReadmeProject;
}

function deepClone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v));
}

function emptyMeta(): ProjectMeta {
  return {
    contributors: [], donateLink: '', tags: [], requiresAtLeast: '', testedUpTo: '', requiresPHP: '',
    stableTag: '', license: 'GPLv2 or later', licenseURI: 'https://www.gnu.org/licenses/gpl-2.0.html',
    custom: [], shortDescription: '',
  };
}

export function makeTemplateProject(kind: 'empty' | 'basic' | 'woocommerce' | 'gutenberg' | 'utility'): ReadmeProject {
  if (kind === 'empty') {
    return { name: '', meta: emptyMeta(), sections: STANDARD_KINDS.map((k) => makeSection(k)) };
  }
  const cfg = TEMPLATE_CONFIGS[kind] || TEMPLATE_CONFIGS.basic;
  return fictitiousProject(cfg);
}

interface TemplateConfig {
  name: string;
  contributors: string[];
  tags: string[];
  shortDescription: string;
  description: string;
  features: string[];
  installSteps: string[];
  screenshots: string[];
  faqs: { q: string; a: string }[];
}

function fictitiousProject(cfg: TemplateConfig): ReadmeProject {
  return {
    name: cfg.name,
    meta: {
      contributors: cfg.contributors, donateLink: '', tags: cfg.tags,
      requiresAtLeast: '6.3', testedUpTo: '6.7', requiresPHP: '7.4',
      stableTag: '1.0.0', license: 'GPLv2 or later', licenseURI: 'https://www.gnu.org/licenses/gpl-2.0.html', custom: [],
      shortDescription: cfg.shortDescription,
    },
    sections: [
      {
        id: uid('sec'), kind: 'description', title: 'Description', enabled: true,
        blocks: [
          { id: uid('blk'), type: 'paragraph', data: { text: cfg.description } },
          { id: uid('blk'), type: 'subheading', data: { text: 'Key features' } },
          { id: uid('blk'), type: 'paragraph', data: { text: listItemsToText('bulleted', cfg.features.map((f) => ({ id: uid('li'), value: f }))) } },
        ],
      },
      {
        id: uid('sec'), kind: 'installation', title: 'Installation', enabled: true,
        blocks: [{ id: uid('blk'), type: 'paragraph', data: { text: listItemsToText('numbered', cfg.installSteps.map((s) => ({ id: uid('li'), value: s }))) } }],
      },
      { id: uid('sec'), kind: 'screenshots', title: 'Screenshots', enabled: true, screenshots: cfg.screenshots.map((d) => ({ id: uid('shot'), description: d, filename: '' })) },
      { id: uid('sec'), kind: 'faq', title: 'Frequently Asked Questions', enabled: true, faqs: cfg.faqs.map((f) => ({ id: uid('faq'), question: f.q, answer: f.a })) },
      { id: uid('sec'), kind: 'changelog', title: 'Changelog', enabled: true, versions: [{ id: uid('ver'), version: '1.0.0', description: '* Initial release.' }] },
      { id: uid('sec'), kind: 'upgradeNotice', title: 'Upgrade Notice', enabled: true, notices: [] },
    ],
  };
}

const TEMPLATE_CONFIGS: Record<'basic' | 'woocommerce' | 'gutenberg' | 'utility', TemplateConfig> = {
  basic: {
    name: 'Simple Notice Bar', contributors: ['pluginauthor'], tags: ['notice', 'banner', 'admin'],
    shortDescription: 'Display a dismissible announcement bar anywhere on your site.',
    description: 'Simple Notice Bar lets you add a clean, dismissible announcement banner to your site in seconds — no code required.',
    features: ['**Dismissible banner:** Visitors can close the notice; their choice is remembered.', '**Custom colors:** Match the banner to your brand.', '**Scheduling:** Show the notice only between chosen dates.'],
    installSteps: ['Upload the plugin files to /wp-content/plugins/simple-notice-bar.', 'Activate the plugin through the Plugins screen in WordPress.', 'Configure your notice under Settings > Notice Bar.'],
    screenshots: ['Notice bar settings screen.', 'Notice bar shown on the front end.'],
    faqs: [{ q: 'Can I show different notices on different pages?', a: 'Yes, you can target notices to specific pages or show them site-wide.' }, { q: 'Does this slow down my site?', a: 'No, the plugin loads a small stylesheet and script only when a notice is active.' }],
  },
  woocommerce: {
    name: 'Cart Upsell Prompts for WooCommerce', contributors: ['shopdev'], tags: ['woocommerce', 'upsell', 'cart'],
    shortDescription: 'Suggest relevant add-ons to shoppers right in the WooCommerce cart.',
    description: 'Cart Upsell Prompts adds smart, rule-based product suggestions to the WooCommerce cart page to help increase average order value.',
    features: ['**Rule-based suggestions:** Show add-ons based on cart contents.', '**One-click add to cart:** Shoppers add suggestions without leaving the cart.', '**HPOS compatible:** Works with WooCommerce high-performance order storage.'],
    installSteps: ['Upload the plugin files to /wp-content/plugins/cart-upsell-prompts-for-woocommerce.', 'Activate the plugin through the Plugins screen in WordPress.', 'Set up upsell rules under WooCommerce > Upsell Prompts.'],
    screenshots: ['Upsell rule builder.', 'Suggested products on the cart page.'],
    faqs: [{ q: 'Does this require WooCommerce?', a: 'Yes, WooCommerce must be installed and active.' }, { q: 'Can I limit suggestions to certain product categories?', a: 'Yes, rules can be scoped to specific categories, tags, or individual products.' }],
  },
  gutenberg: {
    name: 'Testimonial Carousel Block', contributors: ['blockmaker'], tags: ['block', 'gutenberg', 'testimonial'],
    shortDescription: 'A Gutenberg block for displaying rotating customer testimonials.',
    description: 'Testimonial Carousel Block adds a native block editor block for showcasing customer quotes in a lightweight, swipeable carousel.',
    features: ['**Native block editor UI:** Add and reorder testimonials without shortcodes.', '**Autoplay control:** Choose whether the carousel advances automatically.', '**Accessible markup:** Keyboard and screen-reader friendly navigation.'],
    installSteps: ['Upload the plugin files to /wp-content/plugins/testimonial-carousel-block.', 'Activate the plugin through the Plugins screen in WordPress.', 'Add the "Testimonial Carousel" block from the block inserter.'],
    screenshots: ['Testimonial Carousel block in the editor.', 'Carousel displayed on the front end.'],
    faqs: [{ q: 'Does this work with any theme?', a: 'Yes, the block uses standard WordPress block markup and inherits your theme’s typography.' }, { q: 'Can I add images to each testimonial?', a: 'Yes, each testimonial slide supports an optional avatar image.' }],
  },
  utility: {
    name: 'Scheduled Maintenance Mode', contributors: ['sitetools'], tags: ['maintenance', 'utility', 'admin'],
    shortDescription: 'Put your site into maintenance mode automatically on a schedule.',
    description: 'Scheduled Maintenance Mode lets you plan maintenance windows in advance, automatically showing visitors a friendly holding page during the scheduled time.',
    features: ['**Scheduled windows:** Set a start and end time for maintenance mode.', '**Custom holding page:** Edit the message shown to visitors.', '**Admin bypass:** Logged-in administrators can still browse the site normally.'],
    installSteps: ['Upload the plugin files to /wp-content/plugins/scheduled-maintenance-mode.', 'Activate the plugin through the Plugins screen in WordPress.', 'Set your maintenance window under Settings > Maintenance Mode.'],
    screenshots: ['Maintenance window scheduler.', 'Holding page shown to visitors.'],
    faqs: [{ q: 'Can search engines still crawl my site during maintenance?', a: 'No, the plugin returns a 503 status code to discourage indexing while active.' }, { q: 'Will I be logged out during maintenance?', a: 'No, logged-in administrators can browse the site as usual.' }],
  },
};

export function seedProject(): ReadmeProject {
  return {
    name: 'Bundle Builder for WooCommerce',
    meta: {
      contributors: ['janedev', 'acmeplugins'], donateLink: 'https://example.com/donate',
      tags: ['woocommerce', 'bundles', 'products', 'upsell'],
      requiresAtLeast: '6.4', testedUpTo: '6.7', requiresPHP: '7.4',
      stableTag: '1.1.0', license: 'GPLv2 or later', licenseURI: 'https://www.gnu.org/licenses/gpl-2.0.html', custom: [],
      shortDescription: 'Create flexible, high-converting product bundles with per-item pricing rules, quantity discounts, and a drag-and-drop builder your merchandising team will actually enjoy using every day.',
    },
    sections: [
      {
        id: uid('sec'), kind: 'description', title: 'Description', enabled: true,
        blocks: [
          { id: uid('blk'), type: 'paragraph', data: { text: 'Bundle Builder lets store owners assemble flexible product bundles with per-item pricing rules, quantity breaks, and conditional logic — all from a visual, drag-and-drop interface inside WooCommerce.' } },
          { id: uid('blk'), type: 'subheading', data: { text: 'Key features' } },
          {
            id: uid('blk'), type: 'paragraph', data: {
              text: listItemsToText('bulleted', [
                { id: uid('li'), value: '**Flexible pricing:** Set fixed, percentage, or tiered discounts per bundle.' },
                { id: uid('li'), value: '**Drag-and-drop builder:** Assemble bundles visually without touching code.' },
                { id: uid('li'), value: '**Quantity breaks:** Reward larger orders with automatic discount tiers.' },
              ]),
            },
          },
        ],
      },
      {
        id: uid('sec'), kind: 'installation', title: 'Installation', enabled: true,
        blocks: [
          {
            id: uid('blk'), type: 'paragraph', data: {
              text: listItemsToText('numbered', [
                { id: uid('li'), value: 'Upload the plugin files to /wp-content/plugins/bundle-builder-for-woocommerce.' },
                { id: uid('li'), value: 'Activate the plugin through the Plugins screen in WordPress.' },
                { id: uid('li'), value: 'Configure bundle rules under WooCommerce > Bundles.' },
              ]),
            },
          },
        ],
      },
      {
        id: uid('sec'), kind: 'screenshots', title: 'Screenshots', enabled: true,
        screenshots: [
          { id: uid('shot'), description: 'Plugin settings screen.', filename: '' },
          { id: uid('shot'), description: 'Bundle configuration interface.', filename: '' },
          { id: uid('shot'), description: 'Bundle displayed on the product page.', filename: '' },
        ],
      },
      {
        id: uid('sec'), kind: 'faq', title: 'Frequently Asked Questions', enabled: true,
        faqs: [
          { id: uid('faq'), question: 'Does the plugin support WooCommerce HPOS?', answer: 'Yes, HPOS is fully supported.' },
          { id: uid('faq'), question: 'Can I limit a bundle to specific products?', answer: 'Yes, bundles can be restricted to categories, tags, or individual products.' },
          { id: uid('faq'), question: 'Does this work with variable products?', answer: 'Yes, variable products and their variations can be added to any bundle.' },
        ],
      },
      {
        id: uid('sec'), kind: 'changelog', title: 'Changelog', enabled: true,
        versions: [
          { id: uid('ver'), version: '1.2.0', description: '* Added support for custom products.\n* Fixed bundle settings not being saved.' },
          { id: uid('ver'), version: '1.1.0', description: '* Added quantity break discount tiers.\n* Improved performance on bundle pages with 20+ products.' },
        ],
      },
      {
        id: uid('sec'), kind: 'upgradeNotice', title: 'Upgrade Notice', enabled: true,
        notices: [{ id: uid('notice'), version: '1.2.0', description: 'This release changes the plugin data structure. Back up before upgrading.' }],
      },
    ],
  };
}

/** Initial state for a fresh editor session (mirrors the design prototype's default project). */
export function freshProject(): ReadmeProject {
  return seedProject();
}

// ───────────────────────────── migration / import safety ─────────────────────────────

function asString(v: unknown): string {
  return typeof v === 'string' ? v : '';
}
function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

/** Normalises an arbitrary (possibly stale or hand-authored) project object into our current schema. */
export function migrateProject(input: unknown): ReadmeProject {
  const raw = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const rawMeta = (raw.meta && typeof raw.meta === 'object' ? raw.meta : {}) as Record<string, unknown>;

  const meta: ProjectMeta = {
    contributors: asStringArray(rawMeta.contributors),
    donateLink: asString(rawMeta.donateLink),
    tags: asStringArray(rawMeta.tags),
    requiresAtLeast: asString(rawMeta.requiresAtLeast),
    testedUpTo: asString(rawMeta.testedUpTo),
    requiresPHP: asString(rawMeta.requiresPHP),
    stableTag: asString(rawMeta.stableTag),
    license: asString(rawMeta.license),
    licenseURI: asString(rawMeta.licenseURI),
    shortDescription: asString(rawMeta.shortDescription),
    custom: Array.isArray(rawMeta.custom)
      ? (rawMeta.custom as unknown[]).map((c) => {
          const co = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
          return { id: asString(co.id) || uid('cm'), name: asString(co.name), value: asString(co.value) };
        })
      : [],
  };

  const byKind: Partial<Record<SectionKind, Section>> = {};
  const rawSections = Array.isArray(raw.sections) ? raw.sections : [];
  rawSections.forEach((secRaw) => {
    const sec = (secRaw && typeof secRaw === 'object' ? secRaw : {}) as Record<string, unknown>;
    const kind = sec.kind as SectionKind;
    if (!STANDARD_KINDS.includes(kind)) return;
    const id = asString(sec.id) || uid('sec');
    const title = asString(sec.title) || SECTION_TITLES[kind];
    const enabled = sec.enabled !== false;

    if (kind === 'faq') {
      const faqs = Array.isArray(sec.faqs)
        ? (sec.faqs as unknown[]).map((f) => {
            const fo = (f && typeof f === 'object' ? f : {}) as Record<string, unknown>;
            return { id: asString(fo.id) || uid('faq'), question: asString(fo.question), answer: asString(fo.answer) };
          })
        : [];
      byKind[kind] = { id, kind, title, enabled, faqs };
    } else if (kind === 'screenshots') {
      const screenshots = Array.isArray(sec.screenshots)
        ? (sec.screenshots as unknown[]).map((sh) => {
            const so = (sh && typeof sh === 'object' ? sh : {}) as Record<string, unknown>;
            return { id: asString(so.id) || uid('shot'), description: asString(so.description), filename: asString(so.filename) };
          })
        : [];
      byKind[kind] = { id, kind, title, enabled, screenshots };
    } else if (kind === 'changelog') {
      const versions = Array.isArray(sec.versions)
        ? (sec.versions as unknown[]).map((v) => {
            const vo = (v && typeof v === 'object' ? v : {}) as Record<string, unknown>;
            let description = asString(vo.description);
            if (vo.description === undefined && Array.isArray(vo.changes)) {
              description = (vo.changes as unknown[])
                .map((c) => {
                  const co = (c && typeof c === 'object' ? c : {}) as Record<string, unknown>;
                  return `${asString(co.type)} ${asString(co.text)}`.trim();
                })
                .filter(Boolean)
                .join('\n');
            }
            return { id: asString(vo.id) || uid('ver'), version: asString(vo.version), description };
          })
        : [];
      byKind[kind] = { id, kind, title, enabled, versions };
    } else if (kind === 'upgradeNotice') {
      const notices = Array.isArray(sec.notices)
        ? (sec.notices as unknown[]).map((n) => {
            const no = (n && typeof n === 'object' ? n : {}) as Record<string, unknown>;
            return { id: asString(no.id) || uid('notice'), version: asString(no.version), description: asString(no.description) };
          })
        : [];
      byKind[kind] = { id, kind, title, enabled, notices };
    } else {
      const rawBlocks = Array.isArray(sec.blocks) ? (sec.blocks as unknown[]) : [];
      const blocks: Block[] = [];
      rawBlocks.forEach((b) => {
        const bo = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
        const data = (bo.data && typeof bo.data === 'object' ? bo.data : {}) as Record<string, unknown>;
        const bid = asString(bo.id) || uid('blk');
        const btype = bo.type as string;
        if (btype === 'bulletList') {
          blocks.push({ id: bid, type: 'paragraph', data: { text: listItemsToText('bulleted', normalizeItems(data.items)) } });
        } else if (btype === 'numberedList') {
          blocks.push({ id: bid, type: 'paragraph', data: { text: listItemsToText('numbered', normalizeItems(data.items)) } });
        } else if (btype === 'featureList') {
          const items = Array.isArray(data.items) ? (data.items as unknown[]) : [];
          const listItems: ListItem[] = items.map((it) => {
            const io = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
            const title = asString(io.title);
            const desc = asString(io.desc);
            return { id: asString(io.id) || uid('li'), value: title ? `**${title}:** ${desc}` : desc };
          });
          blocks.push({ id: bid, type: 'paragraph', data: { text: listItemsToText('bulleted', listItems) } });
        } else if (btype === 'link') {
          const label = asString(data.label);
          const url = asString(data.url);
          blocks.push({ id: bid, type: 'paragraph', data: { text: label && url ? `[${label}](${url})` : url } });
        } else if (btype === 'paragraph' || btype === 'subheading' || btype === 'blockquote' || btype === 'code') {
          blocks.push({ id: bid, type: btype, data: { text: asString(data.text) } });
        } else if (btype === 'video') {
          blocks.push({ id: bid, type: 'video', data: { url: asString(data.url) } });
        } else if (btype === 'list') {
          const style = data.style === 'numbered' ? 'numbered' : 'bulleted';
          blocks.push({ id: bid, type: 'paragraph', data: { text: listItemsToText(style, normalizeItems(data.items)) } });
        }
      });
      byKind[kind] = { id, kind: kind as 'description' | 'installation', title, enabled, blocks };
    }
  });

  return {
    name: asString(raw.name),
    meta,
    sections: STANDARD_KINDS.map((k) => byKind[k] || makeSection(k)),
  };
}

function normalizeItems(v: unknown): ListItem[] {
  if (!Array.isArray(v)) return [];
  return v.map((it) => {
    const io = (it && typeof it === 'object' ? it : {}) as Record<string, unknown>;
    return { id: asString(io.id) || uid('li'), value: asString(io.value) };
  });
}

export function parseProjectFile(text: string): ReadmeProject {
  const wrapper = JSON.parse(text) as { data?: unknown } | unknown;
  const data = wrapper && typeof wrapper === 'object' && 'data' in wrapper ? (wrapper as { data: unknown }).data : wrapper;
  return migrateProject(data);
}

export function serializeProjectFile(project: ReadmeProject): string {
  const wrapper: ProjectFile = { schemaVersion: 1, data: project };
  return JSON.stringify(wrapper, null, 2);
}

// ───────────────────────────── rich text tokenizer ─────────────────────────────

export type InlineToken =
  | { kind: 'text'; value: string }
  | { kind: 'bold'; value: string }
  | { kind: 'italic'; value: string }
  | { kind: 'code'; value: string }
  | { kind: 'link'; value: string; href: string; title?: string };

export type LineToken = InlineToken | { kind: 'break' };

const INLINE_RE = /(\*\*(.+?)\*\*)|(\*(.+?)\*)|(`(.+?)`)|(\[(.+?)\]\(\s*(\S+?)(?:\s+"(.*?)")?\s*\))/g;

export function tokenizeInline(text: string): InlineToken[] {
  if (!text) return [];
  const tokens: InlineToken[] = [];
  let last = 0;
  INLINE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = INLINE_RE.exec(text)) !== null) {
    if (m.index > last) tokens.push({ kind: 'text', value: text.slice(last, m.index) });
    if (m[1]) tokens.push({ kind: 'bold', value: m[2] });
    else if (m[3]) tokens.push({ kind: 'italic', value: m[4] });
    else if (m[5]) tokens.push({ kind: 'code', value: m[6] });
    else if (m[7]) tokens.push({ kind: 'link', value: m[8], href: m[9], title: m[10] || undefined });
    last = INLINE_RE.lastIndex;
  }
  if (last < text.length) tokens.push({ kind: 'text', value: text.slice(last) });
  return tokens.length ? tokens : [{ kind: 'text', value: text }];
}

export function tokenizeMultiline(text: string): LineToken[] {
  if (!text) return [];
  const out: LineToken[] = [];
  text.split('\n').forEach((line, i) => {
    if (i > 0) out.push({ kind: 'break' });
    tokenizeInline(line).forEach((t) => out.push(t));
  });
  return out;
}

export function escapeHtml(s: string): string {
  return (s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Markdown-ish source text -> HTML, used to seed a contentEditable div. */
export function mdToHtml(text: string): string {
  if (!text) return '';
  return text
    .split('\n')
    .map((line) =>
      tokenizeInline(line)
        .map((t) => {
          const esc = escapeHtml(t.value);
          if (t.kind === 'bold') return `<strong>${esc}</strong>`;
          if (t.kind === 'italic') return `<em>${esc}</em>`;
          if (t.kind === 'code') return `<code>${esc}</code>`;
          if (t.kind === 'link') return `<a href="${escapeHtml(t.href)}">${esc}</a>`;
          return esc;
        })
        .join('')
    )
    .join('<br>');
}

/** Walks a contentEditable div's DOM back into our markdown-ish source text. */
export function htmlToMarkdown(el: HTMLElement): string {
  function walk(node: Node): string {
    if (node.nodeType === 3) return node.textContent || '';
    if (node.nodeType !== 1) return '';
    const element = node as HTMLElement;
    const tag = element.tagName.toLowerCase();
    const inner = () => Array.from(element.childNodes).map(walk).join('');
    if (tag === 'br') return '\n';
    if (tag === 'div' || tag === 'p') return inner() + '\n';
    if (tag === 'strong' || tag === 'b') return `**${inner()}**`;
    if (tag === 'em' || tag === 'i') return `*${inner()}*`;
    if (tag === 'code') return `\`${inner()}\``;
    if (tag === 'a') return `[${inner()}](${element.getAttribute('href') || ''})`;
    return inner();
  }
  return Array.from(el.childNodes)
    .map(walk)
    .join('')
    .replace(/\n+$/, '');
}

export interface VideoInfo {
  kind: 'youtube' | 'vimeo' | 'other' | 'none';
  embedUrl?: string;
}

export function parseVideoEmbed(url: string): VideoInfo {
  if (!url) return { kind: 'none' };
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{6,})/i);
  if (yt) return { kind: 'youtube', embedUrl: `https://www.youtube.com/embed/${yt[1]}` };
  const vm = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  if (vm) return { kind: 'vimeo', embedUrl: `https://player.vimeo.com/video/${vm[1]}` };
  return { kind: 'other' };
}

// ───────────────────────────── listing preview mapping ─────────────────────────────

export type PreviewBlock =
  | { kind: 'subheading'; text: string }
  | { kind: 'paragraph'; tokens: LineToken[] }
  | { kind: 'blockquote'; tokens: LineToken[] }
  | { kind: 'code'; text: string }
  | { kind: 'video'; embedUrl: string }
  | { kind: 'video-link'; url: string }
  | { kind: 'list'; ordered: boolean; items: InlineToken[][] };

/**
 * Splits a markdown-ish text blob into paragraph-runs and list-runs by scanning
 * `* item` / `1. item` line prefixes — the same convention `parseGenericBody` uses
 * when importing readme.txt. Lets a single rich-text block (one Tiptap document)
 * mix prose and real bulleted/numbered lists, matching what the editor renders.
 */
export function segmentText(text: string): PreviewBlock[] {
  if (!text) return [];
  const isListLine = (l: string) => /^\*\s+/.test(l) || /^\d+\.\s+/.test(l);
  const lines = text.split('\n');
  const out: PreviewBlock[] = [];
  let i = 0;
  while (i < lines.length) {
    if (isListLine(lines[i])) {
      const ordered = /^\d+\.\s+/.test(lines[i]);
      const re = ordered ? /^\d+\.\s+/ : /^\*\s+/;
      const items: InlineToken[][] = [];
      while (i < lines.length && isListLine(lines[i]) && /^\d+\.\s+/.test(lines[i]) === ordered) {
        items.push(tokenizeInline(lines[i].replace(re, '')));
        i++;
      }
      out.push({ kind: 'list', ordered, items });
      continue;
    }
    const tokens: LineToken[] = [];
    let first = true;
    while (i < lines.length && !isListLine(lines[i])) {
      if (!first) tokens.push({ kind: 'break' });
      first = false;
      tokenizeInline(lines[i]).forEach((t) => tokens.push(t));
      i++;
    }
    out.push({ kind: 'paragraph', tokens });
  }
  return out;
}

export function mapPreviewBlocks(blocks: Block[]): PreviewBlock[] {
  const out: PreviewBlock[] = [];
  blocks.forEach((b) => {
    if (b.type === 'subheading') {
      if (b.data.text) out.push({ kind: 'subheading', text: b.data.text });
    } else if (b.type === 'paragraph') {
      if (b.data.text) out.push(...segmentText(b.data.text));
    } else if (b.type === 'blockquote') {
      if (b.data.text) out.push({ kind: 'blockquote', tokens: tokenizeMultiline(b.data.text) });
    } else if (b.type === 'code') {
      if (b.data.text) out.push({ kind: 'code', text: b.data.text });
    } else if (b.type === 'video') {
      if (b.data.url) {
        const info = parseVideoEmbed(b.data.url);
        if ((info.kind === 'youtube' || info.kind === 'vimeo') && info.embedUrl) out.push({ kind: 'video', embedUrl: info.embedUrl });
        else out.push({ kind: 'video-link', url: b.data.url });
      }
    }
  });
  return out;
}

// ───────────────────────────── readme.txt serialization ─────────────────────────────

export function blockToText(b: Block): string {
  switch (b.type) {
    case 'paragraph':
      return b.data.text || '';
    case 'subheading':
      return b.data.text ? `= ${b.data.text} =` : '';
    case 'blockquote':
      return b.data.text ? b.data.text.split('\n').map((l) => `> ${l}`).join('\n') : '';
    case 'code':
      return b.data.text ? b.data.text.split('\n').map((l) => `    ${l}`).join('\n') : '';
    case 'video':
      return b.data.url || '';
    default:
      return '';
  }
}

function sectionBody(s: Section): string {
  if (s.kind === 'description' || s.kind === 'installation') {
    return s.blocks.map(blockToText).filter(Boolean).join('\n\n');
  }
  if (s.kind === 'faq') return s.faqs.map((f) => `= ${f.question || ''} =\n\n${f.answer || ''}`).join('\n\n');
  if (s.kind === 'screenshots') return s.screenshots.map((sh, i) => `${i + 1}. ${sh.description || ''}`).join('\n');
  if (s.kind === 'changelog') {
    return s.versions.map((v) => (v.description ? `= ${v.version} =\n\n${v.description}` : `= ${v.version} =`)).join('\n\n');
  }
  if (s.kind === 'upgradeNotice') {
    return s.notices.map((n) => (n.description ? `= ${n.version} =\n\n${n.description}` : `= ${n.version} =`)).join('\n\n');
  }
  return '';
}

/** Serializes the project to a WordPress.org-format readme.txt string. */
export function serializeReadme(project: ReadmeProject): string {
  const chunks: string[] = [];
  chunks.push(`=== ${project.name || ''} ===`);
  const m = project.meta;
  const metaLines: string[] = [];
  if (m.contributors.length) metaLines.push(`Contributors: ${m.contributors.join(', ')}`);
  if (m.donateLink) metaLines.push(`Donate link: ${m.donateLink}`);
  if (m.tags.length) metaLines.push(`Tags: ${m.tags.join(', ')}`);
  if (m.requiresAtLeast) metaLines.push(`Requires at least: ${m.requiresAtLeast}`);
  if (m.testedUpTo) metaLines.push(`Tested up to: ${m.testedUpTo}`);
  if (m.requiresPHP) metaLines.push(`Requires PHP: ${m.requiresPHP}`);
  if (m.stableTag) metaLines.push(`Stable tag: ${m.stableTag}`);
  if (m.license) metaLines.push(`License: ${m.license}`);
  if (m.licenseURI) metaLines.push(`License URI: ${m.licenseURI}`);
  m.custom.forEach((c) => {
    if (c.name && c.name.trim()) metaLines.push(`${c.name.trim()}: ${c.value || ''}`);
  });
  if (metaLines.length) chunks[0] += '\n' + metaLines.join('\n');
  if (m.shortDescription) chunks.push(m.shortDescription.trim());
  project.sections
    .filter((s) => s.enabled)
    .forEach((s) => {
      const title = SECTION_TITLES[s.kind] || s.title;
      const body = sectionBody(s);
      chunks.push(body ? `== ${title} ==\n\n${body}` : `== ${title} ==`);
    });
  return chunks
    .filter(Boolean)
    .join('\n\n')
    .replace(/[ \t]+\n/g, '\n')
    .trim() + '\n';
}

// ───────────────────────────── readme.txt parsing ─────────────────────────────

function parseVersionedEntries(body: string): { version: string; description: string }[] {
  if (!body) return [];
  const lines = body.split('\n');
  const entries: { version: string; bodyLines: string[] }[] = [];
  let current: { version: string; bodyLines: string[] } | null = null;
  lines.forEach((line) => {
    const m = line.match(/^=\s*(.+?)\s*=\s*$/);
    if (m) {
      current = { version: m[1], bodyLines: [] };
      entries.push(current);
    } else if (current) {
      if (line.trim() || current.bodyLines.length) current.bodyLines.push(line);
    }
  });
  return entries.map((e) => {
    while (e.bodyLines.length && !e.bodyLines[0].trim()) e.bodyLines.shift();
    while (e.bodyLines.length && !e.bodyLines[e.bodyLines.length - 1].trim()) e.bodyLines.pop();
    return { version: e.version, description: e.bodyLines.join('\n') };
  });
}

function parseGenericBody(body: string): Block[] {
  if (!body) return [];
  const lines = body.split('\n');
  const blocks: Block[] = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) {
      i++;
      continue;
    }
    let m: RegExpMatchArray | null;
    if ((m = line.match(/^=\s*(.+?)\s*=$/))) {
      blocks.push({ id: uid('blk'), type: 'subheading', data: { text: m[1] } });
      i++;
      continue;
    }
    if (/^ {4}\S/.test(line)) {
      const codeLines: string[] = [];
      while (i < lines.length && (/^ {4}/.test(lines[i]) || !lines[i].trim())) {
        codeLines.push(lines[i].replace(/^ {4}/, ''));
        i++;
      }
      while (codeLines.length && !codeLines[codeLines.length - 1].trim()) codeLines.pop();
      blocks.push({ id: uid('blk'), type: 'code', data: { text: codeLines.join('\n') } });
      continue;
    }
    if (/^>\s?/.test(line)) {
      const qLines: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        qLines.push(lines[i].replace(/^>\s?/, ''));
        i++;
      }
      blocks.push({ id: uid('blk'), type: 'blockquote', data: { text: qLines.join('\n') } });
      continue;
    }
    if (/^https?:\/\/\S+$/.test(line.trim()) && parseVideoEmbed(line.trim()).kind !== 'other') {
      blocks.push({ id: uid('blk'), type: 'video', data: { url: line.trim() } });
      i++;
      continue;
    }
    // A paragraph run may freely mix prose lines and `* `/`1. ` list lines — sub-runs
    // of each kind are grouped internally (prose space-joined like a wrapped
    // paragraph, list lines newline-preserved as separate items) so "Intro text\n*
    // item one\n* item two\nMore text" becomes one block a rich editor renders as
    // paragraph + real list + paragraph, and list authoring lives in the editor
    // (Tiptap's bullet/numbered list) rather than a separate block type.
    const pLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() &&
      !/^=\s*(.+?)\s*=$/.test(lines[i]) &&
      !/^>\s?/.test(lines[i]) &&
      !/^ {4}\S/.test(lines[i])
    ) {
      pLines.push(lines[i]);
      i++;
    }
    const isListLine = (l: string) => /^\*\s+/.test(l) || /^\d+\.\s+/.test(l);
    const parts: string[] = [];
    let buf: string[] = [];
    let bufIsList = false;
    const flush = () => {
      if (!buf.length) return;
      parts.push(bufIsList ? buf.join('\n') : buf.join(' '));
      buf = [];
    };
    pLines.forEach((l) => {
      const listLine = isListLine(l);
      if (buf.length && listLine !== bufIsList) flush();
      bufIsList = listLine;
      buf.push(l);
    });
    flush();
    blocks.push({ id: uid('blk'), type: 'paragraph', data: { text: parts.join('\n').trim() } });
  }
  return blocks;
}

export interface ParsedReadme {
  project: ReadmeProject;
  unparsed: string[];
}

const METALINE_MAP: Record<string, keyof ProjectMeta> = {
  Contributors: 'contributors', 'Donate link': 'donateLink', Tags: 'tags',
  'Requires at least': 'requiresAtLeast', 'Tested up to': 'testedUpTo', 'Requires PHP': 'requiresPHP',
  'Stable tag': 'stableTag', License: 'license', 'License URI': 'licenseURI',
};

/** Parses a WordPress.org readme.txt file back into our project schema. */
export function parseReadmeText(text: string): ParsedReadme {
  const project = makeTemplateProject('empty');
  const unparsed: string[] = [];
  const headerMatch = text.match(/^===\s*(.+?)\s*===/m);
  if (headerMatch) project.name = headerMatch[1];
  const lines = text.split('\n');
  let i = headerMatch ? lines.findIndex((l) => l.includes('===')) + 1 : 0;
  const shortDescLines: string[] = [];
  for (; i < lines.length; i++) {
    const line = lines[i];
    if (/^==\s/.test(line)) break;
    const m = line.match(/^([A-Za-z][A-Za-z0-9 ]*):\s*(.*)$/);
    if (m && METALINE_MAP[m[1].trim()]) {
      const key = METALINE_MAP[m[1].trim()];
      if (key === 'contributors' || key === 'tags') {
        (project.meta[key] as string[]) = m[2].split(',').map((s) => s.trim()).filter(Boolean);
      } else {
        (project.meta[key] as string) = m[2].trim();
      }
    } else if (m) {
      project.meta.custom.push({ id: uid('cm'), name: m[1].trim(), value: m[2].trim() });
    } else if (line.trim()) {
      shortDescLines.push(line.trim());
    }
  }
  project.meta.shortDescription = shortDescLines.join(' ').trim();

  // Scan for `== Section ==` headers only *after* the `=== Plugin Name ===` line — the
  // three-equals header line would otherwise also satisfy this two-equals pattern (its
  // outer "=" characters left over from the capture) and show up as a bogus "unparsed"
  // section wrapping the meta block.
  const sectionRe = /^==\s*(.+?)\s*==$/gm;
  sectionRe.lastIndex = headerMatch ? (headerMatch.index ?? 0) + headerMatch[0].length : 0;
  const secIndices: { title: string; index: number; end: number }[] = [];
  let sm: RegExpExecArray | null;
  while ((sm = sectionRe.exec(text)) !== null) secIndices.push({ title: sm[1], index: sm.index, end: sm.index + sm[0].length });

  const kindByTitle: Record<string, SectionKind> = {};
  (Object.entries(SECTION_TITLES) as [SectionKind, string][]).forEach(([k, v]) => {
    kindByTitle[v.toLowerCase()] = k;
  });

  const parsedByKind: Partial<Record<SectionKind, Section>> = {};
  secIndices.forEach((sec, idx) => {
    const bodyStart = sec.end;
    const bodyEnd = idx + 1 < secIndices.length ? secIndices[idx + 1].index : text.length;
    const body = text.slice(bodyStart, bodyEnd).trim();
    const kind = kindByTitle[sec.title.toLowerCase()];
    if (!kind) {
      unparsed.push(`== ${sec.title} ==\n${body}`);
      return;
    }
    if (kind === 'faq') {
      const faqs = (body ? body.split(/\n\n(?==\s)/) : []).map((chunk) => {
        const qm = chunk.match(/^=\s*(.+?)\s*=\n\n([\s\S]*)$/);
        return { id: uid('faq'), question: qm ? qm[1] : '', answer: qm ? qm[2].trim() : chunk };
      });
      parsedByKind[kind] = { id: uid('sec'), kind, title: sec.title, enabled: true, faqs };
    } else if (kind === 'screenshots') {
      const screenshots = body
        .split('\n')
        .filter(Boolean)
        .map((l) => {
          const m2 = l.match(/^\d+\.\s*(.*)$/);
          return { id: uid('shot'), description: m2 ? m2[1] : l, filename: '' };
        });
      parsedByKind[kind] = { id: uid('sec'), kind, title: sec.title, enabled: true, screenshots };
    } else if (kind === 'changelog') {
      const versions = parseVersionedEntries(body).map((e) => ({ id: uid('ver'), version: e.version, description: e.description }));
      parsedByKind[kind] = { id: uid('sec'), kind, title: sec.title, enabled: true, versions };
    } else if (kind === 'upgradeNotice') {
      const notices = parseVersionedEntries(body).map((e) => ({ id: uid('notice'), version: e.version, description: e.description }));
      parsedByKind[kind] = { id: uid('sec'), kind, title: sec.title, enabled: true, notices };
    } else {
      const blocks = parseGenericBody(body);
      parsedByKind[kind] = { id: uid('sec'), kind: kind as 'description' | 'installation', title: sec.title, enabled: true, blocks };
    }
  });

  project.sections = STANDARD_KINDS.map((k) => parsedByKind[k] || makeSection(k));
  return { project, unparsed };
}

// ───────────────────────────── validation ─────────────────────────────

export type IssueSeverity = 'error' | 'warning' | 'recommendation';

export interface Issue {
  id: string;
  severity: IssueSeverity;
  message: string;
  targetId?: string;
  fixKey?: string;
  latest?: string;
}

function uniqCaseInsensitive(arr: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  arr.forEach((v) => {
    const k = v.toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
  });
  return out;
}

function compareVersions(a: string, b: string): number {
  if (!a || !b) return 0;
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] || 0;
    const y = pb[i] || 0;
    if (x > y) return 1;
    if (x < y) return -1;
  }
  return 0;
}

function sectionHasContent(section: Section): boolean {
  if (section.kind === 'description' || section.kind === 'installation') {
    return section.blocks.some((b) => JSON.stringify(b.data).replace(/["":,{}[\]]/g, '').trim().length > 0);
  }
  return true;
}

function collectAllText(project: ReadmeProject): { text: string; targetId: string }[] {
  const out: { text: string; targetId: string }[] = [];
  out.push({ text: project.meta.shortDescription || '', targetId: 'meta-shortDescription' });
  project.sections.forEach((s) => {
    if (s.kind === 'description' || s.kind === 'installation') {
      s.blocks.forEach((b) => {
        if ('text' in b.data && b.data.text) out.push({ text: b.data.text, targetId: b.id + '-text' });
        if ('url' in b.data && b.data.url) out.push({ text: b.data.url, targetId: b.id + '-url' });
      });
    } else if (s.kind === 'faq') {
      s.faqs.forEach((f) => {
        out.push({ text: f.question || '', targetId: f.id + '-question' });
        out.push({ text: f.answer || '', targetId: f.id + '-answer' });
      });
    } else if (s.kind === 'screenshots') {
      s.screenshots.forEach((sh) => out.push({ text: sh.description || '', targetId: sh.id + '-desc' }));
    } else if (s.kind === 'changelog') {
      s.versions.forEach((v) => out.push({ text: v.description || '', targetId: v.id + '-description' }));
    } else if (s.kind === 'upgradeNotice') {
      s.notices.forEach((n) => out.push({ text: n.description || '', targetId: n.id + '-description' }));
    }
  });
  return out;
}

/** Ported checks from the design source's validateProject — targets the same field ids
 * the editor UI uses so "jump to issue" can find the right control. */
export function validateProject(project: ReadmeProject): Issue[] {
  const issues: Issue[] = [];
  const add = (severity: IssueSeverity, message: string, targetId?: string, fixKey?: string, extra?: { latest?: string }) => {
    issues.push({ id: uid('iss'), severity, message, targetId, fixKey, ...extra });
  };

  if (!project.name || !project.name.trim()) add('error', 'Plugin name is required.', 'meta-name');
  if (!project.meta.shortDescription || !project.meta.shortDescription.trim()) add('error', 'Short description is required.', 'meta-shortDescription');
  else if (project.meta.shortDescription.length > 150) {
    add('warning', `Short description is ${project.meta.shortDescription.length} characters, ${project.meta.shortDescription.length - 150} over the recommended 150.`, 'meta-shortDescription');
  }
  if (!project.meta.stableTag || !project.meta.stableTag.trim()) add('error', 'Stable tag is required.', 'meta-stableTag');
  if (!project.meta.license || !project.meta.license.trim()) add('error', 'License is required.', 'meta-license');

  const tagCounts: Record<string, number> = {};
  project.meta.tags.forEach((t) => {
    const k = t.toLowerCase();
    tagCounts[k] = (tagCounts[k] || 0) + 1;
  });
  if (Object.values(tagCounts).some((c) => c > 1)) add('warning', 'Duplicate tags found.', 'meta-tags', 'dedupeTags');
  const contribCounts: Record<string, number> = {};
  project.meta.contributors.forEach((c) => {
    const k = c.toLowerCase();
    contribCounts[k] = (contribCounts[k] || 0) + 1;
  });
  if (Object.values(contribCounts).some((c) => c > 1)) add('warning', 'Duplicate contributors found.', 'meta-contributors', 'dedupeContributors');

  const descSection = project.sections.find((s) => s.kind === 'description');
  if (!descSection || !descSection.enabled || !sectionHasContent(descSection)) {
    add('error', 'Description section is missing or empty.', descSection ? descSection.id + '-body' : 'meta-name');
  }

  const changelogSection = project.sections.find((s): s is ChangelogSection => s.kind === 'changelog');
  if (changelogSection && changelogSection.versions.length) {
    const latest = changelogSection.versions[0].version;
    if (latest && project.meta.stableTag && latest !== project.meta.stableTag) {
      add('error', `Stable tag "${project.meta.stableTag}" doesn't match the newest changelog version "${latest}".`, 'meta-stableTag', 'syncStableTag', { latest });
    }
  }
  const upgradeSection = project.sections.find((s): s is UpgradeNoticeSection => s.kind === 'upgradeNotice');
  if (upgradeSection && changelogSection) {
    const versions = new Set(changelogSection.versions.map((v) => v.version));
    upgradeSection.notices.forEach((n) => {
      if (n.version && !versions.has(n.version)) add('error', `Upgrade notice references version "${n.version}", which isn't in the changelog.`, n.id + '-version');
    });
  }
  const shotsSection = project.sections.find((s): s is ScreenshotsSection => s.kind === 'screenshots');
  if (shotsSection) {
    shotsSection.screenshots.forEach((s, i) => {
      if (!s.description || !s.description.trim()) add('warning', `Screenshot ${i + 1} has no description.`, s.id + '-desc');
    });
  }

  const faqSection = project.sections.find((s): s is FAQSection => s.kind === 'faq');
  if (faqSection) {
    const qSeen: Record<string, number> = {};
    faqSection.faqs.forEach((f) => {
      if (!f.question || !f.question.trim()) add('error', 'An FAQ question is empty.', f.id + '-question');
      if (!f.answer || !f.answer.trim()) add('error', 'An FAQ answer is empty.', f.id + '-answer');
      const k = (f.question || '').trim().toLowerCase();
      if (k) qSeen[k] = (qSeen[k] || 0) + 1;
    });
    Object.entries(qSeen).forEach(([q, c]) => {
      if (c > 1) add('warning', `Duplicate FAQ question: "${q}".`, faqSection.id + '-body');
    });
  }
  if (compareVersions(project.meta.requiresAtLeast, project.meta.testedUpTo) > 0) {
    add('error', `"Requires at least" (${project.meta.requiresAtLeast}) is higher than "Tested up to" (${project.meta.testedUpTo}).`, 'meta-requiresAtLeast');
  }

  collectAllText(project).forEach(({ text, targetId }) => {
    if (!text) return;
    if (/<\s*(div|script|style|iframe)/i.test(text)) add('error', 'Unsupported HTML tag found (div/script/style/iframe are not allowed).', targetId);
    if (/style\s*=\s*"/i.test(text)) add('error', 'Inline CSS is not allowed in the readme.', targetId);
    if (/javascript:/i.test(text)) add('error', 'javascript: URLs are not allowed.', targetId);
    if (/data:image\/[a-z]+;base64/i.test(text)) add('error', 'Base64-embedded images are not allowed.', targetId);
    if (/lorem ipsum|\btodo\b/i.test(text)) add('warning', 'Placeholder text found ("Lorem ipsum" / "TODO").', targetId);
    const linkRe = /\[([^\]]*)\]\(([^)]*)\)/g;
    let lm: RegExpExecArray | null;
    while ((lm = linkRe.exec(text)) !== null) {
      const label = lm[1];
      const url = lm[2];
      if (!label.trim() || !url.trim() || !/^https?:\/\/.+/i.test(url)) add('warning', `Malformed link "${lm[0]}".`, targetId);
    }
  });

  return issues;
}

/** Applies the one-click fix associated with an issue's `fixKey`, returning a new project. */
export function applyFixToProject(project: ReadmeProject, issue: Issue): ReadmeProject {
  const p = deepClone(project);
  if (issue.fixKey === 'dedupeTags') p.meta.tags = uniqCaseInsensitive(p.meta.tags);
  else if (issue.fixKey === 'dedupeContributors') p.meta.contributors = uniqCaseInsensitive(p.meta.contributors);
  else if (issue.fixKey === 'syncStableTag' && issue.latest) p.meta.stableTag = issue.latest;
  return p;
}

export { deepClone };
