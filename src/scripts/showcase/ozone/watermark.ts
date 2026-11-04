// Fig. 6. The high-water mark. Twenty-four tubes hold the specimen's hourly ozone, to scale. A
// carriage eight tubes wide runs along them, and what it spans is poured into the tank: the tank's
// level is the eight-hour mean, on the same vertical scale as the tubes. The highest level of the
// day stays on the wall as a mark, which is the MDA8. The other days then stand beside the wall at
// their own marks (25,100 valid day-stations, 2 ppb bins), and the dike falls from 65 to 51 ppb.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, easeInOut, label, lerp, rgba, seg } from '../draw';
import { bench, glass, specimen as S, tag } from './apparatus';

const { hist, edges } = story.threshold, BIN = edges[2];
const TOP = 120, FIRST = 7, LAST = 23;
const mean8 = (end: number) => S.o3.slice(end - 7, end + 1).reduce((a, b) => a + b, 0) / 8;
const peak = Math.max(...hist);

export default function watermark(): Scene {
  let L = 0, T = 0, B = 0, step = 0, tx = 0, tw = 0, hx = 0, hw = 0;
  const Y = (v: number) => B - (v / TOP) * (B - T);
  return {
    layout({ w, h }) {
      const narrow = w < 560;
      L = narrow ? 34 : 48; T = narrow ? 74 : 82; B = h - (narrow ? 56 : 72);
      const tubes = w * 0.58;
      step = (tubes - L) / 24; tx = L + tubes - L + 14; tw = Math.max(34, w * 0.09); hx = tx + tw + 2; hw = w - hx - 16;
    },
    draw({ g, c, w, readout }, p) {
      const fill = seg(p, 0, 0.13), run = easeInOut(seg(p, 0.15, 0.6)), mark = ease(seg(p, 0.6, 0.7));
      const away = ease(seg(p, 0.71, 0.8)), days = ease(seg(p, 0.74, 0.86)), drop = easeInOut(seg(p, 0.88, 0.98));
      const end = Math.round(lerp(FIRST, LAST, run));
      const level = mean8(end), high = Math.max(...Array.from({ length: end - FIRST + 1 }, (_, i) => mean8(FIRST + i)));
      const dike = lerp(65, 51, drop), water = rgba(c.ramp[2], 0.55), deep = c.ramp[3];

      // The scale, common to the tubes, the tank and the days
      for (const v of [0, 25, 50, 75, 100]) {
        const y = Y(v);
        g.strokeStyle = rgba(c.contour, 0.55); g.lineWidth = 1; g.beginPath(); g.moveTo(L - 6, y + 0.5); g.lineTo(w - 16, y + 0.5); g.stroke();
        label(g, `${v}`, L - 10, y + 4, { size: 11, color: c.graphite, align: 'right' });
      }
      label(g, 'ppb', L - 10, T - 12, { size: 11, color: c.graphite, align: 'right' });
      bench(g, c, L - 6, w - 16, B);

      // The tubes
      const a = 1 - 0.8 * away;
      for (let i = 0; i < 24; i++) {
        const k = seg(fill, i / 30, (i + 7) / 30), x = L + i * step, wd = step * 0.68, y = Y(S.o3[i] * ease(k));
        const inside = run > 0 && p < 0.72 && i >= end - 7 && i <= end;
        if (k > 0) {
          g.globalAlpha = a; g.fillStyle = inside ? deep : water; g.fillRect(x, y, wd, B - y); g.globalAlpha = 1;
          glass(g, c, x, Y(106), wd, B - Y(106), 0.55 * a);
        }
        if (i % 6 === 0) label(g, `${String(i).padStart(2, '0')} h`, x + wd / 2, B + 22, { size: 11, color: c.graphite, align: 'center', a });
      }

      // The carriage and its pipe to the tank
      const tankTop = Y(112), onCarriage = p > 0.13 && p < 0.72 ? ease(seg(p, 0.13, 0.17)) * (1 - seg(p, 0.66, 0.71)) : 0;
      if (onCarriage > 0) {
        const x0 = L + (end - 7) * step - step * 0.1, x1 = L + end * step + step * 0.78, yb = Y(114);
        g.globalAlpha = onCarriage; g.strokeStyle = c.ink; g.lineWidth = 1;
        g.strokeRect(x0 + 0.5, yb + 0.5, x1 - x0, 7);
        g.beginPath();
        for (let x = x0 + 4; x < x1; x += 5) { g.moveTo(x, yb + 7); g.lineTo(x + 3, yb + 1); }
        g.stroke();
        g.strokeStyle = c.hazard; g.setLineDash([]);
        const yl = Y(level);
        g.lineWidth = 1.5; g.beginPath(); g.moveTo(x0, yl); g.lineTo(x1, yl); g.stroke();
        g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath();
        g.moveTo((x0 + x1) / 2, yb); g.lineTo((x0 + x1) / 2, Y(118)); g.lineTo(tx + tw / 2, Y(118)); g.lineTo(tx + tw / 2, tankTop + 2); g.stroke();
        g.globalAlpha = 1;
      }

      // The tank
      if (fill > 0) {
        if (run > 0 && p < 0.74) { const y = Y(level); g.globalAlpha = 1 - away; g.fillStyle = water; g.fillRect(tx, y, tw, B - y); g.globalAlpha = 1; }
        glass(g, c, tx, tankTop, tw, B - tankTop, ease(fill));
      }
      if (run > 0) {
        const y = Y(high), a2 = 1 - 0.75 * days;
        g.strokeStyle = c.ink; g.lineWidth = 2; g.globalAlpha = a2; g.beginPath(); g.moveTo(tx, y); g.lineTo(tx + tw, y); g.stroke(); g.globalAlpha = 1;
        if (mark > 0) tag(g, c, tx, y, `MDA8 ${S.mda8} ppb`, mark * (1 - seg(p, 0.86, 0.9)), -1);
      }

      // The other days, each at its own mark
      if (days > 0) {
        for (let i = 0; i < hist.length; i++) {
          const v = i * BIN, y0 = Y(v), y1 = Y(v + BIN), len = (hist[i] / peak) * hw * days;
          const over = Math.max(0, Math.min(1, (v + BIN - dike) / BIN));
          const split = y0 + (y1 - y0) * (1 - over);
          g.fillStyle = rgba(c.ramp[3], 0.75); g.fillRect(hx, split, len, y0 - split - 0.6);
          if (over > 0) { g.fillStyle = c.hazard; g.fillRect(hx, y1 + 0.6, len, split - y1 - 0.6); }
        }
        const y = Y(dike);
        g.strokeStyle = c.ink; g.lineWidth = 1.5; g.globalAlpha = days;
        g.beginPath(); g.moveTo(tx - 5, y); g.lineTo(w - 16, y); g.stroke(); g.globalAlpha = 1;
        label(g, `${Math.round(dike)} ppb`, w - 18, y - 7, { size: 12, weight: 500, color: c.ink, align: 'right', a: days });
      }

      const f = story.facts;
      const lines = [`${S.station}, ${S.label}`];
      if (run > 0 && p < 0.72) lines.push(`window ${String(end - 7).padStart(2, '0')}–${String(end + 1).padStart(2, '0')} h`, `level ${level.toFixed(1)} ppb`);
      if (p >= 0.72) lines.length = 0;
      if (days > 0.5) lines.push(`${story.facts.validMda8.toLocaleString('en-GB')} valid day-stations`, `over 65 ppb ${f.over65}%`);
      if (drop > 0.98) lines.push(`over 51 ppb ${f.over51}%`);
      readout(lines.join('\n'));
    },
  };
}
