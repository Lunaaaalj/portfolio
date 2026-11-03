// Fig. 9. The table for 2027, the posterior median per cell from the project's forecast. Then one
// decision: which 5% of the cells to choose. Choosing by counting 2019–2023 and choosing by the
// model's forecast of 2024 are compared on the same recorded 2024, computed here; the four PAIs
// are the validation table of the report.

import geo from '../../../data/geostats.json';
import model from '../../../data/geostats-model.json';
import type { Scene } from '../engine';
import { ease, easeInOut, fmt, label, lerp, mix, rgba, seg } from '../draw';
import { frameCity, type Frame } from './city';
import { N, drawColumns, drawRoads, rampClasses, tableView, tallestUp } from './table';
import { COUNT } from './sealed';

const FIVE = Array.from({ length: N }, (_, k) => COUNT.slice(0, 5).reduce((s, y) => s + y[k], 0));
const SHARE = Math.round(N * 0.05);
const topBy = (v: ArrayLike<number>) => new Set(Array.from({ length: N }, (_, k) => k).sort((a, b) => v[b] - v[a]).slice(0, SHARE));
const byCount = topBy(FIVE), byModel = topBy(model.test.med);
const both = [...byCount].filter((k) => byModel.has(k)).length;
const y24 = COUNT[5], all = y24.reduce((a, b) => a + b, 0);
const caught = (s: Set<number>) => [...s].reduce((a, k) => a + y24[k], 0) / all;
const PAI: [string, number][] = [['Mean, 2019–2023', 8.41], ['Mean, 2022–2023', 8.38], ['Negative binomial', 8.38], ['Hierarchical', 8.42]];

export default function history(): Scene {
  let f: Frame = { k: 1, cx: 0, cy: 0, midX: 0, midY: 0 };
  let tops: string[] = [], sides: string[] = [], scale = 1, wide = true;
  const up = new Float32Array(N);

  return {
    layout({ w, h, c }) {
      f = frameCity(w, h); wide = w > 560;
      scale = tallestUp(h) / Math.max(...y24, ...geo.p2027);
      const klass = rampClasses(geo.p2027);
      tops = geo.p2027.map((n) => c.ramp[klass(n)]);
      sides = tops.map((t) => mix(t, c.ink, 0.18));
    },
    draw({ g, c, readout, h, w }, p) {
      const grow = easeInOut(seg(p, 0.03, 0.22)), pick = seg(p, 0.34, 0.56), bars = ease(seg(p, 0.6, 0.68));
      const v = tableView(f, h);
      for (let k = 0; k < N; k++) up[k] = lerp(y24[k], geo.p2027[k], grow) * scale;
      drawRoads(g, v, rgba(c.contour, 0.3));
      const pale = (s: string) => mix(s, c.plate, 0.62 * Math.min(1, pick * 3));
      const shade = (k: number) => {
        if (pick <= 0) return null;
        const a = byCount.has(k), b = byModel.has(k);
        return a && b ? c.ink : a ? c.hazard : b ? c.survey : null;
      };
      drawColumns(g, v, up, (k) => shade(k) ?? pale(tops[k]), (k) => { const s = shade(k); return s ? mix(s, c.ink, 0.25) : pale(sides[k]); }, rgba(c.plate, 0.55));

      if (pick > 0) {
        const x = 24, y0 = h - (wide ? 76 : 58);
        const key: [string, string][] = [[c.ink, `chosen both ways, ${both}`], [c.hazard, `by counting alone, ${SHARE - both}`], [c.survey, `by the model alone, ${SHARE - both}`]];
        key.forEach(([col, text], q) => {
          const y = y0 + q * 18;
          g.fillStyle = col; g.globalAlpha = Math.min(1, pick * 3); g.fillRect(x, y - 9, 10, 10); g.globalAlpha = 1;
          label(g, text, x + 16, y, { size: 12, color: c.ink, a: Math.min(1, pick * 3) });
        });
      }

      if (bars > 0) {
        const W = wide ? 232 : 170, x = w - W - 24, row = wide ? 25 : 21, y0 = h - 4 * row - (wide ? 34 : 18);
        g.globalAlpha = bars; g.fillStyle = rgba(c.plate, 0.92); g.fillRect(x - 10, y0 - 24, W + 20, 4 * row + 30); g.globalAlpha = 1;
        label(g, 'PAI of the top 5%, on 2024', x, y0 - 8, { size: 12, weight: 500, color: c.ink, a: bars });
        PAI.forEach(([name, val], q) => {
          const y = y0 + q * row;
          g.fillStyle = q === 3 ? c.ink : c.ramp[3]; g.globalAlpha = bars;
          g.fillRect(x, y + 11, ((W - 44) * val) / 8.42, 5); g.globalAlpha = 1;
          label(g, name, x, y + 8, { size: 11, color: c.graphite, a: bars });
          label(g, val.toFixed(2), x + W, y + 16, { size: 12, weight: 500, color: c.ink, align: 'right', a: bars });
        });
      }

      if (pick > 0) readout(`${SHARE} cells of ${fmt(N)}\nby counting: ${(caught(byCount) * 100).toFixed(1)}% of 2024\nby the model: ${(caught(byModel) * 100).toFixed(1)}%`);
      else readout(`2027 forecast\n73,577 reports, ± 3%`);
    },
  };
}
