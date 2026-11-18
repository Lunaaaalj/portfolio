// The scroll-scene engine. Each `.scene` is a tall track; its `.stage` stays pinned while the
// track scrolls past, and the scene is drawn at the track's progress p in [0, 1], so scrolling
// back rewinds it. Captions (`.beat[data-at="from to"]`) switch on inside their interval.
//
// Only scenes near the viewport are drawn, and only when p has changed or a scene asks for the
// next frame (the memetic algorithm runs on its own clock while its stage is on screen). Under
// reduced motion, or without JavaScript, the tracks collapse, every caption shows, and each scene
// is drawn once at its final state.

import { onThemeChange, reducedMotion } from '../palette';
import { readColors, type Colors } from './draw';
import { makeTyper, type Typer } from './typing';

export interface Ctx {
  el: HTMLElement; art: HTMLElement; canvas: HTMLCanvasElement; g: CanvasRenderingContext2D;
  w: number; h: number; dpr: number; c: Colors;
  /** false under reduced motion: draw the final, still state. */
  live: boolean;
  /** Seconds since the previous frame for scenes that run on their own clock. */
  dt: number;
  /** True while the scene's stage is pinned on screen. */
  pinned: boolean;
  readout(text: string): void;
}

export interface Scene {
  /** Called once the canvas has a size. */
  setup?(ctx: Ctx): void;
  /** Called when the canvas is resized or the theme changes. */
  layout?(ctx: Ctx): void;
  /** Draw at progress p. Return true to be called again next frame. */
  draw(ctx: Ctx, p: number): boolean | void;
}

type Entry = {
  ctx: Ctx; scene: Scene; beats: [HTMLElement, number, number][]; p: number; near: boolean; wants: boolean; ready: boolean;
  stage: HTMLElement | null; stick: number; pbar: HTMLElement | null; pshown: string;
  /** terminal scenes: a typer per caption, and whether the stage was pinned on the last frame */
  typers: (Typer | null)[] | null; was: boolean;
};

export function mountScenes(registry: Record<string, () => Scene>) {
  const live = !reducedMotion.matches;
  document.documentElement.classList.toggle('sx-live', live);
  const entries: Entry[] = [];
  let colors = readColors();

  for (const el of document.querySelectorAll<HTMLElement>('.scene[data-scene]')) {
    const make = registry[el.dataset.scene!];
    if (!make) continue;
    const art = el.querySelector<HTMLElement>('.scene-art')!;
    const canvas = art.querySelector('canvas')!;
    const out = el.querySelector<HTMLElement>('.scene-readout');
    const tm = el.classList.contains('tm');
    let last = '', pending = '', lastAt = 0, timer = 0;
    const apply = () => { timer = 0; lastAt = performance.now(); if (out && pending !== last) { out.textContent = pending; last = pending; } };
    const ctx: Ctx = {
      el, art, canvas, g: canvas.getContext('2d')!, w: 0, h: 0, dpr: 1, c: colors, live, dt: 0, pinned: false,
      // The terminal's readout refreshes at about 12 Hz, in steps, like a screen being redrawn; the
      // last value always lands (a trailing update)
      readout: (t) => {
        pending = t;
        if (!out) return;
        const wait = tm && live ? 80 - (performance.now() - lastAt) : 0;
        if (wait <= 0) apply();
        else if (!timer) timer = window.setTimeout(apply, wait);
      },
    };
    const beats = [...el.querySelectorAll<HTMLElement>('.beat')].map((b) => {
      const [a, z] = (b.dataset.at ?? '0 1').split(' ').map(Number);
      return [b, a, z] as [HTMLElement, number, number];
    });
    entries.push({
      ctx, scene: make(), beats, p: -1, near: !live, wants: false, ready: false,
      stage: el.querySelector<HTMLElement>('.stage'), stick: 0, pbar: el.querySelector<HTMLElement>('.pbar'), pshown: '',
      typers: tm && live ? beats.map(([b]) => makeTyper(b)) : null, was: false,
    });
    const st = entries[entries.length - 1].stage;
    st?.addEventListener('animationend', () => st.classList.remove('flick'));
  }

  const progress = (e: Entry) => {
    if (!live) return 1;
    // The stage sticks `stick` px from the top (0 on the engraving pages, below the bar on the
    // terminal ones) and is `H` tall: it travels the track's height minus its own
    const r = e.ctx.el.getBoundingClientRect(), H = e.stage?.offsetHeight ?? innerHeight;
    e.ctx.pinned = r.top <= e.stick + 1 && r.bottom >= e.stick + H - 1;
    return Math.min(1, Math.max(0, (e.stick - r.top) / Math.max(1, r.height - H)));
  };

  const draw = (e: Entry, force = false) => {
    if (!e.ready) return;
    const p = progress(e);
    // Entering a terminal scene: the stage flickers once, like a screen changing mode
    if (e.typers && e.stage && e.ctx.pinned && !e.was) { e.stage.classList.remove('flick'); void e.stage.offsetWidth; e.stage.classList.add('flick'); }
    e.was = e.ctx.pinned;
    if (!force && p === e.p && !e.wants) return;
    e.p = p;
    if (e.pbar) {
      const n = Math.round(p * 20), s = `${n}/${Math.round(p * 100)}`;
      if (s !== e.pshown) {
        e.pshown = s;
        e.pbar.innerHTML = `[<span class="on">${'█'.repeat(n)}</span><i>${'░'.repeat(20 - n)}</i>] ${String(Math.round(p * 100)).padStart(3, ' ')}%`;
      }
    }
    // A stage the network reads (data-feed) is marked by the network; otherwise by being pinned
    if (!e.ctx.el.hasAttribute('data-feed')) e.stage?.classList.toggle('is-read', !live || e.ctx.pinned);
    e.beats.forEach(([b, a, z], k) => {
      const on = !live || (p >= a && (p < z || (z >= 1 && p >= 1)));
      const was = b.classList.contains('is-on');
      b.classList.toggle('is-on', on);
      const ty = e.typers?.[k];
      if (ty && on !== was) { if (on && e.ctx.pinned) ty.start(); else ty.finish(); }
    });
    e.ctx.g.setTransform(e.ctx.dpr, 0, 0, e.ctx.dpr, 0, 0);
    e.ctx.g.clearRect(0, 0, e.ctx.w, e.ctx.h);
    const again = !!e.scene.draw(e.ctx, p);
    e.wants = live && again;
  };

  const size = (e: Entry) => {
    const { ctx } = e, r = ctx.art.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    if (!r.width || !r.height) return;
    ctx.w = r.width; ctx.h = r.height; ctx.dpr = dpr;
    e.stick = e.stage ? parseFloat(getComputedStyle(e.stage).top) || 0 : 0;
    ctx.canvas.width = Math.round(r.width * dpr); ctx.canvas.height = Math.round(r.height * dpr);
    if (!e.ready) { e.scene.setup?.(ctx); e.ready = true; }
    e.scene.layout?.(ctx);
    draw(e, true);
  };

  const ro = new ResizeObserver((list) => {
    for (const it of list) { const e = entries.find((x) => x.ctx.art === it.target); if (e) size(e); }
  });
  for (const e of entries) ro.observe(e.ctx.art);

  if (live) {
    const io = new IntersectionObserver((list) => {
      for (const it of list) { const e = entries.find((x) => x.ctx.el === it.target); if (e) e.near = it.isIntersecting; }
      kick();
    }, { rootMargin: '25% 0px' });
    for (const e of entries) io.observe(e.ctx.el);
  }

  let raf = 0, prev = 0;
  const frame = (t: number) => {
    raf = 0;
    const dt = prev ? Math.min(0.1, (t - prev) / 1000) : 0;
    prev = t;
    let again = false;
    for (const e of entries) {
      if (!e.near) continue;
      e.ctx.dt = dt;
      draw(e);
      again ||= e.wants;
    }
    if (again && !document.hidden) raf = requestAnimationFrame(frame);
    else prev = 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
  addEventListener('scroll', kick, { passive: true });
  addEventListener('resize', kick);
  document.addEventListener('visibilitychange', kick);

  onThemeChange(() => {
    colors = readColors();
    for (const e of entries) { e.ctx.c = colors; e.scene.layout?.(e.ctx); draw(e, true); }
  });
  reducedMotion.addEventListener('change', () => location.reload());
  kick();
}
