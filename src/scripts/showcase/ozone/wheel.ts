// Fig. 13. The wheel of the year. 2025 as 365 spokes, January at the top, each as long as the
// metropolitan model's probability for that day. A ring marks the cut fixed on the fitting years.
// The colour is the verdict: found, missed, false alarm or a clean day left alone. The hub is a
// level: its radius is each year's rate of exceedance, so the step of 2024 shows as water that
// rises under a model that was fitted mostly below it.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, label, lerp, rgba, seg } from '../draw';

const Y = story.year, days = Y.days as [number, number][], N = days.length;
const YEARS = Object.keys(Y.prevalence).map(Number);
const MONTHS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
const start = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];

export default function wheel(): Scene {
  let cx = 0, cy = 0, R0 = 0, R = 0;
  const A = (i: number) => (i / N) * Math.PI * 2 - Math.PI / 2;
  return {
    layout({ w, h }) { R = Math.min(w * 0.42, (h - 150) / 2); R0 = R * 0.26; cx = w * 0.5; cy = 76 + R + 6; },
    draw({ g, c, readout, h, w }, p) {
      const run = seg(p, 0.04, 0.62) * N, rise = seg(p, 0.66, 0.84), last = ease(seg(p, 0.88, 0.96));
      const yr = Math.min(YEARS.length - 1, rise * (YEARS.length - 0.001)), i0 = Math.floor(yr), level = (k: number) => (Y.prevalence as Record<string, number>)[YEARS[k]], lvl = lerp(level(i0), level(Math.min(i0 + 1, YEARS.length - 1)), ease(yr - i0));
      const span = R - R0;
      let hit = 0, fa = 0;
      for (let i = 0; i < N && i < run; i++) {
        const [pr, y] = days[i], on = pr >= Y.threshold, a = A(i);
        const color = on && y ? c.ramp[3] : !on && y ? c.hazard : on ? c.genus[3] : rgba(c.graphite, 0.45);
        if (on && y) hit++; else if (on && !y) fa++;
        g.strokeStyle = color; g.lineWidth = Math.max(1.1, (Math.PI * 2 * R) / N * 0.62);
        g.beginPath(); g.moveTo(cx + Math.cos(a) * R0, cy + Math.sin(a) * R0); g.lineTo(cx + Math.cos(a) * (R0 + pr * span), cy + Math.sin(a) * (R0 + pr * span)); g.stroke();
      }
      g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R0 + Y.threshold * span, 0, 7); g.stroke();
      g.strokeStyle = c.contour; g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke(); g.beginPath(); g.arc(cx, cy, R0, 0, 7); g.stroke();
      MONTHS.forEach((m, i) => { const a = A(start[i] + 14); label(g, m, cx + Math.cos(a) * (R + 13), cy + Math.sin(a) * (R + 13) + 4, { size: 11, color: c.graphite, align: 'center' }); });

      // The hub: a level, not a date
      g.beginPath(); g.arc(cx, cy, R0 * 0.94, 0, 7); g.fillStyle = c.plate; g.fill();
      const H = R0 * 1.88, top = cy + R0 * 0.94 - H * (lvl / 0.6);
      g.save(); g.beginPath(); g.arc(cx, cy, R0 * 0.94, 0, 7); g.clip(); g.fillStyle = rgba(c.ramp[2], 0.6); g.fillRect(cx - R0, top, R0 * 2, cy + R0 - top); g.restore();
      g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.arc(cx, cy, R0 * 0.94, 0, 7); g.stroke();
      if (rise > 0) {
        label(g, `${YEARS[Math.round(Math.min(yr, YEARS.length - 1))]}`, cx, cy - 3, { size: 12, weight: 500, color: c.ink, align: 'center' });
        if (R0 > 48) label(g, `${(lvl * 100).toFixed(0)}% of days`, cx, cy + 12, { size: 11, color: c.ink, align: 'center' });
      }
      // Key
      const y0 = h - 30, items: [string, string][] = [['Found', c.ramp[3]], ['Missed', c.hazard], ['False alarm', c.genus[3]], ['Clean', rgba(c.graphite, 0.45)]];
      const step = Math.min(106, (w - 32) / 4), x0 = (w - step * 4) / 2;
      items.forEach(([t, color], i) => { g.fillStyle = color; g.fillRect(x0 + i * step, y0 - 9, 10, 10); label(g, t, x0 + i * step + 15, y0, { size: 11.5, color: c.graphite }); });

      const lines = [`found ${hit} of ${Y.exceedances}`, `false alarms ${fa}`];
      if (p > 0.66) lines.push(`mean predicted ${Y.meanPredicted}`, `observed ${Y.meanObserved}`);
      if (last > 0.5) lines.push(`other years, left out: ${Y.pooled}`);
      readout(lines.join('\n'));
    },
  };
}
