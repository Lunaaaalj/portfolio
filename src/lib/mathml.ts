// Brings browser MathML layout closer to TeX's, after Temml has rendered a formula.
//
// 1. Subscript height. TeX sets the subscript of a single character at a fixed drop; browsers
//    lower it past the base's descender, so y_{i,t} or μ_{i,t} sat lower than x_{i,t}. A base
//    that is one token is wrapped in <mpadded depth="0px">, which leaves the glyph drawn as it
//    is but gives every such subscript the font's standard drop.
// 2. Script spacing. TeX drops the space around operators, relations and punctuation in script
//    styles (i,t and t∈T under a sum); browsers keep it. Every <mo> inside a subscript,
//    superscript or limit gets lspace and rspace of zero.

const SCRIPTED = new Set(['msub', 'msup', 'msubsup', 'munder', 'mover', 'munderover', 'mmultiscripts']);
const SUB_BASE = new Set(['msub', 'msubsup']);
const TOKEN = new Set(['mi', 'mn', 'mo']);

interface Frame { name: string; children: number; script: boolean; wrapEnd?: boolean }

export function texLikeMathML(xml: string): string {
  const out: string[] = [];
  const stack: Frame[] = [];
  const re = /<(\/?)([a-zA-Z][\w-]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;

  while ((m = re.exec(xml))) {
    const [whole, closing, name, attrs, selfClose, text] = m;
    if (text !== undefined) { out.push(text); continue; }

    if (closing) {
      const f = stack.pop();
      out.push(whole);
      if (f?.wrapEnd) out.push('</mpadded>');
      continue;
    }

    const parent = stack[stack.length - 1];
    const index = parent ? parent.children++ : 0;
    // Inside a script position: any child after the base of a scripted element, or anything within one
    const script = !!parent && (parent.script || (SCRIPTED.has(parent.name) && index > 0));

    let tag = whole;
    if (name === 'mo' && script && !/\b[lr]space=/.test(attrs)) {
      tag = `<mo${attrs} lspace="0em" rspace="0em"${selfClose ? '/' : ''}>`;
    }
    const wrap = !!parent && SUB_BASE.has(parent.name) && index === 0 && TOKEN.has(name) && !selfClose;
    if (wrap) out.push('<mpadded depth="0px">');
    out.push(tag);
    if (!selfClose) stack.push({ name, children: 0, script, wrapEnd: wrap });
    else if (wrap) out.push('</mpadded>');
  }
  return out.join('');
}
