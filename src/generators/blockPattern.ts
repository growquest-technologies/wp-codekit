import { escPhp, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'file' | 'snippet' | 'plugin';

export interface BlockPattern {
  title: string;
  slug: string;
  textDomain: string;
  description: string;
  categories: string[];
  customCategory: string;
  blockTypes: string[];
  viewport: string;
  keywords: string;
  inserter: boolean;
  heredoc: boolean;
  content: string;
}

export const CORE_CATEGORIES = ['featured', 'banner', 'call-to-action', 'text', 'gallery', 'columns', 'posts', 'services', 'testimonials', 'footer', 'header'];
export const BLOCK_TYPES = ['core/post-content', 'core/template-part/header', 'core/template-part/footer', 'core/query', 'core/paragraph'];

export const STARTERS: Record<string, { label: string; content: string }> = {
  hero: {
    label: 'Hero',
    content: '<!-- wp:group {"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}},"layout":{"type":"constrained"}} -->\n<div class="wp-block-group alignfull" style="padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)">\n<!-- wp:heading {"level":1,"textAlign":"center"} -->\n<h1 class="wp-block-heading has-text-align-center">Everything in one place</h1>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph {"align":"center"} -->\n<p class="has-text-align-center">One clear sentence about what this is and who it helps.</p>\n<!-- /wp:paragraph -->\n\n<!-- wp:buttons {"layout":{"type":"flex","justifyContent":"center"}} -->\n<div class="wp-block-buttons">\n<!-- wp:button -->\n<div class="wp-block-button"><a class="wp-block-button__link wp-element-button">Get started</a></div>\n<!-- /wp:button -->\n\n<!-- wp:button {"className":"is-style-outline"} -->\n<div class="wp-block-button is-style-outline"><a class="wp-block-button__link wp-element-button">Read the docs</a></div>\n<!-- /wp:button -->\n</div>\n<!-- /wp:buttons -->\n</div>\n<!-- /wp:group -->',
  },
  columns: {
    label: 'Three columns',
    content: '<!-- wp:columns {"style":{"spacing":{"blockGap":{"top":"var:preset|spacing|40","left":"var:preset|spacing|40"}}}} -->\n<div class="wp-block-columns">\n<!-- wp:column -->\n<div class="wp-block-column">\n<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">Fast</h3>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p>What this column is for.</p>\n<!-- /wp:paragraph -->\n</div>\n<!-- /wp:column -->\n\n<!-- wp:column -->\n<div class="wp-block-column">\n<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">Careful</h3>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p>What this column is for.</p>\n<!-- /wp:paragraph -->\n</div>\n<!-- /wp:column -->\n\n<!-- wp:column -->\n<div class="wp-block-column">\n<!-- wp:heading {"level":3} -->\n<h3 class="wp-block-heading">Yours</h3>\n<!-- /wp:heading -->\n\n<!-- wp:paragraph -->\n<p>What this column is for.</p>\n<!-- /wp:paragraph -->\n</div>\n<!-- /wp:column -->\n</div>\n<!-- /wp:columns -->',
  },
  cover: {
    label: 'Cover with image',
    content: '<!-- wp:cover {"dimRatio":50,"align":"full","style":{"spacing":{"padding":{"top":"var:preset|spacing|80","bottom":"var:preset|spacing|80"}}}} -->\n<div class="wp-block-cover alignfull" style="padding-top:var(--wp--preset--spacing--80);padding-bottom:var(--wp--preset--spacing--80)">\n<span aria-hidden="true" class="wp-block-cover__background has-background-dim"></span>\n<div class="wp-block-cover__inner-container">\n<!-- wp:heading {"textAlign":"center","level":2} -->\n<h2 class="wp-block-heading has-text-align-center">Replace this image in the editor</h2>\n<!-- /wp:heading -->\n</div>\n</div>\n<!-- /wp:cover -->',
  },
  quote: {
    label: 'Pull quote',
    content: '<!-- wp:quote {"align":"center"} -->\n<blockquote class="wp-block-quote has-text-align-center">\n<!-- wp:paragraph -->\n<p>They shipped in a week what our last agency scoped in a quarter.</p>\n<!-- /wp:paragraph -->\n<cite>A client, somewhere</cite>\n</blockquote>\n<!-- /wp:quote -->',
  },
};

export function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}
function indent(text: string, depth: number): string {
  const p = new Array(depth + 1).join('\t');
  return text.split('\n').map((l) => (l ? p + l : '')).join('\n');
}
function padTo(s: string, w: number): string {
  return s + new Array(Math.max(0, w - s.length) + 1).join(' ');
}
function aligned(pairs: [string, string][]): string {
  const w = pairs.reduce((m, p) => Math.max(m, p[0].length), 0);
  return pairs.map((p) => padTo("'" + p[0] + "'", w + 2) + ' => ' + p[1] + ',').join('\n');
}

export interface BlockTags {
  open: string[];
  close: string[];
  selfClosing: number;
}

export function blockTags(content: string): BlockTags {
  const open = (String(content || '').match(/<!--\s*wp:([a-z0-9/-]+)/g) || []).map((x) => x.replace(/<!--\s*wp:/, ''));
  const close = (String(content || '').match(/<!--\s*\/wp:([a-z0-9/-]+)/g) || []).map((x) => x.replace(/<!--\s*\/wp:/, ''));
  const selfClosing = (String(content || '').match(/<!--\s*wp:[a-z0-9/-]+[^>]*\/-->/g) || []).length;
  return { open, close, selfClosing };
}

const CREDIT_PHP = '// Generated with WP CodeKit — powered by GrowQuest (https://growquest.io).\n';

export interface Derived {
  ns: string;
  name: string;
  full: string;
  td: string;
  cats: string[];
  custom: string;
  blockTypes: string[];
  fn: string;
}

export function derive(bp: BlockPattern): Derived {
  const raw = String(bp.slug || '').trim();
  const parts = raw.split('/');
  const ns = slugify(parts.length > 1 ? parts[0] : bp.textDomain) || 'mytheme';
  const name = slugify(parts.length > 1 ? parts.slice(1).join('-') : raw) || 'pattern';
  const cats = (bp.categories || []).slice();
  const custom = slugify(bp.customCategory);
  if (custom && cats.indexOf(custom) === -1) cats.push(custom);
  return {
    ns, name, full: ns + '/' + name,
    td: slugify(bp.textDomain) || ns,
    cats, custom,
    blockTypes: bp.blockTypes || [],
    fn: fnSlug(bp.textDomain || 'mytheme'),
  };
}

export function buildCode(bp: BlockPattern, mode: OutputMode): string {
  const d = derive(bp);
  const content = String(bp.content || '').replace(/\n+$/, '');

  if (mode === 'file') {
    let out = '<?php\n/**\n';
    out += ' * Title: ' + (bp.title || 'Pattern') + '\n';
    out += ' * Slug: ' + d.full + '\n';
    if (d.cats.length) out += ' * Categories: ' + d.cats.join(', ') + '\n';
    if (d.blockTypes.length) out += ' * Block Types: ' + d.blockTypes.join(', ') + '\n';
    if (bp.description) out += ' * Description: ' + bp.description + '\n';
    if (parseInt(bp.viewport, 10)) out += ' * Viewport Width: ' + parseInt(bp.viewport, 10) + '\n';
    if (bp.inserter === false) out += ' * Inserter: no\n';
    out += ' *\n * Generated with WP CodeKit — powered by GrowQuest (https://growquest.io).\n';
    out += ' */\n?>\n' + content + '\n';
    return out;
  }

  const t = (s: string) => "__( '" + escPhp(s) + "', '" + d.td + "' )";
  const pairs: [string, string][] = [['title', t(bp.title || 'Pattern')]];
  if (bp.description) pairs.push(['description', t(bp.description)]);
  if (d.cats.length) pairs.push(['categories', 'array( ' + d.cats.map((c) => "'" + c + "'").join(', ') + ' )']);
  if (d.blockTypes.length) pairs.push(['blockTypes', 'array( ' + d.blockTypes.map((c) => "'" + c + "'").join(', ') + ' )']);
  if (parseInt(bp.viewport, 10)) pairs.push(['viewportWidth', String(parseInt(bp.viewport, 10))]);
  if (bp.inserter === false) pairs.push(['inserter', 'false']);
  if (bp.keywords) pairs.push(['keywords', 'array( ' + String(bp.keywords).split(',').map((k) => t(k.trim())).filter((k) => k.indexOf("''") === -1).join(', ') + ' )']);
  pairs.push(['content', bp.heredoc ? "<<<'HTML'\n" + content + '\nHTML' : "'" + escPhp(content) + "'"]);

  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (bp.title || 'Block pattern') + '\n * Description:       Registers the ' + d.full + ' block pattern.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + d.td + "\n */\n\ndefined( 'ABSPATH' ) || exit;\n\n";
  } else {
    out += "<?php\n// Add to your theme's functions.php or a plugin.\n\n";
  }
  out = out.replace('<?php\n', '<?php\n' + CREDIT_PHP);

  out += '/**\n * Register the pattern' + (d.custom ? ' and its category' : '') + '.\n */\nfunction ' + d.fn + '_register_patterns() {\n';
  if (d.custom) {
    out += "\tregister_block_pattern_category(\n\t\t'" + d.custom + "',\n\t\tarray(\n\t\t\t'label' => " + t(String(bp.customCategory || d.custom).trim()) + ',\n\t\t)\n\t);\n\n';
  }
  out += "\tregister_block_pattern(\n\t\t'" + d.full + "',\n\t\tarray(\n" + indent(aligned(pairs), 3) + '\n\t\t)\n\t);\n}\n';
  out += "add_action( 'init', '" + d.fn + "_register_patterns' );\n";
  return out;
}

export function validate(bp: BlockPattern): ValidationIssue[] {
  const d = derive(bp);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const content = String(bp.content || '');
  const tags = blockTags(content);
  if (!String(bp.title || '').trim()) add('error', 'A title is required — it is the label in the inserter.');
  if (!String(bp.slug || '').trim()) add('error', 'A slug is required, and it must include a namespace: mytheme/hero-cta.', 'fixSlug', 'Use ' + d.full);
  else if (String(bp.slug).indexOf('/') === -1) add('error', 'The slug has no namespace. Without one it can collide with a core or plugin pattern.', 'fixSlug', 'Use ' + d.full);
  else if (String(bp.slug).trim() !== d.full) add('warning', `"${bp.slug}" is not a safe slug. Lowercase with dashes on both sides of the slash.`, 'fixSlug', 'Use ' + d.full);
  if (!content.trim()) add('error', 'No block markup, so the pattern inserts nothing.');
  else if (content.indexOf('<!-- wp:') === -1) add('error', 'The content has no block comments, so the editor will treat all of it as one Classic block.');
  if (tags.open.length && tags.open.length - tags.selfClosing !== tags.close.length) {
    add('error', 'Unbalanced block comments: ' + (tags.open.length - tags.selfClosing) + ' opening tag' + (tags.open.length - tags.selfClosing === 1 ? '' : 's') + ' against ' + tags.close.length + ' closing. The editor will show a block-recovery error.');
  }
  const openSet: Record<string, number> = {};
  tags.open.forEach((tg) => { openSet[tg] = (openSet[tg] || 0) + 1; });
  tags.close.forEach((tg) => { openSet[tg] = (openSet[tg] || 0) - 1; });
  Object.keys(openSet).forEach((tg) => {
    if (openSet[tg] > 0) add('error', 'wp:' + tg + ' is opened ' + openSet[tg] + ' more time' + (openSet[tg] === 1 ? '' : 's') + ' than it is closed.');
    if (openSet[tg] < 0) add('error', 'wp:' + tg + ' is closed more often than it is opened.');
  });
  const attrs = content.match(/<!--\s*wp:[a-z0-9/-]+\s+(\{[^]*?\})\s*-->/g) || [];
  attrs.forEach((a) => {
    const json = a.replace(/^<!--\s*wp:[a-z0-9/-]+\s+/, '').replace(/\s*-->$/, '');
    try { JSON.parse(json); } catch { add('error', 'Invalid attribute JSON in ' + a.slice(0, 44) + '… — the block will fail to parse.'); }
  });
  if (!String(bp.description || '').trim()) add('warning', 'No description. The inserter reads it out to screen-reader users, and it is the only hint about what the pattern contains.');
  if (!d.cats.length) add('warning', 'No category, so the pattern lands in the ungrouped pile at the bottom of the inserter.', 'addFeatured', 'Add featured');
  if (d.custom) add('recommendation', `The custom category "${d.custom}" is registered for you. In a block theme using /patterns files, register it in PHP anyway — the file header cannot create a category.`);
  if (!parseInt(bp.viewport, 10)) add('recommendation', 'No viewportWidth. The inserter preview will render at the editor width, which makes full-width patterns look cramped. 1280 suits most.', 'setViewport', 'Set 1280');
  else if (parseInt(bp.viewport, 10) < 600) add('warning', `A viewport of ${parseInt(bp.viewport, 10)}px previews the pattern as if on a phone. Deliberate for a mobile-only pattern, misleading otherwise.`);
  if (d.blockTypes.length && d.blockTypes.indexOf('core/post-content') >= 0) add('recommendation', 'core/post-content in blockTypes offers this pattern when starting a new page — the "start with a pattern" flow.');
  if (bp.inserter === false) add('recommendation', 'inserter false hides the pattern from the inserter entirely. Only useful for patterns referenced by blockTypes or by another pattern.');
  if (!bp.heredoc && content.indexOf("'") >= 0) add('recommendation', 'The markup contains apostrophes, which are escaped into the single-quoted string. A heredoc keeps it readable.', 'useHeredoc', 'Use a heredoc');
  if (content.indexOf('http://localhost') >= 0 || /wp-content\/uploads/.test(content)) add('warning', 'The markup references an uploads URL from your machine. Patterns with hard-coded local image paths break on every other site.');
  if (/wp:image[^>]*"id":\d+/.test(content)) add('warning', 'An image block includes a numeric attachment id, which points at a different image on any other site. Remove the id, or ship the pattern with the image bundled in your theme.');
  if (content.length > 20000) add('recommendation', `At ${Math.round(content.length / 1000)}kB this pattern is very large. Large patterns are slow to preview and hard for a client to edit down.`);
  return out;
}

export function freshProject(): BlockPattern {
  return {
    title: 'Hero with call to action', slug: 'mytheme/hero-cta', textDomain: 'mytheme',
    description: 'A full-width heading, a line of copy and two buttons.',
    categories: ['featured', 'call-to-action'], customCategory: '', blockTypes: [],
    viewport: '1280', keywords: 'hero, banner', inserter: true, heredoc: true,
    content: STARTERS.hero.content,
  };
}

export function applyFix(bp: BlockPattern, kind: string): BlockPattern {
  const p: BlockPattern = JSON.parse(JSON.stringify(bp));
  const d = derive(p);
  if (kind === 'fixSlug') p.slug = d.full;
  if (kind === 'addFeatured') { p.categories = p.categories || []; if (p.categories.indexOf('featured') === -1) p.categories.push('featured'); }
  if (kind === 'setViewport') p.viewport = '1280';
  if (kind === 'useHeredoc') p.heredoc = true;
  return p;
}
