// Fig. 14. The frosted panes. Each day further ahead puts one more pane of frosted glass between
// today and the day in question. A beam of light passes through them; its strength at each pane is
// the AUC of the forecast at that horizon, above the 0.5 of a coin, in 2025. Beneath it the calendar
// alone, which needs no looking. Then the panes are lifted: the oracle, the same model given the
// real factors of the target day, which no one can have. All refitted, one model per horizon.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, label, lerp, rgba, seg } from '../draw';
import { bench } from './apparatus';

const H = story.horizon.filter((f) => f.h >= 1);

export default function panes(): Scene {
  let L = 0, R = 0, top = 0, base = 0, chart = 0;
  return {
    layout({ w, h }) { L = 32; R = w - 34; top = 96; base = top + (h - 240) * 0.5; chart = h - 86; },
    draw({ g, c, readout }, p) {
      const pass = seg(p, 0.08, 0.6) * H.length, lift = ease(seg(p, 0.66, 0.8));
      const step = (R - L) / H.length;
      const strength = (i: number) => lerp((H[i].forecast - 0.5) / 0.5, (H[i].oracle - 0.5) / 0.5, lift);

      // The beam
      let x0 = L - 14;
      const mid = (top + base) / 2;
      g.fillStyle = c.genus[3]; g.beginPath(); g.arc(x0, mid, 9, 0, 7); g.fill(); g.strokeStyle = c.ink; g.lineWidth = 1; g.stroke();
      for (let i = 0; i < H.length && i < pass; i++) {
        const s = strength(i), a = Math.min(1, pass - i), x1 = L + (i + 1) * step - step * 0.5, half = 6 + s * 34;
        g.fillStyle = rgba(c.genus[3], (0.1 + s * 0.65) * a);
        g.fillRect(x0, mid - half, x1 - x0, half * 2);
        x0 = x1;
      }
      // The panes
      H.forEach((f, i) => {
        const x = L + (i + 0.5) * step, frost = 1 - (f.forecast - 0.5) / 0.5, gone = 1 - lift;
        g.globalAlpha = gone; g.fillStyle = rgba(c.graphite, 0.08 + frost * 0.5);
        g.fillRect(x - 11, top, 22, base - top); g.strokeStyle = c.ink; g.lineWidth = 1; g.strokeRect(x - 10.5, top + 0.5, 21, base - top - 1); g.globalAlpha = 1;
        if (lift < 0.05) for (let k = 0; k < 16; k++) { g.fillStyle = rgba(c.plate, 0.5 * (1 - lift)); g.fillRect(x - 9 + ((k * 7) % 18), top + 6 + ((k * 37) % (base - top - 12)), 1.5, 1.5); }
        label(g, `${f.h}`, x, base + 18, { size: 11.5, color: c.graphite, align: 'center' });
      });
      bench(g, c, L, R, base + 4);
      label(g, 'Days ahead', R, base + 34, { size: 11.5, color: c.graphite, align: 'right' });

      // The numbers
      const cy0 = base + 40, Y = (v: number) => chart - ((v - 0.6) / 0.32) * (chart - cy0), X = (i: number) => L + (i + 0.5) * step;
      for (const v of [0.7, 0.8, 0.9]) { g.strokeStyle = c.contour; g.beginPath(); g.moveTo(L, Y(v)); g.lineTo(R, Y(v)); g.stroke(); label(g, `${v}`, L - 6, Y(v) + 4, { size: 11, color: c.graphite, align: 'right' }); }
      const series = (key: 'forecast' | 'climatology' | 'oracle', color: string, to: number, width: number) => {
        g.strokeStyle = color; g.lineWidth = width; g.beginPath();
        H.forEach((f, i) => { if (i > to) return; const x = X(i), y = Y(f[key]); if (i) g.lineTo(x, y); else g.moveTo(x, y); });
        g.stroke();
      };
      series('climatology', c.graphite, 7, 1.25);
      series('forecast', c.hazard, pass - 1, 2);
      if (lift > 0) { g.globalAlpha = lift; series('oracle', c.genus[3], 7, 2); g.globalAlpha = 1; }
      label(g, 'Calendar alone', R, Y(H[6].climatology) + 15, { size: 11.5, color: c.graphite, align: 'right' });
      if (pass >= 2) label(g, `${H[0].forecast}`, X(0), Y(H[0].forecast) - 8, { size: 12, weight: 500, color: c.hazard, align: 'center' });
      if (pass >= 2) label(g, `${H[1].forecast}`, X(1), Y(H[1].forecast) - 8, { size: 12, weight: 500, color: c.hazard, align: 'center' });
      if (lift > 0) label(g, `${H[6].oracle}: the weather known in advance`, R, Y(H[6].oracle) - 8, { size: 12, weight: 500, color: c.ink, align: 'right', a: lift });
      const k = Math.max(0, Math.min(H.length - 1, Math.ceil(pass) - 1));
      readout(`${H[k].h} day${H[k].h > 1 ? 's' : ''} ahead: AUC ${H[k].forecast}\ncalendar alone ${H[k].climatology}`);
    },
  };
}
