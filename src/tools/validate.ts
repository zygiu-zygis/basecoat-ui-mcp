// Copyright Žygimantas Jasiulionis / Intellmedia.
import { parseHtml, scriptImports, type HtmlNode } from './html.js';
import { registry } from '../registry/index.js';
import { defaultSemanticsStore } from '../semantics/index.js';
import type { Id } from '../semantics/types.js';

export interface CompositionIssue {
  rule: string;
  severity: 'error' | 'warning';
  message: string;
  line: number;
  repair?: string;
}

/** Options for composition validation. */
export interface ValidationOptions {
  /** Semantic rhythm profile ID to validate against (e.g., 'default'). */
  semanticProfile?: Id;
  /** Project root path for rhythm overrides. */
  projectRoot?: string;
}

const LIMITATIONS = 'Static HTML/Astro heuristic: cannot resolve dynamic classes, imported layouts, external scripts, CSS overrides or runtime DOM. Missing imports may be supplied by a parent layout. This is not an accessibility or browser conformance audit.';
const SPACING = new Set(['0', '2', '4', '6', '12']);
const VARIANTS = new Set(['default', 'primary', 'secondary', 'outline', 'ghost', 'destructive', 'link']);
const ITEM_ANATOMY_CLASSES = new Set([
  'item-title', 'item-description', 'item-media', 'item-content', 'item-actions', 'item-header',
]);
const ISSUE_CAP = 24;
const SIZES = new Set(['xs', 'default', 'sm', 'lg', 'icon', 'icon-xs', 'icon-sm', 'icon-lg']);
const BASECOAT_CLASSES = new Set(registry.upstream.css_classes);
const TAILWIND_OVERLAP = /^(?:table-(?:auto|fixed|caption|cell|column|column-group|footer-group|header-group|row|row-group)|select-(?:auto|all|none|text)|field-sizing-(?:content|fixed))$/;
// Reserve Basecoat component namespaces; unrelated project and Tailwind classes are allowed.
const COMPONENT_FAMILY = /^(?:ui-(?:card|button|input|dialog|tabs|table|select|textarea|badge|alert)(?:-[\w-]+)?|(?:btn|card|dialog|tabs|alert|alert-dialog|avatar|badge|breadcrumb|button-group|chart|combobox|command|drawer|dropdown-menu|empty|field|input|item|kbd|popover|progress|select|sidebar|skeleton|table|textarea|toast|toaster)-[\w-]+)$/;
const SEMANTIC_TOKEN = /^(?:p-density-|gap-rhythm-|text-(?:heading-|body$|muted$)|bg-surface-|border-subtle$)/;
const SAFE_ANCHOR = /^[a-z][a-z0-9-]*$/;
const TYPOGRAPHY_UTILITY = /^text-(?:xs|sm|base|lg|xl|[2-9]xl)$/;
const COLOR_UTILITY = /^(?:bg|border|text)-(?!xs$|sm$|base$|lg$|xl$|[2-9]xl$)[a-z][\w-]*$/;
const ARBITRARY_COLOR = /^(?:bg|border|text|from|via|to)-\[(?:#|rgba?\(|hsla?\(|oklch\(|lab\(|lch\(|color:|var\(--)/i;

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

/** Get semantic token mappings for validation. */
interface SemanticContext {
  byUtility: Map<string, string>;
  tokenIds: Set<string>;
}

function getSemanticMappings(profileId?: Id, projectRoot?: string): SemanticContext | null {
  if (!profileId) return null;
  const profile = defaultSemanticsStore.getEffectiveRhythmProfile(profileId, projectRoot);
  const mappings = profile.families
    .flatMap(family => family.mappings)
    .sort((a, b) => a.id.localeCompare(b.id));
  return {
    byUtility: new Map(mappings.map(mapping => [mapping.value, mapping.id])),
    tokenIds: new Set(mappings.map(mapping => mapping.id)),
  };
}

/** Check if a utility class has a semantic equivalent. */
function checkSemanticViolation(token: string, semanticMappings: SemanticContext | null): { message: string; repair: string } | null {
  if (!semanticMappings) return null;
  if (semanticMappings.tokenIds.has(token)) return null;
  const direct = semanticMappings.byUtility.get(token);
  if (direct) {
    return {
      message: `Use semantic token '${direct}' instead of hardcoded '${token}'`,
      repair: `Replace '${token}' with '${direct}'.`,
    };
  }
  return null;
}

export function validateComposition(code: string, options: ValidationOptions = {}) {
  const issues: CompositionIssue[] = [];
  let truncated = false;
  let hasErrors = false;
  let droppedErrors = 0;
  const report = (rule: string, severity: CompositionIssue['severity'], message: string, line: number, repair?: string) => {
    if (severity === 'error') hasErrors = true;
    if (issues.length >= ISSUE_CAP) {
      truncated = true;
      if (severity === 'error') droppedErrors++;
      return;
    }
    issues.push({
      rule,
      severity,
      message: message.slice(0, 240),
      line,
      ...(repair ? { repair: repair.slice(0, 240) } : {}),
    });
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
  
  // Initialize semantic validation if profile is specified
  let semanticMappings: SemanticContext | null = null;
  if (options.semanticProfile) {
    try {
      semanticMappings = getSemanticMappings(options.semanticProfile, options.projectRoot);
    } catch {
      report(
        'semantic-profile-invalid',
        'error',
        `Unknown or invalid semantic profile '${options.semanticProfile}'.`,
        1,
        'Use a compiled rhythm profile returned by get_rhythm_rules.',
      );
    }
  }
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
      if (COMPONENT_FAMILY.test(token) && !BASECOAT_CLASSES.has(token) && !TAILWIND_OVERLAP.test(token) && !ITEM_ANATOMY_CLASSES.has(token)) report('invalid-basecoat-class', 'error', `Unknown Basecoat class ${token}; use the current component anatomy and data-variant/data-size attributes. Custom project classes should use a separate namespace.`, node.line);
      const spacing = /^(-?)(gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(.+)$/.exec(token);
      if (spacing) {
        const [, negative, family, value] = spacing;
        const allowedAuto = family!.startsWith('m') && value === 'auto' && !negative;
        if ((!SPACING.has(value!) || !!negative) && !allowedAuto) report('spacing-rhythm', 'warning', `Use 0, 2, 4, 6 or 12 spacing steps; replace ${token}. Margin auto is allowed for alignment.`, node.line);
      }
      if (/^(?:bg-(?:gradient|linear|radial|conic)(?:-|$)|bg-\[.*gradient\(|(?:from|via|to)-)/.test(token)) report('random-gradient', 'warning', `Remove decorative gradient utility ${token}; use a neutral surface and hierarchy.`, node.line);
      
      // Semantic validation: check for hardcoded utilities that have semantic equivalents
      if (semanticMappings) {
        const semanticViolation = checkSemanticViolation(token, semanticMappings);
        if (semanticViolation) {
          report('semantic-token-available', 'warning', semanticViolation.message, node.line, semanticViolation.repair);
        }
        if (SEMANTIC_TOKEN.test(token) && !semanticMappings.tokenIds.has(token)) {
          report(
            'semantic-token-invalid',
            'error',
            `Semantic token '${token}' is not defined by profile '${options.semanticProfile}'.`,
            node.line,
            'Use an exact token ID returned by get_rhythm_rules.',
          );
        }
        const hardcodedSpacing = semanticMappings.tokenIds.has(token)
          ? null
          : /^-?(?:gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(.+)$/.exec(token);
        if (hardcodedSpacing && hardcodedSpacing[1] !== '0' && hardcodedSpacing[1] !== 'auto' && !semanticMappings.byUtility.has(token)) {
          report(
            'semantic-hardcoded-spacing',
            'warning',
            `Hardcoded spacing utility '${token}' is outside the selected semantic profile.`,
            node.line,
            'Choose a spacing or density token returned by get_rhythm_rules.',
          );
        }
        if (TYPOGRAPHY_UTILITY.test(token) && !semanticMappings.tokenIds.has(token) && !semanticMappings.byUtility.has(token)) {
          report(
            'semantic-hardcoded-typography',
            'warning',
            `Hardcoded typography utility '${token}' is outside the selected semantic profile.`,
            node.line,
            'Choose a typography token returned by get_rhythm_rules.',
          );
        }
        if (COLOR_UTILITY.test(token) && !semanticMappings.tokenIds.has(token) && !semanticMappings.byUtility.has(token) && !/-(?:transparent|current|inherit)$/.test(token)) {
          report(
            'semantic-hardcoded-color',
            'warning',
            `Hardcoded color utility '${token}' is outside the selected semantic profile.`,
            node.line,
            'Choose a surface or border token returned by get_rhythm_rules.',
          );
        }
      }
      if (ARBITRARY_COLOR.test(token)) {
        report(
          'arbitrary-color',
          'error',
          `Arbitrary color utility '${token}' bypasses the approved theme.`,
          node.line,
          'Replace it with a semantic surface, text, or border token.',
        );
      }
    }
    if (classes.includes('btn')) {
      const variant = node.attrs['data-variant'];
      const size = node.attrs['data-size'];
      if (variant !== undefined && !VARIANTS.has(variant)) report('button-variant', 'error', `Unknown button data-variant ${JSON.stringify(variant)}. Use default, primary, secondary, outline, ghost, destructive or link.`, node.line);
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
  const mains = nodes.filter(node => node.tag === 'main');
  const primaryHeadings = nodes.filter(node => node.tag === 'h1');
  if (mains.length > 1) {
    report('duplicate-main-landmark', 'error', `Found ${mains.length} main landmarks; exactly one is allowed.`, mains[1]!.line, 'Keep one main element and convert the others to sections.');
  }
  if (primaryHeadings.length > 1) {
    report('duplicate-primary-heading', 'error', `Found ${primaryHeadings.length} h1 elements; exactly one is allowed.`, primaryHeadings[1]!.line, 'Keep one h1 and demote later headings to h2.');
  }
  const header = nodes.find(node => node.tag === 'header');
  const main = mains[0];
  const footer = nodes.find(node => node.tag === 'footer');
  if (header && main && header.index > main.index) {
    report('structural-order', 'error', 'Header appears after main in source order.', header.line, 'Move header before main.');
  }
  if (footer && main && footer.index < main.index) {
    report('structural-order', 'error', 'Footer appears before main in source order.', footer.line, 'Move footer after main.');
  }
  const anchors = new Map<string, HtmlNode>();
  for (const node of nodes) {
    const anchor = node.attrs['data-macro-anchor'];
    if (anchor === undefined) continue;
    if (!SAFE_ANCHOR.test(anchor)) {
      report('macro-anchor-invalid', 'error', `Invalid macro anchor '${anchor}'.`, node.line, 'Use a lowercase ASCII ID such as data-macro-anchor="content-main".');
    } else if (anchors.has(anchor)) {
      report('macro-anchor-duplicate', 'error', `Duplicate macro anchor '${anchor}'.`, node.line, 'Give every macro anchor a unique ID.');
    } else {
      anchors.set(anchor, node);
    }
  }
  const semanticsRegistry = defaultSemanticsStore.getRegistry();
  for (const node of nodes) {
    const recipeId = node.attrs['data-fsm-recipe'];
    const stateId = node.attrs['data-fsm-state'];
    if (stateId !== undefined && recipeId === undefined) {
      report('fsm-binding-missing', 'error', 'data-fsm-state requires data-fsm-recipe on the same element.', node.line, 'Bind both the recipe and one of its declared states.');
      continue;
    }
    if (recipeId === undefined) continue;
    const recipeRef = semanticsRegistry.aliases[recipeId];
    const recipe = recipeRef ? semanticsRegistry.fsmRecipes[recipeRef] : undefined;
    if (!recipe) {
      report('fsm-recipe-invalid', 'error', `Unknown FSM recipe '${recipeId}'.`, node.line, 'Use a recipe ID returned by get_fsm_recipe.');
    } else if (stateId === undefined) {
      report('fsm-state-missing', 'error', `FSM recipe '${recipeId}' has no bound data-fsm-state.`, node.line, `Set data-fsm-state="${recipe.initialStates[0]}".`);
    } else if (!recipe.states.some(state => state.id === stateId)) {
      report('fsm-state-invalid', 'error', `State '${stateId}' is not declared by FSM recipe '${recipeId}'.`, node.line, `Use one of: ${recipe.states.map(state => state.id).sort().join(', ')}.`);
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
  if (droppedErrors > 0) {
    const notice: CompositionIssue = {
      rule: 'issues-truncated',
      severity: 'error',
      message: `${droppedErrors} additional error(s) omitted; fix listed issues and re-validate.`,
      line: 1,
    };
    if (issues.length >= ISSUE_CAP) {
      let slot = ISSUE_CAP - 1;
      for (let i = ISSUE_CAP - 1; i >= 0; i--) {
        if (issues[i]!.severity === 'warning') { slot = i; break; }
      }
      issues[slot] = notice;
    } else {
      issues.push(notice);
    }
  }
  return {
    valid: !hasErrors,
    issues,
    truncated,
    errorsOmitted: droppedErrors > 0,
    limitations: LIMITATIONS,
  };
}
