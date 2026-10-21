// Extracts the species table and the competition matrix for the reforestation page from the
// project's processed data.
//
//   node scripts/extract-refinit.mjs <path to Stochastic_RefInit/data/processed>
//
// Writes src/data/refinit.json: for each species its name, planned density n0 (plants/ha),
// unit cost and first-year survival, and the symmetric competition matrix W.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2];
if (!dir) { console.error('usage: node scripts/extract-refinit.mjs <data/processed>'); process.exit(1); }
const csv = (f) => {
  const [head, ...rows] = readFileSync(join(dir, f), 'utf8').trim().split(/\r?\n/);
  const keys = head.split(',');
  return rows.map((r) => Object.fromEntries(r.split(',').map((v, k) => [keys[k], v])));
};

const species = csv('especies.csv').map((s) => ({ name: s.especie, n0: +s.n0, c: +s.c, q: +s.q }));
const index = new Map(species.map((s, k) => [s.name, k]));
const W = species.map(() => species.map(() => 0));
for (const r of csv('competencia.csv')) {
  const a = index.get(r.especie_a), b = index.get(r.especie_b);
  W[a][b] = W[b][a] = +r.W;
}
const out = { source: 'Lunaaaalj/Stochastic_RefInit data/processed (especies.csv, competencia.csv)', species, W };
writeFileSync(new URL('../src/data/refinit.json', import.meta.url), JSON.stringify(out, null, 1));
console.log(`species: ${species.length}`);
