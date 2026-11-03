// Fig. 3. One hectare of the report's planting simulation: 14 rows of 47 positions, 658 in all.
// The established plants are drawn per species from Poisson(mean), with the report's means
// (128.6 per hectare in all); where they stand is illustrative, since the data hold counts, not
// coordinates. What is left is the shortfall that new plants must cover.

import story from '../../../data/refinit-story.json';
import type { Scene } from '../engine';
import { ease, seg, poisson, dot, fmt } from '../draw';
import { rng, shuffle } from '../../../lib/tile';

export default function hectare(): Scene {
  const H = story.hectare, n = H.rows * H.cols;
  const r = rng(7);
  const counts = H.existing.map((m) => poisson(m, r));
  const E = counts.reduce((a, b) => a + b, 0);
  // Species of each established plant, then a random position for each (1 marks a taken position)
  const plants = shuffle(counts, r);
  const taken = shuffle([n - E, E], r);
  const where = taken.flatMap((x, i) => (x === 1 ? [i] : []));
  const sp = new Map<number, number>(where.map((pos, i) => [pos, plants[i]]));
  const order = where.map((pos, i) => ({ pos, i, at: r() }));
  const rank = new Map(order.sort((a, b) => a.at - b.at).map((o, k) => [o.pos, k]));
  let pts: [number, number][] = [], rad = 3, flip = false;

  return {
    layout({ w, h }) {
      // Physical metres: 4.19 m along a row, rows 3.63 m apart, every other row offset 2.10 m.
      // On a tall screen the hectare is turned a quarter, so the rows run down the page.
      flip = w / h < 0.8;
      const phys = (i: number): [number, number] => {
        const R = Math.floor(i / H.cols), C = i % H.cols;
        return [C * 4.19 + (R % 2) * 2.1, R * 3.63];
      };
      const raw = Array.from({ length: n }, (_, i) => { const [x, y] = phys(i); return flip ? [y, x] : [x, y]; });
      const X = Math.max(...raw.map((q) => q[0])), Y = Math.max(...raw.map((q) => q[1]));
      const pad = Math.min(w, h) * 0.08 + 8;
      const k = Math.min((w - 2 * pad) / X, (h - 2 * pad) / Y);
      const ox = (w - X * k) / 2, oy = (h - Y * k) / 2;
      pts = raw.map(([x, y]) => [ox + x * k, oy + y * k] as [number, number]);
      rad = Math.max(1.6, 3.63 * k * 0.3);
    },
    draw({ g, c, readout }, p) {
      const grid = seg(p, 0.0, 0.26), drop = seg(p, 0.3, 0.6), gap = ease(seg(p, 0.64, 0.84));
      const cols = flip ? H.rows : H.cols;
      let shown = 0;
      for (let i = 0; i < n; i++) {
        const [x, y] = pts[i];
        const col = flip ? Math.floor(i / H.cols) : i % H.cols;
        const t = ease(seg(grid, (col / cols) * 0.75, (col / cols) * 0.75 + 0.25));
        if (t <= 0) continue;
        const s = sp.get(i);
        if (s !== undefined) {
          const k = rank.get(i)! / Math.max(1, E);
          const d = ease(seg(drop, k * 0.8, k * 0.8 + 0.2));
          if (d > 0) {
            shown++;
            dot(g, c.genus[story.genus[s]], x, y - (1 - d) * rad * 3, rad * (1.6 - 0.6 * d), d);
            continue;
          }
        }
        // An open position: a hairline ring, which the shortfall then inks in
        g.globalAlpha = t;
        g.beginPath(); g.arc(x, y, rad * 0.75, 0, Math.PI * 2);
        g.lineWidth = s === undefined ? 1 + gap * 0.6 : 1;
        g.strokeStyle = s === undefined && gap > 0 ? c.ink : c.contour;
        g.globalAlpha = t * (s === undefined && gap > 0 ? 0.35 + 0.65 * gap : 0.9);
        g.stroke();
        g.globalAlpha = 1;
      }
      const left = n - shown;
      readout(`${fmt(n)} positions\n${fmt(shown)} established${p >= 0.64 ? `\n${fmt(left)} to fill` : ''}`);
    },
  };
}
