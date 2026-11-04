// Fig. 5. The model's sum as a machine. On a log scale, log μ = β₀ + m + u is a stack: every cell
// of a municipality stands on one platform, whose height is that municipality's m for the year,
// and each cell's column is its u, fixed across years. The heights are the posterior medians of
// the project's refit, to one scale. Then the years run: the platforms move, the columns do not.

import geo from '../../../data/geostats.json';
import model from '../../../data/geostats-model.json';
import type { Scene } from '../engine';
import { ease, easeInOut, fmt, label, lerp, mix, rgba, seg, SANS } from '../draw';
import { frameCity, type Frame } from './city';
import { N, TOTAL, X, Y, drawColumns, drawRoads, px, py, rampClasses, tableView, tallestUp } from './table';
import { COUNT } from './sealed';

// Columns are cut at u = −3: the few cells below it stand at the same height, a choice of drawing
// that keeps the platforms in view.
const M = model.m.med, U = model.u, FLOOR = -3;
const mMin = Math.min(...M.flat()), mMax = Math.max(...M.flat()), uMax = Math.max(...U);
const SC = geo.municipalities.indexOf('Santa Catarina'), GU = geo.municipalities.indexOf('Guadalupe');
const YEARS = [2019, 2020, 2021, 2022, 2023];
/** When each year arrives. The step into 2022 is given the most room. */
const KEYS = [0.32, 0.4, 0.48, 0.62, 0.72];
const yearAt = (p: number) => {
  for (let q = 0; q < 4; q++) if (p < KEYS[q + 1]) return q + easeInOut(seg(p, KEYS[q], KEYS[q + 1]));
  return 4;
};
const level = (j: number, a: number) => { const q = Math.min(3, Math.floor(a)); return lerp(M[j][q], M[j][q + 1], a - q); };
const FIVE = TOTAL.map((_, k) => COUNT.slice(0, 5).reduce((s, y) => s + y[k], 0));

/** The westernmost tall cell of a municipality, to hang its label on. */
const anchor = (j: number) => {
  let best = -1;
  for (let k = 0; k < N; k++) if (geo.municipality[k] === j && (best < 0 || U[k] > U[best])) best = k;
  return best;
};
const ASC = anchor(SC), AGU = anchor(GU);

export default function platforms(): Scene {
  let f: Frame = { k: 1, cx: 0, cy: 0, midX: 0, midY: 0 };
  let unit = 18, linear = 1, tops: string[] = [], sides: string[] = [], jacks: string[] = [], wide = true;
  let box = { x: 0, y: 0, w: 0, h: 0 };
  const jack = new Float32Array(N), col = new Float32Array(N);

  return {
    layout({ w, h, c }) {
      f = frameCity(w, h); wide = w > 560;
      unit = tallestUp(h) / (mMax - mMin + uMax - FLOOR);
      linear = tallestUp(h) / Math.max(...TOTAL);
      const klass = rampClasses(U);
      tops = U.map((u) => c.ramp[klass(u)]);
      sides = tops.map((t) => mix(t, c.ink, 0.18));
      jacks = geo.municipality.map((j) => (j === SC ? c.ink : j === GU ? c.graphite : mix(c.rule, c.plate, 0.25)));
      const W = wide ? 236 : 132, H = wide ? 138 : 84;
      box = { x: w - W - 24, y: h - H - (wide ? 34 : 14), w: W, h: H };
    },
    draw({ g, c, readout, h }, p) {
      const morph = easeInOut(seg(p, 0.03, 0.17)), split = easeInOut(seg(p, 0.18, 0.3));
      const a = yearAt(p), v = tableView(f, h);
      for (let k = 0; k < N; k++) {
        const J = (level(geo.municipality[k], a) - mMin) * unit, C = (Math.max(U[k], FLOOR) - FLOOR) * unit;
        jack[k] = J * split;
        col[k] = lerp(FIVE[k] * linear, J + C, morph) - jack[k];
      }
      drawRoads(g, v, rgba(c.contour, 0.3));
      // Once the two platforms are named, the others step back
      const back = 0.55 * ease(seg(p, 0.3, 0.38));
      const paleTop = tops.map((t) => mix(t, c.plate, back)), paleSide = sides.map((t) => mix(t, c.plate, back));
      const keep = (k: number) => geo.municipality[k] === SC || geo.municipality[k] === GU;
      drawColumns(g, v, jack, (k) => (keep(k) ? tops[k] : paleTop[k]), (k) => jacks[k], rgba(c.plate, 0.45), {
        cap: (k) => col[k], capTop: (k) => (keep(k) ? tops[k] : paleTop[k]), capSide: (k) => (keep(k) ? sides[k] : paleSide[k]),
      });

      // Two platforms are named
      const named = ease(seg(p, 0.3, 0.36));
      if (named > 0) {
        for (const [k, name] of [[ASC, 'Santa Catarina'], [AGU, 'Guadalupe']] as [number, string][]) {
          const x = px(v, X[k]), y = py(v, Y[k], jack[k] + col[k]) - 3, ly = Math.max(wide ? 72 : 60, y - 30);
          g.font = `500 12px ${SANS}`;
          const tw = g.measureText(name).width;
          g.fillStyle = rgba(c.plate, 0.88 * named); g.fillRect(x - tw / 2 - 5, ly - 14, tw + 10, 18);
          g.globalAlpha = named; g.strokeStyle = c.ink; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x, y); g.lineTo(x, ly + 5); g.stroke(); g.globalAlpha = 1;
          label(g, name, x, ly, { size: 12, weight: 500, color: c.ink, align: 'center', a: named });
        }
      }

      // Every municipality's path, the walk its jack takes
      const inset = ease(seg(p, 0.3, 0.38));
      if (inset > 0) {
        const b = box, pad = wide ? 14 : 8, bottom = wide ? 22 : 16;
        const sx = (q: number) => b.x + pad + (q / 4) * (b.w - 2 * pad);
        const sy = (m: number) => b.y + pad + ((mMax + 0.3 - m) / (mMax - mMin + 0.6)) * (b.h - pad - bottom);
        g.globalAlpha = inset; g.fillStyle = c.plate; g.fillRect(b.x, b.y, b.w, b.h);
        g.strokeStyle = c.rule; g.lineWidth = 1; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
        // Santa Catarina's 90% interval, up to the year reached
        const reach = Math.ceil(a), band = new Path2D();
        for (let q = 0; q <= reach; q++) q ? band.lineTo(sx(q), sy(model.m.hi[SC][q])) : band.moveTo(sx(q), sy(model.m.hi[SC][q]));
        for (let q = reach; q >= 0; q--) band.lineTo(sx(q), sy(model.m.lo[SC][q]));
        band.closePath(); g.fillStyle = rgba(c.ink, 0.12); g.fill(band);
        M.forEach((row, j) => {
          const on = j === SC || j === GU;
          g.strokeStyle = j === SC ? c.ink : j === GU ? c.graphite : rgba(c.contour, 0.7);
          g.lineWidth = j === SC ? 1.75 : on ? 1.25 : 0.7;
          g.beginPath();
          row.forEach((m, q) => {
            if (q > Math.ceil(a)) return;
            const tq = q > a ? a : q, val = q > a ? level(j, a) : m;
            q ? g.lineTo(sx(tq), sy(val)) : g.moveTo(sx(tq), sy(val));
          });
          g.stroke();
        });
        g.globalAlpha = 1;
        label(g, '2019', sx(0), b.y + b.h - 6, { size: 11, color: c.graphite, a: inset });
        label(g, '2023', sx(4), b.y + b.h - 6, { size: 11, color: c.graphite, align: 'right', a: inset });
        if (wide) {
          g.fillStyle = rgba(c.plate, 0.9 * inset); g.fillRect(b.x, b.y - 22, 124, 22);
          label(g, 'm, by municipality', b.x + 2, b.y - 7, { size: 12, color: c.graphite, a: inset });
        }
      }

      const year = YEARS[Math.round(a)];
      if (seg(p, 0.32, 0.33) > 0) {
        const q = Math.round(a);
        const step = q > 0 ? Math.exp(M[SC][q] - M[SC][q - 1]) : 1;
        readout(`${year}\nSanta Catarina ${q > 0 ? `× ${step >= 10 ? fmt(step) : step.toFixed(1)} on ${YEARS[q - 1]}` : ''}`);
      } else readout(`log scale\n${fmt(N)} columns, 18 platforms`);
    },
  };
}
