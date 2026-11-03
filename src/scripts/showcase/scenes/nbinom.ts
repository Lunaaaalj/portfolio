// Fig. 4. Agave salmiana in polygon 1: 252 plants wanted, 46 already there, so 206 new ones must
// survive. One replay plants seedlings one after another, each surviving with q = 0.9587, until
// 206 have survived; the number it took is one draw of a negative binomial. Ten thousand replays,
// computed here with seed 42, build the histogram; the hairline is the exact distribution from
// the project's data; the purchase is the 95th percentile, as in the report (220).

import story from '../../../data/refinit-story.json';
import type { Scene } from '../engine';
import { ease, seg, label, fmt, rgba, dot } from '../draw';
import { rng } from '../../../lib/tile';

export default function nbinom(): Scene {
  const S = story.scenario, need = S.target - S.existing, K = 10000;
  const r = rng(42);
  const xs = new Int32Array(K);
  let first: boolean[] = [];
  for (let k = 0; k < K; k++) {
    let alive = 0, x = 0;
    const seq: boolean[] = [];
    while (alive < need) { const ok = r() < S.q; x++; if (ok) alive++; if (k === 0) seq.push(ok); }
    xs[k] = x;
    if (k === 0) first = seq;
  }
  const sorted = Float64Array.from(xs).sort();
  const q95 = sorted[Math.ceil(0.95 * K) - 1];
  const exact = new Map(S.exact.map(([x, pr]) => [x, pr]));
  const lo = S.exact[0][0] - 2, hi = S.exact[S.exact.length - 1][0] + 2;
  const top = Math.max(...S.exact.map((e) => e[1])) * 1.15;
  const genus = story.genus[S.species];
  // Cumulative histograms at the replay counts the scrub passes through
  const histAt = (n: number) => {
    const h = new Map<number, number>();
    for (let k = 0; k < n; k++) h.set(xs[k], (h.get(xs[k]) ?? 0) + 1);
    return h;
  };
  const cache = new Map<number, Map<number, number>>();

  let field = { x: 0, y: 0, w: 0, h: 0 }, chart = { x: 0, y: 0, w: 0, h: 0 }, cols = 24, cell = 10;
  return {
    layout({ w, h }) {
      const pad = Math.max(20, Math.min(w, h) * 0.07);
      const narrow = w < 600;
      field = { x: pad, y: pad + (narrow ? 72 : 30), w: w - 2 * pad, h: (h - 2 * pad) * 0.42 - (narrow ? 42 : 0) };
      chart = { x: pad + 10, y: field.y + field.h + 36, w: w - 2 * pad - 20, h: h - pad - (field.y + field.h + 36) - 26 };
      const nmax = hi;
      cols = Math.max(12, Math.round(Math.sqrt((nmax * field.w) / field.h)));
      cell = Math.min(field.w / cols, field.h / Math.ceil(nmax / cols));
    },
    draw({ g, c, readout }, p) {
      const plantT = seg(p, 0.03, 0.34), many = seg(p, 0.4, 0.74), showExact = ease(seg(p, 0.66, 0.78)), cut = ease(seg(p, 0.8, 0.92));
      const n = many > 0 ? Math.max(1, Math.round(Math.pow(K, many))) : plantT >= 1 ? 1 : 0;

      // The planting row of the first replay, or of the latest one while replays are few
      const seq = first;
      const planted = many > 0 ? seq.length : Math.floor(plantT * seq.length);
      const fieldA = many > 0 ? Math.max(0.18, 1 - many * 2.5) : 1;
      let alive = 0;
      const ox = field.x + (field.w - cols * cell) / 2;
      for (let j = 0; j < Math.max(planted, 0); j++) {
        const x = ox + (j % cols) * cell + cell / 2, y = field.y + Math.floor(j / cols) * cell + cell / 2;
        const ok = seq[j];
        if (ok) { alive++; dot(g, c.genus[genus], x, y, cell * 0.32, fieldA); }
        else {
          g.globalAlpha = fieldA; g.strokeStyle = c.graphite; g.lineWidth = 1;
          const s = cell * 0.22;
          g.beginPath(); g.moveTo(x - s, y - s); g.lineTo(x + s, y + s); g.moveTo(x + s, y - s); g.lineTo(x - s, y + s); g.stroke();
          g.globalAlpha = 1;
        }
      }
      label(g, many > 0 ? `First replay: ${seq.length} plants for ${need} survivors` : `Planted ${planted} · survived ${alive} of ${need}`, field.x, field.y - 14, { size: 13, color: c.ink, weight: 500, a: Math.max(fieldA, 0.6) });

      // Histogram: share of replays that needed x plants
      const bw = chart.w / (hi - lo + 1), base = chart.y + chart.h;
      g.strokeStyle = c.ink; g.lineWidth = 1; g.beginPath(); g.moveTo(chart.x, base + 0.5); g.lineTo(chart.x + chart.w, base + 0.5); g.stroke();
      for (let x = lo; x <= hi; x += 2) {
        const X = chart.x + (x - lo + 0.5) * bw;
        g.beginPath(); g.moveTo(X, base); g.lineTo(X, base + 4); g.stroke();
        if ((x - lo) % 4 === 0 || bw > 26) label(g, String(x), X, base + 18, { size: 11, color: c.graphite, align: 'center' });
      }
      label(g, 'Plants needed', chart.x + chart.w, base + 34, { size: 12, color: c.graphite, align: 'right' });
      if (n > 0) {
        let h = cache.get(n);
        if (!h) { h = histAt(n); if (cache.size > 64) cache.clear(); cache.set(n, h); }
        for (const [x, cnt] of h) {
          const share = cnt / n, bh = Math.min(chart.h, (share / top) * chart.h);
          const X = chart.x + (x - lo) * bw;
          const inside = x <= q95;
          g.fillStyle = cut > 0 && inside ? rgba(c.genus[genus], 0.25 + 0.45 * cut) : rgba(c.contour, 0.55);
          g.fillRect(X + 1, base - bh, bw - 2, bh);
        }
      }
      if (showExact > 0) {
        g.globalAlpha = showExact; g.strokeStyle = c.ink; g.lineWidth = 1.25; g.beginPath();
        let started = false;
        for (let x = lo; x <= hi; x++) {
          const pr = exact.get(x) ?? 0, X = chart.x + (x - lo + 0.5) * bw, Y = base - (pr / top) * chart.h;
          started ? g.lineTo(X, Y) : g.moveTo(X, Y); started = true;
        }
        g.stroke(); g.globalAlpha = 1;
        label(g, 'Exact negative binomial', chart.x, chart.y + 4, { size: 12, color: c.ink, a: showExact });
      }
      if (cut > 0) {
        const X = chart.x + (q95 - lo + 1) * bw;
        g.strokeStyle = c.ink; g.lineWidth = 1.5; g.globalAlpha = cut;
        g.beginPath(); g.moveTo(X, chart.y - 6); g.lineTo(X, base + 6); g.stroke(); g.globalAlpha = 1;
        const right = X + 170 < chart.x + chart.w, LX = right ? X + 8 : X - 8, al = right ? 'left' : 'right';
        label(g, `Buy ${q95}`, LX, chart.y + 30, { size: 15, weight: 600, color: c.ink, a: cut, align: al });
        label(g, 'enough in 95% of replays', LX, chart.y + 48, { size: 12, color: c.graphite, a: cut, align: al });
      }
      readout(`${fmt(n)} ${n === 1 ? 'replay' : 'replays'}${cut > 0 ? `\n95th percentile ${q95}` : ''}`);
    },
  };
}
