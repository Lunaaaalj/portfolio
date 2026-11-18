// Forward pass of the 2-layer character transformer drawn behind the home page.
// Weights: src/data/network-weights.json, trained by scripts/network/train.py on the site's text.
// Pre-LayerNorm blocks, causal multi-head attention, tanh-GELU MLP; matches PyTorch to ~3e-6.

export interface Weights {
  vocab: string; T: number; D: number; H: number; L: number; M: number;
  val_loss: number; params: number;
  w: Record<string, { shape: number[]; b64: string }>;
}

export interface Pass {
  /** residual stream at the last position after the embedding */
  embed: Float32Array;
  /** MLP activations (after GELU) at the last position, one array per layer */
  mlp: Float32Array[];
  /** next-character probabilities */
  prob: Float32Array;
}

export interface Model {
  run(text: string): Pass;
  vocab: string; T: number; D: number; L: number; M: number;
  params: number; valLoss: number;
  tensor(name: string): Float32Array;
}

function decode(b64: string): Float32Array {
  const bin = atob(b64), u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return new Float32Array(u8.buffer);
}

export function load(W: Weights): Model {
  const { T, D, H, L, M, vocab } = W, dh = D / H, V = vocab.length;
  const t: Record<string, Float32Array> = {};
  for (const [k, v] of Object.entries(W.w)) t[k] = decode(v.b64);
  const P = (k: string) => t[k];

  // x: n×inn → n×out, torch layout w[out][inn]
  const lin = (x: Float32Array, n: number, w: Float32Array, b: Float32Array, out: number, inn: number) => {
    const y = new Float32Array(n * out);
    for (let r = 0; r < n; r++) for (let o = 0; o < out; o++) {
      let s = b[o]; const xo = r * inn, wo = o * inn;
      for (let i = 0; i < inn; i++) s += x[xo + i] * w[wo + i];
      y[r * out + o] = s;
    }
    return y;
  };
  const ln = (x: Float32Array, n: number, g: Float32Array, b: Float32Array) => {
    const y = new Float32Array(n * D);
    for (let r = 0; r < n; r++) {
      let m = 0, v = 0;
      for (let i = 0; i < D; i++) m += x[r * D + i];
      m /= D;
      for (let i = 0; i < D; i++) { const d = x[r * D + i] - m; v += d * d; }
      const s = 1 / Math.sqrt(v / D + 1e-5);
      for (let i = 0; i < D; i++) y[r * D + i] = (x[r * D + i] - m) * s * g[i] + b[i];
    }
    return y;
  };
  const gelu = (z: number) => 0.5 * z * (1 + Math.tanh(0.7978845608 * (z + 0.044715 * z * z * z)));

  function run(text: string): Pass {
    const ids = [...text.slice(-T)].map((c) => Math.max(0, vocab.indexOf(c)));
    const n = ids.length, te = P('tok.weight'), pe = P('pos.weight');
    const x = new Float32Array(n * D);
    for (let r = 0; r < n; r++) for (let i = 0; i < D; i++) x[r * D + i] = te[ids[r] * D + i] + pe[r * D + i];
    const embed = x.slice((n - 1) * D), mlp: Float32Array[] = [];
    for (let l = 0; l < L; l++) {
      const p = `blocks.${l}.`;
      const qkv = lin(ln(x, n, P(p + 'ln1.weight'), P(p + 'ln1.bias')), n, P(p + 'qkv.weight'), P(p + 'qkv.bias'), 3 * D, D);
      const y = new Float32Array(n * D), a = new Float32Array(n);
      for (let h = 0; h < H; h++) {
        for (let q = 0; q < n; q++) {
          let mx = -Infinity;
          for (let k = 0; k <= q; k++) {
            let s = 0;
            for (let i = 0; i < dh; i++) s += qkv[q * 3 * D + h * dh + i] * qkv[k * 3 * D + D + h * dh + i];
            a[k] = s / Math.sqrt(dh); if (a[k] > mx) mx = a[k];
          }
          let z = 0;
          for (let k = 0; k <= q; k++) { a[k] = Math.exp(a[k] - mx); z += a[k]; }
          for (let k = 0; k <= q; k++) {
            const w = a[k] / z;
            for (let i = 0; i < dh; i++) y[q * D + h * dh + i] += w * qkv[k * 3 * D + 2 * D + h * dh + i];
          }
        }
      }
      const o = lin(y, n, P(p + 'o.weight'), P(p + 'o.bias'), D, D);
      for (let i = 0; i < x.length; i++) x[i] += o[i];
      const hdn = lin(ln(x, n, P(p + 'ln2.weight'), P(p + 'ln2.bias')), n, P(p + 'fc1.weight'), P(p + 'fc1.bias'), M, D);
      for (let i = 0; i < hdn.length; i++) hdn[i] = gelu(hdn[i]);
      const f2 = lin(hdn, n, P(p + 'fc2.weight'), P(p + 'fc2.bias'), D, M);
      for (let i = 0; i < x.length; i++) x[i] += f2[i];
      mlp.push(hdn.slice((n - 1) * M));
    }
    const last = ln(x.slice((n - 1) * D), 1, P('lnf.weight'), P('lnf.bias'));
    const logits = lin(last, 1, P('head.weight'), P('head.bias'), V, D);
    let mx = -Infinity, z = 0;
    for (const v of logits) mx = Math.max(mx, v);
    const prob = logits.map((v) => Math.exp(v - mx));
    for (const v of prob) z += v;
    for (let i = 0; i < V; i++) prob[i] /= z;
    return { embed, mlp, prob };
  }

  return { run, vocab, T, D, L, M, params: W.params, valLoss: W.val_loss, tensor: P };
}
