# A 2-layer, 4-head character transformer trained on the site's own text: the network drawn
# behind the home page (src/scripts/network/). Exports float32 weights (base64) and a parity
# fixture for the TypeScript forward pass.
#
#   npm run build
#   uv run --with torch --with numpy python scripts/network/corpus.py dist corpus.txt
#   uv run --with torch --with numpy python scripts/network/train.py corpus.txt src/data/network-weights.json
#
# 1,200 steps: longer runs overfit this 54k-character corpus (validation loss rises after ~1,000).
import sys, json, base64, math, pathlib
import numpy as np, torch, torch.nn as nn, torch.nn.functional as F

torch.manual_seed(7)
VOCAB = " abcdefghijklmnopqrstuvwxyz0123456789.,;:()'-%/=+\n"
V, T, D, H, L, M = len(VOCAB), 48, 48, 4, 2, 192
corpus = pathlib.Path(sys.argv[1]).read_text()
data = torch.tensor([VOCAB.index(c) for c in corpus])
n = int(len(data) * 0.92); tr, va = data[:n], data[n:]

class Block(nn.Module):
    def __init__(s):
        super().__init__()
        s.ln1, s.ln2 = nn.LayerNorm(D), nn.LayerNorm(D)
        s.qkv, s.o = nn.Linear(D, 3 * D), nn.Linear(D, D)
        s.fc1, s.fc2 = nn.Linear(D, M), nn.Linear(M, D)
    def forward(s, x):
        B, t, _ = x.shape
        q, k, v = s.qkv(s.ln1(x)).split(D, -1)
        sh = lambda z: z.view(B, t, H, D // H).transpose(1, 2)
        y = F.scaled_dot_product_attention(sh(q), sh(k), sh(v), is_causal=True)
        x = x + s.o(y.transpose(1, 2).reshape(B, t, D))
        return x + s.fc2(F.gelu(s.fc1(s.ln2(x)), approximate="tanh"))

class Net(nn.Module):
    def __init__(s):
        super().__init__()
        s.tok, s.pos = nn.Embedding(V, D), nn.Embedding(T, D)
        s.blocks = nn.ModuleList(Block() for _ in range(L))
        s.lnf, s.head = nn.LayerNorm(D), nn.Linear(D, V)
    def forward(s, i):
        x = s.tok(i) + s.pos(torch.arange(i.shape[1]))
        for b in s.blocks: x = b(x)
        return s.head(s.lnf(x))

net = Net()
print(sum(p.numel() for p in net.parameters()), "params,", len(corpus), "chars")
opt = torch.optim.AdamW(net.parameters(), lr=3e-3, weight_decay=0.05)
def batch(src, b=64):
    ix = torch.randint(len(src) - T - 1, (b,))
    return torch.stack([src[i:i + T] for i in ix]), torch.stack([src[i + 1:i + T + 1] for i in ix])
STEPS = 1200
for step in range(STEPS):
    for g in opt.param_groups: g["lr"] = 3e-3 * 0.5 * (1 + math.cos(math.pi * step / STEPS))
    x, y = batch(tr); loss = F.cross_entropy(net(x).reshape(-1, V), y.reshape(-1))
    opt.zero_grad(); loss.backward(); opt.step()
    if step % 200 == 0 or step == STEPS - 1:
        with torch.no_grad():
            xv, yv = batch(va, 256); lv = F.cross_entropy(net(xv).reshape(-1, V), yv.reshape(-1))
        print(f"step {step:4d}  train {loss.item():.3f}  val {lv.item():.3f}")

sd = {k: v.detach().numpy().astype(np.float32) for k, v in net.state_dict().items()}
b64 = lambda a: base64.b64encode(np.ascontiguousarray(a).tobytes()).decode()
W = {"vocab": VOCAB, "T": T, "D": D, "H": H, "L": L, "M": M, "val_loss": round(lv.item(), 3),
     "params": sum(p.numel() for p in net.parameters()),
     "w": {k: {"shape": list(v.shape), "b64": b64(v)} for k, v in sd.items()}}
probe_txt = "spatial risk in metropolitan monterrey, a negative"
probe = torch.tensor([[VOCAB.index(c) for c in probe_txt[-T:]]])
with torch.no_grad(): W["fixture"] = {"text": probe_txt[-T:], "last_logits": net(probe)[0, -1].tolist()}
out = pathlib.Path(sys.argv[2]); out.write_text(json.dumps(W, separators=(",", ":")))
print("wrote", out, out.stat().st_size // 1024, "KB")
