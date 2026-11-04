// Fig. 1. Where the data comes from, as a physical thing: reports fall as grains, to scale. First
// over Mexico, on the project's 0.1 degree national cells, at 1,000 reports to the grain; the cut
// keeps the 61 national cells that hold the metropolitan area's reports; the camera closes in on
// them; then the same reports fall again at 50 to the grain on the crossings they name, and pile
// up there. Every position is the project's. Which small crossing receives a grain is sampled
// (scripts/extract-geostats-story.py), so the piles are right to within one grain.

import story from '../../../data/geostats-story.json';
import type { Scene } from '../engine';
import { SANS, clamp, ease, easeInOut, fmt, label, lerp, rgba, seg } from '../draw';
import { arrive, cityGrains, frameCity, type Grain } from './city';

const NATIONAL_GRAIN = 1000;
/** One national cell (0.1 degrees) in the units of the city plane (500 m), near Monterrey. */
const CITY_UNITS_PER_CELL = 21;

export default function reports(): Scene {
  const nat = story.national, nodes = story.nodes, facts = story.facts;
  const zmm = new Set(nat.zmm);

  // Systematic rounding, so that the national grains add up to the total exactly
  let acc = 0;
  const natCount = nat.n.map((n) => { const a = Math.floor(acc / NATIONAL_GRAIN); acc += n; return Math.floor(acc / NATIONAL_GRAIN) - a; });
  const natGrains = arrive(natCount, 42);
  const cityTotal = cityGrains.length;

  let wide = true, grainW = 2, grainH = 1.3, k0 = 1, kc = 1;
  let nx0 = 0, ny0 = 0, fx0 = 0, fy0 = 0, cx = 0, cy = 0, midX = 0, midY = 0;

  return {
    layout({ w, h }) {
      wide = w > 560;
      grainW = wide ? 2.4 : 1.8; grainH = wide ? 1.5 : 1.15;
      const pts = nat.outline.flat();
      const X0 = Math.min(...pts.map((q) => q[0])), X1 = Math.max(...pts.map((q) => q[0]));
      const Y0 = Math.min(...pts.map((q) => q[1])), Y1 = Math.max(...pts.map((q) => q[1]));
      const top = wide ? 88 : 64, bottom = 44, side = 24;
      k0 = Math.min((w - 2 * side) / (X1 - X0), (h - top - bottom) / (Y1 - Y0));
      nx0 = (w - (X1 - X0) * k0) / 2 - X0 * k0;
      ny0 = top + (h - top - bottom + (Y1 - Y0) * k0) / 2 + Y0 * k0;
      fx0 = nx0 + nat.focus[0] * k0; fy0 = ny0 - nat.focus[1] * k0;
      ({ k: kc, cx, cy, midX, midY } = frameCity(w, h));
    },
    draw({ g, c, readout, w, h }, p) {
      const rain = seg(p, 0.03, 0.3), cut = ease(seg(p, 0.33, 0.43));
      const z = easeInOut(seg(p, 0.44, 0.6)), city = seg(p, 0.56, 0.87), mark = ease(seg(p, 0.89, 0.96));

      // One camera: geometric zoom on the focus, which slides to the centre of the frame
      const F = (CITY_UNITS_PER_CELL * kc) / k0;
      const kn = k0 * Math.pow(F, z), scale = kc * Math.pow(F, z - 1);
      const px = lerp(fx0, midX, z), py = lerp(fy0, midY, z);
      const NX = (i: number) => px + (i - nat.focus[0]) * kn, NY = (j: number) => py - (j - nat.focus[1]) * kn;
      const CX = (x: number) => px + (x - cx) * scale, CY = (y: number) => py - (y - cy) * scale;
      // The rest of the country fades first; the metropolitan piles stay in view as the camera
      // closes in, then come apart as the city's own grains take over
      const nA = 1 - seg(z, 0.02, 0.4), zA = 1 - seg(z, 0.5, 0.78), cA = seg(z, 0.45, 0.8), pile = 1 - seg(z, 0.25, 0.65);

      if (zA > 0) {
        g.globalAlpha = nA; g.strokeStyle = c.contour; g.lineWidth = 1;
        const path = new Path2D();
        for (const ring of nat.outline) ring.forEach(([i, j], q) => { q ? path.lineTo(NX(i), NY(j)) : path.moveTo(NX(i), NY(j)); });
        path.closePath(); g.stroke(path);

        const drop = (o: Grain) => seg(rain, o.at * 0.84, o.at * 0.84 + 0.16);
        const paint = (keep: boolean, fill: string, a: number) => {
          g.fillStyle = fill; g.globalAlpha = a;
          for (const o of natGrains) {
            if (zmm.has(o.site) !== keep) continue;
            const t = drop(o);
            if (t <= 0) continue;
            const x = NX(nat.i[o.site]), y = NY(nat.j[o.site]) - o.stack * grainH * pile;
            g.fillRect(x - grainW / 2, y - (y + 12) * (1 - t * t), grainW, grainH - 0.2);
          }
        };
        paint(false, c.graphite, lerp(0.75, 0.1, cut) * nA);
        paint(true, rain >= 1 ? c.survey : c.graphite, lerp(0.75, 1, cut) * zA);
        g.globalAlpha = 1;
        if (cut > 0 && z < 0.2) label(g, '18 municipalities', fx0 + 26, fy0 - 96, { size: 13, weight: 500, color: c.ink, a: cut * (1 - z * 5) });
      }

      if (cA > 0) {
        g.globalAlpha = cA; g.strokeStyle = rgba(c.contour, 0.7); g.lineWidth = 1;
        const roads = new Path2D();
        for (const [, pts] of story.roads as [string, number[][]][]) pts.forEach(([x, y], q) => { q ? roads.lineTo(CX(x), CY(y)) : roads.moveTo(CX(x), CY(y)); });
        g.stroke(roads);

        g.fillStyle = c.survey; g.globalAlpha = cA * (mark > 0 ? lerp(0.92, 0.72, mark) : 0.92);
        for (const o of cityGrains) {
          const t = seg(city, o.at * 0.86, o.at * 0.86 + 0.14);
          if (t <= 0) continue;
          const x = CX(nodes.x[o.site]), y = CY(nodes.y[o.site]) - o.stack * grainH;
          g.fillRect(x - grainW / 2, y - (y + 12) * (1 - t * t), grainW, grainH - 0.2);
        }
        g.globalAlpha = 1;

        if (mark > 0) {
          // The busiest crossing: nodes are sorted by reports, so it is the first. Its pile is
          // redrawn in ink, and its label sits on a patch of plate, clear of the grains.
          const x = CX(nodes.x[0]), base = CY(nodes.y[0]), top = base - nodes.g[0] * grainH - 3;
          g.fillStyle = c.ink; g.globalAlpha = mark;
          for (let k = 0; k < nodes.g[0]; k++) g.fillRect(x - grainW / 2, base - k * grainH, grainW, grainH - 0.2);
          const name = 'Fray Luis de León × Fidel Velázquez', sub = `${fmt(facts.cruceMayor[2] as number)} reports, San Nicolás`;
          g.font = `500 12px ${SANS}`;
          const tw = g.measureText(name).width, right = x + 34 + tw < w - 16, lx = x + (right ? 34 : -34), ly = Math.max(84, top - 34);
          const tx = clamp(right ? lx + 6 : lx - 6 - tw, 12, w - tw - 12);
          g.fillStyle = rgba(c.plate, 0.9 * mark); g.fillRect(tx - 6, ly - 28, tw + 12, 38);
          g.strokeStyle = c.ink; g.lineWidth = 1;
          g.beginPath(); g.moveTo(x, top); g.lineTo(lx, ly - 9); g.stroke(); g.globalAlpha = 1;
          label(g, name, tx, ly - 13, { size: 12, weight: 500, color: c.ink, a: mark });
          label(g, sub, tx, ly + 3, { size: 12, color: c.graphite, a: mark });
        }

        // Survey furniture: the scale bar, in the plane's true units
        const bar = 10 * scale, bx = 24, by = h - 24;
        if (bar < w * 0.6) {
          g.globalAlpha = cA; g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath();
          g.moveTo(bx, by); g.lineTo(bx + bar, by); g.moveTo(bx, by - 4); g.lineTo(bx, by + 4); g.moveTo(bx + bar, by - 4); g.lineTo(bx + bar, by + 4); g.stroke();
          g.globalAlpha = 1;
          label(g, '5 km', bx + bar + 8, by + 4, { size: 12, color: c.graphite, a: cA });
        }
      }

      const shown = clamp(natGrains.reduce((s, o) => s + +(seg(rain, o.at * 0.84, o.at * 0.84 + 0.16) >= 1), 0) / natGrains.length);
      const fallen = cityGrains.reduce((s, o) => s + +(seg(city, o.at * 0.86, o.at * 0.86 + 0.14) >= 1), 0);
      if (city > 0) readout(`${fmt(Math.round((fallen / cityTotal) * facts.zmm))} of ${fmt(facts.zmm)} reports\n${fmt(facts.cruces)} crossings\n1 grain = ${story.grain} reports`);
      else if (cut > 0) readout(`${fmt(facts.zmm)} reports\n${fmt(facts.nacional)} nationally`);
      else readout(`${fmt(Math.round(shown * facts.nacional))} reports\n1 grain = ${fmt(NATIONAL_GRAIN)} reports`);
    },
  };
}
