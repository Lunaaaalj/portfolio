// Fig. 2. The 30 polygons along the transmission line, drawn from the project's digitised map
// (data/processed/mapa.csv, local metres). They are traced in order along the line; the area
// counter runs to 183.01 ha; polygon 1 is marked last, because the next scenes work in it.

import story from '../../../data/refinit-story.json';
import type { Scene } from '../engine';
import { ease, seg, label, fmt, rgba, SANS } from '../draw';

type Poly = (typeof story.polygons)[number];

export default function site(): Scene {
  const polys = [...story.polygons];
  // Order along the line: by projection on the axis through the site's extremes
  const cen = (p: Poly) => p.v.reduce((a, [x, y]) => [a[0] + x / p.v.length, a[1] + y / p.v.length], [0, 0]);
  const cs = polys.map(cen);
  const lo = cs.reduce((a, b) => (a[0] + a[1] < b[0] + b[1] ? a : b)), hi = cs.reduce((a, b) => (a[0] + a[1] > b[0] + b[1] ? a : b));
  const ax = [hi[0] - lo[0], hi[1] - lo[1]];
  const order = polys.map((p, i) => ({ p, c: cs[i], t: (cs[i][0] - lo[0]) * ax[0] + (cs[i][1] - lo[1]) * ax[1] })).sort((a, b) => a.t - b.t);
  const per = (v: number[][]) => v.reduce((s, a, i) => { const b = v[(i + 1) % v.length]; return s + Math.hypot(b[0] - a[0], b[1] - a[1]); }, 0);
  const X1 = Math.max(...polys.flatMap((p) => p.v.map((v) => v[0]))), Y1 = Math.max(...polys.flatMap((p) => p.v.map((v) => v[1])));
  let k = 1, ox = 0, oy = 0;

  return {
    layout({ w, h }) {
      const pad = Math.min(w, h) * 0.1;
      k = Math.min((w - 2 * pad) / X1, (h - 2 * pad) / Y1);
      ox = (w - X1 * k) / 2; oy = (h - Y1 * k) / 2 + 8;
    },
    draw({ g, c, readout, w, h }, p) {
      const P = (x: number, y: number): [number, number] => [ox + x * k, oy + y * k];
      const trace = seg(p, 0.02, 0.62), fill = seg(p, 0.3, 0.75), mark = ease(seg(p, 0.7, 0.86));
      let area = 0, shown = 0;
      order.forEach(({ p: poly, c: cc }, i) => {
        const s0 = (i / order.length) * 0.8, t = ease(seg(trace, s0, s0 + 0.2));
        if (t <= 0) return;
        shown += t >= 1 ? 1 : 0; area += poly.area * t;
        const path = new Path2D();
        poly.v.forEach(([x, y], j) => { const [a, b] = P(x, y); j ? path.lineTo(a, b) : path.moveTo(a, b); });
        path.closePath();
        const f = ease(seg(fill, s0, s0 + 0.2));
        if (f > 0) { g.fillStyle = rgba(c.genus[0], 0.16 * f); g.fill(path); }
        const L = per(poly.v) * k;
        g.setLineDash([L * t, L]); g.lineWidth = 1; g.strokeStyle = c.ink; g.stroke(path); g.setLineDash([]);
        const [x, y] = P(cc[0], cc[1]);
        if (t >= 1 && k * 120 > 9) label(g, String(poly.p), x, y + 4, { size: 11, color: c.graphite, align: 'center', a: f });
      });
      // Polygon 1, where the next scenes work
      if (mark > 0) {
        const one = order.find((o) => o.p.p === 1)!;
        const [x, y] = P(one.c[0], one.c[1]);
        g.strokeStyle = c.ink; g.lineWidth = 1;
        g.beginPath(); g.ellipse(x, y, 34 * mark + 6, 22 * mark + 6, -0.3, 0, Math.PI * 2); g.stroke();
        label(g, 'Polygon 1, 1.28 ha', x + 44, y - 20, { size: 13, weight: 500, color: c.ink, a: mark });
      }
      // Survey furniture: scale bar and north arrow
      const bar = 500 * k, bx = 24, by = h - 28;
      g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath();
      g.moveTo(bx, by); g.lineTo(bx + bar, by); g.moveTo(bx, by - 4); g.lineTo(bx, by + 4); g.moveTo(bx + bar, by - 4); g.lineTo(bx + bar, by + 4); g.stroke();
      label(g, '500 m', bx + bar + 8, by + 4, { size: 12, color: c.graphite });
      const nx = w - 34, ny = h - 50;
      g.beginPath(); g.moveTo(nx, ny - 16); g.lineTo(nx - 6, ny + 4); g.lineTo(nx, ny); g.lineTo(nx + 6, ny + 4); g.closePath();
      g.fillStyle = c.ink; g.fill();
      label(g, 'N', nx, ny + 20, { size: 12, color: c.graphite, align: 'center', font: SANS });
      readout(`${shown} of 30 polygons\n${fmt(Math.min(183.01, area), 2)} ha`);
    },
  };
}
