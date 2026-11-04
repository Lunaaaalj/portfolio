"""Refits the project's hierarchical model and keeps what the GeoStats scenes draw.

    cd <GeoStats> && PYTHONPATH=src .venv/bin/python <portfolio>/scripts/geostats-fit.py <outdir>

The same code as GeoStats notebooks/modelo_jerarquico.qmd, sections 1 to 7, seed 42, about four
minutes. The notebook saves no posterior, so this writes one to <outdir>, outside the repository:
refit.json (diagnostics and validation, to compare with the report) and posterior.npz.
scripts/extract-geostats-model.py turns that into src/data/geostats-model.json.
"""
import sys, time, warnings, json
warnings.filterwarnings("ignore")
import numpy as np, pandas as pd, geopandas as gpd, pymc as pm, arviz as az
from libpysal import weights
from geostats import espacial, rutas
OUT = sys.argv[1]
SEMILLA = 42
rng = np.random.default_rng(SEMILLA)
g = gpd.read_parquet(rutas.ATUS_ZMM_LIMPIO_GEO).to_crs(espacial.UTM_ZMM)
H, W = espacial.celdas(g, lado=500)
assert len(H) == 2241 and len(W.islands) == 0
union = gpd.sjoin(g[["geometry", "ANIO", "NOM_MUN"]], H[["hex", "geometry"]], predicate="within", how="inner")
ANIOS = list(range(2019, 2025))
indice = pd.MultiIndex.from_product([H.hex, ANIOS], names=["hex", "anio"])
p = union.groupby(["hex", "ANIO"]).size().reindex(indice, fill_value=0).rename("y").reset_index()
municipio = union.groupby("hex").NOM_MUN.agg(lambda s: s.mode().iloc[0])
p["municipio"] = p.hex.map(municipio)
MUNICIPIOS = sorted(municipio.unique())
hex_a_i = {h: i for i, h in enumerate(H.hex)}; mun_a_j = {m: j for j, m in enumerate(MUNICIPIOS)}
p["i"] = p.hex.map(hex_a_i); p["j"] = p.municipio.map(mun_a_j); p["a"] = p.anio - 2019
tr = p[p.anio <= 2023].reset_index(drop=True); te = p[p.anio == 2024].reset_index(drop=True)
N_HEX, N_MUN, N_ANIOS = len(H), len(MUNICIPIOS), 5
print("filas", len(tr), len(te), flush=True)
Wb = weights.W(W.neighbors); Wb.transform = "b"; A = Wb.full()[0]
assert (A == A.T).all()
with pm.Model() as modelo:
    b0 = pm.Normal("b0", np.log(tr.y.mean() + 1), 2)
    s_m = pm.HalfNormal("s_m", 1.5); s_rw = pm.HalfNormal("s_rw", 0.5)
    z0 = pm.ZeroSumNormal("z0", sigma=1, shape=N_MUN)
    eps = pm.StudentT("eps", nu=3, mu=0, sigma=1, shape=(N_MUN, N_ANIOS - 1))
    m0 = (s_m * z0)[:, None]
    m = pm.Deterministic("m", pm.math.concatenate([m0, m0 + pm.math.cumsum(s_rw * eps, axis=1)], axis=1))
    alpha = pm.Beta("alpha", 2, 1); s_u = pm.HalfNormal("s_u", 1.5)
    u = pm.CAR("u", mu=np.zeros(N_HEX), W=A, alpha=alpha, tau=1 / s_u**2, shape=N_HEX)
    theta = pm.Gamma("theta", 2, 0.1)
    log_mu = pm.Deterministic("log_mu", b0 + m[tr.j.values, tr.a.values] + u[tr.i.values])
    pm.NegativeBinomial("y", mu=pm.math.exp(log_mu), alpha=theta, observed=tr.y.values)
t0 = time.time()
idata = pm.sample(draws=2000, tune=1000, chains=4, nuts_sampler="nutpie", random_seed=SEMILLA, progressbar=False, model=modelo)
print("min", round((time.time() - t0) / 60, 1), flush=True)
post = az.extract(idata)
res = {"minutos": (time.time() - t0) / 60, "divergencias": int(idata.sample_stats.diverging.sum())}
sm = az.summary(idata, var_names=["log_mu"], kind="diagnostics")
res |= {"rhat_max": float(sm.r_hat.max()), "ess_min": float(sm.ess_bulk.min())}
for n in ["alpha", "theta", "s_rw", "s_u"]:
    res[n] = float(post[n].mean())
res["alpha_94"] = [float(np.percentile(post.alpha, 3)), float(np.percentile(post.alpha, 97))]
u_post = post.u.values; m_post = post.m.values; theta_post = post.theta.values
m_2023 = m_post[:, -1, :]; y24 = te.y.values
lam = np.exp(post.b0.values[None, :] + m_2023[te.j.values, :] + u_post[te.i.values, :])
y_sim = rng.negative_binomial(theta_post[None, :], theta_post[None, :] / (theta_post[None, :] + lam))
lo, hi = np.percentile(y_sim, [5, 95], axis=1)
res["cobertura90"] = float(((y24 >= lo) & (y24 <= hi)).mean())
res["mae"] = float(np.abs(y24 - np.median(lam, axis=1)).mean())
s = np.sort(y_sim, axis=1).astype(float); K = s.shape[1]
crps = np.abs(s - y24[:, None]).mean(1) - (s * (2 * np.arange(1, K + 1) - K - 1)).sum(1) / K**2
res["crps"] = float(crps.mean())
res["suma_medianas"] = float(np.median(lam, axis=1).sum()); res["observado_2024"] = int(y24.sum())
n_tr = tr.groupby("i").y.sum().reindex(range(N_HEX)).values
sd = u_post.std(axis=1)
res["sd_u_le5"] = float(sd[n_tr <= 5].mean()); res["n_le5"] = int((n_tr <= 5).sum()); res["sd_u_gt100"] = float(sd[n_tr > 100].mean())
print(json.dumps(res, indent=1), flush=True)
json.dump(res, open(f"{OUT}/refit.json", "w"), indent=1)
# Medians and spreads per cell, thinned draws, and the chains of two hyperparameters
az_post = idata.posterior
cadena = lambda n: np.asarray(az_post[n].values)
paso = u_post.shape[1] // 400
np.savez_compressed(
    f"{OUT}/posterior.npz",
    hex=H.hex.values, municipios=np.array(MUNICIPIOS), j=te.j.values,
    n_tr=n_tr, y24=y24, lo24=lo, hi24=hi, med24=np.median(lam, axis=1),
    u_med=np.median(u_post, axis=1), u_sd=sd, u_draws=u_post[:, ::paso].astype("float32"),
    m_med=np.median(m_post, axis=2), m_lo=np.percentile(m_post, 5, axis=2), m_hi=np.percentile(m_post, 95, axis=2),
    b0=np.median(post.b0.values), s_m=float(post.s_m.mean()),
    alpha_cadenas=cadena("alpha").astype("float32"), s_u_cadenas=cadena("s_u").astype("float32"),
    tr_i=tr.i.values, tr_a=tr.a.values, tr_y=tr.y.values,
    tr_log_mu=np.median(post.log_mu.values, axis=1).astype("float32"),
)
print("listo", flush=True)
