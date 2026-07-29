import {
  apca, band, chromaWord, clamp, cmyk, deltaEOK, descriptiveName, fmt, foregroundForHex,
  hueName, labToLch, lchToLab, lightWord, oklchToHex, parseHex, rgbToHsl, rgbToHsv,
  rgbToLabD50, rgbToOklab, rgbToXyzD65, simulateCVD, toHex, wcag,
  type CvdKind, type OKLab, type RGB,
} from './color';
import { CSS_NAMED_COLORS, EXTRA_NAMED_COLORS } from '../data/colorNames';

/** Named colours pre-converted to OKLab once, so nearest-match is a plain sort. */
const NAMED = [...CSS_NAMED_COLORS, ...EXTRA_NAMED_COLORS].map(([name, hex]) => ({
  name,
  hex,
  lab: rgbToOklab(parseHex(hex) as RGB),
}));

export interface Swatch {
  key: string;
  hex: string;
  hexUpper: string;
  fg: string;
  isBase: boolean;
}

export interface Ramp { name: string; blurb: string; cells: Swatch[] }
export interface Harmony { name: string; blurb: string; cells: Swatch[] }

export interface ContrastCard {
  title: string;
  pairLabel: string;
  bg: string;
  fg: string;
  ratio: string;
  apca: string;
  apcaVerdict: string;
  badges: { label: string; pass: boolean }[];
}

export interface AccessibleVariant {
  key: string; hex: string; hexUpper: string; bg: string; sample: string; ratio: string; note: string;
}

export interface VisionCard {
  name: string; prevalence: string; hex: string; simHex: string; simHexUpper: string;
  fg: string; simFg: string; keyA: string; keyB: string; bandLabel: string; bandColor: string;
  deltaNote: string;
}

export interface SimilarColor {
  key: string; name: string; hex: string; hexUpper: string; fg: string;
  delta: string; bandLabel: string; bandColor: string;
}

export interface PaletteRole {
  key: string; token: string; hex: string; hexUpper: string; fg: string; check: string; checkColor: string;
}

export interface UiPalette {
  mode: 'light' | 'dark';
  title: string; note: string;
  shellBg: string; shellBorder: string; shellText: string; shellMuted: string; chipBg: string;
  roles: PaletteRole[];
}

export interface ConversionRow { key: string; label: string; display: string; value: string }

export interface ColorAnalysis {
  hex: string;
  hexUpper: string;
  stageFg: string;
  colorName: string;
  nameNote: string | null;
  oklchShort: string;
  description: string;
  L: number; C: number; H: number;
  conversions: ConversionRow[];
  ramps: Ramp[];
  harmonies: Harmony[];
  contrastCards: ContrastCard[];
  accessibleVariants: AccessibleVariant[];
  visionCards: VisionCard[];
  similarColors: SimilarColor[];
  uiPalettes: UiPalette[];
}

const WHITE: RGB = [1, 1, 1];
const BLACK: RGB = [0, 0, 0];

function swatch(key: string, hex: string, isBase = false): Swatch {
  return { key, hex, hexUpper: hex.toUpperCase(), fg: foregroundForHex(hex), isBase };
}

function apcaVerdict(lc: number): string {
  const a = Math.abs(lc);
  if (a >= 75) return 'Fine for body text at any weight';
  if (a >= 60) return 'Body text down to about 14px';
  if (a >= 45) return 'Headlines and larger text only';
  if (a >= 30) return 'Large or non-essential text';
  return 'Not for text — decorative use only';
}

const HARMONY_DEFS: [string, string, number[], number][] = [
  ['Analogous', 'Three neighbours 30° apart — calm, low tension, easy to build a page from.', [-30, 0, 30], 1],
  ['Complementary', 'Two colors opposite each other — maximum separation, strong for calls to action.', [0, 180], 0],
  ['Split complementary', 'The complement replaced by its two neighbours — the contrast without the clash.', [0, 150, 210], 0],
  ['Triadic', 'Three colors evenly spaced — balanced and lively, but needs one clear lead.', [0, 120, 240], 0],
  ['Tetradic', 'Two complementary pairs — versatile, and best with a single dominant color.', [0, 60, 180, 240], 0],
  ['Square', 'Four colors 90° apart — an even rectangle on the wheel, more contrast than tetradic.', [0, 90, 180, 270], 0],
];

const VISION_DEFS: [CvdKind, string, string][] = [
  ['protan', 'Protanopia', 'Red-sensitive cones absent — about 1.3% of men'],
  ['deutan', 'Deuteranopia', 'Green-sensitive cones absent — about 1.2% of men'],
  ['tritan', 'Tritanopia', 'Blue-sensitive cones absent — around 0.001% of people'],
  ['achroma', 'Achromatopsia', 'No color discrimination — around 0.003% of people'],
];

/**
 * Walks lightness in OKLCH until the pair clears `target`, holding hue and
 * chroma — the smallest change that makes a colour usable as text.
 */
function fitFor(bgHex: string, start: [number, number, number], target: number, dir: number): string {
  const bg = parseHex(bgHex) as RGB;
  for (let i = 0; i <= 100; i++) {
    const hex = oklchToHex([clamp(start[0] + dir * i * 0.01, 0, 1), start[1], start[2]]);
    if (wcag(parseHex(hex) as RGB, bg) >= target) return hex;
  }
  return oklchToHex(start);
}

export function analyzeColor(hex: string, severityPct: number, steps = 12): ColorAnalysis {
  const rgb = (parseHex(hex) ?? [0.88, 0.44, 0.43]) as RGB;
  const lab = rgbToOklab(rgb);
  const [L, C, H] = labToLch(lab);
  const hsl = rgbToHsl(rgb);
  const hsv = rgbToHsv(rgb);
  const xyz = rgbToXyzD65(rgb);
  const labD50 = rgbToLabD50(rgb);
  const cm = cmyk(rgb);
  const onWhite = wcag(rgb, WHITE);
  const onBlack = wcag(rgb, BLACK);
  const stageFg = onWhite >= onBlack ? '#FFFFFF' : '#14100C';
  const half = Math.floor(steps / 2);

  const mixTo = (target: OKLab, amount: number) =>
    oklchToHex(labToLch([
      lab[0] + (target[0] - lab[0]) * amount,
      lab[1] + (target[1] - lab[1]) * amount,
      lab[2] + (target[2] - lab[2]) * amount,
    ]));

  const ramp = (prefix: string, fn: (i: number) => { hex: string; base: boolean }): Swatch[] =>
    Array.from({ length: steps }, (_, i) => {
      const c = fn(i);
      return swatch(prefix + i, c.hex, c.base);
    });

  const ramps: Ramp[] = [
    {
      name: 'Shades',
      blurb: 'Mixed toward black in OKLab — darker and heavier, hue held steady.',
      cells: ramp('sh', (i) => ({ hex: i === 0 ? hex : mixTo([0, 0, 0], (i / (steps - 1)) * 0.94), base: i === 0 })),
    },
    {
      name: 'Tints',
      blurb: 'Mixed toward white — lighter and softer, the pastel direction.',
      cells: ramp('ti', (i) => ({ hex: i === 0 ? hex : mixTo([1, 0, 0], (i / (steps - 1)) * 0.94), base: i === 0 })),
    },
    {
      name: 'Tones',
      blurb: 'Mixed toward a gray of the same lightness — chroma falls, character stays.',
      cells: ramp('to', (i) => ({ hex: i === 0 ? hex : oklchToHex([L, C * (1 - (i / (steps - 1)) * 0.97), H]), base: i === 0 })),
    },
    {
      name: 'Hues',
      blurb: 'Hue rotated a full turn at fixed lightness and chroma — your color sits in the middle.',
      cells: ramp('hu', (i) => ({ hex: i === half ? hex : oklchToHex([L, C, (H + (i - half) * (360 / steps) + 360) % 360]), base: i === half })),
    },
    {
      name: 'Temperature',
      blurb: 'Hue pulled toward warm (≈55°) and cool (≈250°). A perceptual heuristic — not Kelvin color temperature.',
      cells: ramp('te', (i) => {
        const t = (i - half) / half;
        const target = t < 0 ? 250 : 55;
        const amt = Math.abs(t) * 0.55;
        const dh = ((target - H + 540) % 360) - 180;
        return { hex: i === half ? hex : oklchToHex([L, C, (H + dh * amt + 360) % 360]), base: i === half };
      }),
    },
  ];

  const harmonies: Harmony[] = HARMONY_DEFS.map(([name, blurb, offsets, baseIndex], hi) => ({
    name,
    blurb,
    cells: offsets.map((off, i) =>
      swatch(`hm${hi}-${i}`, off === 0 ? hex : oklchToHex([L, C, (H + off + 360) % 360]), i === baseIndex),
    ),
  }));

  const contrastCards: ContrastCard[] = [
    {
      title: 'On white', pairLabel: `${hex.toUpperCase()} on #FFFFFF`, bg: '#FFFFFF', fg: hex,
      ratio: `${fmt(onWhite, 2)}:1`, apca: fmt(apca(rgb, WHITE), 1), apcaVerdict: apcaVerdict(apca(rgb, WHITE)),
      badges: [
        { label: 'AA', pass: onWhite >= 4.5 }, { label: 'AAA', pass: onWhite >= 7 },
        { label: 'AA large', pass: onWhite >= 3 }, { label: 'UI', pass: onWhite >= 3 },
      ],
    },
    {
      title: 'On black', pairLabel: `${hex.toUpperCase()} on #000000`, bg: '#000000', fg: hex,
      ratio: `${fmt(onBlack, 2)}:1`, apca: fmt(apca(rgb, BLACK), 1), apcaVerdict: apcaVerdict(apca(rgb, BLACK)),
      badges: [
        { label: 'AA', pass: onBlack >= 4.5 }, { label: 'AAA', pass: onBlack >= 7 },
        { label: 'AA large', pass: onBlack >= 3 }, { label: 'UI', pass: onBlack >= 3 },
      ],
    },
  ];

  const walk = (bgRgb: RGB, dir: number) => {
    let best = hex;
    let bestRatio = wcag(rgb, bgRgb);
    for (let i = 0; i <= 100; i++) {
      const candidate = oklchToHex([clamp(L + dir * i * 0.01, 0, 1), C, H]);
      const r = wcag(parseHex(candidate) as RGB, bgRgb);
      best = candidate;
      bestRatio = r;
      if (r >= 4.5) break;
    }
    return { hex: best, ratio: bestRatio };
  };
  const varWhite = onWhite >= 4.5 ? { hex, ratio: onWhite } : walk(WHITE, -1);
  const varBlack = onBlack >= 4.5 ? { hex, ratio: onBlack } : walk(BLACK, 1);
  const accessibleVariants: AccessibleVariant[] = [
    {
      key: 'avw', hex: varWhite.hex, hexUpper: varWhite.hex.toUpperCase(), bg: '#FFFFFF',
      sample: 'Aa on white', ratio: `${fmt(varWhite.ratio, 2)}:1`,
      note: varWhite.hex === hex ? 'Your color already passes' : 'Darkened until it passes',
    },
    {
      key: 'avb', hex: varBlack.hex, hexUpper: varBlack.hex.toUpperCase(), bg: '#000000',
      sample: 'Aa on black', ratio: `${fmt(varBlack.ratio, 2)}:1`,
      note: varBlack.hex === hex ? 'Your color already passes' : 'Lightened until it passes',
    },
  ];

  const sev = severityPct / 100;
  const visionCards: VisionCard[] = VISION_DEFS.map(([kind, name, prevalence]) => {
    const sim = toHex(simulateCVD(rgb, kind, sev));
    const dE = deltaEOK(lab, rgbToOklab(parseHex(sim) as RGB));
    const [label, color] = band(dE);
    return {
      name, prevalence, hex, simHex: sim, simHexUpper: sim.toUpperCase(),
      fg: stageFg, simFg: foregroundForHex(sim),
      keyA: `cv${kind}a`, keyB: `cv${kind}b`,
      bandLabel: label === 'Near-identical' ? 'No shift' : label, bandColor: color,
      deltaNote: `ΔE OK ${fmt(dE, 3)} from the original`,
    };
  });

  const ranked = NAMED.map((n) => ({ n, d: deltaEOK(lab, n.lab) })).sort((a, b) => a.d - b.d);
  const similarColors: SimilarColor[] = ranked.slice(0, 8).map((e, i) => {
    const [label, color] = band(e.d);
    return {
      key: `sim${i}`, name: e.n.name, hex: e.n.hex, hexUpper: e.n.hex.toUpperCase(),
      fg: foregroundForHex(e.n.hex), delta: fmt(e.d, 3), bandLabel: label, bandColor: color,
    };
  });

  const buildRoles = (mode: 'light' | 'dark') => {
    const dark = mode === 'dark';
    const bg = oklchToHex(dark ? [0.17, Math.min(C, 0.014), H] : [0.985, Math.min(C, 0.01), H]);
    const surface = oklchToHex(dark ? [0.225, Math.min(C, 0.018), H] : [0.965, Math.min(C, 0.014), H]);
    const border = oklchToHex(dark ? [0.32, Math.min(C, 0.02), H] : [0.9, Math.min(C, 0.022), H]);
    const dir = dark ? 1 : -1;
    const defs: [string, string, number][] = [
      ['background', bg, 0],
      ['surface', surface, 0],
      ['border', border, 0],
      ['text', fitFor(bg, dark ? [0.96, Math.min(C, 0.02), H] : [0.24, Math.min(C, 0.03), H], 7, dir), 7],
      ['text-muted', fitFor(bg, dark ? [0.72, Math.min(C, 0.03), H] : [0.53, Math.min(C, 0.03), H], 4.5, dir), 4.5],
      ['primary', fitFor(bg, [dark ? Math.max(L, 0.62) : Math.min(L, 0.62), Math.max(C, 0.09), H], 4.5, dir), 4.5],
      ['primary-hover', fitFor(bg, [dark ? Math.max(L, 0.62) + 0.06 : Math.min(L, 0.62) - 0.06, Math.max(C, 0.09), H], 4.5, dir), 4.5],
      ['secondary', fitFor(bg, [dark ? 0.68 : 0.55, Math.max(C, 0.08) * 0.85, (H + 180) % 360], 4.5, dir), 4.5],
      ['accent', fitFor(bg, [dark ? 0.7 : 0.56, Math.max(C, 0.1), (H + 60) % 360], 4.5, dir), 4.5],
      ['success', fitFor(bg, [dark ? 0.72 : 0.52, 0.13, 150], 4.5, dir), 4.5],
      ['warning', fitFor(bg, [dark ? 0.8 : 0.62, 0.14, 85], 4.5, dir), 4.5],
      ['danger', fitFor(bg, [dark ? 0.68 : 0.52, 0.16, 25], 4.5, dir), 4.5],
    ];
    return { bg, defs };
  };

  const shells: [('light' | 'dark'), string, string, string, string, string, string][] = [
    ['light', 'Light theme', '#FFFFFF', '#E7E2D9', '#1C1A15', '#948C7E', '#FCFBF9'],
    ['dark', 'Dark theme', '#1C1A15', '#332F27', '#F0EDE6', '#A79F91', '#221F19'],
  ];
  const uiPalettes: UiPalette[] = shells.map(([mode, title, shellBg, shellBorder, shellText, shellMuted, chipBg]) => {
    const { bg, defs } = buildRoles(mode);
    const bgRgb = parseHex(bg) as RGB;
    return {
      mode, title, shellBg, shellBorder, shellText, shellMuted, chipBg,
      note: mode === 'light' ? 'Text roles target 7:1, everything else 4.5:1' : 'Same targets, lightness walked upward instead',
      roles: defs.map(([token, roleHex, target], i) => {
        const ratio = wcag(parseHex(roleHex) as RGB, bgRgb);
        const pass = target === 0 ? null : ratio >= target;
        return {
          key: `ui${mode}${i}`, token: `--${token}`, hex: roleHex, hexUpper: roleHex.toUpperCase(),
          fg: foregroundForHex(roleHex),
          check: pass === null ? 'surface' : `${fmt(ratio, 1)}:1`,
          checkColor: pass === null ? shellMuted : pass ? '#1F8A5F' : '#C4593A',
        };
      }),
    };
  });

  const r255 = rgb.map((c) => Math.round(c * 255));
  const lchC = Math.sqrt(labD50[1] * labD50[1] + labD50[2] * labD50[2]);
  const lchH = ((Math.atan2(labD50[2], labD50[1]) * 180) / Math.PI + 360) % 360;
  const conversions: ConversionRow[] = ([
    ['HEX', hex.toUpperCase(), hex.toUpperCase()],
    ['RGB', `${r255[0]}, ${r255[1]}, ${r255[2]}`, `rgb(${r255[0]} ${r255[1]} ${r255[2]})`],
    ['HSL', `${fmt(hsl[0])}°, ${fmt(hsl[1] * 100)}%, ${fmt(hsl[2] * 100)}%`, `hsl(${fmt(hsl[0])} ${fmt(hsl[1] * 100)}% ${fmt(hsl[2] * 100)}%)`],
    ['HSB', `${fmt(hsv[0])}°, ${fmt(hsv[1] * 100)}%, ${fmt(hsv[2] * 100)}%`, `${fmt(hsv[0])}, ${fmt(hsv[1] * 100)}, ${fmt(hsv[2] * 100)}`],
    ['HWB', `${fmt(hsl[0])}°, ${fmt(Math.min(...rgb) * 100)}%, ${fmt((1 - Math.max(...rgb)) * 100)}%`, `hwb(${fmt(hsl[0])} ${fmt(Math.min(...rgb) * 100)}% ${fmt((1 - Math.max(...rgb)) * 100)}%)`],
    ['OKLCH', `${fmt(L * 100, 1)}%, ${fmt(C, 3)}, ${fmt(H, 1)}°`, `oklch(${fmt(L * 100, 1)}% ${fmt(C, 3)} ${fmt(H, 1)})`],
    ['OKLAB', `${fmt(L, 3)}, ${fmt(lab[1], 3)}, ${fmt(lab[2], 3)}`, `oklab(${fmt(L * 100, 1)}% ${fmt(lab[1], 3)} ${fmt(lab[2], 3)})`],
    ['LAB', `${fmt(labD50[0], 1)}, ${fmt(labD50[1], 1)}, ${fmt(labD50[2], 1)}`, `lab(${fmt(labD50[0], 1)}% ${fmt(labD50[1], 1)} ${fmt(labD50[2], 1)})`],
    ['LCH', `${fmt(labD50[0], 1)}, ${fmt(lchC, 1)}, ${fmt(lchH, 1)}°`, `lch(${fmt(labD50[0], 1)}% ${fmt(lchC, 1)} ${fmt(lchH, 1)})`],
    ['XYZ', `${fmt(xyz[0] * 100, 2)}, ${fmt(xyz[1] * 100, 2)}, ${fmt(xyz[2] * 100, 2)}`, `${fmt(xyz[0], 4)} ${fmt(xyz[1], 4)} ${fmt(xyz[2], 4)}`],
    ['CMYK', `${fmt(cm[0])}, ${fmt(cm[1])}, ${fmt(cm[2])}, ${fmt(cm[3])} (approx.)`, `${fmt(cm[0])}, ${fmt(cm[1])}, ${fmt(cm[2])}, ${fmt(cm[3])}`],
  ] as [string, string, string][]).map(([label, display, value], i) => ({ key: `cv${i}`, label, display, value }));

  const nearest = ranked[0]?.n ?? { name: 'Unnamed', hex, lab };
  const nearestD = ranked[0]?.d ?? 0;
  // 0.05 is where band() stops calling two colors "very close".
  const namedExactly = nearestD < 0.05;
  const neutral = C < 0.02;

  const description =
    (neutral
      ? hex === '#ffffff'
        ? 'Pure white — no chroma at all, so there is no hue to describe. '
        : hex === '#000000'
          ? 'Pure black — no chroma, no hue, and the reference point every contrast ratio on this page is measured against. '
          : `A neutral ${L > 0.94 ? 'off-white' : L < 0.08 ? 'near-black' : 'gray'}, ${lightWord(L)} at ${fmt(L * 100)}% perceptual lightness with effectively no chroma. `
      : `A ${chromaWord(C)} ${hueName(H)}, ${lightWord(L)} at ${fmt(L * 100)}% perceptual lightness with chroma ${fmt(C, 3)}. `) +
    (onWhite >= 4.5
      ? 'It clears 4.5:1 on white, so it works as body text as well as a fill.'
      : onBlack >= 4.5
        ? 'It clears 4.5:1 on black but not on white — treat it as a fill, or use it as text on dark surfaces.'
        : 'It fails 4.5:1 on both white and black, so keep it for fills and borders rather than text.');

  return {
    hex, hexUpper: hex.toUpperCase(), stageFg,
    colorName: namedExactly ? nearest.name : descriptiveName(L, C, H),
    nameNote: namedExactly ? null : `Closest named color: ${nearest.name} · ΔE OK ${fmt(nearestD, 3)}`,
    oklchShort: `oklch(${fmt(L * 100, 1)}% ${fmt(C, 3)} ${fmt(H, 1)})`,
    description,
    L, C, H,
    conversions, ramps, harmonies, contrastCards, accessibleVariants, visionCards, similarColors, uiPalettes,
  };
}

/** A pleasing random colour — bounded lightness/chroma so it's never mud or neon. */
export function randomHex(): string {
  return oklchToHex([0.25 + Math.random() * 0.55, 0.06 + Math.random() * 0.2, Math.random() * 360]);
}

export { lchToLab };
