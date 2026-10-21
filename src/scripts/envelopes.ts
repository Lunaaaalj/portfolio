// Section backgrounds: one classical envelope construction per section, drawn in the free space
// to the right of the text on one fixed canvas. Each figure is made only of straight lines; the
// curve is their envelope. A figure draws itself once when its section comes into view, and from
// then on moves only with scroll.

import { isDark, onThemeChange, reducedMotion, token, type Tone, tone } from './palette';

type Seg = [number, number, number, number];
type Kind = 'astroid' | 'parabola' | 'times' | 'circle';

interface Figure {
  el: HTMLElement;
  kind: Kind;
  label: (p: number) => string;
  m0?: number; m1?: number; n?: number; spin?: number;
  born: number;
}

const REVEAL = 1.6;      // seconds for a figure to draw itself
const MIN_WIDTH = 1100;  // below this there is no free space beside the text
const LABEL_SPACE = 240; // narrower free space than this: draw figures but no labels

const generators: Record<Kind, (R: number, p: number, f: Figure) => Seg[]> = {
  // A ladder of length L sliding down a wall, mirrored: half an astroid
  astroid(R, p) {
    const out: Seg[] = [], N = 34, L = R * 1.9 * (0.9 + 0.2 * p), oy = R * 0.75;
    for (let i = 0; i < N; i++) {
      const f = 0.04 + (0.92 * i) / (N - 1);
      const c = Math.cos((f * Math.PI) / 2), s = Math.sin((f * Math.PI) / 2);
      out.push([L * c, oy, 0, oy - L * s], [-L * c, oy, 0, oy - L * s]);
    }
    return out;
  },
  // String art between two arms meeting at a vertex
  parabola(R, p) {
    const out: Seg[] = [], N = 36, len = R * 1.9, vx = -R * 0.55, vy = R * 0.7;
    const a1 = -Math.PI / 2, a2 = a1 + Math.PI * (0.32 + 0.16 * p);
    for (let i = 0; i <= N; i++) {
      const u = i / N;
      out.push([vx + Math.cos(a1) * len * u, vy + Math.sin(a1) * len * u,
                vx + Math.cos(a2) * len * (1 - u), vy + Math.sin(a2) * len * (1 - u)]);
    }
    return out;
  },
  // Chord from point k to point m·k on a circle of n points
  times(R, p, f) {
    const out: Seg[] = [], n = f.n!, m = f.m0! + (f.m1! - f.m0!) * p, rot = -Math.PI / 2 + (f.spin || 0) * p;
    for (let k = 0; k < n; k++) {
      const t0 = rot + (2 * Math.PI * k) / n, t1 = rot + (2 * Math.PI * k * m) / n;
      out.push([R * Math.cos(t0), R * Math.sin(t0), R * Math.cos(t1), R * Math.sin(t1)]);
    }
    return out;
  },
  // A circle from its tangent lines
  circle(R, p) {
    const out: Seg[] = [], N = 40, r = R * 0.45, half = R * 0.95, rot = (p * Math.PI) / 2;
    for (let i = 0; i < N; i++) {
      const t = rot + (2 * Math.PI * i) / N, c = Math.cos(t), s = Math.sin(t);
      out.push([r * c - s * half, r * s + c * half, r * c + s * half, r * s - c * half]);
    }
    return out;
  },
};

export interface FigureSpec {
  selector: string;
  kind: Kind;
  label: string | ((p: number) => string);
  m0?: number; m1?: number; n?: number; spin?: number;
}

export function mountEnvelopes(canvas: HTMLCanvasElement, specs: FigureSpec[], anchor: HTMLElement): void {
  const ctx = canvas.getContext('2d')!;
  let W = 0, H = 0, tones: Tone[] = [], labelColour = '', queued = false;

  const figures: Figure[] = specs.flatMap((s) => {
    const el = document.querySelector<HTMLElement>(s.selector);
    if (!el) return [];
    const label = typeof s.label === 'string' ? () => s.label as string : s.label;
    return [{ ...s, el, label, born: 0 }];
  });

  function readTones() {
    const dark = isDark();
    tones = [
      tone('--graphite', dark ? 0.34 : 0.3),
      tone('--rule', dark ? 0.85 : 0.9),
      tone('--line-accent', dark ? 0.3 : 0.26),
      tone('--survey', dark ? 0.26 : 0.2),
    ];
    labelColour = token('--graphite');
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = window.innerWidth; H = window.innerHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    request();
  }

  /** Draws every figure in view; returns true while any is still drawing itself. */
  function draw(now: number): boolean {
    ctx.clearRect(0, 0, W, H);
    if (W < MIN_WIDTH) return false;
    const edge = anchor.getBoundingClientRect().right;
    const free = W - edge, R = Math.max(150, Math.min(290, free * 0.8));
    const labels: [string, number, number][] = [];
    let pending = false;

    for (const f of figures) {
      const rect = f.el.getBoundingClientRect();
      if (rect.bottom < -R || rect.top > H + R) continue;
      if (!f.born && rect.top < H * 0.8) f.born = now;
      if (!f.born) continue;
      const reveal = reducedMotion.matches ? 1 : Math.min(1, (now - f.born) / 1000 / REVEAL);
      if (reveal < 1) pending = true;

      const p = Math.min(1, Math.max(0, (H - rect.top) / (H + rect.height)));
      const cx = edge + free * 0.5, cy = rect.top + Math.min(rect.height * 0.45, R * 1.1);
      const segs = generators[f.kind](R, p, f);
      const count = segs.length * (1 - Math.pow(1 - reveal, 2));

      ctx.lineWidth = 1;
      for (let i = 0; i < segs.length && i < count; i++) {
        const g = segs[i], tn = tones[i % tones.length];
        ctx.strokeStyle = tn.c; ctx.globalAlpha = tn.a * Math.min(1, count - i);
        ctx.beginPath(); ctx.moveTo(cx + g[0], cy + g[1]); ctx.lineTo(cx + g[2], cy + g[3]); ctx.stroke();
      }
      if (free >= LABEL_SPACE) labels.push([f.label(p), rect.top + 18, reveal]);
    }

    // Fade towards the text: nothing is drawn under the main or margin columns
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    const m = ctx.createLinearGradient(edge - 120, 0, edge + 60, 0);
    m.addColorStop(0, 'rgba(0,0,0,0)'); m.addColorStop(1, 'rgba(0,0,0,1)');
    ctx.fillStyle = m; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';

    // Labels sit level with each section heading, clear of the fade
    ctx.font = '400 13px "IBM Plex Sans", system-ui, sans-serif';
    ctx.fillStyle = labelColour; ctx.textBaseline = 'alphabetic';
    for (const [text, y, a] of labels) {
      // Never compress a label to fit; leave it out when the gutter is too narrow
      if (ctx.measureText(text).width > free - 96) continue;
      ctx.globalAlpha = 0.9 * a;
      ctx.fillText(text, edge + 72, y);
    }
    ctx.globalAlpha = 1;
    return pending;
  }

  function tick(now: number) {
    queued = false;
    if (draw(now)) request();
  }
  function request() { if (!queued) { queued = true; requestAnimationFrame(tick); } }

  window.addEventListener('scroll', request, { passive: true });
  window.addEventListener('resize', resize);
  onThemeChange(() => { readTones(); request(); });
  document.fonts?.ready.then(request);
  readTones(); resize();
}
