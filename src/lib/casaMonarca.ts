// Structure of the Casa Monarca mixed-integer program, built from the model specification in
// Lunaaaalj/Optimizacion-de-recursos (reports/model_summary/main.tex). Column and row order
// follow the formulation; the recipe pattern is the technical-coefficient table a_{i,m}.

export const I = 30, T = 7, C = 3, M = 12;

// Ingredients used by each dish (1-based indices into the ingredient set I)
const RECIPES: number[][] = [
  [15, 2, 3, 14, 18],      //  1 Huevo con chorizo
  [15, 2, 23, 14, 18],     //  2 Huevo estrellado
  [15, 2, 3, 14, 18],      //  3 Huevo con jamón
  [23, 4, 5, 15, 18],      //  4 Tortas jamón/queso
  [15, 6, 2, 3, 14, 18],   //  5 Huevo con papa
  [30, 17, 18],            //  6 Cereal con leche
  [15, 2, 3, 14, 18],      //  7 Huevo con salchicha
  [24, 11, 4, 21],         //  8 Ensalada de atún
  [25, 12, 4, 14, 19],     //  9 Pollo frito/pasta
  [23, 4, 5, 6, 7, 19],    // 10 Sándwich de pavo
  [26, 14, 3, 19],         // 11 Milanesa de res
  [26, 6, 4, 3, 19],       // 12 Guiso de res
];

export interface Band { key: string; name: string; start: number; end: number }

export interface Sparsity {
  blocks: Band[];          // variable blocks (columns)
  families: Band[];        // constraint families (rows)
  rows: number[][];        // column indices of the nonzeros in each row
  nnz: number;
  counts: Record<string, number>; // nonzeros per "family:block"
}

export function buildSparsity(): Sparsity {
  const col = new Map<string, number>();
  const blocks: Band[] = [];
  const block = (key: string, name: string, keys: string[]) => {
    const start = col.size;
    for (const k of keys) col.set(`${key}${k}`, col.size);
    blocks.push({ key, name, start, end: col.size });
  };
  const it: string[] = [];
  for (let t = 0; t < T; t++) for (let i = 0; i < I; i++) it.push(`.${i}.${t}`);
  const mtc: string[] = [];
  for (let t = 0; t < T; t++) for (let c = 0; c < C; c++) for (let m = 0; m < M; m++) mtc.push(`.${m}.${t}.${c}`);

  block('z', 'Portions prepared', mtc);
  block('y', 'Lots bought', it);
  block('x', 'Quantity bought', it);
  block('γ', 'Quantity cooked', it);
  block('μ', 'Stock at day end', it);
  const z = (m: number, t: number, c: number) => col.get(`z.${m}.${t}.${c}`)!;
  const v = (k: string, i: number, t: number) => col.get(`${k}.${i}.${t}`)!;

  const rows: number[][] = [];
  const families: Band[] = [];
  const family = (key: string, name: string, entries: number[][]) => {
    const start = rows.length;
    rows.push(...entries);
    families.push({ key, name, start, end: rows.length });
  };
  const over = <X>(f: (t: number) => X[]) => Array.from({ length: T }, (_, t) => f(t)).flat();

  family('demand', 'Demand', over((t) => Array.from({ length: C }, (_, c) => Array.from({ length: M }, (_, m) => z(m, t, c)))));
  family('calendar', 'Calendar', over((t) => Array.from({ length: C * M }, (_, k) => [z(k % M, t, Math.floor(k / M))])));
  family('recipes', 'Recipes', over((t) => Array.from({ length: I }, (_, i) => {
    const r = [v('γ', i, t)];
    for (let c = 0; c < C; c++) for (let m = 0; m < M; m++) if (RECIPES[m].includes(i + 1)) r.push(z(m, t, c));
    return r;
  })));
  family('lots', 'Lot sizes', over((t) => Array.from({ length: I }, (_, i) => [v('x', i, t), v('y', i, t)])));
  family('budget', 'Budget', [over((t) => Array.from({ length: I }, (_, i) => v('x', i, t)))]);
  family('inventory', 'Inventory', over((t) => Array.from({ length: I }, (_, i) =>
    [v('μ', i, t), v('x', i, t), v('γ', i, t), ...(t ? [v('μ', i, t - 1)] : [])])));
  family('terminal', 'Terminal stock', Array.from({ length: I }, (_, i) => [v('μ', i, T - 1)]));

  const counts: Record<string, number> = {};
  let nnz = 0;
  for (const f of families) {
    for (let r = f.start; r < f.end; r++) {
      for (const c of rows[r]) {
        const b = blocks.find((b) => c >= b.start && c < b.end)!;
        const k = `${f.key}:${b.key}`;
        counts[k] = (counts[k] || 0) + 1;
        nnz++;
      }
    }
  }
  return { blocks, families, rows, nnz, counts };
}
