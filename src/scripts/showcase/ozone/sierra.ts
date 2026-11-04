// Fig. 11. The foot of the sierra. The valley again, with a bar on each station for its share of
// valid days above 51 ppb, the real rates. Particles driven from the east pile against the rising
// ground: illustrative, and the mechanism the report offers rather than one it measured. An inset
// sets each rate against its station's elevation, r = 0.83 over 15 stations.

import story from '../../../data/ozone-story.json';
import type { Scene } from '../engine';
import { ease, label, rgba, seg } from '../draw';
import { rng } from '../../../lib/tile';
import { drawSection, groundAt, section, stations, type Section } from './section';

const r = rng(7), N = 420;
const dust = Array.from({ length: N }, () => ({ x: r(), y: r(), s: 0.6 + r() * 0.9, a: r() * 6.28, h: r() }));
const FOOT = 100.5;

export default function sierra(): Scene {
  let s: Section, wide = true, ins = { x: 0, y: 0, w: 0, h: 0 };
  return {
    layout({ w, h }) {
      wide = w > 700;
      s = section(18, w - 18, Math.max(100, h * 0.2), h - 88);
      ins = { x: wide ? w - 230 : w - 150, y: 98, w: wide ? 196 : 124, h: wide ? 120 : 84 };
    },
    draw({ g, c, readout, h }, p) {
      const bars = ease(seg(p, 0.04, 0.3)), wind = seg(p, 0.3, 0.72), insetA = ease(seg(p, 0.72, 0.82));
      drawSection(g, c, s);
      const span = s.right - s.left, stop = s.X(FOOT);
      for (const k of dust) {
        const start = s.left + span * (0.25 + k.x * 0.75), reach = stop + k.h * span * 0.2;
        const x = Math.max(reach, start - wind * span * k.s);
        const ground = groundAt(s, x), lift = 8 + k.y * 56 * (1 - 0.6 * seg(start - x, 0, span * 0.5)), y = ground - lift + Math.sin(p * 30 + k.a) * 3;
        g.fillStyle = rgba(c.ink, 0.5); g.fillRect(x, y, 2.2, 2.2);
      }
      for (const st of stations) {
        const x = s.X(st.lon), y = s.G(st.msnm), H = st.rate * (h * 0.38) * bars;
        g.fillStyle = st.zone === 'Noroeste' || st.zone === 'Suroeste' ? c.hazard : st.zone === 'Noreste' ? c.ramp[2] : c.ramp[3];
        g.globalAlpha = 0.9; g.fillRect(x - 4, y - H, 8, H); g.globalAlpha = 1;
        g.beginPath(); g.arc(x, y, 2.2, 0, 7); g.fillStyle = c.plate; g.fill(); g.strokeStyle = c.ink; g.lineWidth = 1; g.stroke();
      }
      label(g, 'Wind from the east', s.right - 4, s.top - 10, { size: 12, color: c.survey, align: 'right', a: ease(seg(p, 0.3, 0.36)) * (1 - insetA) });

      if (insetA > 0) {
        const lo = 300, hi = 720, rm = 0.55, X = (m: number) => ins.x + ((m - lo) / (hi - lo)) * ins.w, Y = (t: number) => ins.y + ins.h - (t / rm) * ins.h;
        g.globalAlpha = insetA; g.fillStyle = c.plate; g.fillRect(ins.x - 8, ins.y - 8, ins.w + 16, ins.h + 34);
        g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(ins.x, ins.y); g.lineTo(ins.x, ins.y + ins.h); g.lineTo(ins.x + ins.w, ins.y + ins.h); g.stroke();
        for (const st of stations) { g.fillStyle = c.ink; g.beginPath(); g.arc(X(st.msnm), Y(st.rate), 2.6, 0, 7); g.fill(); }
        g.globalAlpha = 1;
        label(g, `Elevation, ${lo}–${hi} m. r = ${story.facts.elevationCorr}`, ins.x, ins.y + ins.h + 16, { size: wide ? 11 : 9.5, color: c.graphite, a: insetA });
      }
      label(g, 'Bars: days over 51 ppb', 18, h - 30, { size: 12, color: c.graphite });
      const nw = stations.filter((x) => x.zone === 'Noroeste').reduce((m, x) => m + x.rate, 0) / 3;
      const ne = stations.filter((x) => x.zone === 'Noreste').reduce((m, x) => m + x.rate, 0) / 3;
      readout(`mean of stations, Northwest ${(nw * 100).toFixed(1)}%\nNortheast ${(ne * 100).toFixed(1)}%${p > 0.72 ? '\nodds, same conditions: × 3.84' : ''}`);
    },
  };
}
