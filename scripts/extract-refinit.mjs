// Extracts the data for the reforestation page from the project repository.
//
//   node scripts/extract-refinit.mjs <Stochastic_RefInit/data/processed> [<Stochastic_RefInit/docs/presentacion/datos/datos.js>]
//
// Writes src/data/refinit.json: for each species its name, planned density n0 (plants/ha),
// unit cost and first-year survival, and the symmetric competition matrix W.
//
// With the second argument it also writes src/data/refinit-story.json, the data behind the
// scroll scenes. datos.js is generated in the project by scripts/datos_presentacion.py from the
// outputs of `refor` (seed 42); the one-hectare table is transcribed from the final report,
// reports/final/secciones/simulacion-siembra.tex, Table "Simulación de 1,000 siembras".

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [dir, datosPath] = process.argv.slice(2);
if (!dir) { console.error('usage: node scripts/extract-refinit.mjs <data/processed> [datos.js]'); process.exit(1); }
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

if (datosPath) {
  const d = JSON.parse(readFileSync(datosPath, 'utf8').replace(/^\s*\/\/.*$/gm, '').replace(/^\s*const DATOS\s*=\s*/m, '').replace(/;\s*$/, ''));
  const ab = d.especies.map((e) => e.ab);
  const byAb = new Map(ab.map((a, k) => [a, k]));
  const byName = new Map(d.especies.map((e, k) => [e.nombre, k]));
  if (ab.some((a, k) => d.especies[k].nombre !== species[k].name)) throw new Error('species order differs between especies.csv and datos.js');

  // One hectare, 1,000 simulated plantings (final report): target, mean existing (Poisson mean),
  // purchase at 95% per species. Joint compliance of all ten species: 0.684.
  const hectare = {
    target: [39, 196, 38, 39, 54, 41, 80, 70, 77, 24],
    existing: [8.2, 38.0, 8.0, 7.7, 10.1, 8.0, 14.9, 12.4, 16.5, 4.9],
    purchase: [38, 175, 44, 38, 54, 43, 75, 73, 84, 27],
    alive: 722.4, existingMean: 128.6, joint: 0.684, replicates: 1000,
    rows: 14, cols: 47,
  };

  const story = {
    source: 'Lunaaaalj/Stochastic_RefInit: docs/presentacion/datos/datos.js (refor, seed 42), data/processed/clave_vigente.csv, reports/final',
    codes: ab.map((a) => a.toUpperCase()),
    // Genus for colour, by the first word of the species name (the project groups the last two as 'Otras')
    genus: d.especies.map((e) => ['Agave', 'Opuntia', 'Prosopis', 'Yucca'].indexOf(e.nombre.split(' ')[0])),
    // Local metres, y down; the unnumbered shape in mapa.csv is not one of the 30 polygons
    polygons: d.mapa.filter((p) => p.p != null).map((p) => ({ p: p.p, v: p.v, area: p.area, Bmin: p.Bmin, key: p.clave })),
    totals: d.totales,
    frontier: d.frontera,
    keys: d.mosaicos.map((m) => ({
      id: m.id, polygons: m.poligonos, grid: m.clave.map((row) => row.map((a) => byAb.get(a))),
      best: m.mejor, sd: m.de, random: m.azar, coef: m.coef, bound: m.exacto?.cota, gap: m.exacto?.brecha,
    })),
    scenario: {
      species: byName.get(d.escenarios.especie), polygon: d.escenarios.poligono,
      target: d.escenarios.meta, existing: d.escenarios.existentes, q: d.escenarios.q, purchase: d.escenarios.q95,
      exact: d.escenarios.dist,
    },
    polygon1: d.compra_p1.especies.map((s) => ({ s: byAb.get(s.ab), n: s.n, E: s.E, x: s.x })),
    current: csv('clave_vigente.csv').map((r) => index.get(r.especie)),
    hectare,
  };
  writeFileSync(new URL('../src/data/refinit-story.json', import.meta.url), JSON.stringify(story));
  console.log(`polygons: ${story.polygons.length}, keys: ${story.keys.length}, current sequence: ${story.current.length}`);
}
