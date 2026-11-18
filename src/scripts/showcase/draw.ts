// Drawing helpers shared by the scroll scenes: theme colours, easing and the plant glyph that
// Fig. 1 and the home preview already use (a ring in its genus colour with the species code).

import { token } from '../palette';

export interface Colors {
  ink: string; graphite: string; rule: string; contour: string; plate: string; paper: string;
  accent: string; survey: string; hazard: string; genus: string[]; ramp: string[];
}

/** True on pages migrated to the terminal world (Terminal.astro sets data-world on <html>). */
export const terminal = typeof document !== 'undefined' && document.documentElement.dataset.world === 'terminal';

/** Mixes two hex colours into a hex colour (canvas helpers here parse hex only). */
function hexMix(a: string, b: string, t: number): string {
  const n = (h: string) => { const v = parseInt(h.replace('#', ''), 16); return [(v >> 16) & 255, (v >> 8) & 255, v & 255]; };
  const x = n(a), y = n(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
}

export function readColors(): Colors {
  if (terminal) {
    // Monochrome ink on the ground; the engraving's names map onto it. `plate` and `paper` are
    // the opaque ground (label patches must hide what is under them), `rule` a quiet hairline.
    const ink = token('--ink'), bg = token('--bg');
    return {
      ink, graphite: token('--dim'), rule: hexMix(ink, bg, 0.82), contour: token('--faint'),
      plate: bg, paper: bg, accent: token('--red'), survey: token('--blue'), hazard: token('--red'),
      genus: [1, 2, 3, 4].map((k) => token(`--genus-${k}`)),
      ramp: [1, 2, 3, 4, 5].map((k) => token(`--ramp-${k}`)),
    };
  }
  return {
    ink: token('--ink'), graphite: token('--graphite'), rule: token('--rule'), contour: token('--contour'),
    plate: token('--plate'), paper: token('--paper'), accent: token('--accent'), survey: token('--survey'),
    hazard: token('--hazard'),
    genus: [1, 2, 3, 4].map((k) => token(`--genus-${k}`)),
    ramp: [1, 2, 3, 4, 5].map((k) => token(`--ramp-${k}`)),
  };
}

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
export const SANS = terminal ? MONO : '"IBM Plex Sans", system-ui, sans-serif';
export const COND = terminal ? MONO : '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif';
export const SERIF = terminal ? MONO : '"STIX Two Text Variable", "STIX Two Text", Georgia, serif';

/** A phosphor glow for the one mark that matters in a scene: call before drawing it, reset after. */
export function glow(g: CanvasRenderingContext2D, color: string, blur: number) {
  if (!terminal) return;
  g.shadowColor = color; g.shadowBlur = blur;
}
export function unglow(g: CanvasRenderingContext2D) { g.shadowBlur = 0; g.shadowColor = 'transparent'; }

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Progress of p through the interval [a, b], clamped to [0, 1]. */
export const seg = (p: number, a: number, b: number) => clamp((p - a) / (b - a));
/** Exponential ease-out, the site's motion curve. */
export const ease = (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t));
export const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

export function alpha(color: string, a: number): string {
  return `color-mix(in srgb, ${color} ${Math.round(clamp(a) * 100)}%, transparent)`;
}

/** Canvas 2D does not parse color-mix in every engine; this mixes a hex colour with alpha. */
export function rgba(hex: string, a: number): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${clamp(a)})`;
}

/** Mixes two colours, hex or `rgb()`, in sRGB: t = 0 gives a, t = 1 gives b. */
export function mix(a: string, b: string, t: number): string {
  const rgb = (hex: string) => {
    if (hex.startsWith('rgb')) return hex.match(/[\d.]+/g)!.slice(0, 3).map(Number);
    let h = hex.replace('#', '');
    if (h.length === 3) h = h.replace(/./g, '$&$&');
    const n = parseInt(h, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const x = rgb(a), y = rgb(b);
  return `rgb(${x.map((v, i) => Math.round(lerp(v, y[i], t))).join(',')})`;
}

export function plant(g: CanvasRenderingContext2D, c: Colors, x: number, y: number, r: number, genus: number, code?: string, a = 1) {
  if (r <= 0 || a <= 0) return;
  g.globalAlpha = a;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2);
  g.fillStyle = c.plate; g.fill();
  g.lineWidth = Math.max(1, r * 0.2); g.strokeStyle = c.genus[genus]; g.stroke();
  if (code && r >= 10) {
    g.fillStyle = c.ink; g.font = `500 ${Math.round(r * 0.62)}px ${COND}`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(code, x, y + r * 0.04);
  }
  g.globalAlpha = 1;
}

/** A small filled dot in genus colour: a plant at survey scale. */
export function dot(g: CanvasRenderingContext2D, color: string, x: number, y: number, r: number, a = 1) {
  if (r <= 0 || a <= 0) return;
  g.globalAlpha = a; g.fillStyle = color;
  g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
  g.globalAlpha = 1;
}

/** Engraved hatching inside a path: parallel hairlines at angle `deg`, `gap` apart, over the
 *  path's bounds [x, y, w, h] (the whole canvas if omitted). */
export function hatch(g: CanvasRenderingContext2D, path: Path2D, deg: number, gap: number, color: string, width = 1, bounds?: number[]) {
  const [bx, by, bw, bh] = bounds ?? [0, 0, g.canvas.width, g.canvas.height];
  if (terminal) {
    // The terminal's fill is a lattice of dots, staggered, not engraved lines
    g.save(); g.clip(path); g.fillStyle = color;
    for (let r = 0, y = by; y < by + bh; y += gap, r++) for (let x = bx + (r % 2 ? gap / 2 : 0); x < bx + bw; x += gap) g.fillRect(x, y, 1.4, 1.4);
    g.restore(); return;
  }
  g.save(); g.clip(path);
  const t = (deg * Math.PI) / 180, cx = Math.cos(t), sy = Math.sin(t);
  const mx = bx + bw / 2, my = by + bh / 2, D = Math.hypot(bw, bh) / 2 + gap;
  g.strokeStyle = color; g.lineWidth = width; g.beginPath();
  for (let s = -D; s <= D; s += gap) {
    const ox = mx - sy * s, oy = my + cx * s;
    g.moveTo(ox - cx * D, oy - sy * D); g.lineTo(ox + cx * D, oy + sy * D);
  }
  g.stroke(); g.restore();
}

export function label(g: CanvasRenderingContext2D, text: string, x: number, y: number, o: {
  size?: number; weight?: number; color: string; align?: CanvasTextAlign; base?: CanvasTextBaseline; font?: string; a?: number;
}) {
  g.globalAlpha = o.a ?? 1;
  // Plex Mono is about a fifth wider than Plex Sans: a little smaller keeps every label where it was drawn
  g.font = `${o.weight ?? 400} ${(o.size ?? 12) * (terminal ? 0.92 : 1)}px ${o.font ?? SANS}`;
  g.fillStyle = o.color; g.textAlign = o.align ?? 'left'; g.textBaseline = o.base ?? 'alphabetic';
  g.fillText(text, x, y);
  g.globalAlpha = 1;
}

export const fmt = (x: number, d = 0) => x.toLocaleString('en-GB', { minimumFractionDigits: d, maximumFractionDigits: d });

/** Poisson draw by inversion; fine for the means used here (under 50). */
export function poisson(mean: number, r: () => number): number {
  let k = 0, p = Math.exp(-mean), s = p;
  const u = r();
  while (u > s && k < 1000) { k++; p *= mean / k; s += p; }
  return k;
}
