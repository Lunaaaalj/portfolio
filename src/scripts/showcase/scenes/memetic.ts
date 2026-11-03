// Fig. 8. The memetic algorithm, running in the browser on key 1's composition with seed 42
// (src/lib/tile.ts). First, tabu search improves the random tile of Fig. 7 one swap at a time.
// Then the population of 20 is built, and generations run: two binary tournaments pick the
// parents (marked on the shelf), the child inherits whole species from each parent in turn,
// tabu search improves it, and it replaces the worst tile if it is better and not a copy. The
// first generations play slowly; the rest run fast until 100 pass without improvement. The trace
// is the best competition so far, drawn as the site's optimiser path; the dashed floor is the
// exact integer program's lower bound after 300 s (report, 74.70).
//
// It runs on its own clock while the stage is on screen, and pauses otherwise.

import type { Scene, Ctx } from '../engine';
import { ease, seg, label, rgba, clamp, lerp, fmt } from '../draw';
import { memetic, tabu, rng, N, score, type MemeticEvent, type Ind } from '../../../lib/tile';
import { drawTile, drawMini, fitTile, at, type TileBox } from '../tiledraw';
import { keyOne, mixOne, randomOne } from './springs';

type Phase = 'intro' | 'seed' | 'gens' | 'fast' | 'floor' | 'done';

export default function memeticScene(): Scene {
  let phase: Phase, introGen: Generator<any, any>, run: Generator<MemeticEvent, Ind>;
  let bench: number[], benchLabel: string, pop: (Ind | null)[], marks: Map<number, string>;
  let introTrace: number[], genTrace: number[], gen: number, idle: number, best: number;
  let pending: { e: MemeticEvent; t: number } | null, wait: number, swapAnim: { u: number; v: number; t: number } | null;
  let floorT: number, paused = false, done = false;
  let shelf: TileBox[] = [], wb: TileBox = { x: 0, y: 0, S: 0, H: 0 }, chart = { x: 0, y: 0, w: 0, h: 0 }, shelfBox = { x: 0, y: 0, w: 0, h: 0 };
  let ctxRef: Ctx | null = null;

  const reset = () => {
    phase = 'intro'; introGen = tabu(randomOne, rng(3)); run = memetic(mixOne, 42);
    bench = [...randomOne]; benchLabel = 'Tabu search on the tile of Fig. 7'; pop = Array(20).fill(null); marks = new Map();
    introTrace = [score(randomOne)]; genTrace = []; gen = 0; idle = 0; best = Infinity;
    pending = null; wait = 0.6; swapAnim = null; floorT = 0; done = false;
  };
  reset();

  /** Advance the algorithm by up to `budget` ms of work, or until something needs showing. */
  function step(dt: number) {
    wait -= dt;
    if (swapAnim) { swapAnim.t += dt / 0.32; if (swapAnim.t >= 1) swapAnim = null; else return; }
    if (wait > 0) return;
    const t0 = performance.now();
    if (phase === 'intro') {
      // Slow for the first swaps, then faster, then the idle tail all at once
      while (performance.now() - t0 < 6) {
        const x = introGen.next();
        if (x.done) { phase = 'seed'; benchLabel = 'Building the population: 20 tiles, each improved by tabu search'; wait = 0.8; return; }
        const e = x.value;
        const k = introTrace.length;
        [bench[e.u], bench[e.v]] = [bench[e.v], bench[e.u]];
        introTrace.push(e.best);
        if (e.score > e.best + 1e-9 && k > 40) continue;          // past the best: no need to show each one
        if (k < 14) { swapAnim = { u: e.u, v: e.v, t: 0 }; wait = 0.12; return; }
        if (k < 60) { wait = 0.05; return; }
      }
      return;
    }
    while (performance.now() - t0 < (phase === 'fast' ? 8 : 5)) {
      const x = run.next();
      if (x.done) { phase = 'floor'; floorT = 0; bench = [...x.value.a]; benchLabel = `Best tile: ${x.value.score.toFixed(2)}`; marks.clear(); return; }
      const e = x.value;
      const slow = phase !== 'fast';
      switch (e.t) {
        case 'swap':
          if (phase === 'seed' || !slow) break;
          [bench[e.u], bench[e.v]] = [bench[e.v], bench[e.u]];
          if (swapsShown++ < 6) { swapAnim = { u: e.u, v: e.v, t: 0 }; wait = 0.06; return; }
          break;
        case 'seed':
          pop[e.index] = e.ind; best = Math.min(best, e.ind.score); wait = 0.12; return;
        case 'init':
          phase = 'gens'; benchLabel = ''; genTrace.push(best); wait = 0.8; return;
        case 'select':
          gen = e.gen; marks.clear();
          if (!slow) break;
          for (const [i, j] of e.pair) { marks.set(i, 'tour'); marks.set(j, 'tour'); }
          bench = Array(N).fill(-1); benchLabel = `Generation ${gen}: two tournaments pick the parents`;
          wait = 0.9;
          pending = { e, t: 0 };
          return;
        case 'inherit':
          if (pending?.e.t === 'select') { const [a, b] = (pending.e as any).parents; marks.clear(); marks.set(a, 'A'); marks.set(b, 'B'); pending = null; }
          if (!slow) break;
          bench = e.child; benchLabel = `Inherits ${e.cells.length} × ${keyCode(e.s)} from parent ${e.from ? 'B' : 'A'}`;
          wait = 0.38; return;
        case 'greedy':
          if (!slow) break;
          bench = e.child; benchLabel = `Fills ${e.cells.length} left over, each with the least competition`; wait = 0.6; swapsShown = 0; return;
        case 'child':
          if (!slow) break;
          bench = [...e.a]; benchLabel = `Tabu search improves the child to ${e.score.toFixed(2)}`; wait = 0.9; return;
        case 'replace':
          pop = e.pop;
          if (!slow) break;
          marks.clear();
          if (e.index !== null) { marks.set(e.index, 'new'); benchLabel = 'It replaces the worst tile'; }
          else benchLabel = e.reason === 'copy' ? 'A copy of a tile already kept: discarded' : 'No better than the worst tile: discarded';
          wait = 1.1; return;
        case 'gen':
          genTrace.push(e.best); idle = e.idle; best = e.best;
          if (gen >= 3 && phase === 'gens') { phase = 'fast'; benchLabel = 'Then the generations run on'; }
          if (!slow) { bench = [...(pop.reduce((x, y) => (y && (!x || y.score < x.score) ? y : x), null as Ind | null)!.a)]; marks.clear(); }
          break;
      }
    }
  }
  let swapsShown = 0;
  const keyCode = (s: number) => ['ALE', 'ASA', 'ASC', 'AST', 'OCA', 'OEN', 'ORO', 'OST', 'PLA', 'YFI'][s];

  return {
    setup(ctx) {
      ctxRef = ctx;
      const btns = ctx.el.querySelectorAll<HTMLButtonElement>('.scene-btn');
      btns.forEach((b) => b.addEventListener('click', () => {
        if (b.dataset.act === 'pause') { paused = !paused; b.setAttribute('aria-pressed', String(paused)); b.textContent = paused ? 'Play' : 'Pause'; }
        else { reset(); paused = false; const pb = ctx.el.querySelector<HTMLButtonElement>('[data-act="pause"]'); if (pb) { pb.setAttribute('aria-pressed', 'false'); pb.textContent = 'Pause'; } }
        dispatchEvent(new Event('scroll'));
      }));
    },
    layout({ w, h }) {
      const tall = w / h < 1.1, pad = 20;
      const cols = tall ? 5 : 10, rows = 20 / cols;
      shelfBox = { x: pad, y: tall ? 78 : 52, w: w - 2 * pad - (tall ? 0 : 170), h: h * 0.24 };
      const cw = shelfBox.w / cols, ch = shelfBox.h / rows;
      shelf = Array.from({ length: 20 }, (_, i) => fitTile(shelfBox.x + (i % cols) * cw + 4, shelfBox.y + Math.floor(i / cols) * ch + 2, cw - 8, ch - 18));
      const top = shelfBox.y + shelfBox.h + 34;
      if (tall) {
        wb = fitTile(pad, top, w - 2 * pad, (h - top) * 0.52, (h - top) * 0.52 > (w - 2 * pad) * 1.1);
        chart = { x: pad + 34, y: top + (h - top) * 0.6, w: w - 2 * pad - 44, h: (h - top) * 0.4 - 56 };
      } else {
        wb = fitTile(pad, top, (w - 2 * pad) * 0.56, h - top - 70);
        chart = { x: pad + (w - 2 * pad) * 0.6 + 34, y: top + 20, w: (w - 2 * pad) * 0.4 - 44, h: h - top - 120 };
      }
    },
    draw(ctx, p) {
      const { g, c, live, readout } = ctx;
      if (!live) return drawStatic(ctx);
      const appear = ease(seg(p, 0, 0.06));
      const running = ctx.pinned && !paused && !done;
      if (running) {
        step(ctx.dt);
        if (phase === 'floor') { floorT = clamp(floorT + ctx.dt / 1.4); if (floorT >= 1) { phase = 'done'; done = true; } }
      }
      g.globalAlpha = appear;
      // Shelf
      if (pop.some(Boolean)) label(g, 'Population', shelfBox.x, shelfBox.y - 16, { size: 12, weight: 500, color: c.ink });
      pop.forEach((ind, i) => {
        const b = shelf[i];
        if (!ind) { return; }
        const m = marks.get(i);
        drawMini(g, c, b, ind.a, m === 'tour' ? 0.9 : m ? 1 : 0.62);
        const x0 = b.x - b.S * 0.7, y0 = b.y - b.S * 0.7, x1 = b.x + 13 * b.S - b.S * 0.1, y1 = b.y + 3 * b.H + b.S * 0.7;
        if (m) {
          g.strokeStyle = m === 'new' ? c.ink : m === 'tour' ? c.graphite : c.ink; g.lineWidth = m === 'tour' ? 1 : 1.5;
          g.strokeRect(x0, y0, x1 - x0, y1 - y0);
        }
        label(g, ind.score.toFixed(2) + (m === 'A' || m === 'B' ? `  parent ${m}` : m === 'new' ? '  new' : ''), x0, y1 + 12, { size: 11, weight: m && m !== 'tour' ? 600 : 400, color: m ? c.ink : c.graphite });
      });
      // Workbench
      const move = new Map<number, [number, number]>();
      if (swapAnim) {
        const [x1, y1] = at(wb, swapAnim.u), [x2, y2] = at(wb, swapAnim.v), t = ease(swapAnim.t);
        const lift = Math.hypot(x2 - x1, y2 - y1) * 0.35;
        const mid = (a: number, b: number, k: number, up: number) => lerp(a, b, k) - Math.sin(Math.PI * k) * up;
        // bench already holds the swapped state: v's plant travels from u, u's from v
        move.set(swapAnim.v, [lerp(x1, x2, t), mid(y1, y2, t, lift)]);
        move.set(swapAnim.u, [lerp(x2, x1, t), mid(y2, y1, t, -lift)]);
        g.strokeStyle = c.accent; g.lineWidth = 1; g.setLineDash([3, 3]);
        g.beginPath(); g.moveTo(x1, y1); g.quadraticCurveTo((x1 + x2) / 2, (y1 + y2) / 2 - lift * 2, x2, y2); g.stroke(); g.setLineDash([]);
      }
      drawTile(g, c, wb, bench, { codes: wb.S > 30, move, springs: 1 });
      if (benchLabel) label(g, benchLabel, wb.x - wb.S * 0.5, wb.y - wb.S * 0.75 - 6, { size: 13, weight: 500, color: c.ink });
      drawChart(ctx);
      g.globalAlpha = 1;
      const cur = phase === 'intro' ? introTrace[introTrace.length - 1] : best;
      readout(`${phase === 'intro' ? `swap ${introTrace.length - 1}` : gen ? `generation ${gen}` : 'building population'}\nbest ${Number.isFinite(cur) ? cur.toFixed(2) : '–'}${gen ? `\nwithout improvement ${idle}` : ''}`);
      return running || !!swapAnim;
    },
  };

  function drawChart({ g, c }: Ctx, still = false) {
    const lo = 72, hi = 96, Y = (v: number) => chart.y + chart.h - ((v - lo) / (hi - lo)) * chart.h;
    const split = chart.x + chart.w * 0.38;
    g.strokeStyle = c.rule; g.lineWidth = 1;
    for (const v of [75, 80, 85, 90, 95]) {
      g.beginPath(); g.moveTo(chart.x, Y(v) + 0.5); g.lineTo(chart.x + chart.w, Y(v) + 0.5); g.stroke();
      label(g, String(v), chart.x - 8, Y(v) + 4, { size: 11, color: c.graphite, align: 'right' });
    }
    g.beginPath(); g.moveTo(split + 0.5, chart.y); g.lineTo(split + 0.5, chart.y + chart.h); g.stroke();
    label(g, 'Tabu search, swaps', chart.x, chart.y + chart.h + 18, { size: 11, color: c.graphite });
    label(g, 'Generations', split + 8, chart.y + chart.h + 18, { size: 11, color: c.graphite });
    label(g, 'Competition of the best tile', chart.x, chart.y - 12, { size: 12, weight: 500, color: c.ink });
    // Random expectation
    g.strokeStyle = c.graphite; g.setLineDash([4, 4]);
    g.beginPath(); g.moveTo(chart.x, Y(keyOne.random)); g.lineTo(chart.x + chart.w, Y(keyOne.random)); g.stroke(); g.setLineDash([]);
    label(g, `Random, ${keyOne.random.toFixed(2)}`, chart.x + chart.w, Y(keyOne.random) - 6, { size: 11, color: c.graphite, align: 'right' });
    // The optimiser's path
    const it = introTrace, gt = genTrace;
    const nI = Math.max(60, it.length - 1), nG = Math.max(30, gt.length - 1);
    const xI = (k: number) => chart.x + (Math.log1p(k) / Math.log1p(nI)) * (split - chart.x - 4);
    const xG = (k: number) => split + 4 + (k / nG) * (chart.x + chart.w - split - 4);
    g.strokeStyle = c.accent; g.lineWidth = 2; g.lineJoin = 'round'; g.beginPath();
    it.forEach((v, k) => (k ? g.lineTo(xI(k), Y(v)) : g.moveTo(xI(k), Y(v))));
    gt.forEach((v, k) => g.lineTo(xG(k), Y(v)));
    g.stroke();
    const last = gt.length ? [xG(gt.length - 1), Y(gt[gt.length - 1])] : [xI(it.length - 1), Y(it[it.length - 1])];
    g.fillStyle = c.accent; g.beginPath(); g.arc(last[0], last[1], 3.5, 0, Math.PI * 2); g.fill();
    // The exact solver's lower bound
    const f = still ? 1 : ease(floorT);
    if (f > 0 && keyOne.bound) {
      const yb = lerp(chart.y + chart.h, Y(keyOne.bound), f);
      g.strokeStyle = c.ink; g.lineWidth = 1.25; g.setLineDash([6, 4]);
      g.beginPath(); g.moveTo(split, yb); g.lineTo(chart.x + chart.w, yb); g.stroke(); g.setLineDash([]);
      label(g, `Exact lower bound, ${keyOne.bound.toFixed(2)}`, chart.x + chart.w, yb + 16, { size: 11, color: c.ink, align: 'right', a: f });
    }
  }

  function drawStatic(ctx: Ctx) {
    const { g, c, readout } = ctx;
    // The report's best tile, the tabu descent of Fig. 7's tile, and the bound
    if (introTrace.length < 2) {
      const x = tabu(randomOne, rng(3));
      let r = x.next();
      while (!r.done) { introTrace.push(r.value.best); r = x.next(); }
      genTrace = [keyOne.best, keyOne.best];
    }
    drawTile(g, c, wb, keyOne.grid.flat(), { codes: wb.S > 30 });
    label(g, `Key 1, the best tile: ${keyOne.best.toFixed(2)}`, wb.x - wb.S * 0.5, wb.y - wb.S * 0.75 - 6, { size: 13, weight: 500, color: c.ink });
    drawChart(ctx, true);
    readout(`best ${keyOne.best.toFixed(2)}\n${fmt(100 - keyOne.coef * 100, 1)}% below random`);
  }
}
