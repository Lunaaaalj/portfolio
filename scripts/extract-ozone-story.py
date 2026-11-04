"""Extracts what the ozone scroll scenes draw into src/data/ozone-story.json.

    cd <MA2003B.102.07>
    python src/importar_datos.py --solo bd && python src/limpieza.py
    <python with pandas, pyarrow, statsmodels, scikit-learn> <portfolio>/scripts/extract-ozone-story.py

Reads the project's own files in data/processed. The project's models are written in R; they are
refitted here with the same specification and the same split, and every result the page states is
checked against the report (reports/secciones). The script refuses to run if one differs.

Odds ratios of the factors are per standard deviation of the score over 2021-2024, as in the
report; they recompute to within 0.01 of its table, which the checks allow. Both Youden thresholds
are fixed on the fitting years (0.322 for the logistic model, 0.327 for the metropolitan one).

The specimen, the one day the page follows, is chosen by a rule rather than by hand: the spring
days of 2025 at station NO that exceeded 51 ppb, and of those the one with the median predicted
probability.
"""

import json
import pathlib

import numpy as np
import pandas as pd
import statsmodels.api as sm
import statsmodels.formula.api as smf
from sklearn.discriminant_analysis import LinearDiscriminantAnalysis
from sklearn.metrics import roc_auc_score, roc_curve

ROOT = pathlib.Path.cwd()
DATA = ROOT / "data/processed"
OUT = pathlib.Path(__file__).resolve().parents[1] / "src/data/ozone-story.json"
SEMILLA = 42
BINOMIAL = sm.families.Binomial()


def near(value, expected, tol, what):
    assert abs(value - expected) <= tol, f"{what}: {value} against {expected} in the report"


def r(x, d=3):
    return [None if pd.isna(v) else round(float(v), d) for v in x]


def odds(frame, formula):
    return smf.glm(formula, frame, family=BINOMIAL).fit()


# ---------------------------------------------------------------- the tables
af = pd.read_parquet(DATA / "af_puntajes_diarios.parquet").rename(columns={"F1": "comb", "F2": "vent", "F3": "foto"})
di = pd.read_parquet(DATA / "sima_transformado_diario.parquet")
crudo = pd.read_parquet(DATA / "sima_horario.parquet")
limpio = pd.read_csv(DATA / "sima_limpio_horario.csv", parse_dates=["fecha"])
assert len(limpio) == 640583 and len(di) == 26691
assert di.MDA8.notna().sum() == 25100

# ---------------------------------------------------------------- the threshold
excede65 = (di.MDA8.dropna() > 65).mean()
excede51 = (di.MDA8.dropna() > 51).mean()
near(excede65 * 100, 11.25, 0.01, "exceedance at 65 ppb")
near(excede51 * 100, 31.96, 0.01, "exceedance at 51 ppb")
bordes = np.arange(0, 121, 2)
hist_mda8 = np.histogram(di.MDA8.dropna().clip(upper=119.9), bins=bordes)[0].tolist()

# ---------------------------------------------------------------- day-station models
m = af.merge(di, on=["estacion", "fecha"]).dropna(subset=["comb", "vent", "foto", "excede_anio_5"]).copy()
m["y"] = m.excede_anio_5.astype(int)
ajuste = m.particion == "entrenamiento"
media, desv = m.loc[ajuste, ["comb", "vent", "foto"]].mean(), m.loc[ajuste, ["comb", "vent", "foto"]].std()
for v in ("comb", "vent", "foto"):
    m[f"z_{v}"] = (m[v] - media[v]) / desv[v]
tr, va = m[ajuste], m[~ajuste]
assert len(va) == 2927

FORMULA = ("y ~ z_comb + z_vent + z_foto + C(zona, Treatment('Noreste'))"
           " + C(tipo_dia, Treatment('laborable')) + C(temporada, Treatment('invierno'))")
logit = odds(tr, FORMULA)
pva = logit.predict(va)
auc_log = roc_auc_score(va.y, pva)
near(auc_log, 0.850, 0.0005, "logistic AUC")
momios = np.exp(logit.params)


def coef(zona=None, tipo=None, temporada=None):
    if zona:
        return f"C(zona, Treatment('Noreste'))[T.{zona}]"
    if tipo:
        return f"C(tipo_dia, Treatment('laborable'))[T.{tipo}]"
    return f"C(temporada, Treatment('invierno'))[T.{temporada}]"


for clave, reporte in {
    "z_comb": 1.92, "z_vent": 0.90, "z_foto": 2.78,
    coef(zona="Noroeste"): 3.84, coef(zona="Suroeste"): 3.48,
    coef(temporada="primavera"): 3.54, coef(temporada="otoño"): 3.04, coef(temporada="verano"): 1.54,
    coef(tipo="domingo"): 1.43, coef(tipo="sabado"): 1.13,
}.items():
    near(momios[clave], reporte, 0.011, clave)

X = pd.concat([m[["z_comb", "z_vent", "z_foto"]],
               pd.get_dummies(m[["zona", "tipo_dia", "temporada"]], dtype=float)
               .drop(columns=["zona_Noreste", "tipo_dia_laborable", "temporada_invierno"])], axis=1)
lda = LinearDiscriminantAnalysis().fit(X[ajuste], tr.y)
pva_lda = lda.predict_proba(X[~ajuste])[:, 1]
auc_lda = roc_auc_score(va.y, pva_lda)
near(auc_lda, 0.846, 0.0005, "discriminant AUC")
corr_modelos = float(np.corrcoef(pva, pva_lda)[0, 1])
near(corr_modelos, 0.996, 0.001, "correlation of the two models")

fpr, tpr, cortes = roc_curve(tr.y, logit.fittedvalues)
youden = float(cortes[(tpr - fpr).argmax()])
near(youden, 0.322, 0.001, "Youden threshold fixed on 2021-2024")
near(float((pva[va.y == 1] >= youden).mean()), 0.615, 0.0006, "logistic sensitivity")
near(float((pva[va.y == 0] < youden).mean()), 0.890, 0.0006, "logistic specificity")
sens = float((pva[va.y == 1] >= youden).mean())
espec = float((pva[va.y == 0] < youden).mean())
fpr_l, tpr_l, cortes_l = roc_curve(tr.y, lda.predict_proba(X[ajuste])[:, 1])
youden_lda = float(cortes_l[(tpr_l - fpr_l).argmax()])
coincidencia = float(((pva >= youden) == (pva_lda >= youden_lda)).mean())

# ---------------------------------------------------------------- the specimen
elegibles = va.assign(p=pva).query("estacion == 'NO' and temporada == 'primavera' and y == 1").sort_values("p")
assert len(elegibles) >= 5
especimen = elegibles.iloc[(len(elegibles) - 1) // 2]
dia = especimen.fecha
horas = limpio[(limpio.estacion == "NO") & (limpio.fecha >= dia) & (limpio.fecha < dia + pd.Timedelta(days=1))].sort_values("fecha")
previas = limpio[(limpio.estacion == "NO") & (limpio.fecha >= dia - pd.Timedelta(hours=7)) & (limpio.fecha < dia)].sort_values("fecha")
assert len(horas) == 24 and len(previas) == 7
near(float(horas.O3_8h.max()), float(especimen.MDA8), 1e-6, "MDA8 of the specimen")

terminos = [
    ("Photochemical forcing", float(logit.params["z_foto"] * especimen.z_foto)),
    ("Primary combustion", float(logit.params["z_comb"] * especimen.z_comb)),
    ("Ventilation", float(logit.params["z_vent"] * especimen.z_vent)),
    ("Spring", float(logit.params[coef(temporada="primavera")])),
    ("Northwest", float(logit.params[coef(zona="Noroeste")])),
]
if especimen.tipo_dia != "laborable":
    terminos.append(({"sabado": "Saturday", "domingo": "Sunday", "festivo": "Holiday"}[especimen.tipo_dia],
                     float(logit.params[coef(tipo=especimen.tipo_dia)])))
near(float(logit.params["Intercept"]) + sum(t[1] for t in terminos), float(np.log(especimen.p / (1 - especimen.p))), 1e-6, "the specimen's log-odds")

# ---------------------------------------------------------------- the strip chart
# Real stretches of the raw readings, before cleaning: a saturated sensor, the logger's missing
# code, and a stretch with a short gap beside a long one.
c = crudo[crudo.anio >= 2021].sort_values(["estacion", "fecha"])
pm = c[(c.estacion == "NE") & (c.fecha >= "2023-04-28") & (c.fecha < "2023-05-02")]
assert pm.PM10.max() == 1000
mejor = None
for variable in ("RH", "TOUT", "WSR"):
    for _, fila in c[c[variable] == -9999].iterrows():
        tramo = c[(c.estacion == fila.estacion) & (c.fecha >= fila.fecha - pd.Timedelta(hours=48)) & (c.fecha < fila.fecha + pd.Timedelta(hours=48))]
        if len(tramo) == 96 and (mejor is None or tramo[variable].notna().sum() > mejor[2][variable].notna().sum()):
            mejor = (variable, fila, tramo)
variable_codigo, codigo, tira = mejor


def huecos(s):
    na = s.isna().to_numpy().astype(int)
    d = np.diff(np.concatenate([[0], na, [0]]))
    return list(zip(np.where(d == 1)[0], np.where(d == -1)[0] - np.where(d == 1)[0]))


cruda_o3 = None
for f, g in c[(c.estacion == "NO") & (c.anio >= 2021)].set_index("fecha").groupby(pd.Grouper(freq="6D")):
    if len(g) < 144:
        continue
    largos = [n for _, n in huecos(g.O3)]
    if any(1 <= n <= 3 for n in largos) and any(n >= 12 for n in largos):
        cruda_o3 = g
        break
assert cruda_o3 is not None
fechas_o3 = cruda_o3.index
limpia_o3 = limpio[(limpio.estacion == "NO") & limpio.fecha.isin(fechas_o3)].sort_values("fecha")
assert len(limpia_o3) == len(cruda_o3)

# ---------------------------------------------------------------- the rubber rule
parametros = pd.read_csv(DATA / "transformacion_diaria_parametros.csv").set_index("variable")
rush = limpio[limpio.fecha.dt.hour.isin([6, 7, 8, 9])].assign(dia=lambda d: d.fecha.dt.normalize())
g = rush.groupby(["estacion", "dia"]).NO
no_rush = g.mean()[g.count() >= 3]
sesgo = float(no_rush.skew())
near(sesgo, parametros.loc["NO_06_09", "sesgo_antes"], 0.05, "skew of NO 06-09")
muestra_no = no_rush.sample(1400, random_state=SEMILLA).sort_values()

# ---------------------------------------------------------------- the day's clock
reloj = limpio.groupby(limpio.fecha.dt.hour)[["O3", "NO", "NO2", "SR", "TOUT"]].median()
assert len(reloj) == 24

# ---------------------------------------------------------------- the lamp
# A cloud of 900 fitting days in three correlated summaries, in standard units: the lamp is
# searched in the browser. The 15-variable result is the report's.
nube = di[(di.anio <= 2024)][["NO_06_09", "NOX_06_09", "NO2_06_09"]].dropna().sample(900, random_state=SEMILLA)

# ---------------------------------------------------------------- the marionette
cargas = pd.read_csv(DATA / "af_cargas.csv", index_col=0)
L = cargas[["Combustión primaria", "Ventilación", "Forzamiento fotoquímico"]].to_numpy()
near(float(cargas.comunalidad["PRS_media"]), 0.13, 0.005, "communality of pressure")
# The same solution before rotation: the principal-axis form of the rotated loadings.
U, S, Vt = np.linalg.svd(L, full_matrices=False)
L0 = U * S
for k in range(3):
    if L0[np.abs(L0[:, k]).argmax(), k] < 0:
        L0[:, k] *= -1
# The rotation that carries one onto the other, a proper rotation so that it can be turned.
giro = np.linalg.lstsq(L0, L, rcond=None)[0]
if np.linalg.det(giro) < 0:
    L0[:, 2] *= -1
    giro = np.linalg.lstsq(L0, L, rcond=None)[0]
assert np.abs(giro @ giro.T - np.eye(3)).max() < 1e-6 and np.abs(L0 @ giro - L).max() < 1e-6

# ---------------------------------------------------------------- the valley
# Coordinates and elevations: table of reports/secciones/contexto_estaciones.tex.
ESTACIONES = [
    ("SE3", "Sureste", 334, 25 + 36 / 60, 100 + 0 / 60), ("NE3", "Noreste", 346, 25 + 47 / 60, 100 + 5 / 60),
    ("SE2", "Sureste", 387, 25 + 39 / 60, 100 + 6 / 60), ("NE2", "Noreste", 432, 25 + 47 / 60, 100 + 11 / 60),
    ("NE", "Noreste", 474, 25 + 45 / 60, 100 + 15 / 60), ("SE", "Sureste", 500, 25 + 40 / 60, 100 + 15 / 60),
    ("NTE", "Norte", 503, 25 + 48 / 60, 100 + 20 / 60), ("NTE2", "Norte", 520, 25 + 44 / 60, 100 + 19 / 60),
    ("SUR", "Sur", 555, 25 + 37 / 60, 100 + 16 / 60), ("CE", "Centro", 562, 25 + 41 / 60, 100 + 20 / 60),
    ("NO", "Noroeste", 568, 25 + 46 / 60, 100 + 22 / 60), ("NO3", "Noroeste", 607, 25 + 46 / 60, 100 + 28 / 60),
    ("SO2", "Suroeste", 636, 25 + 40 / 60, 100 + 25 / 60), ("SO", "Suroeste", 674, 25 + 41 / 60, 100 + 27 / 60),
    ("NO2", "Noroeste", 702, 25 + 48 / 60, 100 + 35 / 60),
]
validos = di.dropna(subset=["MDA8"])
tasa = validos.groupby("estacion").excede_anio_5.mean().astype(float)
por_temporada = validos.groupby(["estacion", "temporada"], observed=True).excede_anio_5.mean().astype(float).unstack()
elev = pd.Series({e[0]: e[2] for e in ESTACIONES})
assert (validos.groupby("estacion").msnm.first().astype(float).reindex(elev.index) == elev.astype(float)).all(), "the elevations differ from the report's table"
corr_elev = float(np.corrcoef(elev[tasa.index], tasa)[0, 1])
near(corr_elev, 0.827, 0.001, "elevation against exceedance rate")
est = [{
    "code": e[0], "zone": e[1], "msnm": e[2], "lat": round(e[3], 4), "lon": round(e[4], 4), "rate": round(float(tasa[e[0]]), 3),
    "seasons": {k: round(float(por_temporada.loc[e[0], k]), 3) for k in ("invierno", "primavera", "verano", "otoño")},
} for e in ESTACIONES]

# ---------------------------------------------------------------- the metropolitan series
a = m.groupby("fecha").agg(comb=("comb", "mean"), vent=("vent", "mean"), foto=("foto", "mean"), k=("y", "sum"), n=("estacion", "nunique"))
a = a.reindex(pd.date_range(a.index.min(), a.index.max(), freq="D"))
a["frac"] = a.k / a.n
for v in ("comb", "vent", "foto", "frac"):
    a[v] = a[v].interpolate()
a["y"] = (a.frac >= 0.5).astype(int)
a["anio"] = a.index.year
doy = a.index.dayofyear
a["s1"], a["c1"] = np.sin(2 * np.pi * doy / 365.25), np.cos(2 * np.pi * doy / 365.25)
a["s2"], a["c2"] = np.sin(4 * np.pi * doy / 365.25), np.cos(4 * np.pi * doy / 365.25)
for k in range(1, 8):
    a[f"y{k}"] = a.y.shift(k)
TR, VA = a[(a.anio <= 2024) & a.y7.notna()], a[(a.anio == 2025) & a.y1.notna()]
FINAL = "y ~ s1 + c1 + s2 + c2 + comb + vent + foto + I(vent ** 2) + I(foto ** 2) + y1"
ar = odds(TR, FINAL)
par = ar.predict(VA)
auc_ar = roc_auc_score(VA.y, par)
near(auc_ar, 0.898, 0.0005, "autoregressive AUC")
near(float(np.exp(ar.params["y1"])), 3.83, 0.005, "odds ratio of yesterday")
auc_clima = roc_auc_score(VA.y, odds(TR, "y ~ s1 + c1 + s2 + c2").predict(VA))
auc_pers = roc_auc_score(VA.y, odds(TR, "y ~ y1").predict(VA))
near(auc_clima, 0.668, 0.0006, "climatology AUC")
near(auc_pers, 0.717, 0.0006, "persistence AUC")
fpr, tpr, cortes = roc_curve(TR.y, ar.fittedvalues)
umbral_ar = float(cortes[(tpr - fpr).argmax()])
near(umbral_ar, 0.327, 0.001, "metropolitan threshold")
vp = int(((par >= umbral_ar) & (VA.y == 1)).sum())
fp = int(((par >= umbral_ar) & (VA.y == 0)).sum())
assert (vp, fp, int(VA.y.sum()), len(VA)) == (129, 31, 170, 365)
near(float(par.mean()), 0.338, 0.0006, "mean prediction for 2025")
near(float(VA.y.mean()), 0.466, 0.0006, "mean observed in 2025")

# Leave one year out, the report's estimate of generalisation
Ap = a[a.y1.notna()]
afuera = {Y: (Ap[Ap.anio == Y].y, odds(Ap[Ap.anio != Y], FINAL).predict(Ap[Ap.anio == Y])) for Y in range(2021, 2026)}
auc_anio = {Y: roc_auc_score(*v) for Y, v in afuera.items()}
near(auc_anio[2021], 0.840, 0.0006, "AUC leaving out 2021")
near(auc_anio[2024], 0.915, 0.0006, "AUC leaving out 2024")
auc_agrupado = roc_auc_score(pd.concat([afuera[Y][0] for Y in range(2021, 2025)]), pd.concat([afuera[Y][1] for Y in range(2021, 2025)]))
near(auc_agrupado, 0.878, 0.0006, "pooled AUC leaving one year out")

# ---------------------------------------------------------------- memory
T = a[a.anio <= 2024]
P = pd.crosstab(T.y.to_numpy()[:-1], T.y.to_numpy()[1:], normalize="index").to_numpy()
lam = float(np.sort(np.abs(np.linalg.eigvals(P)))[0])
near(lam, 0.458, 0.0006, "second eigenvalue")
base = float(P[0, 1] / (P[0, 1] + P[1, 0]))
near(base, 0.301, 0.0006, "stationary rate")
M, brecha = np.eye(2), []
for h in range(1, 7):
    M = M @ P
    brecha.append(float(M[1, 1] - M[0, 1]))
near(brecha[0], 0.458, 0.0006, "gap at one day")
near(brecha[2], 0.096, 0.0006, "gap at three days")

# ---------------------------------------------------------------- the horizon
A = a.copy()
A["y_ult"] = A.y.shift(1)
filas = []
for h in range(0, 8):
    dia_obj = (A.index + pd.Timedelta(days=h)).dayofyear
    D = A.assign(s1h=np.sin(2 * np.pi * dia_obj / 365.25), c1h=np.cos(2 * np.pi * dia_obj / 365.25),
                 s2h=np.sin(4 * np.pi * dia_obj / 365.25), c2h=np.cos(4 * np.pi * dia_obj / 365.25),
                 Y=A.y.shift(-h), combf=A.comb.shift(-h), ventf=A.vent.shift(-h), fotof=A.foto.shift(-h))
    rez = "y_ult" if h == 0 else "y"
    D = D[D.Y.notna() & D.y_ult.notna()]
    tr_h, va_h = D[D.anio <= 2024], D[D.anio == 2025]
    cal = "s1h + c1h + s2h + c2h"
    ajusta = lambda f: roc_auc_score(va_h.Y, odds(tr_h, f).predict(va_h))
    filas.append({
        "h": h,
        "forecast": round(ajusta(f"Y ~ {cal} + comb + vent + foto + I(vent ** 2) + I(foto ** 2) + {rez}"), 3),
        "climatology": round(ajusta(f"Y ~ {cal}"), 3),
        "oracle": round(ajusta(f"Y ~ {cal} + combf + ventf + fotof + {rez}"), 3),
    })
horizonte = {f["h"]: f for f in filas}
near(horizonte[1]["forecast"], 0.779, 0.0011, "forecast at one day")
near(horizonte[1]["climatology"], 0.667, 0.0011, "climatology at one day")
near(horizonte[2]["forecast"], 0.704, 0.0011, "forecast at two days")
near(horizonte[7]["oracle"], 0.868, 0.0011, "oracle at seven days")

# ---------------------------------------------------------------- out
orden = np.argsort(pva.to_numpy())
out = {
    "source": "Lunaaaalj/MA2003B.102.07 data/processed, refitted (SIMA, 2021–2025); figures checked against reports/secciones",
    "facts": {
        "hours": int(len(limpio)), "dayStations": int(len(di)), "validMda8": int(di.MDA8.notna().sum()), "modelRows": int(len(m)),
        "validation": int(len(va)), "over65": round(float(excede65) * 100, 2), "over51": round(float(excede51) * 100, 2),
        "constant": round((1 - float(excede65)) * 100, 2), "skewBefore": round(float(parametros.loc["NO_06_09", "sesgo_antes"]), 2),
        "skewAfter": round(float(parametros.loc["NO_06_09", "sesgo_despues"]), 3), "lambdaNo": round(float(parametros.loc["NO_06_09", "lambda"]), 3),
        "elevationCorr": round(corr_elev, 2), "tucker": [0.973, 0.939, 0.924],
    },
    "specimen": {
        "station": "NO", "zone": str(especimen.zona), "date": dia.strftime("%Y-%m-%d"), "label": dia.strftime("%-d %B %Y"),
        "weekday": dia.strftime("%A"), "dayType": str(especimen.tipo_dia), "mda8": round(float(especimen.MDA8), 2),
        "o3": r(horas.O3, 1), "before": r(previas.O3, 1), "o3_8h": r(horas.O3_8h, 2),
        "no": r(horas.NO, 1), "sr": r(horas.SR, 3), "peakWindow": int(horas.O3_8h.to_numpy().argmax()),
        "z": {"comb": round(float(especimen.z_comb), 2), "vent": round(float(especimen.z_vent), 2), "foto": round(float(especimen.z_foto), 2)},
        "p": round(float(especimen.p), 3), "pLda": round(float(pva_lda[list(va.index).index(especimen.name)]), 3),
        "terms": [[k, round(v, 3)] for k, v in terminos], "intercept": round(float(logit.params["Intercept"]), 3), "candidates": int(len(elegibles)),
        "noRush": round(float(no_rush[("NO", dia)]), 2),
    },
    "threshold": {"edges": [0, 120, 2], "hist": hist_mda8},
    "strip": {
        "saturated": {"station": "NE", "variable": "PM10", "from": pm.fecha.iloc[0].strftime("%-d %b %Y"), "y": r(pm.PM10, 0)},
        "code": {"station": str(codigo.estacion), "variable": variable_codigo, "from": tira.fecha.iloc[0].strftime("%-d %b %Y"), "y": r(tira[variable_codigo], 1)},
        "gaps": {"station": "NO", "variable": "O3", "from": fechas_o3[0].strftime("%-d %b %Y"), "raw": r(cruda_o3.O3, 1), "clean": r(limpia_o3.O3, 1)},
    },
    "rule": {"no": r(muestra_no, 2), "lambda": round(float(parametros.loc["NO_06_09", "lambda"]), 6)},
    "clock": {"o3": r(reloj.O3, 1), "no": r(reloj.NO, 1), "no2": r(reloj.NO2, 1), "sr": r(reloj.SR, 3), "tout": r(reloj.TOUT, 1)},
    "lamp": {"names": ["NO, 06–09 h", "NOₓ, 06–09 h", "NO₂, 06–09 h"], "points": [r(p, 2) for p in nube.to_numpy()]},
    "factors": {
        "names": ["Primary combustion", "Ventilation", "Photochemical forcing"],
        "variables": cargas.index.tolist(), "rotated": [r(f) for f in L], "unrotated": [r(f, 5) for f in L0], "rotation": [r(f, 6) for f in giro],
        "communality": r(cargas.comunalidad),
    },
    "balance": {
        "intercept": round(float(logit.params["Intercept"]), 3),
        "beta": {"forcing": round(float(logit.params["z_foto"]), 3), "combustion": round(float(logit.params["z_comb"]), 3), "ventilation": round(float(logit.params["z_vent"]), 3),
                 "spring": round(float(logit.params[coef(temporada="primavera")]), 3), "autumn": round(float(logit.params[coef(temporada="otoño")]), 3),
                 "summer": round(float(logit.params[coef(temporada="verano")]), 3), "northwest": round(float(logit.params[coef(zona="Noroeste")]), 3),
                 "southwest": round(float(logit.params[coef(zona="Suroeste")]), 3), "sunday": round(float(logit.params[coef(tipo="domingo")]), 3)},
    },
    "gate": {
        "p": r(pva.to_numpy()[orden], 3), "y": va.y.to_numpy()[orden].astype(int).tolist(), "pLda": r(pva_lda[orden], 3),
        "auc": round(auc_log, 3), "aucLda": round(auc_lda, 3), "threshold": round(youden, 3), "sensitivity": round(sens, 3), "specificity": round(espec, 3),
        "agreement": round(coincidencia * 100, 1), "corr": round(corr_modelos, 3),
    },
    "stations": est,
    "centroid": {"lat": round(float(np.mean([e[3] for e in ESTACIONES])), 2), "lon": round(float(np.mean([e[4] for e in ESTACIONES])), 2)},
    "memory": {"P": [r(f) for f in P], "lambda": round(lam, 3), "gap": r(brecha), "stationary": round(base, 3), "orYesterday": round(float(np.exp(ar.params["y1"])), 2)},
    "year": {
        "days": [[round(float(pp), 3), int(yy)] for pp, yy in zip(par, VA.y)], "threshold": round(umbral_ar, 3), "hits": vp, "falseAlarms": fp, "exceedances": 170,
        "auc": round(auc_ar, 3), "climatology": round(auc_clima, 3), "persistence": round(auc_pers, 3), "meanPredicted": round(float(par.mean()), 3), "meanObserved": round(float(VA.y.mean()), 3),
        "leaveOut": {str(k): round(float(v), 3) for k, v in auc_anio.items()}, "pooled": round(float(auc_agrupado), 3),
        "prevalence": {str(k): round(float(v), 3) for k, v in a.groupby("anio").y.mean().items()},
    },
    "horizon": filas,
}
OUT.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print(f"{OUT.name}: {OUT.stat().st_size / 1024:.0f} KB")
print(f"specimen: {out['specimen']['station']} {out['specimen']['label']} ({out['specimen']['weekday']}), MDA8 {out['specimen']['mda8']}, p {out['specimen']['p']}, of {len(elegibles)}")
print(f"agreement {coincidencia:.3f}, threshold {youden:.3f}, sens {sens:.3f}, spec {espec:.3f}")
print(json.dumps(filas))
