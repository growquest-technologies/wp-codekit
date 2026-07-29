/**
 * Color science for the Color Tool.
 *
 * The whole tool calculates in OKLab/OKLCH — the perceptual space standardised
 * in CSS Color 4 — and treats sRGB/hex purely as input and output. That is what
 * makes the ramps step evenly to the eye instead of collapsing into mud at the
 * dark end, and it is why gamut mapping here reduces chroma while holding
 * lightness and hue rather than naively clipping channels.
 *
 * Everything is dependency-free and ported from the reference implementations in
 * the CSS Color 4 spec, the WCAG 2.1 contrast definition, the APCA draft, and
 * the Machado/Oliveira/Fernandes color-vision model.
 */

/** sRGB, components 0-1. */
export type RGB = [number, number, number];
/** OKLab: L 0-1, a/b roughly -0.4..0.4. */
export type OKLab = [number, number, number];
/** OKLCH: L 0-1, C 0-~0.4, H degrees. */
export type OKLCH = [number, number, number];

const M_LIN_XYZ = [
  [0.4124564, 0.3575761, 0.1804375],
  [0.2126729, 0.7151522, 0.072175],
  [0.0193339, 0.119192, 0.9503041],
];
const M_D65_D50 = [
  [1.0478112, 0.0228866, -0.050127],
  [0.0295424, 0.9904844, -0.0170491],
  [-0.0092345, 0.0150436, 0.7521316],
];
const D50 = [0.96422, 1, 0.82521];

/** Machado/Oliveira/Fernandes severity-1.0 matrices, applied in linear RGB. */
const CVD_MATRICES = {
  protan: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deutan: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritan: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
} as const;

export type CvdKind = keyof typeof CVD_MATRICES | 'achroma';

const HUE_BANDS: [number, string][] = [
  [16, 'red'], [40, 'coral red'], [62, 'orange'], [86, 'amber'], [104, 'yellow'],
  [128, 'chartreuse'], [152, 'green'], [176, 'emerald'], [198, 'teal'], [224, 'cyan'],
  [252, 'azure'], [276, 'blue'], [300, 'indigo'], [322, 'violet'], [344, 'magenta'], [361, 'rose'],
];

export function clamp(v: number, a: number, b: number): number {
  return v < a ? a : v > b ? b : v;
}
function mul(m: number[][], v: number[]): RGB {
  return [
    m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
    m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
    m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2],
  ];
}
/** sRGB transfer function, inverse (gamma -> linear). */
function lin(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
/** sRGB transfer function (linear -> gamma). */
function delin(c: number): number {
  return c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
}
function cbrt(x: number): number {
  return x < 0 ? -Math.pow(-x, 1 / 3) : Math.pow(x, 1 / 3);
}

export function parseHex(input: unknown): RGB | null {
  let h = String(input ?? '').trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(h)) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

export function toHex(rgb: RGB): string {
  return '#' + rgb.map((c) => {
    const v = Math.round(clamp(c, 0, 1) * 255).toString(16);
    return v.length < 2 ? '0' + v : v;
  }).join('');
}

export function rgbToOklab(rgb: RGB): OKLab {
  const r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
  const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToLinear(lab: OKLab): RGB {
  const l_ = lab[0] + 0.3963377774 * lab[1] + 0.2158037573 * lab[2];
  const m_ = lab[0] - 0.1055613458 * lab[1] - 0.0638541728 * lab[2];
  const s_ = lab[0] - 0.0894841775 * lab[1] - 1.291485548 * lab[2];
  const l = l_ * l_ * l_, m = m_ * m_ * m_, s = s_ * s_ * s_;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

export function oklabToRgb(lab: OKLab): RGB {
  return oklabToLinear(lab).map(delin) as RGB;
}

export function labToLch(lab: OKLab): OKLCH {
  const c = Math.sqrt(lab[1] * lab[1] + lab[2] * lab[2]);
  let h = (Math.atan2(lab[2], lab[1]) * 180) / Math.PI;
  if (h < 0) h += 360;
  return [lab[0], c, c < 0.0002 ? 0 : h];
}

export function lchToLab(lch: OKLCH): OKLab {
  const r = (lch[2] * Math.PI) / 180;
  return [lch[0], lch[1] * Math.cos(r), lch[1] * Math.sin(r)];
}

function inGamut(rgb: RGB): boolean {
  return rgb.every((c) => c >= -0.0005 && c <= 1.0005);
}

/**
 * OKLCH -> hex with gamut mapping: if the colour falls outside sRGB, binary
 * search chroma downward while holding lightness and hue. Clipping RGB channels
 * instead would shift the hue, which is exactly what makes naive ramps drift.
 */
export function oklchToHex(lch: OKLCH): string {
  const l = clamp(lch[0], 0, 1);
  let hi = Math.max(0, lch[1]);
  const direct = oklabToRgb(lchToLab([l, hi, lch[2]]));
  if (inGamut(direct)) return toHex(direct);
  let lo = 0;
  for (let i = 0; i < 22; i++) {
    const mid = (lo + hi) / 2;
    if (inGamut(oklabToRgb(lchToLab([l, mid, lch[2]])))) lo = mid;
    else hi = mid;
  }
  return toHex(oklabToRgb(lchToLab([l, lo, lch[2]])));
}

export function rgbToHsl(rgb: RGB): [number, number, number] {
  const max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
  let h = 0;
  if (d) {
    if (max === rgb[0]) h = ((rgb[1] - rgb[2]) / d) % 6;
    else if (max === rgb[1]) h = (rgb[2] - rgb[0]) / d + 2;
    else h = (rgb[0] - rgb[1]) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const l = (max + min) / 2;
  return [h, d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1)), l];
}

/** HSB and HSV are the same model. */
export function rgbToHsv(rgb: RGB): [number, number, number] {
  const max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
  return [rgbToHsl(rgb)[0], max === 0 ? 0 : d / max, max];
}

export function hsvToRgb(h: number, s: number, v: number): RGB {
  h = ((h % 360) + 360) % 360;
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  const t = [[c, x, 0], [x, c, 0], [0, c, x], [0, x, c], [x, 0, c], [c, 0, x]][Math.floor(h / 60) % 6];
  return [t[0] + m, t[1] + m, t[2] + m];
}

export function rgbToXyzD65(rgb: RGB): RGB {
  return mul(M_LIN_XYZ, rgb.map(lin));
}

/** CIE Lab, D50-adapted — the white point CSS `lab()` uses. */
export function rgbToLabD50(rgb: RGB): RGB {
  const xyz = mul(M_D65_D50, rgbToXyzD65(rgb));
  const f = xyz.map((v, i) => {
    const t = v / D50[i];
    return t > 0.008856451679 ? cbrt(t) : 7.787037037 * t + 16 / 116;
  });
  return [116 * f[1] - 16, 500 * (f[0] - f[1]), 200 * (f[1] - f[2])];
}

/**
 * Naive CMYK. Genuinely an approximation — a real conversion needs a
 * printer-specific ICC profile, so the UI labels it as such rather than
 * implying it is press-ready.
 */
export function cmyk(rgb: RGB): [number, number, number, number] {
  const k = 1 - Math.max(...rgb);
  if (k >= 0.9999) return [0, 0, 0, 100];
  return [
    ((1 - rgb[0] - k) / (1 - k)) * 100,
    ((1 - rgb[1] - k) / (1 - k)) * 100,
    ((1 - rgb[2] - k) / (1 - k)) * 100,
    k * 100,
  ];
}

/** WCAG relative luminance — not HSL lightness. */
export function luminance(rgb: RGB): number {
  const l = rgb.map(lin);
  return 0.2126 * l[0] + 0.7152 * l[1] + 0.0722 * l[2];
}

export function wcag(a: RGB, b: RGB): number {
  const l1 = luminance(a), l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

function apcaY(rgb: RGB): number {
  const y = 0.2126729 * Math.pow(rgb[0], 2.4) + 0.7151522 * Math.pow(rgb[1], 2.4) + 0.072175 * Math.pow(rgb[2], 2.4);
  return y < 0.022 ? y + Math.pow(0.022 - y, 1.414) : y;
}

/**
 * APCA lightness contrast (Lc), the perceptual method drafted for WCAG 3.
 * Sign carries direction: positive is dark text on light, negative the reverse.
 */
export function apca(textRgb: RGB, bgRgb: RGB): number {
  const yt = apcaY(textRgb), yb = apcaY(bgRgb);
  if (Math.abs(yb - yt) < 0.0005) return 0;
  if (yb > yt) {
    const s = (Math.pow(yb, 0.56) - Math.pow(yt, 0.57)) * 1.14;
    return s < 0.1 ? 0 : (s - 0.027) * 100;
  }
  const s = (Math.pow(yb, 0.65) - Math.pow(yt, 0.62)) * 1.14;
  return s > -0.1 ? 0 : (s + 0.027) * 100;
}

/** Straight-line distance in OKLab — the closest thing to "how different do these look". */
export function deltaEOK(a: OKLab, b: OKLab): number {
  return Math.sqrt(Math.pow(a[0] - b[0], 2) + Math.pow(a[1] - b[1], 2) + Math.pow(a[2] - b[2], 2));
}

/**
 * Machado/Oliveira/Fernandes simulation. Interpolates between identity and the
 * full-dichromacy matrix in linear RGB, so severity 0 is normal vision and 1 is
 * full dichromacy — rather than crudely stripping a channel.
 */
export function simulateCVD(rgb: RGB, kind: CvdKind, severity: number): RGB {
  if (kind === 'achroma') {
    const g = delin(luminance(rgb));
    return [
      rgb[0] + (g - rgb[0]) * severity,
      rgb[1] + (g - rgb[1]) * severity,
      rgb[2] + (g - rgb[2]) * severity,
    ];
  }
  const full = CVD_MATRICES[kind];
  const m: number[][] = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      m[i][j] = (i === j ? 1 : 0) * (1 - severity) + full[i][j] * severity;
    }
  }
  return mul(m, rgb.map(lin)).map((c) => delin(clamp(c, 0, 1))) as RGB;
}

export function hueName(h: number): string {
  for (const [limit, name] of HUE_BANDS) if (h < limit) return name;
  return 'red';
}

function titleCase(s: string): string {
  return s.replace(/\b[a-z]/g, (m) => m.toUpperCase());
}

export function descriptiveName(L: number, C: number, H: number): string {
  if (C < 0.02) {
    if (L > 0.985) return 'White';
    if (L < 0.03) return 'Black';
    return L < 0.25 ? 'Near Black' : L < 0.45 ? 'Dark Gray' : L < 0.68 ? 'Gray' : L < 0.88 ? 'Light Gray' : 'Off White';
  }
  const tone = L < 0.2 ? 'deep ' : L < 0.42 ? 'dark ' : L < 0.64 ? '' : L < 0.84 ? 'light ' : 'pale ';
  return titleCase(tone + (C < 0.055 ? 'muted ' : '') + hueName(H));
}

export function chromaWord(c: number): string {
  return c < 0.02 ? 'near-neutral' : c < 0.055 ? 'desaturated' : c < 0.1 ? 'muted' : c < 0.16 ? 'moderately saturated' : c < 0.24 ? 'saturated' : 'vivid';
}

export function lightWord(l: number): string {
  return l < 0.2 ? 'very dark' : l < 0.4 ? 'dark' : l < 0.62 ? 'mid-toned' : l < 0.82 ? 'light' : 'very light';
}

/**
 * Plain-language band for a ΔE OK distance. Deliberately not a "95% similar"
 * percentage: that isn't a real unit, and implying precision we don't have
 * would be worse than a coarse honest label.
 */
export function band(d: number): [string, string] {
  if (d < 0.02) return ['Near-identical', '#0B7A75'];
  if (d < 0.05) return ['Very close', '#0B7A75'];
  if (d < 0.1) return ['Close', '#3858E9'];
  if (d < 0.2) return ['Related', '#8A6A1F'];
  return ['Distinct', '#948C7E'];
}

export function fmt(n: number, d = 0): string {
  const p = Math.pow(10, d);
  return String(Math.round(n * p) / p);
}

/** Best of black/white for text on a given background. */
export function bestForeground(rgb: RGB): string {
  return wcag(rgb, [1, 1, 1]) >= wcag(rgb, [0, 0, 0]) ? '#FFFFFF' : '#14100C';
}

export function foregroundForHex(hex: string): string {
  return bestForeground(parseHex(hex) ?? [0, 0, 0]);
}
