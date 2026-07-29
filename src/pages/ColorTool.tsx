import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { analyzeColor, randomHex } from '../lib/colorAnalysis';
import { clamp, fmt, hsvToRgb, parseHex, rgbToHsv, toHex, type RGB } from '../lib/color';
import { usePageMeta } from '../lib/usePageMeta';
import { useJsonLd } from '../lib/useJsonLd';
import { trackEvent } from '../lib/analytics';
import { ToolContentSection } from '../components/generator/ToolContentSection';
import { getToolContent } from '../data/toolContent/index';
import { TOOL_MAP } from '../data/tools';
import { Icon } from '../components/ui/Icon';
import { isEyeDropperSupported, pickScreenColor } from '../lib/eyeDropper';
import { parseCssColor } from '../lib/cssColor';
import { CONTENT_REVIEWED } from '../data/contentMeta';

const BASE_URL = 'https://www.wpcodekit.com';
const STORAGE_KEY = 'color-tool-v1';
const DEFAULT_HEX = '#e1706d';
const RAMP_STEPS = 12;

const SECTIONS = [
  ['conversion', 'Conversion'],
  ['variations', 'Variations'],
  ['harmonies', 'Harmonies'],
  ['contrast', 'Contrast'],
  ['vision', 'Color vision'],
  ['similar', 'Similar'],
  ['palette', 'UI palette'],
];

/**
 * The Color Tool.
 *
 * Deliberately does NOT use GeneratorShell — it is not a code generator and has
 * no form/output split, no validation panel and no output modes. It shares only
 * the site chrome and the long-form content section. Interaction model: every
 * colour on the page is a `[data-hex]` element, and one delegated click handler
 * on the wrapper copies it, so adding a swatch anywhere needs no extra wiring.
 */
export function ColorTool() {
  const tool = TOOL_MAP['color'];
  const content = getToolContent('color');

  const [hex, setHexState] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved && parseHex(saved)) return toHex(parseHex(saved) as RGB);
    } catch { /* ignore */ }
    return DEFAULT_HEX;
  });
  const [hexField, setHexField] = useState(() => hex.slice(1));
  /**
   * The picker's own H/S/V, and the source of truth while you drag.
   *
   * Deriving it back from the committed hex is what made the handle jump: hex is
   * 8-bit, so near the bottom of the square (V -> 0) it can no longer carry
   * enough precision to reconstruct S, and at pure black S and H are undefined
   * entirely — so the dot snapped to the left edge and the hue was lost. Keeping
   * HSV here means dragging is smooth and hue survives a trip through black.
   */
  const [hsv, setHsvState] = useState<[number, number, number]>(() => rgbToHsv(parseHex(hex) as RGB));
  const hsvRef = useRef(hsv);
  const [severity, setSeverity] = useState(100);
  const [hover, setHover] = useState<{ key: string; hex: string } | null>(null);
  const [copied, setCopied] = useState<{ key: string; hex: string } | null>(null);

  /** Whether the input still holds a plain hex value, which is what the `#` prefix belongs to. */
  const fieldIsHex = /^[0-9a-fA-F]*$/.test(hexField);

  const squareRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<'sq' | 'hue' | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const commit = useCallback((clean: string) => {
    try { localStorage.setItem(STORAGE_KEY, clean); } catch { /* ignore */ }
    setHexState(clean);
  }, []);

  /**
   * A colour arriving from outside the picker — typed, pasted, dropper, random,
   * or a clicked swatch. Accepts any CSS colour notation, not just hex.
   *
   * `syncField` is false while you are typing, because a half-finished value can
   * be perfectly valid (`e17` is a colour) and overwriting the text under the
   * cursor with its expansion makes the field impossible to type into.
   * Returns whether the value parsed, so Enter can reject a bad one.
   */
  const setHex = useCallback((next: string, syncField = true): boolean => {
    const clean = parseCssColor(next);
    if (!clean) return false;
    const nextHsv = rgbToHsv(parseHex(clean) as RGB);
    hsvRef.current = nextHsv;
    setHsvState(nextHsv);
    commit(clean);
    if (syncField) setHexField(clean.slice(1));
    return true;
  }, [commit]);

  /** A colour coming from the picker — HSV leads, hex is derived from it. */
  const setFromHsv = useCallback((next: [number, number, number]) => {
    hsvRef.current = next;
    setHsvState(next);
    const clean = toHex(hsvToRgb(next[0], next[1], next[2]));
    commit(clean);
    setHexField(clean.slice(1));
  }, [commit]);

  // Reads HSV from the ref rather than state so the pointermove listener below
  // never needs re-registering mid-drag.
  const applyDrag = useCallback((e: { clientX: number; clientY: number }) => {
    const which = dragRef.current;
    const el = which === 'sq' ? squareRef.current : hueRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const [h, s, v] = hsvRef.current;
    if (which === 'sq') {
      setFromHsv([
        h,
        clamp((e.clientX - r.left) / r.width, 0, 1),
        1 - clamp((e.clientY - r.top) / r.height, 0, 1),
      ]);
    } else {
      // Falling back to 1 keeps the slider useful when the colour is currently
      // black or fully desaturated, where a hue change would otherwise be invisible.
      setFromHsv([clamp((e.clientX - r.left) / r.width, 0, 1) * 360, s || 1, v || 1]);
    }
  }, [setFromHsv]);

  useEffect(() => {
    function onMove(e: PointerEvent) {
      if (!dragRef.current) return;
      e.preventDefault();
      applyDrag(e);
    }
    function onUp() { dragRef.current = null; }
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [applyDrag]);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  const copy = useCallback((value: string, key: string) => {
    const text = value.toUpperCase();
    navigator.clipboard?.writeText(text).catch(() => { /* ignore */ });
    if (copyTimer.current) clearTimeout(copyTimer.current);
    setCopied({ key, hex: text });
    copyTimer.current = setTimeout(() => setCopied(null), 1400);
    trackEvent('color_copied', { value: text });
  }, []);

  /** One delegated handler for every `[data-hex]` swatch on the page. */
  const onSwatchClick = useCallback((e: React.MouseEvent) => {
    const t = (e.target as HTMLElement).closest?.('[data-hex]') as HTMLElement | null;
    if (!t) return;
    copy(t.getAttribute('data-hex') || '', t.getAttribute('data-key') || '');
  }, [copy]);

  const onSwatchOver = useCallback((e: React.MouseEvent) => {
    const t = (e.target as HTMLElement).closest?.('[data-hex]') as HTMLElement | null;
    const key = t?.getAttribute('data-key') ?? null;
    setHover((prev) => (prev?.key === key ? prev : key ? { key, hex: t!.getAttribute('data-hex') || '' } : null));
  }, []);

  const onSwatchKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key !== 'Enter' && e.key !== ' ') return;
    const t = (e.target as HTMLElement).closest?.('[data-hex]') as HTMLElement | null;
    if (!t) return;
    e.preventDefault();
    copy(t.getAttribute('data-hex') || '', t.getAttribute('data-key') || '');
  }, [copy]);

  // Feature-detected once: Chromium ships the EyeDropper API, Firefox and Safari
  // do not. The button stays visible but disabled elsewhere, so the capability is
  // discoverable rather than silently missing.
  const [canEyedrop] = useState(isEyeDropperSupported);
  const [picking, setPicking] = useState(false);

  const openEyedropper = useCallback(async () => {
    setPicking(true);
    const picked = await pickScreenColor();
    setPicking(false);
    if (picked) setHex(picked);
  }, [setHex]);

  const a = useMemo(() => analyzeColor(hex, severity, RAMP_STEPS), [hex, severity]);

  usePageMeta(
    'Color Palette Generator — Conversions, Contrast & Harmonies | WP CodeKit',
    'Paste a hex code for every conversion, shade and tint ramp, colour harmony, WCAG and APCA contrast check, colour-blindness simulation and a contrast-corrected UI palette.',
    '/tools/color',
    { rawTitle: true },
  );

  useJsonLd('ld-breadcrumb', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Generators', item: `${BASE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: 'Design', item: `${BASE_URL}/category/design` },
      { '@type': 'ListItem', position: 4, name: 'Color Tool', item: `${BASE_URL}/tools/color` },
    ],
  });

  useJsonLd('ld-tool', {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${BASE_URL}/tools/color#app`,
    name: 'Color Palette Generator',
    url: `${BASE_URL}/tools/color`,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any (runs in the browser)',
    description: 'Convert a colour across ten models and generate variation ramps, harmonies, WCAG and APCA contrast checks, colour-vision simulations and a contrast-corrected UI palette — all calculated in OKLCH.',
    featureList: ['Colour conversion across 10 models', 'Shade, tint, tone, hue and temperature ramps', 'Six colour harmonies', 'WCAG 2.1 and APCA contrast', 'Colour-blindness simulation', 'Semantic UI palette generation'],
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': `${BASE_URL}/#organization` },
    isPartOf: { '@id': `${BASE_URL}/#website` },
    dateModified: CONTENT_REVIEWED,
    inLanguage: 'en',
  });

  const readoutHex = copied?.hex ?? (hover ? hover.hex.toUpperCase() : a.hexUpper);
  const labelFor = (key: string, hexValue: string) =>
    copied?.key === key ? 'Copied' : hexValue.slice(1).toUpperCase();
  const showLabel = (key: string) => (hover?.key === key || copied?.key === key ? 1 : 0);

  return (
    <>
      <div onClick={onSwatchClick} onMouseOver={onSwatchOver} onMouseLeave={() => setHover(null)} onKeyDown={onSwatchKey}>

        {/* Stage — the whole band takes the colour */}
        <div className="ct-stage" style={{ background: hex }}>
          <div className="gfw-container ct-stage-inner">
            <div className="ct-stage-main">
              <p className="ct-eyebrow" style={{ color: a.stageFg }}>Color tool</p>
              <h1 className="ct-name" style={{ color: a.stageFg }}>{a.colorName}</h1>
              <p className="ct-codes gfw-mono" style={{ color: a.stageFg }}>{a.hexUpper} · {a.oklchShort}</p>
              {a.nameNote && <p className="ct-name-note" style={{ color: a.stageFg }}>{a.nameNote}</p>}
              <p className="ct-desc" style={{ color: a.stageFg }}>{a.description}</p>
            </div>

            <div className="ct-picker">
              <div
                ref={squareRef}
                onPointerDown={(e) => { dragRef.current = 'sq'; applyDrag(e); }}
                className="ct-sat"
                style={{ background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)), hsl(${fmt(hsv[0], 1)} 100% 50%)` }}
                role="application"
                aria-label="Saturation and brightness picker"
              >
                <span className="ct-sat-dot" style={{ left: `${fmt(hsv[1] * 100, 2)}%`, top: `${fmt((1 - hsv[2]) * 100, 2)}%`, background: hex }} />
              </div>
              <div
                ref={hueRef}
                onPointerDown={(e) => { dragRef.current = 'hue'; applyDrag(e); }}
                className="ct-hue"
                role="application"
                aria-label="Hue slider"
              >
                <span className="ct-hue-dot" style={{ left: `${fmt((hsv[0] / 360) * 100, 2)}%`, background: `hsl(${fmt(hsv[0], 1)} 100% 50%)` }} />
              </div>
              <div className="ct-hex-row">
                <div className={`ct-hex-input${fieldIsHex ? '' : ' is-freeform'}`}>
                  {/* The # is chrome, not content — so it is hidden the moment the
                      field holds something that isn't a bare hex value. */}
                  {fieldIsHex && <span aria-hidden="true" className="gfw-mono">#</span>}
                  <input
                    value={hexField}
                    onChange={(e) => {
                      const v = e.target.value;
                      setHexField(/^#[0-9a-fA-F]*$/.test(v) ? v.slice(1) : v);
                      setHex(v, false);
                    }}
                    // Whatever notation went in, the field settles back to the
                    // canonical hex — which is also the confirmation that it parsed.
                    onBlur={() => setHexField(hex.slice(1))}
                    onKeyDown={(e) => {
                      if (e.key !== 'Enter') return;
                      if (!setHex(hexField)) setHexField(hex.slice(1));
                    }}
                    spellCheck={false}
                    autoCapitalize="off"
                    autoCorrect="off"
                    aria-label="Color value — hex, rgb, hsl, oklch or a color name"
                    className="gfw-mono"
                  />
                </div>
                <button
                  type="button"
                  onClick={openEyedropper}
                  disabled={!canEyedrop || picking}
                  aria-label="Pick a color from anywhere on screen"
                  title={canEyedrop ? 'Pick a color from anywhere on screen' : 'Screen picking needs Chrome, Edge or Opera'}
                  className={`ct-icon-btn${picking ? ' is-active' : ''}`}
                >
                  <Icon name="eyedropper" size={16} />
                </button>
                <button type="button" onClick={() => setHex(randomHex())} aria-label="Random color" title="Random color" className="ct-icon-btn"><Icon name="shuffle" size={16} /></button>
              </div>
              <p className="ct-picker-hint">
                Paste any CSS color — <code>rgb()</code>, <code>hsl()</code>, <code>oklch()</code>, <code>lab()</code> or a name like <code>rebeccapurple</code>.{' '}
                {canEyedrop
                  ? 'Or use the dropper to sample any pixel on your screen.'
                  : 'Click any color on this page to copy it.'}
              </p>
            </div>
          </div>
        </div>

        {/* Sticky readout + section nav */}
        <div className="ct-sticky">
          <div className="gfw-container ct-sticky-inner">
            <div className="ct-sticky-swatch">
              <span data-hex={hex} data-key="sticky" role="button" tabIndex={0} aria-label={`Copy ${a.hexUpper}`} style={{ background: hex }} />
              <span className="gfw-mono">{readoutHex}</span>
            </div>
            <span className="ct-sticky-sep" />
            <nav className="ct-nav" aria-label="Sections">
              {SECTIONS.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}
            </nav>
            <div style={{ flex: 1, minWidth: 6 }} />
            <span className="ct-sticky-note" style={{ color: copied ? '#1F8A5F' : 'var(--gfw-text-mutest)' }}>
              {copied ? 'Copied to clipboard' : 'Click any color to copy'}
            </span>
          </div>
        </div>

        <div className="gfw-container ct-body">

          <section id="conversion">
            <h2 className="ct-h2">Conversion</h2>
            <p className="ct-lede">The same color in every model a designer or developer is likely to need. Click a row to copy the value.</p>
            <div className="ct-conv-grid">
              {[a.conversions.slice(0, 6), a.conversions.slice(6)].map((col, ci) => (
                <div key={ci} className="ct-card ct-conv-col">
                  {col.map((row, ri) => (
                    <button
                      key={row.key}
                      type="button"
                      onClick={() => copy(row.value, row.key)}
                      className="ct-conv-row"
                      style={{ borderTop: ri === 0 ? 'none' : '1px solid var(--gfw-border-muted)', background: copied?.key === row.key ? 'var(--gfw-accent-tint)' : '#fff' }}
                    >
                      <span className="ct-conv-label">{row.label}</span>
                      <span className="ct-conv-value gfw-mono">{copied?.key === row.key ? 'Copied' : row.display}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </section>

          <section id="variations">
            <h2 className="ct-h2">Variations</h2>
            <p className="ct-lede">Shades, tints, tones, hues and temperature — every ramp mixed in OKLab and gamut-mapped back to sRGB, so the steps look evenly spaced rather than merely being evenly numbered. The ring marks your color.</p>
            <div className="ct-ramp-stack">
              {a.ramps.map((ramp) => (
                <div key={ramp.name}>
                  <div className="ct-ramp-head">
                    <span className="ct-ramp-name">{ramp.name}</span>
                    <span className="ct-ramp-blurb">{ramp.blurb}</span>
                  </div>
                  <div className="ct-ramp-row">
                    {ramp.cells.map((c) => (
                      <div
                        key={c.key}
                        data-hex={c.hex}
                        data-key={c.key}
                        role="button"
                        tabIndex={0}
                        aria-label={`Copy ${c.hexUpper}`}
                        title={c.hexUpper}
                        className="ct-cell ct-cell-tall"
                        style={{ background: c.hex }}
                      >
                        <span className="ct-cell-label gfw-mono" style={{ color: c.fg, opacity: showLabel(c.key) }}>{labelFor(c.key, c.hex)}</span>
                        {c.isBase && <span aria-hidden="true" className="ct-base-ring" style={{ borderColor: c.fg }} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="harmonies">
            <h2 className="ct-h2">Color harmonies</h2>
            <p className="ct-lede">Harmonies are hue rotations around the color wheel. Lightness and chroma are held steady, then chroma is reduced only where a rotation lands outside sRGB — which is why some sets look calmer than others.</p>
            <div className="ct-harmony-grid">
              {a.harmonies.map((h) => (
                <div key={h.name} className="ct-card ct-harmony">
                  <div className="ct-harmony-name">{h.name}</div>
                  <p className="ct-harmony-blurb">{h.blurb}</p>
                  <div className="ct-ramp-row">
                    {h.cells.map((c) => (
                      <div
                        key={c.key}
                        data-hex={c.hex}
                        data-key={c.key}
                        role="button"
                        tabIndex={0}
                        aria-label={`Copy ${c.hexUpper}`}
                        title={c.hexUpper}
                        className="ct-cell"
                        style={{ background: c.hex }}
                      >
                        <span className="ct-cell-label gfw-mono" style={{ color: c.fg, opacity: showLabel(c.key) }}>{labelFor(c.key, c.hex)}</span>
                        {c.isBase && <span aria-hidden="true" className="ct-base-ring" style={{ borderColor: c.fg }} />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="contrast">
            <h2 className="ct-h2">Contrast checker</h2>
            <p className="ct-lede">WCAG 2.1 ratios come from relative luminance. APCA is the perceptual method drafted for WCAG 3 — it reports a lightness contrast value (Lc) rather than a ratio, and judges light-on-dark differently from dark-on-light. Both are shown because they disagree, and that disagreement is useful.</p>
            <div className="ct-contrast-grid">
              {a.contrastCards.map((cc) => (
                <div key={cc.title} className="ct-card ct-contrast">
                  <div className="ct-contrast-head">
                    <span className="ct-contrast-title">{cc.title}</span>
                    <span className="gfw-mono ct-contrast-pair">{cc.pairLabel}</span>
                  </div>
                  <div className="ct-contrast-sample" style={{ background: cc.bg }}>
                    <div className="ct-contrast-h" style={{ color: cc.fg }}>Large heading text</div>
                    <p className="ct-contrast-p" style={{ color: cc.fg }}>Body copy at 14.5px. If this looks strained, the numbers below will already have told you — trust them over your monitor.</p>
                  </div>
                  <div className="ct-contrast-foot">
                    <div className="ct-contrast-line">
                      <span className="gfw-mono ct-contrast-num">{cc.ratio}</span>
                      <span className="ct-contrast-std">WCAG 2.1</span>
                      <div style={{ flex: 1, minWidth: 4 }} />
                      <div className="ct-badges">
                        {cc.badges.map((b) => (
                          <span key={b.label} className="ct-badge" style={{ background: b.pass ? '#E8F4EC' : '#FBEDEA', color: b.pass ? '#1F6B45' : '#9B3218' }}>
                            {b.label} {b.pass ? '✓' : '✗'}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="ct-contrast-line ct-contrast-line-top">
                      <span className="gfw-mono ct-contrast-num">{cc.apca}</span>
                      <span className="ct-contrast-std">APCA Lc</span>
                      <div style={{ flex: 1, minWidth: 4 }} />
                      <span className="ct-apca-verdict">{cc.apcaVerdict}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="ct-card ct-accessible">
              <div className="ct-accessible-title">Accessible variants of this color</div>
              <p className="ct-accessible-note">Same hue and chroma, lightness walked until the pair clears 4.5:1 — the smallest change that makes your color usable as text.</p>
              <div className="ct-accessible-grid">
                {a.accessibleVariants.map((av) => (
                  <div key={av.key} data-hex={av.hex} data-key={av.key} role="button" tabIndex={0} aria-label={`Copy ${av.hexUpper}`} className="ct-av">
                    <div className="ct-av-top" style={{ background: av.bg }}>
                      <span className="ct-av-sample" style={{ color: av.hex }}>{av.sample}</span>
                      <span className="gfw-mono ct-av-hex" style={{ color: av.hex }}>{av.hexUpper}</span>
                    </div>
                    <div className="ct-av-foot">
                      <span>{av.note}</span>
                      <span className="gfw-mono ct-av-ratio">{av.ratio}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section id="vision">
            <div className="ct-vision-head">
              <h2 className="ct-h2" style={{ margin: 0 }}>Color vision simulation</h2>
              <div className="ct-severity">
                <span className="ct-severity-label">Severity</span>
                <input type="range" min={0} max={100} step={5} value={severity} onChange={(e) => setSeverity(parseInt(e.target.value, 10))} aria-label="Simulation severity" />
                <span className="gfw-mono ct-severity-value">{severity}%</span>
              </div>
            </div>
            <p className="ct-lede">Simulated with the Machado, Oliveira and Fernandes model, which uses severity-dependent matrices in linear RGB rather than crudely stripping a channel. Prevalence figures are population statistics, not something derived from your color.</p>
            <div className="ct-vision-grid">
              {a.visionCards.map((v) => (
                <div key={v.name} className="ct-card ct-vision">
                  <div className="ct-vision-title">
                    <span className="ct-vision-name">{v.name}</span>
                    <span className="ct-vision-band" style={{ color: v.bandColor }}>{v.bandLabel}</span>
                  </div>
                  <div className="ct-vision-prev">{v.prevalence}</div>
                  <div className="ct-ramp-row">
                    <div data-hex={v.hex} data-key={v.keyA} role="button" tabIndex={0} aria-label={`Copy ${a.hexUpper}`} title={a.hexUpper} className="ct-cell ct-vision-cell ct-vision-cell-l" style={{ background: v.hex }}>
                      <span className="ct-vision-tag" style={{ color: v.fg }}>Actual</span>
                    </div>
                    <div data-hex={v.simHex} data-key={v.keyB} role="button" tabIndex={0} aria-label={`Copy ${v.simHexUpper}`} title={v.simHexUpper} className="ct-cell ct-vision-cell ct-vision-cell-r" style={{ background: v.simHex }}>
                      <span className="ct-vision-tag" style={{ color: v.simFg }}>Simulated</span>
                      <span className="gfw-mono ct-vision-hex" style={{ color: v.simFg, opacity: showLabel(v.keyB) }}>{labelFor(v.keyB, v.simHex)}</span>
                    </div>
                  </div>
                  <div className="ct-vision-delta">{v.deltaNote}</div>
                </div>
              ))}
            </div>
          </section>

          <section id="similar">
            <h2 className="ct-h2">Similar named colors</h2>
            <p className="ct-lede">Nearest matches by ΔE OK — straight-line distance in OKLab, the closest thing to “how different do these look”. Distance is shown as a raw number with a plain-language band, because a “95% similar” score isn’t a real unit.</p>
            <div className="ct-similar-grid">
              {a.similarColors.map((s) => (
                <div key={s.key} data-hex={s.hex} data-key={s.key} role="button" tabIndex={0} aria-label={`Copy ${s.hexUpper}`} className="ct-card ct-similar">
                  <div className="ct-similar-swatch" style={{ background: s.hex }}>
                    <span className="gfw-mono ct-cell-label" style={{ color: s.fg, opacity: showLabel(s.key) }}>{labelFor(s.key, s.hex)}</span>
                  </div>
                  <div className="ct-similar-body">
                    <div className="ct-similar-name">{s.name}</div>
                    <div className="ct-similar-meta">
                      <span className="gfw-mono">{s.hexUpper}</span>
                      <span style={{ color: s.bandColor, fontWeight: 700, fontSize: 11 }}>{s.bandLabel}</span>
                    </div>
                    <div className="gfw-mono ct-similar-delta">ΔE OK {s.delta}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section id="palette">
            <h2 className="ct-h2">Semantic UI palette</h2>
            <p className="ct-lede">A harmony gives you related hues; an interface needs named roles that pass contrast. Each color below is generated in OKLCH from your hue, then its lightness is walked until it clears its target ratio against the surface it sits on — so the palette is usable, not just pretty.</p>
            <div className="ct-palette-stack">
              {a.uiPalettes.map((p) => (
                <div key={p.mode} className="ct-palette" style={{ background: p.shellBg, borderColor: p.shellBorder }}>
                  <div className="ct-palette-head">
                    <span style={{ color: p.shellText, fontSize: 14.5, fontWeight: 700 }}>{p.title}</span>
                    <span style={{ color: p.shellMuted, fontSize: 12 }}>{p.note}</span>
                  </div>
                  <div className="ct-palette-grid">
                    {p.roles.map((r) => (
                      <div key={r.key} data-hex={r.hex} data-key={r.key} role="button" tabIndex={0} aria-label={`Copy ${r.hexUpper}`} className="ct-role" style={{ borderColor: p.shellBorder, background: p.chipBg }}>
                        <div className="ct-role-swatch" style={{ background: r.hex }}>
                          <span className="gfw-mono ct-cell-label" style={{ color: r.fg, opacity: showLabel(r.key) }}>{labelFor(r.key, r.hex)}</span>
                        </div>
                        <div className="ct-role-body">
                          <div className="gfw-mono ct-role-token" style={{ color: p.shellText }}>{r.token}</div>
                          <div className="ct-role-meta">
                            <span className="gfw-mono" style={{ color: p.shellMuted, fontSize: 10.5 }}>{r.hexUpper}</span>
                            <span style={{ color: r.checkColor, fontSize: 10.5, fontWeight: 700 }}>{r.check}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

        </div>
      </div>

      {tool && content && <ToolContentSection tool={tool} content={content} />}
    </>
  );
}
