// Fig. 10. The gate. The 2,927 day-stations of 2025 fall by predicted probability, those that
// exceeded above the rail and the clean ones below. A gate slides down the rail from 1 to the cut;
// everything past it is called an exceedance, and each position of the gate is one point of the
// ROC curve, drawn by the gate as it goes. It is computed here from the probabilities. The cut
// was fixed on the fitting years, so the gate stops where it was told to, not where 2025 would
// have liked. The second balance, the discriminant, then runs its own curve almost on top.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { easeInOut, ease, label, lerp, rgba, seg } from '../draw';
import { specimen as S, tag } from './apparatus';

const G = story.gate, N = G.p.length, BINS = 64;
const pos = G.y.reduce((a, b) => a + b, 0), neg = N - pos;
function curve(p: number[]) {
  const idx = p.map((_, i) => i).sort((a, b) => p[b] - p[a]);
  const pts: [number, number, number][] = [[0, 0, 1]];
  let tp = 0, fp = 0;
  idx.forEach((i) => { if (G.y[i]) tp++; else fp++; pts.push([fp / neg, tp / pos, p[i]]); });
  return pts;
}
const LOG = curve(G.p), LDA = curve(G.pLda);
const stackUp = new Array(BINS).fill(0), stackDn = new Array(BINS).fill(0);
G.p.forEach((v, i) => { const b = Math.min(BINS - 1, Math.floor(v * BINS)); if (G.y[i]) stackUp[b]++; else stackDn[b]++; });
const peak = Math.max(...stackUp, ...stackDn);

export default function gate(): Scene {
  let L = 0, R = 0, rail = 0, H = 0, rx = 0, ry = 0, rs = 0;
  return {
    layout({ w, h }) {
      const wide = w > 700;
      L = 24; R = wide ? w * 0.56 : w - 24;
      rail = wide ? h * 0.5 : 74 + (h - 74) * 0.26; H = wide ? h * 0.3 : (h - 74) * 0.2;
      rs = wide ? Math.min(w - R - 72, h - 240) : Math.min(w - 90, h - rail - H - 80);
      rx = wide ? R + 52 : (w - rs) / 2 + 8; ry = wide ? h * 0.5 - rs / 2 : rail + H + 34;
    },
    draw({ g, c, readout }, p) {
      const falling = ease(seg(p, 0, 0.16)), run = easeInOut(seg(p, 0.2, 0.66)), second = ease(seg(p, 0.74, 0.88));
      const cut = lerp(1, G.threshold, run), X = (v: number) => L + v * (R - L), unit = H / peak;
      const bw = (R - L) / BINS;
      for (let b = 0; b < BINS; b++) {
        const past = (b + 0.5) / BINS >= cut;
        const u = stackUp[b] * unit * falling, d = stackDn[b] * unit * falling, x = L + b * bw;
        g.fillStyle = past ? c.ramp[3] : rgba(c.ramp[3], 0.3); g.fillRect(x + 0.5, rail - u, bw - 1, u);
        g.fillStyle = past ? c.hazard : rgba(c.graphite, 0.3); g.fillRect(x + 0.5, rail + 1, bw - 1, d);
      }
      g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(L, rail + 0.5); g.lineTo(R, rail + 0.5); g.stroke();
      for (const t of [0, 0.25, 0.5, 0.75, 1]) label(g, `${t}`.replace(/^0\./, '.'), X(t), rail + H + 18, { size: 11, color: c.graphite, align: 'center' });
      label(g, 'Exceeded', L, rail - H - 8, { size: 12, color: c.ink });
      if (R - L > 400) label(g, 'Clean: past the gate, false alarms', (L + R) / 2, rail + H + 36, { size: 11.5, color: c.graphite, align: 'center' });

      // The gate
      const gx = X(cut);
      if (p > 0.18) {
        g.strokeStyle = c.ink; g.lineWidth = 2; g.beginPath(); g.moveTo(gx, rail - H - 2); g.lineTo(gx, rail + H + 2); g.stroke();
        g.lineWidth = 1; g.beginPath(); g.moveTo(gx - 6, rail - H - 2); g.lineTo(gx + 6, rail - H - 2); g.moveTo(gx - 6, rail + H + 2); g.lineTo(gx + 6, rail + H + 2); g.stroke();
      }
      tag(g, c, X(S.p), rail - stackUp[Math.floor(S.p * BINS)] * unit - 8, `${S.station}`, falling * (1 - second), -1);

      // The ROC square
      g.strokeStyle = c.ink; g.lineWidth = 1; g.strokeRect(rx + 0.5, ry + 0.5, rs, rs);
      g.strokeStyle = c.contour; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(rx, ry + rs); g.lineTo(rx + rs, ry); g.stroke(); g.setLineDash([]);
      label(g, 'False alarms', rx + rs / 2, ry + rs + 18, { size: 11.5, color: c.graphite, align: 'center' });
      g.save(); g.translate(rx - 10, ry + rs / 2); g.rotate(-Math.PI / 2); label(g, 'Exceedances found', 0, 0, { size: 11.5, color: c.graphite, align: 'center' }); g.restore();
      const line = (pts: [number, number, number][], stop: number, color: string, width: number) => {
        g.strokeStyle = color; g.lineWidth = width; g.beginPath();
        for (const [f, t, v] of pts) { if (v < stop) break; const x = rx + f * rs, y = ry + rs - t * rs; if (f === 0 && t === 0) g.moveTo(x, y); else g.lineTo(x, y); }
        g.stroke();
      };
      if (second > 0) { g.globalAlpha = second; line(LDA, 0, c.genus[3], 1.5); g.globalAlpha = 1; }
      const done = seg(p, 0.66, 0.72);
      line(LOG, done >= 1 ? 0 : cut, c.ramp[3], 2);
      const here = LOG.find((q) => q[2] < cut) ?? LOG[0];
      g.fillStyle = c.hazard; g.beginPath(); g.arc(rx + here[0] * rs, ry + rs - here[1] * rs, 4, 0, 7); g.fill();

      const lines = [`gate at ${cut.toFixed(3)}`, `found ${(here[1] * 100).toFixed(1)}%`, `clean kept ${((1 - here[0]) * 100).toFixed(1)}%`];
      if (done >= 1) lines.push(`logistic AUC ${G.auc.toFixed(3)}`);
      if (second > 0.5) lines.push(`discriminant AUC ${G.aucLda.toFixed(3)}`);
      readout(lines.join('\n'));
    },
  };
}
