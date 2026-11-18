// The background of the home page: the radial firing graph of the character transformer, drawn
// too large for the screen and off centre ("eclipse"). The model reads the section in view one
// character at a time. Rings, from the centre out: the residual stream after the embedding (48),
// MLP layer 0 (192), MLP layer 1 (192), and the 50 characters it can predict, on the rim. With
// each character, the eight most active units of each layer fire along their two strongest
// direct-path weights (LayerNorm gain folded in): the edges flash, layer after layer, outwards.
// The back canvas, blurred by CSS, holds the glow of the units that fire. Scrolling turns the wheel.
import type { Model } from './forward';
import { directWeights, liveGraph } from './graph';

export interface Options {
  model: Model;
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  /** elements whose text the model reads (a window's body, not its bar); data-feed names each one */
  feeds: HTMLElement[];
  /** the reading column; the wheel recedes behind it */
  column: HTMLElement;
  /** statusline fields, filled each step */
  status: Partial<Record<'mode' | 'feed' | 'edges' | 'next' | 'nll' | 'step', HTMLElement | null>>;
}

const STEP_MS = 1000;         // one character read
const FLASH_MS = 520;         // how long an edge's flash takes to decay
const STAGGER_MS = 140;       // delay between one layer's flash and the next, outwards
const SPIN_MS = 100000;       // the slow drift of the wheel, ms per radian
const RF = [0.2, 0.5, 0.76, 0.96];
const MONO = '"IBM Plex Mono", ui-monospace, monospace';


export function mountNetwork(o: Options) {
  const F = o.model, { vocab: VOC, T, D, M } = F, V = VOC.length;
  const root = document.documentElement;
  const B = o.back.getContext('2d')!, X = o.front.getContext('2d')!;
  const still = matchMedia('(prefers-reduced-motion: reduce)');

  // ---- colours from the CSS tokens
  const C: Record<string, number[]> = {};
  const hex = (h: string) => { h = h.trim().replace('#', ''); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
  const col = (k: string, a = 1) => `rgba(${C[k][0]},${C[k][1]},${C[k][2]},${Math.max(0, Math.min(1, a))})`;
  const readColors = () => { const cs = getComputedStyle(root); for (const k of ['ink', 'dim', 'red']) C[k] = hex(cs.getPropertyValue('--' + k)); };
  readColors();
  const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
  const argmax = (a: ArrayLike<number>) => { let b = 0; for (let i = 1; i < a.length; i++) if (a[i] > a[b]) b = i; return b; };

  const W = directWeights(F), SIZES = [D, M, M, V];

  // ---- what the model reads: the page's text, folded into its 50-character vocabulary
  const norm = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[’‘]/g, "'")
    .replace(/[–—−]/g, '-').replace(/\s+/g, ' ').split('').map((c) => (VOC.includes(c) ? c : ' ')).join('').replace(/ {2,}/g, ' ');
  const feeds = o.feeds.map((el) => ({ el, name: el.dataset.feed ?? '', text: norm((el.querySelector<HTMLElement>('.win-body') ?? el).innerText).trim() + ' ', p: 0 }));
  let active = feeds[0];
  let ctx = active.text.slice(0, T); active.p = ctx.length;
  let R = F.run(ctx), step = 0, lastNll = 0, ema: number | null = null, paused = false, lastStep = performance.now();

  // the live edges: the eight most active units per layer, each to its two strongest targets (graph.ts)
  let prev = new Set<string>();
  function live() { const g = liveGraph(F, R, W, prev); prev = g.keys; return { E: g.E, A: g.A }; }
  let S = live();

  function tick() {
    const f = active, c = f.text[f.p % f.text.length]; f.p++;
    lastNll = -Math.log(Math.max(1e-6, R.prob[Math.max(0, VOC.indexOf(c))]));
    ema = ema == null ? lastNll : ema * 0.98 + lastNll * 0.02;
    ctx = (ctx + c).slice(-T); R = F.run(ctx); S = live(); step++; lastStep = performance.now();
    status();
  }

  // ---- geometry: an oversized wheel, off centre, its rim running off the screen
  let VW = 0, VH = 0;
  let G = { cx: 0, cy: 0, r0: 0, k: 1, sz: 1, veil: 0 };
  function resize() {
    const dpr = Math.min(2, devicePixelRatio || 1); VW = innerWidth; VH = innerHeight;
    for (const [c, x] of [[o.back, B], [o.front, X]] as const) {
      c.width = Math.round(VW * dpr); c.height = Math.round(VH * dpr);
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.textBaseline = 'top';
    }
    const wide = VW >= 1100, right = o.column.getBoundingClientRect().right;
    G = wide ? { cx: VW * 0.76, cy: VH * 0.6, r0: Math.max(VW, VH) * 0.54, k: 0.85, sz: 1.4, veil: right }
             : { cx: VW * 0.62, cy: VH * 0.94, r0: Math.max(VW, VH) * 0.5, k: 0.3, sz: 1.1, veil: 0 };
    if (still.matches) draw();
  }
  let scrollRot = 0;
  const rot = () => (still.matches ? 0 : performance.now() / SPIN_MS) + scrollRot;
  const ang = (l: number, i: number) => rot() * (l % 2 ? -1 : 1) + (i / SIZES[l]) * Math.PI * 2 - Math.PI / 2;
  const pos = (l: number, i: number) => [G.cx + Math.cos(ang(l, i)) * RF[l] * G.r0, G.cy + Math.sin(ang(l, i)) * RF[l] * G.r0];

  // the section nearest the reading line is the one the model reads
  function onScroll() {
    scrollRot = scrollY / 4000;
    const mid = VH * 0.42;
    let best = active, bd = Infinity;
    for (const f of feeds) {
      const r = f.el.getBoundingClientRect(); if (r.bottom < 0 || r.top > VH) continue;
      const d = r.top <= mid && r.bottom >= mid ? 0 : Math.min(Math.abs(r.top - mid), Math.abs(r.bottom - mid));
      if (d < bd) { bd = d; best = f; }
    }
    if (best !== active) { active = best; status(); }
    for (const f of feeds) f.el.classList.toggle('is-read', f === active);
    if (still.matches) draw();
  }

  // ---- draw
  function draw() {
    // phosphor: the previous frame fades rather than clears
    X.globalCompositeOperation = 'destination-out'; X.fillStyle = 'rgba(0,0,0,0.3)'; X.fillRect(0, 0, VW, VH);
    X.globalCompositeOperation = 'source-over';
    if (still.matches) X.clearRect(0, 0, VW, VH);
    B.clearRect(0, 0, VW, VH);
    const { cx, cy, r0, k, sz } = G, { E, A } = S, p = argmax(R.prob);
    // flash of layer l at this instant: 1 when it fires, decaying to 0; layers fire one after another
    const age = performance.now() - lastStep;
    const flash = (l: number) => (still.matches ? 0 : Math.pow(clamp(1 - (age - l * STAGGER_MS) / FLASH_MS, 0, 1), 2) * (age >= l * STAGGER_MS ? 1 : 0));
    const hot = new Set<string>();   // units an edge is flashing into, lit with it
    // rings and the dial
    X.lineWidth = 1;
    for (const f of RF) { X.strokeStyle = col('dim', 0.22 * k); X.beginPath(); X.arc(cx, cy, f * r0, 0, 7); X.stroke(); }
    X.strokeStyle = col('dim', 0.35 * k);
    for (let t = 0; t < 120; t++) {
      const a = rot() + (t / 120) * Math.PI * 2, r1 = r0 * 1.02, r2 = r0 * (t % 10 ? 1.035 : 1.06);
      X.beginPath(); X.moveTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); X.lineTo(cx + Math.cos(a) * r2, cy + Math.sin(a) * r2); X.stroke();
    }
    // live edges, bowed slightly towards the centre; a new edge flashes when its layer fires,
    // one that persists from the last character flashes faintly
    for (const e of E) {
      const [x1, y1] = pos(e.l, e.s), [x2, y2] = pos(e.l + 1, e.t), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      const qx = mx + (cx - mx) * 0.25, qy = my + (cy - my) * 0.25, f = flash(e.l) * (e.fresh ? 1 : 0.3);
      const base = (0.12 + 0.5 * e.w) * k;
      X.strokeStyle = col('ink', base + (1 - base) * f); X.lineWidth = (0.6 + e.w) * 1.2 + 1.6 * f;
      X.beginPath(); X.moveTo(x1, y1); X.quadraticCurveTo(qx, qy, x2, y2); X.stroke();
      if (f > 0.02) {
        // the glow of the flash, on the blurred back canvas
        B.strokeStyle = col('ink', 0.7 * f); B.lineWidth = 5 * f + 1;
        B.beginPath(); B.moveTo(x1, y1); B.quadraticCurveTo(qx, qy, x2, y2); B.stroke();
        if (f > 0.3) hot.add(`${e.l + 1}.${e.t}`);
      }
    }
    // units, and the characters on the rim; the red one is the model's guess
    X.font = `500 ${Math.round(12 * sz)}px ${MONO}`;
    const cw = X.measureText('M').width;
    SIZES.forEach((n, l) => {
      for (let i = 0; i < n; i++) {
        const [x, y] = pos(l, i), a = A[l][i];
        if (x < -30 || y < -30 || x > VW + 30 || y > VH + 30) continue;
        if (l === 3) {
          X.fillStyle = i === p ? col('red', Math.max(k, 0.7)) : col('ink', (0.3 + 0.7 * a) * k);
          X.fillText(VOC[i] === ' ' ? '·' : VOC[i], x - cw / 2, y - 8 * sz);
          continue;
        }
        const lit = hot.has(`${l}.${i}`);
        X.fillStyle = col('ink', lit ? 1 : (0.18 + 0.82 * a) * k);
        const s = (1.5 + 3 * a + (lit ? 2 : 0)) * sz; X.fillRect(x - s / 2, y - s / 2, s, s);
        if (a > 0.5) { B.fillStyle = col('ink', a * 0.5 * k); B.beginPath(); B.arc(x, y, (4 + a * 10) * sz, 0, 7); B.fill(); }
      }
    });
    // a veil over the reading column: the wheel recedes where the text is
    if (G.veil) {
      const w = G.veil + 120, g = X.createLinearGradient(0, 0, w, 0);
      g.addColorStop(0, 'rgba(0,0,0,0.62)'); g.addColorStop(Math.max(0, (G.veil - 160) / w), 'rgba(0,0,0,0.62)'); g.addColorStop(1, 'rgba(0,0,0,0)');
      X.globalCompositeOperation = 'destination-out'; X.fillStyle = g; X.fillRect(0, 0, w, VH);
      X.globalCompositeOperation = 'source-over';
    }
  }

  // ---- statusline
  const set = (k: keyof Options['status'], v: string) => { const el = o.status[k]; if (el) el.textContent = v; };
  function status() {
    const p = argmax(R.prob), c = VOC[p] === ' ' ? '␣' : VOC[p];
    set('mode', paused ? 'PAUSE' : 'FIRE');
    set('feed', active.name);
    set('edges', `${S.E.length} edges`);
    set('next', `…${ctx.slice(-22)}▸ '${c}' ${R.prob[p].toFixed(2)}`);
    set('nll', `nll ${lastNll.toFixed(2)} · ${(ema ?? 0).toFixed(2)}`);
    set('step', `step ${String(step).padStart(5, '0')}`);
  }

  // ---- loop: a fixed step for the model, frames at most every 33 ms
  let last = performance.now(), acc = 0, lastFrame = 0, raf = 0;
  function frame(t: number) {
    if (!paused && !document.hidden) { acc += Math.min(250, t - last); while (acc >= STEP_MS) { acc -= STEP_MS; tick(); } }
    last = t;
    if (t - lastFrame >= 33) { draw(); lastFrame = t; }
    raf = requestAnimationFrame(frame);
  }
  function start() {
    cancelAnimationFrame(raf);
    if (still.matches) { draw(); return; }
    last = performance.now(); raf = requestAnimationFrame(frame);
  }
  addEventListener('resize', resize);
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('themechange', () => { readColors(); if (still.matches) draw(); });
  still.addEventListener('change', start);
  resize(); onScroll(); status();
  if (still.matches) { for (let i = 0; i < 40; i++) tick(); }
  start();

  return {
    togglePause() { paused = !paused; status(); return paused; },
  };
}
