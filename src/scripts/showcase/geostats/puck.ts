// Fig. 7. Hamiltonian Monte Carlo, on two of the model's roughly 2,300 dimensions. The surface is
// a Gaussian fitted to the 8,000 draws of α and σᵤ from the project's refit, so it is the real
// joint posterior of those two, summarised. A puck is kicked with a random momentum and coasts
// across it under leapfrog integration; where it stops is a draw, and a Metropolis test keeps the
// run exact. Four chains start far apart. This is plain Hamiltonian Monte Carlo with a random
// flight length: the project's sampler, NUTS, chooses the length itself. It runs on its own clock
// while the stage is on screen, with Pause and Replay, like Fig. 7 of the reforestation page.

import model from '../../../data/geostats-model.json';
import type { Ctx, Scene } from '../engine';
import { fmt, label, rgba } from '../draw';
import { rng } from '../../../lib/tile';

const [ma, ms] = model.pair.mean;
const sa = Math.sqrt(model.pair.cov[0][0]), ss = Math.sqrt(model.pair.cov[1][1]);
const rho = model.pair.cov[0][1] / (sa * ss), det = 1 - rho * rho;
/** The potential's gradient in standardised coordinates: U = ½ zᵀ R⁻¹ z. */
const grad = (x: number, y: number): [number, number] => [(x - rho * y) / det, (y - rho * x) / det];
const energy = (x: number, y: number) => 0.5 * (x * x - 2 * rho * x * y + y * y) / det;
const CHAINS = 4, WARM = 40, DRAWS = 2000, EPS = 0.2, REACH = 5.2;
const STARTS: [number, number][] = [[-4.4, 3.6], [4.2, 3.9], [-4.1, -3.9], [4.4, -3.2]];

interface Chain { x: number; y: number; path: [number, number][]; at: number; n: number; xs: number[]; ys: number[] }

export default function puck(): Scene {
  let chains: Chain[] = [], r = rng(42), paused = false, done = false, warmed = false;
  let ctxRef: Ctx | null = null, dots: HTMLCanvasElement | null = null, dg: CanvasRenderingContext2D | null = null;
  let box = { x: 0, y: 0, w: 0, h: 0 }, wide = true;
  const X = (z: number) => box.x + box.w / 2 + (z / REACH) * (box.w / 2);
  const Y = (z: number) => box.y + box.h / 2 - (z / REACH) * (box.h / 2);
  const normal = () => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

  const fly = (c: Chain) => {
    let x = c.x, y = c.y, px = normal(), py = normal();
    const h0 = energy(x, y) + 0.5 * (px * px + py * py);
    const path: [number, number][] = [[x, y]];
    const steps = 9 + Math.floor(r() * 16);
    let [gx, gy] = grad(x, y);
    for (let s = 0; s < steps; s++) {
      px -= (EPS / 2) * gx; py -= (EPS / 2) * gy;
      x += EPS * px; y += EPS * py;
      [gx, gy] = grad(x, y);
      px -= (EPS / 2) * gx; py -= (EPS / 2) * gy;
      path.push([x, y]);
    }
    const h1 = energy(x, y) + 0.5 * (px * px + py * py);
    if (Math.log(1 - r()) >= h0 - h1) path.length = 1;   // rejected: it stays where it was
    c.path = path; c.at = 0;
  };

  const land = (c: Chain) => {
    const [x, y] = c.path[c.path.length - 1];
    c.x = x; c.y = y; c.n++;
    if (c.n > WARM) {
      c.xs.push(x); c.ys.push(y);
      if (dg && ctxRef) { dg.fillStyle = rgba(ctxRef.c.survey, 0.3); dg.fillRect(X(x) - 1, Y(y) - 1, 2, 2); }
    }
  };

  const reset = () => {
    r = rng(42); done = false; warmed = false;
    chains = STARTS.map(([x, y]) => ({ x, y, path: [[x, y]], at: 0, n: 0, xs: [], ys: [] }));
    chains.forEach(fly);
    dg?.clearRect(0, 0, 1e5, 1e5);
  };

  const advance = (steps: number) => {
    for (const c of chains) {
      let left = steps;
      while (left > 0 && c.xs.length < DRAWS) {
        const go = Math.min(left, c.path.length - 1 - c.at);
        c.at += go; left -= go;
        if (c.at >= c.path.length - 1) { land(c); left -= 1; if (c.xs.length < DRAWS) fly(c); }
      }
    }
    done = chains.every((c) => c.xs.length >= DRAWS);
    warmed = chains.every((c) => c.n > WARM);
  };

  /** The Gelman–Rubin statistic over the four chains, on α. */
  const rhat = () => {
    const n = Math.min(...chains.map((c) => c.xs.length));
    if (n < 20) return null;
    const means = chains.map((c) => c.xs.slice(0, n).reduce((a, b) => a + b, 0) / n);
    const mean = means.reduce((a, b) => a + b, 0) / CHAINS;
    const B = (n / (CHAINS - 1)) * means.reduce((s, v) => s + (v - mean) ** 2, 0);
    const W = chains.reduce((s, c, q) => s + c.xs.slice(0, n).reduce((t, v) => t + (v - means[q]) ** 2, 0) / (n - 1), 0) / CHAINS;
    return Math.sqrt(((n - 1) / n * W + B / n) / W);
  };

  return {
    setup(ctx) {
      ctxRef = ctx;
      for (const b of ctx.el.querySelectorAll<HTMLButtonElement>('.scene-btn')) {
        b.addEventListener('click', () => {
          if (b.dataset.act === 'pause') { paused = !paused; b.setAttribute('aria-pressed', String(paused)); b.textContent = paused ? 'Play' : 'Pause'; }
          else {
            reset(); paused = false;
            const pb = ctx.el.querySelector<HTMLButtonElement>('[data-act="pause"]');
            if (pb) { pb.setAttribute('aria-pressed', 'false'); pb.textContent = 'Pause'; }
          }
        });
      }
    },
    layout(ctx) {
      const { w, h, dpr } = ctx;
      ctxRef = ctx; wide = w > 560;
      const pad = wide ? 58 : 34, top = wide ? 96 : 76, bottom = wide ? 74 : 74;
      box = { x: pad, y: top, w: w - pad - (wide ? 32 : 16), h: h - top - bottom };
      dots = document.createElement('canvas');
      dots.width = Math.round(w * dpr); dots.height = Math.round(h * dpr);
      dg = dots.getContext('2d')!; dg.scale(dpr, dpr);
      if (!chains.length) reset();
      else {
        dg.fillStyle = rgba(ctx.c.survey, 0.3);
        for (const c of chains) c.xs.forEach((x, q) => dg!.fillRect(X(x) - 1, Y(c.ys[q]) - 1, 2, 2));
      }
      if (!ctx.live && !done) advance(1e7);
    },
    draw({ g, c, readout, pinned, live, w, h }) {
      const running = live && pinned && !paused && !done;
      if (running) {
        const flights = chains[0].n;
        advance(Math.min(240, 1 + Math.floor(flights * flights * 0.0016 + flights * 0.12)));
      }

      // The surface: its level sets, engraved, every fourth one heavier
      g.save(); g.beginPath(); g.rect(box.x, box.y, box.w, box.h); g.clip();
      for (let q = 1; q <= 26; q++) {
        const lev = q * 0.5;
        g.strokeStyle = q % 4 ? rgba(c.contour, 0.5) : c.contour; g.lineWidth = q % 4 ? 0.6 : 1;
        g.beginPath();
        for (let t = 0; t <= 72; t++) {
          const th = (t / 72) * 2 * Math.PI, a = lev * Math.cos(th), b = lev * (rho * Math.cos(th) + Math.sqrt(det) * Math.sin(th));
          t ? g.lineTo(X(a), Y(b)) : g.moveTo(X(a), Y(b));
        }
        g.stroke();
      }
      if (dots) g.drawImage(dots, 0, 0, w, h);

      // The flights in the air: the page's one oxblood line, here a sampler's rather than an optimiser's
      if (!done) for (const ch of chains) {
        g.strokeStyle = c.accent; g.lineWidth = 1.25; g.beginPath();
        for (let q = 0; q <= ch.at; q++) { const [x, y] = ch.path[q]; q ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y)); }
        g.stroke();
        const [hx, hy] = ch.path[Math.min(ch.at, ch.path.length - 1)];
        g.fillStyle = c.accent; g.beginPath(); g.arc(X(hx), Y(hy), 3.5, 0, Math.PI * 2); g.fill();
      }
      g.restore();

      // Axes, in the parameters' own units
      g.strokeStyle = c.ink; g.lineWidth = 1; g.strokeRect(box.x + 0.5, box.y + 0.5, box.w - 1, box.h - 1);
      for (const z of [-4, -2, 0, 2, 4]) {
        label(g, (ma + z * sa).toFixed(2), X(z), box.y + box.h + 17, { size: 11, color: c.graphite, align: 'center' });
        label(g, (ms + z * ss).toFixed(2), box.x - 7, Y(z) + 4, { size: 11, color: c.graphite, align: 'right' });
      }
      label(g, 'α', box.x + box.w, box.y + box.h + 34, { size: 12, color: c.graphite, align: 'right' });
      label(g, 'σᵤ', box.x - 7, box.y - 8, { size: 12, color: c.graphite, align: 'right' });

      const n = chains.reduce((s, ch) => s + ch.xs.length, 0), R = rhat();
      readout(`${warmed ? `${fmt(n)} of ${fmt(CHAINS * DRAWS)} draws` : 'warming up'}\n${CHAINS} chains${R ? `\nR-hat on α ${R.toFixed(3)}` : ''}`);
      return running;
    },
  };
}
