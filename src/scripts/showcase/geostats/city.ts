// The city plane the scenes share: the grains of Fig. 1, and how the plane is framed. Coordinates
// are the project's grid units: one unit is 500 m, the origin is the south-west corner of the
// reports, and y grows northwards.

import story from '../../../data/geostats-story.json';
import { rng } from '../../../lib/tile';

export interface Grain { at: number; stack: number; site: number }

/** Gives each grain an arrival time, and a place in its pile in order of arrival. */
export function arrive(perSite: number[], seed: number): Grain[] {
  const r = rng(seed), filled = perSite.map(() => 0);
  return perSite.flatMap((c, site) => Array.from({ length: c }, () => ({ at: r(), stack: 0, site })))
    .sort((a, b) => a.at - b.at)
    .map((g) => ({ ...g, stack: filled[g.site]++ }));
}

export const cityGrains = arrive(story.nodes.g, 43);

export interface Frame { k: number; cx: number; cy: number; midX: number; midY: number }

/** Frames the middle 99% of the grains in each direction, in a canvas of w by h. */
export function frameCity(w: number, h: number): Frame {
  const top = w > 560 ? 88 : 64, bottom = 44, side = 24;
  const q = (v: number[], a: number) => [...v].sort((p, r) => p - r)[Math.floor(v.length * a)];
  const xs = cityGrains.map((c) => story.nodes.x[c.site]), ys = cityGrains.map((c) => story.nodes.y[c.site]);
  const x0 = q(xs, 0.005), x1 = q(xs, 0.995), y0 = q(ys, 0.005), y1 = q(ys, 0.995);
  return {
    k: Math.min((w - 2 * side - 16) / (x1 - x0), (h - top - bottom - 24) / (y1 - y0)),
    cx: (x0 + x1) / 2, cy: (y0 + y1) / 2,
    midX: w / 2, midY: top + (h - top - bottom) / 2 + 12,
  };
}
