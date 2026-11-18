// Captions that write themselves, for the terminal scenes. Every text node of a caption is split
// into a typed span and a hidden rest, so the line breaks never move while it types; formulas
// (MathML) stay hidden until the cursor reaches them. A block caret rides the last typed span.

export interface Typer { start(): void; finish(): void }

type Item = { t?: HTMLSpanElement; r?: HTMLSpanElement; full: string; el?: HTMLElement };

const MATH_WEIGHT = 8;  // a formula counts as this many characters of typing time

export function makeTyper(beat: HTMLElement): Typer {
  const items: Item[] = [];
  const walk = (node: Node) => {
    for (const ch of [...node.childNodes]) {
      if (ch.nodeType === 3) {
        const full = ch.textContent ?? '';
        if (!full.trim()) continue;
        const t = document.createElement('span'), r = document.createElement('span');
        t.className = 'tw-t'; r.className = 'tw-r'; t.textContent = full;
        ch.replaceWith(t, r);
        items.push({ t, r, full });
      } else if (ch instanceof HTMLElement) {
        if (ch.tagName.toLowerCase() === 'math') items.push({ el: ch, full: '' });
        else walk(ch);
      }
    }
  };
  walk(beat);
  const total = items.reduce((s, i) => s + (i.el ? MATH_WEIGHT : i.full.length), 0);
  let raf = 0;

  /** Shows the first k characters (k >= total shows everything). */
  function show(k: number) {
    let c = 0, caret: Item | null = null;
    for (const it of items) {
      if (it.el) { it.el.style.visibility = k >= c ? '' : 'hidden'; c += MATH_WEIGHT; continue; }
      const kk = Math.max(0, Math.min(it.full.length, k - c));
      it.t!.textContent = it.full.slice(0, kk); it.r!.textContent = it.full.slice(kk);
      it.t!.classList.remove('cur');
      if (kk > 0) caret = it;
      c += it.full.length;
    }
    if (caret && k < total) caret.t!.classList.add('cur');
  }

  const finish = () => { cancelAnimationFrame(raf); raf = 0; show(total + 1); };
  const start = () => {
    cancelAnimationFrame(raf);
    const t0 = performance.now(), dur = Math.max(300, Math.min(1100, total * 7));
    show(0);
    const step = (now: number) => {
      const f = (now - t0) / dur;
      if (f >= 1) return finish();
      show(Math.floor(f * total));
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  };
  return { start, finish };
}
