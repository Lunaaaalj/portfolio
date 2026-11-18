// Profile banners in the terminal-brutalism style: LinkedIn (1584×396), the GitHub profile header
// (880×188) and the GitHub social preview (1280×640), each in dark and light.
//
//   node scripts/banners/build.mjs            writes banner/out/terminal/*.svg
//   sh scripts/banners/render.sh              also renders the PNGs (headless Chrome)
//
// Each banner is one real frame of the network behind the site (src/scripts/network): the model reads
// the text below, and the wheel shows the units that fire for the next character and the connections
// they fire along (graph.ts, the same code the live background runs). The red character on the rim is
// the model's guess. Fonts are embedded, so the SVGs render the same as <img> on GitHub.
// Needs Node 22.18+ (it runs the TypeScript sources directly).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { load } from '../../src/scripts/network/forward.ts';
import { directWeights, liveGraph } from '../../src/scripts/network/graph.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const out = join(root, 'banner', 'out', 'terminal');
mkdirSync(out, { recursive: true });

// ---------------------------------------------------------------- the frame
const W = JSON.parse(readFileSync(join(root, 'src/data/network-weights.json'), 'utf8'));
const F = load(W), DW = directWeights(F), VOC = F.vocab;
// The model has read this far through the site's own text; "q" after "monterrey. " is a crisp guess
const READ = 'applied mathematics and data science, tecnologico de monterrey. quantitative modelling under uncertainty, and the interpretability and safety of ai systems.';
const CUT = READ.indexOf('. q') + 3;                       // …monterrey. q ▸ u
const ctx = READ.slice(0, CUT).slice(-F.T), R = F.run(ctx), G = liveGraph(F, R, DW);
let guess = 0; for (let i = 1; i < R.prob.length; i++) if (R.prob[i] > R.prob[guess]) guess = i;
const P = { ctx, char: VOC[guess], p: R.prob[guess], edges: G.E.length, nll: -Math.log(R.prob[VOC.indexOf(READ[CUT])]) };
const RF = [0.2, 0.5, 0.76, 0.96];
const SIZES = [F.D, F.M, F.M, VOC.length];

// ---------------------------------------------------------------- themes and fonts
const THEMES = {
  dark: { bg: '#0a0a0b', bar: '#141416', ink: '#ecebe6', dim: '#9b9a93', faint: '#807f79', red: '#ff4f64', edge: 'rgba(236,235,230,0.18)' },
  light: { bg: '#edece7', bar: '#f6f5f0', ink: '#111110', dim: '#55544e', faint: '#6a6963', red: '#d0142c', edge: 'rgba(17,17,16,0.22)' },
};
const font = (pkg, file) => readFileSync(join(root, 'node_modules/@fontsource', pkg, 'files', file)).toString('base64');
const FONTS = `
@font-face{font-family:"IBM Plex Mono";font-weight:400;src:url(data:font/woff2;base64,${font('ibm-plex-mono', 'ibm-plex-mono-latin-400-normal.woff2')}) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:500;src:url(data:font/woff2;base64,${font('ibm-plex-mono', 'ibm-plex-mono-latin-500-normal.woff2')}) format("woff2")}
@font-face{font-family:"IBM Plex Mono";font-weight:600;src:url(data:font/woff2;base64,${font('ibm-plex-mono', 'ibm-plex-mono-latin-600-normal.woff2')}) format("woff2")}
@font-face{font-family:"IBM Plex Sans";font-weight:400;src:url(data:font/woff2;base64,${font('ibm-plex-sans', 'ibm-plex-sans-latin-400-normal.woff2')}) format("woff2")}`;
const MONO = `'IBM Plex Mono', ui-monospace, Menlo, Consolas, monospace`;
const SANS = `'IBM Plex Sans', -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif`;
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f1 = (n) => n.toFixed(1);

// ---------------------------------------------------------------- the wheel
// The wheel's geometry mirrors eclipse.ts: rings at RF·r0, units spaced evenly on each ring, the
// rim of characters outermost. `rot` is chosen so the guess lands at angle `at` on the rim.
function visible(x, y, w, h, m) { return x > m && x < w - m && y > m && y < h - m; }
function pickAngle(cx, cy, r, w, h, pref, avoid) {
  const tries = [];
  for (let d = 0; d <= 180; d += 3) tries.push(pref + d, pref - d);
  for (const a of tries) {
    const x = cx + Math.cos(a * Math.PI / 180) * r, y = cy + Math.sin(a * Math.PI / 180) * r;
    if (visible(x, y, w, h, 26) && !(avoid && avoid(x, y))) return a;
  }
  return pref;
}

function wheel(t, o) {
  const { cx, cy, r0, k, sz, W: w, H: h } = o;
  const at = pickAngle(cx, cy, RF[3] * r0, w, h, o.at, o.avoid) * Math.PI / 180;
  const rot = guess / SIZES[3] * Math.PI * 2 - Math.PI / 2 - at;           // layer 3 turns by −rot, so the guess sits at `at`
  const ang = (l, i) => rot * (l % 2 ? -1 : 1) + (i / SIZES[l]) * Math.PI * 2 - Math.PI / 2;
  const pos = (l, i) => [cx + Math.cos(ang(l, i)) * RF[l] * r0, cy + Math.sin(ang(l, i)) * RF[l] * r0];
  const g = [];
  // rings and the dial
  for (const f of RF) g.push(`<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(f * r0)}" fill="none" stroke="${t.dim}" stroke-opacity="${0.24 * k}"/>`);
  let ticks = '';
  for (let i = 0; i < 120; i++) {
    const a = rot + (i / 120) * Math.PI * 2, r1 = r0 * 1.02, r2 = r0 * (i % 10 ? 1.035 : 1.06);
    ticks += `M${f1(cx + Math.cos(a) * r1)} ${f1(cy + Math.sin(a) * r1)}L${f1(cx + Math.cos(a) * r2)} ${f1(cy + Math.sin(a) * r2)}`;
  }
  g.push(`<path d="${ticks}" fill="none" stroke="${t.dim}" stroke-opacity="${0.35 * k}"/>`);
  // the live edges, bowed slightly towards the centre
  const glow = [];
  for (const e of G.E) {
    const [x1, y1] = pos(e.l, e.s), [x2, y2] = pos(e.l + 1, e.t), mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
    const d = `M${f1(x1)} ${f1(y1)}Q${f1(mx + (cx - mx) * 0.25)} ${f1(my + (cy - my) * 0.25)} ${f1(x2)} ${f1(y2)}`;
    g.push(`<path d="${d}" fill="none" stroke="${t.ink}" stroke-opacity="${Math.min(1, (0.2 + 0.7 * e.w) * k).toFixed(2)}" stroke-width="${f1((0.6 + e.w) * 1.2 * o.lw)}"/>`);
  }
  // units: every neuron a square, brighter and larger as it fires; the most active glow
  let sq = '', gl = '';
  SIZES.slice(0, 3).forEach((n, l) => {
    for (let i = 0; i < n; i++) {
      const [x, y] = pos(l, i); if (!visible(x, y, w, h, -4)) continue;
      const a = G.A[l][i], s = (1.5 + 3 * a) * sz;
      sq += `<rect x="${f1(x - s / 2)}" y="${f1(y - s / 2)}" width="${f1(s)}" height="${f1(s)}" fill="${t.ink}" fill-opacity="${((0.18 + 0.82 * a) * k).toFixed(2)}"/>`;
      if (a > 0.5) gl += `<circle cx="${f1(x)}" cy="${f1(y)}" r="${f1((4 + a * 10) * sz)}" fill="${t.ink}" fill-opacity="${(a * 0.6 * k).toFixed(2)}"/>`;
    }
  });
  g.push(`<g filter="url(#soft)">${gl}</g>`, sq);
  // the rim: the 50 characters the model can predict, the guess in red
  const fs = 12 * sz;
  let top = '';
  for (let i = 0; i < VOC.length; i++) {
    const [x, y] = pos(3, i); if (!visible(x, y, w, h, 2) || VOC[i] === '\n') continue;
    const isG = i === guess, c = VOC[i] === ' ' ? '·' : VOC[i];
    if (isG) { top = `<text x="${f1(x)}" y="${f1(y - 8 * sz + fs * 1.2)}" text-anchor="middle" font-family="${MONO}" font-size="${f1(fs * 1.55)}" font-weight="600" fill="${t.red}">${esc(c)}</text>`; continue; }
    g.push(`<text x="${f1(x)}" y="${f1(y - 8 * sz + fs * 0.8)}" text-anchor="middle" font-family="${MONO}" font-size="${f1(fs)}" font-weight="500" fill="${t.ink}" fill-opacity="${((0.3 + 0.7 * G.A[3][i]) * k).toFixed(2)}">${esc(c)}</text>`);
  }
  return { g: g.join(''), top };       // `top` (the guess) goes above the veil, at full strength
}

// ---------------------------------------------------------------- terminal furniture
const cw = (fs) => fs * 0.6;                       // IBM Plex Mono advance
// Segments of a Neovim-style statusline; the first is inverted. Returns the svg and its width.
function segments(t, x, y, h, fs, list, lead = true) {
  let s = '', cx = x;
  list.forEach((txt, i) => {
    const w = txt.length * cw(fs) + 20, first = lead && i === 0;
    if (first) s += `<rect x="${f1(cx)}" y="${y}" width="${f1(w)}" height="${h}" fill="${t.ink}"/>`;
    else s += `<rect x="${f1(lead ? cx + w - 1 : cx)}" y="${y}" width="1" height="${h}" fill="${t.edge}"/>`;
    s += `<text x="${f1(cx + 10)}" y="${f1(y + h / 2 + fs * 0.35)}" font-family="${MONO}" font-size="${fs}" font-weight="${first ? 600 : 400}" fill="${first ? t.bg : lead && i === 1 ? t.ink : t.dim}">${esc(txt)}</text>`;
    cx += w;
  });
  return { svg: s, w: cx - x };
}
const next = () => `…${P.ctx.slice(-17)} > '${P.char === ' ' ? '␣' : P.char}' ${P.p.toFixed(2)}`;
function statusbar(t, w, y, h, fs, left, right) {
  let s = `<rect x="0" y="${y}" width="${w}" height="${h}" fill="${t.bar}"/><rect x="0" y="${y}" width="${w}" height="1" fill="${t.edge}"/>`;
  s += segments(t, 0, y, h, fs, left).svg;
  const rw = right.reduce((a, b) => a + b.length * cw(fs) + 20, 0);
  s += segments(t, w - rw, y, h, fs, right, false).svg;
  return s;
}
const prompt = (t, x, y, fs) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${fs}" fill="${t.dim}">~/portfolio $ <tspan fill="${t.ink}">whoami</tspan></text>`;
const name = (t, x, y, fs, first, last) =>
  `<text x="${x}" y="${y}" font-family="${MONO}" font-size="${fs}" font-weight="500" letter-spacing="${f1(-0.055 * fs)}" fill="${t.ink}">${esc(first)}<tspan fill="none" stroke="${t.ink}" stroke-width="${f1(Math.max(1, fs / 40))}">${esc(last)}</tspan></text>`;
const sans = (t, x, y, fs, s, fill) => `<text x="${x}" y="${y}" font-family="${SANS}" font-size="${fs}" fill="${fill || t.ink}">${esc(s)}</text>`;

function doc(t, w, h, title, body, veil) {
  // veil: [x0, x1, a0, a1]: the wheel's opacity ramps from a0 at x0 to a1 at x1 (low where the text is)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="${esc(title)}">
<title>${esc(title)}</title>
<defs>
<style>${FONTS}</style>
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="4"/></filter>
<linearGradient id="vg" gradientUnits="userSpaceOnUse" x1="${veil[0]}" y1="0" x2="${veil[1]}" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="${veil[2]}"/><stop offset="1" stop-color="#fff" stop-opacity="${veil[3]}"/></linearGradient>
<mask id="veil"><rect width="${w}" height="${h}" fill="url(#vg)"/></mask>
</defs>
<rect width="${w}" height="${h}" fill="${t.bg}"/>
${body(t)}
</svg>
`;
}

// ---------------------------------------------------------------- the banners
const banners = {};

// LinkedIn 1584×396. The profile photo covers the lower left; the wheel sits behind it and runs off
// the top and bottom, the text takes the right third.
for (const [tn, t] of Object.entries(THEMES)) for (const withName of [true, false]) {
  const w = 1584, h = 396, x0 = 920;
  const title = 'Angel Eduardo Luna, applied mathematics and data science, Tecnológico de Monterrey';
  banners[`linkedin-${tn}${withName ? '' : '-noname'}`] = doc(t, w, h, title, (t) => {
    const wh = wheel(t, { W: w, H: h, cx: 520, cy: 205, r0: 320, k: 0.95, sz: 1.25, lw: 1.1, at: -15, avoid: (x, y) => x > x0 - 70 || (x < 300 && y > 170) });
    const st = segments(t, x0, withName ? 296 : 290, 24, 12.5, ['FIRE', `${P.edges} edges`, next()]);
    const lines = withName
      ? prompt(t, x0, 128, 14) + name(t, x0, 188, 46, 'Angel Eduardo ', 'Luna') + sans(t, x0, 232, 22, 'Applied mathematics and data science') + sans(t, x0, 258, 15, 'Tecnológico de Monterrey', t.dim)
      : prompt(t, x0, 116, 14) + sans(t, x0, 172, 34, 'Applied mathematics') + sans(t, x0, 212, 34, 'and data science') + sans(t, x0, 248, 15, 'Tecnológico de Monterrey', t.dim);
    return `<g mask="url(#veil)">${wh.g}</g>${wh.top}${lines}${st.svg}`;
  }, [660, 940, 1, 0.3]);
}

// GitHub profile header 880×188: name left, the wheel behind the right half, a statusline along the bottom.
for (const [tn, t] of Object.entries(THEMES)) {
  const w = 880, h = 188, bh = 24;
  banners[`github-header-${tn}`] = doc(t, w, h, 'Eduardo Luna, applied mathematics and data science', (t) => {
    const wh = wheel(t, { W: w, H: h - bh, cx: 650, cy: 92, r0: 175, k: 0.95, sz: 1, lw: 1, at: -20, avoid: (x) => x < 560 });
    const bar = statusbar(t, w, h - bh, bh, 12, ['FIRE', 'readme', `${P.edges} edges`, next()], [`nll ${P.nll.toFixed(2)}`, `2×4 · ${F.params.toLocaleString('en-US')} params`]);
    return `<g mask="url(#veil)">${wh.g}</g>${wh.top}`
      + prompt(t, 28, 38, 13) + name(t, 28, 92, 50, 'Eduardo ', 'Luna')
      + sans(t, 30, 124, 19, 'Applied mathematics and data science') + sans(t, 30, 146, 13, 'Tecnológico de Monterrey', t.dim) + bar;
  }, [380, 560, 0.25, 1]);
}

// GitHub social preview 1280×640: the site's hero.
for (const [tn, t] of Object.entries(THEMES)) {
  const w = 1280, h = 640, tb = 40, sb = 30;
  banners[`github-social-${tn}`] = doc(t, w, h, 'Angel Eduardo Luna, applied mathematics and data science, Tecnológico de Monterrey', (t) => {
    const wh = wheel(t, { W: w, H: h - sb, cx: 990, cy: 350, r0: 360, k: 0.95, sz: 1.5, lw: 1.3, at: -40, avoid: (x, y) => y < tb + 30 || x < 860 });
    const top = `<rect width="${w}" height="${tb}" fill="${t.bar}"/><rect y="${tb - 1}" width="${w}" height="1" fill="${t.edge}"/>`
      + `<rect x="40" y="13" width="9" height="15" fill="${t.red}"/><text x="58" y="25" font-family="${MONO}" font-size="13" font-weight="500" fill="${t.ink}">ael <tspan font-weight="400" fill="${t.dim}">~/portfolio</tspan></text>`
      + ['work', 'methods', 'further', 'contact'].map((s, i) => `<text x="${250 + i * 118}" y="25" font-family="${MONO}" font-size="13" fill="${t.dim}"><tspan fill="${t.faint}">${i + 1}</tspan> ${s}</text>`).join('');
    const bar = statusbar(t, w, h - sb, sb, 12.5, ['FIRE', 'hero', `${P.edges} edges`, next()], [`nll ${P.nll.toFixed(2)}`, `2×4 · ${F.params.toLocaleString('en-US')} params`]);
    return `<g mask="url(#veil)">${wh.g}</g>${wh.top}${top}`
      + prompt(t, 80, 214, 17)
      + name(t, 80, 316, 108, 'Angel', '')
      + name(t, 80, 408, 108, 'Eduardo ', 'Luna')
      + sans(t, 84, 466, 25, 'Applied mathematics and data science,', t.ink) + sans(t, 84, 500, 25, 'Tecnológico de Monterrey', t.ink)
      + `<text x="84" y="552" font-family="${MONO}" font-size="14" fill="${t.dim}"><tspan fill="${t.ink}" font-weight="600">4</tspan> featured projects · <tspan fill="${t.ink}" font-weight="600">4</tspan> partners · <tspan fill="${t.ink}" font-weight="600">11</tspan> methods</text>`
      + bar;
  }, [470, 840, 0.3, 1]);
}

for (const [name_, svg] of Object.entries(banners)) writeFileSync(join(out, `${name_}.svg`), svg);
console.log(`wrote ${Object.keys(banners).length} svg to banner/out/terminal; frame: "…${P.ctx.slice(-20)}" → '${P.char}' ${P.p.toFixed(2)}, ${P.edges} edges`);
