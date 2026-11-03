// Fig. 7. The planting tile of key 1's composition (polygon 1 and 17 others), arranged at random
// with seed 42. Each pair of neighbours is a spring whose weight is the penalty W for those two
// species side by side; same-species pairs are drawn in red. The total is the competition the
// arrangement minimises; a random arrangement of this mix averages 93.34 (report).

import story from '../../../data/refinit-story.json';
import type { Scene } from '../engine';
import { ease, seg, label, rgba } from '../draw';
import { counts, score, shuffle, rng, EDGES } from '../../../lib/tile';
import { drawTile, fitTile, spring, type TileBox } from '../tiledraw';

export const keyOne = story.keys[0];
export const mixOne = counts(keyOne.grid.flat());
export const randomOne = shuffle(mixOne, rng(42));

export default function springs(): Scene {
  const a = randomOne, C = score(a), same = EDGES.filter(([u, v]) => a[u] === a[v]).length;
  let b: TileBox = { x: 0, y: 0, S: 0, H: 0 }, legend = { x: 0, y: 0 }, wide = true;
  return {
    layout({ w, h }) {
      wide = w > 560;
      b = fitTile(20, wide ? 40 : 64, w - 40, h - (wide ? 150 : 124), h > w * 1.1);
      legend = { x: 24, y: h - (wide ? 70 : 40) };
    },
    draw({ g, c, readout, w }, p) {
      const pl = ease(seg(p, 0.0, 0.25)), sp = ease(seg(p, 0.28, 0.6)), sum = ease(seg(p, 0.66, 0.8));
      drawTile(g, c, b, a, { plants: pl, springs: sp, codes: b.S > 30 });
      if (sp > 0) {
        const L = Math.min(110, (w - 48) / 3), y = legend.y;
        const items: [number, string, string][] = [
          [0.17, 'Little competition', 'O. streptacantha beside mesquite, 0.17'],
          [0.79, 'Moderate', 'A. salmiana beside O. engelmannii, 0.79'],
          [1.5, 'Most', 'two mesquites side by side, 1.50'],
        ];
        items.forEach(([wv, h1, h2], i) => {
          const x = legend.x + i * (wide ? L + 150 : (w - 48) / 3);
          spring(g, x, y, x + Math.min(L, 80), y, wv, wv >= 1.5 ? c.hazard : rgba(c.ink, 0.3 + 0.55 * ((wv - 0.17) / 1.33)), 4, sp);
          label(g, h1, x, y + 22, { size: 12, weight: 500, color: c.ink, a: sp });
          if (wide) label(g, h2, x, y + 38, { size: 11, color: c.graphite, a: sp });
        });
      }
      readout(`${EDGES.length} neighbour pairs${sp > 0.5 ? `\n${same} of the same species` : ''}${sum > 0 ? `\ncompetition ${C.toFixed(2)}\nrandom average ${keyOne.random.toFixed(2)}` : ''}`);
    },
  };
}
