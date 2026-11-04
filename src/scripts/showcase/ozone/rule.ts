// Fig. 4. The rubber rule. 1,400 real day-station values of morning NO stand on a rule. The rule
// is rubber: the Box–Cox family is continuous in λ, so the scene runs λ from 1, which changes
// nothing, down to the project's −0.103, stretching the low end of the rule and compressing the
// high end. The histogram is recomputed at every λ and the skewness in the readout is measured on
// the sample, not interpolated. The last step is standardising: the rule slides to mean 0.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { easeInOut, ease, label, lerp, rgba, seg } from '../draw';
import { bench, specimen as S, tag } from './apparatus';

const xs = story.rule.no, LAMBDA = story.rule.lambda, BINS = 44;
const TICKS = [1, 2, 5, 10, 20, 50, 100, 200];
const bc = (x: number, l: number) => (Math.abs(l) < 1e-6 ? Math.log(x) : (x ** l - 1) / l);

function stats(v: number[]) {
  const n = v.length, m = v.reduce((a, b) => a + b, 0) / n;
  let s2 = 0, s3 = 0;
  for (const x of v) { const d = x - m; s2 += d * d; s3 += d * d * d; }
  s2 /= n; s3 /= n;
  return { m, sd: Math.sqrt(s2), skew: s3 / s2 ** 1.5 };
}

export default function rule(): Scene {
  let L = 0, R = 0, base = 0, T = 0;
  return {
    layout({ w, h }) { L = 24; R = w - 24; T = 92; base = h - 118; },
    draw({ g, c, readout }, p) {
      const stand = ease(seg(p, 0, 0.14)), l = lerp(1, LAMBDA, easeInOut(seg(p, 0.16, 0.74)));
      const center = easeInOut(seg(p, 0.82, 0.96));
      const v = xs.map((x) => bc(x, l)), lo = v[0], hi = v[v.length - 1], { skew, m, sd } = stats(v);
      const X = (t: number) => L + ((t - lo) / (hi - lo)) * (R - L);
      const counts = new Array(BINS).fill(0);
      for (const t of v) counts[Math.min(BINS - 1, Math.floor(((t - lo) / (hi - lo)) * BINS))]++;
      const peak = Math.max(...counts), H = base - T, bw = (R - L) / BINS;
      const scale = H / Math.max(peak, 120);

      for (let i = 0; i < BINS; i++) {
        const y = counts[i] * scale * stand;
        g.fillStyle = rgba(c.ramp[3], 0.8); g.fillRect(L + i * bw + 0.5, base - y, bw - 1, y);
      }
      bench(g, c, L, R, base);

      // The rule, in rubber
      const ruleY = base + 22;
      g.strokeStyle = c.ink; g.lineWidth = 1; g.fillStyle = rgba(c.genus[2], 0.25);
      g.fillRect(L, ruleY, R - L, 22); g.strokeRect(L + 0.5, ruleY + 0.5, R - L - 1, 21);
      for (const t of TICKS) {
        const x = X(bc(t, l)); if (x < L || x > R) continue;
        g.beginPath(); g.moveTo(x, ruleY); g.lineTo(x, ruleY + 9); g.stroke();
        label(g, `${t}`, x, ruleY + 19, { size: 11, color: c.ink, align: 'center' });
      }
      label(g, 'Morning NO, 06–09 h, ppb', L, ruleY + 40, { size: 12, color: c.graphite });

      if (center > 0) {
        const x0 = X(m);
        g.strokeStyle = c.survey; g.lineWidth = 1.5; g.globalAlpha = center;
        g.beginPath(); g.moveTo(x0, T); g.lineTo(x0, base); g.stroke();
        for (const k of [-2, -1, 1, 2]) { const x = X(m + k * sd); g.lineWidth = 1; g.beginPath(); g.moveTo(x, base - 10); g.lineTo(x, base); g.stroke(); label(g, `${k > 0 ? '+' : '−'}${Math.abs(k)} SD`, x, base - 16, { size: 11, color: c.survey, align: 'center', a: center }); }
        g.globalAlpha = 1;
        label(g, 'mean', x0 + 6, T + 12, { size: 11.5, color: c.survey, a: center });
      }
      const sx = X(bc(S.noRush, l));
      g.strokeStyle = c.hazard; g.lineWidth = 1.5; g.beginPath(); g.moveTo(sx, base - 4); g.lineTo(sx, ruleY + 22); g.stroke();
      tag(g, c, sx, base - Math.min(H * 0.72, 40 + peak * scale * 0.2), `${S.station}: ${S.noRush} ppb`, stand, sx > (L + R) / 2 ? -1 : 1);
      const signed = (x: number, d: number) => (x < 0 && +x.toFixed(d) !== 0 ? '−' : '') + Math.abs(x).toFixed(d);
      readout(`λ ${signed(l, 3)}\nskewness ${signed(skew, 2)}`);
    },
  };
}
