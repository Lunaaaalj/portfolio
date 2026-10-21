// Title-screen field: a logarithmic spiral r = a·e^(bθ) shown through its tangent lines.
// The tangent direction at θ is (b cosθ − sinθ, b sinθ + cosθ); it meets the radius at the
// constant angle arccot(b), so the envelope of the segments reads as the curve itself.
// On first load a pen traces the spiral outward and lays each tangent as it passes;
// afterwards the tangents flow outward along the curve, which loops seamlessly because
// rotating a logarithmic spiral is the same as scaling it.

import { isDark, onThemeChange, reducedMotion, rgba, smooth, tone, token, type Tone } from './palette';

export function mountSpiral(canvas: HTMLCanvasElement): void {
  const host = canvas.parentElement as HTMLElement;
  const ctx = canvas.getContext('2d')!;

  const N = 150, ARMS = 2;
  const DRAW = 3.6, LINE_GROW = 0.5;      // seconds: pen sweep, and each tangent's growth
  let W = 0, H = 0, tones: Tone[] = [], grid = '', pen = '';
  let running = false, visible = true, last = 0, clock = 0;
  let flow = 0, spin = 0;                 // outward flow (in slots) and slow rotation
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  let scroll = 0;

  const penAt = (x: number) => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
  const penInverse = (y: number) => 0.5 - Math.sin(Math.asin(1 - 2 * y) / 3);
  const easeOut = (x: number) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);

  function readTones() {
    const dark = isDark();
    tones = [
      tone('--ink', dark ? 0.5 : 0.68, 1.2),
      tone('--graphite', dark ? 0.6 : 0.62, 1.05),
      tone('--line-accent', dark ? 0.5 : 0.58, 1.15),
      tone('--rule', 1, 1.35),
      tone('--survey', dark ? 0.42 : 0.34, 1.05),
    ];
    grid = token('--rule');
    pen = token('--survey');
  }

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    W = host.clientWidth; H = host.clientHeight;
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    draw();
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);
    const narrow = W < 760;
    const S = Math.min(W, H) * (narrow ? 1.15 : 1);
    const cx = W * (narrow ? 0.5 : 0.68) + cur.x * W * 0.03;
    const cy = H * (narrow ? 0.33 : 0.5) + cur.y * H * 0.03;
    const D = Math.hypot(W, H);

    const b = 0.18 + cur.y * 0.03;                     // pointer height tightens or loosens the spiral
    const rMin = S * 0.006, rMax = S * 0.95 * (1 + scroll * 0.6);
    const span = Math.log(rMax / rMin) / b, step = span / N;
    const rot = cur.x * 0.9 + spin;                    // pointer x rotates the whole figure
    const drawn = reducedMotion.matches ? Infinity : clock;
    const fade = 1 - scroll * 0.75;
    const penTheta = span * penAt(drawn / DRAW);

    // Graph-paper axes
    ctx.strokeStyle = grid; ctx.lineWidth = 1; ctx.globalAlpha = 0.45 * Math.min(1, drawn / 0.6);
    ctx.beginPath();
    for (let g = -4; g <= 4; g++) {
      const gx = Math.round(cx + g * S * 0.25) + 0.5, gy = Math.round(cy + g * S * 0.25) + 0.5;
      ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.moveTo(0, gy); ctx.lineTo(W, gy);
    }
    ctx.stroke();

    for (let arm = 0; arm < ARMS; arm++) {
      const off = rot + arm * Math.PI, armA = arm ? 0.42 : 1;

      // The curve itself, faint, up to the pen
      ctx.strokeStyle = arm ? grid : pen; ctx.lineWidth = 1; ctx.globalAlpha = (arm ? 0.6 : 0.35) * fade;
      ctx.beginPath();
      for (let q = 0; q <= 400; q++) {
        const th = (span * q) / 400;
        if (th > penTheta) break;
        const rr = rMin * Math.exp(b * th);
        const x = cx + rr * Math.cos(th + off), y = cy + rr * Math.sin(th + off);
        if (q) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      for (let k = 0; k < N; k++) {
        const t = (k + (flow % 1)) * step;             // flow slides every point outward along the curve
        if (t > penTheta) break;
        const r = rMin * Math.exp(b * t), ang = t + off;
        const c = Math.cos(ang), s = Math.sin(ang);
        let dx = b * c - s, dy = b * s + c;
        const len = Math.hypot(dx, dy); dx /= len; dy /= len;

        const born = DRAW * penInverse(t / span);      // when the pen reached this point
        const grow = reducedMotion.matches ? 1 : easeOut((drawn - born) / LINE_GROW);
        const half = Math.min(D, r * 3.2) * grow;
        const w = smooth(rMin * 3, rMin * 14, r) * (1 - smooth(rMax * 0.7, rMax, r));

        // Tone follows the line, not the slot: flow moves lines between slots,
        // so indexing by k alone would recolour every line at once each time flow wraps.
        const id = k - Math.floor(flow), L = tones.length;
        const tn = tones[(((id * 7 + arm * 3) % L) + L) % L];
        const al = tn.a * w * armA * fade;
        if (al < 0.004 || half < 1) continue;

        const px = cx + r * c, py = cy + r * s;
        const x0 = px - dx * half, y0 = py - dy * half, x1 = px + dx * half, y1 = py + dy * half;
        // Taper: transparent at both tips, full strength at the tangent point
        const gr = ctx.createLinearGradient(x0, y0, x1, y1);
        gr.addColorStop(0, rgba(tn.rgb, 0));
        gr.addColorStop(0.2, rgba(tn.rgb, al * 0.35));
        gr.addColorStop(0.5, rgba(tn.rgb, al));
        gr.addColorStop(0.8, rgba(tn.rgb, al * 0.35));
        gr.addColorStop(1, rgba(tn.rgb, 0));
        ctx.strokeStyle = gr; ctx.lineWidth = tn.w;
        ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
      }

      // Pen nib while drawing
      if (!arm && drawn < DRAW + 0.4) {
        const pr = rMin * Math.exp(b * penTheta);
        ctx.globalAlpha = 1 - smooth(DRAW - 0.2, DRAW + 0.4, drawn);
        ctx.fillStyle = pen; ctx.beginPath();
        ctx.arc(cx + pr * Math.cos(penTheta + off), cy + pr * Math.sin(penTheta + off), 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  }

  function frame(now: number) {
    if (!running) return;
    const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
    clock += dt;
    const idle = smooth(DRAW + 0.2, DRAW + 1.6, clock); // idle motion eases in after the drawing
    flow += dt * 0.22 * idle;
    spin += dt * 0.012 * idle;
    cur.x += (target.x - cur.x) * 0.06 * idle;
    cur.y += (target.y - cur.y) * 0.06 * idle;
    draw();
    requestAnimationFrame(frame);
  }
  function start() {
    if (running || reducedMotion.matches || !visible || document.hidden) return;
    running = true; last = 0; requestAnimationFrame(frame);
  }
  function stop() { running = false; }

  window.addEventListener('pointermove', (e) => {
    target.x = e.clientX / window.innerWidth - 0.5;
    target.y = e.clientY / window.innerHeight - 0.5;
  }, { passive: true });
  window.addEventListener('scroll', () => {
    scroll = Math.min(1, Math.max(0, window.scrollY / (H || 1)));
    if (reducedMotion.matches) draw();
  }, { passive: true });
  new IntersectionObserver((en) => { visible = en[0].isIntersecting; if (visible) start(); else stop(); }).observe(host);
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
  reducedMotion.addEventListener('change', () => { if (reducedMotion.matches) { stop(); draw(); } else start(); });
  onThemeChange(() => { readTones(); draw(); });
  window.addEventListener('resize', resize);

  // Opened already scrolled past the title (a reload, a fragment link): skip the drawing
  if (window.scrollY > host.clientHeight) clock = DRAW + 2;
  readTones(); resize(); start();
}
