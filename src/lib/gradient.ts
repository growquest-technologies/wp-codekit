/**
 * Gradient Tool logic — every calculation, no React.
 *
 * The whole tool is one stop list plus a small amount of geometry. The on-canvas
 * preview, the CSS, the SVG, the Tailwind value, the JSON and the exported PNG
 * are all derived from that single list, which is why the preview can never drift
 * away from the code you copy.
 *
 * Two things here are less obvious than they look:
 *
 * 1. A circle is ONE length, not two percentages. Storing a circular radial as
 *    `rx%`/`ry%` makes it round only at the preview's exact aspect ratio, so every
 *    export at another ratio came out an ellipse. CSS has `circle <length>`, which
 *    is box-independent, and that is what `rPx` holds.
 *
 * 2. The on-canvas axis is a proportional stand-in, not the real CSS gradient
 *    line. The real line runs past the box corners, which would put the 0% and
 *    100% handles off-screen at most angles; the stand-in always fits so every
 *    stop stays grabbable.
 */

import {
  clamp, fmt, oklabToRgb, parseHex, rgbToOklab, toHex, wcag, type RGB,
} from './color';
import { parseCssColorAlpha } from './cssColor';

export type GradientType = 'linear' | 'radial' | 'conic';
export type Shape = 'ellipse' | 'circle';
export type Interp = 'srgb' | 'oklab';

export interface Stop {
  id: string;
  hex: string;
  /** 0-1. */
  a: number;
  /** 0-100 along the gradient line. */
  pos: number;
  /** 0.05-0.95 — where the halfway colour lands between this stop and the next. */
  mid: number;
}

export interface GradientState {
  type: GradientType;
  angle: number;
  repeating: boolean;
  shape: Shape;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** A circle's radius as a real length, independent of any box. See the note above. */
  rPx: number;
  from: number;
  interp: Interp;
  /** Emit the one-line `in oklab` syntax instead of sampled stops. */
  nativeOklab: boolean;
  grainOn: boolean;
  grain: number;
  stops: Stop[];
}

/** The preview stage's measured size, in px. */
export interface Box { W: number; H: number }

/** The control card overlaps the bottom of the stage, so that edge reserves more room. */
export const CARD_OVERLAP = 26;

export const CHECKER =
  'linear-gradient(45deg, #E7E2D9 25%, transparent 25%), linear-gradient(-45deg, #E7E2D9 25%, transparent 25%), ' +
  'linear-gradient(45deg, transparent 75%, #E7E2D9 75%), linear-gradient(-45deg, transparent 75%, #E7E2D9 75%)';

/** Fractal-noise dither, inlined as a data URI so the CSS snippet is self-contained. */
export const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='180' height='180' filter='url(%23n)'/%3E%3C/svg%3E\")";

export const SIZES: [string, string, number, number][] = [
  ['1920x1080', 'Desktop hero — 1920 × 1080', 1920, 1080],
  ['1440x900', 'Laptop — 1440 × 900', 1440, 900],
  ['1200x630', 'Open Graph card — 1200 × 630', 1200, 630],
  ['1080x1080', 'Square post — 1080 × 1080', 1080, 1080],
  ['1080x1920', 'Story — 1080 × 1920', 1080, 1920],
  ['2560x1440', 'Retina hero — 2560 × 1440', 2560, 1440],
  ['800x400', 'Banner — 800 × 400', 800, 400],
  ['512x512', 'Icon — 512 × 512', 512, 512],
  ['custom', 'Custom size…', 0, 0],
];

type PresetStop = [string, number, number];
export const PRESETS: [string, GradientType, number, PresetStop[]][] = [
  ['Ember', 'linear', 140, [['#F5C14B', 1, 0], ['#E4633C', 1, 52], ['#8E2C52', 1, 100]]],
  ['Deep sea', 'linear', 200, [['#0B3B5C', 1, 0], ['#1E7A8C', 1, 55], ['#7FD1C1', 1, 100]]],
  ['Violet dusk', 'linear', 115, [['#3B1E6B', 1, 0], ['#7F56D9', 1, 48], ['#E6A9C8', 1, 100]]],
  ['Moss', 'linear', 165, [['#1F3D26', 1, 0], ['#4F7942', 1, 58], ['#C7D49B', 1, 100]]],
  ['Scrim', 'linear', 0, [['#12100C', 0.88, 0], ['#12100C', 0.3, 55], ['#12100C', 0, 100]]],
  ['Clay', 'linear', 130, [['#F3E4D3', 1, 0], ['#C96F4A', 1, 62], ['#7A3B2E', 1, 100]]],
  ['Spotlight', 'radial', 90, [['#FFF6DE', 1, 0], ['#F0A83C', 1, 46], ['#5B2E12', 1, 100]]],
  ['Halo', 'radial', 90, [['#FFFFFF', 0.9, 0], ['#3858E9', 0.45, 58], ['#3858E9', 0, 100]]],
  ['Wheel', 'conic', 0, [['#E14A4A', 1, 0], ['#E8C33E', 1, 20], ['#4FA86A', 1, 40], ['#3878C8', 1, 60], ['#8A4FC8', 1, 80], ['#E14A4A', 1, 100]]],
  ['Slate fade', 'linear', 180, [['#FAF9F7', 1, 0], ['#D9D3C8', 1, 100]]],
];

let UID = 0;
export function uid(): string { UID += 1; return 's' + UID; }

/**
 * Reshapes t so the halfway colour lands at `mid` — the exact curve CSS uses for a
 * colour interpolation hint (CSS Images 3), which is why the midpoint control can
 * be written as a bare percentage rather than an extra stop.
 */
export function biasT(t: number, mid: number): number {
  const m = clamp(mid, 0.05, 0.95);
  return Math.pow(t, Math.log(0.5) / Math.log(m));
}

/** `rgb(r g b / a)`, dropping the alpha component when it is fully opaque. */
export function rgbaCss(hex: string, a: number): string {
  const c = parseHex(hex) || [0, 0, 0];
  const r = Math.round(c[0] * 255), g = Math.round(c[1] * 255), b = Math.round(c[2] * 255);
  return a >= 0.999 ? `rgb(${r} ${g} ${b})` : `rgb(${r} ${g} ${b} / ${fmt(a, 3)})`;
}

export function freshGradient(): GradientState {
  return {
    type: 'linear', angle: 135, repeating: false, shape: 'ellipse',
    cx: 50, cy: 50, rx: 46, ry: 46, rPx: 170, from: 0,
    interp: 'srgb', nativeOklab: false,
    grainOn: false, grain: 6,
    stops: [
      { id: uid(), hex: '#3858E9', a: 1, pos: 0, mid: 0.5 },
      { id: uid(), hex: '#7F56D9', a: 1, pos: 50, mid: 0.5 },
      { id: uid(), hex: '#E6A9C8', a: 1, pos: 100, mid: 0.5 },
    ],
  };
}

/** The keys that get persisted. Derived from a fresh state so a new field can't be forgotten. */
export const SAVED_KEYS = Object.keys(freshGradient()) as (keyof GradientState)[];

export function sortedStops(g: GradientState): Stop[] {
  return g.stops.slice().sort((a, b) => a.pos - b.pos);
}

// --- geometry ---------------------------------------------------------------

export function maxRx(cx: number): number { return Math.max(6, 100 - cx - 3); }
export function maxRy(cy: number, box: Box): number {
  const H = Math.max(1, box.H);
  return Math.max(6, ((H - CARD_OVERLAP - 22) / H) * 100 - cy);
}
export function maxRPx(g: GradientState, box: Box, cx = g.cx, cy = g.cy): number {
  return Math.max(8, Math.min((maxRx(cx) / 100) * box.W, (maxRy(cy, box) / 100) * box.H));
}

/**
 * Every circle write goes through here, keeping the ellipse percentages in step so
 * the two stores cannot drift apart — that drift is what made switching
 * Circle -> Ellipse fall back to a stale, smaller size.
 */
export function circleFrom(g: GradientState, box: Box, rPx: number, cx = g.cx, cy = g.cy) {
  const r = clamp(rPx, 8, maxRPx(g, box, cx, cy));
  return {
    rPx: r,
    rx: clamp((r / box.W) * 100, 3, maxRx(cx)),
    ry: clamp((r / box.H) * 100, 3, maxRy(cy, box)),
  };
}

export function isCircle(g: GradientState): boolean {
  return g.type === 'radial' && g.shape === 'circle';
}

export interface Radii { circle: boolean; rx: number; ry: number; rPx?: number }
export function radii(g: GradientState, box: Box): Radii {
  if (isCircle(g)) {
    const raw = Math.max(8, g.rPx);
    // The stored length drives every output; only the handle position is clamped to
    // the stage, so shrinking the window can never shrink the gradient itself.
    const shown = Math.min(raw, maxRPx(g, box));
    return { circle: true, rPx: raw, rx: (shown / box.W) * 100, ry: (shown / box.H) * 100 };
  }
  return { circle: false, rx: Math.min(g.rx, maxRx(g.cx)), ry: Math.min(g.ry, maxRy(g.cy, box)) };
}

/** The circle radius in output-box coordinates, so CSS, SVG and canvas agree. */
export function circleRadiusFor(g: GradientState): number {
  return clamp(Math.max(8, g.rPx), 8, 20000);
}

export interface AxisGeom { W: number; H: number; dx: number; dy: number; t: number }
export function axisGeom(g: GradientState, box: Box): AxisGeom {
  const W = Math.max(1, box.W), H = Math.max(1, box.H);
  const a = (g.angle * Math.PI) / 180;
  const dx = Math.sin(a), dy = -Math.cos(a);
  const pad = 28, padBottom = 28 + CARD_OVERLAP;
  const tx = Math.abs(dx) < 1e-6 ? Infinity : (W / 2 - pad) / Math.abs(dx);
  // The axis is symmetric, so both ends must clear the card — take the larger reserve.
  const ty = Math.abs(dy) < 1e-6 ? Infinity : (H / 2 - padBottom) / Math.abs(dy);
  return { W, H, dx, dy, t: Math.max(24, Math.min(tx, ty)) };
}

/** `spread` < 1 keeps the stop track inside the rotate handles so they never overlap. */
export function pointAt(g: GradientState, box: Box, p: number, spread = 0.86) {
  const a = axisGeom(g, box);
  const off = (p - 0.5) * 2 * a.t * spread;
  return { x: ((a.W / 2 + a.dx * off) / a.W) * 100, y: ((a.H / 2 + a.dy * off) / a.H) * 100 };
}

/**
 * CSS radial size keywords, resolved against a box. Substituting "the biggest
 * radius that fits" for these silently mis-sized the most common radial form of
 * all — `circle at X Y` with no size, which means farthest-corner.
 */
export function radialKeywordSize(keywordText: string, cx: number, cy: number, box: Box) {
  const px = (cx / 100) * box.W, py = (cy / 100) * box.H;
  const closest = { rx: Math.min(px, box.W - px), ry: Math.min(py, box.H - py) };
  const farthest = { rx: Math.max(px, box.W - px), ry: Math.max(py, box.H - py) };
  const corners = [[0, 0], [box.W, 0], [0, box.H], [box.W, box.H]].map((c) => ({
    dx: Math.abs(c[0] - px), dy: Math.abs(c[1] - py), d: Math.hypot(c[0] - px, c[1] - py),
  }));
  // A corner-sized ellipse keeps the side-sized aspect ratio and passes through the corner.
  const cornerEllipse = (base: { rx: number; ry: number }, pick: 'min' | 'max') => {
    const ks = corners.map((c) => Math.sqrt((c.dx / Math.max(1, base.rx)) ** 2 + (c.dy / Math.max(1, base.ry)) ** 2));
    const k = pick === 'min' ? Math.min(...ks) : Math.max(...ks);
    return { rx: base.rx * k, ry: base.ry * k };
  };
  const dists = corners.map((c) => c.d);
  if (/closest-side/i.test(keywordText)) return { circleR: Math.min(closest.rx, closest.ry), ...closest, keyword: 'closest-side' };
  if (/farthest-side/i.test(keywordText)) return { circleR: Math.max(farthest.rx, farthest.ry), ...farthest, keyword: 'farthest-side' };
  if (/closest-corner/i.test(keywordText)) return { circleR: Math.min(...dists), ...cornerEllipse(closest, 'min'), keyword: 'closest-corner' };
  return { circleR: Math.max(...dists), ...cornerEllipse(farthest, 'max'), keyword: 'farthest-corner' };
}

// --- sampling and code generation -------------------------------------------

export interface SampledStop { hex: string; a: number; pos: number }

/**
 * The stop list expanded into something a plain sRGB consumer can render.
 *
 * A pair is subdivided into 12 steps when it needs a curve the target cannot
 * express itself — OKLab interpolation, or a moved midpoint. An untouched sRGB
 * pair stays a single segment, so the common case emits no extra stops at all.
 */
export function sampled(g: GradientState): SampledStop[] {
  const list = sortedStops(g);
  const out: SampledStop[] = [];
  const useOk = g.interp === 'oklab';
  for (let i = 0; i < list.length - 1; i++) {
    const A = list[i], B = list[i + 1];
    const la = rgbToOklab(parseHex(A.hex) || [0, 0, 0]);
    const lb = rgbToOklab(parseHex(B.hex) || [0, 0, 0]);
    const steps = (useOk || Math.abs(A.mid - 0.5) > 0.001) ? 12 : 1;
    if (i === 0) out.push({ hex: A.hex, a: A.a, pos: A.pos });
    for (let k = 1; k <= steps; k++) {
      const t = k / steps;
      const tb = biasT(t, A.mid);
      const pos = A.pos + (B.pos - A.pos) * t;
      const a = A.a + (B.a - A.a) * tb;
      let hex: string;
      if (useOk) {
        hex = toHex(oklabToRgb([la[0] + (lb[0] - la[0]) * tb, la[1] + (lb[1] - la[1]) * tb, la[2] + (lb[2] - la[2]) * tb]));
      } else {
        const ca = parseHex(A.hex) || [0, 0, 0], cb = parseHex(B.hex) || [0, 0, 0];
        hex = toHex([ca[0] + (cb[0] - ca[0]) * tb, ca[1] + (cb[1] - ca[1]) * tb, ca[2] + (cb[2] - ca[2]) * tb] as RGB);
      }
      out.push({ hex, a, pos });
    }
  }
  return out;
}

function stopListCss(g: GradientState, useNative: boolean): string[] {
  const list = sortedStops(g);
  if (useNative) {
    const parts: string[] = [];
    for (let i = 0; i < list.length; i++) {
      parts.push(rgbaCss(list[i].hex, list[i].a) + ' ' + fmt(list[i].pos, 1) + '%');
      // A bare percentage between two stops is a colour interpolation hint, not a stop.
      if (i < list.length - 1 && Math.abs(list[i].mid - 0.5) > 0.001) {
        parts.push(fmt(list[i].pos + (list[i + 1].pos - list[i].pos) * list[i].mid, 1) + '%');
      }
    }
    return parts;
  }
  return sampled(g).map((s) => rgbaCss(s.hex, s.a) + ' ' + fmt(s.pos, 1) + '%');
}

export function gradientCss(g: GradientState, box: Box, opts: { multiline?: boolean } = {}): string {
  const native = g.interp === 'srgb' || (g.interp === 'oklab' && g.nativeOklab);
  const stops = stopListCss(g, native);
  const space = (g.interp === 'oklab' && g.nativeOklab) ? 'in oklab' : '';
  const rep = g.repeating ? 'repeating-' : '';
  const join = opts.multiline ? ',\n\t' : ', ';
  const head = opts.multiline ? '\n\t' : '';
  const tail = opts.multiline ? '\n' : '';
  const pre: string[] = [];
  if (g.type === 'linear') {
    pre.push(fmt(g.angle, 0) + 'deg');
  } else if (g.type === 'radial') {
    const R = radii(g, box);
    const geom = R.circle ? `circle ${fmt(R.rPx as number, 0)}px` : `ellipse ${fmt(R.rx, 1)}% ${fmt(R.ry, 1)}%`;
    pre.push(`${geom} at ${fmt(g.cx, 1)}% ${fmt(g.cy, 1)}%`);
  } else {
    pre.push(`from ${fmt(g.from, 0)}deg at ${fmt(g.cx, 1)}% ${fmt(g.cy, 1)}%`);
  }
  if (space) pre.push(space);
  return `${rep}${g.type}-gradient(${head}${pre.join(' ')}${join}${stops.join(join)}${tail})`;
}

/** The colour at a position along the ramp — used to seed a stop added by clicking the rail. */
export function sampleAt(g: GradientState, p: number): SampledStop {
  const list = sampled(g);
  const t = clamp(p, 0, 1) * 100;
  if (t <= list[0].pos) return list[0];
  for (let i = 0; i < list.length - 1; i++) {
    if (t >= list[i].pos && t <= list[i + 1].pos) {
      const span = list[i + 1].pos - list[i].pos || 1;
      const k = (t - list[i].pos) / span;
      const ca = parseHex(list[i].hex) || [0, 0, 0], cb = parseHex(list[i + 1].hex) || [0, 0, 0];
      return {
        hex: toHex([ca[0] + (cb[0] - ca[0]) * k, ca[1] + (cb[1] - ca[1]) * k, ca[2] + (cb[2] - ca[2]) * k] as RGB),
        a: list[i].a + (list[i + 1].a - list[i].a) * k,
        pos: t,
      };
    }
  }
  return list[list.length - 1];
}

export function svgMarkup(g: GradientState, box: Box, w: number, h: number): string {
  const stops = sampled(g).map((st) => {
    const c = parseHex(st.hex) || [0, 0, 0];
    const op = st.a < 0.999 ? ` stop-opacity="${fmt(st.a, 3)}"` : '';
    return `\t\t\t<stop offset="${fmt(st.pos, 2)}%" stop-color="${toHex(c)}"${op} />`;
  }).join('\n');
  let defs: string;
  if (g.type === 'linear') {
    const a = (g.angle * Math.PI) / 180;
    const dx = Math.sin(a), dy = -Math.cos(a);
    const L = Math.abs(dx) + Math.abs(dy);
    const hx = dx / L / 2, hy = dy / L / 2;
    defs = `\t\t<linearGradient id="g" x1="${fmt(0.5 - hx, 4)}" y1="${fmt(0.5 - hy, 4)}" x2="${fmt(0.5 + hx, 4)}" y2="${fmt(0.5 + hy, 4)}">\n${stops}\n\t\t</linearGradient>`;
  } else {
    const R = radii(g, box);
    if (R.circle) {
      defs = `\t\t<radialGradient id="g" gradientUnits="userSpaceOnUse" cx="${fmt((g.cx / 100) * w, 2)}" cy="${fmt((g.cy / 100) * h, 2)}" r="${fmt(circleRadiusFor(g), 2)}">\n${stops}\n\t\t</radialGradient>`;
    } else {
      const Rmax = Math.max(R.rx, R.ry);
      defs = `\t\t<radialGradient id="g" cx="${fmt(g.cx / 100, 4)}" cy="${fmt(g.cy / 100, 4)}" r="${fmt(Rmax / 100, 4)}" gradientTransform="translate(${fmt(g.cx / 100, 4)} ${fmt(g.cy / 100, 4)}) scale(${fmt(R.rx / Rmax, 4)} ${fmt(R.ry / Rmax, 4)}) translate(${fmt(-g.cx / 100, 4)} ${fmt(-g.cy / 100, 4)})">\n${stops}\n\t\t</radialGradient>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">\n\t<defs>\n${defs}\n\t</defs>\n\t<rect width="${w}" height="${h}" fill="url(#g)" />\n</svg>`;
}

/** Paints the gradient into a 2D context at any size — the PNG export path. */
export function paintCanvas(g: GradientState, box: Box, ctx: CanvasRenderingContext2D, w: number, h: number): void {
  let list = sampled(g);
  if (g.repeating) {
    const span = list[list.length - 1].pos - list[0].pos;
    if (span > 0.5 && span < 100) {
      const tiled: SampledStop[] = [];
      const base = list[0].pos;
      for (let off = base; off < 100; off += span) {
        list.forEach((st) => {
          const p = off + (st.pos - base);
          if (p <= 100.0001) tiled.push({ hex: st.hex, a: st.a, pos: p });
        });
      }
      list = tiled;
    }
  }
  const addStops = (grad: CanvasGradient) => {
    list.forEach((st) => {
      const c = parseHex(st.hex) || [0, 0, 0];
      grad.addColorStop(clamp(st.pos / 100, 0, 1), `rgba(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)},${st.a})`);
    });
  };
  ctx.clearRect(0, 0, w, h);
  if (g.type === 'linear') {
    const a = (g.angle * Math.PI) / 180, dx = Math.sin(a), dy = -Math.cos(a);
    const L = Math.abs(w * dx) + Math.abs(h * dy);
    const grad = ctx.createLinearGradient(w / 2 - (dx * L) / 2, h / 2 - (dy * L) / 2, w / 2 + (dx * L) / 2, h / 2 + (dy * L) / 2);
    addStops(grad); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  } else if (g.type === 'radial') {
    const cx = (g.cx / 100) * w, cy = (g.cy / 100) * h;
    const R = radii(g, box);
    // Canvas has no elliptical gradient, so squash the space around the centre instead.
    const rx = Math.max(1, R.circle ? circleRadiusFor(g) : (R.rx / 100) * w);
    const ry = Math.max(1, R.circle ? circleRadiusFor(g) : (R.ry / 100) * h);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx); ctx.translate(-cx, -cy);
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rx);
    addStops(grad); ctx.fillStyle = grad;
    ctx.fillRect(-w, -h * (rx / ry) - h, w * 3, h * (rx / ry) * 3 + h * 2);
    ctx.restore();
  } else {
    const cx = (g.cx / 100) * w, cy = (g.cy / 100) * h;
    if (ctx.createConicGradient) {
      const grad = ctx.createConicGradient(((g.from - 90) * Math.PI) / 180, cx, cy);
      addStops(grad); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
    } else {
      // Older canvas: fan out 720 wedges instead.
      const R = Math.hypot(w, h);
      for (let i = 0; i < 720; i++) {
        const p = i / 720;
        const c = sampleAt(g, p);
        const rgb = parseHex(c.hex) || [0, 0, 0];
        ctx.beginPath(); ctx.moveTo(cx, cy);
        const a0 = ((g.from - 90 + p * 360) * Math.PI) / 180;
        const a1 = ((g.from - 90 + (p + 1 / 720) * 360 + 0.3) * Math.PI) / 180;
        ctx.arc(cx, cy, R, a0, a1); ctx.closePath();
        ctx.fillStyle = `rgba(${Math.round(rgb[0] * 255)},${Math.round(rgb[1] * 255)},${Math.round(rgb[2] * 255)},${c.a})`;
        ctx.fill();
      }
    }
  }
  if (g.grainOn) {
    const amt = (g.grain / 100) * 2.2;
    const img = ctx.getImageData(0, 0, w, h);
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) {
      const n = (Math.random() - 0.5) * 255 * amt;
      d[i] = clamp(d[i] + n, 0, 255);
      d[i + 1] = clamp(d[i + 1] + n, 0, 255);
      d[i + 2] = clamp(d[i + 2] + n, 0, 255);
    }
    ctx.putImageData(img, 0, 0);
  }
}

/** Worst-case WCAG contrast for black and white text anywhere along the ramp. */
export function rampLegibility(g: GradientState): { minWhite: number; minBlack: number } {
  let minWhite = 21, minBlack = 21;
  for (let i = 0; i <= 12; i++) {
    const c = sampleAt(g, i / 12);
    const rgb = parseHex(c.hex) || [0, 0, 0];
    // Composite over white, since that is what a translucent stop actually sits on.
    const over: RGB = [
      rgb[0] * c.a + (1 - c.a), rgb[1] * c.a + (1 - c.a), rgb[2] * c.a + (1 - c.a),
    ];
    minWhite = Math.min(minWhite, wcag(over, [1, 1, 1]));
    minBlack = Math.min(minBlack, wcag(over, [0.07, 0.06, 0.05]));
  }
  return { minWhite, minBlack };
}

// --- parsing pasted CSS -----------------------------------------------------

let probeEl: HTMLDivElement | null = null;
let probeCtx: CanvasRenderingContext2D | null = null;

/**
 * A colour of any CSS syntax, with its alpha.
 *
 * `parseCssColorAlpha` covers everything with a fixed grammar. Anything beyond
 * that — `color-mix()`, `currentColor`, system colours, relative colour syntax —
 * is handed to the browser, which is the only thing that can resolve them, and
 * rasterised through a canvas because modern spaces compute to themselves rather
 * than to 0-255 channels.
 */
export function resolveCssColor(str: string): { hex: string; a: number } | null {
  const text = String(str || '').trim();
  if (!text) return null;
  const direct = parseCssColorAlpha(text);
  if (direct) return direct;
  if (typeof document === 'undefined') return null;
  if (!probeEl) {
    const d = document.createElement('div');
    d.setAttribute('aria-hidden', 'true');
    d.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:0;height:0;pointer-events:none';
    document.body.appendChild(d);
    probeEl = d;
  }
  // Validate up front — a sentinel value cannot work, since any legal sentinel is
  // also a value the user might legitimately paste (e.g. #010203).
  if (typeof window.CSS?.supports === 'function') {
    if (!CSS.supports('color', text)) return null;
  } else {
    probeEl.style.color = '';
    probeEl.style.color = text;
    if (!probeEl.style.color) return null;
  }
  probeEl.style.color = text;
  const computed = getComputedStyle(probeEl).color;
  if (/^rgba?\(/i.test(computed)) {
    const nums = computed.match(/[-\d.]+/g);
    if (nums && nums.length >= 3) {
      return {
        hex: toHex([Number(nums[0]) / 255, Number(nums[1]) / 255, Number(nums[2]) / 255]),
        a: clamp(nums.length > 3 ? parseFloat(nums[3]) : 1, 0, 1),
      };
    }
  }
  try {
    if (!probeCtx) {
      const cv = document.createElement('canvas');
      cv.width = 1; cv.height = 1;
      probeCtx = cv.getContext('2d', { willReadFrequently: true });
    }
    const ctx = probeCtx;
    if (!ctx) return null;
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000000';
    ctx.fillStyle = computed;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    const a = d[3] / 255;
    if (a === 0) return { hex: '#000000', a: 0 };
    // Canvas stores premultiplied bytes, so undo the alpha to recover the colour.
    return { hex: toHex([d[0] / 255 / a, d[1] / 255 / a, d[2] / 255 / a]), a: clamp(a, 0, 1) };
  } catch {
    return null;
  }
}

/** Splits on top-level commas only, so `rgb(1, 2, 3)` survives as one argument. */
function splitTop(str: string): string[] {
  const out: string[] = [];
  let depth = 0, cur = '';
  for (const ch of str) {
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  if (cur.trim()) out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}

function toDeg(v: number, unit?: string): number {
  const u = (unit || 'deg').toLowerCase();
  const d = u === 'turn' ? v * 360 : u === 'rad' ? (v * 180) / Math.PI : u === 'grad' ? v * 0.9 : v;
  return ((Math.round(d) % 360) + 360) % 360;
}

/**
 * A stop position as a percentage. `basis` is the length in px that 100%
 * represents, so absolute positions keep their spacing instead of being
 * flattened into an even distribution.
 */
function toPct(v: number, unit: string | undefined, basis: number): number | null {
  const u = (unit || '%').toLowerCase();
  if (u === '%') return v;
  if (u === 'deg') return (v / 360) * 100;
  if (u === 'turn') return v * 100;
  if (u === 'px' || u === 'em' || u === 'rem') {
    const px = u === 'px' ? v : v * 16;
    return basis > 0 ? (px / basis) * 100 : null;
  }
  return null;
}

function sideAngle(words: string): number {
  const w = String(words || '').toLowerCase().trim().split(/\s+/).filter(Boolean).sort().join(' ');
  const map: Record<string, number> = {
    top: 0, right: 90, bottom: 180, left: 270,
    'right top': 45, 'bottom right': 135, 'bottom left': 225, 'left top': 315,
  };
  return map[w] ?? 180;
}

export interface ParsedGradient {
  patch: Partial<GradientState>;
  stops: { hex: string; a: number; pos: number; mid: number }[];
  interp: string | null;
  hints: number;
  pxConverted: boolean;
  radiusClamped: number;
  sizeKeyword: string;
}
export type ParseResult = { error: string } | ParsedGradient;

function applyRadialSize(
  patch: Partial<GradientState>, sizePart: string, box: Box, g: GradientState,
): { keyword: string; clamped: number } {
  const vals: string[] = sizePart.match(/(-?[\d.]+)\s*(%|px|em|rem)/gi) ?? [];
  const cx = patch.cx ?? 50, cy = patch.cy ?? 50;
  const kw = radialKeywordSize(sizePart, cx, cy, box);
  const out = { keyword: vals.length ? '' : kw.keyword, clamped: 0 };
  const num = (t: string, which: 'x' | 'y') =>
    /px|em|rem/i.test(t) ? (parseFloat(t) / (which === 'x' ? box.W : box.H)) * 100 : parseFloat(t);
  const asPx = (t: string, which: 'x' | 'y') =>
    /em|rem/i.test(t) ? parseFloat(t) * 16 : /px/i.test(t) ? parseFloat(t) : (parseFloat(t) / 100) * (which === 'x' ? box.W : box.H);
  if (patch.shape === 'circle') {
    const wanted = vals.length ? asPx(vals[0], 'x') : kw.circleR;
    const fit = circleFrom(g, box, wanted, cx, cy);
    if (Math.abs(fit.rPx - wanted) > 1) out.clamped = Math.round(fit.rPx);
    Object.assign(patch, fit);
    return out;
  }
  if (vals.length >= 2) { patch.rx = num(vals[0], 'x'); patch.ry = num(vals[1], 'y'); }
  else if (vals.length === 1) { patch.rx = num(vals[0], 'x'); patch.ry = patch.rx; }
  else { patch.rx = (kw.rx / box.W) * 100; patch.ry = (kw.ry / box.H) * 100; }
  const wx = patch.rx as number, wy = patch.ry as number;
  patch.rx = clamp(wx, 3, maxRx(cx));
  patch.ry = clamp(wy, 3, maxRy(cy, box));
  if (Math.abs(wx - patch.rx) > 0.5 || Math.abs(wy - patch.ry) > 0.5) out.clamped = -1;
  return out;
}

/**
 * Reads any CSS gradient back into editable state — the other half of this tool.
 *
 * Handles the full declaration or the bare function, every angle unit, side
 * keywords, radial size keywords and explicit radii, `from` angles, colour
 * interpolation hints, absolute stop positions, omitted positions (which CSS
 * distributes evenly), and the tool's own Tailwind output.
 */
export function parseGradient(text: string, box: Box, g: GradientState): ParseResult {
  const src = String(text || '').trim().replace(/;+\s*$/, '');
  if (!src) return { error: 'Paste a gradient first.' };
  // Accept the tool's own Tailwind output by undoing the underscore escaping.
  const tw = src.match(/\bbg-\[([^\]]+)\]/);
  const unwrapped = tw ? tw[1].replace(/_/g, ' ') : src;
  const body = unwrapped.replace(/^[\s\S]*?background(?:-image)?\s*:\s*/i, '').trim();
  const head = body.match(/(repeating-)?(linear|radial|conic)-gradient\s*\(/i);
  if (!head) return { error: 'No linear-gradient(), radial-gradient() or conic-gradient() found in that text.' };
  const open = body.indexOf('(', head.index);
  let depth = 0, end = -1;
  for (let i = open; i < body.length; i++) {
    if (body[i] === '(') depth++;
    else if (body[i] === ')') { depth--; if (!depth) { end = i; break; } }
  }
  if (end < 0) return { error: 'The gradient is missing a closing bracket.' };
  const type = head[2].toLowerCase() as GradientType;
  const args = splitTop(body.slice(open + 1, end));
  if (!args.length) return { error: 'That gradient has no color stops.' };
  const patch: Partial<GradientState> = { type, repeating: !!head[1] };
  let interp: string | null = null, idx = 0, radiusClamped = 0, sizeKeyword = '';

  const stripPositions = (arg: string) => {
    // The unit is optional because CSS allows a unitless zero.
    const re = /\s+(-?[\d.]+)(%|deg|turn|rad|grad|px|em|rem|vw|vh)?\s*$/i;
    let work = arg;
    const found: { v: number; u: string }[] = [];
    let m = work.match(re);
    while (m) {
      found.unshift({ v: parseFloat(m[1]), u: m[2] || '%' });
      work = work.slice(0, m.index);
      m = work.match(re);
    }
    return { color: work.trim(), positions: found };
  };

  // Only treat arg0 as the geometry prelude when it actually reads as geometry.
  // Deciding by "the colour failed to parse" would swallow a typo'd first colour
  // and report a misleading stop-count error instead of naming the real problem.
  const isGeometry = /(^|\s)(-?[\d.]+\s*(deg|turn|rad|grad)|to\s+(top|bottom|left|right)|at\s|from\s|circle|ellipse|closest-(side|corner)|farthest-(side|corner)|in\s+(oklab|oklch|srgb|srgb-linear|lab|lch|hsl|hwb))/i.test(args[0]);
  if (isGeometry) {
    idx = 1;
    let geo = args[0];
    const sp = geo.match(/\bin\s+(oklab|oklch|srgb|srgb-linear|lab|lch|hsl|hwb)\b/i);
    if (sp) { interp = sp[1].toLowerCase(); geo = geo.replace(sp[0], ' '); }
    if (type === 'linear') {
      const ang = geo.match(/(-?[\d.]+)\s*(deg|turn|rad|grad)\b/i);
      if (ang) patch.angle = toDeg(parseFloat(ang[1]), ang[2]);
      else {
        const to = geo.match(/\bto\s+([a-z\s]+)/i);
        patch.angle = to ? sideAngle(to[1]) : 180;
      }
    } else {
      const atPart = geo.match(/\bat\s+(.+)$/i);
      const axis = (tok: string, which: 'x' | 'y'): number | null => {
        if (/%$/.test(tok)) return parseFloat(tok);
        if (/px$/.test(tok)) return (parseFloat(tok) / (which === 'x' ? box.W : box.H)) * 100;
        const k = tok.toLowerCase();
        if (k === 'center') return 50;
        if (which === 'x') return k === 'left' ? 0 : k === 'right' ? 100 : null;
        return k === 'top' ? 0 : k === 'bottom' ? 100 : null;
      };
      patch.cx = 50; patch.cy = 50;
      if (atPart) {
        const toks = atPart[1].trim().split(/\s+/);
        const x = axis(toks[0], 'x');
        const y = toks.length > 1 ? axis(toks[1], 'y') : 50;
        if (x != null) patch.cx = clamp(x, 0, 100);
        if (y != null) patch.cy = clamp(y, 0, 100);
      }
      if (type === 'radial') {
        patch.shape = /\bcircle\b/i.test(geo) ? 'circle' : 'ellipse';
        const rs = applyRadialSize(patch, geo.replace(/\bat\b[\s\S]*$/i, ''), box, g);
        sizeKeyword = rs.keyword; radiusClamped = rs.clamped;
      } else {
        const fr = geo.match(/\bfrom\s+(-?[\d.]+)\s*(deg|turn|rad|grad)?/i);
        patch.from = fr ? toDeg(parseFloat(fr[1]), fr[2]) : 0;
      }
    }
  } else if (type === 'linear') patch.angle = 180;
  else if (type === 'conic') { patch.cx = 50; patch.cy = 50; patch.from = 0; }
  else {
    patch.cx = 50; patch.cy = 50; patch.shape = 'ellipse';
    const rs = applyRadialSize(patch, '', box, g);
    sizeKeyword = rs.keyword; radiusClamped = rs.clamped;
  }

  let basis = 0;
  if (type === 'linear') {
    const a = ((patch.angle ?? 180) * Math.PI) / 180;
    basis = Math.abs(box.W * Math.sin(a)) + Math.abs(box.H * Math.cos(a));
  } else if (type === 'radial') basis = ((patch.rx ?? 46) / 100) * box.W;

  const stops: { hex: string; a: number; pos: number | null; mid: number }[] = [];
  const hints: { at: number; pos: number | null }[] = [];
  let pxConverted = false;
  for (let i = idx; i < args.length; i++) {
    const arg = args[i];
    const solo = arg.match(/^(-?[\d.]+)\s*(%|deg|turn|px|em|rem)?$/i);
    if (solo && stops.length) {
      hints.push({ at: stops.length - 1, pos: toPct(parseFloat(solo[1]), solo[2], basis) });
      continue;
    }
    const parsed = stripPositions(arg);
    const col = resolveCssColor(parsed.color);
    if (!col) return { error: `Could not read the color “${parsed.color.slice(0, 30)}”.` };
    if (!parsed.positions.length) stops.push({ hex: col.hex, a: col.a, pos: null, mid: 0.5 });
    else {
      parsed.positions.forEach((p) => {
        if (/px|em|rem/i.test(p.u)) pxConverted = true;
        stops.push({ hex: col.hex, a: col.a, pos: toPct(p.v, p.u, basis), mid: 0.5 });
      });
    }
  }
  if (stops.length < 2) return { error: 'A gradient needs at least two color stops.' };

  // CSS distributes omitted positions evenly across the run between known ones.
  if (stops[0].pos == null) stops[0].pos = 0;
  if (stops[stops.length - 1].pos == null) stops[stops.length - 1].pos = 100;
  for (let k = 1; k < stops.length - 1; k++) {
    if (stops[k].pos != null) continue;
    let next = k + 1;
    while (next < stops.length && stops[next].pos == null) next++;
    const prev = stops[k - 1].pos as number;
    const span = ((stops[next].pos as number) - prev) / (next - (k - 1));
    for (let j = k; j < next; j++) stops[j].pos = prev + span * (j - (k - 1));
  }
  stops.forEach((st) => { st.pos = clamp(st.pos as number, 0, 100); });
  // Positions never decrease in CSS — a smaller one is clamped up to its predecessor.
  for (let k = 1; k < stops.length; k++) {
    if ((stops[k].pos as number) < (stops[k - 1].pos as number)) stops[k].pos = stops[k - 1].pos;
  }
  hints.forEach((h) => {
    const A = stops[h.at], B = stops[h.at + 1];
    if (!A || !B || h.pos == null) return;
    const span = (B.pos as number) - (A.pos as number);
    if (span > 0.01) A.mid = clamp((h.pos - (A.pos as number)) / span, 0.05, 0.95);
  });

  return {
    patch,
    stops: stops as { hex: string; a: number; pos: number; mid: number }[],
    interp, hints: hints.length, pxConverted, radiusClamped, sizeKeyword,
  };
}
