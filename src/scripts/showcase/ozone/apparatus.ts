// The ozone page's cabinet of instruments: what its plates have in common. Each scene is one
// apparatus engraved in hairline, so these are the drawing conventions of the cabinet rather than
// of any one instrument: the bench it stands on, glass, and the tag of the specimen, the one real
// day the page follows from the first reading to the model's verdict.

import story from '../../../data/ozone-story.json';
import { label, rgba, type Colors } from '../draw';

export const specimen = story.specimen;

/** A workbench: a rule with short engraver's strokes under it. */
export function bench(g: CanvasRenderingContext2D, c: Colors, x0: number, x1: number, y: number, a = 1) {
  g.globalAlpha = a; g.strokeStyle = c.ink; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x0, y + 0.5); g.lineTo(x1, y + 0.5); g.stroke();
  g.strokeStyle = c.contour; g.beginPath();
  for (let x = x0; x < x1; x += 7) { g.moveTo(x + 6, y + 1); g.lineTo(x, y + 7); }
  g.stroke(); g.globalAlpha = 1;
}

/** A glass vessel, open at the top: two walls and a floor, with a highlight down the left wall. */
export function glass(g: CanvasRenderingContext2D, c: Colors, x: number, y: number, w: number, h: number, a = 1) {
  g.globalAlpha = a; g.strokeStyle = c.ink; g.lineWidth = 1; g.lineJoin = 'round';
  const r = Math.min(4, w / 3);
  g.beginPath(); g.moveTo(x + 0.5, y); g.lineTo(x + 0.5, y + h - r); g.quadraticCurveTo(x + 0.5, y + h + 0.5, x + r, y + h + 0.5);
  g.lineTo(x + w - r, y + h + 0.5); g.quadraticCurveTo(x + w - 0.5, y + h + 0.5, x + w - 0.5, y + h - r); g.lineTo(x + w - 0.5, y); g.stroke();
  if (w > 30) {
    g.strokeStyle = rgba(c.ink, 0.28); g.beginPath();
    g.moveTo(x + 4.5, y + 8); g.lineTo(x + 4.5, y + h * 0.5); g.stroke();
  }
  g.globalAlpha = 1;
}

/** The specimen's tag: a card on a string, tied to the point (x, y). */
export function tag(g: CanvasRenderingContext2D, c: Colors, x: number, y: number, text = `${specimen.station}, ${specimen.label}`, a = 1, side: 1 | -1 = 1) {
  if (a <= 0) return;
  g.globalAlpha = a;
  g.font = `400 11.5px "IBM Plex Sans", system-ui, sans-serif`;
  const W = g.measureText(text).width + 22, H = 21, X = side > 0 ? x + 16 : x - 16 - W, Y = y - H / 2;
  g.strokeStyle = c.ink; g.lineWidth = 1;
  g.beginPath(); g.moveTo(x, y); g.lineTo(side > 0 ? X : X + W, y); g.stroke();
  g.beginPath();
  g.moveTo(X + 7, Y); g.lineTo(X + W - 7, Y); g.lineTo(X + W, y); g.lineTo(X + W - 7, Y + H); g.lineTo(X + 7, Y + H); g.lineTo(X, y); g.closePath();
  g.fillStyle = c.plate; g.fill(); g.stroke();
  g.globalAlpha = 1;
  label(g, text, X + 11, y + 0.5, { size: 11.5, color: c.ink, base: 'middle', a });
}
