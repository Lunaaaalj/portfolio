// Fig. 8. The marionette. Factor analysis says that the thirteen daily summaries move because
// three hidden things move, x = Λf + ε, so that is what is built: thirteen dials hang by strings
// from three hands. A string's thickness is the loading, the same factor's strings share a colour,
// and a dashed string pulls the other way. What a dial does beyond its strings is its own tremble,
// sized by its uniqueness. Rotation is a true rigid rotation of the loadings, from the project's
// solution in principal-axis form to its rotated form, turned here by Rodrigues' formula: the
// strings change, and every dial's communality stays exactly where it was. The motion of the
// hands is illustrative, seeded; the loadings and uniquenesses are the project's.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { clamp, easeInOut, ease, label, seg } from '../draw';
import { bench } from './apparatus';

const F = story.factors, Q = 3;
const NAMES: Record<string, string> = {
  TOUT_max: 'Max. temp.', SR_acum: 'Sun', RH_media: 'Humidity', NO_06_09: 'NO', NO2_06_09: 'NO₂', CO_06_09: 'CO',
  PM10_media: 'PM₁₀', SO2_media: 'SO₂', WSR_media: 'Wind', WSR_min: 'Min. wind', viento_u_media: 'Wind E–W', PRS_media: 'Pressure', viento_v_media: 'Wind N–S',
};
// Dials in the order of the hand that ends up holding them, so that the strings end up straight.
const ORDER = ['NO_06_09', 'NO2_06_09', 'PM10_media', 'CO_06_09', 'SO2_media', 'WSR_media', 'WSR_min', 'viento_u_media', 'TOUT_max', 'SR_acum', 'RH_media', 'PRS_media', 'viento_v_media'];
const idx = ORDER.map((n) => F.variables.indexOf(n));
const L0 = idx.map((i) => F.unrotated[i] as number[]), h2 = idx.map((i) => F.communality[i] as number);
const PRESSURE = ORDER.indexOf('PRS_media');

// Axis and angle of the rotation
const T = F.rotation as number[][];
const theta = Math.acos(clamp((T[0][0] + T[1][1] + T[2][2] - 1) / 2, -1, 1));
const n = (() => {
  const v = [T[1][2] - T[2][1], T[2][0] - T[0][2], T[0][1] - T[1][0]], s = Math.hypot(...v) || 1;
  return v.map((x) => x / s);
})();
/** Column-acting rotation by angle t about the axis: at t = theta, L0 · R(t) is the rotated solution. */
function rot(t: number) {
  const c = Math.cos(t), s = Math.sin(t), C = 1 - c, [x, y, z] = n;
  return [
    [c + x * x * C, x * y * C + z * s, x * z * C - y * s],
    [y * x * C - z * s, c + y * y * C, y * z * C + x * s],
    [z * x * C + y * s, z * y * C - x * s, c + z * z * C],
  ];
}
const times = (A: number[][], R: number[][]) => A.map((row) => R[0].map((_, j) => row.reduce((s, v, k) => s + v * R[k][j], 0)));

// Seeded sums of sines, so that scrolling back rewinds the motion exactly
const wave = (p: number, seed: number) => (Math.sin(p * 31 + seed) + 0.6 * Math.sin(p * 53 + seed * 2.3) + 0.4 * Math.sin(p * 83 + seed * 3.7)) / 1.4;

export default function marionette(): Scene {
  let hx: number[] = [], hy = 0, barY = 0, gx: number[] = [], gy: number[] = [], R = 0, wide = true;
  return {
    layout({ w, h }) {
      wide = w > 620;
      hy = wide ? 118 : 142; barY = hy - (wide ? 44 : 34);
      hx = [0.17, 0.44, 0.71].map((f) => w * f);
      const rows = wide ? 1 : 2, each = Math.ceil(ORDER.length / rows);
      R = Math.min(wide ? 24 : 21, ((w - 28) / each) * 0.42);
      gx = ORDER.map((_, i) => {
        const r = rows === 1 ? 0 : i >= each ? 1 : 0, k = i - r * each, cnt = r ? ORDER.length - each : each;
        return 14 + (w - 28) * ((k + 0.5) / cnt);
      });
      gy = ORDER.map((_, i) => (rows === 1 ? h - 96 : i >= each ? h - 62 : h - 62 - (R + 62)));
    },
    draw({ g, c, readout, h, w }, p) {
      const strings = ease(seg(p, 0.2, 0.32)), turn = easeInOut(seg(p, 0.42, 0.68)), named = ease(seg(p, 0.62, 0.72));
      const press = seg(p, 0.72, 0.76) * (1 - seg(p, 0.86, 0.9)), year = ease(seg(p, 0.88, 0.96));
      const L = times(L0, rot(theta * turn));
      const hue = [c.ink, c.survey, c.genus[3]];
      const f = [wave(p, 1.1), wave(p, 2.9), wave(p, 4.7)];

      // The hands' bar
      if (strings > 0) {
        g.strokeStyle = c.ink; g.lineWidth = 1; g.globalAlpha = strings;
        g.beginPath(); g.moveTo(hx[0] - 22, barY + 0.5); g.lineTo(hx[2] + 22, barY + 0.5); g.stroke();
        for (let x = hx[0] - 22; x < hx[2] + 22; x += 7) { g.beginPath(); g.moveTo(x + 6, barY - 6); g.lineTo(x, barY); g.strokeStyle = c.contour; g.stroke(); }
        g.globalAlpha = 1;
      }

      // Strings, thin first
      const segs: { i: number; k: number; v: number }[] = [];
      for (let i = 0; i < ORDER.length; i++) for (let k = 0; k < Q; k++) segs.push({ i, k, v: L[i][k] });
      segs.sort((a, b) => Math.abs(a.v) - Math.abs(b.v));
      if (strings > 0) for (const { i, k, v } of segs) {
        const m = Math.abs(v); if (m < 0.04) continue;
        const dim = i === PRESSURE ? 1 : 1 - 0.8 * press;
        g.strokeStyle = hue[k]; g.globalAlpha = strings * dim * clamp(0.16 + m * 1.1);
        g.lineWidth = 0.4 + m * 4.6;
        g.setLineDash(v < 0 ? [5, 4] : []);
        const y0 = hy + f[k] * 11, x1 = gx[i], y1 = gy[i] - R - 2, sag = (1 - clamp(m * 2)) * 36;
        g.beginPath(); g.moveTo(hx[k], y0); g.quadraticCurveTo((hx[k] + x1) / 2, (y0 + y1) / 2 + sag, x1, y1); g.stroke();
        g.setLineDash([]); g.globalAlpha = 1;
      }

      // The hands
      if (strings > 0) for (let k = 0; k < Q; k++) {
        const y = hy + f[k] * 11;
        g.globalAlpha = strings; g.strokeStyle = c.ink; g.lineWidth = 1;
        g.beginPath(); g.moveTo(hx[k], barY + 1); g.lineTo(hx[k], y - 9); g.stroke();
        g.beginPath(); g.arc(hx[k], y, 9, 0, 7); g.fillStyle = c.plate; g.fill(); g.lineWidth = 2; g.strokeStyle = hue[k]; g.stroke();
        g.globalAlpha = 1;
        const name = ['Combustion', 'Ventilation', 'Forcing'][k];
        label(g, name, hx[k], barY - 16, { size: wide ? 12.5 : 11, weight: 500, color: c.ink, align: 'center', a: named });
        if (turn < 0.05) label(g, `Hand ${k + 1}`, hx[k], barY - 16, { size: 12, color: c.graphite, align: 'center', a: strings * (1 - turn * 20) });
        if (year > 0) label(g, `2025: ${story.facts.tucker[k].toFixed(3)}`, hx[k], barY - 30, { size: 11.5, color: c.graphite, align: 'center', a: year });
      }

      // The dials
      for (let i = 0; i < ORDER.length; i++) {
        const x = gx[i], y = gy[i], uniq = Math.sqrt(Math.max(0, 1 - h2[i]));
        const common = L[i][0] * f[0] + L[i][1] * f[1] + L[i][2] * f[2];
        const own = uniq * wave(p * 1.7, 7 + i * 1.9);
        const a = (-90 + clamp(common + own, -1.3, 1.3) * 48) * (Math.PI / 180);
        const dim = i === PRESSURE ? 1 : 1 - 0.7 * press;
        g.globalAlpha = dim;
        g.beginPath(); g.arc(x, y, R, Math.PI, 0); g.closePath(); g.fillStyle = c.plate; g.fill();
        g.strokeStyle = c.ink; g.lineWidth = 1; g.stroke();
        g.strokeStyle = c.graphite; g.beginPath();
        for (let t = -60; t <= 60; t += 20) {
          const b = (t - 90) * (Math.PI / 180);
          g.moveTo(x + Math.cos(b) * (R - 4), y + Math.sin(b) * (R - 4)); g.lineTo(x + Math.cos(b) * R, y + Math.sin(b) * R);
        }
        g.stroke();
        g.strokeStyle = c.hazard; g.lineWidth = 1.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * (R - 3), y + Math.sin(a) * (R - 3)); g.stroke();
        g.globalAlpha = 1;
        { // A patch of plate, so that the strings of the row above do not run through the name
          g.font = `400 ${R < 17 ? 9.5 : 10.5}px "IBM Plex Sans", system-ui, sans-serif`;
          const tw = g.measureText(NAMES[ORDER[i]]).width + 4;
          g.fillStyle = c.plate; g.fillRect(x - tw / 2, y + 4, tw, 14);
        }
        label(g, NAMES[ORDER[i]], x, y + 15, { size: R < 17 ? 9.5 : 10.5, color: i === PRESSURE && press > 0 ? c.ink : c.graphite, weight: i === PRESSURE && press > 0 ? 500 : 400, align: 'center', a: dim });
      }
      if (wide) bench(g, c, 14, w - 14, h - 62);

      const deg = Math.round((theta * turn * 180) / Math.PI);
      const lines = [`rotation ${deg}°`];
      if (strings > 0.5) lines.push('shared variance 40.3%');
      if (press > 0.5) lines.push(`pressure: communality ${h2[PRESSURE].toFixed(2)}`);
      if (year > 0.5) lines[lines.length - 1] = 'congruence in 2025 under each hand';
      readout(lines.join('\n'));
    },
  };
}
