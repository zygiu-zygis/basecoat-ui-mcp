// Copyright Žygimantas Jasiulionis / Intellmedia.
export interface HtmlNode {
  tag: string;
  attrs: Record<string, string>;
  classes: string[];
  parent: number | null;
  index: number;
  line: number;
  dynamic: boolean;
  content?: string;
}

const VOID = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));

/** A bounded HTML lexer, not an Astro compiler or browser DOM implementation. */
export function parseHtml(code: string): HtmlNode[] {
  const nodes: HtmlNode[] = [];
  const stack: number[] = [];
  let cursor = 0;
  if (/^\uFEFF?---\s*\r?\n/.test(code)) {
    const end = /^---\s*$/gm;
    end.lastIndex = code.indexOf('\n') + 1;
    const match = end.exec(code);
    if (match) cursor = match.index + match[0].length;
  }
  const lineAt = (index: number) => code.slice(0, index).split('\n').length;
  while (cursor < code.length) {
    const start = code.indexOf('<', cursor);
    if (start < 0) break;
    if (code.startsWith('<!--', start)) {
      const end = code.indexOf('-->', start + 4);
      cursor = end < 0 ? code.length : end + 3;
      continue;
    }
    let end = start + 1;
    let quote = '';
    let braces = 0;
    for (; end < code.length; end++) {
      const char = code[end]!;
      if (quote) {
        if (char === quote && (!braces || code[end - 1] !== '\\')) quote = '';
      } else if (char === '"' || char === "'" || (braces && char === '`')) quote = char;
      else if (char === '{') braces++;
      else if (char === '}') braces = Math.max(0, braces - 1);
      else if (char === '>' && !braces) break;
    }
    if (end >= code.length) break;
    const raw = code.slice(start + 1, end);
    cursor = end + 1;
    const closing = /^\s*\/\s*([\w:-]+)/.exec(raw);
    if (closing) {
      const tag = closing[1]!.toLowerCase();
      for (let i = stack.length - 1; i >= 0; i--) {
        if (nodes[stack[i]!]!.tag === tag) { stack.length = i; break; }
      }
      continue;
    }
    const opening = /^\s*([a-zA-Z][\w:.-]*)/.exec(raw);
    if (!opening) continue;
    const tag = opening[1]!.toLowerCase();
    const attrs: Record<string, string> = Object.create(null) as Record<string, string>;
    let dynamic = false;
    let at = opening[0].length;
    while (at < raw.length) {
      while (/\s|\//.test(raw[at] ?? '') && at < raw.length) at++;
      if (at >= raw.length) break;
      if (raw[at] === '{') {
        dynamic = true;
        let depth = 1; let q = ''; at++;
        while (at < raw.length && depth) {
          const c = raw[at++]!;
          if (q) { if (c === q && raw[at - 2] !== '\\') q = ''; }
          else if ('"\'`'.includes(c)) q = c;
          else if (c === '{') depth++;
          else if (c === '}') depth--;
        }
        continue;
      }
      const name = /^[^\s=/>]+/.exec(raw.slice(at));
      if (!name) { at++; continue; }
      const key = name[0].toLowerCase(); at += name[0].length;
      while (/\s/.test(raw[at] ?? '') && at < raw.length) at++;
      let value = '';
      if (raw[at] === '=') {
        at++;
        while (/\s/.test(raw[at] ?? '') && at < raw.length) at++;
        if (raw[at] === '"' || raw[at] === "'") {
          const q = raw[at++]!; const valueStart = at;
          while (at < raw.length && raw[at] !== q) at++;
          value = raw.slice(valueStart, at); at++;
        } else if (raw[at] === '{') {
          dynamic = true;
          // The next iteration skips the expression as a whole.
          continue;
        } else {
          const match = /^[^\s>]+/.exec(raw.slice(at));
          value = match?.[0] ?? ''; at += value.length;
        }
      }
      attrs[key] = value;
    }
    const node: HtmlNode = { tag, attrs, classes: (attrs.class ?? '').split(/\s+/).filter(Boolean), parent: stack.at(-1) ?? null, index: nodes.length, line: lineAt(start), dynamic };
    nodes.push(node);
    if (tag === 'script' || tag === 'style') {
      const close = new RegExp('</\\s*' + tag + '\\s*>', 'ig');
      close.lastIndex = cursor;
      const match = close.exec(code);
      node.content = code.slice(cursor, match?.index ?? code.length);
      cursor = match ? close.lastIndex : code.length;
    } else if (!VOID.has(tag) && !/\/\s*$/.test(raw)) stack.push(node.index);
  }
  return nodes;
}

/** Extract actual literal import declarations/calls while ignoring strings and comments. */
export function scriptImports(source: string): string[] {
  const imports: string[] = [];
  let at = 0;
  while (at < source.length) {
    if (source.startsWith('//', at)) { const end = source.indexOf('\n', at + 2); at = end < 0 ? source.length : end + 1; continue; }
    if (source.startsWith('/*', at)) { const end = source.indexOf('*/', at + 2); at = end < 0 ? source.length : end + 2; continue; }
    if ('"\'`'.includes(source[at]!)) {
      const quote = source[at++]!;
      while (at < source.length) { if (source[at++] === '\\') at++; else if (source[at - 1] === quote) break; }
      continue;
    }
    if (source.startsWith('import', at) && !/[\w$.]/.test(source[at - 1] ?? '') && !/[\w$]/.test(source[at + 6] ?? '')) {
      const rest = source.slice(at);
      const match = /^import\s*(?:\(\s*)?(['"])([^'"\r\n]+)\1/.exec(rest)
        ?? /^import\s+(?!type\b)[\w$*{},\s]+\sfrom\s*(['"])([^'"\r\n]+)\1/.exec(rest);
      if (match) { imports.push(match[2]!); at += match[0].length; continue; }
    }
    at++;
  }
  return imports;
}
