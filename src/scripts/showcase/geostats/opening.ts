// Fig. 8. The seal of Fig. 3 is broken. The lid slides off and the slabs go back to their columns.
// Then each cell's recorded 2024 is held against an interval that was fixed before it was seen:
// first the best baseline's (the mean of 2022 and 2023, with a Poisson), then the model's 90%
// predictive interval from the refit. A slab that falls outside stays red. The counters are the
// real coverages, tallied cell by cell.

import model from '../../../data/geostats-model.json';
import type { Scene } from '../engine';
import { ease, easeInOut, fmt, hatch, label, lerp, mix, rgba, seg } from '../draw';
import { frameCity, type Frame } from './city';
import { N, TOTAL, X, Y, columnColours, drawColumns, drawRoads, px, py, tableView, tallestUp } from './table';
import { COUNT, SEALED, leave, trayBox, trayX, trayY } from './sealed';

const T = model.test, y24 = COUNT[5];
const inBase = y24.map((y, k) => y >= T.baseLo[k] && y <= T.baseHi[k]);
const inModel = y24.map((y, k) => y >= T.lo[k] && y <= T.hi[k]);

export default function opening(): Scene {
  let f: Frame = { k: 1, cx: 0, cy: 0, midX: 0, midY: 0 };
  let tops: string[] = [], sides: string[] = [], tray = { x: 0, y: 0, w: 0, h: 0, k: 1 }, scale = 1, wide = true;
  const base = new Float32Array(N), cap = new Float32Array(N);

  return {
    layout({ w, h, c }) {
      f = frameCity(w, h); wide = w > 560;
      scale = tallestUp(h) / Math.max(...TOTAL);
      ({ tops, sides } = columnColours(c));
      tray = trayBox(w, h, f);
      for (let k = 0; k < N; k++) {
        base[k] = COUNT.slice(0, 5).reduce((s, y) => s + y[k], 0) * scale;
        cap[k] = y24[k] * scale;
      }
    },
    draw({ g, c, readout, h, w }, p) {
      const lid = easeInOut(seg(p, 0.03, 0.12)), back = seg(p, 0.12, 0.32), trayOut = ease(seg(p, 0.3, 0.36));
      const first = seg(p, 0.36, 0.58), second = seg(p, 0.62, 0.82);
      const v = tableView(f, h);
      drawRoads(g, v, rgba(c.contour, 0.3));

      const landed = (k: number) => back >= leave[k] * 0.78 + 0.22;
      const verdict = second > 0 ? (k: number) => (second >= leave[k] * 0.9 ? inModel[k] : null)
        : first > 0 ? (k: number) => (first >= leave[k] * 0.9 ? inBase[k] : null) : () => null;
      const passed = mix(c.ramp[1], c.plate, 0.1), passedSide = mix(c.ramp[1], c.ink, 0.15), hazardSide = mix(c.hazard, c.ink, 0.18);
      let right = 0, seen = 0;
      const judge: (boolean | null)[] = [];
      for (let k = 0; k < N; k++) { const q = verdict(k); judge[k] = q; if (q !== null) { seen++; right += +q; } }

      drawColumns(g, v, base, (k) => tops[k], (k) => sides[k], rgba(c.plate, 0.55), {
        cap: (k) => (landed(k) ? cap[k] : 0),
        capTop: (k) => (judge[k] === true ? passed : c.hazard),
        capSide: (k) => (judge[k] === true ? passedSide : hazardSide),
      });

      // The tray opens and empties
      if (trayOut < 1) {
        g.globalAlpha = 1 - trayOut;
        g.fillStyle = c.plate; g.fillRect(tray.x, tray.y, tray.w, tray.h);
        g.fillStyle = c.hazard;
        for (let k = 0; k < N; k++) if (back < leave[k] * 0.78 && y24[k]) g.fillRect(trayX(tray, f, k) - 0.5, trayY(tray, f, k) - 0.5, 1, 1);
        const W = tray.w * (1 - lid);
        if (W > 1) {
          const path = new Path2D(); path.rect(tray.x + tray.w - W, tray.y, W, tray.h);
          g.fillStyle = c.plate; g.fill(path);
          hatch(g, path, 45, 6, rgba(c.ink, 0.5), 1, [tray.x, tray.y, tray.w, tray.h]);
          g.globalAlpha = 1 - trayOut;
        }
        g.strokeStyle = c.ink; g.lineWidth = 1; g.strokeRect(tray.x + 0.5, tray.y + 0.5, tray.w - 1, tray.h - 1);
        g.globalAlpha = 1;
        label(g, '2024', tray.x, tray.y - 20, { size: 12, weight: 500, color: c.ink, a: 1 - trayOut });
        label(g, `${fmt(SEALED)} reports`, tray.x, tray.y - 5, { size: 12, color: c.graphite, a: 1 - trayOut });
      }

      // The slabs on their way home
      if (back > 0 && back < 1) {
        g.fillStyle = c.hazard; g.beginPath();
        for (let k = 0; k < N; k++) {
          const s = leave[k] * 0.78, t = seg(back, s, s + 0.22);
          if (t <= 0 || t >= 1 || !y24[k]) continue;
          const e = easeInOut(t), x = lerp(trayX(tray, f, k), px(v, X[k]), e);
          const y = lerp(trayY(tray, f, k), py(v, Y[k], base[k] + cap[k]), e) - Math.sin(Math.PI * e) * h * 0.12;
          const d = lerp(1, f.k * 0.8, e);
          g.rect(x - d, y - d * 0.6, 2 * d, 1.2 * d);
        }
        g.fill();
      }

      // The two tallies against the nominal 90%
      const gauges = ease(seg(p, 0.34, 0.4));
      if (gauges > 0) {
        const W = wide ? 232 : 150, x = w - W - 24, y0 = h - (wide ? 96 : 72), bar = wide ? 8 : 6;
        const rows: [string, number, boolean][] = [
          ['Mean of 2022–23', second > 0 ? T.baseCoverage : seen ? (right / seen) * 100 * Math.min(1, first * 1.15) : 0, first > 0],
          ['This model', second > 0 && seen ? (right / seen) * 100 * Math.min(1, second * 1.15) : 0, second > 0],
        ];
        g.globalAlpha = gauges; g.fillStyle = rgba(c.plate, 0.9); g.fillRect(x - 10, y0 - 22, W + 20, (wide ? 88 : 70)); g.globalAlpha = 1;
        rows.forEach(([name, val, on], q) => {
          const y = y0 + q * (wide ? 36 : 29);
          label(g, name, x, y, { size: 12, color: on ? c.ink : c.graphite, a: gauges });
          label(g, on ? `${val.toFixed(1)}%` : '', x + W, y, { size: 12, weight: 500, color: c.ink, align: 'right', a: gauges });
          g.globalAlpha = gauges; g.fillStyle = c.rule; g.fillRect(x, y + 6, W, bar);
          g.fillStyle = c.survey; g.fillRect(x, y + 6, (W * val) / 100, bar);
          g.fillStyle = c.ink; g.fillRect(x + W * 0.9 - 0.5, y + 2, 1, bar + 8); g.globalAlpha = 1;
        });
      }

      if (second >= 1) readout(`forecast ${fmt(T.total)}\nrecorded ${fmt(T.recorded)}`);
      else if (seen) readout(`${fmt(seen)} cells tested\n${fmt(seen - right)} outside`);
      else readout(`2024\n${fmt(N)} rows never seen`);
    },
  };
}
