// Fig. 5. The clock of the day. Twenty-four hours round a dial, midnight at the top, with the
// median hour of 640,583 station-hours for morning NO, sunlight and ozone, each to its own scale.
// The precursors peak with the morning traffic window, the sun at midday, ozone in the afternoon.
// A shutter over 06–09 h marks what the daily table keeps of the precursors, and a cup fills with
// the sun, the daily sum. The order of the peaks is measured; that the first causes the third is
// what the report calls consistent with, not proven.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, label, lerp, rgba, seg } from '../draw';

const { o3, no, sr } = story.clock;
const peakOf = (v: number[]) => v.indexOf(Math.max(...v));
const SUMS = ['Max. temperature', 'Sun, daily sum', 'NO, NO₂, NOₓ, CO, 06–09 h', 'Mean and min. wind', 'Pressure', 'Humidity, mean and min.', 'Wind, E–W and N–S', 'PM₁₀, PM₂.₅, SO₂'];

export default function clock(): Scene {
  let cx = 0, cy = 0, R = 0, wide = true;
  const A = (h: number) => (h / 24) * Math.PI * 2 - Math.PI / 2;
  const petal = (g: CanvasRenderingContext2D, v: number[], r0: number, r1: number, to: number) => {
    const m = Math.max(...v), lo = Math.min(...v);
    g.beginPath();
    for (let k = 0; k <= 96; k++) {
      const h = (k / 96) * 24; if (h > to) break;
      const i = Math.floor(h) % 24, j = (i + 1) % 24, t = h - Math.floor(h), val = (lerp(v[i], v[j], t) - lo) / (m - lo), r = r0 + (r1 - r0) * val;
      if (k === 0) g.moveTo(cx + Math.cos(A(h)) * r, cy + Math.sin(A(h)) * r); else g.lineTo(cx + Math.cos(A(h)) * r, cy + Math.sin(A(h)) * r);
    }
    return { m };
  };
  return {
    layout({ w, h }) { wide = w > 700; R = Math.min((wide ? w * 0.33 : w * 0.4), (h - 190) / 2); cx = wide ? w * 0.4 : w / 2; cy = 84 + R; },
    draw({ g, c, readout, w, h }, p) {
      const run = seg(p, 0.08, 0.66) * 24, shut = ease(seg(p, 0.68, 0.74)), list = ease(seg(p, 0.78, 0.88));
      const r0 = R * 0.3;
      g.strokeStyle = c.ink; g.lineWidth = 1;
      g.beginPath(); g.arc(cx, cy, R, 0, 7); g.stroke();
      g.strokeStyle = c.contour; g.beginPath(); g.arc(cx, cy, r0, 0, 7); g.stroke();
      for (let i = 0; i < 24; i++) {
        const a = A(i), l = i % 6 === 0 ? 9 : 4;
        g.strokeStyle = c.ink; g.beginPath(); g.moveTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.lineTo(cx + Math.cos(a) * (R + l), cy + Math.sin(a) * (R + l)); g.stroke();
        if (i % 6 === 0) label(g, `${String(i).padStart(2, '0')} h`, cx + Math.cos(a) * (R + 26), cy + Math.sin(a) * (R + 26) + 4, { size: 11, color: c.graphite, align: 'center' });
      }
      // Sunlight, then NO, then ozone
      petal(g, sr, r0, R * 0.98, run); g.strokeStyle = c.genus[3]; g.lineWidth = 2; g.stroke();
      petal(g, no, r0, R * 0.98, run); g.strokeStyle = c.ink; g.lineWidth = 1.5; g.stroke();
      petal(g, o3, r0, R * 0.98, run); g.strokeStyle = c.ramp[3]; g.lineWidth = 2.5; g.stroke();

      // Peaks, labelled as the hand passes them
      for (const [v, name, color] of [[no, 'NO', c.ink], [sr, 'Sun', c.genus[3]], [o3, 'Ozone', c.ramp[3]]] as [number[], string, string][]) {
        const k = peakOf(v), a = seg(run, k, k + 0.8);
        if (a <= 0) continue;
        const ang = A(k), out = R + 16, ca = Math.cos(ang), sa = Math.sin(ang);
        g.fillStyle = color; g.beginPath(); g.arc(cx + Math.cos(ang) * (R * 0.98), cy + Math.sin(ang) * (R * 0.98), 3.5 * a, 0, 7); g.fill();
        const tx = cx + ca * out, right = ca > 0.2 && tx + 62 > w;
        label(g, `${name}, ${String(k).padStart(2, '0')} h`, right ? w - 6 : tx, cy + sa * out + (right ? 28 : 12), { size: 12, weight: 500, color, align: right ? 'right' : ca > 0.2 ? 'left' : ca < -0.2 ? 'right' : 'center', a });
      }

      // The hand
      if (run > 0 && run < 24) {
        const a = A(run); g.strokeStyle = c.hazard; g.lineWidth = 1.25;
        g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R); g.stroke();
      }
      // The shutter
      if (shut > 0) {
        g.fillStyle = rgba(c.graphite, 0.2 * shut); g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, R, A(6), A(10)); g.closePath(); g.fill();
        g.strokeStyle = c.ink; g.globalAlpha = shut; g.lineWidth = 1.25; g.stroke(); g.globalAlpha = 1;
      }
      // What the day leaves
      if (list > 0) {
        const x = wide ? Math.min(cx + R + 54, w - 170) : 18, y0 = wide ? cy - 96 : h - 92;
        label(g, '16 daily summaries', x, y0, { size: 12.5, weight: 500, color: c.ink, a: list });
        if (wide) SUMS.forEach((t, i) => label(g, t, x, y0 + 22 + i * 19, { size: 11.5, color: c.graphite, a: seg(list, i * 0.08, 0.5 + i * 0.06) }));
      }
      const hr = Math.min(23, Math.floor(run));
      readout(`Median day, 2021–2025\n${String(hr).padStart(2, '0')} h: ozone ${o3[hr].toFixed(0)} ppb`);
    },
  };
}
