import { alignBlock, escPhp, withCredit, type ValidationIssue } from '../lib/codegen';

export type OutputMode = 'snippet' | 'functions' | 'plugin';
export type CodeStyle = 'loop' | 'single' | 'class';

export interface MarkupSet {
  beforeWidget: string;
  afterWidget: string;
  beforeTitle: string;
  afterTitle: string;
}

export interface SidebarArea {
  id: string;
  name: string;
  description: string;
  markup?: MarkupSet;
}

export interface Sidebar {
  prefix: string;
  textDomain: string;
  codeStyle: CodeStyle;
  preset: string;
  sharedMarkup: boolean;
  markup: MarkupSet;
  areas: SidebarArea[];
  activeGuard: boolean;
  fallback: boolean;
  getSidebar: boolean;
}

export const PRESETS: Record<string, { label: string } & MarkupSet> = {
  classic: { label: 'Classic aside', beforeWidget: '<aside id="%1$s" class="widget %2$s">', afterWidget: '</aside>', beforeTitle: '<h2 class="widget-title">', afterTitle: '</h2>' },
  section: { label: 'Section + h2', beforeWidget: '<section id="%1$s" class="widget %2$s">', afterWidget: '</section>', beforeTitle: '<h2 class="widget-title">', afterTitle: '</h2>' },
  card: { label: 'Card', beforeWidget: '<div id="%1$s" class="card widget %2$s"><div class="card-body">', afterWidget: '</div></div>', beforeTitle: '<h3 class="card-title widget-title">', afterTitle: '</h3>' },
  minimal: { label: 'Minimal div', beforeWidget: '<div id="%1$s" class="%2$s">', afterWidget: '</div>', beforeTitle: '<h2>', afterTitle: '</h2>' },
};

export const MARKUP_KEYS: [keyof MarkupSet, string, string][] = [
  ['beforeWidget', 'before_widget', "sprintf()-ed with the widget id and class."],
  ['afterWidget', 'after_widget', 'Must close everything before_widget opened.'],
  ['beforeTitle', 'before_title', 'Wraps the widget title. h2 is the accessible default.'],
  ['afterTitle', 'after_title', 'Closes the title tag.'],
];

export const START_PRESETS: [string, SidebarArea[]][] = [
  ['Single sidebar', [{ id: 'sidebar-1', name: 'Sidebar', description: 'The main sidebar on posts and pages.' }]],
  ['Footer × 3', [
    { id: 'footer-1', name: 'Footer 1', description: 'First footer column.' },
    { id: 'footer-2', name: 'Footer 2', description: 'Second footer column.' },
    { id: 'footer-3', name: 'Footer 3', description: 'Third footer column.' },
  ]],
  ['Sidebar + footer', [
    { id: 'sidebar-1', name: 'Sidebar', description: 'The main sidebar.' },
    { id: 'footer-1', name: 'Footer 1', description: 'First footer column.' },
    { id: 'footer-2', name: 'Footer 2', description: 'Second footer column.' },
  ]],
  ['Shop bundle', [
    { id: 'shop-sidebar', name: 'Shop Sidebar', description: 'Filters and categories on shop archives.' },
    { id: 'product-below', name: 'Below Product', description: 'Trust badges under the add-to-cart form.' },
  ]],
];

function fnSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '');
}

/** Dash-based slug used for widget-area ids and the text domain — distinct from the
 * shared underscore-preserving `slugify()`, since these values are always dash-cased. */
function dashSlug(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}

function pascal(s: string): string {
  return String(s || '')
    .split(/[^A-Za-z0-9]+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('_');
}

function indent(text: string, depth: number): string {
  const pad = '\t'.repeat(depth);
  return text.split('\n').map((l) => (l ? pad + l : '')).join('\n');
}

function openTags(html: string): string[] {
  return (String(html || '').match(/<([a-z][a-z0-9]*)/gi) || []).map((x) => x.slice(1).toLowerCase());
}
function closeTags(html: string): string[] {
  return (String(html || '').match(/<\/([a-z][a-z0-9]*)/gi) || []).map((x) => x.slice(2).toLowerCase());
}
function unclosed(before: string, after: string): string[] {
  const closes = closeTags(after);
  return openTags(before).filter((tag) => {
    const i = closes.indexOf(tag);
    if (i === -1) return true;
    closes.splice(i, 1);
    return false;
  });
}

export function markupFor(sb: Sidebar, area?: SidebarArea | null): MarkupSet {
  if (sb.sharedMarkup || !area || !area.markup) return sb.markup;
  return { ...sb.markup, ...area.markup };
}

export interface DerivedArea {
  id: string;
  name: string;
  description: string;
  markup: MarkupSet;
}

export interface Derived {
  pre: string;
  td: string;
  cls: string;
  style: CodeStyle;
  areas: DerivedArea[];
}

export function derive(sb: Sidebar): Derived {
  const pre = fnSlug(sb.prefix) || 'mytheme';
  const areas: DerivedArea[] = (sb.areas || []).map((a) => ({
    id: dashSlug(a.id) || 'sidebar-1',
    name: a.name || 'Sidebar',
    description: a.description || '',
    markup: markupFor(sb, a),
  }));
  return {
    pre,
    td: dashSlug(sb.textDomain) || pre.replace(/_/g, '-'),
    cls: (pascal(sb.prefix || 'MyTheme') || 'MyTheme') + '_Widget_Areas',
    style: sb.codeStyle || 'loop',
    areas,
  };
}

export function buildCode(sb: Sidebar, mode: OutputMode): string {
  const d = derive(sb);
  const pre = d.pre;
  const td = d.td;
  const t = (s: string) => "__( '" + escPhp(s) + "', '" + td + "' )";
  const argPairs = (a: DerivedArea, withMarkup: boolean): [string, string][] => {
    const p: [string, string][] = [['id', "'" + escPhp(a.id) + "'"], ['name', t(a.name)]];
    if (a.description) p.push(['description', t(a.description)]);
    if (withMarkup) {
      p.push(['before_widget', "'" + escPhp(a.markup.beforeWidget) + "'"]);
      p.push(['after_widget', "'" + escPhp(a.markup.afterWidget) + "'"]);
      p.push(['before_title', "'" + escPhp(a.markup.beforeTitle) + "'"]);
      p.push(['after_title', "'" + escPhp(a.markup.afterTitle) + "'"]);
    }
    return p;
  };
  const sameMarkup = sb.sharedMarkup && d.areas.length > 1;

  let body = '';
  if (sameMarkup && d.style !== 'single') {
    const m = d.areas[0].markup;
    body += '$defaults = array(\n' + indent(alignBlock([
      ['before_widget', "'" + escPhp(m.beforeWidget) + "'"],
      ['after_widget', "'" + escPhp(m.afterWidget) + "'"],
      ['before_title', "'" + escPhp(m.beforeTitle) + "'"],
      ['after_title', "'" + escPhp(m.afterTitle) + "'"],
    ], ''), 1) + '\n);\n\n';
    body += '$areas = array(\n' + indent(d.areas.map((a) => 'array(\n' + indent(alignBlock(argPairs(a, false), ''), 1) + '\n),').join('\n'), 1)
      + '\n);\n\nforeach ( $areas as $area ) {\n\tregister_sidebar( array_merge( $defaults, $area ) );\n}';
  } else {
    body += d.areas.map((a) => 'register_sidebar(\n' + indent('array(\n' + indent(alignBlock(argPairs(a, true), ''), 1) + '\n)', 1) + '\n);').join('\n\n');
  }
  if (!d.areas.length) body = '// Add a widget area to generate the registration call.';

  const doc = '/**\n * Register the theme’s widget areas.\n */\n';
  let out = '';
  if (mode === 'plugin') {
    out += '<?php\n/**\n * Plugin Name:       ' + (d.areas.length ? d.areas[0].name : 'Widget') + ' areas\n * Description:       Registers ' + d.areas.length + ' widget area' + (d.areas.length === 1 ? '' : 's') + '.\n * Version:           1.0.0\n * Requires PHP:      7.4\n * Text Domain:       ' + td + '\n */\n\ndefined( \'ABSPATH\' ) || exit;\n\n';
  } else if (mode === 'functions') {
    out += "<?php\n// Add to your theme's functions.php.\n\n";
  }

  if (d.style === 'class') {
    out += 'final class ' + d.cls + ' {\n\n\t/**\n\t * Wire the class into WordPress.\n\t */\n\tpublic function hooks() {\n\t\tadd_action( \'widgets_init\', array( $this, \'register\' ) );\n\t}\n\n' + indent(doc, 1) + '\tpublic function register() {\n' + indent(body, 2) + '\n\t}\n}\n\n( new ' + d.cls + '() )->hooks();\n';
  } else {
    out += doc + 'function ' + pre + '_widget_areas() {\n' + indent(body, 1) + '\n}\n' + "add_action( 'widgets_init', '" + pre + "_widget_areas' );\n";
  }
  return withCredit(out);
}

export function buildTemplate(sb: Sidebar, area: DerivedArea | null): string {
  const d = derive(sb);
  if (!area) return '<?php\n// Add a widget area first.\n';
  const id = area.id;
  const wrapClass = 'widget-area ' + id;
  let out = '';
  if (sb.activeGuard) {
    out += "<?php if ( is_active_sidebar( '" + escPhp(id) + "' ) ) : ?>\n";
    out += '\t<div class="' + wrapClass + '">\n\t\t<?php dynamic_sidebar( \'' + escPhp(id) + '\' ); ?>\n\t</div>\n';
    if (sb.fallback) {
      out += '<?php else : ?>\n\t<div class="' + wrapClass + ' is-empty">\n\t\t' + area.markup.beforeWidget.replace('%1$s', id + '-fallback').replace('%2$s', 'widget_text') + '\n\t\t\t' + area.markup.beforeTitle + '<?php esc_html_e( \'Nothing here yet\', \'' + d.td + '\' ); ?>' + area.markup.afterTitle + '\n\t\t\t<p><?php esc_html_e( \'Add a widget under Appearance → Widgets.\', \'' + d.td + '\' ); ?></p>\n\t\t' + area.markup.afterWidget + '\n\t</div>\n';
    }
    out += '<?php endif; ?>\n';
  } else {
    out += '<div class="' + wrapClass + '">\n\t<?php dynamic_sidebar( \'' + escPhp(id) + '\' ); ?>\n</div>\n';
  }
  if (sb.getSidebar) {
    const short = id.replace(/^sidebar-?/, '') || 'main';
    out += '\n<?php\n// Or keep it in its own template part and call:\n// get_sidebar( \'' + escPhp(short) + '\' ); // loads sidebar-' + escPhp(short) + '.php\n';
  }
  return out;
}

export function sampleHTML(area: DerivedArea): string {
  const m = area.markup;
  return m.beforeWidget.replace('%1$s', 'recent-posts-2').replace('%2$s', 'widget_recent_entries')
    + '\n\t' + m.beforeTitle + 'Recent Posts' + m.afterTitle
    + '\n\t<ul>\n\t\t<li><a href="/hello-world/">Hello world!</a></li>\n\t\t<li><a href="/second/">A second post</a></li>\n\t</ul>\n'
    + m.afterWidget;
}

export function validate(sb: Sidebar): ValidationIssue[] {
  const d = derive(sb);
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });

  if (!d.areas.length) add('error', 'No widget areas registered — nothing will appear under Appearance → Widgets.');
  const seen: Record<string, boolean> = {};
  (sb.areas || []).forEach((a) => {
    const id = dashSlug(a.id);
    if (!String(a.id || '').trim()) add('error', 'A widget area is missing its id. Without one WordPress generates sidebar-1, sidebar-2… and your dynamic_sidebar() call will not match.', 'fixIds', 'Derive ids from names');
    else if (String(a.id).trim() !== id) add('error', '“' + a.id + '” is not a safe id. Core runs it through sanitize_title(), so the id you saved and the id you call will differ.', 'fixIds', 'Use ' + id);
    if (seen[id]) add('error', 'Two areas share the id “' + id + '”. The second registration overwrites the first.');
    seen[id] = true;
    if (!String(a.name || '').trim()) add('warning', 'The area “' + id + '” has no name, so the Widgets screen shows an unlabelled box.');
    if (!String(a.description || '').trim()) add('recommendation', 'No description on “' + id + '” — the Widgets screen has room for one line telling the site owner where it appears.');
  });
  const markups = sb.sharedMarkup
    ? [{ label: 'the shared markup', m: sb.markup }]
    : d.areas.map((a) => ({ label: '“' + a.id + '”', m: a.markup }));
  markups.forEach((entry) => {
    const m = entry.m;
    if (String(m.beforeWidget || '').indexOf('%1$s') === -1 || String(m.beforeWidget || '').indexOf('%2$s') === -1) {
      add('error', 'before_widget in ' + entry.label + ' is missing %1$s or %2$s. Widgets render with no id and no widget_* class, so theme CSS and most widget JS stop matching.', 'fixPlaceholders', 'Restore both');
    }
    const openW = unclosed(m.beforeWidget, m.afterWidget);
    if (openW.length) add('error', 'before_widget in ' + entry.label + ' opens <' + openW.join('>, <') + '> that after_widget never closes. Every widget in the area leaks an unclosed tag into the page.', 'closeWidget', 'Close ' + openW.map((x) => '</' + x + '>').join(''));
    const openT = unclosed(m.beforeTitle, m.afterTitle);
    if (openT.length) add('error', 'before_title in ' + entry.label + ' opens <' + openT.join('>, <') + '> with no matching close in after_title.', 'closeTitle', 'Close ' + openT.map((x) => '</' + x + '>').join(''));
    const heading = openTags(m.beforeTitle).filter((x) => /^h[1-6]$/.test(x))[0];
    if (!heading) add('warning', 'The title in ' + entry.label + ' is not a heading. Screen readers use widget titles to navigate a sidebar — h2 is the convention.');
    else if (heading === 'h1') add('warning', 'A widget title in ' + entry.label + ' uses h1. There should be one h1 per page and it belongs to the content, not a widget.');
    else if (heading === 'h4' || heading === 'h5' || heading === 'h6') add('recommendation', 'Widget titles in ' + entry.label + ' are ' + heading + '. That skips heading levels on most templates — style an h2 down instead.');
    if (/class="[^"]*"/.test(m.beforeWidget) && String(m.beforeWidget).indexOf('%2$s') === -1) add('recommendation', 'The wrapper in ' + entry.label + ' has a class attribute but no %2$s, so the per-widget class never lands in it.');
  });
  if (!sb.activeGuard) add('warning', 'The template call has no is_active_sidebar() guard, so an empty area still prints its wrapper div — which usually shows up as an unexplained gap.', 'enableGuard', 'Add the guard');
  if (sb.fallback && !sb.activeGuard) add('recommendation', 'Fallback content needs the is_active_sidebar() guard to have an else branch to live in.');
  if (d.areas.length > 6) add('recommendation', d.areas.length + ' widget areas is a lot of surface to support. Areas nobody fills still cost you template branches forever.');
  if (d.td !== d.pre.replace(/_/g, '-')) add('recommendation', 'The text domain “' + d.td + '” has to match the theme or plugin folder name, or none of these strings translate.');
  return out;
}

export function freshProject(): Sidebar {
  return {
    prefix: 'mytheme', textDomain: 'mytheme', codeStyle: 'loop', preset: 'classic', sharedMarkup: true,
    markup: {
      beforeWidget: PRESETS.classic.beforeWidget, afterWidget: PRESETS.classic.afterWidget,
      beforeTitle: PRESETS.classic.beforeTitle, afterTitle: PRESETS.classic.afterTitle,
    },
    areas: [
      { id: 'sidebar-1', name: 'Sidebar', description: 'The main sidebar on posts and pages.' },
      { id: 'footer-1', name: 'Footer 1', description: 'First footer column.' },
      { id: 'footer-2', name: 'Footer 2', description: 'Second footer column.' },
    ],
    activeGuard: true, fallback: false, getSidebar: false,
  };
}

export function applyPreset(sb: Sidebar, key: string): Sidebar {
  const p: Sidebar = JSON.parse(JSON.stringify(sb));
  const preset = PRESETS[key];
  if (!preset) return p;
  p.preset = key;
  p.markup = { beforeWidget: preset.beforeWidget, afterWidget: preset.afterWidget, beforeTitle: preset.beforeTitle, afterTitle: preset.afterTitle };
  p.areas.forEach((a) => { delete a.markup; });
  return p;
}

export function applyFix(sb: Sidebar, kind: string): Sidebar {
  const p: Sidebar = JSON.parse(JSON.stringify(sb));
  const targets = (): MarkupSet[] => (p.sharedMarkup ? [p.markup] : p.areas.map((a) => { a.markup = { ...p.markup, ...(a.markup || {}) }; return a.markup; }));
  if (kind === 'fixIds') p.areas.forEach((a) => { a.id = dashSlug(a.id) || dashSlug(a.name) || 'sidebar-1'; });
  if (kind === 'enableGuard') p.activeGuard = true;
  if (kind === 'fixPlaceholders') {
    targets().forEach((m) => {
      if (String(m.beforeWidget).indexOf('%1$s') === -1 || String(m.beforeWidget).indexOf('%2$s') === -1) {
        const tag = openTags(m.beforeWidget)[0] || 'aside';
        m.beforeWidget = '<' + tag + ' id="%1$s" class="widget %2$s">';
      }
    });
  }
  if (kind === 'closeWidget') targets().forEach((m) => { unclosed(m.beforeWidget, m.afterWidget).reverse().forEach((tag) => { m.afterWidget = m.afterWidget + '</' + tag + '>'; }); });
  if (kind === 'closeTitle') targets().forEach((m) => { unclosed(m.beforeTitle, m.afterTitle).reverse().forEach((tag) => { m.afterTitle = m.afterTitle + '</' + tag + '>'; }); });
  return p;
}
