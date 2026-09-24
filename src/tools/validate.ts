// Copyright Žygimantas Jasiulionis / Intellmedia.
import { parseHtml, scriptImports, type HtmlNode } from './html.js';
import { registry } from '../registry/index.js';

export interface CompositionIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  line: number;
}

const LIMITATIONS = 'Static HTML/Astro heuristic: cannot resolve dynamic classes, imported layouts, external scripts, CSS overrides or runtime DOM. Missing imports may be supplied by a parent layout. This is not an accessibility or browser conformance audit.';
const SPACING = new Set(['0', '2', '4', '6', '12']);
const VARIANTS = new Set(['primary', 'secondary', 'outline', 'ghost', 'destructive', 'link']);
const SIZES = new Set(['xs', 'default', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']);
const BASECOAT_CLASSES = new Set(registry.upstream.css_classes);
const TAILWIND_OVERLAP = /^(?:table-(?:auto|fixed|caption|cell|column|column-group|footer-group|header-group|row|row-group)|select-(?:auto|all|none|text)|field-sizing-(?:content|fixed))$/;
// Reserve Basecoat component namespaces; unrelated project and Tailwind classes are allowed.
const COMPONENT_FAMILY = /^(?:ui-(?:card|button|input|dialog|tabs|table|select|textarea|badge|alert)(?:-[\w-]+)?|(?:btn|card|dialog|tabs|alert|alert-dialog|avatar|badge|breadcrumb|button-group|chart|combobox|command|drawer|dropdown-menu|empty|field|input|item|kbd|popover|progress|select|sidebar|skeleton|table|textarea|toast|toaster)-[\w-]+)$/;

function importedModule(value: string): string | undefined {
  const bare = /^basecoat-css\/([\w-]+)(?:\.min)?(?:\.js)?$/.exec(value);
  if (bare) return bare[1];
  return /(?:^|\/)([\w-]+)(?:\.min)?\.js(?:[?#].*)?$/.exec(value)?.[1];
}

/** Tailwind variants may contain colons in arbitrary selectors or values. */
function utility(token: string): string {
  let depth = 0; let start = 0;
  for (let i = 0; i < token.length; i++) {
    if (token[i] === '[' || token[i] === '(') depth++;
    else if (token[i] === ']' || token[i] === ')') depth = Math.max(0, depth - 1);
    else if (token[i] === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!|!$/g, '');
}

function isPrimary(node: HtmlNode): boolean {
  return node.classes.includes('btn-primary') || (node.classes.includes('btn') && (!node.attrs['data-variant'] || ['default', 'primary'].includes(node.attrs['data-variant']!)));
}

export function validateComposition(code: string) {
  const issues: CompositionIssue[] = [];
  let truncated = false;
  let hasErrors = false;
  const report = (rule: string, severity: CompositionIssue['severity'], message: string, line: number) => {
    if (severity === 'error') hasErrors = true;
    if (issues.length >= 24) { truncated = true; return; }
    issues.push({ rule, severity, message: message.slice(0, 240), line });
  };
  if (Buffer.byteLength(code, 'utf8') > 65_536) {
    report('input-size', 'error', 'Code exceeds the 64 KiB UTF-8 limit. Validate a smaller component.', 1);
    return { valid: false, issues, truncated: true, limitations: LIMITATIONS };
  }
  const nodes = parseHtml(code);
  const scripts = nodes.filter(node => node.tag === 'script' && ['', 'module', 'text/javascript', 'application/javascript', 'text/ecmascript', 'application/ecmascript'].includes((node.attrs.type ?? '').trim().toLowerCase()));
  const importOrder = scripts.flatMap(node => node.attrs.src ? [node.attrs.src] : scriptImports(node.content ?? ''));
  const imported = new Set(importOrder);
  // A literal script src identifies an actual script, unlike a URL in prose or comments.
  for (const script of scripts) if (script.attrs.src) imported.add(script.attrs.src);
  const hasImport = (name: string) => [...imported].some(value => importedModule(value) === name);
  const bundle = hasImport('all');
  const required = new Map<string, number>();
  const primaryByParent = new Map<number | null, HtmlNode[]>();
  for (const script of scripts) {
    if (scriptImports(script.content ?? '').some(value => value.startsWith('basecoat-css/') && importedModule(value) === 'all')) {
      report('all-js-bundle', 'error', 'Do not import "basecoat-css/all". Import "basecoat-css/basecoat" followed by the granular modules the page uses.', script.line);
    }
    if (('is:inline' in script.attrs || script.attrs.type === 'module') && scriptImports(script.content ?? '').some(value => value.startsWith('basecoat-css/'))) {
      report('unbundled-bare-import', 'warning', 'In Astro, is:inline or explicit type="module" bypasses script bundling. Use a plain processed <script> for bare Basecoat imports; HTML needs an import map or browser URLs.', script.line);
    }
  }
  for (const node of nodes) {
    if (node.dynamic) report('dynamic-attributes', 'warning', 'Dynamic attributes cannot be checked completely; inspect their rendered classes and states.', node.line);
    const classes = node.classes.map(utility);
    if (classes.includes('card') || classes.includes('ui-card')) {
      let parent = node.parent;
      while (parent !== null) {
        const ancestor = nodes[parent]!;
        if (ancestor.classes.some(value => ['card', 'ui-card'].includes(utility(value)))) {
          report('nested-cards', 'error', 'Cards inside cards are forbidden. Use a flat section, list or divider for the inner group.', node.line); break;
        }
        parent = ancestor.parent;
      }
    }
    for (const token of classes) {
      if (COMPONENT_FAMILY.test(token) && !BASECOAT_CLASSES.has(token) && !TAILWIND_OVERLAP.test(token)) report('invalid-basecoat-class', 'error', `Unknown Basecoat class ${token}; use the current component anatomy and data-variant/data-size attributes. Custom project classes should use a separate namespace.`, node.line);
      const spacing = /^(-?)(gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(.+)$/.exec(token);
      if (spacing) {
        const [, negative, family, value] = spacing;
        const allowedAuto = family!.startsWith('m') && value === 'auto' && !negative;
        if ((!SPACING.has(value!) || !!negative) && !allowedAuto) report('spacing-rhythm', 'warning', `Use 0, 2, 4, 6 or 12 spacing steps; replace ${token}. Margin auto is allowed for alignment.`, node.line);
      }
      if (/^(?:bg-(?:gradient|linear|radial|conic)(?:-|$)|bg-\[.*gradient\(|(?:from|via|to)-)/.test(token)) report('random-gradient', 'warning', `Remove decorative gradient utility ${token}; use a neutral surface and hierarchy.`, node.line);
    }
    if (classes.includes('btn')) {
      const variant = node.attrs['data-variant'];
      const size = node.attrs['data-size'];
      if (variant !== undefined && !VARIANTS.has(variant)) report('button-variant', 'error', `Unknown button data-variant ${JSON.stringify(variant)}. Use primary, secondary, outline, ghost, destructive or link.`, node.line);
      if (size !== undefined && !SIZES.has(size)) report('button-size', 'error', `Unknown button data-size ${JSON.stringify(size)}. Use xs, sm, default, lg, icon, icon-xs, icon-sm or icon-lg.`, node.line);
    }
    if (isPrimary(node)) {
      const group = primaryByParent.get(node.parent) ?? [];
      group.push(node); primaryByParent.set(node.parent, group);
    }
    // These components have dedicated Basecoat behavior; native dialog uses application JS.
    for (const component of ['tabs', 'accordion', 'select', 'combobox', 'dropdown-menu', 'popover', 'sidebar', 'drawer', 'command', 'toast', 'range']) {
      const isRangeInput = component === 'range' && node.tag === 'input' && node.attrs.type?.toLowerCase() === 'range';
      if ((classes.includes(component) || isRangeInput) && !(component === 'select' && node.tag === 'select') && !required.has(component)) required.set(component, node.line);
    }
  }
  for (const [parent, buttons] of primaryByParent) {
    if (buttons.length > 1) report('primary-hierarchy', 'warning', `This ${parent === null ? 'root' : nodes[parent]!.tag} action group has ${buttons.length} primary buttons. Keep one primary; use secondary or ghost for alternatives.`, buttons[1]!.line);
  }
  const textNodes = nodes.filter(node => /^(?:h[1-6]|p|li|label|th|td)$/.test(node.tag));
  const centered = (node: HtmlNode) => {
    let current: HtmlNode | undefined = node;
    while (current) {
      if (current.classes.includes('text-left') || current.classes.includes('text-start')) return false;
      if (current.classes.includes('text-center')) return true;
      current = current.parent === null ? undefined : nodes[current.parent];
    }
    return false;
  };
  if (textNodes.length >= 2 && textNodes.every(centered)) report('everything-centered', 'warning', 'All detected content is centered. Use left aligned body text and reserve centering for a small focal element.', textNodes[0]!.line);
  for (const [component, line] of required) {
    if (!bundle && !hasImport(component)) report('missing-js-module', 'warning', `Import "basecoat-css/${component}" in a processed Astro script, or supply its HTML script; omit this warning if a parent layout already loads it.`, line);
  }
  if (required.size && !bundle && !hasImport('basecoat')) report('missing-js-runtime', 'warning', 'Load "basecoat-css/basecoat" before selective component modules; a parent layout may already supply it.', [...required.values()][0]!);
  if (required.size && !bundle && hasImport('basecoat')) {
    const runtime = importOrder.findIndex(value => importedModule(value) === 'basecoat');
    const module = importOrder.findIndex(value => required.has(importedModule(value) ?? ''));
    if (module >= 0 && runtime > module) report('js-import-order', 'warning', 'Load the Basecoat runtime before component modules so window.basecoat exists when modules register.', [...required.values()][0]!);
  }
  return { valid: !hasErrors, issues, truncated, limitations: LIMITATIONS };
}
