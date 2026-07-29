import {
  clamp, hslToRgb, hwbToRgb, labD50ToRgb, lchD50ToRgb, lchToLab, oklabToRgb, p3ToRgb,
  parseHex, toHex, xyzD65ToRgb, linearToRgb, type RGB,
} from './color';
import { CSS_NAMED_COLORS, EXTRA_NAMED_COLORS } from '../data/colorNames';

/**
 * Parses any CSS colour notation into a hex string.
 *
 * Deliberately more permissive than a browser would be — this is a paste target,
 * not a stylesheet parser, so it accepts legacy comma syntax and modern
 * space syntax interchangeably, tolerates missing units, and ignores alpha
 * rather than rejecting it (the tool works in opaque colour, so a pasted
 * `rgba(…, 0.5)` should still give you the colour rather than an error).
 *
 * Colours outside sRGB — most of `display-p3`, and much of `lab`/`oklch` — are
 * clamped on the way in. That is lossy, but refusing the paste would be worse.
 */

const NAME_LOOKUP: Record<string, string> = Object.fromEntries(
  [...CSS_NAMED_COLORS, ...EXTRA_NAMED_COLORS].map(([name, hex]) => [name.toLowerCase().replace(/\s+/g, ''), hex]),
);

/** Angle in any CSS unit to degrees. NaN if it isn't a number at all. */
function toDegrees(raw: string | undefined): number {
  if (raw == null) return NaN;
  const t = raw.trim();
  if (t === 'none') return 0;
  const n = parseFloat(t);
  if (!isFinite(n)) return NaN;
  if (/grad$/.test(t)) return n * 0.9;
  if (/rad$/.test(t)) return (n * 180) / Math.PI;
  if (/turn$/.test(t)) return n * 360;
  return n; // deg or unitless
}

/**
 * A component value. `pct` is what 100% means for this slot, so `rgb(50%)`
 * gives 0.5 while `lab(50%)` gives 50. NaN marks an unparseable token, which
 * is how the caller rejects things like `rgb(a b c)` instead of quietly
 * treating them as black.
 */
function num(raw: string | undefined, pct: number): number {
  if (raw == null) return NaN;
  const t = raw.trim();
  if (t === 'none') return 0; // CSS Color 4 "none" resolves to zero when mixed into another space
  const n = parseFloat(t);
  if (!isFinite(n)) return NaN;
  return t.endsWith('%') ? (n / 100) * pct : n;
}

/** Splits a functional notation's arguments, handling both `a, b, c` and `a b c / d`. */
function args(body: string): string[] {
  return body
    .split('/')[0] // everything after the slash is alpha, which this tool drops
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Builds the final hex, or null if any component failed to parse. Everything
 * funnels through here so an invalid token can never reach `toHex` and come
 * back as a plausible-looking black.
 */
function out(rgb: RGB): string | null {
  if (!rgb.every((c) => isFinite(c))) return null;
  return toHex(rgb.map((c) => clamp(c, 0, 1)) as RGB);
}

/**
 * Returns a normalised `#rrggbb`, or null if the input isn't a colour we know.
 * Alpha is parsed but discarded.
 */
export function parseCssColor(input: string): string | null {
  const raw = String(input ?? '').trim().toLowerCase();
  if (!raw) return null;

  // Named colours (CSS plus this tool's own extra vocabulary).
  const named = NAME_LOOKUP[raw.replace(/\s+/g, '')];
  if (named) return named;

  // Hex, with or without #, 3/4/6/8 digits. The 4- and 8-digit forms carry
  // alpha in their last digits, which we cut before parsing.
  const bare = raw.replace(/^#/, '');
  if (/^[0-9a-f]{3,8}$/.test(bare)) {
    const rgbPart =
      bare.length === 4 ? bare.slice(0, 3) : bare.length === 8 ? bare.slice(0, 6) : bare;
    const rgb = parseHex(rgbPart);
    if (rgb) return toHex(rgb);
  }

  const fn = raw.match(/^([a-z-]+)\(([^()]*)\)$/);
  if (!fn) return null;
  const parts = args(fn[2]);

  switch (fn[1]) {
    case 'rgb':
    case 'rgba': {
      if (parts.length < 3) return null;
      // Percentages are relative to full scale; bare numbers are 0-255.
      const ch = (v: string) => (v.trim().endsWith('%') ? num(v, 1) : num(v, 1) / 255);
      return out([ch(parts[0]), ch(parts[1]), ch(parts[2])]);
    }
    case 'hsl':
    case 'hsla': {
      if (parts.length < 3) return null;
      const [h, s, l] = [toDegrees(parts[0]), num(parts[1], 1), num(parts[2], 1)];
      if (!isFinite(h + s + l)) return null;
      return out(hslToRgb(h, clamp(s, 0, 1), clamp(l, 0, 1)));
    }
    case 'hwb': {
      if (parts.length < 3) return null;
      const [h, w, b] = [toDegrees(parts[0]), num(parts[1], 1), num(parts[2], 1)];
      if (!isFinite(h + w + b)) return null;
      return out(hwbToRgb(h, clamp(w, 0, 1), clamp(b, 0, 1)));
    }
    case 'lab': {
      if (parts.length < 3) return null;
      const lab: RGB = [num(parts[0], 100), num(parts[1], 125), num(parts[2], 125)];
      return lab.every(isFinite) ? out(labD50ToRgb(lab)) : null;
    }
    case 'lch': {
      if (parts.length < 3) return null;
      const lch: RGB = [num(parts[0], 100), num(parts[1], 150), toDegrees(parts[2])];
      return lch.every(isFinite) ? out(lchD50ToRgb(lch)) : null;
    }
    case 'oklab': {
      if (parts.length < 3) return null;
      const lab: RGB = [num(parts[0], 1), num(parts[1], 0.4), num(parts[2], 0.4)];
      return lab.every(isFinite) ? out(oklabToRgb(lab)) : null;
    }
    case 'oklch': {
      if (parts.length < 3) return null;
      const lch: RGB = [num(parts[0], 1), num(parts[1], 0.4), toDegrees(parts[2])];
      return lch.every(isFinite) ? out(oklabToRgb(lchToLab(lch))) : null;
    }
    case 'color': {
      if (parts.length < 4) return null;
      const c: RGB = [num(parts[1], 1), num(parts[2], 1), num(parts[3], 1)];
      if (!c.every(isFinite)) return null;
      switch (parts[0]) {
        case 'srgb': return out(c);
        case 'srgb-linear': return out(linearToRgb(c));
        case 'display-p3': return out(p3ToRgb(c));
        case 'xyz':
        case 'xyz-d65': return out(xyzD65ToRgb(c));
        default: return null; // a98-rgb, prophoto-rgb, rec2020 and xyz-d50 aren't wired up
      }
    }
    default:
      return null;
  }
}

/** The formats the input advertises, for the placeholder and help text. */
export const SUPPORTED_FORMATS = 'hex, rgb, hsl, hwb, lab, lch, oklab, oklch, color(), or a colour name';
