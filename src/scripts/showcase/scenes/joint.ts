// Fig. 5. One hundred simulated hectares, each with the report's one-hectare purchase (651 plants):
// established plants Poisson(mean), survivors Binomial(purchase, q). Each hectare has ten bars,
// one per species, filled when that species meets its target. Computed here with seed 42; the
// report's figure is 68.4% of 1,000 hectares meeting all ten at once.

import story from '../../../data/refinit-story.json';
import base from '../../../data/refinit.json';
import type { Scene } from '../engine';
import { ease, seg, poisson, rgba } from '../draw';
import { rng } from '../../../lib/tile';

export default function joint(): Scene {
  const H = story.hectare, M = 100, r = rng(42);
  const met: boolean[][] = [];
  for (let k = 0; k < M; k++) {
    met.push(H.target.map((n, s) => {
      let S = 0;
      for (let i = 0; i < H.purchase[s]; i++) if (r() < base.species[s].q) S++;
      return poisson(H.existing[s], r) + S >= n;
    }));
  }
  const all = met.map((m) => m.every(Boolean));
  let gx = 10, gy = 10, size = 40, gap = 10, ox = 0, oy = 0;

  return {
    layout({ w, h }) {
      const wide = w / h > 1.5;
      gx = wide ? 20 : 10; gy = M / gx;
      const pad = Math.min(w, h) * 0.08 + 10;
      size = Math.min((w - 2 * pad) / gx, (h - 2 * pad) / gy);
      gap = size * 0.18;
      ox = (w - gx * size) / 2; oy = (h - gy * size) / 2;
    },
    draw({ g, c, readout }, p) {
      const come = seg(p, 0.02, 0.5), judge = ease(seg(p, 0.56, 0.72));
      let shown = 0, ok = 0, okSpecies = 0;
      for (let k = 0; k < M; k++) {
        const t = ease(seg(come, (k / M) * 0.85, (k / M) * 0.85 + 0.15));
        if (t <= 0) continue;
        shown++;
        if (all[k]) ok++;
        const x = ox + (k % gx) * size + gap / 2, y = oy + Math.floor(k / gx) * size + gap / 2, s = size - gap;
        const dim = judge > 0 && !all[k] ? 1 - 0.55 * judge : 1;
        // The ten species bars
        const bw = s / 10;
        for (let j = 0; j < 10; j++) {
          const m = met[k][j];
          if (m) okSpecies++;
          const bh = s * t;
          g.globalAlpha = dim;
          g.fillStyle = m ? rgba(c.genus[story.genus[j]], 0.8) : c.hazard;
          if (m) g.fillRect(x + j * bw + 0.5, y + s - bh, bw - 1, bh);
          else { g.fillRect(x + j * bw + 0.5, y + s - Math.min(bh, 3), bw - 1, Math.min(bh, 3)); }
        }
        g.globalAlpha = 1;
        if (judge > 0) {
          g.lineWidth = all[k] ? 1.5 : 1;
          g.strokeStyle = all[k] ? c.ink : c.hazard;
          g.globalAlpha = all[k] ? judge : judge * 0.9;
          g.strokeRect(x - 2.5, y - 2.5, s + 5, s + 5);
          g.globalAlpha = 1;
        }
      }
      const pct = shown ? Math.round((okSpecies / (shown * 10)) * 100) : 0;
      readout(`${shown} hectares\n${pct}% of species bars met${judge > 0 ? `\nall ten met: ${ok} of ${shown}` : ''}`);
    },
  };
}
