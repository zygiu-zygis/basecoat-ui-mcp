// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';
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

const A11Y_RULE_PREFIX = /^(?:a11y-|color-contrast-wcag|duplicate-main-landmark|duplicate-primary-heading|structural-order|fsm-|semantic-div-nesting)/;

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
  const base = validateComposition(code, { ...options, checkLegacySyntax: true });
  const allIssues = base.issues;
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
    ariaOmissions: [],
    accessibilityOmissions: [],
    autoFixSuggestions: [],
  };
  assertDetailBudget(minimal);
  return minimal;
}
