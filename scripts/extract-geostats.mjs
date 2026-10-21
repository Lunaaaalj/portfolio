// Extracts the hexagonal-grid layers for the GeoStats page from the project's own presentation
// data, so the figure uses exactly the 2,241-cell grid of the analysis.
//
//   node scripts/extract-geostats.mjs <path to GeoStats/docs/presentacion/datos.json>
//
// Writes src/data/geostats.json: cell offsets (i, j; flat-top, odd columns shifted half a cell),
// the municipality of each cell, recorded incidents per cell for each year 2019–2024, and the
// 2027 forecast per cell (posterior median of the expected count, rounded).

import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) { console.error('usage: node scripts/extract-geostats.mjs <datos.json>'); process.exit(1); }
const d = JSON.parse(readFileSync(src, 'utf8'));

const years = [2019, 2020, 2021, 2022, 2023, 2024];
const out = {
  source: 'Lunaaaalj/GeoStats docs/presentacion/datos.json (INEGI ATUS, 2019–2024)',
  i: d.rejilla.i,
  j: d.rejilla.j,
  municipalities: d.municipios.nombres,
  municipality: d.municipios.porCelda,
  years: Object.fromEntries(years.map((y) => [y, d.capas[`a${y}`]])),
  p2027: d.capas.p2027,
  totalPorAnio: Object.fromEntries(years.map((y, k) => [y, d.totalPorAnio[k]])),
};
writeFileSync(new URL('../src/data/geostats.json', import.meta.url), JSON.stringify(out));
console.log(`cells: ${out.i.length}`);
