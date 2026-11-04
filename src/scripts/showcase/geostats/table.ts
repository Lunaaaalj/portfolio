// The table: the 2,241 cells of the analysis as hexagonal columns, the one physical object the
// scenes from Fig. 2 on are drawn with. A view tips the plane away from the reader about the
// x axis, so north stays up and the roads stay recognisable. Cells are centred where the project
// puts them (src/geostats/espacial.py): flat-top, side 1 in grid units, odd columns shifted half
// a cell north. They are painted from north to south, so that nearer columns cover farther ones.

import geo from '../../../data/geostats.json';
import story from '../../../data/geostats-story.json';
import { lerp, mix, type Colors } from '../draw';
import type { Frame } from './city';

export const N = geo.i.length;
const S3 = Math.sqrt(3);
export const cellX = (i: number) => i * 1.5;
export const cellY = (i: number, j: number) => j * S3 + (i % 2 ? S3 / 2 : 0);
export const X = geo.i.map(cellX);
export const Y = geo.i.map((i, k) => cellY(i, geo.j[k]));

/** Recorded reports of each cell, 2019 to 2024. */
export const TOTAL = X.map((_, k) => Object.values(geo.years).reduce((s, y) => s + (y as number[])[k], 0));

const SOUTH_TO_NORTH_LAST = Array.from({ length: N }, (_, k) => k).sort((a, b) => Y[b] - Y[a]);

/** The column and row of the hexagon that contains (x, y): the nearest centre. */
export function hexAt(x: number, y: number): [number, number] {
  const i0 = Math.round(x / 1.5);
  let best = Infinity, out: [number, number] = [i0, 0];
  for (let i = i0 - 1; i <= i0 + 1; i++) {
    const j0 = Math.round((y - (i % 2 ? S3 / 2 : 0)) / S3);
    for (let j = j0 - 1; j <= j0 + 1; j++) {
      const d = (cellX(i) - x) ** 2 + (cellY(i, j) - y) ** 2;
      if (d < best) { best = d; out = [i, j]; }
    }
  }
  return out;
}

export interface View { k: number; cx: number; cy: number; ox: number; oy: number; tilt: number }

/** How far the plane is foreshortened, from 1 (plan) to the table's angle. */
export const squash = (tilt: number) => lerp(1, 0.58, tilt);

export const px = (v: View, x: number) => v.ox + (x - v.cx) * v.k;
export const py = (v: View, y: number, up = 0) => v.oy - (y - v.cy) * v.k * squash(v.tilt) - up;

const HEX: [number, number][] = [[1, 0], [0.5, S3 / 2], [-0.5, S3 / 2], [-1, 0], [-0.5, -S3 / 2], [0.5, -S3 / 2]];
/** Slightly under the true side, so that a hairline of plate separates the cells, as in Fig. 10. */
const INSET = 0.94;

export function hexPath(g: CanvasRenderingContext2D | Path2D, v: View, x: number, y: number, up = 0, inset = INSET) {
  HEX.forEach(([a, b], q) => {
    const sx = px(v, x + a * inset), sy = py(v, y + b * inset, up);
    q ? g.lineTo(sx, sy) : g.moveTo(sx, sy);
  });
  g.closePath();
}

/** Colour classes of a count: the quantiles at which the sequential ramp steps up. Heights carry
 *  the magnitude; the ramp keeps its darkest step for the top 2% of cells, so the centre of the
 *  city does not close into one mass. */
export function rampClasses(values: number[]): (n: number) => number {
  const sorted = [...values].sort((a, b) => a - b);
  const cuts = [0.4, 0.7, 0.9, 0.98].map((q) => sorted[Math.floor(sorted.length * q)]);
  return (n) => cuts.filter((c) => n >= c).length;
}

/** Extra structure on a column: the seams between its drawers, and a slab of another colour. */
export interface Courses {
  /** Heights in pixels, above the table, at which a seam runs round the visible faces. */
  seams?: (k: number) => number[];
  seam?: string;
  /** Height in pixels of a slab sitting on the column, and its two colours. */
  cap?: (k: number) => number;
  capTop?: (k: number) => string;
  capSide?: (k: number) => string;
}

const FACES = [3, 4, 5, 0];

function faces(g: CanvasRenderingContext2D, v: View, x: number, y: number, from: number, to: number) {
  g.beginPath();
  for (const q of FACES) { const [a, b] = HEX[q]; g.lineTo(px(v, x + a * INSET), py(v, y + b * INSET, to)); }
  for (let n = 3; n >= 0; n--) { const [a, b] = HEX[FACES[n]]; g.lineTo(px(v, x + a * INSET), py(v, y + b * INSET, from)); }
  g.closePath();
}

/** Paints the columns. `height` is in pixels; `top` and `side` give each cell's two colours, and
 *  `edge` the hairline that keeps neighbouring columns apart. */
export function drawColumns(g: CanvasRenderingContext2D, v: View, height: ArrayLike<number>, top: (k: number) => string, side: (k: number) => string, edge: string, courses: Courses = {}) {
  const { seams, seam, cap, capTop, capSide } = courses;
  g.lineWidth = 0.6;
  for (const k of SOUTH_TO_NORTH_LAST) {
    const h = height[k], x = X[k], y = Y[k], slab = cap ? cap(k) : 0;
    g.strokeStyle = edge;
    if (h > 0.5) { faces(g, v, x, y, 0, h); g.fillStyle = side(k); g.fill(); g.stroke(); }
    if (seams && seam) {
      g.strokeStyle = seam; g.beginPath();
      for (const at of seams(k)) FACES.forEach((q, n) => {
        const [a, b] = HEX[q], sx = px(v, x + a * INSET), sy = py(v, y + b * INSET, at);
        n ? g.lineTo(sx, sy) : g.moveTo(sx, sy);
      });
      g.stroke(); g.strokeStyle = edge;
    }
    if (slab > 0.5) { faces(g, v, x, y, h, h + slab); g.fillStyle = capSide!(k); g.fill(); g.stroke(); }
    g.beginPath(); hexPath(g, v, x, y, h + slab);
    g.fillStyle = slab > 0.5 ? capTop!(k) : top(k); g.fill();
    if (h + slab > 0.5) g.stroke();
  }
}

/** Heights are to scale in every scene: the tallest column of all, in pixels. */
export const tallestUp = (h: number) => Math.min(h * 0.34, 240);

/** The table's resting view in a frame. The plane sits a little low, to leave room for the columns. */
export const tableView = (f: Frame, h: number, tilt = 1): View => ({ k: f.k, cx: f.cx, cy: f.cy, ox: f.midX, oy: lerp(f.midY, f.midY + h * 0.07, tilt), tilt });

/** One colour pair for each cell, from its count, for the current theme. */
export function columnColours(c: Colors) {
  const klass = rampClasses(TOTAL);
  const tops = TOTAL.map((n) => c.ramp[klass(n)]);
  return { tops, sides: tops.map((col) => mix(col, c.ink, 0.18)) };
}

export function drawRoads(g: CanvasRenderingContext2D, v: View, colour: string, width = 1) {
  const lines = new Path2D();
  for (const [, pts] of story.roads as [string, number[][]][]) pts.forEach(([x, y], q) => { q ? lines.lineTo(px(v, x), py(v, y)) : lines.moveTo(px(v, x), py(v, y)); });
  g.strokeStyle = colour; g.lineWidth = width; g.stroke(lines);
}
