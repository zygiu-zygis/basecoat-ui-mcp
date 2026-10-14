// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';
import {
  validateComposition,
  VALIDATE_COMPOSITION_MAX_BYTES,
  type CompositionIssue,
  type ValidationOptions,
} from './validate.js';

import { parseHtmlWithDiagnostics } from './html.js';

export const qualityInspectorInputShape = {
  code: z
    .string()
    .max(VALIDATE_COMPOSITION_MAX_BYTES)
    .optional()
    .describe('HTML/component markup string to inspect for syntax violations, a11y omissions, and quality metrics.'),
  html: z
    .string()
    .max(VALIDATE_COMPOSITION_MAX_BYTES)
    .optional()
    .describe('Alternative parameter alias for the code string to inspect.'),
  markup: z
    .string()
    .max(VALIDATE_COMPOSITION_MAX_BYTES)
    .optional()
    .describe('Alternative parameter alias for the markup snippet to inspect.'),
  semanticProfile: z
    .string()
    .max(64)
    .optional()
    .describe('Semantic token rhythm profile to validate against (defaults to "default").'),
  densityProfile: z
    .enum(['comfortable', 'compact'])
    .optional()
    .describe('Density profile context: "comfortable" (standard rhythm) or "compact" (dense micro-spacing allowed).'),
  enforceFsm: z
    .boolean()
    .optional()
    .describe('Whether to strictly enforce FSM data-state bindings and field-group hierarchies on interactive controls.'),
};

export type QualityInspectorInput = z.infer<z.ZodObject<typeof qualityInspectorInputShape>>;

const A11Y_RULE_PREFIX = /^(?:a11y-|color-contrast-wcag|duplicate-main-landmark|duplicate-primary-heading|structural-order|fsm-|semantic-div-nesting|field-group|dual-invalid|dialog-accessible)/;

function defaultRepairForIssue(issue: CompositionIssue): string {
  if (issue.repair) return issue.repair;
  switch (issue.rule) {
    case 'no-space-xy':
      return 'Replace space-x/space-y with flex gap-* or flex flex-col gap-*.';
    case 'icon-data-attribute-no-size':
      return 'Remove manual size-4 / w-4 h-4 from [data-icon] element; Basecoat styles icon dimensions automatically.';
    case 'field-group-hierarchy':
      return 'Wrap input and label in <div class="field" data-component="field">.';
    case 'dual-invalid-contract':
      return 'Add aria-invalid="true" to input control matching container data-invalid="true".';
    case 'dialog-accessible-title':
      return 'Add <h2> title with aria-labelledby on <dialog>.';
    case 'empty-and-skeleton-primitives':
      return 'Use .skeleton or .empty primitives instead of custom divs.';
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
    case 'table-overflow-wrapper':
      return 'Wrap <table> in <div class="overflow-x-auto"> to prevent mobile overflow.';
    case 'kpi-metric-tabular-nums':
      return 'Add class "tabular-nums" to large KPI metric values.';
    case 'table-numeric-alignment':
      return 'Add class "text-right" (or "text-end") to numeric table cells.';
    case 'a11y-focus-ring':
      return 'Add "focus-visible:ring-2 focus-visible:ring-ring" or remove outline-none.';
    default:
      return issue.message;
  }
}

export function runQualityInspector(
  code: string,
  options: ValidationOptions & { enforceFsm?: boolean } = {},
) {
  const base = validateComposition(code, { ...options, checkLegacySyntax: true });
  const allIssues: CompositionIssue[] = [...base.issues];

  const parsed = parseHtmlWithDiagnostics(code);
  const seenRulesOnNodes = new Set<string>();

  for (let idx = 0; idx < parsed.nodes.length; idx++) {
    const node = parsed.nodes[idx]!;

    // 1. space-x-* / space-y-* classes -> violation with auto-fix suggestion
    for (const cls of node.classes) {
      if (/(?:^|:)space-[xy]-/.test(cls)) {
        const key = `no-space-xy:${node.line}`;
        if (!seenRulesOnNodes.has(key)) {
          seenRulesOnNodes.add(key);
          const isY = cls.includes('space-y-');
          allIssues.push({
            line: node.line,
            column: node.column,
            rule: 'no-space-xy',
            severity: 'warning',
            message: `Class '${cls}' violates no-space-xy; use flex gap-* or flex flex-col gap-*.`,
            repair: isY ? 'Replace space-y-* with flex flex-col gap-*.' : 'Replace space-x-* with flex items-center gap-*.',
          });
        }
      }
    }

    // 2. data-icon element having size-4 or w-4 h-4 -> violation
    if (node.attrs['data-icon'] !== undefined) {
      const hasSize4 = node.classes.includes('size-4');
      const hasW4H4 = node.classes.includes('w-4') && node.classes.includes('h-4');
      if (hasSize4 || hasW4H4) {
        const key = `icon-data-attribute-no-size:${node.line}`;
        if (!seenRulesOnNodes.has(key)) {
          seenRulesOnNodes.add(key);
          allIssues.push({
            line: node.line,
            column: node.column,
            rule: 'icon-data-attribute-no-size',
            severity: 'warning',
            message: 'Element with [data-icon] has manual sizing classes; Basecoat handles data-icon dimensions.',
            repair: 'Remove manual size-4 / w-4 h-4 on [data-icon].',
          });
        }
      }
    }

    // 3A. Raw <input> stacked with <label> inside a space-y-* div without data-component="field" / .field when enforceFsm is enabled
    if (options.enforceFsm && node.tag === 'div' && node.classes.some(c => /(?:^|:)space-y-/.test(c))) {
      const isField = node.classes.includes('field') || node.attrs['data-component'] === 'field';
      if (!isField) {
        const children = parsed.nodes.filter(n => n.parent === idx);
        const hasInput = children.some(c => c.tag === 'input' && c.attrs.type !== 'hidden');
        const hasLabel = children.some(c => c.tag === 'label');
        if (hasInput && hasLabel) {
          const key = `field-group-hierarchy:${node.line}`;
          if (!seenRulesOnNodes.has(key)) {
            seenRulesOnNodes.add(key);
            allIssues.push({
              line: node.line,
              column: node.column,
              rule: 'field-group-hierarchy',
              severity: 'error',
              message: 'Raw input stacked with label in space-y div without data-component="field" or .field wrapper.',
              repair: 'Wrap with <div class="field" data-component="field">.',
            });
          }
        }
      }
    }

    // 3B. Missing aria-invalid when data-invalid is used
    if (node.attrs['data-invalid'] !== undefined && node.attrs['data-invalid'] !== 'false') {
      // If node is an input/textarea/select itself
      if (['input', 'textarea', 'select'].includes(node.tag)) {
        if (!node.attrs['aria-invalid'] || node.attrs['aria-invalid'] === 'false') {
          const key = `dual-invalid-contract:${node.line}`;
          if (!seenRulesOnNodes.has(key)) {
            seenRulesOnNodes.add(key);
            allIssues.push({
              line: node.line,
              column: node.column,
              rule: 'dual-invalid-contract',
              severity: 'error',
              message: 'Control marked data-invalid is missing aria-invalid="true".',
              repair: 'Add aria-invalid="true" matching data-invalid="true".',
            });
          }
        }
      } else {
        // Container with data-invalid
        const descendantInputs = parsed.nodes.filter(
          n => ['input', 'textarea', 'select'].includes(n.tag) && n.line >= node.line,
        );
        for (const inputNode of descendantInputs) {
          // Check if parent chain links to this container
          let p: number | null = inputNode.parent;
          let isDescendant = false;
          while (p !== null) {
            if (p === idx) {
              isDescendant = true;
              break;
            }
            p = parsed.nodes[p]?.parent ?? null;
          }
          if (isDescendant && (!inputNode.attrs['aria-invalid'] || inputNode.attrs['aria-invalid'] === 'false')) {
            const key = `dual-invalid-contract:${inputNode.line}`;
            if (!seenRulesOnNodes.has(key)) {
              seenRulesOnNodes.add(key);
              allIssues.push({
                line: inputNode.line,
                column: inputNode.column,
                rule: 'dual-invalid-contract',
                severity: 'error',
                message: 'Input inside data-invalid container is missing aria-invalid="true".',
                repair: 'Add aria-invalid="true" matching container data-invalid="true".',
              });
            }
          }
        }
      }
    }
  }
  const errors = allIssues.filter(i => i.severity === 'error').length;
  const warnings = allIssues.filter(i => i.severity === 'warning').length;
  const info = allIssues.filter(i => i.severity === 'info').length;

  const rawScore = 100 - errors * 15 - warnings * 5;
  const score = Math.max(0, Math.min(100, rawScore));
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F';
  const valid = base.valid && errors === 0;

  const seenSyntax = new Set<string>();
  const syntaxViolations: Array<{ line: number; severity: 'error' | 'warning'; rule: string; message: string }> = [];
  for (const i of allIssues) {
    if (i.severity !== 'info' && !A11Y_RULE_PREFIX.test(i.rule)) {
      if (!seenSyntax.has(i.rule)) {
        seenSyntax.add(i.rule);
        syntaxViolations.push({
          line: i.line,
          severity: i.severity,
          rule: i.rule,
          message: i.message.slice(0, 50),
        });
      }
    }
  }

  const seenA11y = new Set<string>();
  const accessibilityOmissions: Array<{ line: number; severity: 'error' | 'warning'; rule: string; message: string }> = [];
  for (const i of allIssues) {
    if (i.severity !== 'info' && A11Y_RULE_PREFIX.test(i.rule)) {
      if (!seenA11y.has(i.rule)) {
        seenA11y.add(i.rule);
        accessibilityOmissions.push({
          line: i.line,
          severity: i.severity,
          rule: i.rule,
          message: i.message.slice(0, 45),
        });
      }
    }
  }

  const autoFixSuggestions = allIssues
    .filter(i => i.severity !== 'info')
    .map(i => ({
      line: i.line,
      rule: i.rule,
      fix: defaultRepairForIssue(i).slice(0, 45),
    }));

  for (const cap of [8, 6, 5, 4, 3, 2, 1, 0]) {
    const fixCap = Math.min(cap, 1);
    const candidate = {
      stage: '4-quality-inspector',
      score,
      grade,
      valid,
      passed: valid,
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
      ariaOmissions: accessibilityOmissions.slice(0, cap),
      accessibilityOmissions: accessibilityOmissions.slice(0, cap),
      autoFixSuggestions: autoFixSuggestions.slice(0, fixCap),
      autoFixes: autoFixSuggestions.slice(0, fixCap),
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
    passed: valid,
    summary: { errors, warnings, info, truncated: true },
    syntaxViolations: [],
    ariaOmissions: [],
    accessibilityOmissions: [],
    autoFixSuggestions: [],
    autoFixes: [],
  };
  assertDetailBudget(minimal);
  return minimal;
}
