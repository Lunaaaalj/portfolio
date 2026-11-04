"""Turns the refit into src/data/geostats-model.json, what the model scenes draw.

    <GeoStats>/.venv/bin/python scripts/extract-geostats-model.py <outdir of scripts/geostats-fit.py>

Needs numpy and scipy. Everything comes from the posterior and the training rows. Cells are written
in the order of src/data/geostats.json; the script fails if the two grids differ.
"""

import json
import pathlib
import sys

import numpy as np
from scipy import stats

SRC = pathlib.Path(sys.argv[1])
z = np.load(SRC / "posterior.npz", allow_pickle=True)
r = json.load(open(SRC / "refit.json"))
ROOT = pathlib.Path(__file__).resolve().parents[1]
geo = json.load(open(ROOT / "src/data/geostats.json"))
assert [f"{i}_{j}" for i, j in zip(geo["i"], geo["j"])] == z["hex"].tolist(), "the grids differ"

theta = r["theta"]
mu, y, cell, year = np.exp(z["tr_log_mu"]), z["tr_y"], z["tr_i"], z["tr_a"]

# Fig. 4. The row whose expected count is nearest 60 in 2023, and every row expecting about that
# much, re-centred on it: what a die with that loading would have to reproduce.
NEAR, LO, HI = 60.0, 45.0, 75.0
fila = int(np.argmin(np.where(year == 4, np.abs(mu - NEAR), np.inf)))
ventana = (mu >= LO) & (mu <= HI)
resto = y[ventana] - mu[ventana]

# Fig. 6. Adjacency of the grid, the estimate from a cell's own rows, and the same estimate with
# the springs of the CAR prior, at the posterior means of the hyperparameters. The browser repeats
# this relaxation live; here it is measured, and compared with the posterior median of u.
N = len(geo["i"])
indice = {(i, j): k for k, (i, j) in enumerate(zip(geo["i"], geo["j"]))}
vecinos = [[] for _ in range(N)]
for k, (i, j) in enumerate(zip(geo["i"], geo["j"])):
    for a, b in ([(0, -1), (0, 1), (-1, 0), (1, 0), (-1, 1), (1, 1)] if i & 1 else [(0, -1), (0, 1), (-1, -1), (1, -1), (-1, 0), (1, 0)]):
        q = indice.get((i + a, j + b))
        if q is not None:
            vecinos[k].append(q)
Y = np.array([geo["years"][str(a)] for a in range(2019, 2025)], float).T
b0, m, u_med = float(z["b0"]), z["m_med"], z["u_med"]
j = z["j"]
base = b0 + m[j]
propio = np.log(Y[:, :5].sum(1).clip(0.5) / np.exp(base).sum(1))
ALPHA, SU = r["alpha"], r["s_u"]
red = propio.copy()
grado = np.array([len(v) for v in vecinos], float)
traza = {0: propio.copy()}
for paso in range(1, 31):
    for k in range(N):
        suma = red[vecinos[k]].sum()
        for _ in range(2):
            mk = np.exp(base[k] + red[k])
            g = ((Y[k, :5] - mk) / (1 + mk / theta)).sum() - (grado[k] * red[k] - ALPHA * suma) / SU**2
            h = (mk * (1 + Y[k, :5] / theta) / (1 + mk / theta) ** 2).sum() + grado[k] / SU**2
            red[k] += np.clip(g / h, -1, 1)
    if paso in (1, 2, 4, 8, 30):
        traza[paso] = red.copy()
pocos, muchos = z["n_tr"] <= 5, z["n_tr"] > 100
x = np.array(geo["i"]) * 1.5
yc = np.array(geo["j"]) * 3**0.5 + (np.array(geo["i"]) % 2) * 3**0.5 / 2
centro = max(range(N), key=lambda k: (min(pocos[np.hypot(x - x[k], yc - yc[k]) < 5.5].sum(), muchos[np.hypot(x - x[k], yc - yc[k]) < 5.5].sum()), -k))
region = np.flatnonzero(np.hypot(x - x[centro], yc - yc[centro]) < 5.5)
draws = z["u_draws"][region][:, ::7][:, :56]

# Fig. 7. The run's own draws of the two hyperparameters
ac, sc = z["alpha_cadenas"], z["s_u_cadenas"]
par = np.stack([ac.ravel(), sc.ravel()])

# Fig. 8. The best baseline of the report's table: the mean of 2022 and 2023 with a Poisson
h_rec = Y[:, 3:5].mean(1) + 0.25
m0r_lo, m0r_hi = stats.poisson.ppf(0.05, h_rec), stats.poisson.ppf(0.95, h_rec)
y24 = Y[:, 5]
en = (z["med24"] >= LO) & (z["med24"] <= HI)
banda = y24[en] - z["med24"][en]
catarina = [str(v) for v in z["municipios"]].index("Santa Catarina")

out = {
    "source": "scripts/geostats-fit.py: the project's model, refitted with seed 42",
    "theta": round(theta, 2),
    "die": {
        "cell": int(cell[fila]),
        "municipality": str(z["municipios"][z["j"][cell[fila]]]),
        "mu": round(float(mu[fila]), 1),
        "y": int(y[fila]),
        "window": [LO, HI],
        "rows": int(ventana.sum()),
        "residuals": np.round(resto, 1).tolist(),
        "varianceRatio": round(float(resto.var() / mu[ventana].mean()), 1),
    },
    "hyper": {"alpha": round(r["alpha"], 3), "alpha94": [round(v, 2) for v in r["alpha_94"]], "su": round(r["s_u"], 2), "srw": round(r["s_rw"], 2)},
    "fit": {k: r[k] for k in ("divergencias", "rhat_max", "ess_min", "minutos")},
    "m": {"med": np.round(m, 2).tolist(), "lo": np.round(z["m_lo"], 2).tolist(), "hi": np.round(z["m_hi"], 2).tolist()},
    "catarinaJump": round(float(np.exp(m[catarina, 3] - m[catarina, 2]))),
    "u": np.round(u_med, 2).tolist(),
    "own": np.round(propio, 2).tolist(),
    "uSd": {"few": round(r["sd_u_le5"], 2), "many": round(r["sd_u_gt100"], 2), "fewCells": r["n_le5"]},
    "relax": {
        "corr": round(float(np.corrcoef(red, u_med)[0, 1]), 3),
        "few": round(float(np.abs(red - propio)[pocos].mean()), 2),
        "many": round(float(np.abs(red - propio)[muchos].mean()), 2),
    },
    "heat": {"centre": int(centro), "cells": region.tolist(), "sd": np.round(z["u_sd"][region], 2).tolist(), "n": z["n_tr"][region].astype(int).tolist(), "draws": np.round(draws.T, 2).tolist(), "path": [np.round(v[region], 2).tolist() for v in traza.values()]},
    "pair": {
        "mean": [round(float(v), 4) for v in par.mean(1)],
        "cov": np.round(np.cov(par), 6).tolist(),
        "alpha": np.round(ac[:, ::20], 3).tolist(),
        "su": np.round(sc[:, ::20], 3).tolist(),
    },
    "test": {
        "lo": z["lo24"].astype(int).tolist(), "hi": z["hi24"].astype(int).tolist(),
        "baseLo": m0r_lo.astype(int).tolist(), "baseHi": m0r_hi.astype(int).tolist(),
        "med": np.round(z["med24"], 1).tolist(),
        "coverage": round(float(((y24 >= z["lo24"]) & (y24 <= z["hi24"])).mean()) * 100, 1),
        "baseCoverage": round(float(((y24 >= m0r_lo) & (y24 <= m0r_hi)).mean()) * 100, 1),
        "band": {"seen": round(float(banda.var())), "nb": round(float((z["med24"][en] + z["med24"][en] ** 2 / theta).mean())), "poisson": round(float(z["med24"][en].mean()))},
        "total": round(r["suma_medianas"]),
        "recorded": r["observado_2024"],
    },
    "pearson": {
        "rows": int(len(y)),
        "poisson": round(float(((y - mu) ** 2 / mu).mean()), 2),
        "nb": round(float(((y - mu) ** 2 / (mu + mu * mu / theta)).mean()), 2),
    },
}
(ROOT / "src/data/geostats-model.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(out["pearson"], out["theta"], out["relax"], out["test"]["coverage"], out["test"]["baseCoverage"], len(region), draws.shape, out["pair"]["mean"])
print((ROOT / "src/data/geostats-model.json").stat().st_size // 1024, "KB")
