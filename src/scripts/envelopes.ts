// Section backgrounds: one family of straight lines on one fixed canvas behind the page. Each
// section has a classical envelope construction; while a section is being read the lines hold
// its construction, and between sections every line travels to its place in the next one, so
// the decoration is a single drawing that turns into the next rather than five separate ones.
// Treated like the title spiral: large, running off the right edge, every line tapered to
// nothing at both tips, dissolving before it reaches the text. It moves only with scroll.

import { isDark, onThemeChange, reducedMotion, rgba, smooth, tone, type Tone } from './palette';

type Seg = [number, number, number, number];
type Kind = 'astroid' | 'parabola' | 'times' | 'circle';

const K = 96;            // lines in the family; every construction is drawn with exactly K
const REVEAL = 1.6;      // seconds for the drawing to appear the first time
const MIN_FREE = 160;    // narrower free space beside the text than this: no figures
const EXTEND = 0.35;     // each line runs past its construction points by this fraction, then tapers out

interface Figure {
  el: HTMLElement;
  kind: Kind;
  m0?: number; m1?: number; spin?: number;
  fit?: { s: number; x: number; y: number };
}

// Each generator returns K segments, ordered so that neighbouring indices are neighbouring
// lines; morphing index by index then keeps the family orderly between constructions.
const generators: Record<Kind, (p: number, f: Figure) => Seg[]> = {
  // A ladder of length L sliding down a wall, in all four quadrants: the astroid
  astroid(p) {
    const out: Seg[] = [], q = K / 4, L = 0.86 + 0.14 * p;
    for (const [sx, sy] of [[1, -1], [-1, -1], [-1, 1], [1, 1]]) {
      for (let i = 0; i < q; i++) {
        const t = ((0.5 + i) / q) * (Math.PI / 2);
        out.push([sx * L * Math.cos(t), 0, 0, sy * L * Math.sin(t)]);
      }
    }
    return out;
  },
  // String art between two arms meeting at a vertex
  parabola(p) {
    const out: Seg[] = [], a1 = -Math.PI / 2, a2 = a1 + Math.PI * (0.3 + 0.18 * p);
    for (let i = 0; i < K; i++) {
      const u = (i + 1) / (K + 1);   // the arms themselves are never drawn
      out.push([Math.cos(a1) * u, Math.sin(a1) * u, Math.cos(a2) * (1 - u), Math.sin(a2) * (1 - u)]);
    }
    return out;
  },
  // Chord from point k to point m·k on a circle of K points
  times(p, f) {
    const out: Seg[] = [], m = f.m0! + (f.m1! - f.m0!) * p, rot = -Math.PI / 2 + (f.spin || 0) * p;
    for (let k = 0; k < K; k++) {
      const t0 = rot + (2 * Math.PI * k) / K, t1 = rot + (2 * Math.PI * k * m) / K;
      out.push([Math.cos(t0), Math.sin(t0), Math.cos(t1), Math.sin(t1)]);
    }
    return out;
  },
  // A circle from its tangent lines
  circle(p) {
    const out: Seg[] = [], r = 0.5, half = 0.82, rot = (p * Math.PI) / 2;
    for (let i = 0; i < K; i++) {
      const t = rot + (2 * Math.PI * i) / K, c = Math.cos(t), s = Math.sin(t);
      out.push([r * c - s * half, r * s + c * half, r * c + s * half, r * s - c * half]);
    }
    return out;
  },
};

/** Scale and offset that fit a figure, across its whole scroll range, into the unit square. */
function measure(f: Figure) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const p of [0, 0.25, 0.5, 0.75, 1]) {
    for (const g of generators[f.kind](p, f)) {
      x0 = Math.min(x0, g[0], g[2]); x1 = Math.max(x1, g[0], g[2]);
      y0 = Math.min(y0, g[1], g[3]); y1 = Math.max(y1, g[1], g[3]);
    }
  }
  return { s: 2 / Math.max(x1 - x0, y1 - y0), x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
}

/** A figure's K segments in unit coordinates, centred and scaled, at its section's scroll progress. */
function shape(f: Figure, p: number): Seg[] {
  const { s, x, y } = f.fit!;
  return generators[f.kind](p, f).map(([a, b, c, d]) => [(a - x) * s, (b - y) * s, (c - x) * s, (d - y) * s]);
}

export interface FigureSpec {
  selector: string;
  kind: Kind;
  m0?: number; m1?: number; spin?: number;
}

export function mountEnvelopes(canvas: HTMLCanvasElement, specs: FigureSpec[], anchor: HTMLElement): void {
  const ctx = canvas.getContext('2d')!;
  let W = 0, H = 0, tones: Tone[] = [], queued = false, born = 0;

  const figures: Figure[] = specs.flatMap((s) => {
    const el = document.querySelector<HTMLElement>(s.selector);
    if (!el) return [];
    const f: Figure = { ...s, el };
    f.fit = measure(f);
    return [f];
  });

  // The title spiral's palette, quieter
  function readTones() {
    const dark = isDark();
    tones = [
      tone('--ink', dark ? 0.2 : 0.34, 1.1),
      tone('--graphite', dark ? 0.32 : 0.42, 1),
      tone('--line-accent', dark ? 0.3 : 0.4, 1.1),
      tone('--rule', dark ? 0.7 : 1, 1.25),
      tone('--survey', dark ? 0.24 : 0.26, 1),
    ];
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    request();
  }

  /** Draws the family of lines; returns true while it is still appearing. */
  function draw(now: number): boolean {
    ctx.clearRect(0, 0, W, H);
    const edge = anchor.getBoundingClientRect().right, free = W - edge;
    if (free < MIN_FREE || !figures.length) return false;

    const line = H * 0.5;
    const rects = figures.map((f) => f.el.getBoundingClientRect());
    const first = rects[0], last = rects[rects.length - 1];

    // Strength: full while any section spans the reading line, fading before the first and after the last
    const gap = Math.max(0, first.top - line, line - last.bottom);
    const w = 1 - smooth(0, H * 0.4, gap);
    if (w < 0.01) return false;
    if (!born) born = now;
    const reveal = reducedMotion.matches ? 1 : Math.min(1, (now - born) / 1000 / REVEAL);

    // Which construction, and how far into the morph to the next: hold through the middle of each
    // section, travel between section centres
    const centres = rects.map((r) => (r.top + r.bottom) / 2);
    let k = 0;
    while (k < centres.length - 1 && line >= centres[k + 1]) k++;
    const span = k < centres.length - 1 ? centres[k + 1] - centres[k] : 1;
    const t = k < centres.length - 1 ? smooth(0.3, 0.7, (line - centres[k]) / span) : 0;
    const progress = (r: DOMRect) => Math.min(1, Math.max(0, (H - r.top) / (H + r.height)));

    const A = shape(figures[k], progress(rects[k]));
    const B = t > 0 ? shape(figures[k + 1], progress(rects[k + 1])) : A;

    // Larger than the free space: the figure is cropped by the window, never framed by it
    const R = Math.max(260, Math.min(520, H * 0.52));
    const cx = edge + Math.max(free * 0.62, 140), cy = line;
    const count = K * (1 - Math.pow(1 - reveal, 2));

    for (let i = 0; i < K && i < count; i++) {
      const a = A[i], b = B[i], tn = tones[(i * 7) % tones.length];
      const al = tn.a * w * Math.min(1, count - i);
      if (al < 0.004) continue;
      const ax = cx + R * (a[0] + (b[0] - a[0]) * t), ay = cy + R * (a[1] + (b[1] - a[1]) * t);
      const bx = cx + R * (a[2] + (b[2] - a[2]) * t), by = cy + R * (a[3] + (b[3] - a[3]) * t);
      const ex = (bx - ax) * EXTEND, ey = (by - ay) * EXTEND;
      const x0 = ax - ex, y0 = ay - ey, x1 = bx + ex, y1 = by + ey;
      // Taper: transparent at both tips, full strength in the middle, as on the title spiral
      const gr = ctx.createLinearGradient(x0, y0, x1, y1);
      gr.addColorStop(0, rgba(tn.rgb, 0));
      gr.addColorStop(0.25, rgba(tn.rgb, al * 0.45));
      gr.addColorStop(0.5, rgba(tn.rgb, al));
      gr.addColorStop(0.75, rgba(tn.rgb, al * 0.45));
      gr.addColorStop(1, rgba(tn.rgb, 0));
      ctx.strokeStyle = gr; ctx.lineWidth = tn.w;
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
    }

    // Dissolve towards the text: nothing reaches the main or margin columns
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createLinearGradient(edge, 0, edge + Math.min(free * 0.6, 280), 0);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = m; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    return reveal < 1;
  }

  function tick(now: number) {
    queued = false;
    if (draw(now)) request();
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(tick); } }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', resize);
  onThemeChange(() => { readTones(); request(); });
  readTones(); resize();
}
