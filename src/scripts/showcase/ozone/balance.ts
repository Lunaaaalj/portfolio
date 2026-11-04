// Fig. 9. The balance. A logistic regression adds log-odds, and a beam balance adds weights, so
// the specimen is weighed: the model's refitted coefficients are the masses, each term is its
// coefficient times the specimen's value, and the pointer travels in log-odds over a scale
// engraved in probability, which is why its ticks crowd towards the ends. The counterweight is the
// intercept, the reference day: a working winter day in the Northeast with every factor at its
// mean. Then the balance is locked, because nothing in 2025 may touch it.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, easeInOut, label, lerp, rgba, seg } from '../draw';
import { bench, specimen as S, tag } from './apparatus';

const logistic = (x: number) => 1 / (1 + Math.exp(-x));
const logit = (p: number) => Math.log(p / (1 - p));
const SPAN = 3.4;                                   // log-odds at the end of the scale
const TICKS = [0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95];
const LOCK = story.gate.threshold;

// Heaviest first, so that the small terms land on a stack that is already there
const terms = [...S.terms].sort((a, b) => Math.abs(b[1] as number) - Math.abs(a[1] as number)) as [string, number][];

const ODDS: Record<string, string> = {
  Northwest: '× 3.84 against the Northeast', Spring: '× 3.54 against winter', Saturday: '× 1.13 against a working day',
  'Photochemical forcing': `× 2.78 per SD, today ${S.z.foto >= 0 ? '+' : '−'}${Math.abs(S.z.foto).toFixed(2)} SD`,
  'Primary combustion': `× 1.92 per SD, today ${S.z.comb >= 0 ? '+' : '−'}${Math.abs(S.z.comb).toFixed(2)} SD`,
  Ventilation: `× 0.90 per SD, today ${S.z.vent >= 0 ? '+' : '−'}${Math.abs(S.z.vent).toFixed(2)} SD`,
};

export default function balance(): Scene {
  let cx = 0, cy = 0, arm = 0, drop = 0, unit = 0, wide = true, ground = 0, panW = 0;
  return {
    layout({ w, h }) {
      wide = w > 620;
      cx = w * 0.5; cy = Math.max(176, h * 0.29); arm = Math.min(w * 0.32, 290);
      unit = Math.min(58, (h - 64 - cy - 92) / 3.4);
      drop = unit * 3.4 + 26; panW = Math.min(136, arm * 0.78);
      ground = Math.min(h - 64, cy + drop + 96);
      const spare = Math.max(0, (h - 64 - ground) / 2);
      cy += spare; ground += spare;
    },
    draw({ g, c, readout, w }, p) {
      const n = terms.length, A = 0.12, B = 0.7;
      let sum = S.intercept, shown = 0;
      const fall: number[] = [];
      for (let i = 0; i < n; i++) {
        const t = easeInOut(seg(p, A + ((B - A) * i) / n, A + ((B - A) * (i + 0.8)) / n));
        fall.push(t); sum += terms[i][1] * t; if (t >= 1) shown = i + 1;
      }
      const verdict = ease(seg(p, 0.72, 0.8)), locked = ease(seg(p, 0.86, 0.93));
      const pr = logistic(sum), tilt = (Math.max(-SPAN, Math.min(SPAN, sum)) / SPAN) * 0.26;
      const SC = (x: number) => (x / SPAN) * 1.05 - Math.PI / 2;   // angle on the scale
      const r = Math.min(cy - 62, arm * 0.8);

      // The post and the scale
      g.strokeStyle = c.ink; g.lineWidth = 1;
      g.beginPath(); g.moveTo(cx - 6, ground); g.lineTo(cx - 3, cy + 6); g.moveTo(cx + 6, ground); g.lineTo(cx + 3, cy + 6); g.stroke();
      bench(g, c, cx - Math.min(w * 0.44, 380), cx + Math.min(w * 0.44, 380), ground);
      g.beginPath(); g.arc(cx, cy, r, SC(-SPAN), SC(SPAN)); g.stroke();
      for (const t of TICKS) {
        const a = SC(logit(t)), ca = Math.cos(a), sa = Math.sin(a);
        g.beginPath(); g.moveTo(cx + ca * r, cy + sa * r); g.lineTo(cx + ca * (r + 6), cy + sa * (r + 6)); g.stroke();
        label(g, `${t}`.replace(/^0/, ''), cx + ca * (r + 18), cy + sa * (r + 18) + 4, { size: 11, color: c.graphite, align: 'center' });
      }
      { // The fitted cut, on the scale
        const a = SC(logit(LOCK)), ca = Math.cos(a), sa = Math.sin(a);
        g.strokeStyle = c.hazard; g.lineWidth = 1.5; g.globalAlpha = verdict;
        g.beginPath(); g.moveTo(cx + ca * (r - 7), cy + sa * (r - 7)); g.lineTo(cx + ca * (r + 6), cy + sa * (r + 6)); g.stroke(); g.globalAlpha = 1;
        label(g, `cut ${LOCK.toFixed(3).replace(/^0/, '')}`, cx + ca * (r - 22), cy + sa * (r - 22) + 4, { size: 11, color: c.hazard, align: 'center', a: verdict });
      }

      // The beam
      const dx = Math.cos(tilt) * arm, dy = Math.sin(tilt) * arm;
      const lx = cx - dx, rx = cx + dx, leftY = cy - dy, rightY = cy + dy;
      g.strokeStyle = c.ink; g.lineWidth = 2.2; g.beginPath(); g.moveTo(lx, leftY); g.lineTo(rx, rightY); g.stroke();
      g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx - 8, cy + 13); g.lineTo(cx + 8, cy + 13); g.closePath(); g.fillStyle = c.plate; g.fill(); g.lineWidth = 1; g.stroke();

      // The pointer
      const a = SC(sum);
      g.strokeStyle = c.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(a) * (r - 2), cy + Math.sin(a) * (r - 2)); g.stroke();

      // Pans, hanging straight down whatever the beam does
      const pan = (x: number, y: number) => {
        const py = y + drop;
        g.strokeStyle = c.graphite; g.lineWidth = 1;
        g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 12); g.moveTo(x - panW / 2, y + 12); g.lineTo(x + panW / 2, y + 12);
        g.moveTo(x - panW / 2, y + 12); g.lineTo(x - panW / 2, py); g.moveTo(x + panW / 2, y + 12); g.lineTo(x + panW / 2, py); g.stroke();
        g.strokeStyle = c.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x - panW / 2 - 5, py + 0.5); g.lineTo(x + panW / 2 + 5, py + 0.5); g.stroke();
        return py;
      };
      const pl = pan(lx, leftY), pr2 = pan(rx, rightY);

      // Counterweight: the reference day
      const ch = -S.intercept * unit;
      g.fillStyle = c.plate; g.strokeStyle = c.ink; g.lineWidth = 1;
      const bw0 = Math.min(panW - 12, 112);
      g.fillRect(lx - bw0 / 2, pl - ch, bw0, ch); g.strokeRect(lx - bw0 / 2 + 0.5, pl - ch + 0.5, bw0 - 1, ch - 1);
      label(g, bw0 > 96 ? 'Reference day' : 'Reference', lx, pl - ch / 2 - (bw0 > 96 ? 10 : -4), { size: 12, weight: 500, color: c.ink, align: 'center' });
      if (bw0 > 96) {
        label(g, 'winter, Northeast', lx, pl - ch / 2 + 7, { size: 10.5, color: c.graphite, align: 'center' });
        label(g, 'working day', lx, pl - ch / 2 + 20, { size: 10.5, color: c.graphite, align: 'center' });
      }

      // The weights, stacked on the right pan
      let stack = pr2;
      for (let i = 0; i < n; i++) {
        const t = fall[i]; if (t <= 0) continue;
        const [name, v] = terms[i], wh = Math.max(3, Math.abs(v) * unit), bw = Math.min(panW - 12, 112), kept = name === 'Northwest' || name === 'Spring' || name === 'Saturday';
        const y1 = stack - wh, ty = lerp(40, y1, t), x = rx - bw / 2, arrive = t >= 1;
        g.fillStyle = kept ? rgba(c.ramp[3], 0.85) : c.genus[3];
        g.globalAlpha = 0.95; g.fillRect(x, ty, bw, wh - 1); g.globalAlpha = 1;
        g.strokeStyle = c.ink; g.lineWidth = 1; g.strokeRect(x + 0.5, ty + 0.5, bw - 1, wh - 2);
        if (wh >= 17) label(g, name.replace('Photochemical f', 'F').replace('Primary c', 'C'), rx, ty + wh / 2 + 3, { size: 11, weight: 500, color: kept ? c.plate : c.ink, align: 'center' });
        if (arrive) stack = y1;
      }
      // The term just landed, named beside the pan
      const now = terms[Math.min(n - 1, Math.max(0, shown - (fall[Math.min(n - 1, shown)] > 0.2 ? 0 : 1)))];
      if (p > A && p < 0.72) {
        const text = `${now[0]}: ${ODDS[now[0]] ?? ''}`;
        label(g, text, wide ? cx : 16, ground + 28, { size: 12, color: c.ink, align: wide ? 'center' : 'left' });
      }

      if (verdict > 0 && wide) tag(g, c, rx + panW / 2, pr2 + 26, `${S.station}, ${S.label}: exceeded`, verdict, -1);

      // The lock
      if (locked > 0) {
        const lw = 34, ly2 = cy + 26;
        g.globalAlpha = locked; g.strokeStyle = c.ink; g.lineWidth = 1.5;
        const sx = (rx - cx) * 0.5, sy = (rightY - cy) * 0.5;
        g.beginPath(); g.moveTo(cx, cy + 86); g.lineTo(cx + sx, cy + sy); g.moveTo(cx, cy + 86); g.lineTo(cx - sx, cy - sy); g.stroke();
        g.fillStyle = c.plate; g.fillRect(cx - lw / 2, ly2, lw, 22); g.lineWidth = 1; g.strokeRect(cx - lw / 2 + 0.5, ly2 + 0.5, lw - 1, 21);
        g.beginPath(); g.arc(cx, ly2, 9, Math.PI, 0); g.stroke();
        g.globalAlpha = 1;
      }

      readout([`${S.station}, ${S.label}`, `log-odds ${sum >= 0 ? '+' : '−'}${Math.abs(sum).toFixed(2)}`, `odds ${Math.exp(sum).toFixed(2)}`, `probability ${pr.toFixed(p > B ? 3 : 2)}`, ...(locked > 0.5 ? ['fitted on 2021–2024, locked'] : [])].join('\n'));
    },
  };
}
