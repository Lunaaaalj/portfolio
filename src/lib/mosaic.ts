// Planting mosaic for the reforestation page: the project's 4 × 13 staggered (tresbolillo) tile
// with periodic borders, 52 positions and 156 neighbouring pairs, scored with the competition
// matrix W from the repository. Everything here runs at build time and is seeded, so the page
// is the same on every build.

import data from '../data/refinit.json';

export const ROWS = 4, COLS = 13, N = ROWS * COLS;
export const W = data.W as number[][];
export const species = data.species;

// Species codes as the report abbreviates them; genus index for colour (Agave, Opuntia, Prosopis, Yucca)
export const CODES = ['ALE', 'ASA', 'ASC', 'AST', 'OCA', 'OEN', 'ORO', 'OST', 'PLA', 'YFI'];
export const GENUS = [0, 0, 0, 0, 1, 1, 1, 1, 2, 3];

const id = (r: number, c: number) => ((r + ROWS) % ROWS) * COLS + ((c + COLS) % COLS);

/** Each position's six neighbours on the staggered grid; odd rows sit half a step to the right. */
export const NEIGHBOURS: number[][] = Array.from({ length: N }, (_, k) => {
  const r = Math.floor(k / COLS), c = k % COLS, s = r % 2 ? 0 : -1;
  return [id(r, c - 1), id(r, c + 1), id(r - 1, c + s), id(r - 1, c + s + 1), id(r + 1, c + s), id(r + 1, c + s + 1)];
});
export const EDGES: [number, number][] = NEIGHBOURS.flatMap((ns, u) => ns.filter((v) => v > u).map((v) => [u, v] as [number, number]));

/** Positions per species, proportional to the plan's densities n0 (largest remainder). */
export function composition(): number[] {
  const total = species.reduce((s, x) => s + x.n0, 0);
  const exact = species.map((x) => (x.n0 / total) * N);
  const m = exact.map(Math.floor);
  const order = exact.map((e, k) => [e - m[k], k]).sort((a, b) => b[0] - a[0]);
  const short = N - m.reduce((a, b) => a + b, 0);
  for (let i = 0; i < short; i++) m[order[i][1]]++;
  return m;
}

export const competition = (a: number[]) => EDGES.reduce((s, [u, v]) => s + W[a[u]][a[v]], 0);

/** Expected competition of a uniformly random arrangement with composition m. */
export function expected(m: number[]): number {
  let pairs = 0;
  for (let a = 0; a < m.length; a++) for (let b = 0; b < m.length; b++) pairs += m[a] * (m[b] - (a === b ? 1 : 0)) * W[a][b];
  return (EDGES.length * pairs) / (N * (N - 1));
}

function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomArrangement(m: number[], seed = 42): number[] {
  const a = m.flatMap((n, s) => Array(n).fill(s)), r = rng(seed);
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/** Change in competition from swapping the species at positions u and v. */
function swapDelta(a: number[], u: number, v: number): number {
  const su = a[u], sv = a[v];
  let d = 0;
  for (const n of NEIGHBOURS[u]) if (n !== v) d += W[sv][a[n]] - W[su][a[n]];
  for (const n of NEIGHBOURS[v]) if (n !== u) d += W[su][a[n]] - W[sv][a[n]];
  return d;
}

/** A short tabu search over swaps, the local-search half of the project's memetic algorithm. */
export function tabuArrangement(start: number[], iterations = 3000, seed = 42): number[] {
  const a = [...start], r = rng(seed), tabu = new Map<string, number>();
  let cur = competition(a), best = [...a], bestScore = cur;
  for (let it = 0; it < iterations; it++) {
    let mv: [number, number] | null = null, md = Infinity;
    for (let u = 0; u < N; u++) for (let v = u + 1; v < N; v++) {
      if (a[u] === a[v]) continue;
      const d = swapDelta(a, u, v), key = `${u}:${v}`;
      const allowed = (tabu.get(key) ?? -1) < it || cur + d < bestScore - 1e-9;
      if (allowed && (d < md - 1e-9 || (Math.abs(d - md) < 1e-9 && r() < 0.5))) { md = d; mv = [u, v]; }
    }
    if (!mv) break;
    const [u, v] = mv;
    [a[u], a[v]] = [a[v], a[u]]; cur += md;
    tabu.set(`${u}:${v}`, it + 5 + Math.floor(r() * 11));   // tenure 5–15, as in the report
    if (cur < bestScore - 1e-9) { bestScore = cur; best = [...a]; }
  }
  return best;
}
