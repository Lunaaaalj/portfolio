// Fig. 3. The strip-chart recorder. Six yearly rolls feed one pen; the 2020 roll is torn out
// because it has no ozone for seven stations. Three real stretches of the raw hourly readings then
// run on the paper: a sensor pinned at its ceiling, the logger's missing code, which drops the pen
// off the paper, and ozone with short gaps, ruled across, beside a long one, left open. The high
// peaks of the last strip are real ozone and are kept.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, label, lerp, seg } from '../draw';

const { saturated: A, code: B, gaps: C } = story.strip;
const ROLLS: [string, string][] = [['2020', 'no ozone'], ['2021', ''], ['2022', ''], ['2023', ''], ['2024', 'CO (ppm)'], ['2025', 'date, 15 stations']];

type Box = { x: number; y: number; w: number; h: number };
const paper = (g: CanvasRenderingContext2D, c: { rule: string; plate: string; contour: string }, b: Box, a: number) => {
  g.globalAlpha = a; g.fillStyle = c.plate; g.fillRect(b.x, b.y, b.w, b.h);
  g.strokeStyle = c.rule; g.lineWidth = 1; g.beginPath();
  for (let i = 1; i < 12; i++) { const x = b.x + (b.w * i) / 12; g.moveTo(x, b.y); g.lineTo(x, b.y + b.h); }
  for (let i = 1; i < 4; i++) { const y = b.y + (b.h * i) / 4; g.moveTo(b.x, y); g.lineTo(b.x + b.w, y); }
  g.stroke(); g.strokeStyle = c.contour; g.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1); g.globalAlpha = 1;
};

/** A trace as runs of finite values, up to `to` of its length. */
function trace(g: CanvasRenderingContext2D, ys: (number | null)[], b: Box, top: number, to: number, skip: (v: number) => boolean) {
  const n = ys.length, end = to * (n - 1);
  g.beginPath(); let pen = false;
  for (let i = 0; i < n && i <= end; i++) {
    const v = ys[i];
    if (v === null || skip(v)) { pen = false; continue; }
    const x = b.x + (i / (n - 1)) * b.w, y = b.y + b.h - (Math.min(v, top) / top) * b.h;
    if (pen) g.lineTo(x, y); else g.moveTo(x, y);
    pen = true;
  }
  g.stroke();
}

export default function recorder(): Scene {
  let bx: Box[] = [], rollY = 0, L = 0, W = 0, wide = true;
  return {
    layout({ w, h }) {
      wide = w > 620; L = 18; W = w - 36; rollY = 96;
      const top = 176, gap = 40, H = (h - top - 34 - gap * 2) / 3;
      bx = [0, 1, 2].map((i) => ({ x: L, y: top + i * (H + gap), w: W, h: H }));
    },
    draw({ g, c, readout }, p) {
      const rolls = ease(seg(p, 0, 0.1)), torn = ease(seg(p, 0.1, 0.18));
      // The rolls
      ROLLS.forEach(([yr, note], i) => {
        const x = L + 26 + (i * Math.min(W - 52, wide ? W * 0.66 : W - 52)) / 5, off = i === 0 ? torn : 0, y = rollY + off * 18;
        g.globalAlpha = rolls * (1 - 0.72 * off);
        g.beginPath(); g.ellipse(x, y, 19, 19, 0, 0, 7); g.fillStyle = c.plate; g.fill(); g.strokeStyle = c.ink; g.lineWidth = 1; g.stroke();
        g.beginPath(); g.ellipse(x, y, 7, 7, 0, 0, 7); g.stroke();
        g.globalAlpha = 1;
        label(g, yr, x, y - 26, { size: 11.5, weight: 500, color: i === 0 && off > 0.5 ? c.hazard : c.ink, align: 'center', a: rolls });
        if (note && wide) label(g, note, x, y + 33, { size: 10.5, color: c.graphite, align: 'center', a: rolls * seg(p, 0.08, 0.14) });
        if (i === 0 && off > 0) {
          g.strokeStyle = c.hazard; g.lineWidth = 1.5; g.globalAlpha = off;
          g.beginPath(); g.moveTo(x - 15, y - 15); g.lineTo(x + 15, y + 15); g.moveTo(x + 15, y - 15); g.lineTo(x - 15, y + 15); g.stroke(); g.globalAlpha = 1;
        }
      });

      // Strip 1: the sensor pinned at its ceiling
      const a1 = seg(p, 0.2, 0.42), cut1 = ease(seg(p, 0.42, 0.48));
      const a2 = seg(p, 0.48, 0.64), cut2 = ease(seg(p, 0.64, 0.7));
      const a3 = seg(p, 0.7, 0.88), rule3 = ease(seg(p, 0.88, 0.95));
      const ink = c.ink;
      if (p > 0.18) {
        const b = bx[0], top = 1040;
        paper(g, c, b, ease(seg(p, 0.18, 0.22)));
        label(g, `${A.variable}, station ${A.station}, from ${A.from}. µg/m³`, b.x, b.y - 8, { size: 11.5, color: c.graphite });
        g.strokeStyle = ink; g.lineWidth = 1.25;
        trace(g, A.y, b, top, a1, (v) => cut1 > 0.5 && v >= 999);
        let first = true;
        A.y.forEach((v, i) => { if (v !== null && v >= 999 && i / (A.y.length - 1) <= a1) {
          const x = b.x + (i / (A.y.length - 1)) * b.w, y = b.y + b.h - (v / top) * b.h;
          g.fillStyle = c.hazard; g.fillRect(x - 2, y - 2, 4, 4);
          if (cut1 > 0 && first) label(g, 'pinned at 1,000: cut', x + 14, y + 12, { size: 11.5, color: c.hazard, a: cut1 });
          first = false;
        } });
      }
      // Strip 2: the logger's code
      if (p > 0.46) {
        const b = bx[1], ok = B.y.filter((v): v is number => v !== null && v > -9000), hi = Math.max(...ok) * 1.2;
        paper(g, c, b, ease(seg(p, 0.46, 0.5)));
        label(g, `${B.variable}, station ${B.station}, from ${B.from}`, b.x, b.y - 8, { size: 11.5, color: c.graphite });
        g.strokeStyle = ink; g.lineWidth = 1.25;
        trace(g, B.y, b, hi, a2, (v) => v < -9000);
        B.y.forEach((v, i) => { if (v !== null && v < -9000 && i / (B.y.length - 1) <= a2) {
          const x = b.x + (i / (B.y.length - 1)) * b.w;
          g.strokeStyle = c.hazard; g.lineWidth = 1.5; g.globalAlpha = 1 - 0.6 * cut2;
          g.beginPath(); g.moveTo(x, b.y + b.h * 0.3); g.lineTo(x, b.y + b.h + 14); g.stroke(); g.globalAlpha = 1;
          label(g, '−9999: the logger’s code for no reading', Math.min(x + 8, b.x + b.w - 240), b.y + b.h + 14, { size: 11.5, color: c.hazard, a: ease(seg(p, 0.58, 0.64)) });
        } });
      }
      // Strip 3: ozone, its gaps, and its peaks
      if (p > 0.68) {
        const b = bx[2], top = Math.max(...C.raw.filter((v): v is number => v !== null)) * 1.1, n = C.raw.length;
        paper(g, c, b, ease(seg(p, 0.68, 0.72)));
        label(g, `${C.variable}, station ${C.station}, from ${C.from}. ppb`, b.x, b.y - 8, { size: 11.5, color: c.graphite });
        if (rule3 > 0) {
          g.strokeStyle = c.survey; g.lineWidth = 1.5; g.setLineDash([3, 3]); g.globalAlpha = rule3;
          for (let i = 1; i < n; i++) if ((C.raw[i] === null || C.raw[i - 1] === null) && C.clean[i] !== null && C.clean[i - 1] !== null) {
            const X = (k: number) => b.x + (k / (n - 1)) * b.w, Y = (v: number) => b.y + b.h - (v / top) * b.h;
            g.beginPath(); g.moveTo(X(i - 1), Y(C.clean[i - 1]!)); g.lineTo(X(i), Y(lerp(C.clean[i - 1]!, C.clean[i]!, rule3))); g.stroke();
          }
          g.setLineDash([]); g.globalAlpha = 1;
        }
        g.strokeStyle = ink; g.lineWidth = 1.25;
        trace(g, C.raw, b, top, a3, () => false);
        if (rule3 > 0) {
          // The first long gap, named; it stays open
          let s0 = -1;
          for (let i = 0, run = 0; i < n; i++) { run = C.clean[i] === null ? run + 1 : 0; if (run === 1) s0 = i; if (run >= 6) break; }
          if (s0 >= 0) label(g, 'long gap: left open', b.x + (s0 / (n - 1)) * b.w, b.y + 16, { size: 11.5, color: c.graphite, a: rule3 });
          const peak = C.raw.reduce<number>((m, v, i) => ((v ?? 0) > (C.raw[m] ?? 0) ? i : m), 0);
          label(g, 'real peak: kept', b.x + (peak / (n - 1)) * b.w + 8, b.y + b.h - ((C.raw[peak] as number) / top) * b.h + 30, { size: 11.5, color: c.ink, a: rule3 });
        }
      }
      const lines = ['640,583 station-hours'];
      if (p > 0.42) lines.push('removed: under 0.02% of cells');
      if (p > 0.9) lines.push('bridged: 1.66% of cells');
      readout(lines.join('\n'));
    },
  };
}
