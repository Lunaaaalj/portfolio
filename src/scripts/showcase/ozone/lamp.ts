// Fig. 7. The lamp. 900 fitting days in three strongly correlated summaries, in standard units. A
// shadow on a wall keeps one number per day; principal components is the search for the lamp whose
// shadow is longest, that is, whose projection has the largest variance. The covariance and its
// eigenvectors are computed here. The lamp starts on the third eigenvector and is carried on to
// the first; the bar at the foot is every day's shadow and the readout the share of the variance.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { easeInOut, ease, label, rgba, seg } from '../draw';
import { bench } from './apparatus';

type V = [number, number, number];
const P = story.lamp.points as V[];
const dot = (a: V, b: V) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (a: V): V => { const n = Math.hypot(...a) || 1; return [a[0] / n, a[1] / n, a[2] / n]; };
const mean = [0, 1, 2].map((k) => P.reduce((s, q) => s + q[k], 0) / P.length) as V;
const Q = P.map((q) => [q[0] - mean[0], q[1] - mean[1], q[2] - mean[2]] as V);
const C = [0, 1, 2].map((i) => [0, 1, 2].map((j) => Q.reduce((s, q) => s + q[i] * q[j], 0) / Q.length));
const mul = (M: number[][], v: V): V => [dot(M[0] as V, v), dot(M[1] as V, v), dot(M[2] as V, v)];
function power(M: number[][]): [V, number] {
  let v = unit([1, 0.7, 0.4]);
  for (let i = 0; i < 300; i++) v = unit(mul(M, v));
  return [v, dot(v, mul(M, v))];
}
const [e1, l1] = power(C);
const D1 = C.map((r, i) => r.map((x, j) => x - l1 * e1[i] * e1[j]));
const [e2, l2] = power(D1);
const D2 = D1.map((r, i) => r.map((x, j) => x - l2 * e2[i] * e2[j]));
const [e3Raw, l3] = power(D2);
const e3 = (dot(e3Raw, e1) >= 0 ? e3Raw : e3Raw.map((x) => -x)) as V;
const TOTAL = l1 + l2 + l3;

export default function lamp(): Scene {
  let cx = 0, cy = 0, S = 0, barY = 0, L = 0, R = 0;
  return {
    layout({ w, h }) { cx = w * 0.5; cy = h * 0.42; S = Math.min(w, h) * 0.1; barY = h - 96; L = 28; R = w - 28; },
    draw({ g, c, readout }, p) {
      const t = easeInOut(seg(p, 0.14, 0.7)), share = ease(seg(p, 0.76, 0.88));
      // The direction, carried from the third eigenvector to the first along the great circle
      const ang = t * Math.PI / 2, u = unit([0, 1, 2].map((k) => Math.cos(ang) * e3[k] + Math.sin(ang) * e1[k]) as V);
      const yaw = 0.7 + p * 1.1, pitch = 0.42, cy1 = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const proj = (v: V) => { const x = v[0] * cy1 - v[2] * sy, z = v[0] * sy + v[2] * cy1, y = v[1] * cp - z * sp; return [cx + x * S, cy - y * S]; };

      // Axes
      g.strokeStyle = c.contour; g.lineWidth = 1;
      ([[3.2, 0, 0], [0, 3.2, 0], [0, 0, 3.2]] as V[]).forEach((e, i) => {
        const a = proj([-e[0], -e[1], -e[2]]), b = proj(e);
        g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
        label(g, story.lamp.names[i], b[0] + 5, b[1] - 3, { size: 11, color: c.graphite });
      });
      // The cloud
      g.fillStyle = rgba(c.ramp[3], 0.55);
      for (const q of Q) { const [x, y] = proj(q); g.fillRect(x - 1.2, y - 1.2, 2.4, 2.4); }
      // The beam of the lamp, and the lamp
      const a = proj([-u[0] * 4, -u[1] * 4, -u[2] * 4]), b = proj([u[0] * 4, u[1] * 4, u[2] * 4]);
      g.strokeStyle = c.hazard; g.lineWidth = 1.5; g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
      g.fillStyle = c.plate; g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.arc(b[0], b[1], 7, 0, 7); g.fill(); g.stroke();

      // The shadow on the wall
      const scale = (R - L) / 10, x0 = (L + R) / 2, s = Q.map((q) => dot(q, u));
      const v = s.reduce((m, x) => m + x * x, 0) / s.length;
      bench(g, c, L, R, barY + 26);
      g.fillStyle = rgba(c.ink, 0.14);
      for (const x of s) g.fillRect(x0 + x * scale - 0.5, barY, 1, 20);
      const sd = Math.sqrt(v) * scale;
      g.strokeStyle = c.hazard; g.lineWidth = 2; g.beginPath(); g.moveTo(x0 - sd * 2, barY - 8); g.lineTo(x0 + sd * 2, barY - 8); g.stroke();
      label(g, 'Shadow of every day on the wall', L, barY + 48, { size: 12, color: c.graphite });

      if (share > 0) {
        const parts: [string, number][] = [['26.1', 26.1], ['19.8', 19.8], ['10.0', 10]];
        let x = L; const W = Math.min(R - L, 420), y = 84;
        parts.forEach(([t2, n], i) => {
          const wd = (n / 100) * W;
          g.fillStyle = rgba(c.ramp[3 - i], share); g.fillRect(x, y, wd - 1, 15);
          label(g, `${t2}%`, x + 3, y + 28, { size: 11, color: c.graphite, a: share });
          x += wd;
        });
        g.strokeStyle = c.ink; g.lineWidth = 1; g.globalAlpha = share; g.strokeRect(L + 0.5, y + 0.5, W - 1, 14); g.globalAlpha = 1;
        label(g, 'All 15 variables: three axes, 55.9%', L, y - 8, { size: 12, weight: 500, color: c.ink, a: share });
      }
      readout(`shadow holds ${((v / TOTAL) * 100).toFixed(1)}% of the variance\nof these three summaries`);
    },
  };
}
