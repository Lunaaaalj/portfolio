// Fig. 3. The panel, as furniture. Every column of the table opens into six drawers, one a year,
// to the same scale as Fig. 2. One column is drawn out and enlarged: a real cell of Santa Catarina
// whose 2020 drawer is empty, because the zero is a row of the panel. Then the 2024 slab leaves
// every column for a tray, and a lid closes over it. Fig. 8 breaks that seal.

import geo from '../../../data/geostats.json';
import story from '../../../data/geostats-story.json';
import type { Scene } from '../engine';
import { ease, easeInOut, fmt, hatch, label, lerp, mix, rgba, seg } from '../draw';
import { rng } from '../../../lib/tile';
import { frameCity, type Frame } from './city';
import { N, TOTAL, X, Y, columnColours, drawColumns, drawRoads, px, py, tableView, tallestUp } from './table';

export const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024'] as const;
export const COUNT = YEARS.map((y) => (geo.years as Record<string, number[]>)[y]);
const facts = story.facts;
export const SEALED = COUNT[5].reduce((a, b) => a + b, 0);

/** The busiest cell of Santa Catarina with an empty 2020 drawer. */
const SC = geo.municipalities.indexOf('Santa Catarina');
const chosen = (() => {
  let best = -1;
  for (let k = 0; k < N; k++) if (geo.municipality[k] === SC && COUNT[1][k] === 0 && (best < 0 || TOTAL[k] > TOTAL[best])) best = k;
  return best;
})();
const counts = COUNT.map((y) => y[chosen]);

/** The order in which the slabs leave. */
const r = rng(11);
export const leave = Array.from({ length: N }, () => r());

/** The tray of the sealed year, and where each cell's slab rests in it. */
export const trayBox = (w: number, h: number, f: Frame) => {
  const wide = w > 560, W = wide ? 172 : 104, H = Math.round(W * 0.78);
  return { x: w - W - 24, y: h - H - (wide ? 34 : 18), w: W, h: H, k: W / ((w - 56) / f.k) };
};
type Tray = ReturnType<typeof trayBox>;
export const trayX = (t: Tray, f: Frame, k: number) => Math.min(t.x + t.w - 4, Math.max(t.x + 4, t.x + t.w / 2 + (X[k] - f.cx) * t.k));
export const trayY = (t: Tray, f: Frame, k: number) => Math.min(t.y + t.h - 4, Math.max(t.y + 4, t.y + t.h / 2 - (Y[k] - f.cy) * t.k));

export default function sealed(): Scene {
  let f: Frame = { k: 1, cx: 0, cy: 0, midX: 0, midY: 0 };
  let tops: string[] = [], sides: string[] = [], scale = 1, wide = true;
  let tray: Tray = { x: 0, y: 0, w: 0, h: 0, k: 1 };
  const base = new Float32Array(N), cap = new Float32Array(N);
  const seams: number[][] = [];

  return {
    layout({ w, h, c }) {
      f = frameCity(w, h); wide = w > 560;
      scale = tallestUp(h) / facts.maxCelda;
      ({ tops, sides } = columnColours(c));
      for (let k = 0; k < N; k++) {
        let acc = 0; const at: number[] = [];
        for (let y = 0; y < 5; y++) { acc += COUNT[y][k] * scale; at.push(acc); }
        base[k] = acc; cap[k] = COUNT[5][k] * scale;
        // A seam is only worth drawing where the drawers can be told apart
        seams[k] = base[k] + cap[k] > 14 ? at.slice(0, 5) : [];
      }
      tray = trayBox(w, h, f);
    },
    draw({ g, c, readout, h }, p) {
      const open = ease(seg(p, 0.06, 0.2)), out = ease(seg(p, 0.1, 0.26)), away = seg(p, 0.48, 0.56);
      const lift = seg(p, 0.54, 0.74), lid = easeInOut(seg(p, 0.74, 0.84));
      const v = tableView(f, h);

      drawRoads(g, v, rgba(c.contour, 0.3));

      const heat = (col: string) => (open < 1 ? mix(col, c.hazard, open) : c.hazard);
      const hazardSide = mix(c.hazard, c.ink, 0.18);
      const gone = (k: number) => lift >= leave[k] * 0.78;
      drawColumns(g, v, base, (k) => tops[k], (k) => sides[k], rgba(c.plate, 0.55), {
        seams: (k) => (open > 0.5 ? seams[k] : []),
        seam: rgba(c.plate, 0.8),
        cap: (k) => (gone(k) ? 0 : cap[k]),
        capTop: (k) => heat(tops[k]),
        capSide: (k) => (open < 1 ? mix(sides[k], hazardSide, open) : hazardSide),
      });

      // The tray, with what has reached it
      const trayIn = ease(seg(p, 0.5, 0.58));
      const mx = (k: number) => trayX(tray, f, k), my = (k: number) => trayY(tray, f, k);
      if (trayIn > 0) {
        g.globalAlpha = trayIn; g.fillStyle = c.plate; g.fillRect(tray.x, tray.y, tray.w, tray.h);
        g.strokeStyle = c.ink; g.lineWidth = 1; g.strokeRect(tray.x + 0.5, tray.y + 0.5, tray.w - 1, tray.h - 1);
        g.globalAlpha = 1;
      }

      // The slabs in flight, and those at rest in the tray
      let landed = 0;
      if (lift > 0) {
        g.fillStyle = c.hazard; g.beginPath();
        for (let k = 0; k < N; k++) {
          const s = leave[k] * 0.78, t = seg(lift, s, s + 0.22);
          if (t <= 0 || COUNT[5][k] === 0) { landed += +(t >= 1); continue; }
          if (t >= 1) landed++;
          const e = easeInOut(t), sx = px(v, X[k]), sy = py(v, Y[k], base[k] + cap[k]);
          const x = lerp(sx, mx(k), e), y = lerp(sy, my(k), e) - Math.sin(Math.PI * e) * h * 0.12;
          const d = lerp(f.k * 0.8, 1, e);
          g.rect(x - d, y - d * 0.6, 2 * d, 1.2 * d);
        }
        g.fill();
      }

      // The lid slides across and the tray is labelled
      if (lid > 0) {
        const W = tray.w * lid, path = new Path2D();
        path.rect(tray.x, tray.y, W, tray.h);
        g.fillStyle = c.plate; g.fill(path);
        hatch(g, path, 45, 6, rgba(c.ink, 0.5), 1, [tray.x, tray.y, tray.w, tray.h]);
        g.strokeStyle = c.ink; g.lineWidth = 1; g.strokeRect(tray.x + 0.5, tray.y + 0.5, W - 1, tray.h - 1);
      }
      if (trayIn > 0) {
        g.fillStyle = rgba(c.plate, 0.9 * trayIn); g.fillRect(tray.x, tray.y - 34, tray.w, 34);
        label(g, '2024', tray.x, tray.y - 20, { size: 12, weight: 500, color: c.ink, a: trayIn });
        label(g, lid >= 1 ? `sealed, ${fmt(SEALED)} reports` : `${fmt(landed)} of ${fmt(N)} rows`, tray.x, tray.y - 5, { size: 12, color: c.graphite, a: trayIn });
      }

      // The chosen column, enlarged beside the table
      const show = out * (1 - away);
      if (show > 0) {
        const unit = (wide ? 130 : 66) / Math.max(1, TOTAL[chosen]), minH = wide ? 13 : 12;
        const cx = wide ? 96 : 50, foot = wide ? 340 : 216;
        const rx = wide ? 34 : 20, ry = rx * 0.34, gap = lerp(0, wide ? 9 : 5, open);
        const col = c.ramp[3], side = mix(col, c.ink, 0.18);
        const tx = px(v, X[chosen]), ty = py(v, Y[chosen], base[chosen] + cap[chosen]);
        g.globalAlpha = show; g.strokeStyle = c.ink; g.lineWidth = 1;
        g.beginPath(); g.moveTo(tx, ty - 2); g.lineTo(cx, foot + ry + 3); g.stroke();
        let y = foot;
        counts.forEach((n, q) => {
          const d = Math.max(minH, n * unit), empty = n === 0, sealedYear = q === 5;
          const body = new Path2D();
          body.ellipse(cx, y, rx, ry, 0, 0, Math.PI); body.lineTo(cx - rx, y - d); body.ellipse(cx, y - d, rx, ry, 0, Math.PI, 0, true); body.closePath();
          const lidOf = new Path2D(); lidOf.ellipse(cx, y - d, rx, ry, 0, 0, Math.PI * 2);
          if (empty) {
            g.fillStyle = c.plate; g.fill(body); g.setLineDash([3, 3]); g.strokeStyle = c.ink; g.stroke(body); g.stroke(lidOf); g.setLineDash([]);
          } else {
            g.fillStyle = sealedYear ? hazardSide : side; g.fill(body);
            g.fillStyle = sealedYear ? c.hazard : col; g.fill(lidOf);
          }
          const ly = y - d / 2 + 4;
          if (open > 0.3) {
            label(g, YEARS[q], cx + rx + 12, ly, { size: 12, color: c.graphite, a: show * open });
            label(g, fmt(n), cx + rx + (wide ? 90 : 72), ly, { size: 12, weight: empty ? 600 : 500, color: c.ink, align: 'right', a: show * open });
          }
          g.globalAlpha = show;
          y -= d + gap;
        });
        g.globalAlpha = 1;
      }

      if (lid > 0.5) readout(`${fmt(facts.celdas * 5)} rows to fit\n${fmt(facts.celdas)} rows sealed`);
      else if (lift > 0) readout(`${fmt(facts.celdas * 6)} rows\n2024 leaves`);
      else if (seg(p, 0.3, 0.32) > 0) readout(`by month: ${fmt(161352)} rows\nby year: ${fmt(facts.celdas * 6)} rows`);
      else readout(`${fmt(facts.celdas)} cells × 6 years\n${fmt(facts.celdas * 6)} rows`);
    },
  };
}
