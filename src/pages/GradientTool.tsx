import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CHECKER, GRAIN_URI, PRESETS, SAVED_KEYS, SIZES, axisGeom, circleFrom, circleRadiusFor, freshGradient,
  gradientCss, isCircle, maxRx, maxRy, paintCanvas, parseGradient, pointAt, radii,
  rampLegibility, rgbaCss, sampleAt, sampled, sortedStops, svgMarkup, uid,
  type Box, type GradientState, type GradientType, type Stop,
} from '../lib/gradient';
import { clamp, fmt, hsvToRgb, oklabToRgb, parseHex, rgbToHsv, toHex, type RGB } from '../lib/color';
import { parseCssColor } from '../lib/cssColor';
import { copyText, copyFlashMs, type CopyOutcome } from '../lib/clipboard';
import { isEyeDropperSupported, pickScreenColor } from '../lib/eyeDropper';
import { usePageMeta } from '../lib/usePageMeta';
import { useJsonLd } from '../lib/useJsonLd';
import { trackEvent } from '../lib/analytics';
import { ToolContentSection } from '../components/generator/ToolContentSection';
import { getToolContent } from '../data/toolContent/index';
import { TOOL_MAP } from '../data/tools';
import { Icon } from '../components/ui/Icon';
import { CONTENT_REVIEWED } from '../data/contentMeta';

const BASE_URL = 'https://www.wpcodekit.com';
const STORAGE_KEY = 'gradient-tool-v1';

type CodeTab = 'css' | 'svg' | 'tailwind' | 'json';
type DragKind =
  | 'axisStart' | 'axisEnd' | 'stageStop' | 'center' | 'radius' | 'radiusY' | 'fromAngle'
  | 'dial' | 'railStop' | 'railMid' | 'sv' | 'hue' | 'alpha';

interface DragState { kind: DragKind; id?: string }

function loadSaved(): GradientState {
  const def = freshGradient();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return def;
    const saved = JSON.parse(raw) as Partial<GradientState>;
    if (!saved?.stops || saved.stops.length < 2) return def;
    return {
      ...def,
      ...saved,
      // Re-key on load: ids are only meaningful within a session, and reusing a
      // persisted one would collide with a fresh uid() from another tab.
      stops: saved.stops.map((s) => ({
        id: uid(),
        hex: parseHex(s.hex) ? s.hex : '#000000',
        a: clamp(Number(s.a), 0, 1),
        pos: clamp(Number(s.pos), 0, 100),
        mid: clamp(Number(s.mid) || 0.5, 0.05, 0.95),
      })),
    };
  } catch {
    return def;
  }
}

/**
 * The Gradient Tool.
 *
 * Like the Color Tool, this deliberately does NOT use GeneratorShell — it has no
 * form/output split, no validation panel and no PHP. It shares the site chrome and
 * the long-form content section, nothing else.
 *
 * The interaction model is direct manipulation: every control on the stage is a
 * `[data-handle]` element and one delegated pointerdown starts the drag, so adding
 * a handle needs no extra wiring.
 */
export function GradientTool() {
  const tool = TOOL_MAP['gradient'];
  const content = getToolContent('gradient');

  const [g, setG] = useState<GradientState>(loadSaved);
  const [selected, setSelected] = useState<string>(() => g.stops[0].id);
  const [codeTab, setCodeTab] = useState<CodeTab>('css');
  const [copied, setCopied] = useState<CopyOutcome | null>(null);
  const [sizeKey, setSizeKey] = useState('1920x1080');
  const [customW, setCustomW] = useState(1600);
  const [customH, setCustomH] = useState(900);
  const [scale, setScale] = useState(1);
  const [pasteText, setPasteText] = useState('');
  const [paste, setPaste] = useState<{ msg: string; ok: boolean } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [box, setBox] = useState<Box>({ W: 1200, H: 420 });
  /**
   * The half-typed contents of the colour field, tagged with the stop it belongs to.
   *
   * Without the tag, a draft outlived whatever replaced the stops under it — apply a
   * preset while "rebeccapurple" is still in the box and the field kept showing it
   * over a completely different colour. Anything that changes the selection now
   * invalidates the draft by itself.
   */
  const [hexDraft, setHexDraft] = useState<{ id: string; text: string } | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const railRef = useRef<HTMLDivElement | null>(null);
  const dialRef = useRef<HTMLDivElement | null>(null);
  const squareRef = useRef<HTMLDivElement | null>(null);
  const hueRef = useRef<HTMLDivElement | null>(null);
  const alphaRef = useRef<HTMLDivElement | null>(null);
  const codeRef = useRef<HTMLPreElement | null>(null);
  const copyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const exportingRef = useRef(false);
  // Live mirrors, so the window-level pointermove listener never needs re-registering.
  const gRef = useRef(g);
  const boxRef = useRef(box);
  const dragRef = useRef<DragState | null>(null);
  const selectedRef = useRef(selected);
  gRef.current = g; boxRef.current = box; dragRef.current = drag; selectedRef.current = selected;

  const persist = useCallback((patch: Partial<GradientState>) => {
    setG((prev) => {
      const next = { ...prev, ...patch };
      try {
        const out: Record<string, unknown> = {};
        SAVED_KEYS.forEach((k) => { out[k] = next[k]; });
        out.stops = next.stops.map((s) => ({ hex: s.hex, a: s.a, pos: s.pos, mid: s.mid }));
        localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const patchStop = useCallback((id: string, patch: Partial<Stop>) => {
    persist({ stops: gRef.current.stops.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
  }, [persist]);

  const list = useMemo(() => sortedStops(g), [g]);
  const sel = useMemo(() => g.stops.find((x) => x.id === selected) ?? list[0], [g.stops, selected, list]);

  /**
   * The picker's H/S/V.
   *
   * The cached value wins only while it still round-trips to the stop's current
   * hex — which is exactly when you are dragging. That is what stops the handle
   * jumping near the bottom of the square: hex is 8-bit, so as V approaches 0 it
   * can no longer carry S, and at pure black S and H are undefined entirely, so
   * a hex-derived dot snapped to the left edge and lost the hue. Any edit from
   * outside the picker changes the hex, which invalidates the cache by itself —
   * no separate resync to forget.
   */
  const pickerRef = useRef<{ id: string; hsv: [number, number, number] } | null>(null);
  const hsvFor = useCallback((stop: Stop): [number, number, number] => {
    const c = pickerRef.current;
    if (c && c.id === stop.id && toHex(hsvToRgb(c.hsv[0], c.hsv[1], c.hsv[2])) === stop.hex) return c.hsv;
    return rgbToHsv(parseHex(stop.hex) ?? [0, 0, 0]);
  }, []);
  const setFromHsv = useCallback((stop: Stop, hsv: [number, number, number]) => {
    pickerRef.current = { id: stop.id, hsv };
    patchStop(stop.id, { hex: toHex(hsvToRgb(hsv[0], hsv[1], hsv[2])) });
  }, [patchStop]);

  // --- dragging -------------------------------------------------------------

  const applyDrag = useCallback((e: { clientX: number; clientY: number }) => {
    const d = dragRef.current;
    if (!d) return;
    setHexDraft(null);
    const s = gRef.current, b = boxRef.current;
    const stop = s.stops.find((x) => x.id === selectedRef.current) ?? sortedStops(s)[0];

    if (d.kind === 'sv' || d.kind === 'hue' || d.kind === 'alpha') {
      const el = d.kind === 'sv' ? squareRef.current : d.kind === 'hue' ? hueRef.current : alphaRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const hsv = hsvFor(stop);
      if (d.kind === 'sv') {
        setFromHsv(stop, [hsv[0], clamp((e.clientX - r.left) / r.width, 0, 1), 1 - clamp((e.clientY - r.top) / r.height, 0, 1)]);
      } else if (d.kind === 'hue') {
        // Falling back to 1 keeps the slider useful on black or fully desaturated
        // colours, where a hue change would otherwise be invisible.
        setFromHsv(stop, [clamp((e.clientX - r.left) / r.width, 0, 1) * 360, hsv[1] || 1, hsv[2] || 1]);
      } else {
        patchStop(stop.id, { a: Math.round(clamp((e.clientX - r.left) / r.width, 0, 1) * 100) / 100 });
      }
      return;
    }

    if (d.kind === 'dial') {
      const el = dialRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (deg < 0) deg += 360;
      persist(s.type === 'conic' ? { from: Math.round(deg) } : { angle: Math.round(deg) });
      return;
    }

    if (d.kind === 'railStop' || d.kind === 'railMid') {
      const el = railRef.current;
      if (!el || !d.id) return;
      const r = el.getBoundingClientRect();
      const p = clamp((e.clientX - r.left - 8) / Math.max(1, r.width - 16), 0, 1) * 100;
      if (d.kind === 'railStop') { patchStop(d.id, { pos: Math.round(p * 10) / 10 }); return; }
      const sortedList = sortedStops(s);
      const i = sortedList.findIndex((x) => x.id === d.id);
      if (i < 0 || i >= sortedList.length - 1) return;
      const a = sortedList[i].pos, b2 = sortedList[i + 1].pos;
      if (b2 - a < 0.5) return;
      patchStop(d.id, { mid: clamp((p - a) / (b2 - a), 0.05, 0.95) });
      return;
    }

    const el = stageRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = e.clientX - r.left, py = e.clientY - r.top;

    if (d.kind === 'axisEnd' || d.kind === 'axisStart') {
      const dx = px - r.width / 2, dy = py - r.height / 2;
      let deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      if (d.kind === 'axisStart') deg += 180;
      persist({ angle: ((Math.round(deg) % 360) + 360) % 360 });
      return;
    }
    if (d.kind === 'center') {
      const cx = clamp((px / r.width) * 100, 4, 96), cy = clamp((py / r.height) * 100, 4, 96);
      const cur = radii(s, b);
      persist({ cx, cy, ...(isCircle(s) ? null : { rx: Math.min(cur.rx, maxRx(cx)), ry: Math.min(cur.ry, maxRy(cy, b)) }) });
      return;
    }
    if (d.kind === 'radius') {
      if (isCircle(s)) persist(circleFrom(s, b, Math.abs(px - (s.cx / 100) * r.width)));
      else persist({ rx: clamp(Math.abs((px / r.width) * 100 - s.cx), 3, maxRx(s.cx)) });
      return;
    }
    if (d.kind === 'radiusY') {
      if (isCircle(s)) persist(circleFrom(s, b, Math.abs(py - (s.cy / 100) * r.height)));
      else persist({ ry: clamp(Math.abs((py / r.height) * 100 - s.cy), 3, maxRy(s.cy, b)) });
      return;
    }
    if (d.kind === 'fromAngle') {
      const dx = px - (s.cx / 100) * r.width, dy = py - (s.cy / 100) * r.height;
      const deg = (Math.atan2(dx, -dy) * 180) / Math.PI;
      persist({ from: ((Math.round(deg) % 360) + 360) % 360 });
      return;
    }
    if (d.kind === 'stageStop' && d.id) {
      let p: number;
      if (s.type === 'radial') {
        p = clamp(((px / r.width) * 100 - s.cx) / (radii(s, b).rx * 0.86 || 1), 0, 1);
      } else {
        const ag = axisGeom(s, b);
        p = clamp(0.5 + ((px - ag.W / 2) * ag.dx + (py - ag.H / 2) * ag.dy) / (2 * ag.t * 0.86), 0, 1);
      }
      patchStop(d.id, { pos: Math.round(p * 1000) / 10 });
    }
  }, [persist, patchStop, hsvFor, setFromHsv]);

  useEffect(() => {
    const onMove = (e: PointerEvent) => { if (dragRef.current) { e.preventDefault(); applyDrag(e); } };
    const onUp = () => { if (dragRef.current) setDrag(null); };
    window.addEventListener('pointermove', onMove, { passive: false });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [applyDrag]);

  useEffect(() => {
    const measure = () => {
      const el = stageRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setBox((prev) => (Math.abs(r.width - prev.W) > 1 || Math.abs(r.height - prev.H) > 1 ? { W: r.width, H: r.height } : prev));
    };
    measure();
    if (typeof ResizeObserver !== 'undefined' && stageRef.current) {
      const ro = new ResizeObserver(measure);
      ro.observe(stageRef.current);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  useEffect(() => () => { if (copyTimer.current) clearTimeout(copyTimer.current); }, []);

  // --- derived --------------------------------------------------------------

  const isLinear = g.type === 'linear', isRadial = g.type === 'radial', isConic = g.type === 'conic';
  const fit = useMemo(() => radii(g, box), [g, box]);
  const cssOneLine = useMemo(() => gradientCss(g, box), [g, box]);
  const railGradient = useMemo(
    () => 'linear-gradient(90deg, ' + sampled(g).map((x) => `${rgbaCss(x.hex, x.a)} ${fmt(x.pos, 1)}%`).join(', ') + ')',
    [g],
  );
  const leg = useMemo(() => rampLegibility(g), [g]);
  const heroTextColor = leg.minWhite >= leg.minBlack ? '#FFFFFF' : '#120F0C';
  const better = leg.minWhite >= leg.minBlack ? 'White' : 'Near-black';
  const bestMin = Math.max(leg.minWhite, leg.minBlack);

  const [exportW, exportH] = useMemo((): [number, number] => {
    const found = SIZES.find((x) => x[0] === sizeKey);
    if (!found || found[0] === 'custom') {
      return [clamp(customW || 1600, 1, 8000), clamp(customH || 900, 1, 8000)];
    }
    return [found[2], found[3]];
  }, [sizeKey, customW, customH]);

  const codeText = useMemo(() => {
    if (codeTab === 'css') {
      const body = gradientCss(g, box, { multiline: true }).replace(/\n/g, '\n\t');
      const grain = g.grainOn
        ? `\n\n/* Dither overlay — kills banding on wide ramps */\n.gradient::after {\n\tcontent: "";\n\tposition: absolute;\n\tinset: 0;\n\tpointer-events: none;\n\tmix-blend-mode: overlay;\n\topacity: ${fmt((g.grain / 100) * 1.6, 2)};\n\tbackground-image: ${GRAIN_URI};\n}`
        : '';
      return `.gradient {\n\tbackground-image: ${body};\n}${grain}`;
    }
    if (codeTab === 'svg') return svgMarkup(g, box, exportW, exportH);
    if (codeTab === 'tailwind') return `class="bg-[${cssOneLine.replace(/\s+/g, '_')}]"`;
    return JSON.stringify({
      type: g.type + (g.repeating ? '-repeating' : ''),
      angle: isConic ? g.from : g.angle,
      center: (isRadial || isConic) ? [g.cx, g.cy] : undefined,
      radius: isRadial && g.shape === 'circle' ? Math.round(circleRadiusFor(g)) + 'px' : undefined,
      radii: isRadial && g.shape !== 'circle' ? [g.rx, g.ry] : undefined,
      interpolation: g.interp,
      stops: list.map((x) => ({ color: x.hex.toUpperCase(), alpha: x.a, position: x.pos, midpoint: x.mid })),
    }, null, 2);
  }, [codeTab, g, box, cssOneLine, exportW, exportH, isConic, isRadial, list]);

  const codeNote = codeTab === 'css'
    ? (g.interp === 'oklab' && !g.nativeOklab
      ? 'Sampled into 12 steps per pair so OKLab blending works in every browser. Tick "Native in oklab" for the short modern form.'
      : g.interp === 'oklab'
        ? 'The one-line modern syntax. Supported in current Chrome, Safari and Firefox; older browsers fall back to the first color.'
        : 'Standard sRGB interpolation — bare percentages are color interpolation hints, not stops.')
    : codeTab === 'svg' ? 'Paste into a file, or use as a data URI. SVG gradients interpolate in sRGB, so OKLab ramps are exported as sampled stops.'
      : codeTab === 'tailwind' ? 'An arbitrary value for Tailwind — underscores stand in for the spaces Tailwind cannot parse in a class name.'
        : 'The full stop list, for storing a gradient in a design token file or a CMS field.';

  // --- actions --------------------------------------------------------------

  const doCopy = useCallback(() => {
    copyText(codeText, codeRef.current).then((outcome) => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
      setCopied(outcome);
      copyTimer.current = setTimeout(() => setCopied(null), copyFlashMs(outcome));
    });
    trackEvent('code_copied', { tool: 'gradient', format: codeTab });
  }, [codeText, codeTab]);

  const download = (name: string, blob: Blob) => {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { /* ignore */ }
  };

  const downloadPng = () => {
    // Encoding a large grainy PNG takes seconds, so the in-flight state is recorded
    // and the paint deferred a frame — otherwise the button looks inert and every
    // impatient click queues another full encode. The ref, not the render snapshot:
    // clicks in the same tick would all still see exporting === false.
    if (exportingRef.current) return;
    exportingRef.current = true;
    setExporting(true);
    const w = exportW * scale, h = exportH * scale;
    const name = `gradient-${w}x${h}.png`;
    const finish = () => { exportingRef.current = false; setExporting(false); };
    setTimeout(() => {
      let cv: HTMLCanvasElement;
      try {
        cv = document.createElement('canvas');
        cv.width = w; cv.height = h;
        const ctx = cv.getContext('2d');
        if (!ctx) { finish(); return; }
        paintCanvas(g, box, ctx, w, h);
      } catch { finish(); return; }
      trackEvent('code_downloaded', { tool: 'gradient', format: 'png' });
      if (cv.toBlob) cv.toBlob((blob) => { if (blob) download(name, blob); finish(); }, 'image/png');
      else finish();
    }, 40);
  };

  const downloadSvg = () => {
    if (isConic) return;
    trackEvent('code_downloaded', { tool: 'gradient', format: 'svg' });
    download(`gradient-${exportW}x${exportH}.svg`, new Blob([svgMarkup(g, box, exportW, exportH)], { type: 'image/svg+xml' }));
  };

  const loadPasted = () => {
    const res = parseGradient(pasteText, box, g);
    if ('error' in res) { setPaste({ msg: res.error, ok: false }); return; }
    const stops: Stop[] = res.stops.map((x) => ({
      id: uid(), hex: x.hex, a: Math.round(x.a * 100) / 100, pos: Math.round(x.pos * 10) / 10, mid: x.mid,
    }));
    // No keyword in the pasted CSS means sRGB — carrying over a previous OKLab
    // setting would render the paste differently from its source.
    const ok = res.interp === 'oklab' || res.interp === 'oklch';
    persist({ ...res.patch, stops, interp: ok ? 'oklab' : 'srgb', nativeOklab: ok });
    setSelected(stops[0].id);
    const notes = [`Loaded ${stops.length} stops as a ${res.patch.repeating ? 'repeating ' : ''}${res.patch.type} gradient.`];
    if (res.hints) notes.push(`${res.hints} midpoint ${res.hints === 1 ? 'hint' : 'hints'} kept.`);
    if (ok) notes.push('Interpolation set to OKLab.');
    if (res.pxConverted) notes.push('Pixel stop positions were converted to percentages of the preview size.');
    if (res.sizeKeyword) notes.push(`Size keyword ${res.sizeKeyword} resolved against the preview canvas.`);
    if (res.radiusClamped > 0) notes.push(`The circle radius was reduced to ${res.radiusClamped}px to keep its handles on the canvas.`);
    else if (res.radiusClamped < 0) notes.push('The radii were reduced to keep the handles on the canvas.');
    setPaste({ msg: notes.join(' '), ok: true });
    trackEvent('gradient_imported', { type: String(res.patch.type) });
  };

  const [canEyedrop] = useState(isEyeDropperSupported);
  const openEyedropper = async () => {
    const picked = await pickScreenColor();
    if (picked && parseHex(picked)) patchStop(sel.id, { hex: toHex(parseHex(picked) as RGB) });
  };

  const addStop = () => {
    let gapAt = 50, best = -1;
    for (let i = 0; i < list.length - 1; i++) {
      const d = list[i + 1].pos - list[i].pos;
      if (d > best) { best = d; gapAt = list[i].pos + d / 2; }
    }
    const c = sampleAt(g, gapAt / 100);
    const id = uid();
    persist({ stops: g.stops.concat([{ id, hex: c.hex, a: c.a, pos: Math.round(gapAt * 10) / 10, mid: 0.5 }]) });
    setSelected(id);
  };

  const randomize = () => {
    const baseHue = Math.random() * 360;
    const n = 2 + Math.floor(Math.random() * 2);
    const stops: Stop[] = [];
    for (let i = 0; i < n; i++) {
      const h = (baseHue + i * (25 + Math.random() * 55)) % 360;
      const l = 0.32 + (i / Math.max(1, n - 1)) * 0.42 + (Math.random() - 0.5) * 0.1;
      const c = 0.09 + Math.random() * 0.11;
      const lab: RGB = [clamp(l, 0.12, 0.92), Math.cos((h * Math.PI) / 180) * c, Math.sin((h * Math.PI) / 180) * c];
      stops.push({ id: uid(), hex: toHex(oklabToRgb(lab)), a: 1, pos: Math.round((i / (n - 1)) * 100), mid: 0.5 });
    }
    persist({ stops, angle: Math.round(Math.random() * 360), type: 'linear', repeating: false });
    setSelected(stops[0].id);
    setPaste(null);
  };

  const onStageDown = (e: React.PointerEvent) => {
    const t = (e.target as HTMLElement).closest?.('[data-handle]') as HTMLElement | null;
    if (!t) return;
    e.preventDefault();
    const kind = t.getAttribute('data-handle') as DragKind;
    const id = t.getAttribute('data-id') || undefined;
    if (kind === 'stageStop' && id) { setSelected(id); setHexDraft(null); }
    setDrag({ kind, id });
  };

  const onRailDown = (e: React.PointerEvent) => {
    const target = e.target as HTMLElement;
    const midEl = target.closest?.('[data-mid]') as HTMLElement | null;
    const stopEl = target.closest?.('[data-rail]') as HTMLElement | null;
    e.preventDefault();
    if (midEl) { setDrag({ kind: 'railMid', id: midEl.getAttribute('data-mid') as string }); return; }
    if (stopEl) {
      const id = stopEl.getAttribute('data-rail') as string;
      setSelected(id); setHexDraft(null); setDrag({ kind: 'railStop', id });
      return;
    }
    // Clicking the bare rail adds a stop there, already the colour it sits on.
    const el = railRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const pos = Math.round(clamp((e.clientX - r.left - 8) / Math.max(1, r.width - 16), 0, 1) * 1000) / 10;
    const c = sampleAt(g, pos / 100);
    const id = uid();
    persist({ stops: g.stops.concat([{ id, hex: c.hex, a: c.a, pos, mid: 0.5 }]) });
    setSelected(id);
    setDrag({ kind: 'railStop', id });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    const tag = (e.target as HTMLElement).tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    e.preventDefault();
    const step = (e.shiftKey ? 10 : 1) * (e.key === 'ArrowLeft' ? -1 : 1);
    patchStop(sel.id, { pos: clamp(Math.round((sel.pos + step) * 10) / 10, 0, 100) });
  };

  // --- meta -----------------------------------------------------------------

  usePageMeta(
    'CSS Gradient Generator — Free, No Login | WP CodeKit',
    'Drag stops on the canvas to build linear, radial and conic CSS gradients. Per-stop alpha, OKLab blending, CSS-to-gradient import, PNG and SVG export.',
    '/tools/gradient',
    { rawTitle: true },
  );

  useJsonLd('ld-breadcrumb', {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${BASE_URL}/` },
      { '@type': 'ListItem', position: 2, name: 'Generators', item: `${BASE_URL}/tools` },
      { '@type': 'ListItem', position: 3, name: 'Design', item: `${BASE_URL}/category/design` },
      { '@type': 'ListItem', position: 4, name: 'Gradient Generator', item: `${BASE_URL}/tools/gradient` },
    ],
  });

  useJsonLd('ld-tool', {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    '@id': `${BASE_URL}/tools/gradient#app`,
    name: 'CSS Gradient Generator',
    url: `${BASE_URL}/tools/gradient`,
    applicationCategory: 'DesignApplication',
    operatingSystem: 'Any (runs in the browser)',
    description: 'Build linear, radial and conic CSS gradients by dragging stops on the canvas, with per-stop alpha, OKLab interpolation, midpoint hints, banding-safe grain, CSS import, and PNG or SVG export at any size.',
    featureList: [
      'Linear, radial and conic gradients, repeating or not',
      'Drag colour stops directly on the artwork',
      'Per-stop alpha with a checkerboard preview',
      'OKLab or sRGB interpolation',
      'Colour interpolation hints (midpoint control)',
      'Paste any CSS gradient to edit it (CSS to gradient)',
      'Export CSS, SVG, Tailwind and JSON',
      'PNG and SVG download at any size',
      'Grain dithering to prevent banding',
      'Worst-case text contrast across the ramp',
    ],
    isAccessibleForFree: true,
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    publisher: { '@id': `${BASE_URL}/#organization` },
    isPartOf: { '@id': `${BASE_URL}/#website` },
    dateModified: CONTENT_REVIEWED,
    inLanguage: 'en',
  });

  // --- render helpers -------------------------------------------------------

  const hsv = hsvFor(sel);
  const selRgb = parseHex(sel.hex) ?? ([0, 0, 0] as RGB);
  const railLeft = (p: number) => `calc(${fmt(p, 2)}% + ${fmt(8 - p * 0.16, 2)}px)`;
  const selIndex = list.findIndex((x) => x.id === sel.id);
  const hasMid = selIndex >= 0 && selIndex < list.length - 1;
  const ratioColor = (r: number) => (r >= 4.5 ? '#1F8A5F' : r >= 3 ? '#8A6A1F' : '#C4593A');

  const handles = buildHandles(g, box, fit, sel.id, list);
  const axis = isLinear
    ? (() => { const a = pointAt(g, box, 0, 1), b = pointAt(g, box, 1, 1); return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }; })()
    : isRadial
      ? (() => { const dy = (17 / Math.max(1, box.H)) * 100; return { x1: g.cx, y1: g.cy + dy, x2: g.cx + fit.rx * 0.86, y2: g.cy + dy }; })()
      : { x1: 0, y1: 0, x2: 0, y2: 0 };

  const dialDeg = isConic ? g.from : g.angle;
  const dialDot = { left: 19 + Math.sin((dialDeg * Math.PI) / 180) * 13, top: 19 - Math.cos((dialDeg * Math.PI) / 180) * 13 };

  const copyLabel = copied === 'ok' ? 'Copied'
    : copied === 'selected' ? 'Selected — press ⌘C'
      : copied === 'blocked' ? 'Copy blocked — select the code' : 'Copy';

  return (
    <>
      <div tabIndex={-1} onKeyDown={onKeyDown} style={{ outline: 'none' }}>
        {/* The stage is deliberately all artwork, so the page's one h1 is
            screen-reader-only rather than absent. */}
        <h1 className="gfw-sr-only">CSS Gradient Generator</h1>
        <div className="gt-top">
          {/* Stage — drag everything directly on the artwork */}
          <div
            ref={stageRef}
            onPointerDown={onStageDown}
            className="gt-stage"
            style={{ backgroundImage: CHECKER, cursor: drag ? 'grabbing' : 'default' }}
          >
            <div className="gt-stage-fill" style={{ background: cssOneLine }} />
            <div aria-hidden="true" className="gt-stage-grain" style={{ opacity: g.grainOn ? (g.grain / 100) * 1.6 : 0, backgroundImage: GRAIN_URI }} />
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" className="gt-axis" style={{ opacity: isConic ? 0 : 1 }}>
              <line x1={fmt(axis.x1, 3)} y1={fmt(axis.y1, 3)} x2={fmt(axis.x2, 3)} y2={fmt(axis.y2, 3)} stroke="rgba(0,0,0,0.4)" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              <line x1={fmt(axis.x1, 3)} y1={fmt(axis.y1, 3)} x2={fmt(axis.x2, 3)} y2={fmt(axis.y2, 3)} stroke="rgba(255,255,255,0.95)" strokeWidth="1.5" strokeDasharray="5 4" vectorEffect="non-scaling-stroke" />
            </svg>
            {handles.map((h, i) => (
              <div
                key={h.kind + h.id + i}
                data-handle={h.kind}
                data-id={h.id}
                role="button"
                tabIndex={0}
                aria-label={h.aria}
                title={h.title}
                className="gt-handle"
                style={{
                  left: `${fmt(h.x, 3)}%`, top: `${fmt(h.y, 3)}%`,
                  width: h.size, height: h.size, marginLeft: -h.size / 2, marginTop: -h.size / 2,
                  background: h.fill, border: h.border, boxShadow: h.shadow, cursor: h.cursor, zIndex: h.z,
                }}
              >
                <span aria-hidden="true" style={{ width: h.dotSize, height: h.dotSize, borderRadius: '50%', background: h.dotFill }} />
              </div>
            ))}
          </div>

          {/* Control card, overlapping the stage */}
          <div className="gfw-container gt-card-wrap">
            <div className="gt-card">
              <div ref={railRef} onPointerDown={onRailDown} className="gt-rail" style={{ backgroundImage: CHECKER }}>
                <div className="gt-rail-fill" style={{ background: railGradient }} />
                {list.map((st) => (
                  <div
                    key={st.id}
                    data-rail={st.id}
                    role="button"
                    tabIndex={0}
                    aria-label={`Stop at ${fmt(st.pos, 1)} percent, ${st.hex.toUpperCase()}`}
                    className="gt-rail-stop"
                    style={{
                      left: railLeft(st.pos), background: rgbaCss(st.hex, st.a),
                      border: st.id === sel.id ? '2.5px solid var(--gfw-accent)' : '2px solid #fff',
                      zIndex: st.id === sel.id ? 8 : 6,
                    }}
                  />
                ))}
                {list.slice(0, -1).map((st, i) => (
                  list[i + 1].pos - st.pos < 6 ? null : (
                    <div
                      key={'m' + st.id}
                      data-mid={st.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`Midpoint between stop ${i + 1} and ${i + 2}`}
                      title={`Midpoint ${Math.round(st.mid * 100)}%`}
                      className="gt-rail-mid"
                      style={{ left: railLeft(st.pos + (list[i + 1].pos - st.pos) * st.mid) }}
                    />
                  )
                ))}
              </div>

              <p className="gt-hint">
                {isLinear ? 'Drag the dots on the axis · drag either end to rotate'
                  : isRadial ? 'Drag the center, the radius handles, or a stop'
                    : 'Drag the center or the start-angle handle'}
              </p>

              <div className="gt-row">
                <div className="gt-tabs">
                  {(['linear', 'radial', 'conic'] as GradientType[]).map((t) => (
                    <button key={t} type="button" onClick={() => persist({ type: t })} className={`gt-tab${g.type === t ? ' is-active' : ''}`}>
                      {t[0].toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                <label className={`gt-check-pill${g.repeating ? ' is-on' : ''}`} title="Tile the ramp end to end instead of stopping at the last color">
                  <input type="checkbox" checked={g.repeating} onChange={() => persist({ repeating: !g.repeating })} />
                  Repeating
                </label>

                {(isLinear || isConic) && (
                  <div className="gt-angle">
                    <div ref={dialRef} onPointerDown={(e) => { e.preventDefault(); setDrag({ kind: 'dial' }); applyDrag(e); }} role="button" tabIndex={0} aria-label="Gradient angle dial" className="gt-dial">
                      <span aria-hidden="true" style={{ left: dialDot.left, top: dialDot.top }} />
                    </div>
                    <div className="gt-num-field">
                      <input
                        value={String(Math.round(dialDeg))}
                        onChange={(e) => {
                          const v = ((Math.round(parseFloat(e.target.value) || 0) % 360) + 360) % 360;
                          persist(isConic ? { from: v } : { angle: v });
                        }}
                        aria-label="Angle in degrees"
                        className="gfw-mono"
                        style={{ width: 42 }}
                      />
                      <span className="gfw-mono gt-unit">deg</span>
                    </div>
                    {([['↑', 0, 'To top (0deg)'], ['→', 90, 'To right (90deg)'], ['↓', 180, 'To bottom (180deg)'], ['↘', 135, 'Diagonal (135deg)']] as [string, number, string][]).map(([glyph, deg, title]) => (
                      <button
                        key={deg}
                        type="button"
                        onClick={() => persist(isConic ? { from: deg } : { angle: deg })}
                        title={title}
                        aria-label={title}
                        className={`gt-angle-preset${dialDeg === deg ? ' is-active' : ''}`}
                      >{glyph}</button>
                    ))}
                  </div>
                )}

                <div style={{ flex: 1, minWidth: 8 }} />

                <div className="gt-row-actions">
                  <button type="button" className="gt-btn" onClick={() => persist({ stops: g.stops.map((x) => ({ ...x, pos: Math.round((100 - x.pos) * 10) / 10 })) })}>Reverse</button>
                  <button
                    type="button"
                    className="gt-btn"
                    onClick={() => {
                      const map: Record<string, number> = {};
                      list.forEach((x, i) => { map[x.id] = Math.round((i / (list.length - 1)) * 1000) / 10; });
                      persist({ stops: g.stops.map((x) => ({ ...x, pos: map[x.id] })) });
                    }}
                  >Distribute</button>
                  <button type="button" className="gt-btn" onClick={randomize}>Surprise me</button>
                </div>
              </div>

              {isRadial && (
                <div className="gt-row gt-row-sub">
                  <div className="gt-tabs">
                    <button type="button" onClick={() => persist({ shape: 'ellipse' })} className={`gt-tab gt-tab-sm${g.shape === 'ellipse' ? ' is-active' : ''}`}>Ellipse</button>
                    <button
                      type="button"
                      onClick={() => persist({ shape: 'circle', ...circleFrom(g, box, Math.min((g.rx / 100) * box.W, (g.ry / 100) * box.H)) })}
                      className={`gt-tab gt-tab-sm${g.shape === 'circle' ? ' is-active' : ''}`}
                    >Circle</button>
                  </div>
                  <span className="gt-muted">{g.shape === 'circle' ? 'Radius handles stay locked together.' : 'Each radius moves independently.'}</span>
                </div>
              )}

              {/* CSS to gradient — the import half of the tool */}
              <div className="gt-import">
                <div className="gt-section-head">
                  <span className="gt-eyebrow">Load a gradient</span>
                  <span className="gt-muted">Paste CSS from anywhere and edit it here</span>
                </div>
                <div className="gt-import-row">
                  <input
                    value={pasteText}
                    onChange={(e) => { setPasteText(e.target.value); setPaste(null); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); loadPasted(); } }}
                    placeholder="linear-gradient(90deg, #2A7B9B 0%, rgb(87 199 133 / 0.5) 50%, #EDDD53 100%)"
                    spellCheck={false}
                    aria-label="Paste a CSS gradient to load it into the editor"
                    className="gfw-mono gt-import-input"
                    style={{ borderColor: paste && !paste.ok ? '#C4593A' : undefined }}
                  />
                  <button type="button" className="gt-btn-primary" onClick={loadPasted}>Load</button>
                </div>
                {paste && <p className="gt-paste-msg" style={{ color: paste.ok ? '#1F8A5F' : '#C4593A' }}>{paste.msg}</p>}
              </div>

              <div className="gt-grid">
                {/* Column 1 — the selected stop */}
                <div className="gt-col">
                  <div className="gt-section-head">
                    <span className="gt-eyebrow">Selected stop</span>
                    <span className="gfw-mono gt-muted">{sel.hex.toUpperCase()} · {fmt(sel.pos, 1)}% · {Math.round(sel.a * 100)}%</span>
                  </div>

                  <div
                    ref={squareRef}
                    onPointerDown={(e) => { e.preventDefault(); setDrag({ kind: 'sv' }); dragRef.current = { kind: 'sv' }; applyDrag(e); }}
                    className="gt-sv"
                    role="application"
                    aria-label="Saturation and brightness"
                    style={{ background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, rgba(255,255,255,0)), hsl(${fmt(hsv[0], 1)} 100% 50%)` }}
                  >
                    <span className="gt-sv-dot" style={{ left: `${fmt(hsv[1] * 100, 2)}%`, top: `${fmt((1 - hsv[2]) * 100, 2)}%`, background: sel.hex }} />
                  </div>

                  <div className="gt-picker-row">
                    <button
                      type="button"
                      onClick={openEyedropper}
                      disabled={!canEyedrop}
                      aria-label="Pick a color from anywhere on screen"
                      title={canEyedrop ? 'Pick a color from anywhere on screen' : 'Screen picking needs Chrome, Edge or Opera'}
                      className="gt-icon-btn"
                    >
                      <Icon name="eyedropper" size={15} />
                    </button>
                    <div className="gt-sliders">
                      <div
                        ref={hueRef}
                        onPointerDown={(e) => { e.preventDefault(); setDrag({ kind: 'hue' }); dragRef.current = { kind: 'hue' }; applyDrag(e); }}
                        role="application"
                        aria-label="Hue"
                        className="gt-hue"
                      >
                        <span style={{ left: `${fmt((hsv[0] / 360) * 100, 2)}%`, background: `hsl(${fmt(hsv[0], 1)} 100% 50%)` }} />
                      </div>
                      <div
                        ref={alphaRef}
                        onPointerDown={(e) => { e.preventDefault(); setDrag({ kind: 'alpha' }); dragRef.current = { kind: 'alpha' }; applyDrag(e); }}
                        role="application"
                        aria-label="Alpha"
                        className="gt-alpha"
                        style={{ backgroundImage: CHECKER }}
                      >
                        <div className="gt-alpha-fill" style={{ background: `linear-gradient(90deg, ${rgbaCss(sel.hex, 0)}, ${rgbaCss(sel.hex, 1)})` }} />
                        <span style={{ left: `${fmt(sel.a * 100, 2)}%`, background: sel.hex }} />
                      </div>
                    </div>
                  </div>

                  <div className="gt-hex-row">
                    <div className="gt-text-field" style={{ flex: 1 }}>
                      <span aria-hidden="true" className="gfw-mono gt-unit">#</span>
                      <input
                        value={hexDraft?.id === sel.id ? hexDraft.text : sel.hex.slice(1).toUpperCase()}
                        onChange={(e) => {
                          const v = e.target.value;
                          setHexDraft({ id: sel.id, text: v });
                          // Any CSS notation, same as the Color Tool — an oklch() value
                          // out of a token file should just work here too.
                          const parsed = parseCssColor(v);
                          if (parsed) patchStop(sel.id, { hex: parsed });
                        }}
                        onBlur={() => setHexDraft(null)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setHexDraft(null); }}
                        spellCheck={false}
                        autoCapitalize="off"
                        autoCorrect="off"
                        aria-label="Color for the selected stop — hex, rgb, hsl or oklch"
                        className="gfw-mono"
                      />
                    </div>
                    <div className="gt-text-field" style={{ flexShrink: 0, width: 74 }}>
                      <input
                        value={String(Math.round(sel.a * 100))}
                        onChange={(e) => patchStop(sel.id, { a: clamp((parseFloat(e.target.value) || 0) / 100, 0, 1) })}
                        aria-label="Alpha percentage"
                        className="gfw-mono"
                      />
                      <span className="gfw-mono gt-unit">%</span>
                    </div>
                  </div>

                  <div className="gt-rgb-grid">
                    {(['R', 'G', 'B'] as const).map((label, i) => (
                      <div key={label}>
                        <div className="gt-micro-label">{label}</div>
                        <input
                          value={String(Math.round(selRgb[i] * 255))}
                          onChange={(e) => {
                            const next = selRgb.slice() as RGB;
                            next[i] = clamp(parseInt(e.target.value, 10) || 0, 0, 255) / 255;
                            patchStop(sel.id, { hex: toHex(next) });
                          }}
                          aria-label={`${label} channel`}
                          className="gfw-mono gt-rgb-input"
                        />
                      </div>
                    ))}
                    <div>
                      <div className="gt-micro-label">A</div>
                      <input
                        value={String(Math.round(sel.a * 100))}
                        onChange={(e) => patchStop(sel.id, { a: clamp((parseFloat(e.target.value) || 0) / 100, 0, 1) })}
                        aria-label="Alpha percentage"
                        className="gfw-mono gt-rgb-input"
                      />
                    </div>
                  </div>

                  <div className="gt-sub">
                    <div className="gt-eyebrow" style={{ marginBottom: 9 }}>Presets</div>
                    <div className="gt-presets">
                      {PRESETS.map((p) => (
                        <button
                          key={p[0]}
                          type="button"
                          title={p[0]}
                          aria-label={`Apply the ${p[0]} preset`}
                          className="gt-preset"
                          onClick={() => {
                            const stops: Stop[] = p[3].map((x) => ({ id: uid(), hex: x[0], a: x[1], pos: x[2], mid: 0.5 }));
                            persist({
                              type: p[1], angle: p[2], from: p[2], repeating: false, shape: 'ellipse',
                              cx: 50, cy: 50, rx: maxRx(50), ry: maxRy(50, box), stops,
                            });
                            setSelected(stops[0].id);
                            setPaste(null);
                          }}
                          style={{
                            backgroundImage: `${presetSwatch(p)}, ${CHECKER}`,
                            backgroundSize: 'auto, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
                            backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0px',
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* Column 2 — stops and blending */}
                <div className="gt-col">
                  <div className="gt-section-head">
                    <span className="gt-eyebrow">Stops</span>
                    <button type="button" className="gt-btn gt-btn-sm" onClick={addStop}>
                      <Icon name="plus" size={12} /> Add
                    </button>
                  </div>

                  <div className="gt-stop-list">
                    {list.map((st) => (
                      <div key={st.id} className={`gt-stop-row${st.id === sel.id ? ' is-selected' : ''}`}>
                        <button
                          type="button"
                          onClick={() => { setSelected(st.id); setHexDraft(null); }}
                          aria-label={`Select stop ${st.hex.toUpperCase()}`}
                          className="gt-stop-swatch"
                          style={{
                            backgroundImage: `linear-gradient(${rgbaCss(st.hex, st.a)}, ${rgbaCss(st.hex, st.a)}), ${CHECKER}`,
                            backgroundSize: 'auto, 8px 8px, 8px 8px, 8px 8px, 8px 8px',
                            backgroundPosition: '0 0, 0 0, 0 4px, 4px -4px, -4px 0px',
                          }}
                        />
                        <div className="gt-text-field" style={{ flex: 1, minWidth: 0 }}>
                          <span aria-hidden="true" className="gfw-mono gt-unit">#</span>
                          <input
                            value={st.hex.slice(1).toUpperCase()}
                            // Focusing a row's field selects that stop, so the picker
                            // above always edits the row you are actually typing in.
                            onFocus={() => { setSelected(st.id); setHexDraft(null); }}
                            onChange={(e) => { const p = parseCssColor(e.target.value); if (p) patchStop(st.id, { hex: p }); }}
                            spellCheck={false}
                            aria-label={`Hex for stop at ${fmt(st.pos, 1)} percent`}
                            className="gfw-mono"
                          />
                        </div>
                        <div className="gt-text-field" style={{ flexShrink: 0, width: 58 }}>
                          <input
                            value={fmt(st.pos, 1)}
                            onFocus={() => { setSelected(st.id); setHexDraft(null); }}
                            onChange={(e) => patchStop(st.id, { pos: clamp(parseFloat(e.target.value) || 0, 0, 100) })}
                            aria-label={`Position of stop ${st.hex.toUpperCase()}`}
                            className="gfw-mono"
                          />
                          <span className="gfw-mono gt-unit">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (list.length <= 2) return;
                            persist({ stops: g.stops.filter((x) => x.id !== st.id) });
                            if (sel.id === st.id) setSelected(list[0].id === st.id ? list[1].id : list[0].id);
                          }}
                          disabled={list.length <= 2}
                          aria-label={`Delete stop ${st.hex.toUpperCase()}`}
                          title={list.length <= 2 ? 'A gradient needs at least two stops' : 'Delete this stop'}
                          className="gt-stop-del"
                        >
                          <Icon name="trash" size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="gt-sub">
                    <div className="gt-eyebrow" style={{ marginBottom: 9 }}>Interpolation</div>
                    <div className="gt-tabs gt-tabs-full" style={{ marginBottom: 10 }}>
                      <button type="button" title="How every browser blends by default" onClick={() => persist({ interp: 'srgb' })} className={`gt-tab gt-tab-sm${g.interp === 'srgb' ? ' is-active' : ''}`}>sRGB</button>
                      <button type="button" title="Perceptual blending — keeps chroma through the middle" onClick={() => persist({ interp: 'oklab' })} className={`gt-tab gt-tab-sm${g.interp === 'oklab' ? ' is-active' : ''}`}>OKLab</button>
                    </div>
                    <p className="gt-note">
                      {g.interp === 'oklab'
                        ? 'Blended in OKLab, so the middle of the ramp keeps its chroma instead of drifting toward gray.'
                        : 'The browser default. Fast and predictable, but complementary pairs desaturate halfway.'}
                    </p>

                    {hasMid && (
                      <div>
                        <div className="gt-section-head" style={{ marginBottom: 5 }}>
                          <span className="gt-mid-label">Midpoint {Math.round(sel.mid * 100)}%</span>
                          <button type="button" className="gt-link-btn" onClick={() => patchStop(sel.id, { mid: 0.5 })}>Reset</button>
                        </div>
                        <input
                          type="range" min={5} max={95} step={1}
                          value={Math.round(sel.mid * 100)}
                          onChange={(e) => patchStop(sel.id, { mid: clamp(parseInt(e.target.value, 10) / 100, 0.05, 0.95) })}
                          aria-label="Midpoint between this stop and the next"
                          style={{ width: '100%' }}
                        />
                        <p className="gt-note gt-note-sm">Where the halfway color lands between this stop and the next. Also draggable as the diamond on the rail.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Column 3 — export and legibility */}
                <div className="gt-col">
                  <div>
                    <div className="gt-section-head">
                      <span className="gt-eyebrow">Export image</span>
                      <span className="gfw-mono gt-muted">{exportW * scale} × {exportH * scale} px</span>
                    </div>
                    <select value={sizeKey} onChange={(e) => setSizeKey(e.target.value)} aria-label="Export size preset" className="gt-select">
                      {SIZES.map((s) => <option key={s[0]} value={s[0]}>{s[1]}</option>)}
                    </select>
                    {sizeKey === 'custom' && (
                      <div className="gt-hex-row" style={{ marginTop: 9 }}>
                        <div className="gt-text-field" style={{ flex: 1 }}>
                          <span className="gt-micro-label" style={{ margin: 0 }}>W</span>
                          <input value={String(customW)} onChange={(e) => setCustomW(clamp(parseInt(e.target.value, 10) || 1, 1, 8000))} aria-label="Custom width in pixels" className="gfw-mono" />
                        </div>
                        <div className="gt-text-field" style={{ flex: 1 }}>
                          <span className="gt-micro-label" style={{ margin: 0 }}>H</span>
                          <input value={String(customH)} onChange={(e) => setCustomH(clamp(parseInt(e.target.value, 10) || 1, 1, 8000))} aria-label="Custom height in pixels" className="gfw-mono" />
                        </div>
                      </div>
                    )}

                    <div className="gt-scale-row">
                      <span className="gt-mid-label">Scale</span>
                      <div className="gt-tabs">
                        {[1, 2, 3].map((k) => (
                          <button key={k} type="button" onClick={() => setScale(k)} className={`gt-tab gt-tab-sm gfw-mono${scale === k ? ' is-active' : ''}`}>{k}×</button>
                        ))}
                      </div>
                    </div>

                    <label className="gt-grain-label">
                      <input type="checkbox" checked={g.grainOn} onChange={() => persist({ grainOn: !g.grainOn })} />
                      <span>
                        <span className="gt-grain-title">Add grain ({g.grain <= 5 ? 'subtle' : g.grain <= 9 ? 'medium' : 'heavy'})</span>
                        <span className="gt-note gt-note-sm">Dithers the ramp so wide, low-contrast gradients don&rsquo;t show banding on 8-bit screens.</span>
                      </span>
                    </label>
                    {g.grainOn && (
                      <input
                        type="range" min={2} max={14} step={1} value={g.grain}
                        onChange={(e) => persist({ grain: parseInt(e.target.value, 10) })}
                        aria-label="Grain strength"
                        style={{ width: '100%', marginTop: 8 }}
                      />
                    )}

                    <div className="gt-export-row">
                      <button type="button" onClick={downloadPng} disabled={exporting} className="gt-btn-primary gt-btn-grow" aria-label="Download PNG">
                        {exporting ? 'Rendering…' : 'PNG'}
                      </button>
                      <button type="button" onClick={downloadSvg} disabled={isConic} title={isConic ? 'SVG has no conic gradient' : 'Download an SVG file'} className="gt-btn gt-btn-grow" aria-label="Download SVG">SVG</button>
                    </div>
                    {isConic && <p className="gt-note gt-note-sm" style={{ marginTop: 8 }}>SVG has no conic gradient primitive, so a conic gradient can only be exported as PNG or used as CSS.</p>}
                  </div>

                  <div className="gt-sub">
                    <div className="gt-eyebrow" style={{ marginBottom: 11 }}>Legibility over this gradient</div>
                    <div className="gt-leg-list">
                      {([['#FFFFFF', 'White text, worst point on the ramp', leg.minWhite], ['#120F0C', 'Near-black text, worst point on the ramp', leg.minBlack]] as [string, string, number][]).map(([fg, label, ratio]) => (
                        <div key={label} className="gt-leg-row">
                          <span className="gt-leg-chip" style={{ background: cssOneLine, color: fg }}>Aa</span>
                          <span className="gt-leg-label">{label}</span>
                          <span className="gfw-mono gt-leg-ratio" style={{ color: ratioColor(ratio) }}>{fmt(ratio, 2)}:1</span>
                        </div>
                      ))}
                    </div>
                    <p className="gt-note" style={{ marginTop: 11 }}>
                      {bestMin >= 4.5
                        ? `${better} text clears 4.5:1 everywhere on this gradient, so body copy is safe over the whole ramp.`
                        : bestMin >= 3
                          ? `${better} text only clears 3:1 at the worst point — large headings are fine, body copy is not. Add a scrim or darken one end.`
                          : 'Neither black nor white text clears 3:1 across this gradient. Overlay a scrim before putting type on it.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Generated code */}
        <div className="gfw-container gt-out">
          <div>
            <div className="gt-out-head">
              <div className="gt-tabs">
                {(['css', 'svg', 'tailwind', 'json'] as CodeTab[]).map((t) => (
                  <button key={t} type="button" onClick={() => setCodeTab(t)} className={`gt-tab${codeTab === t ? ' is-active' : ''}`}>
                    {t === 'css' ? 'CSS' : t === 'svg' ? 'SVG' : t === 'json' ? 'JSON' : 'Tailwind'}
                  </button>
                ))}
              </div>
              <div className="gt-out-actions">
                {g.interp === 'oklab' && (
                  <button
                    type="button"
                    role="switch"
                    aria-checked={g.nativeOklab}
                    onClick={() => persist({ nativeOklab: !g.nativeOklab })}
                    title="Emit the modern one-line in oklab syntax instead of sampled stops"
                    className={`gt-switch${g.nativeOklab ? ' is-on' : ''}`}
                  >
                    <span aria-hidden="true" className="gt-switch-track"><span /></span>
                    Native <span className="gfw-mono">in oklab</span>
                  </button>
                )}
                <button type="button" onClick={doCopy} className="gt-copy-btn" style={{ background: copied && copied !== 'ok' ? '#8A3A22' : undefined }}>{copyLabel}</button>
              </div>
            </div>
            <pre ref={codeRef} className="gt-code">{codeText}</pre>
            <p className="gt-note" style={{ maxWidth: '80ch', marginTop: 9 }}>{codeNote}</p>
          </div>

          {/* Try it on */}
          <div>
            <div className="gt-eyebrow" style={{ marginBottom: 12 }}>Try it on</div>
            <div className="gt-try-grid">
              <div className="gt-try-card">
                <div className="gt-try-hero" style={{ background: cssOneLine }}>
                  <span style={{ color: heroTextColor }}>Card header</span>
                </div>
                <div className="gt-try-body">
                  <p>As a header fill behind text — the label uses whichever of black or white holds up best across the whole ramp.</p>
                </div>
              </div>
              <div className="gt-try-card gt-try-pad">
                <button type="button" className="gt-demo-btn" style={{ background: cssOneLine, color: heroTextColor }}>Primary action</button>
                <button
                  type="button"
                  className="gt-demo-btn gt-demo-outline"
                  style={{ backgroundImage: `linear-gradient(#fff, #fff), ${cssOneLine}` }}
                >Gradient border</button>
                <span className="gt-muted">Buttons and outlines.</span>
              </div>
              <div className="gt-try-card gt-try-pad">
                <span className="gt-clip-text" style={{ backgroundImage: cssOneLine, WebkitBackgroundClip: 'text', backgroundClip: 'text' }}>Clipped to text</span>
                <span className="gt-muted">Type fills need more contrast than a block — thin strokes lose the light end first.</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {tool && content && <ToolContentSection tool={tool} content={content} />}
    </>
  );
}

// --- small pure helpers used only by the view --------------------------------

function presetSwatch(p: (typeof PRESETS)[number]): string {
  const head = p[1] === 'linear' ? `linear-gradient(${p[2]}deg, `
    : p[1] === 'radial' ? 'radial-gradient(ellipse 46% 46% at 50% 50%, '
      : 'conic-gradient(from 0deg at 50% 50%, ';
  return head + p[3].map((x) => `${rgbaCss(x[0], x[1])} ${x[2]}%`).join(', ') + ')';
}

interface Handle {
  kind: DragKind; id: string; x: number; y: number; size: number;
  fill: string; border: string; shadow: string; cursor: string; z: number;
  dotSize: number; dotFill: string; aria: string; title: string;
}

function buildHandles(g: GradientState, box: Box, fit: ReturnType<typeof radii>, selId: string, list: Stop[]): Handle[] {
  const out: Handle[] = [];
  const push = (kind: DragKind, id: string, x: number, y: number, o: Partial<Handle>) => {
    out.push({
      kind, id, x, y,
      size: o.size ?? 18,
      fill: o.fill ?? 'rgba(255,255,255,0.14)',
      border: o.border ?? '2.5px solid #FFFFFF',
      shadow: o.shadow ?? '0 0 0 1px rgba(0,0,0,0.35), 0 2px 6px rgba(0,0,0,0.3)',
      cursor: o.cursor ?? 'grab',
      z: o.z ?? 10,
      dotSize: o.dotSize ?? 0,
      dotFill: o.dotFill ?? 'transparent',
      aria: o.aria ?? 'Drag handle',
      title: o.title ?? '',
    });
  };
  const rot = { size: 15, fill: 'rgba(20,16,12,0.55)', border: '2px solid rgba(255,255,255,0.9)', z: 12, dotSize: 4, dotFill: 'rgba(255,255,255,0.85)' };
  if (g.type === 'linear') {
    const a = pointAt(g, box, 0, 1), b = pointAt(g, box, 1, 1);
    push('axisStart', '', a.x, a.y, { ...rot, aria: 'Rotate the gradient axis', title: 'Drag to rotate' });
    push('axisEnd', '', b.x, b.y, { ...rot, aria: 'Rotate the gradient axis', title: 'Drag to rotate' });
    list.forEach((st) => {
      const p = pointAt(g, box, st.pos / 100);
      push('stageStop', st.id, p.x, p.y, {
        size: st.id === selId ? 24 : 20, fill: rgbaCss(st.hex, st.a), z: st.id === selId ? 20 : 14,
        dotSize: st.id === selId ? 6 : 0, dotFill: 'rgba(255,255,255,0.9)',
        aria: `Drag stop at ${fmt(st.pos, 1)} percent`, title: `${st.hex.toUpperCase()} · ${fmt(st.pos, 1)}%`,
      });
    });
  } else if (g.type === 'radial') {
    const stopDy = (17 / Math.max(1, box.H)) * 100;
    push('center', '', g.cx, g.cy, { size: 18, fill: 'rgba(20,16,12,0.55)', border: '2px solid rgba(255,255,255,0.9)', cursor: 'move', z: 24, dotSize: 5, dotFill: '#FFFFFF', aria: 'Move the gradient center', title: 'Drag to move the center' });
    push('radius', '', g.cx + fit.rx, g.cy, { ...rot, cursor: 'ew-resize', z: 22, aria: 'Resize the horizontal radius', title: 'Horizontal radius' });
    push('radiusY', '', g.cx, g.cy + fit.ry, { ...rot, cursor: 'ns-resize', z: 22, aria: 'Resize the vertical radius', title: 'Vertical radius' });
    list.forEach((st) => {
      push('stageStop', st.id, g.cx + fit.rx * 0.86 * (st.pos / 100), g.cy + stopDy, {
        size: st.id === selId ? 22 : 18, fill: rgbaCss(st.hex, st.a), z: st.id === selId ? 20 : 14,
        dotSize: st.id === selId ? 6 : 0, dotFill: 'rgba(255,255,255,0.9)',
        aria: `Drag stop at ${fmt(st.pos, 1)} percent`, title: `${st.hex.toUpperCase()} · ${fmt(st.pos, 1)}%`,
      });
    });
  } else {
    push('center', '', g.cx, g.cy, { size: 18, fill: 'rgba(20,16,12,0.5)', cursor: 'move', z: 12, dotSize: 5, dotFill: '#FFFFFF', aria: 'Move the gradient center', title: 'Drag to move the center' });
    const R = Math.min(box.W, box.H) * 0.3;
    push('fromAngle', '',
      g.cx + (Math.sin((g.from * Math.PI) / 180) * R) / Math.max(1, box.W) * 100,
      g.cy - (Math.cos((g.from * Math.PI) / 180) * R) / Math.max(1, box.H) * 100,
      { size: 15, fill: 'rgba(20,16,12,0.5)', z: 12, aria: 'Rotate the start angle', title: 'Start angle' });
  }
  return out;
}
