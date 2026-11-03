// Fig. 9. The order CONAFOR's crews use now (data/processed/clave_vigente.csv): one sequence of 22
// positions repeated along every row. Started at the same point on each row (offset 0), every
// plant has two neighbours of its own species; sliding each row five positions further on, the
// report's best offset, removes nearly all of them. Below, key 1 repeated over the same ground.
// Coefficients are competition over its random expectation, computed here; they match the
// report (1.126, 0.850; key 1, 0.838).

import story from '../../../data/refinit-story.json';
import type { Scene } from '../engine';
import { ease, seg, label, lerp, easeInOut, plant } from '../draw';
import { sequenceCoefficient, sequenceSame, tileCell, EDGES } from '../../../lib/tile';

export default function practice(): Scene {
  const seq = story.current, L = seq.length;
  const key = story.keys[0];
  const keySame = (2 * EDGES.filter(([u, v]) => key.grid.flat()[u] === key.grid.flat()[v]).length) / 52;
  const coef = (d: number) => sequenceCoefficient(seq, d), same = (d: number) => sequenceSame(seq, d);
  const ROWS = 6;
  let A = { x: 0, y: 0, w: 0, h: 0 }, B = { ...A }, S = 20, H = 17, cols = 22, narrow = false;

  const seqAt = (r: number, k: number, d: number) => seq[((Math.round(k - Math.floor(r / 2) + r * d) % L) + L) % L];
  const keyAt = (r: number, k: number) => tileCell(key.grid, r, k);

  function field(g: CanvasRenderingContext2D, c: any, box: typeof A, at: (r: number, k: number) => number, shift: (r: number) => number, knots: number, a: number) {
    g.save(); g.beginPath(); g.rect(box.x - S * 0.6, box.y - S * 0.6, box.w + S * 1.2, box.h + S * 0.6); g.clip();
    const ox = box.x + S / 2, oy = box.y + S / 2;
    for (let r = 0; r < ROWS; r++) {
      const sh = shift(r), fr = sh - Math.floor(sh);
      for (let k = -1; k <= cols + 1; k++) {
        const kk = k + Math.floor(sh);                                   // content index after sliding
        const x = ox + (k - fr + (r % 2) / 2) * S, y = oy + r * H;
        if (x < box.x - S || x > box.x + box.w + S) continue;
        const s = at(r, kk);
        plant(g, c, x, y, S * 0.36, story.genus[s], S > 30 ? story.codes[s] : undefined, a);
      }
    }
    // Same-species neighbours, drawn when the rows are at rest
    if (knots > 0) {
      g.strokeStyle = c.hazard; g.lineWidth = Math.max(2, S * 0.12); g.lineCap = 'round'; g.globalAlpha = knots * a;
      for (let r = 0; r < ROWS; r++) for (let k = 0; k < cols; k++) {
        const s = at(r, k + Math.round(shift(r)));
        const x = ox + (k + (r % 2) / 2) * S, y = oy + r * H;
        const right = at(r, k + 1 + Math.round(shift(r)));
        const pairs: [number, number, number][] = [[right, x + S, y]];
        if (r + 1 < ROWS) {
          const k1 = r % 2 ? k : k - 1, k2 = r % 2 ? k + 1 : k;
          pairs.push([at(r + 1, k1 + Math.round(shift(r + 1))), ox + (k1 + ((r + 1) % 2) / 2) * S, y + H]);
          pairs.push([at(r + 1, k2 + Math.round(shift(r + 1))), ox + (k2 + ((r + 1) % 2) / 2) * S, y + H]);
        }
        for (const [t, X, Y] of pairs) {
          if (t !== s || X > box.x + box.w + S * 0.5) continue;
          const dx = X - x, dy = Y - y, l = Math.hypot(dx, dy), m = S * 0.36;
          g.beginPath(); g.moveTo(x + (dx / l) * m, y + (dy / l) * m); g.lineTo(X - (dx / l) * m, Y - (dy / l) * m); g.stroke();
        }
      }
      g.globalAlpha = 1; g.lineCap = 'butt';
    }
    g.restore();
  }

  function info(g: CanvasRenderingContext2D, c: any, box: typeof A, text: string, a: number) {
    if (narrow) label(g, text, box.x, box.y + box.h + 8, { size: 12, color: c.graphite, a });
    else label(g, text, box.x + box.w, box.y - 18, { size: 12, color: c.graphite, align: 'right', a });
  }

  return {
    layout({ w, h }) {
      const pad = 24, gapY = 72;
      narrow = w < 700;
      const avail = (h - 54 - gapY - 40) / 2;
      cols = w > 900 ? 22 : w > 560 ? 16 : 11;
      S = Math.min((w - 2 * pad) / (cols + 0.5), avail / ((ROWS - 1) * 0.866 + 1));
      H = S * 0.866;
      const fw = (cols + 0.5) * S, fh = (ROWS - 1) * H + S;
      const top = Math.max(54, (h - 2 * fh - gapY) / 2);
      A = { x: (w - fw) / 2, y: top, w: fw, h: fh };
      B = { x: A.x, y: top + fh + gapY, w: fw, h: fh };
    },
    draw({ g, c, readout }, p) {
      const inA = ease(seg(p, 0, 0.12)), slide = easeInOut(seg(p, 0.32, 0.6)), inB = ease(seg(p, 0.66, 0.8));
      const d = lerp(0, 5, slide);
      const rest = slide <= 0 || slide >= 1 ? 1 : 0;
      const knotsA = ease(seg(p, 0.08, 0.2)) * (slide <= 0 ? 1 : slide >= 1 ? ease(seg(p, 0.6, 0.66)) : 0);
      field(g, c, A, (r, k) => seqAt(r, k, 0), (r) => r * d, knotsA * rest, inA);
      const D = slide >= 1 ? 5 : 0;
      label(g, `Current order, rows offset by ${slide > 0 && slide < 1 ? d.toFixed(1) : D}`, A.x, A.y - 18, { size: 13, weight: 500, color: c.ink, a: inA });
      info(g, c, A, `coefficient ${coef(D).toFixed(3)} · same-species neighbours ${same(D).toFixed(2)} per plant`, inA * (rest ? 1 : 0.3));
      if (inB > 0) {
        field(g, c, B, keyAt, () => 0, ease(seg(p, 0.74, 0.84)), inB);
        label(g, 'Key 1, repeated', B.x, B.y - 18, { size: 13, weight: 500, color: c.ink, a: inB });
        info(g, c, B, `coefficient ${key.coef.toFixed(3)} · same-species neighbours ${keySame.toFixed(2)} per plant`, inB);
      }
      readout('');
    },
  };
}
