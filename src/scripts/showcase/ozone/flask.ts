// Fig. 1. The flask. Illustrative, seeded: a glass chamber in which precursors drift, and ozone
// appears only once there is heat and light. Nothing puts ozone into the flask from outside. The
// third ingredient is drawn as hollow, dotted ghosts, because the network does not measure it.
// Each particle's path is a sum of sines of the scroll, so scrolling back rewinds it exactly.

import type { Scene } from '../engine';
import { ease, label, rgba, seg } from '../draw';
import { rng } from '../../../lib/tile';
import { bench } from './apparatus';

const r = rng(42), N = 92, G = 44;
const seeds = (n: number) => Array.from({ length: n }, () => ({ x: r(), y: r(), a: r() * 6.28, b: r() * 6.28, s: 0.5 + r(), at: 0.3 + r() * 0.34 }));
const nox = seeds(N), ghosts = seeds(G);

export default function flask(): Scene {
  let cx = 0, cy = 0, R = 0, neckW = 0, neckY = 0, ground = 0;
  const inside = (u: number, v: number): [number, number] => {
    const t = u * 6.283, q = Math.sqrt(v) * (R - 12);
    return [cx + Math.cos(t) * q, cy + Math.sin(t) * q];
  };
  return {
    layout({ w, h }) {
      ground = h - 62;
      R = Math.min(w * 0.33, (ground - 150) / 2.1);
      cx = w * 0.46; cy = ground - R - 16; neckW = R * 0.32; neckY = cy - R * 1.32;
    },
    draw({ g, c, readout, w }, p) {
      const lamp = ease(seg(p, 0.24, 0.36)), reveal = ease(seg(p, 0.68, 0.76));
      // The lamp and its light
      const lx = Math.min(w - 54, cx + R * 1.5), ly = 132;
      if (lamp > 0) {
        g.fillStyle = rgba(c.genus[3], 0.09 * lamp);
        g.beginPath(); g.moveTo(lx, ly); g.lineTo(cx - R * 1.05, cy + R * 0.3); g.lineTo(cx + R * 0.7, cy + R * 0.98); g.closePath(); g.fill();
      }
      g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.arc(lx, ly, 15, 0, 7); g.fillStyle = lamp > 0 ? c.genus[3] : c.plate; g.fill(); g.stroke();
      g.beginPath();
      for (let i = 0; i < 12; i++) { const a = (i / 12) * 6.283; g.moveTo(lx + Math.cos(a) * 20, ly + Math.sin(a) * 20); g.lineTo(lx + Math.cos(a) * (20 + 9 * lamp), ly + Math.sin(a) * (20 + 9 * lamp)); }
      g.globalAlpha = lamp; g.stroke(); g.globalAlpha = 1;
      label(g, 'Heat and light', lx, ly + 48, { size: 12, color: c.graphite, align: 'center', a: lamp });

      // Particles
      let ozone = 0;
      for (let i = 0; i < N; i++) {
        const k = nox[i], [x0, y0] = inside(k.x, k.y);
        const x = x0 + Math.sin(p * 21 * k.s + k.a) * 9, y = y0 + Math.cos(p * 17 * k.s + k.b) * 9;
        const t = ease(seg(p, k.at, k.at + 0.08)) * (i % 2 === 0 ? 1 : 0);
        ozone += t >= 1 ? 1 : 0;
        if (t < 1) { g.fillStyle = rgba(c.ink, 1 - t); g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill(); }
        if (t > 0) {
          g.fillStyle = rgba(c.ramp[3], t);
          for (const [dx, dy] of [[-3.4, 1.6], [3.4, 1.6], [0, -3.4]]) { g.beginPath(); g.arc(x + dx * t, y + dy * t, 2.5, 0, 7); g.fill(); }
        }
      }
      g.setLineDash([2, 2.5]); g.lineWidth = 1;
      for (let i = 0; i < G; i++) {
        const k = ghosts[i], [x0, y0] = inside(k.x, k.y);
        const x = x0 + Math.sin(p * 19 * k.s + k.b) * 8, y = y0 + Math.cos(p * 23 * k.s + k.a) * 8;
        g.strokeStyle = reveal > 0 ? c.hazard : rgba(c.graphite, 0.75); g.beginPath(); g.arc(x, y, 4, 0, 7); g.stroke();
      }
      g.setLineDash([]);

      // The flask
      g.strokeStyle = c.ink; g.lineWidth = 1.25; g.beginPath();
      const a0 = Math.asin(neckW / R);
      g.arc(cx, cy, R, -Math.PI / 2 + a0, -Math.PI / 2 - a0 + 6.2832, false);
      g.lineTo(cx - neckW, neckY); g.moveTo(cx + neckW, cy - Math.cos(a0) * R); g.lineTo(cx + neckW, neckY); g.stroke();
      g.beginPath(); g.moveTo(cx - neckW - 5, neckY); g.lineTo(cx + neckW + 5, neckY); g.stroke();
      g.strokeStyle = rgba(c.ink, 0.28); g.beginPath(); g.arc(cx, cy, R - 7, Math.PI * 0.95, Math.PI * 1.32); g.stroke();
      bench(g, c, cx - R * 1.35, cx + R * 1.35, ground);

      // Legend
      const yy = ground + 28, x0 = Math.max(16, cx - R * 1.1), gap = Math.min(150, (w - 32) / 3);
      g.fillStyle = c.ink; g.beginPath(); g.arc(x0, yy - 4, 2.6, 0, 7); g.fill();
      label(g, 'Precursors', x0 + 9, yy, { size: 12, color: c.graphite });
      g.fillStyle = c.ramp[3]; for (const [dx, dy] of [[-3, 1.4], [3, 1.4], [0, -3]]) { g.beginPath(); g.arc(x0 + gap + dx, yy - 4 + dy, 2.2, 0, 7); g.fill(); }
      label(g, 'Ozone', x0 + gap + 10, yy, { size: 12, color: c.graphite });
      g.setLineDash([2, 2.5]); g.strokeStyle = reveal > 0 ? c.hazard : c.graphite; g.beginPath(); g.arc(x0 + gap * 2, yy - 4, 4, 0, 7); g.stroke(); g.setLineDash([]);
      label(g, 'Not measured', x0 + gap * 2 + 10, yy, { size: 12, color: c.graphite });
      readout(`Illustrative\n${ozone > 0 ? 'formed in the flask' : 'nothing formed yet'}`);
    },
  };
}
