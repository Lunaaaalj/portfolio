// Fig. 4. One row of the panel as a die. A hopper sits over an axis of counts; its position is the
// rate, and each replay drops one grain to the count it produced. First the rate is fixed: a
// Poisson. The hollow outline is real: every training row expecting 45 to 75 reports, re-centred
// on this row's 60 by its fitted residual. Then the hopper is released and the rate is drawn
// afresh on each replay from a Gamma with the project's θ, which makes the count negative
// binomial. Ten thousand replays each way, computed here with seed 42.

import model from '../../../data/geostats-model.json';
import type { Scene } from '../engine';
import { ease, fmt, label, lerp, poisson, rgba, seg } from '../draw';
import { rng } from '../../../lib/tile';

const K = 10000, BIN = 4, LO = 8, HI = 128;
const { mu, residuals, y: recorded } = model.die, theta = model.theta;
const bins = Math.floor((HI - LO) / BIN);
const binOf = (x: number) => Math.max(0, Math.min(bins - 1, Math.floor((x - LO) / BIN)));

/** Gamma(shape, scale) by Marsaglia and Tsang, shape > 1. */
function gamma(shape: number, scale: number, r: () => number) {
  const d = shape - 1 / 3, c = 1 / Math.sqrt(9 * d);
  for (;;) {
    const x = Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
    const v = (1 + c * x) ** 3;
    if (v > 0 && Math.log(1 - r()) < 0.5 * x * x + d - d * v + d * Math.log(v)) return d * v * scale;
  }
}

/** Shares per bin of an exact distribution given by its first term and its ratio of terms. */
function exact(first: number, ratio: (k: number) => number) {
  const out = new Float64Array(bins);
  let pr = first;
  for (let k = 0; k <= HI + 2; k++) { if (k >= LO) out[binOf(k)] += pr; pr *= ratio(k); }
  return out;
}
const POISSON = exact(Math.exp(-mu), (k) => mu / (k + 1));
const NB = exact((theta / (theta + mu)) ** theta, (k) => ((k + theta) / (k + 1)) * (mu / (theta + mu)));

const r = rng(42);
const fixed = Array.from({ length: K }, () => poisson(mu, r));
const rates = Array.from({ length: K }, () => gamma(theta, mu / theta, r));
const free = rates.map((l) => poisson(l, r));
const real = new Float64Array(bins);
for (const e of residuals) real[binOf(mu + e)] += 1 / residuals.length;

const histogram = (xs: number[], n: number) => {
  const h = new Float64Array(bins);
  for (let k = 0; k < n; k++) h[binOf(xs[k])] += 1 / n;
  return h;
};

export default function die(): Scene {
  let x0 = 0, W = 0, base = 0, H = 0, gate = 0, wide = true;
  const top = Math.max(...POISSON) * 1.12;
  const X = (v: number) => x0 + ((v - LO) / (HI - LO)) * W;
  const Y = (share: number) => base - (share / top) * H;

  const curve = (g: CanvasRenderingContext2D, shares: Float64Array) => {
    g.beginPath();
    shares.forEach((s, b) => { const a = X(LO + b * BIN + BIN / 2); b ? g.lineTo(a, Y(s)) : g.moveTo(a, Y(s)); });
    g.stroke();
  };

  return {
    layout({ w, h }) {
      wide = w > 560;
      const side = wide ? 48 : 22;
      x0 = side; W = w - 2 * side;
      gate = wide ? 120 : 112; base = h - (wide ? 76 : 54); H = base - gate - (wide ? 90 : 44);
    },
    draw({ g, c, readout }, p) {
      const a = seg(p, 0.03, 0.33), showReal = ease(seg(p, 0.35, 0.45));
      const b = seg(p, 0.52, 0.82), fit = ease(seg(p, 0.84, 0.92));
      const unlocked = b > 0;
      const nA = a > 0 ? Math.min(K, Math.max(1, Math.round(10 ** (a * 4)))) : 0;
      const nB = b > 0 ? Math.min(K, Math.max(1, Math.round(10 ** (b * 4)))) : 0;

      // Axis of counts
      g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, base + 0.5); g.lineTo(x0 + W, base + 0.5); g.stroke();
      for (let v = 20; v <= 120; v += 20) {
        g.beginPath(); g.moveTo(X(v), base); g.lineTo(X(v), base + 4); g.stroke();
        label(g, String(v), X(v), base + 18, { size: 11, color: c.graphite, align: 'center' });
      }
      label(g, 'Reports in the year', x0 + W, base + 34, { size: 12, color: c.graphite, align: 'right' });

      // The replays, as bars
      const shown = unlocked ? histogram(free, nB) : nA ? histogram(fixed, nA) : null;
      if (shown) {
        const bw = (BIN / (HI - LO)) * W;
        g.fillStyle = unlocked ? rgba(c.survey, 0.72) : c.ramp[2];
        shown.forEach((s, q) => { if (s > 0) { const y = Math.max(gate + 26, Y(s)); g.fillRect(X(LO + q * BIN) + 0.5, y, bw - 1, base - y); } });
      }

      // The Poisson stays behind as a hairline once the die is released
      if (unlocked) {
        g.strokeStyle = rgba(c.graphite, 0.9); g.lineWidth = 1; g.setLineDash([3, 3]); curve(g, POISSON); g.setLineDash([]);
        label(g, 'Poisson', X(mu) + 6 + (wide ? 18 : 12), Y(Math.max(...POISSON)) + 12, { size: 12, color: c.graphite });
      }
      if (fit > 0) {
        g.globalAlpha = fit; g.strokeStyle = c.ink; g.lineWidth = 1.25; curve(g, NB); g.globalAlpha = 1;
        label(g, `Negative binomial, θ = ${theta.toFixed(1)}`, x0 + W, Y(NB[binOf(mu + 34)]) - (wide ? 18 : 52), { size: 12, color: c.ink, align: 'right', a: fit });
      }

      // The real rows, hollow
      if (showReal > 0) {
        g.globalAlpha = showReal; g.strokeStyle = c.hazard; g.lineWidth = 1.5; g.beginPath();
        let last = base;
        g.moveTo(x0, base);
        real.forEach((s, q) => {
          const x = X(LO + q * BIN), y = Y(s);
          g.lineTo(x, last); g.lineTo(x, y); last = y;
        });
        g.lineTo(x0 + W, last); g.stroke(); g.globalAlpha = 1;
        // Left of the peak, above where the widest bars will reach
        const lx = x0 + (wide ? 10 : 2), ly = Y(Math.max(...real));
        label(g, `${fmt(model.die.rows)} real rows`, lx, ly, { size: 12, weight: 500, color: c.hazard, a: showReal });
        label(g, 're-centred on this row', lx, ly + 16, { size: 12, color: c.graphite, a: showReal });
      }

      // The hopper. Locked, it sits on the expected count; released, it moves replay by replay
      const i = unlocked ? Math.max(0, nB - 1) : Math.max(0, nA - 1);
      const lambda = unlocked ? rates[i] : mu;
      const hx = X(lambda);
      if (unlocked) {
        g.fillStyle = rgba(c.ink, 0.28);
        for (let q = 1; q <= 90 && i - q >= 0; q++) g.fillRect(X(rates[i - q]) - 0.5, gate - 2, 1, 10);
      }
      g.strokeStyle = c.rule; g.lineWidth = 1; g.beginPath(); g.moveTo(x0, gate + 8.5); g.lineTo(x0 + W, gate + 8.5); g.stroke();
      g.fillStyle = c.ink; g.beginPath(); g.moveTo(hx - 15, gate - 24); g.lineTo(hx + 15, gate - 24); g.lineTo(hx + 3, gate); g.lineTo(hx - 3, gate); g.closePath(); g.fill();
      label(g, unlocked ? 'rate, drawn on each replay' : 'rate, fixed', hx + (hx > x0 + W * 0.62 ? -22 : 22), gate - 10, { size: 12, color: c.graphite, align: hx > x0 + W * 0.62 ? 'right' : 'left' });

      // Grains in flight, from the hopper's place on their own replay down to their count
      const n = unlocked ? nB : nA, xs = unlocked ? free : fixed;
      if (n > 0 && n < K) {
        g.fillStyle = c.survey;
        for (let q = 0; q < Math.min(n, 26); q++) {
          const t = (q + 1) / 27, e = i - q;
          const l = unlocked ? rates[e] : mu, sx = X(l), ex = X(xs[e]);
          g.fillRect(lerp(sx, ex, t) - 1.5, lerp(gate, base - 8, t * t), 3, 3);
        }
      }

      // What was recorded
      if (a >= 1 || unlocked) {
        const tick = X(recorded);
        g.strokeStyle = c.ink; g.lineWidth = 1.5; g.beginPath(); g.moveTo(tick, base); g.lineTo(tick, base + 7); g.stroke();
      }

      if (fit > 0) readout(`Pearson, all ${fmt(model.pearson.rows)} rows\nPoisson ${model.pearson.poisson.toFixed(2)}\nnegative binomial ${model.pearson.nb.toFixed(2)}`);
      else if (unlocked) readout(`${fmt(nB)} ${nB === 1 ? 'replay' : 'replays'}\nrate ${lambda.toFixed(1)}`);
      else if (showReal > 0) readout(`real rows: variance\n${model.die.varianceRatio} × the die’s`);
      else readout(`${fmt(nA)} ${nA === 1 ? 'replay' : 'replays'}\nrate ${mu.toFixed(1)}\n${recorded} recorded`);
    },
  };
}
