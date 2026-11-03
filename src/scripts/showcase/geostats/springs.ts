// Fig. 6. The cell level of the model as a physical network, close up on 32 real cells where thin
// and heavy data sit side by side. A cable ties each column to what its own five rows say. The
// CAR prior's energy, uᵀ(D − αA)u / 2σ², is that of springs between neighbours, so that is what is
// drawn. The network relaxes through the project's own solution, computed at the posterior means
// (scripts/extract-geostats-model.py). Then the columns tremble: that is not noise added to the
// picture but 56 thinned draws from the real posterior, in order.

import model from '../../../data/geostats-model.json';
import type { Ctx, Scene } from '../engine';
import { ease, easeInOut, fmt, label, lerp, rgba, seg } from '../draw';
import { spring } from '../tiledraw';
import { N, X, Y, drawColumns, drawRoads, px, py, rampClasses, type View } from './table';

const H = model.heat, cells = H.cells, m = cells.length;
const inRegion = new Map(cells.map((k, q) => [k, q]));
const edges: [number, number][] = [];
for (let a = 0; a < m; a++) for (let b = a + 1; b < m; b++) {
  if (Math.hypot(X[cells[a]] - X[cells[b]], Y[cells[a]] - Y[cells[b]]) < 1.9) edges.push([a, b]);
}
const lightest = H.n.indexOf(Math.min(...H.n)), heaviest = H.n.indexOf(Math.max(...H.n));
const LOG_N = Math.log(1 + Math.max(...H.n));
const klass = rampClasses(H.n);

/** The relaxation, through the sweeps kept by the extraction, at u in [0, 1]. */
function relaxed(q: number, t: number) {
  const P = H.path, at = t * (P.length - 1), i = Math.min(P.length - 2, Math.floor(at));
  return lerp(P[i][q], P[i + 1][q], at - i);
}

export default function springs(): Scene {
  let v: View = { k: 1, cx: 0, cy: 0, ox: 0, oy: 0, tilt: 1 };
  let unit = 30, floor = -2, gap = 5, clock = 0, tops: string[] = [], wide = true;
  let far = '', farSide = '';
  const up = new Float32Array(N);
  const now = new Float32Array(m);

  return {
    layout(ctx: Ctx) {
      const { w, h, c } = ctx;
      wide = w > 560;
      const k = Math.min(w / 13.5, (h * 1.25) / 13.5);
      v = { k, cx: X[H.centre], cy: Y[H.centre], ox: w / 2, oy: h * (wide ? 0.66 : 0.62), tilt: 1 };
      const all = [...H.path[0], ...H.path[H.path.length - 1]];
      floor = Math.min(...all) - 0.9;
      unit = (h * 0.3) / (Math.max(...all) - floor);
      gap = Math.max(3, k * 0.14);
      tops = H.n.map((n) => c.ramp[Math.max(1, klass(n))]);
      far = rgba(c.ramp[0], 0.65); farSide = rgba(c.rule, 0.5);
    },
    draw({ g, c, readout, dt, pinned, live, h }, p) {
      const shown = ease(seg(p, 0.0, 0.1)), net = ease(seg(p, 0.22, 0.34));
      const relax = easeInOut(seg(p, 0.42, 0.62)), heat = ease(seg(p, 0.66, 0.76));
      if (live && pinned && heat > 0) clock += dt * 3;
      const d = Math.floor(clock) % H.draws.length, e = clock - Math.floor(clock), next = (d + 1) % H.draws.length;

      for (let q = 0; q < m; q++) {
        const rest = relaxed(q, relax), own = live ? lerp(H.draws[d][q], H.draws[next][q], easeInOut(e)) : rest;
        now[q] = lerp(rest, own, heat);
      }
      for (let k = 0; k < N; k++) {
        const q = inRegion.get(k);
        up[k] = q === undefined ? Math.max(1, (Math.min(2.2, model.u[k]) - floor) * unit * 0.8) : Math.max(1, (now[q] - floor) * unit);
      }
      drawRoads(g, v, rgba(c.contour, 0.35));
      drawColumns(g, v, up, (k) => { const q = inRegion.get(k); return q === undefined ? far : tops[q]; },
        (k) => { const q = inRegion.get(k); return q === undefined ? farSide : rgba(c.ramp[3], 0.5); }, rgba(c.plate, 0.6));

      const tip = (q: number) => [px(v, X[cells[q]]), py(v, Y[cells[q]], (now[q] - floor) * unit)];

      // The springs of the prior, between neighbouring tops
      if (net > 0) for (const [a, b] of edges) {
        const [x1, y1] = tip(a), [x2, y2] = tip(b);
        spring(g, x1, y1, x2, y2, 0.8, c.ink, gap, net * 0.85);
      }
      g.globalAlpha = 1;

      // The cable to each cell's own rows: its thickness is how much those rows say
      for (let q = 0; q < m; q++) {
        const x = px(v, X[cells[q]]), [, y] = tip(q), target = py(v, Y[cells[q]], (H.path[0][q] - floor) * unit);
        const lw = lerp(0.6, 3.6, Math.log(1 + H.n[q]) / LOG_N);
        g.globalAlpha = shown; g.strokeStyle = c.hazard; g.lineWidth = lw;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, target); g.stroke();
        g.lineWidth = 1; g.beginPath(); g.moveTo(x - 4, target); g.lineTo(x + 4, target); g.stroke();
        g.globalAlpha = 1;
        g.fillStyle = c.ink; g.globalAlpha = shown; g.fillRect(x - 1.5, y - 1.5, 3, 3); g.globalAlpha = 1;
        if (heat > 0) {
          const s = H.sd[q] * unit;
          g.globalAlpha = heat * 0.7; g.strokeStyle = c.ink; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x + 6, y - s); g.lineTo(x + 6, y + s); g.moveTo(x + 3, y - s); g.lineTo(x + 9, y - s); g.moveTo(x + 3, y + s); g.lineTo(x + 9, y + s); g.stroke();
          g.globalAlpha = 1;
        }
      }

      // Two cells named: the thinnest and the heaviest of the region
      if (shown > 0) {
        for (const [q, side] of [[lightest, 1], [heaviest, -1]] as [number, number][]) {
          const [x, y] = tip(q), lx = x + side * 16, ly = Math.max(wide ? 76 : 66, y - h * 0.09);
          const a = `${fmt(H.n[q])} ${H.n[q] === 1 ? 'report' : 'reports'} in five years`;
          g.fillStyle = rgba(c.plate, 0.9 * shown);
          g.font = '500 12px "IBM Plex Sans", system-ui, sans-serif';
          const tw = g.measureText(a).width, tx = side > 0 ? lx : lx - tw;
          g.fillRect(tx - 5, ly - 14, tw + 10, heat > 0 ? 34 : 19);
          g.globalAlpha = shown; g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(lx, ly + 3); g.stroke(); g.globalAlpha = 1;
          label(g, a, tx, ly, { size: 12, weight: 500, color: c.ink, a: shown });
          if (heat > 0) label(g, `± ${H.sd[q].toFixed(2)}`, tx, ly + 15, { size: 12, color: c.graphite, a: heat });
        }
      }

      if (heat > 0) readout(`u’s posterior spread\n${model.uSd.fewCells} thinnest cells ± ${model.uSd.few.toFixed(2)}\ncells over 100 reports ± ${model.uSd.many.toFixed(2)}`);
      else if (relax > 0) readout(`moved on average\nthin cells ${model.relax.few.toFixed(2)}\nover 100 reports ${model.relax.many.toFixed(2)}`);
      else if (net > 0) readout(`α = ${model.hyper.alpha.toFixed(2)}\nσᵤ = ${model.hyper.su.toFixed(2)}`);
      else readout(`${m} of ${fmt(N)} cells`);
      return live && pinned && heat > 0;
    },
  };
}
