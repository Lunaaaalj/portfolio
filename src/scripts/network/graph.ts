// The graph the background draws, as plain data: which units fire for one forward pass and which
// connections they fire along. Shared by the live background (eclipse.ts) and the banner generator
// (scripts/banners/build.mjs), so both show the same thing.
import type { Model, Pass } from './forward';

export interface Edge { l: number; s: number; t: number; w: number; fresh: boolean }

export interface Direct {
  /** residual dimension → MLP 0 neuron, M×D */
  win: Float32Array;
  /** MLP 0 → MLP 1, M×M */
  w01: Float32Array;
  /** MLP 1 → output character, V×M */
  wo1: Float32Array;
}

export const SIZES = (m: Model) => [m.D, m.M, m.M, m.vocab.length];

/** Direct-path weights with each LayerNorm's gain folded in: what one unit says to the next ring. */
export function directWeights(F: Model): Direct {
  const { D, M } = F, V = F.vocab.length, P = F.tensor;
  const fc1a = P('blocks.0.fc1.weight'), fc1b = P('blocks.1.fc1.weight');
  const fc2a = P('blocks.0.fc2.weight'), fc2b = P('blocks.1.fc2.weight');
  const g20 = P('blocks.0.ln2.weight'), g21 = P('blocks.1.ln2.weight'), gf = P('lnf.weight'), head = P('head.weight');
  const win = new Float32Array(M * D), w01 = new Float32Array(M * M), wo1 = new Float32Array(V * M);
  for (let j = 0; j < M; j++) for (let d = 0; d < D; d++) win[j * D + d] = fc1a[j * D + d] * g20[d];
  for (let i = 0; i < M; i++) for (let j = 0; j < M; j++) { let s = 0; for (let d = 0; d < D; d++) s += fc1b[i * D + d] * g21[d] * fc2a[d * M + j]; w01[i * M + j] = s; }
  for (let c = 0; c < V; c++) for (let i = 0; i < M; i++) { let s = 0; for (let d = 0; d < D; d++) s += head[c * D + d] * gf[d] * fc2b[d * M + i]; wo1[c * M + i] = s; }
  return { win, w01, wo1 };
}

const topk = (a: ArrayLike<number>, k: number) => [...Array(a.length).keys()].sort((x, y) => a[y] - a[x]).slice(0, k);

/**
 * The live edges: the eight most active units per layer, each along its two strongest targets,
 * weights normalised per layer. A: each ring's activations scaled to 0..1.
 * prev: the previous step's edge keys; an edge not in it is `fresh` (the background flashes those).
 */
export function liveGraph(F: Model, R: Pass, W: Direct, prev: Set<string> = new Set()) {
  const { D, M } = F, V = F.vocab.length;
  const acts = [Float32Array.from(R.embed, Math.abs), R.mlp[0], R.mlp[1]];
  const nrm = (a: Float32Array) => { let m = 1e-9; for (const v of a) m = Math.max(m, v); return a.map((v) => Math.max(0, v) / m); };
  const A = [nrm(acts[0]), nrm(acts[1]), nrm(acts[2]), nrm(R.prob)], E: Edge[] = [];
  const stage = (l: number, nt: number, wf: (t: number, s: number) => number) => {
    for (const s of topk(acts[l], 8)) {
      const sg = l === 0 ? Math.sign(R.embed[s]) : 1;
      const ts = [...Array(nt).keys()].map((t) => [t, acts[l][s] * wf(t, s) * sg]).sort((x, y) => y[1] - x[1]).slice(0, 2);
      for (const [t, w] of ts) if (w > 0) E.push({ l, s, t, w, fresh: !prev.has(`${l}.${s}.${t}`) });
    }
  };
  stage(0, M, (t, s) => W.win[t * D + s]);
  stage(1, M, (t, s) => W.w01[t * M + s]);
  stage(2, V, (t, s) => W.wo1[t * M + s]);
  for (let l = 0; l < 3; l++) { const es = E.filter((e) => e.l === l), m = Math.max(1e-9, ...es.map((e) => e.w)); for (const e of es) e.w /= m; }
  return { E, A, keys: new Set(E.map((e) => `${e.l}.${e.s}.${e.t}`)) };
}
