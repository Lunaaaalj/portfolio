// Reads the colour tokens from CSS so canvas drawings follow the active theme.

export function token(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

export function isDark(): boolean {
  return getComputedStyle(document.documentElement).colorScheme === 'dark';
}

export function toRgb(hex: string): string {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, '$&$&');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(',');
}

/** Calls `fn` whenever the theme changes, by toggle or by system preference. */
export function onThemeChange(fn: () => void): void {
  new MutationObserver(fn).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
}

export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
