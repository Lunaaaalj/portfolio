// Fig. 6. The minimum budget per hectare of each of the 30 polygons (from `refor`, alpha = 0.05),
// as columns as wide as the polygon's area, against the available MXN 12,500. The columns then
// settle to their area-weighted mean, 14,496, and the risk level alpha is turned from 0.01 to 0.50
// through the seven values in the report's frontier table.

import story from '../../../data/refinit-story.json';
import type { Scene } from '../engine';
import { ease, seg, lerp, label, fmt, rgba, hatch, clamp } from '../draw';

export default function budget(): Scene {
  const polys = [...story.polygons].sort((a, b) => a.p - b.p);
  const area = polys.reduce((s, p) => s + p.area, 0);
  const B = story.totals.presupuesto, mean = story.totals.B_min;
  const F = story.frontier as [number, number][];
  const yMax = 16000;
  let box = { x: 0, y: 0, w: 0, h: 0 }, dial = { x: 0, y: 0, w: 0 };
  // The frontier, interpolated in log alpha
  const atAlpha = (t: number): [number, number] => {
    const la = lerp(Math.log(F[0][0]), Math.log(F[F.length - 1][0]), t), a = Math.exp(la);
    for (let i = 0; i < F.length - 1; i++) {
      const l0 = Math.log(F[i][0]), l1 = Math.log(F[i + 1][0]);
      if (la <= l1 + 1e-12) return [a, lerp(F[i][1], F[i + 1][1], (la - l0) / (l1 - l0))];
    }
    return [a, F[F.length - 1][1]];
  };

  return {
    layout({ w, h }) {
      const pad = Math.max(24, Math.min(w, h) * 0.08);
      box = { x: pad + 44, y: pad + 20, w: w - 2 * pad - 60, h: h - 2 * pad - 90 };
      dial = { x: box.x, y: box.y + box.h + 58, w: box.w };
    },
    draw({ g, c, readout }, p) {
      const line = ease(seg(p, 0.0, 0.1)), rise = seg(p, 0.1, 0.44), settle = ease(seg(p, 0.58, 0.72)), turn = seg(p, 0.78, 0.97);
      const Y = (v: number) => box.y + box.h - (v / yMax) * box.h;
      const base = box.y + box.h;
      // Axis
      g.strokeStyle = c.rule; g.lineWidth = 1;
      for (let v = 0; v <= yMax; v += 4000) {
        g.beginPath(); g.moveTo(box.x, Y(v) + 0.5); g.lineTo(box.x + box.w, Y(v) + 0.5); g.stroke();
        label(g, fmt(v), box.x - 8, Y(v) + 4, { size: 11, color: c.graphite, align: 'right' });
      }
      label(g, 'MXN per hectare', box.x - 8, box.y - 12, { size: 12, color: c.graphite, align: 'left' });
      const [alpha, level] = atAlpha(turn);
      const target = turn > 0 ? level : mean;
      // Columns
      let x = box.x, over = 0;
      polys.forEach((poly, i) => {
        const cw = (poly.area / area) * box.w;
        const t = ease(seg(rise, (i / polys.length) * 0.7, (i / polys.length) * 0.7 + 0.3));
        const v = lerp(0, lerp(poly.Bmin, target, settle), t);
        if (t > 0) {
          const top = Y(v), bTop = Y(Math.min(v, B));
          g.strokeStyle = rgba(c.contour, 0.6); g.lineWidth = 1; g.beginPath(); g.moveTo(x + 0.5, Math.max(top, bTop)); g.lineTo(x + 0.5, base); g.stroke();
          g.fillStyle = rgba(c.contour, 0.16);
          g.fillRect(x + 0.5, bTop, cw - 1, base - bTop);
          if (v > B) {
            over++;
            const path = new Path2D(); path.rect(x + 0.5, top, cw - 1, bTop - top);
            g.fillStyle = rgba(c.hazard, 0.1); g.fill(path);
            hatch(g, path, -45, 5, rgba(c.hazard, 0.75), 1, [x, top, cw, bTop - top]);
            g.strokeStyle = c.hazard; g.lineWidth = 1; g.beginPath(); g.moveTo(x + 0.5, top + 0.5); g.lineTo(x + cw - 0.5, top + 0.5); g.stroke();
          }
        }
        x += cw;
      });
      // The budget, drawn first and kept on top
      if (line > 0) {
        g.strokeStyle = c.ink; g.lineWidth = 2; g.beginPath();
        g.moveTo(box.x, Y(B)); g.lineTo(box.x + box.w * line, Y(B)); g.stroke();
        label(g, `Available: ${fmt(B)}`, box.x + 8, Y(B) + 18, { size: 13, weight: 500, color: c.ink, a: line });
      }
      if (settle > 0) {
        label(g, `Minimum: ${fmt(Math.round(target))}${turn > 0 ? '' : '  (+16%)'}`, box.x + box.w, Y(target) - 10, { size: 15, weight: 600, color: c.ink, align: 'right', a: settle });
      }
      // The risk dial
      const dA = ease(seg(p, 0.74, 0.8));
      if (dA > 0) {
        g.globalAlpha = dA;
        g.strokeStyle = c.ink; g.lineWidth = 1;
        g.beginPath(); g.moveTo(dial.x, dial.y); g.lineTo(dial.x + dial.w, dial.y); g.stroke();
        F.forEach(([a]) => {
          const t = (Math.log(a) - Math.log(F[0][0])) / (Math.log(F[F.length - 1][0]) - Math.log(F[0][0]));
          const X = dial.x + t * dial.w;
          g.beginPath(); g.moveTo(X, dial.y - 4); g.lineTo(X, dial.y + 4); g.stroke();
          label(g, String(a), X, dial.y + 20, { size: 11, color: c.graphite, align: 'center' });
        });
        const X = dial.x + clamp(turn) * dial.w;
        g.fillStyle = c.ink; g.beginPath(); g.arc(X, dial.y, 6, 0, Math.PI * 2); g.fill();
        label(g, 'Risk of falling short, α', dial.x, dial.y - 14, { size: 12, color: c.graphite });
        g.globalAlpha = 1;
      }
            readout(turn > 0 ? `α = ${alpha.toFixed(2)}\nminimum ${fmt(Math.round(level))}` : settle > 0 ? `weighted mean ${fmt(mean, 0)}\nshort by MXN 365 thousand` : `over budget: ${over} of 30 polygons`);
    },
  };
}
