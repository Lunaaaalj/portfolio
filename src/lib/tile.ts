// The planting tile as the project defines it (Stochastic_RefInit src/memetico/mosaico.cpp): a
// 4 × 13 staggered grid in axial coordinates with periodic borders, 52 positions, 156 pairs of
// neighbours. Each row starts half a spacing ahead of the one before. With this geometry and W
// the six keys in the data score exactly as the report states (78.18, 77.37, 81.29, 76.77,
// 76.80, 81.85).
//
// The memetic algorithm follows the final report, section "Algoritmo memético": a population of
// 20, binary tournaments, a crossover adapted from GPX that works species by species and keeps
// the composition, tabu search over swaps with tenure 5–15 and 500 iterations without improvement,
// replacement of the worst individual by a better child that is not a copy of another, and a stop
// after 100 generations without improvement. It is written as a generator so the page can show
// each step; it is seeded, so the run is the same on every visit.

import base from '../data/refinit.json';

export const ROWS = 4, COLS = 13, N = ROWS * COLS;
export const W = base.W as number[][];
const S = W.length;

const at = (r: number, c: number) => (((r % ROWS) + ROWS) % ROWS) * COLS + (((c % COLS) + COLS) % COLS);
/** The six axial neighbours of each position, as in mosaico.cpp. */
export const NB: number[][] = Array.from({ length: N }, (_, v) => {
  const r = Math.floor(v / COLS), c = v % COLS;
  return [[-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0]].map(([dr, dc]) => at(r + dr, c + dc));
});
export const EDGES: [number, number][] = NB.flatMap((ns, v) => ns.filter((u) => u > v).map((u) => [v, u] as [number, number]));

export const score = (a: number[]) => EDGES.reduce((s, [u, v]) => s + W[a[u]][a[v]], 0);
export const counts = (a: number[]) => { const m = Array(S).fill(0); for (const s of a) m[s]++; return m; };

/** Expected competition of a random arrangement with composition m over `pairs` neighbour pairs. */
export function expected(m: number[], pairs = EDGES.length): number {
  const n = m.reduce((a, b) => a + b, 0);
  let p = 0;
  for (let a = 0; a < S; a++) for (let b = 0; b < S; b++) p += m[a] * (m[b] - (a === b ? 1 : 0)) * W[a][b];
  return (pairs * p) / (n * (n - 1));
}

/** Screen layout of a tile position: column x in spacings (odd screen rows sit half a step right). */
export function tileCell(grid: number[][], R: number, k: number): number {
  const c = k - Math.floor(R / 2);
  return grid[((R % ROWS) + ROWS) % ROWS][((c % COLS) + COLS) % COLS];
}

/** The current CONAFOR order: one sequence repeated along every row, each row starting `d`
 *  positions further on, in the same axial grid (d = 0 and d = 1 are the two aligned cases; the
 *  report's best offset is 5). Returns competition / random expectation on a periodic field. */
export function sequenceCoefficient(seq: number[], d: number): number {
  const L = seq.length;
  const cell = (r: number, k: number) => seq[(((k + r * d) % L) + L) % L];
  let s = 0;
  for (let r = 0; r < L; r++) for (let k = 0; k < L; k++) {
    const a = cell(r, k);
    s += W[a][cell(r, k + 1)] + W[a][cell(r + 1, k - 1)] + W[a][cell(r + 1, k)];
  }
  // The random expectation on the same field: the sequence's composition repeated L times
  return s / expected(counts(seq).map((x) => x * L), 3 * L * L);
}

/** Same-species neighbours per plant for the current order at offset d. */
export function sequenceSame(seq: number[], d: number): number {
  const L = seq.length, cell = (r: number, k: number) => seq[(((k + r * d) % L) + L) % L];
  let n = 0;
  for (let r = 0; r < L; r++) for (let k = 0; k < L; k++) {
    const a = cell(r, k);
    n += +(a === cell(r, k + 1)) + +(a === cell(r + 1, k - 1)) + +(a === cell(r + 1, k));
  }
  return (2 * n) / (L * L);
}

export function rng(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffle(m: number[], r: () => number): number[] {
  const a = m.flatMap((n, s) => Array(n).fill(s));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

function swapDelta(a: number[], u: number, v: number): number {
  const su = a[u], sv = a[v];
  let d = 0;
  for (const n of NB[u]) if (n !== v) d += W[sv][a[n]] - W[su][a[n]];
  for (const n of NB[v]) if (n !== u) d += W[su][a[n]] - W[sv][a[n]];
  return d;
}

const translate = (a: number[], dr: number, dc: number) => a.map((_, v) => a[at(Math.floor(v / COLS) + dr, (v % COLS) + dc)]);
/** Positions that differ, minimised over the 52 translations of the tile. */
export function distance(a: number[], b: number[]): number {
  let best = N;
  for (let dr = 0; dr < ROWS; dr++) for (let dc = 0; dc < COLS; dc++) {
    let d = 0;
    for (let v = 0; v < N && d < best; v++) {
      if (a[v] !== b[at(Math.floor(v / COLS) + dr, (v % COLS) + dc)]) d++;
    }
    if (d < best) best = d;
  }
  return best;
}
function align(a: number[], b: number[]): number[] {
  let best = b, bd = N + 1;
  for (let dr = 0; dr < ROWS; dr++) for (let dc = 0; dc < COLS; dc++) {
    const t = translate(b, dr, dc);
    let d = 0;
    for (let v = 0; v < N; v++) if (a[v] !== t[v]) d++;
    if (d < bd) { bd = d; best = t; }
  }
  return best;
}

export type TabuEvent = { t: 'swap'; u: number; v: number; score: number; best: number; tabu: [number, number][] };

/** Tabu search over swaps of two positions; yields every swap it applies. */
export function* tabu(start: number[], r: () => number, patience = 500): Generator<TabuEvent, { a: number[]; score: number }> {
  const a = [...start], until = new Map<number, number>();
  let cur = score(a), best = [...a], bestScore = cur, idle = 0, it = 0;
  const recent: [number, number][] = [];
  while (idle < patience) {
    let mu = -1, mv = -1, md = Infinity, ties = 0;
    for (let u = 0; u < N; u++) for (let v = u + 1; v < N; v++) {
      if (a[u] === a[v]) continue;
      const d = swapDelta(a, u, v);
      const ok = (until.get(u * N + v) ?? -1) < it || cur + d < bestScore - 1e-9;
      if (!ok) continue;
      if (d < md - 1e-9) { md = d; mu = u; mv = v; ties = 1; }
      else if (Math.abs(d - md) < 1e-9 && r() * ++ties < 1) { mu = u; mv = v; }
    }
    if (mu < 0) break;
    [a[mu], a[mv]] = [a[mv], a[mu]]; cur += md;
    until.set(mu * N + mv, it + 5 + Math.floor(r() * 11));
    recent.unshift([mu, mv]); if (recent.length > 15) recent.pop();
    if (cur < bestScore - 1e-9) { bestScore = cur; best = [...a]; idle = 0; } else idle++;
    it++;
    yield { t: 'swap', u: mu, v: mv, score: cur, best: bestScore, tabu: recent.filter(([u, v]) => (until.get(u * N + v) ?? -1) >= it) };
  }
  return { a: best, score: bestScore };
}

export type Ind = { a: number[]; score: number };
export type MemeticEvent =
  | { t: 'seed'; index: number; ind: Ind }
  | { t: 'init'; pop: Ind[] }
  | { t: 'select'; gen: number; pair: [number, number][]; parents: [number, number] }
  | { t: 'inherit'; s: number; from: 0 | 1; cells: number[]; child: number[] }
  | { t: 'greedy'; cells: number[]; child: number[] }
  | TabuEvent
  | { t: 'child'; a: number[]; score: number }
  | { t: 'replace'; index: number | null; reason: 'better' | 'worse' | 'copy'; pop: Ind[] }
  | { t: 'gen'; gen: number; best: number; idle: number };

/** Species-by-species crossover adapted from GPX; keeps the composition m by construction. */
function* crossover(A: number[], B: number[], m: number[], r: () => number): Generator<MemeticEvent, number[]> {
  const P = [A, align(A, B)], child = Array(N).fill(-1), left = [...m];
  for (let turn = 0; ; turn++) {
    const p = P[turn % 2];
    let bs = -1, bn = 0;
    for (let s = 0; s < S; s++) {
      if (!left[s]) continue;
      let n = 0;
      for (let v = 0; v < N; v++) if (child[v] < 0 && p[v] === s) n++;
      if (n > bn || (n === bn && n > 0 && r() < 0.5)) { bn = n; bs = s; }
    }
    if (bs < 0) break;
    const free = [];
    for (let v = 0; v < N; v++) if (child[v] < 0 && p[v] === bs) free.push(v);
    for (let i = free.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [free[i], free[j]] = [free[j], free[i]]; }
    const take = free.slice(0, left[bs]);
    for (const v of take) child[v] = bs;
    left[bs] -= take.length;
    yield { t: 'inherit', s: bs, from: (turn % 2) as 0 | 1, cells: take, child: [...child] };
  }
  const rest: number[] = [];
  for (let v = 0; v < N; v++) {
    if (child[v] >= 0) continue;
    let bs = -1, bd = Infinity;
    for (let s = 0; s < S; s++) {
      if (!left[s]) continue;
      let d = 0;
      for (const n of NB[v]) if (child[n] >= 0) d += W[s][child[n]];
      if (d < bd) { bd = d; bs = s; }
    }
    child[v] = bs; left[bs]--; rest.push(v);
  }
  if (rest.length) yield { t: 'greedy', cells: rest, child: [...child] };
  return child;
}

export function* memetic(m: number[], seed = 42, size = 20, stall = 100, maxGen = 1000): Generator<MemeticEvent, Ind> {
  const r = rng(seed);
  const pop: Ind[] = [];
  // Each starting tile is a random permutation of the composition, improved by tabu search; its
  // swaps are yielded too, so a caller can spread the work over frames
  for (let i = 0; i < size; i++) {
    const ind = yield* tabu(shuffle(m, r), r);
    pop.push(ind);
    yield { t: 'seed', index: i, ind: { ...ind } };
  }
  yield { t: 'init', pop: pop.map((p) => ({ ...p })) };
  let best = Math.min(...pop.map((p) => p.score)), idle = 0;
  for (let gen = 1; gen <= maxGen && idle < stall; gen++) {
    const pick = (): [number, number, number] => {
      const i = Math.floor(r() * size); let j = Math.floor(r() * (size - 1)); if (j >= i) j++;
      return [i, j, pop[i].score <= pop[j].score ? i : j];
    };
    const [i1, j1, a] = pick(); let [i2, j2, b] = pick();
    if (b === a) b = a === j2 ? i2 : j2;
    yield { t: 'select', gen, pair: [[i1, j1], [i2, j2]], parents: [a, b] };
    const child = yield* crossover(pop[a].a, pop[b].a, m, r);
    const c = yield* tabu(child, r);
    yield { t: 'child', a: c.a, score: c.score };
    let worst = 0;
    for (let i = 1; i < size; i++) if (pop[i].score > pop[worst].score) worst = i;
    let reason: 'better' | 'worse' | 'copy' = 'better', index: number | null = null;
    if (c.score >= pop[worst].score - 1e-9) reason = 'worse';
    else if (pop.some((p) => distance(p.a, c.a) === 0)) reason = 'copy';
    else { pop[worst] = { a: c.a, score: c.score }; index = worst; }
    yield { t: 'replace', index, reason, pop: pop.map((p) => ({ ...p })) };
    const nb = Math.min(best, c.score);
    if (nb < best - 1e-9) { best = nb; idle = 0; } else idle++;
    yield { t: 'gen', gen, best, idle };
  }
  return pop.reduce((x, y) => (y.score < x.score ? y : x));
}
