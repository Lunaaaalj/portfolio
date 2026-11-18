# Extracts the visible text of the built site (what a visitor reads) as a lowercase corpus,
# the training text for train.py. Usage: python corpus.py <built site dir> <out.txt>
import sys, re, pathlib, unicodedata
from html.parser import HTMLParser

SKIP = {"script", "style", "math", "svg", "noscript", "canvas"}

class P(HTMLParser):
    def __init__(self):
        super().__init__(); self.depth = 0; self.out = []
    def handle_starttag(self, t, a):
        if t in SKIP: self.depth += 1
        self.out.append(" ")
        if t in ("p", "li", "h1", "h2", "h3", "figcaption", "aside", "td", "th", "dd", "dt"): self.out.append("\n")
    def handle_endtag(self, t):
        if t in SKIP and self.depth: self.depth -= 1
        self.out.append(" ")
    def handle_data(self, d):
        if not self.depth: self.out.append(d)

root = pathlib.Path(sys.argv[1])
VOCAB = " abcdefghijklmnopqrstuvwxyz0123456789.,;:()'-%/=+\n"
text = []
for f in sorted(root.rglob("*.html")):
    if f.name == "404.html": continue
    p = P(); p.feed(f.read_text()); t = "".join(p.out)
    t = t.lower().replace("’", "'").replace("–", "-").replace("—", "-").replace("−", "-")
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode()
    t = "".join(c if c in VOCAB else " " for c in t)
    t = re.sub(r"[ \t]+", " ", t); t = re.sub(r"\n\s*", "\n", t)
    text.append(t.strip())
corpus = "\n".join(text)
pathlib.Path(sys.argv[2]).write_text(corpus)
print(len(corpus), "chars,", len(set(corpus)), "symbols")
