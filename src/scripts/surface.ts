// The page's background: a loss surface drawn by its level sets, and an optimiser descending it.
//
// The surface is f(x, y) = Σ aᵢ·exp(−|p − cᵢ|² / 2σᵢ²) − y / T in CSS pixels of the document: a
// gentle tilt down the page, a well (aᵢ < 0) beside each section and featured project, ridges
// between them, and seeded bumps that give the level sets their structure. A WebGL2 fragment
// shader draws every Δ-level as a hairline (every fifth as an index contour, as on an engraved
// survey), so the field can breathe slowly at little cost.
//
// The oxblood path is basin hopping (Wales & Doye, 1997): gradient descent with momentum until it
// settles in a basin, then a perturbed restart towards the next one. It is computed here, on this
// same surface, and drawn up to the reader's position, with its update rules written along it.
// Pointing anywhere starts a short descent from the pointer. All of it is decorative, and the page
// says so.
//
// Scrolling costs nothing here. The canvases sit in the document, not fixed to the viewport, and
// cover a window of the page taller than the screen; the browser scrolls them natively, and they
// are redrawn only when the reader nears the edge of that window. The path is drawn incrementally,
// and the glows and settling rings are DOM elements animated by CSS on the compositor.

import { isDark, onThemeChange, reducedMotion, token, toRgb } from './palette';

interface Gauss { x: number; y: number; a: number; s: number }
interface Pt { x: number; y: number; hop?: boolean }
interface Probe { pts: Pt[]; t0: number }
interface Label { el: HTMLElement; at: number }

export interface SurfaceOptions {
  host: HTMLElement;           // absolutely positioned over the whole document, clipping its content
  field: HTMLCanvasElement;
  ink: HTMLCanvasElement;
  probes: HTMLCanvasElement;   // fixed to the viewport: pointer probes are brief
  start: HTMLElement;          // the path starts just beside this element (the name or the title)
  basins: HTMLElement[];       // one well beside each of these, in reading order
  anchor: HTMLElement;         // its right edge is the right edge of the text (margin column)
  readout?: HTMLElement | null;
  seed?: number;
  // 'beside': start just right of the start element (the home title screen has no text to its
  // right); 'edge': start right of the text column, so the path never crosses margin notes
  startAt?: 'beside' | 'edge';
  algorithm?: boolean;         // set the algorithm box beside the second basin
}

const DELTA = 0.07;            // level spacing
const T = 1400;                // tilt: f falls by 1 every T px down the page
const MAX_G = 48;              // gaussians passed to the shader per draw
const ETA = 3600, BETA = 0.9, VMAX = 6;   // heavy-ball step, momentum, speed limit (px per step)
const REVEAL = 1.5;            // s: the engraving spreads from the start point
const BREATHE_FPS = 15;        // the surface moves a fraction of a pixel per frame: 15 fps reads as smooth
const FIELD_DPR = 1.25;        // hairlines stay crisp; a third fewer pixels than 1.5×

function rng(seed: number) {
  let s = (seed >>> 0) || 1;
  return () => ((s = (s * 16807) % 2147483647) / 2147483647);
}

const VERT = `#version 300 es
in vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 u_res; uniform float u_dpr;
uniform vec4 u_g[${MAX_G}]; uniform int u_n;
uniform float u_tilt; uniform float u_ph; uniform float u_rip; uniform float u_t;
uniform vec2 u_origin; uniform float u_radius; uniform float u_edge; uniform float u_narrow;
uniform vec3 u_c1; uniform vec3 u_c2; uniform float u_a1; uniform float u_a2;
out vec4 o;
void main() {
  vec2 p = vec2(gl_FragCoord.x, u_res.y * u_dpr - gl_FragCoord.y) / u_dpr;
  float f = -p.y / ${T.toFixed(1)} + u_tilt;
  for (int i = 0; i < ${MAX_G}; i++) {
    if (i >= u_n) break;
    vec4 g = u_g[i]; vec2 d = p - g.xy;
    f += g.z * exp(-dot(d, d) / (2.0 * g.w * g.w));
  }
  f += u_rip * sin(p.x * 0.0105 + u_t * 0.21) * sin(p.y * 0.0087 + u_ph);
  float v = f / ${DELTA.toFixed(3)};
  float fw = max(fwidth(v), 1e-4);
  float k = floor(v + 0.5);
  bool idx = mod(k, 5.0) < 0.5;
  float d = abs(fract(v + 0.5) - 0.5) / fw;          // distance to the nearest level, device px
  float lw = (idx ? 1.25 : 0.8) * u_dpr * 0.5;
  float a = 1.0 - smoothstep(lw - 0.5, lw + 0.6, d);
  a *= 1.0 - smoothstep(0.22, 0.55, fw);             // where levels crowd, let them go rather than mat
  a *= 1.0 - smoothstep(u_radius - 260.0, u_radius, length(p - u_origin));
  // Index lines are ink: behind the text they fall back to hairline strength, beside it they hold
  float beside = u_narrow > 0.5 ? 0.0 : smoothstep(u_edge - 60.0, u_edge + 200.0, p.x);
  float A = idx ? mix(u_a1 * 0.55, u_a2, beside) : u_a1;
  if (idx && beside < 0.5) idx = false;
  vec3 c = idx ? u_c2 : u_c1;
  o = vec4(c * a * A, a * A);
}`;

// What is written along the path: the update rules of the descent and of the restart
const DESCENT = [
  '<i>v</i> ← <i>βv</i> − <i>η</i>∇<i>f</i>(<i>θ</i>)',
  '<i>θ</i> ← <i>θ</i> + <i>v</i>',
  'until ‖<i>v</i>‖ &lt; <i>ε</i>',
  '<i>β</i> = 0.9',
];
const HOP = '<i>θ</i> ← <i>θ</i>* + <i>ξ</i>';
const ALGORITHM = `<p class="sx-algo-h"><b>Algorithm 1</b> Basin hopping on this page</p>
<ol>
<li><i>θ</i> ← <i>θ</i><sub>0</sub></li>
<li><b>for each</b> section <i>s</i> <b>do</b></li>
<li class="in1"><i>v</i> ← 0</li>
<li class="in1"><b>repeat</b></li>
<li class="in2"><i>v</i> ← <i>βv</i> − <i>η</i>∇<i>f</i>(<i>θ</i>)</li>
<li class="in2"><i>θ</i> ← <i>θ</i> + <i>v</i></li>
<li class="in1"><b>until</b> ‖<i>v</i>‖ &lt; <i>ε</i></li>
<li class="in1"><i>θ</i>* ← <i>θ</i>; &nbsp;<i>θ</i> ← <i>θ</i>* + <i>ξ</i></li>
<li><b>end for</b></li>
</ol>`;

export function mountSurface(opt: SurfaceOptions): void {
  const { host, field, ink } = opt;
  const ctx = ink.getContext('2d')!;
  const pctx = opt.probes.getContext('2d')!;
  let W = 0, H = 0, CH = 0, top = 0, inkDpr = 1, edge = 0, free = 0, wide = true;
  let G: Gauss[] = [], path: Pt[] = [], maxY: number[] = [], ends: number[] = [], mins: Pt[] = [];
  let head = 0, drawn = 0, lastHead = -1, born = 0, crossed = 0, lastBreath = 0, lastScroll = 0;
  let colours = { c1: [0, 0, 0], c2: [0, 0, 0], a1: 0.5, a2: 0.5, accent: '0,0,0', graphite: '0,0,0', dark: false };
  let fieldDirty = true, inkDirty = true, looping = false;
  const probes: Probe[] = [];
  let labels: Label[] = [];
  let lastProbe = { x: -1e4, y: -1e4, t: 0 };
  let engraved = false;   // the engraving spreads once per visit; later pages open on a finished surface
  try { engraved = sessionStorage.getItem('engraved') === '1'; } catch {}

  // DOM layers: the head's glow, one glow and ring per basin, the labels
  const layer = document.createElement('div');
  layer.className = 'sx-layer';
  host.appendChild(layer);
  const headGlow = document.createElement('div');
  headGlow.className = 'sx-head';
  headGlow.innerHTML = '<i class="sx-mark"></i>';
  layer.appendChild(headGlow);
  let basinEls: HTMLElement[] = [];

  // ---------- The surface ----------
  function f(x: number, y: number): number {
    let v = -y / T;
    for (const g of G) { const dx = x - g.x, dy = y - g.y; v += g.a * Math.exp(-(dx * dx + dy * dy) / (2 * g.s * g.s)); }
    return v;
  }
  function grad(x: number, y: number): [number, number] {
    let gx = 0, gy = -1 / T;
    for (const g of G) {
      const dx = x - g.x, dy = y - g.y, s2 = g.s * g.s;
      if (dx * dx + dy * dy > 16 * s2) continue;
      const e = g.a * Math.exp(-(dx * dx + dy * dy) / (2 * s2)) / s2;
      gx -= e * dx; gy -= e * dy;
    }
    return [gx, gy];
  }

  /** Heavy-ball descent from p; appends the points visited to out and returns the last. */
  function descend(p: Pt, steps: number, out: Pt[]): Pt {
    let x = p.x, y = p.y, vx = 0, vy = 0;
    for (let i = 0; i < steps; i++) {
      const [gx, gy] = grad(x, y);
      vx = BETA * vx - ETA * gx; vy = BETA * vy - ETA * gy;
      const sp = Math.hypot(vx, vy);
      if (sp > VMAX) { vx *= VMAX / sp; vy *= VMAX / sp; }
      x += vx; y += vy;
      const q = out[out.length - 1];
      if (!q || Math.hypot(x - q.x, y - q.y) > 1.5) out.push({ x, y });
      if (i > 40 && sp < 0.04) break;
    }
    return { x, y };
  }

  function layout() {
    W = document.documentElement.clientWidth; H = window.innerHeight;
    CH = Math.round(H * 2);                           // the drawn window: the screen plus half a screen either side
    inkDpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const fd = Math.min(window.devicePixelRatio || 1, FIELD_DPR);
    field.width = Math.round(W * fd); field.height = Math.round(CH * fd); field.dataset.dpr = String(fd);
    ink.width = Math.round(W * inkDpr); ink.height = Math.round(CH * inkDpr);
    for (const c of [field, ink]) { c.style.width = `${W}px`; c.style.height = `${CH}px`; }
    const pd = inkDpr;
    opt.probes.width = Math.round(W * pd); opt.probes.height = Math.round(H * pd);
    pctx.setTransform(pd, 0, 0, pd, 0, 0);

    edge = opt.anchor.getBoundingClientRect().right;
    free = W - edge;
    wide = free >= 220;
    const docH = document.documentElement.scrollHeight;
    const r = rng(opt.seed ?? 7);
    const sigma = wide ? Math.max(120, Math.min(230, free * 0.42)) : Math.max(90, W * 0.2);
    const algo = !!opt.algorithm && wide && free >= 330;

    // Field quietening: full strength beside the text, about a third of it behind
    const quiet = wide ? 0.34 : 0.3;
    const m = wide
      ? `linear-gradient(90deg, rgba(0,0,0,${quiet}) ${Math.round(edge - 60)}px, #000 ${Math.round(edge + Math.min(free * 0.45, 200))}px)`
      : `linear-gradient(90deg, rgba(0,0,0,${quiet}) 0, rgba(0,0,0,${quiet}) 60%, rgba(0,0,0,0.8) 100%)`;
    field.style.maskImage = field.style.webkitMaskImage = m;

    G = [];
    const sy = window.scrollY;
    const centres = opt.basins.map((el, i) => {
      const b = el.getBoundingClientRect();
      // Beside the algorithm box the basin moves out, so the box and the path keep apart
      const fx = algo && i === 1 ? 0.82 : i % 2 ? 0.62 : 0.5;
      const x = wide ? edge + free * fx : W * (i % 2 ? 0.86 : 0.78);
      const y = b.top + sy + Math.min(b.height * 0.42, 300);
      return { x, y };
    });
    centres.forEach((c, i) => {
      // The first basin is wide and deep, so the descent from beside the name falls into it
      G.push(i === 0 ? { x: c.x, y: c.y, a: -1.35, s: sigma * 1.75 } : { x: c.x, y: c.y, a: -1, s: sigma * (0.9 + 0.2 * r()) });
      const n = centres[i + 1];
      if (n) G.push({ x: c.x + (r() - 0.5) * sigma * 1.4, y: (c.y + n.y) / 2, a: 0.42, s: sigma * 1.1 });
    });
    for (let i = 0, n = Math.ceil(docH / 380); i < n; i++) {
      G.push({ x: r() * W, y: r() * docH, a: (r() < 0.5 ? -1 : 1) * (0.18 + 0.3 * r()), s: 140 + r() * 200 });
    }

    // ---------- Basin hopping ----------
    const s = opt.start.getBoundingClientRect();
    const p0 = wide && opt.startAt === 'edge'
      ? { x: edge + free * 0.84, y: Math.max(48, s.top + sy - 170) }
      : { x: Math.min(s.right + 40, W - 40), y: s.top + sy + s.height * 0.4 };
    path = [{ ...p0 }]; ends = []; mins = [];
    const starts: number[] = [0];                       // where each descent begins
    let p: Pt = p0;
    centres.forEach((c, i) => {
      for (let tries = 0; tries < 3; tries++) {
        p = descend(p, 900, path);
        if (Math.hypot(p.x - c.x, p.y - c.y) < sigma * 1.2) break;
        p = { x: p.x + (c.x - p.x) * 0.6, y: p.y + (c.y - p.y) * 0.6, hop: true };   // restart nearer
        path.push(p);
      }
      ends.push(path.length - 1); mins.push({ ...p });
      const n = centres[i + 1];
      if (n) {
        p = { x: p.x + (n.x - p.x) * 0.55 + (r() - 0.5) * 80, y: p.y + (n.y - p.y) * 0.55, hop: true };
        path.push(p);
        starts.push(path.length - 1);
      }
    });
    maxY = []; let my = -Infinity;
    for (const q of path) { my = Math.max(my, q.y); maxY.push(my); }
    head = Math.min(head, path.length - 1);

    buildDom(starts, algo, centres);
    top = -1e9;                                         // force the window to be placed
    placeWindow(true);
    request();
  }

  // ---------- Glows, rings and the writing along the path ----------
  function buildDom(starts: number[], algo: boolean, centres: { x: number; y: number }[]) {
    for (const el of basinEls) el.remove();
    for (const l of labels) l.el.remove();
    basinEls = []; labels = [];

    mins.forEach((m, k) => {
      const el = document.createElement('div');
      el.className = 'sx-basin';
      el.style.transform = `translate(${m.x.toFixed(1)}px, ${m.y.toFixed(1)}px)`;
      el.innerHTML = '<i class="sx-ring"></i><i class="sx-ring"></i><i class="sx-ring"></i>';
      layer.appendChild(el);
      basinEls.push(el);
      if (k < crossed) el.classList.add('is-on');
    });

    if (!wide) return;                                  // no room for writing beside the text on narrow screens
    const right = W - 16;
    const add = (html: string, x: number, y: number, at: number, cls = '') => {
      const el = document.createElement('div');
      el.className = `sx-label ${cls}`;
      el.innerHTML = html;
      el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
      layer.appendChild(el);
      labels.push({ el, at });
      return el;
    };
    // Room for a label of about n characters at x, inside the free area
    const fits = (x: number, n: number) => x > edge + 12 && x + n * 7.6 < right;

    add('<i>θ</i><sub>0</sub>', path[0].x + 10, path[0].y - 26, 0, 'sx-sm');

    // One rule along each descent: at the first point of its middle third with room beside it
    starts.forEach((s0, k) => {
      const e0 = ends[k];
      if (e0 - s0 < 30) return;
      const html = DESCENT[k % DESCENT.length], n = html.replace(/<[^>]+>/g, '').length;
      for (let i = s0 + Math.floor((e0 - s0) * 0.3); i < s0 + (e0 - s0) * 0.7; i += 4) {
        const q = path[i], a = path[Math.max(0, i - 6)], b = path[Math.min(path.length - 1, i + 6)];
        if (Math.abs(b.x - a.x) > Math.abs(b.y - a.y)) {
          // A shallow stretch: the rule sits above the line, centred on it
          const x = q.x - (n * 7.6) / 2;
          if (fits(x, n)) { add(html, x, q.y - 34, i); return; }
          continue;
        }
        for (const side of [1, -1]) {
          const x = side > 0 ? q.x + 18 : q.x - 18 - n * 7.6;
          if (fits(x, n)) { add(html, x, q.y - 10, i); return; }
        }
      }
    });

    // The restarts, written beside their dotted jumps
    for (let i = 1; i < path.length; i++) {
      if (!path[i].hop) continue;
      const a = path[i - 1], b = path[i], mx = (a.x + b.x) / 2 + 14, my = (a.y + b.y) / 2 - 10;
      if (fits(mx, 9)) add(HOP, mx, my, i, 'sx-hop');
    }

    // The value at each minimum reached, computed on this surface
    mins.forEach((m, k) => {
      const t = `<i>f</i>(<i>θ</i>*) = ${f(m.x, m.y).toFixed(3).replace('-', '−')}`;
      const x = m.x + 22;
      if (fits(x, 15)) add(t, x, m.y + 12, ends[k], 'sx-sm sx-min');
    });

    // The algorithm itself, beside the second basin
    if (algo && centres[1]) {
      const el = add(ALGORITHM, edge + 18, centres[1].y - 150, ends[0], 'sx-algo');
      el.style.width = `${Math.min(236, free * 0.62)}px`;
    }
    syncLabels(true);
  }

  function syncLabels(force = false) {
    const n = Math.floor(head), still = reducedMotion.matches;
    for (const l of labels) {
      const on = still || n >= l.at;
      if (force || on !== l.el.classList.contains('is-on')) l.el.classList.toggle('is-on', on);
    }
  }

  function readColours() {
    const rgb = (n: string) => toRgb(token(n)).split(',').map((v) => Number(v) / 255);
    const dark = isDark();
    colours = {
      c1: rgb('--contour'), c2: rgb('--ink'),
      a1: dark ? 0.62 : 0.6, a2: dark ? 0.55 : 0.6,   // every fifth level: an index contour in ink
      accent: toRgb(token('--accent')), graphite: toRgb(token('--graphite')), dark,
    };
    fieldDirty = inkDirty = true; drawn = 0;
    request();
  }

  // ---------- The drawn window ----------
  /** Moves the window when the viewport nears its edge; returns true when it moved. */
  function placeWindow(force = false): boolean {
    const sy = window.scrollY, margin = H * 0.15;
    if (!force && sy >= top + margin && sy + H <= top + CH - margin) return false;
    const docH = document.documentElement.scrollHeight;
    top = Math.max(0, Math.min(sy - (CH - H) / 2, docH - CH));
    const t = `translate3d(0, ${top.toFixed(0)}px, 0)`;
    field.style.transform = ink.style.transform = t;
    fieldDirty = inkDirty = true; drawn = 0;
    return true;
  }

  // ---------- WebGL ----------
  const gl = field.getContext('webgl2', { premultipliedAlpha: true, antialias: false });
  const U: Record<string, WebGLUniformLocation | null> = {};
  if (gl) {
    const sh = (type: number, src: string) => { const s = gl.createShader(type)!; gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog); gl.useProgram(prog);
    const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ['u_res', 'u_dpr', 'u_g', 'u_n', 'u_tilt', 'u_ph', 'u_rip', 'u_t', 'u_origin', 'u_radius', 'u_edge', 'u_narrow', 'u_c1', 'u_c2', 'u_a1', 'u_a2']) U[n] = gl.getUniformLocation(prog, n);
  }
  const gBuf = new Float32Array(MAX_G * 4);

  function drawField(t: number, reveal: number) {
    const fd = Number(field.dataset.dpr || 1);
    if (gl) {
      gl.viewport(0, 0, field.width, field.height);
      let n = 0;
      for (const g of G) {
        if (n >= MAX_G) break;
        const y = g.y - top;
        if (y < -3.2 * g.s || y > CH + 3.2 * g.s || g.x < -3.2 * g.s || g.x > W + 3.2 * g.s) continue;
        gBuf.set([g.x, y, g.a, g.s], n * 4); n++;
      }
      const period = 5 * DELTA;
      gl.uniform2f(U.u_res, W, CH); gl.uniform1f(U.u_dpr, fd);
      gl.uniform4fv(U.u_g, gBuf); gl.uniform1i(U.u_n, n);
      gl.uniform1f(U.u_tilt, -((top / T) % period));
      gl.uniform1f(U.u_ph, (top * 0.0087 - t * 0.17) % (2 * Math.PI));
      gl.uniform1f(U.u_rip, reducedMotion.matches ? 0 : 0.03);
      gl.uniform1f(U.u_t, t % 1000);
      gl.uniform2f(U.u_origin, path[0]?.x ?? 0, (path[0]?.y ?? 0) - top);
      gl.uniform1f(U.u_radius, reveal >= 1 ? 1e5 : 260 + reveal * Math.hypot(W, H) * 1.1);
      gl.uniform1f(U.u_edge, edge); gl.uniform1f(U.u_narrow, wide ? 0 : 1);
      gl.uniform3fv(U.u_c1, colours.c1); gl.uniform3fv(U.u_c2, colours.c2);
      gl.uniform1f(U.u_a1, colours.a1); gl.uniform1f(U.u_a2, colours.a2);
      gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    } else {
      drawFieldFallback();
    }
  }

  // Without WebGL2: the level sets by marching squares on the field canvas, still
  function drawFieldFallback() {
    const c2 = field.getContext('2d');
    if (!c2) return;
    const fd = Number(field.dataset.dpr || 1);
    c2.setTransform(fd, 0, 0, fd, 0, 0); c2.clearRect(0, 0, W, CH);
    const st = 8, cols = Math.ceil(W / st) + 1, rows = Math.ceil(CH / st) + 1;
    const v = new Float32Array(cols * rows);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) v[j * cols + i] = f(i * st, j * st + top) / DELTA;
    c2.lineWidth = 0.8;
    c2.strokeStyle = `rgba(${colours.c1.map((c) => Math.round(c * 255)).join(',')},${colours.a1 * 0.8})`;
    c2.beginPath();
    for (let j = 0; j < rows - 1; j++) for (let i = 0; i < cols - 1; i++) {
      const q = [v[j * cols + i], v[j * cols + i + 1], v[(j + 1) * cols + i + 1], v[(j + 1) * cols + i]];
      const lo = Math.ceil(Math.min(...q)), hi = Math.floor(Math.max(...q));
      for (let L = lo; L <= hi && L - lo < 3; L++) {
        const c = [[0, 0], [1, 0], [1, 1], [0, 1]], pts: number[][] = [];
        for (let e = 0; e < 4; e++) {
          const a = q[e], b = q[(e + 1) % 4];
          if ((a < L) !== (b < L)) { const t = (L - a) / (b - a), A = c[e], B = c[(e + 1) % 4]; pts.push([(i + A[0] + (B[0] - A[0]) * t) * st, (j + A[1] + (B[1] - A[1]) * t) * st]); }
        }
        if (pts.length >= 2) { c2.moveTo(pts[0][0], pts[0][1]); c2.lineTo(pts[1][0], pts[1][1]); }
      }
    }
    c2.stroke();
  }

  // ---------- The optimiser's path: drawn incrementally, with a glow ----------
  function strokeRange(from: number, to: number) {
    const a = colours.accent, alpha = wide ? 0.92 : 0.5;
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // On the dark ground the line glows; on paper it is ink, and a halo would only stain it
    ctx.shadowColor = `rgba(${a},0.75)`;
    ctx.shadowBlur = colours.dark ? 10 * inkDpr : 0;
    ctx.strokeStyle = `rgba(${a},${alpha})`;
    ctx.lineWidth = wide ? 2 : 1.2;
    ctx.beginPath();
    let pen = false;
    for (let i = Math.max(1, from); i <= to && i < path.length; i++) {
      const q = path[i], prev = path[i - 1];
      const y = q.y - top;
      if (q.hop) {
        ctx.stroke();
        ctx.save(); ctx.shadowBlur = 0; ctx.setLineDash([1, 5]); ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(prev.x, prev.y - top); ctx.lineTo(q.x, y); ctx.stroke(); ctx.restore();
        ctx.beginPath(); pen = false; continue;
      }
      if (y < -300 || y > CH + 300) { pen = false; continue; }
      if (!pen) { ctx.moveTo(prev.x, prev.y - top); pen = true; }
      ctx.lineTo(q.x, y);
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  function drawInk() {
    const n = Math.min(Math.floor(head), path.length - 1);
    if (inkDirty || n < drawn) {
      ctx.setTransform(inkDpr, 0, 0, inkDpr, 0, 0);
      ctx.clearRect(0, 0, W, CH);
      inkDirty = false; drawn = 0;
    }
    if (n > drawn) { strokeRange(drawn, n); drawn = n; }

    // The head: a pulsing glow, moved on the compositor
    const h = path[n];
    if (h && born) headGlow.style.transform = `translate(${h.x.toFixed(1)}px, ${h.y.toFixed(1)}px)`;

    if (opt.readout && n !== lastHead && h) {
      lastHead = n;
      opt.readout.textContent = `step ${n.toLocaleString('en-GB')}   f = ${f(h.x, h.y).toFixed(3).replace('-', '−')}`;
    }
  }

  // Probes from the pointer, on a viewport canvas: they last two seconds
  function drawProbes(now: number) {
    pctx.clearRect(0, 0, W, H);
    const sy = window.scrollY;
    for (let i = probes.length - 1; i >= 0; i--) {
      const pr = probes[i], age = (now - pr.t0) / 1000;
      if (age > 2.6) { probes.splice(i, 1); continue; }
      const grow = Math.min(1, age / 0.9), fade = 1 - Math.max(0, (age - 1.2) / 1.4);
      const m = Math.max(2, Math.floor(pr.pts.length * (1 - Math.pow(1 - grow, 3))));
      pctx.strokeStyle = `rgba(${colours.graphite},${(0.75 * fade).toFixed(3)})`; pctx.lineWidth = 1;
      pctx.beginPath(); pctx.moveTo(pr.pts[0].x, pr.pts[0].y - sy);
      for (let j = 1; j < m; j++) pctx.lineTo(pr.pts[j].x, pr.pts[j].y - sy);
      pctx.stroke();
      const e = pr.pts[m - 1];
      pctx.fillStyle = `rgba(${colours.graphite},${fade.toFixed(3)})`;
      pctx.beginPath(); pctx.arc(e.x, e.y - sy, 2.2, 0, 7); pctx.fill();
    }
  }

  function target(): number {
    const line = window.scrollY + H * 0.62;
    let lo = 0, hi = maxY.length - 1;
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (maxY[mid] <= line) lo = mid; else hi = mid - 1; }
    return Math.max(lo, ends[0] ?? 0);                 // the first basin is reached on arrival
  }

  function ring(k: number) {
    const el = basinEls[k];
    if (!el || reducedMotion.matches) return;
    el.classList.remove('is-ringing'); void el.offsetWidth; el.classList.add('is-ringing');
  }

  // ---------- One loop, running only while something moves ----------
  function frame(now: number) {
    if (!born) born = now;
    const still = reducedMotion.matches;
    const t = (now - born) / 1000;
    const reveal = still || engraved ? 1 : Math.min(1, t / REVEAL);
    if (reveal >= 1 && !engraved) { engraved = true; try { sessionStorage.setItem('engraved', '1'); } catch {} }

    placeWindow();
    const goal = target();
    if (still) head = goal;
    else if (t > 0.5) {
      const d = goal - head;
      head += Math.sign(d) * Math.min(Math.abs(d), Math.max(1.2, Math.abs(d) * 0.08));
    }
    while (crossed < ends.length && head >= ends[crossed]) {
      basinEls[crossed]?.classList.add('is-on'); ring(crossed); crossed++;
    }
    while (crossed > 0 && head < ends[crossed - 1]) { crossed--; basinEls[crossed]?.classList.remove('is-on'); }
    syncLabels();

    // The surface breathes at BREATHE_FPS, and holds still while the page is being scrolled
    const scrolling = now - lastScroll < 180;
    if (reveal < 1 || fieldDirty || (!still && !scrolling && now - lastBreath > 1000 / BREATHE_FPS)) {
      drawField(still ? 0 : t, reveal); fieldDirty = false; lastBreath = now;
    }
    drawInk();
    if (probes.length) drawProbes(now); else if (opt.probes.dataset.used) { pctx.clearRect(0, 0, W, H); delete opt.probes.dataset.used; }

    const busy = reveal < 1 || Math.abs(goal - head) > 0.5 || probes.length > 0 || fieldDirty;
    if (document.hidden || (still && !busy)) { looping = false; return; }
    requestAnimationFrame(frame);                       // breathing keeps the loop alive while visible
  }
  function request() { if (!looping) { looping = true; requestAnimationFrame(frame); } }

  // ---------- Events ----------
  window.addEventListener('scroll', () => { lastScroll = performance.now(); request(); }, { passive: true });
  let rz = 0, lastW = 0, lastDocH = 0;
  const relayout = () => {
    clearTimeout(rz);
    rz = window.setTimeout(() => {
      const w = document.documentElement.clientWidth, dh = document.documentElement.scrollHeight;
      // Mobile browsers resize the viewport as their toolbars move: ignore height-only changes
      if (w === lastW && Math.abs(dh - lastDocH) < 2 && Math.abs(window.innerHeight - H) < 140) return;
      lastW = w; lastDocH = dh; layout();
    }, 150);
  };
  window.addEventListener('resize', relayout);
  new ResizeObserver(relayout).observe(document.body);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) request(); });
  onThemeChange(readColours);
  reducedMotion.addEventListener('change', () => { syncLabels(true); request(); });

  function probe(cx: number, cy: number) {
    if (reducedMotion.matches || !G.length) return;
    const now = performance.now(), x = cx, y = cy + window.scrollY;
    if (Math.hypot(x - lastProbe.x, y - lastProbe.y) < 90 || now - lastProbe.t < 240) return;
    lastProbe = { x, y, t: now };
    const pts: Pt[] = [{ x, y }];
    descend({ x, y }, 160, pts);
    probes.push({ pts, t0: now });
    if (probes.length > 6) probes.shift();
    opt.probes.dataset.used = '1';
    request();
  }
  window.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse') probe(e.clientX, e.clientY); }, { passive: true });
  window.addEventListener('pointerdown', (e) => { if (e.pointerType !== 'mouse') probe(e.clientX, e.clientY); }, { passive: true });

  // Pointing at a featured entry rings its basin
  opt.basins.forEach((el, i) => {
    if (!el.matches('.entry')) return;
    el.addEventListener('pointerenter', () => ring(i));
    el.addEventListener('focusin', () => ring(i));
  });

  readColours();
  lastW = document.documentElement.clientWidth;
  layout();
  lastDocH = document.documentElement.scrollHeight;
  document.fonts?.ready.then(layout);
}
