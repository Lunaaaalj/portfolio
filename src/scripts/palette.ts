// Reads the colour tokens from CSS so canvas drawings follow the active theme.

export interface Tone { c: string; rgb: string; a: number; w: number }

export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function isDark(): boolean {
  return token('--paper').toUpperCase() === '#141B24';
}

export function toRgb(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
}

export function rgba(rgb: string, a: number): string {
  return `rgba(${rgb},${a.toFixed(3)})`;
}

export function tone(name: string, a: number, w = 1): Tone {
  const c = token(name);
  return { c, rgb: toRgb(c), a, w };
}

/** Calls `fn` whenever the theme changes, by toggle or by system preference. */
export function onThemeChange(fn: () => void): void {
  new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

export function smooth(e0: number, e1: number, x: number): number {
  x = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
  return x * x * (3 - 2 * x);
}
