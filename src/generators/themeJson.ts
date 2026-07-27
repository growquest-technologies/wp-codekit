import type { ValidationIssue } from '../lib/codegen';

export interface ThemeColor {
  slug: string;
  name: string;
  color: string;
}

export interface ThemeJson {
  colors: ThemeColor[];
  bodyFont: string;
  headingFont: string;
  baseSize: string;
  scale: string;
  contentSize: string;
  wideSize: string;
  spacingSteps: string;
  rootPadding: string;
  controls: string[];
  appearanceTools: boolean;
  keepCorePalette: boolean;
  fluidType: boolean;
  headingStyles: boolean;
  buttonStyles: boolean;
  templateParts: boolean;
  customTokens: boolean;
}

export const CONTROLS: [string, string][] = [
  ['customColor', 'Custom colour picker beyond the palette.'],
  ['customGradient', 'Custom gradients.'],
  ['customDuotone', 'Custom duotone filters.'],
  ['link', 'Link colour control.'],
  ['customFontSize', 'Arbitrary font sizes beyond the scale.'],
  ['fontStyle', 'Italic toggle.'],
  ['fontWeight', 'Weight control.'],
  ['lineHeight', 'Line height control.'],
  ['letterSpacing', 'Letter spacing control.'],
  ['textDecoration', 'Underline and strikethrough.'],
  ['textTransform', 'Uppercase and capitalise.'],
  ['customSpacingSize', 'Arbitrary spacing values beyond the scale.'],
  ['padding', 'Padding controls on blocks.'],
  ['margin', 'Margin controls on blocks.'],
  ['blockGap', 'Gap between blocks.'],
];

const SIZE_SLUGS = ['small', 'medium', 'large', 'x-large', 'xx-large'];

/** Dash-based slug used throughout theme.json for colour/size slugs — matches the
 * source's own slugify(), distinct from the shared underscore-preserving one. */
function slugify(s: string): string {
  return String(s || '').toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
}
function isHex(s: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(String(s || '').trim());
}
function isLength(s: string): boolean {
  const v = String(s || '').trim();
  return /^-?[\d.]+(px|rem|em|%|vw|vh|ch)$/.test(v) || /^(clamp|calc|min|max)\(/.test(v);
}
function round(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export interface SizeStep {
  slug: string;
  name: string;
  size: string;
  px: number;
}

export function scaleSizes(tj: ThemeJson): SizeStep[] {
  const base = parseFloat(tj.baseSize) || 1;
  const unit = String(tj.baseSize || '1rem').replace(/^[\d.]+/, '') || 'rem';
  const ratio = parseFloat(tj.scale) || 1.25;
  return SIZE_SLUGS.map((slug, i) => {
    const step = i - 1;
    const size = round(base * Math.pow(ratio, step));
    return { slug, name: slug.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()), size: size + unit, px: Math.round(size * 16) };
  });
}

export interface SpacingStep {
  slug: string;
  size: string;
  name: string;
}

export function spacingSizes(steps: string): SpacingStep[] {
  const n = parseInt(steps, 10) || 0;
  const out: SpacingStep[] = [];
  for (let i = 0; i < n; i++) {
    const step = i - Math.floor(n / 3);
    const rem = round(1 * Math.pow(1.5, step));
    out.push({ slug: String((i + 1) * 10), size: rem + 'rem', name: 'Step ' + (i + 1) });
  }
  return out;
}

/** Loosely typed theme.json document — deliberately untyped beyond a plain object,
 * mirroring the source generator which builds it as a bag of settings/styles. */
type JsonDoc = Record<string, unknown>;

export function buildJSON(tj: ThemeJson): string {
  const colors = (tj.colors || []).filter((c) => slugify(c.slug));
  const sizes = scaleSizes(tj);
  const spacing = spacingSizes(tj.spacingSteps);
  const on = tj.controls || [];
  const has = (k: string) => on.indexOf(k) >= 0;

  const settings: JsonDoc = {
    appearanceTools: !!tj.appearanceTools,
    useRootPaddingAwareAlignments: !!String(tj.rootPadding || '').trim(),
    layout: {
      contentSize: String(tj.contentSize || '720px').trim(),
      wideSize: String(tj.wideSize || '1200px').trim(),
    },
    color: {
      custom: has('customColor'),
      customGradient: has('customGradient'),
      customDuotone: has('customDuotone'),
      link: has('link'),
      defaultPalette: !!tj.keepCorePalette,
      palette: colors.map((c) => ({ slug: slugify(c.slug), name: c.name || slugify(c.slug), color: String(c.color || '').trim() })),
    },
    typography: {
      customFontSize: has('customFontSize'),
      fontStyle: has('fontStyle'),
      fontWeight: has('fontWeight'),
      lineHeight: has('lineHeight'),
      letterSpacing: has('letterSpacing'),
      textDecoration: has('textDecoration'),
      textTransform: has('textTransform'),
      fluid: !!tj.fluidType,
      fontSizes: sizes.map((s) => ({ slug: s.slug, name: s.name, size: s.size })),
    } as JsonDoc,
    spacing: {
      customSpacingSize: has('customSpacingSize'),
      padding: has('padding'),
      margin: has('margin'),
      blockGap: has('blockGap'),
      units: ['px', 'rem', 'em', '%', 'vw'],
    } as JsonDoc,
  };
  if (spacing.length) (settings.spacing as JsonDoc).spacingSizes = spacing.map((s) => ({ slug: s.slug, name: s.name, size: s.size }));

  const fonts: { slug: string; name: string; fontFamily: string }[] = [];
  if (String(tj.bodyFont || '').trim()) fonts.push({ slug: 'body', name: 'Body', fontFamily: String(tj.bodyFont).trim() });
  if (String(tj.headingFont || '').trim()) fonts.push({ slug: 'heading', name: 'Heading', fontFamily: String(tj.headingFont).trim() });
  if (fonts.length) (settings.typography as JsonDoc).fontFamilies = fonts;

  const styles: JsonDoc = {
    color: {} as JsonDoc,
    typography: {
      fontFamily: fonts.length ? 'var(--wp--preset--font-family--body)' : undefined,
      fontSize: 'var(--wp--preset--font-size--medium)',
      lineHeight: '1.6',
    } as JsonDoc,
    spacing: {} as JsonDoc,
    elements: {} as JsonDoc,
  };
  const bg = colors.find((c) => slugify(c.slug) === 'base' || slugify(c.slug) === 'background');
  const text = colors.find((c) => slugify(c.slug) === 'contrast' || slugify(c.slug) === 'text');
  const accent = colors.find((c) => slugify(c.slug) === 'primary' || slugify(c.slug) === 'accent');
  if (bg) (styles.color as JsonDoc).background = 'var(--wp--preset--color--' + slugify(bg.slug) + ')';
  if (text) (styles.color as JsonDoc).text = 'var(--wp--preset--color--' + slugify(text.slug) + ')';
  if (String(tj.rootPadding || '').trim()) {
    (styles.spacing as JsonDoc).padding = { left: String(tj.rootPadding).trim(), right: String(tj.rootPadding).trim() };
  }
  if (spacing.length) (styles.spacing as JsonDoc).blockGap = 'var(--wp--preset--spacing--' + spacing[Math.min(2, spacing.length - 1)].slug + ')';
  if (accent) {
    (styles.elements as JsonDoc).link = {
      color: { text: 'var(--wp--preset--color--' + slugify(accent.slug) + ')' },
      ':hover': { typography: { textDecoration: 'none' } },
    };
    if (tj.buttonStyles) {
      (styles.elements as JsonDoc).button = {
        color: { background: 'var(--wp--preset--color--' + slugify(accent.slug) + ')', text: bg ? 'var(--wp--preset--color--' + slugify(bg.slug) + ')' : '#ffffff' },
        border: { radius: '4px' },
        spacing: { padding: { top: '0.7rem', bottom: '0.7rem', left: '1.4rem', right: '1.4rem' } },
        typography: { fontWeight: '600' },
      };
    }
  }
  if (tj.headingStyles) {
    (styles.elements as JsonDoc).heading = {
      typography: {
        fontFamily: fonts.some((f) => f.slug === 'heading') ? 'var(--wp--preset--font-family--heading)' : undefined,
        fontWeight: '700',
        lineHeight: '1.2',
      },
    };
    (styles.elements as JsonDoc).h1 = { typography: { fontSize: 'var(--wp--preset--font-size--xx-large)' } };
    (styles.elements as JsonDoc).h2 = { typography: { fontSize: 'var(--wp--preset--font-size--x-large)' } };
    (styles.elements as JsonDoc).h3 = { typography: { fontSize: 'var(--wp--preset--font-size--large)' } };
  }

  const doc: JsonDoc = {
    $schema: 'https://schemas.wp.org/trunk/theme.json',
    version: 3,
    settings,
    styles,
  };
  if (tj.templateParts) {
    doc.templateParts = [
      { name: 'header', title: 'Header', area: 'header' },
      { name: 'footer', title: 'Footer', area: 'footer' },
    ];
  }
  if (tj.customTokens) {
    (settings as JsonDoc).custom = { 'transition-fast': '120ms ease', 'shadow-card': '0 1px 3px rgba(0,0,0,0.08)' };
  }
  return JSON.stringify(doc, (_k, v) => (v === undefined ? undefined : v), 2) + '\n';
}

export function cssVarList(tj: ThemeJson): string {
  const colors = (tj.colors || []).filter((c) => slugify(c.slug));
  const sizes = scaleSizes(tj);
  const spacing = spacingSizes(tj.spacingSteps);
  const lines: string[] = [];
  lines.push('/* Colours */');
  colors.forEach((c) => lines.push('--wp--preset--color--' + slugify(c.slug) + ': ' + String(c.color || '').trim() + ';'));
  lines.push('');
  lines.push('/* Font sizes */');
  sizes.forEach((s) => lines.push('--wp--preset--font-size--' + s.slug + ': ' + s.size + ';'));
  if (String(tj.bodyFont || '').trim() || String(tj.headingFont || '').trim()) {
    lines.push('');
    lines.push('/* Font families */');
    if (String(tj.bodyFont || '').trim()) lines.push('--wp--preset--font-family--body: ' + String(tj.bodyFont).trim() + ';');
    if (String(tj.headingFont || '').trim()) lines.push('--wp--preset--font-family--heading: ' + String(tj.headingFont).trim() + ';');
  }
  if (spacing.length) {
    lines.push('');
    lines.push('/* Spacing */');
    spacing.forEach((s) => lines.push('--wp--preset--spacing--' + s.slug + ': ' + s.size + ';'));
  }
  if (tj.customTokens) {
    lines.push('');
    lines.push('/* settings.custom */');
    lines.push('--wp--custom--transition-fast: 120ms ease;');
    lines.push('--wp--custom--shadow-card: 0 1px 3px rgba(0,0,0,0.08);');
  }
  lines.push('');
  lines.push('/* Layout */');
  lines.push('--wp--style--global--content-size: ' + String(tj.contentSize || '720px').trim() + ';');
  lines.push('--wp--style--global--wide-size: ' + String(tj.wideSize || '1200px').trim() + ';');
  return lines.join('\n');
}

export function validate(tj: ThemeJson): ValidationIssue[] {
  const out: ValidationIssue[] = [];
  const add = (severity: ValidationIssue['severity'], message: string, fix?: string, fixLabel?: string) => out.push({ severity, message, fix, fixLabel });
  const colors = tj.colors || [];
  const on = tj.controls || [];
  if (!colors.length) add('error', 'An empty palette leaves the editor with no colours to pick — or core’s defaults, if you kept them.');
  const seen: Record<string, boolean> = {};
  colors.forEach((c) => {
    const slug = slugify(c.slug);
    if (!slug) add('error', 'A colour is missing its slug. The slug becomes the CSS custom property name.');
    if (seen[slug]) add('error', 'Two colours share the slug “' + slug + '”, so one custom property overwrites the other.');
    seen[slug] = true;
    if (!isHex(c.color) && !/^(rgb|hsl|var|oklch)/.test(String(c.color || '').trim())) add('error', '“' + (c.color || '') + '” is not a colour value. Use a hex, an rgb()/hsl() function, or a var().');
    if (!String(c.name || '').trim()) add('warning', 'The colour “' + slug + '” has no name, so the editor shows the slug in its tooltip.');
  });
  const names = colors.map((c) => slugify(c.slug));
  if (names.indexOf('base') === -1 && names.indexOf('background') === -1) add('warning', 'No base or background colour, so styles.color.background is left unset and the site falls back to whatever the browser does.');
  if (names.indexOf('contrast') === -1 && names.indexOf('text') === -1) add('warning', 'No contrast or text colour, so body text has no declared colour.');
  if (!isLength(tj.contentSize)) add('error', 'contentSize must be a CSS length — 720px, 45rem, or a clamp().');
  if (!isLength(tj.wideSize)) add('error', 'wideSize must be a CSS length.');
  const c = parseFloat(tj.contentSize);
  const w = parseFloat(tj.wideSize);
  if (c && w && /px|rem/.test(String(tj.contentSize)) && /px|rem/.test(String(tj.wideSize)) && c > w) add('error', 'contentSize is larger than wideSize, so wide alignment will look narrower than normal content.', 'swapSizes', 'Swap them');
  if (!parseFloat(tj.baseSize)) add('error', 'The base font size must be a number with a unit — 1rem or 18px.');
  if (String(tj.baseSize || '').indexOf('px') >= 0) add('recommendation', 'A px base size ignores the reader’s browser setting. rem respects it.');
  if (parseInt(tj.spacingSteps, 10) === 0) add('recommendation', 'No spacing scale, so every gap in the editor is an arbitrary value. A scale is what keeps a client’s pages consistent.', 'setSeven', 'Use 7 steps');
  if (on.indexOf('customColor') >= 0 && colors.length) add('recommendation', 'The custom colour picker is on alongside your palette. If the point of the palette is consistency, turning it off is the enforcement.');
  if (on.indexOf('customFontSize') >= 0) add('recommendation', 'Arbitrary font sizes are allowed, which undoes the scale you just defined.');
  if (!tj.appearanceTools && (on.indexOf('padding') === -1 || on.indexOf('margin') === -1)) add('recommendation', 'appearanceTools is a shortcut that turns on border, colour, spacing and typography controls together — simpler than listing them.');
  if (tj.keepCorePalette && colors.length) add('warning', 'defaultPalette is true, so core’s colours sit alongside yours in the picker. Most themes turn this off.', 'dropCore', 'Use only my palette');
  if (!String(tj.rootPadding || '').trim()) add('recommendation', 'No root padding, so full-width content touches the viewport edge on phones. A clamp() is the usual fix.', 'setPadding', 'Add a clamp');
  if (tj.fluidType) add('recommendation', 'Fluid typography is on. WordPress will interpolate every font size between viewports — check your smallest size still reads at 320px.');
  if (String(tj.headingFont || '').trim() && !tj.headingStyles) add('warning', 'You defined a heading font but no heading style layer, so nothing applies it.', 'addHeadings', 'Style headings');
  if (!tj.templateParts) add('recommendation', 'No templateParts, which is fine for a hybrid theme. A full block theme usually declares its header and footer parts here.');
  return out;
}

export function freshProject(): ThemeJson {
  return {
    colors: [
      { slug: 'base', name: 'Base', color: '#FAF9F7' },
      { slug: 'contrast', name: 'Contrast', color: '#26221C' },
      { slug: 'primary', name: 'Primary', color: '#3858E9' },
      { slug: 'muted', name: 'Muted', color: '#948C7E' },
    ],
    bodyFont: '"Instrument Sans", system-ui, sans-serif', headingFont: '', baseSize: '1rem', scale: '1.25',
    contentSize: '720px', wideSize: '1200px', spacingSteps: '7', rootPadding: 'clamp(1rem, 4vw, 2rem)',
    controls: ['link', 'lineHeight', 'padding', 'margin', 'blockGap'],
    appearanceTools: true, keepCorePalette: false, fluidType: true,
    headingStyles: true, buttonStyles: true, templateParts: true, customTokens: false,
  };
}

export function applyFix(tj: ThemeJson, kind: string): ThemeJson {
  const p: ThemeJson = JSON.parse(JSON.stringify(tj));
  if (kind === 'swapSizes') { const a = p.contentSize; p.contentSize = p.wideSize; p.wideSize = a; }
  if (kind === 'setSeven') p.spacingSteps = '7';
  if (kind === 'dropCore') p.keepCorePalette = false;
  if (kind === 'setPadding') p.rootPadding = 'clamp(1rem, 4vw, 2rem)';
  if (kind === 'addHeadings') p.headingStyles = true;
  return p;
}
