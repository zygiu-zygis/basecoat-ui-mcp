// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';
import { parseHtmlWithDiagnostics } from './html.js';
import {
  validateComposition,
  VALIDATE_COMPOSITION_MAX_BYTES,
  type CompositionIssue,
  type ValidationOptions,
} from './validate.js';

export const qualityInspectorInputShape = {
  code: z.string().max(VALIDATE_COMPOSITION_MAX_BYTES).optional(),
  html: z.string().max(VALIDATE_COMPOSITION_MAX_BYTES).optional(),
  markup: z.string().max(VALIDATE_COMPOSITION_MAX_BYTES).optional(),
  semanticProfile: z.string().max(64).optional(),
  densityProfile: z.enum(['comfortable', 'compact']).optional(),
  enforceFsm: z.boolean().optional(),
};

export type QualityInspectorInput = z.infer<z.ZodObject<typeof qualityInspectorInputShape>>;

const TW3_DEPRECATED_UTILITY =
  /^(?:(bg|text|border|divide|ring|placeholder)-opacity-(\d+)|flex-(shrink|grow)(?:-(0|1))?|overflow-ellipsis|decoration-(slice|clone))$/;

const ARBITRARY_DIMENSION =
  /^(?:w|h|min-w|max-w|min-h|max-h|size|p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left)-\[\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|ch|dvh|svh|lvh)\]$/i;

const INTERACTIVE_PRIMITIVES = new Map<string, { defaultState: string; recipe: string }>([
  ['dialog', { defaultState: 'closed', recipe: 'dialog' }],
  ['dropdown-menu', { defaultState: 'closed', recipe: 'collapsible-navigation' }],
  ['accordion', { defaultState: 'closed', recipe: 'collapsible-navigation' }],
  ['tabs', { defaultState: 'active', recipe: 'tabs' }],
  ['sidebar', { defaultState: 'expanded', recipe: 'navigation' }],
]);

const SEMANTIC_TAGS = new Set([
  'main',
  'header',
  'nav',
  'section',
  'article',
  'aside',
  'footer',
]);

const A11Y_RULE_PREFIX = /^(?:a11y-|color-contrast-wcag|duplicate-main-landmark|duplicate-primary-heading|structural-order|fsm-|semantic-div-nesting)/;

function stripVariants(token: string): string {
  let depth = 0;
  let start = 0;
  for (let i = 0; i < token.length; i++) {
    if (token[i] === '[' || token[i] === '(') depth++;
    else if (token[i] === ']' || token[i] === ')') depth = Math.max(0, depth - 1);
    else if (token[i] === ':' && depth === 0) start = i + 1;
  }
  return token.slice(start).replace(/^!|!$/g, '');
}

function tw3AutoFix(util: string): string {
  const opacityMatch = /^(bg|text|border|divide|ring|placeholder)-opacity-(\d+)$/.exec(util);
  if (opacityMatch) {
    return `Replace '${util}' with Tailwind v4 slash alpha syntax (e.g. '${opacityMatch[1]}-primary/${opacityMatch[2]}').`;
  }
  const flexMatch = /^flex-(shrink|grow)(?:-(0|1))?$/.exec(util);
  if (flexMatch) {
    const suffix = flexMatch[2] !== undefined ? `-${flexMatch[2]}` : '';
    return `Replace '${util}' with Tailwind v4 '${flexMatch[1]}${suffix}'.`;
  }
  if (util === 'overflow-ellipsis') {
    return `Replace 'overflow-ellipsis' with 'text-ellipsis' (or 'truncate').`;
  }
  if (util.startsWith('decoration-')) {
    return `Replace '${util}' with 'box-${util}'.`;
  }
  return `Replace deprecated Tailwind v3 utility '${util}' with its Tailwind v4 equivalent.`;
}

function defaultRepairForIssue(issue: CompositionIssue): string {
  if (issue.repair) return issue.repair;
  switch (issue.rule) {
    case 'emoji-usage':
      return 'Replace Unicode emojis with inline Lucide/Phosphor SVG (<svg class="size-4" ...>).';
    case 'cdn-dependency':
      return 'Remove external CDN <script>/<link> and bundle local Basecoat/Tailwind assets.';
    case 'invalid-basecoat-class':
      return 'Use canonical Basecoat classes (.btn, .card, .input, .field, .tabs, .dialog) and data-variant/data-size.';
    case 'arbitrary-dimension':
      return 'Replace arbitrary bracket dimensions (e.g. w-[327px]) with 4px/8px Tailwind scale utilities (e.g. w-80, max-w-md, h-12).';
    case 'color-contrast-wcag':
      return 'Pair semantic surface tokens with their high-contrast foreground counterparts (e.g. bg-primary + text-primary-foreground).';
    case 'a11y-aria-controls-binding':
      return 'Bind aria-controls="<target-id>" on aria-expanded triggers to a matching id="<target-id>" on the panel.';
    case 'a11y-dialog-focus-trap':
      return 'Use native <dialog class="dialog"> or role="dialog" aria-modal="true" and include a focusable close <button>.';
    case 'spacing-rhythm':
      return 'Snap spacing to approved scale steps: 0, 2, 4, 6, 8, 12 (or compact micro-steps).';
    case 'all-js-bundle':
      return 'Import "basecoat-css/basecoat" plus only the granular component scripts used on the page.';
    case 'a11y-img-alt':
      return 'Add alt="..." (or alt="" for decorative images) to <img>.';
    case 'a11y-button-icon-label':
      return 'Add aria-label="..." to icon-only <button> elements.';
    case 'a11y-landmark-label':
      return 'Add aria-label="..." to distinguish <nav> and <aside> landmarks.';
    case 'a11y-input-label':
      return 'Wrap control in <div class="field"><label class="label" for="id">...</label><input id="id" ...></div>.';
    default:
      return issue.message;
  }
}

export function runQualityInspector(
  code: string,
  options: ValidationOptions & { enforceFsm?: boolean } = {},
) {
  const base = validateComposition(code, options);
  const extraIssues: CompositionIssue[] = [];

  if (Buffer.byteLength(code, 'utf8') <= VALIDATE_COMPOSITION_MAX_BYTES) {
    if (/@tailwind\s+(?:base|components|utilities)\b/.test(code)) {
      extraIssues.push({
        rule: 'tailwind-v3-directive',
        severity: 'error',
        message: 'Deprecated Tailwind v3 @tailwind directive detected.',
        line: 1,
        repair: 'Use Tailwind v4 CSS-first imports: @import "tailwindcss"; @import "basecoat-css/vega";',
      });
    }

    const parsed = parseHtmlWithDiagnostics(code);
    for (const node of parsed.nodes) {
      const baseClasses = node.classes.map(stripVariants);
      for (const cls of baseClasses) {
        if (TW3_DEPRECATED_UTILITY.test(cls)) {
          extraIssues.push({
            rule: 'tailwind-v3-deprecated',
            severity: 'error',
            message: `Deprecated Tailwind v3 utility '${cls}' is forbidden in Tailwind v4.`,
            line: node.line,
            repair: tw3AutoFix(cls),
          });
        }
        if (ARBITRARY_DIMENSION.test(cls)) {
          extraIssues.push({
            rule: 'arbitrary-dimension',
            severity: 'error',
            message: `Arbitrary sizing utility '${cls}' violates the 4px/8px optical rhythm scale.`,
            line: node.line,
            repair: 'Replace arbitrary bracket dimensions with standard Tailwind v4 spacing/sizing utilities (e.g. w-80, max-w-md, h-12, p-6).',
          });
        }
      }

      for (const [primitive, contract] of INTERACTIVE_PRIMITIVES) {
        if (baseClasses.includes(primitive)) {
          const hasState =
            node.attrs['data-state'] !== undefined ||
            node.attrs['data-fsm-state'] !== undefined ||
            (primitive === 'accordion' && node.tag === 'section');
          if (!hasState) {
            extraIssues.push({
              rule: 'fsm-data-state-missing',
              severity: options.enforceFsm ? 'error' : 'warning',
              message: `Interactive '${primitive}' primitive is missing explicit data-state / FSM binding.`,
              line: node.line,
              repair: `Add data-state="${contract.defaultState}" data-fsm-recipe="${contract.recipe}" data-fsm-state="${contract.defaultState}".`,
            });
          }
        }
      }
    }

    const elementNodes = parsed.nodes.filter(n => !['script', 'style'].includes(n.tag));
    const divCount = elementNodes.filter(n => n.tag === 'div').length;
    const hasSemanticTag = elementNodes.some(n => SEMANTIC_TAGS.has(n.tag));
    if ((elementNodes.some(n => n.tag === 'html' || n.tag === 'body') || elementNodes.length >= 10) && divCount >= 6 && !hasSemanticTag) {
      extraIssues.push({
        rule: 'semantic-div-nesting',
        severity: 'warning',
        message: 'Generic <div> nesting detected without semantic HTML5 landmarks.',
        line: elementNodes[0]?.line ?? 1,
        repair: 'Replace outer layout <div> wrappers with <main>, <header>, <nav>, <section>, or <aside>.',
      });
    }
  }

  const allIssues = [...base.issues, ...extraIssues];
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const info = allIssues.filter(i => i.severity === 'info').length;

  const rawScore = 100 - errors * 15 - warnings * 5;
  const score = Math.max(0, Math.min(100, rawScore));
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const valid = base.valid && errors === 0;

  const syntaxViolations = allIssues
    .filter(i => i.severity !== 'info' && !A11Y_RULE_PREFIX.test(i.rule))
    .map(i => ({
      line: i.line,
      severity: i.severity,
      rule: i.rule,
      message: i.message.slice(0, 80),
    }));

  const accessibilityOmissions = allIssues
    .filter(i => i.severity !== 'info' && A11Y_RULE_PREFIX.test(i.rule))
    .map(i => ({
      line: i.line,
      severity: i.severity,
      rule: i.rule,
      message: i.message.slice(0, 80),
    }));

  const autoFixSuggestions = allIssues
    .filter(i => i.severity !== 'info')
    .map(i => ({
      line: i.line,
      rule: i.rule,
      fix: defaultRepairForIssue(i).slice(0, 80),
    }));

  for (const cap of [8, 6, 5, 4, 3, 2, 1, 0]) {
    const fixCap = Math.min(cap, 3);
    const candidate = {
      stage: '4-quality-inspector',
      score,
      grade,
      valid,
      summary: {
        errors,
        warnings,
        info,
        truncated:
          base.truncated ||
          syntaxViolations.length > cap ||
          accessibilityOmissions.length > cap ||
          autoFixSuggestions.length > fixCap,
      },
      syntaxViolations: syntaxViolations.slice(0, cap),
      accessibilityOmissions: accessibilityOmissions.slice(0, cap),
      autoFixSuggestions: autoFixSuggestions.slice(0, fixCap),
    };
    if (responseBytes(candidate) <= MAX_DETAIL_BYTES) {
      return candidate;
    }
  }

  const minimal = {
    stage: '4-quality-inspector',
    score,
    grade,
    valid,
    summary: { errors, warnings, info, truncated: true },
    syntaxViolations: [],
    accessibilityOmissions: [],
    autoFixSuggestions: [],
  };
  assertDetailBudget(minimal);
  return minimal;
}
