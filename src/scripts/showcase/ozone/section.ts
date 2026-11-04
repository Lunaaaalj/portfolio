// The west–east section of the valley, shared by Figs. 2 and 11. Stations stand at their real
// longitude and elevation; the elevation is exaggerated, and the sierra beyond the westernmost
// station and the plain beyond the easternmost are schematic.

import story from '../../../data/ozone-story.json';
import { rgba, type Colors } from '../draw';

export const stations = [...story.stations].sort((a, b) => b.lon - a.lon);
const LON_W = 100.72, LON_E = 99.94, RIDGE = 1900;

export interface Section { X(lon: number): number; G(msnm: number): number; left: number; right: number; ground: number; top: number; path: [number, number][] }

export function section(left: number, right: number, top: number, ground: number): Section {
  const X = (lon: number) => left + ((LON_W - lon) / (LON_W - LON_E)) * (right - left);
  const G = (msnm: number) => ground - ((msnm - 250) / (RIDGE - 250)) * (ground - top);
  const raw: [number, number][] = [[LON_W, RIDGE], [100.67, 1500], [100.63, 980], ...stations.map((s): [number, number] => [s.lon, s.msnm]), [LON_E, 320]];
  return { X, G, left, right, ground, top, path: raw.map(([lo, m]) => [X(lo), G(m)]) };
}

/** Height of the ground at x, by interpolation along the section. */
export function groundAt(s: Section, x: number) {
  const p = s.path;
  for (let i = 1; i < p.length; i++) if (x <= p[i][0]) {
    const t = (x - p[i - 1][0]) / (p[i][0] - p[i - 1][0] || 1);
    return p[i - 1][1] + (p[i][1] - p[i - 1][1]) * t;
  }
  return p[p.length - 1][1];
}

export function drawSection(g: CanvasRenderingContext2D, c: Colors, s: Section) {
  const line = new Path2D();
  s.path.forEach(([x, y], i) => (i ? line.lineTo(x, y) : line.moveTo(x, y)));
  const solid = new Path2D(line);
  solid.lineTo(s.right, s.ground + 26); solid.lineTo(s.left, s.ground + 26); solid.closePath();
  g.fillStyle = rgba(c.graphite, 0.12); g.fill(solid);
  // Engraver's strokes under the ground line, denser towards the sierra
  g.save(); g.clip(solid); g.strokeStyle = rgba(c.contour, 0.7); g.lineWidth = 1; g.beginPath();
  for (let x = s.left - 40; x < s.right + 40; x += 9) { g.moveTo(x, s.top); g.lineTo(x - 90, s.ground + 40); }
  g.stroke(); g.restore();
  g.strokeStyle = c.ink; g.lineWidth = 1.25; g.lineJoin = 'round'; g.stroke(line);
}
