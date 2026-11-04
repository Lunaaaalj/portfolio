// Fig. 2. The grains of Fig. 1 go through a sieve. The main roads are brought up first, with the
// reports that stand within 100 m of one (tract polygons are not in the project's repository, so
// the scene measures what can be measured). The project's grid is lowered over the city, each
// grain slides to the centre of its hexagon, the plane tips and the columns stand, to scale. The
// empty cells of the grid go, and the islands fall through. What remains is the table.

import story from '../../../data/geostats-story.json';
import type { Scene } from '../engine';
import { ease, easeInOut, fmt, label, lerp, rgba, seg, SANS } from '../draw';
import { cityGrains, frameCity, type Frame } from './city';
import { N, TOTAL, X, Y, cellX, cellY, columnColours, drawColumns, drawRoads, hexAt, hexPath, px, py, squash, tableView, tallestUp, type View } from './table';

const nodes = story.nodes, facts = story.facts;
/** Where each node's grains go: the centre of the hexagon holding the node. */
const home = nodes.x.map((x, n) => { const [i, j] = hexAt(x, nodes.y[n]); return [cellX(i), cellY(i, j)]; });
const tallest = TOTAL.indexOf(facts.maxCelda);

export default function sieve(): Scene {
  let f: Frame = { k: 1, cx: 0, cy: 0, midX: 0, midY: 0 };
  let grainW = 2, grainH = 1.3, maxUp = 200, pad = 0, mesh: HTMLCanvasElement | null = null;
  let tops: string[] = [], sides: string[] = [];
  const up = new Float32Array(N);

  return {
    layout({ w, h, dpr, c }) {
      f = frameCity(w, h);
      const wide = w > 560;
      grainW = wide ? 2.4 : 1.8; grainH = wide ? 1.5 : 1.15;
      maxUp = tallestUp(h);
      ({ tops, sides } = columnColours(c));
      // The grid is flat, so it is drawn once and then only moved. It is taller than the canvas,
      // because tipping the plane shortens it, and its edge must never come into view.
      pad = h * 0.45;
      mesh = document.createElement('canvas');
      mesh.width = Math.round(w * dpr); mesh.height = Math.round((h + 2 * pad) * dpr);
      const m = mesh.getContext('2d')!;
      m.scale(dpr, dpr); m.translate(0, pad);
      const v: View = { k: f.k, cx: f.cx, cy: f.cy, ox: f.midX, oy: f.midY, tilt: 0 };
      const path = new Path2D();
      const i0 = Math.floor((f.cx - f.midX / f.k) / 1.5) - 2, i1 = Math.ceil((f.cx + (w - f.midX) / f.k) / 1.5) + 2;
      const j0 = Math.floor((f.cy - (h + pad - f.midY) / f.k) / Math.sqrt(3)) - 2, j1 = Math.ceil((f.cy + (f.midY + pad) / f.k) / Math.sqrt(3)) + 2;
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) hexPath(path, v, cellX(i), cellY(i, j), 0, 1);
      m.strokeStyle = rgba(c.contour, 0.55); m.lineWidth = 0.6; m.stroke(path);
    },
    draw({ g, c, readout, w, h }, p) {
      const roads = ease(seg(p, 0.02, 0.14)), roadsOff = seg(p, 0.22, 0.32);
      const lower = ease(seg(p, 0.24, 0.36)), slide = seg(p, 0.3, 0.5);
      const tilt = easeInOut(seg(p, 0.5, 0.68)), rise = easeInOut(seg(p, 0.52, 0.72));
      const go = seg(p, 0.76, 0.86), fall = seg(p, 0.8, 0.92), mark = ease(seg(p, 0.9, 0.97));
      const v = tableView(f, h, tilt);

      // The roads, always under everything
      drawRoads(g, v, rgba(roads > 0 && roadsOff < 1 ? c.ink : c.contour, lerp(0.7, 0.8, roads) * (1 - 0.45 * roadsOff) * (1 - 0.5 * tilt)), lerp(1, 1.6, roads * (1 - roadsOff)));

      // The grid comes down from slightly above, and goes when the empty cells do
      const meshA = lower * (1 - go);
      if (meshA > 0 && mesh) {
        const s = lerp(1.05, 1, lower);
        g.save(); g.globalAlpha = meshA;
        g.translate(v.ox, v.oy); g.scale(s, s * squash(tilt)); g.translate(-f.midX, -f.midY);
        g.drawImage(mesh, 0, -pad, w, h + 2 * pad);
        g.restore();
      }

      // The cells take colour as the grains reach them, and stand
      const cellA = seg(p, 0.42, 0.56);
      if (cellA > 0) {
        for (let k = 0; k < N; k++) up[k] = (TOTAL[k] / facts.maxCelda) * maxUp * rise;
        g.globalAlpha = cellA;
        drawColumns(g, v, up, (k) => tops[k], (k) => sides[k], rgba(c.plate, 0.55));
        g.globalAlpha = 1;
      }

      // The grains, on the plane, leaving as the columns rise
      const grainA = 1 - seg(p, 0.5, 0.62);
      if (grainA > 0) {
        const dim = (near: number) => lerp(1, near ? 1 : 0.22, roads * (1 - roadsOff));
        for (const near of [0, 1]) {
          g.fillStyle = c.survey; g.globalAlpha = 0.92 * grainA * dim(near);
          for (const o of cityGrains) {
            if (nodes.near[o.site] !== near) continue;
            const t = easeInOut(seg(slide, o.at * 0.7, o.at * 0.7 + 0.3));
            const x = lerp(nodes.x[o.site], home[o.site][0], t), y = lerp(nodes.y[o.site], home[o.site][1], t);
            g.fillRect(px(v, x) - grainW / 2, py(v, y, o.stack * grainH * (1 - t)), grainW, grainH - 0.2);
          }
        }
        g.globalAlpha = 1;
      }

      // The islands drop through the table, with their reports
      if (fall > 0 && fall < 1) {
        g.fillStyle = c.graphite; g.globalAlpha = 1 - fall;
        story.islands.i.forEach((i, q) => {
          g.beginPath(); hexPath(g, v, cellX(i), cellY(i, story.islands.j[q]), -fall * fall * h * 0.5); g.fill();
        });
        g.globalAlpha = 1;
      }

      if (mark > 0) {
        const x = px(v, X[tallest]), top = py(v, Y[tallest], maxUp) - 3;
        const a = `${fmt(facts.maxCelda)} reports`, b = 'the tallest column, in Monterrey';
        g.font = `500 12px ${SANS}`;
        const tw = Math.max(g.measureText(a).width, g.measureText(b).width);
        const lx = Math.min(x + 30, w - tw - 18), ly = Math.max(84, top - 24);
        g.fillStyle = rgba(c.plate, 0.9 * mark); g.fillRect(lx, ly - 28, tw + 12, 38);
        g.globalAlpha = mark; g.strokeStyle = c.ink; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, top); g.lineTo(lx, ly - 9); g.stroke(); g.globalAlpha = 1;
        label(g, a, lx + 6, ly - 13, { size: 12, weight: 500, color: c.ink, a: mark });
        label(g, b, lx + 6, ly + 3, { size: 12, color: c.graphite, a: mark });
      }

      if (go > 0) readout(`${fmt(facts.celdas)} cells\n${fmt(facts.reportesEnCeldas)} reports\nmedian ${fmt(facts.medianaCelda)} a cell`);
      else if (rise > 0) readout(`0.65 km² a cell\n${fmt(Math.round(facts.maxCelda * rise))} reports at the tallest`);
      else if (lower > 0) readout(`${fmt(facts.rejilla)} cells in the grid\n${fmt(facts.conReportes)} receive reports`);
      else readout(`${facts.cercaVia}% of reports\nwithin 100 m of a main road`);
    },
  };
}
