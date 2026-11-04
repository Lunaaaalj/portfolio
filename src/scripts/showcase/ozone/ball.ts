// Fig. 12. The ball. Over 2021–2024 the metropolitan series behaves as a two-state chain: after a
// clean day 0.163 of days exceed, after an exceedance 0.621. The difference is the memory. It
// shrinks as the chain's second eigenvalue to the power of the days, so the scene drops a ball
// whose every bounce is exactly λ₂ = 0.458 of the one before: a coefficient of restitution taken
// from the data. The floor is the chain's stationary rate, 0.301, and the heights are to scale.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, label, seg } from '../draw';
import { bench } from './apparatus';

const M = story.memory, DAYS = 6, gaps = M.gap;

export default function ball(): Scene {
  let L = 0, R = 0, floor = 0, unit = 0, step = 0;
  return {
    layout({ w, h }) { L = 44; R = w - 34; floor = h - 96; unit = (floor - 110) / (gaps[0] * 1.12); step = (R - L) / (DAYS + 0.4); },
    draw({ g, c, readout }, p) {
      const run = seg(p, 0.22, 0.86) * DAYS, env = ease(seg(p, 0.86, 0.94));
      const hAt = (d: number) => {
        // Between day k and k + 1 the ball flies a parabola from floor to floor with apex gaps[k]
        const k = Math.min(DAYS - 1, Math.floor(d)), t = d - k;
        return 4 * t * (1 - t) * gaps[k];
      };
      for (const v of [0, 0.1, 0.2, 0.3, 0.4]) {
        const y = floor - v * unit;
        g.strokeStyle = c.contour; g.lineWidth = 1; g.beginPath(); g.moveTo(L, y + 0.5); g.lineTo(R, y + 0.5); g.stroke();
        label(g, `+${v.toFixed(1)}`, L - 8, y + 4, { size: 11, color: c.graphite, align: 'right' });
      }
      bench(g, c, L, R, floor);
      label(g, `Floor: the chain’s long-run rate, ${M.stationary}`, L, floor + 30, { size: 12, color: c.graphite });

      // The path so far
      g.strokeStyle = c.ramp[3]; g.lineWidth = 1.5; g.setLineDash([2, 4]); g.beginPath();
      for (let d = 0; d <= run; d += 0.02) { const x = L + d * step, y = floor - hAt(d) * unit; if (d === 0) g.moveTo(x, y); else g.lineTo(x, y); }
      g.stroke(); g.setLineDash([]);

      // Apexes
      for (let k = 0; k < DAYS; k++) {
        const a = seg(run, k + 0.5, k + 0.7); if (a <= 0) continue;
        const x = L + (k + 0.5) * step, y = floor - gaps[k] * unit;
        g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(x - 9, y); g.lineTo(x + 9, y); g.stroke();
        label(g, gaps[k].toFixed(3), x, y - 9, { size: 12, weight: k < 3 ? 500 : 400, color: c.ink, align: 'center', a });
        label(g, `day ${k + 1}`, x, floor + 15, { size: 11, color: c.graphite, align: 'center', a });
      }
      if (env > 0) {
        g.strokeStyle = c.hazard; g.lineWidth = 1.5; g.globalAlpha = env; g.beginPath();
        for (let d = 0.5; d <= DAYS - 0.5; d += 0.05) { const x = L + d * step, y = floor - M.lambda ** (d + 0.5) * unit; if (d === 0.5) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke(); g.globalAlpha = 1;
        label(g, `λ₂ʰ, λ₂ = ${M.lambda}`, L + 2.7 * step, floor - gaps[1] * unit, { size: 12.5, weight: 500, color: c.hazard, a: env });
      }
      // The ball
      const d = Math.min(run, DAYS), x = L + d * step, y = floor - hAt(Math.min(d, DAYS - 0.0001)) * unit;
      g.fillStyle = c.ink; g.beginPath(); g.arc(x, y - 7, 7, 0, 7); g.fill();
      readout(`exceeded yesterday: ${M.P[1][1]}\nclean yesterday: ${M.P[0][1]}\nodds × ${M.orYesterday}, all else equal`);
    },
  };
}
