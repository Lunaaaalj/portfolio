// Fig. 2. The valley in section, with the 15 SIMA stations as intakes at their real longitude and
// elevation, east to west as the scene runs. The median zonal wind is negative (report, Table of
// quartiles), so the arrows blow from the east. The specimen's station, NO, carries its tag.

import type { Scene } from '../engine';
import { ease, label, rgba, seg } from '../draw';
import { specimen as S, tag } from './apparatus';
import { drawSection, groundAt, section, stations, type Section } from './section';

export default function valley(): Scene {
  let s: Section, wide = true;
  return {
    layout({ w, h }) { wide = w > 620; s = section(18, w - 18, Math.max(86, h * 0.1), h - 92); },
    draw({ g, c, readout, h, w }, p) {
      const draw = seg(p, 0, 0.14), wind = ease(seg(p, 0.62, 0.74)), mark = ease(seg(p, 0.86, 0.94));
      g.save(); g.beginPath(); g.rect(0, 0, w * Math.max(0.02, ease(draw)), h); g.clip(); drawSection(g, c, s); g.restore();

      const east = [...stations].reverse();
      let shown = 0;
      east.forEach((st, i) => {
        const t = ease(seg(p, 0.16 + i * 0.03, 0.2 + i * 0.03)); if (t <= 0) return; shown++;
        const x = s.X(st.lon), y = s.G(st.msnm), top = y - 34 * t;
        g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(x, y); g.lineTo(x, top); g.moveTo(x - 4, top); g.lineTo(x + 4, top); g.stroke();
        g.beginPath(); g.arc(x, y, 2.4, 0, 7); g.fillStyle = c.plate; g.fill(); g.stroke();
        if (wide || i % 2 === 0) label(g, st.code, x, top - 7 - (i % 3) * 14, { size: 11, color: st.code === S.station ? c.ink : c.graphite, weight: st.code === S.station ? 500 : 400, align: 'center', a: t });
      });
      const high = stations[0], low = stations[stations.length - 1];
      label(g, `${high.msnm} m`, s.X(high.lon) - 8, s.G(high.msnm) + 34, { size: 11.5, color: c.ink, a: ease(seg(p, 0.6, 0.66)) });
      label(g, `${stations.reduce((m, x) => (x.msnm < m.msnm ? x : m)).msnm} m`, s.X(low.lon), s.G(low.msnm) + 34, { size: 11.5, color: c.ink, align: 'right', a: ease(seg(p, 0.6, 0.66)) });
      label(g, 'West', s.left, h - 30, { size: 12, color: c.graphite });
      label(g, 'East', s.right, h - 30, { size: 12, color: c.graphite, align: 'right' });
      label(g, 'Sierra, schematic', s.X(100.66) + 8, s.top + 8, { size: 11, color: c.graphite });

      if (wind > 0) for (let i = 0; i < 9; i++) {
        const y = s.top + 30 + (i % 3) * 30, span = s.right - s.left, x = s.right - 30 - ((i * 0.11 + p * 2.2) % 1) * span * 0.86;
        if (groundAt(s, x) < y + 12) continue;
        g.strokeStyle = rgba(c.survey, 0.8 * wind); g.lineWidth = 1.25; g.beginPath(); g.moveTo(x + 34, y); g.lineTo(x, y); g.moveTo(x + 7, y - 4); g.lineTo(x, y); g.lineTo(x + 7, y + 4); g.stroke();
      }
      if (mark > 0) {
        const st = stations.find((x) => x.code === S.station)!;
        g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(s.X(st.lon), s.G(st.msnm) - 40); g.lineTo(s.X(st.lon), s.G(st.msnm) - 112); g.stroke();
        tag(g, c, s.X(st.lon), s.G(st.msnm) - 112, undefined, mark, 1);
      }
      readout(`${shown} of 15 stations`);
    },
  };
}
