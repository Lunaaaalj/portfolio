// Drawing the 4 × 13 planting tile. Positions are axial (src/lib/tile.ts); on screen each row is
// half a spacing further right than the one before, wrapped into a rectangle, so the tile reads as
// the staggered grid a crew sees. Every neighbour pair is drawn once, as a spring from a position
// to its right, lower-left and lower-right neighbours; a neighbour across the border is drawn as a
// faint copy outside the tile, as on a repeated planting.

import story from '../../data/refinit-story.json';
import { COLS, ROWS, N, W } from '../../lib/tile';
import { type Colors, plant, rgba } from './draw';

/** rot: the tile is turned a quarter, rows running down the screen, for tall screens. */
export interface TileBox { x: number; y: number; S: number; H: number; rot?: boolean }

export function fitTile(x: number, y: number, w: number, h: number, rot = false): TileBox {
  const [W, Hh] = rot ? [h, w] : [w, h];
  const S = Math.min(W / (COLS + 1.1), Hh / ((ROWS + 0.7) * 0.866));
  const H = S * 0.866;
  const tw = (COLS + 0.5) * S, th = (ROWS - 1) * H + S;
  return rot
    ? { x: x + (w - th) / 2 + S / 2, y: y + (h - tw) / 2 + S / 2, S, H, rot }
    : { x: x + (w - tw) / 2 + S / 2, y: y + (h - th) / 2 + S / 2, S, H };
}

/** Screen position of position v, in spacings: x in [0, 13) after wrapping, y = row. */
export function cellXY(v: number): [number, number] {
  const r = Math.floor(v / COLS), c = v % COLS;
  return [(((c + r / 2) % COLS) + COLS) % COLS, r];
}
export const at = (b: TileBox, v: number): [number, number] => {
  const [x, y] = cellXY(v);
  return b.rot ? [b.x + y * b.H, b.y + x * b.S] : [b.x + x * b.S, b.y + y * b.H];
};

// The three forward neighbours of each position and their screen offsets, in spacings
const FORWARD: [number, number, number, number][] = [[0, 1, 1, 0], [1, -1, -0.5, 1], [1, 0, 0.5, 1]];
const nb = (v: number, dr: number, dc: number) => {
  const r = Math.floor(v / COLS), c = v % COLS;
  return (((r + dr) % ROWS) + ROWS) % ROWS * COLS + (((c + dc) % COLS) + COLS) % COLS;
};

const wMin = 0.17, wMax = 1.5;

/** A spring between two points: coils whose width and weight grow with the penalty w. */
export function spring(g: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, w: number, color: string, gapR: number, a = 1) {
  const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy);
  if (L < 2 * gapR + 2) return;
  const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
  const t = Math.max(0, Math.min(1, (w - wMin) / (wMax - wMin)));
  const amp = gapR * (0.1 + 0.2 * t), coils = 4;
  const s0 = gapR, s1 = L - gapR, span = s1 - s0;
  g.globalAlpha = a;
  g.strokeStyle = color; g.lineWidth = 0.6 + 1.4 * t;
  g.beginPath(); g.moveTo(x1 + ux * s0, y1 + uy * s0);
  const lead = span * 0.18;
  g.lineTo(x1 + ux * (s0 + lead), y1 + uy * (s0 + lead));
  for (let i = 1; i <= coils * 2; i++) {
    const s = s0 + lead + ((span - 2 * lead) * i) / (coils * 2);
    const side = i === coils * 2 ? 0 : i % 2 ? 1 : -1;
    g.lineTo(x1 + ux * s + nx * amp * side, y1 + uy * s + ny * amp * side);
  }
  g.lineTo(x1 + ux * s1, y1 + uy * s1);
  g.stroke(); g.globalAlpha = 1;
}

export interface DrawOpts {
  plants?: number; springs?: number; codes?: boolean; ghosts?: boolean;
  /** Per-position alpha or offset overrides, for cells in motion. */
  cellAlpha?: (v: number) => number;
  move?: Map<number, [number, number]>;
  sameOnly?: boolean;
}

export function drawTile(g: CanvasRenderingContext2D, c: Colors, b: TileBox, a: number[], o: DrawOpts = {}) {
  const pa = o.plants ?? 1, sa = o.springs ?? 1, R = b.S * 0.25;
  const pos = (v: number): [number, number] => o.move?.get(v) ?? at(b, v);
  if (sa > 0) {
    for (let v = 0; v < N; v++) {
      if (a[v] < 0) continue;
      const [x, y] = pos(v);
      for (const [dr, dc, ox, oy] of FORWARD) {
        const u = nb(v, dr, dc);
        if (a[u] < 0) continue;
        const same = a[u] === a[v];
        if (o.sameOnly && !same) continue;
        const X = x + (b.rot ? oy * b.H : ox * b.S), Y = y + (b.rot ? ox * b.S : oy * b.H);
        const w = W[a[v]][a[u]];
        const t = (w - wMin) / (wMax - wMin);
        spring(g, x, y, X, Y, w, same ? c.hazard : rgba(c.ink, 0.3 + 0.55 * t), R + 2, sa * Math.min(o.cellAlpha?.(v) ?? 1, o.cellAlpha?.(u) ?? 1));
        // A neighbour across the border: its faint copy, where the next tile would put it
        const [cx, cy] = at(b, u);
        if (o.ghosts !== false && (Math.abs(cx - X) > 1 || Math.abs(cy - Y) > 1) && !o.move?.has(v)) {
          plant(g, c, X, Y, R, story.genus[a[u]], o.codes ? story.codes[a[u]] : undefined, 0.28 * pa);
        }
      }
    }
  }
  if (pa > 0) {
    for (let v = 0; v < N; v++) {
      if (a[v] < 0) {
        const [x, y] = pos(v);
        g.globalAlpha = pa; g.strokeStyle = c.contour; g.lineWidth = 1; g.setLineDash([2, 3]);
        g.beginPath(); g.arc(x, y, R, 0, Math.PI * 2); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
        continue;
      }
      const [x, y] = pos(v);
      plant(g, c, x, y, R, story.genus[a[v]], o.codes !== false ? story.codes[a[v]] : undefined, pa * (o.cellAlpha?.(v) ?? 1));
    }
  }
}

/** A tile in miniature: coloured dots only, for the population shelf. */
export function drawMini(g: CanvasRenderingContext2D, c: Colors, b: TileBox, a: number[], alpha = 1) {
  for (let v = 0; v < N; v++) {
    const [x, y] = at(b, v);
    g.globalAlpha = alpha; g.fillStyle = c.genus[story.genus[a[v]]];
    g.beginPath(); g.arc(x, y, b.S * 0.36, 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}
