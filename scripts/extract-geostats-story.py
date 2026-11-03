"""Extracts what the GeoStats scroll scenes draw into src/data/geostats-story.json.

    cd <GeoStats> && PYTHONPATH=src .venv/bin/python <portfolio>/scripts/extract-geostats-story.py

Reads the project's own files. From docs/presentacion/datos.json: the national layer (0.1 degree
cells, in the presentation's units), Mexico's outline and the main roads. From
data/processed/atus_zmm_limpio_geo.parquet: every intersection the reports name, and the facts
the first scene states about them.

Reports are drawn as grains. One grain stands for GRANO reports, so the piles are to scale. The
grains are allotted to the intersections by systematic sampling over the cumulative count, in a
seeded order: an intersection with 1,000 reports gets 20 grains, and one with 10 gets a grain
one time in five. The total is exact.
"""

import json
import pathlib

import geopandas as gpd
import numpy as np
import shapely

from geostats import espacial, rutas

GRANO = 50
LADO = 500.0
PASO = 0.1
SEMILLA = 42
ROOT = pathlib.Path(rutas.__file__).resolve().parents[2]
OUT = pathlib.Path(__file__).resolve().parents[1] / "src/data/geostats-story.json"

datos = json.load(open(ROOT / "docs/presentacion/datos.json", encoding="utf-8"))
g = gpd.read_parquet(rutas.ATUS_ZMM_LIMPIO_GEO).to_crs(espacial.UTM_ZMM)
xmin, ymin = g.total_bounds[0], g.total_bounds[1]

# Every intersection, in the grid's units (one unit is the 500 m side of a cell)
g["px"], g["py"] = g.geometry.x, g.geometry.y
nodos = g.groupby("id_punto_4d").agg(n=("px", "size"), x=("px", "first"), y=("py", "first"))
assert nodos.n.sum() == len(g) == 379294
assert nodos.n.max() == datos["cruces"]["xy"][0][2], "the nodes differ from the presentation's"

# Which national cells hold ZMM reports, so that the cut can be drawn exactly
ll = g.to_crs(4326)
ni = np.floor((ll.geometry.x.to_numpy() + 118) / PASO).astype(int)
nj = np.floor((ll.geometry.y.to_numpy() - 14) / PASO).astype(int)
zmm_cells = set(zip(ni.tolist(), nj.tolist()))
nac = datos["nacional"]
en_zmm = [k for k, c in enumerate(zip(nac["i"], nac["j"])) if c in zmm_cells]

# The sieve. The whole grid, then the cells that receive reports, then the ones the analysis
# keeps: `celdas()` drops the islands, cells none of whose neighbours holds a report.
rejilla = espacial.rejilla_hexagonal(g.total_bounds, lado=LADO)
union = gpd.sjoin(g[["geometry"]], rejilla[["hex", "geometry"]], predicate="within", how="inner")
conteo = union.groupby("hex").size()
celdas, _ = espacial.celdas(g, lado=LADO)
assert len(celdas) == 2241 and celdas.n.sum() == 379037
islas = conteo[~conteo.index.isin(set(celdas.hex))]
ij_islas = islas.index.str.split("_", expand=True).to_frame().astype(int)
assert len(g) == celdas.n.sum() + islas.sum() + (len(g) - len(union))

# Tract boundaries are not in the repository. What can be measured is how many reports stand
# beside a main road, which is where those boundaries run.
CERCA = 100
vias = [shapely.LineString([(x * LADO + xmin, y * LADO + ymin) for x, y in pts]) for _, pts in datos["vias"] if len(pts) > 1]
puntos = shapely.points(nodos.x, nodos.y)
cerca = np.zeros(len(nodos), bool)
cerca[np.unique(shapely.STRtree(vias).query(puntos, predicate="dwithin", distance=CERCA)[0])] = True
nodos["cerca"] = cerca

orden = np.random.default_rng(SEMILLA).permutation(len(nodos))
acum = nodos.n.to_numpy()[orden].cumsum() / GRANO
granos = np.diff(np.floor(np.concatenate([[0], acum]))).astype(int)
elegidos = nodos.iloc[orden].assign(g=granos).query("g > 0").sort_values("n", ascending=False)

assert elegidos.n.iloc[0] == nodos.n.max(), "the first node must be the busiest crossing"
primero = datos["cruces"]["xy"][0]
assert abs((elegidos.x.iloc[0] - xmin) / LADO - primero[0]) < 0.01 and abs((elegidos.y.iloc[0] - ymin) / LADO - primero[1]) < 0.01

# The facts the scene states, computed here rather than copied
hechos = {
    "nacional": int(sum(nac["n"])),
    "zmm": int(len(g)),
    "zmmCeldasNacionales": len(en_zmm),
    "zmmEnEsasCeldas": int(sum(nac["n"][k] for k in en_zmm)),
    "cruces": int(len(nodos)),
    "enInterseccion": round(float((g.en_interseccion == True).mean()) * 100, 1),
    "cruceMayor": datos["cruces"]["top"][0],
    "rejilla": int(len(rejilla)),
    "conReportes": int(len(conteo)),
    "celdas": int(len(celdas)),
    "reportesEnCeldas": int(celdas.n.sum()),
    "islas": int(len(islas)),
    "reportesEnIslas": int(islas.sum()),
    "sobreArista": int(len(g) - len(union)),
    "cercaVia": round(float(nodos.n[nodos.cerca].sum() / nodos.n.sum()) * 100, 1),
    "medianaCelda": float(celdas.n.median()),
    "maxCelda": int(celdas.n.max()),
}

out = {
    "source": "Lunaaaalj/GeoStats docs/presentacion/datos.json and data/processed (INEGI ATUS, 2019–2024)",
    "grain": GRANO,
    "facts": hechos,
    "national": {"i": nac["i"], "j": nac["j"], "n": nac["n"], "zmm": en_zmm, "focus": nac["foco"], "outline": nac["contorno"]},
    "roads": [[c, pts] for c, pts in datos["vias"]],
    "nodes": {
        "x": ((elegidos.x - xmin) / LADO).round(2).tolist(),
        "y": ((elegidos.y - ymin) / LADO).round(2).tolist(),
        "g": elegidos.g.astype(int).tolist(),
        "near": elegidos.cerca.astype(int).tolist(),
    },
    "islands": {"i": ij_islas[0].tolist(), "j": ij_islas[1].tolist()},
}
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(json.dumps(hechos, ensure_ascii=False, indent=1))
print("nodes with grains", len(elegidos), "grains", int(elegidos.g.sum()), "KB", OUT.stat().st_size // 1024)
