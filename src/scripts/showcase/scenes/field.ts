// Fig. 10. Key 1 laid over one of the 18 polygons that share it, at its true spacing (4.19 m
// along a row, rows 3.63 m apart, each row starting 2.10 m further on), copy after copy from the
// corner; then the view widens to the whole site, with each polygon hatched by the key it uses.
// Polygon outlines from data/processed/mapa.csv; keys and their polygons from `refor`.

import story from '../../../data/refinit-story.json';
import type { Scene } from '../engine';
import { ease, seg, label, lerp, rgba, easeInOut, hatch, fmt } from '../draw';
import { tileCell, COLS, ROWS } from '../../../lib/tile';

type V = number[][];
const inside = (v: V, x: number, y: number) => {
  let o = false;
  for (let i = 0, j = v.length - 1; i < v.length; j = i++) {
    const [xi, yi] = v[i], [xj, yj] = v[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) o = !o;
  }
  return o;
};
const HATCH = [45, -45, 0, 90, 22, -68];

export default function field(): Scene {
  const key = story.keys[0];
  const bb = (v: V) => [Math.min(...v.map((q) => q[0])), Math.min(...v.map((q) => q[1])), Math.max(...v.map((q) => q[0])), Math.max(...v.map((q) => q[1]))];
  // The chunkiest polygon that uses key 1
  const poly = story.polygons.filter((p) => p.key === 1).map((p) => ({ p, b: bb(p.v) })).sort((a, b) => Math.min(b.b[2] - b.b[0], b.b[3] - b.b[1]) - Math.min(a.b[2] - a.b[0], a.b[3] - a.b[1]))[0];
  const [x0, y0, x1, y1] = poly.b;
  const plants: { x: number; y: number; s: number; d: number }[] = [];
  for (let R = 0; y0 + R * 3.63 <= y1; R++) for (let k = 0; x0 + k * 4.19 <= x1 + 4.19; k++) {
    const x = x0 + k * 4.19 + (R % 2) * 2.1, y = y0 + R * 3.63;
    if (!inside(poly.p.v, x, y)) continue;
    const tr = Math.floor(R / ROWS), tc = Math.floor((k - Math.floor(R / 2)) / COLS);
    plants.push({ x, y, s: tileCell(key.grid, R, k), d: Math.hypot(tr * 2, tc) });
  }
  const dMax = Math.max(...plants.map((q) => q.d));
  const all = story.polygons;
  const X1 = Math.max(...all.flatMap((p) => p.v.map((q) => q[0]))), Y1 = Math.max(...all.flatMap((p) => p.v.map((q) => q[1])));
  let near = { k: 1, ox: 0, oy: 0 }, far = { k: 1, ox: 0, oy: 0 }, W0 = 0, H0 = 0;

  return {
    layout({ w, h }) {
      W0 = w; H0 = h;
      const pad = Math.min(w, h) * 0.08 + 10;
      const kn = Math.min((w - 2 * pad) / (x1 - x0), (h - 2 * pad - 40) / (y1 - y0));
      near = { k: kn, ox: w / 2 - ((x0 + x1) / 2) * kn, oy: h / 2 - ((y0 + y1) / 2) * kn };
      const kf = Math.min((w - 2 * pad) / X1, (h - 2 * pad - 60) / Y1);
      far = { k: kf, ox: (w - X1 * kf) / 2, oy: (h - 60 - Y1 * kf) / 2 + 10 };
    },
    draw({ g, c, readout }, p) {
      const grow = seg(p, 0.02, 0.4), zoom = easeInOut(seg(p, 0.46, 0.76)), keys = ease(seg(p, 0.7, 0.88));
      const k = Math.exp(lerp(Math.log(near.k), Math.log(far.k), zoom));
      // Keep the polygon's centre moving on a straight line between the two framings
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      const sx = lerp(near.ox + cx * near.k, far.ox + cx * far.k, zoom), sy = lerp(near.oy + cy * near.k, far.oy + cy * far.k, zoom);
      const P = (x: number, y: number): [number, number] => [sx + (x - cx) * k, sy + (y - cy) * k];
      // Every polygon, as the view widens
      const others = ease(seg(zoom, 0.3, 1));
      for (const q of all) {
        const path = new Path2D(), pts = q.v.map(([x, y]) => P(x, y));
        pts.forEach(([a, b], j) => (j ? path.lineTo(a, b) : path.moveTo(a, b)));
        path.closePath();
        const mine = q === poly.p;
        if (keys > 0 && q.key) {
          const xs = pts.map((t) => t[0]), ys = pts.map((t) => t[1]), bx = Math.min(...xs), by = Math.min(...ys);
          hatch(g, path, HATCH[q.key - 1], 4, rgba(c.ink, 0.55 * keys), 1, [bx, by, Math.max(...xs) - bx, Math.max(...ys) - by]);
        }
        g.globalAlpha = mine ? 1 : others; g.strokeStyle = c.ink; g.lineWidth = 1; g.stroke(path); g.globalAlpha = 1;
      }
      // The plants of the chosen polygon, fading to texture as they shrink
      const r = 3.63 * k * 0.32, fade = Math.min(1, Math.max(0, (r - 0.6) / 1.6)) * (1 - keys * 0.85);
      let n = 0;
      if (fade > 0) {
        for (const q of plants) {
          const t = ease(seg(grow, (q.d / (dMax + 1)) * 0.85, (q.d / (dMax + 1)) * 0.85 + 0.15));
          if (t <= 0) continue;
          n++;
          const [x, y] = P(q.x, q.y);
          g.globalAlpha = t * fade; g.fillStyle = c.genus[story.genus[q.s]];
          g.beginPath(); g.arc(x, y, Math.max(0.6, r), 0, Math.PI * 2); g.fill();
        }
        g.globalAlpha = 1;
      }
      if (zoom < 0.2) label(g, `Polygon ${poly.p.p}, ${fmt(poly.p.area, 2)} ha, planted with key 1`, 24, 36, { size: 13, weight: 500, color: c.ink, a: 1 - zoom * 5 });
      // Legend: the six keys
      if (keys > 0) {
        const cols = W0 > 700 ? 6 : 3, cw = Math.min(150, (W0 - 48) / cols);
        story.keys.forEach((kk, i) => {
          const x = 24 + (i % cols) * cw, y = H0 - 62 + Math.floor(i / cols) * 30 - (cols === 3 ? 18 : 0);
          const sw = new Path2D(); sw.rect(x, y - 11, 16, 14);
          hatch(g, sw, HATCH[i], 4, rgba(c.ink, 0.7 * keys), 1, [x, y - 11, 16, 14]);
          g.globalAlpha = keys; g.strokeStyle = c.ink; g.stroke(sw); g.globalAlpha = 1;
          label(g, `Key ${kk.id}: ${kk.polygons.length} polygon${kk.polygons.length > 1 ? 's' : ''}`, x + 24, y, { size: 12, color: c.ink, a: keys });
        });
      }
      readout(keys > 0 ? '6 keys for 30 polygons' : `${fmt(n)} plants\n${fmt(Math.ceil(n / 52))} copies of key 1`);
    },
  };
}
