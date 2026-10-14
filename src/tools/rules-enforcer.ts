import { z } from 'zod';
import rulesCatalog from '../data/catalog/implementation-rules.json' with { type: 'json' };
import { defaultSemanticsStore } from '../semantics/index.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';
import { parseHtmlWithDiagnostics } from './html.js';
import { INTERACTIVE_PRIMITIVES, SEMANTIC_TAGS, TW3_DEPRECATED_UTILITY } from './validate.js';

export const rulesEnforcerInputShape = {
  category: z
    .enum(['all', 'tailwind-v4', 'fsm-contracts', 'tokens', 'semantic-html', 'dashboard-patterns'])
    .optional()
    .describe('Filter rules by technical domain: "tailwind-v4", "fsm-contracts", "tokens", "semantic-html", "dashboard-patterns", or "all".'),
  query: z
    .string()
    .max(120)
    .optional()
    .describe('Search query to match against rule IDs, titles, forbidden patterns, or required syntax.'),
  code: z
    .string()
    .max(16000)
    .optional()
    .describe('HTML/markup snippet to audit against the indexed technical constraints.'),
  html: z
    .string()
    .max(16000)
    .optional()
    .describe('Alternative alias for the code parameter to audit against constraints.'),
  id: z.string().max(80).optional().describe('Rule ID or component ID to inspect.'),
  componentId: z.string().max(80).optional().describe('Component ID alias to filter relevant rules.'),
  name: z.string().max(80).optional().describe('Rule or component name alias.'),
  environment: z
    .enum(['html', 'astro', 'react', 'vue', 'svelte'])
    .optional()
    .describe('Target output environment: "html", "astro", "react", "vue", or "svelte". Defaults to "html".'),
};

export type RulesEnforcerInput = z.infer<z.ZodObject<typeof rulesEnforcerInputShape>>;

export type RuleCategory = 'tailwind-v4' | 'fsm-contracts' | 'tokens' | 'semantic-html' | 'dashboard-patterns';

export interface TechnicalRule {
  id: string;
  category: RuleCategory;
  rule: string;
  forbidden: string[];
  required: string[];
}

export const TECHNICAL_RULES: TechnicalRule[] = rulesCatalog.rules as TechnicalRule[];

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

function checkCodeViolations(code: string): Array<{ rule: string; message: string }> {
  const violations: Array<{ rule: string; message: string }> = [];
  const codeLines = code.split('\n');

  if (/@tailwind\s+(?:base|components|utilities)\b/.test(code)) {
    violations.push({
      rule: 'TW4-01',
      message: 'Deprecated @tailwind directive detected; use Tailwind v4 @import.',
    });
  }

  const parsed = parseHtmlWithDiagnostics(code);
  let tw3Found = false;
  let fsmFound = false;
  let tokFound = false;

  let metFound = false;
  let tblFound = false;
  let navFound = false;
  let frmFound = false;

  for (const node of parsed.nodes) {
    const baseClasses = node.classes.map(stripVariants);

    if (!tw3Found) {
      for (const cls of baseClasses) {
        if (TW3_DEPRECATED_UTILITY.test(cls)) {
          tw3Found = true;
          violations.push({
            rule: 'TW4-01',
            message: `Deprecated Tailwind v3 utility '${cls}' detected.`,
          });
          break;
        }
      }
    }

    if (!tokFound) {
      for (const cls of baseClasses) {
        if (
          /^(?:w|h|min-w|max-w|min-h|max-h|size|p[trblxyse]?|m[trblxyse]?|gap(?:-[xy])?|space-[xy]|inset(?:-[xy])?|top|right|bottom|left)-\[\d+(?:\.\d+)?(?:px|rem|em|vh|vw|%|ch|dvh|svh|lvh)\]$/i.test(cls) ||
          /^(?:bg|border|text|from|via|to)-\[(?:#|rgba?\(|hsla?\(|oklch\(|lab\(|lch\(|color:|var\(--)/i.test(cls) ||
          /#[0-9a-fA-F]{3,8}/.test(cls)
        ) {
          tokFound = true;
          violations.push({
            rule: 'TOK-01',
            message: `Arbitrary dimension or hardcoded color '${cls}' detected; use semantic tokens.`,
          });
          break;
        }
      }
    }

    if (!fsmFound) {
      for (const [primitive] of INTERACTIVE_PRIMITIVES) {
        if (baseClasses.includes(primitive) || (primitive === 'dialog' && node.tag === 'dialog')) {
          const hasState =
            node.attrs['data-state'] !== undefined ||
            node.attrs['data-fsm-state'] !== undefined ||
            (primitive === 'accordion' && node.tag === 'section');
          if (!hasState) {
            fsmFound = true;
            violations.push({
              rule: 'FSM-01',
              message: `Interactive '${primitive}' missing data-state or FSM binding.`,
            });
            break;
          }
        }
      }
    }

    const lineText = codeLines[node.line - 1] ?? '';
    if (!metFound && baseClasses.some(c => /^(?:text-[2-5]xl)$/.test(c)) && !baseClasses.includes('tabular-nums') && /\d/.test(lineText)) {
      metFound = true;
      violations.push({
        rule: 'MET-01',
        message: 'KPI metric value missing tabular-nums for numeric alignment.',
      });
    }

    if (!tblFound && node.tag === 'table') {
      let p = node.parent;
      let hasOverflow = false;
      while (p !== null) {
        const parentNode = parsed.nodes[p]!;
        if (parentNode.classes.map(stripVariants).some(c => c === 'overflow-x-auto' || c === 'overflow-auto')) {
          hasOverflow = true;
          break;
        }
        p = parentNode.parent;
      }
      if (!hasOverflow) {
        tblFound = true;
        violations.push({
          rule: 'TBL-01',
          message: 'Data <table> missing overflow-x-auto wrapper container.',
        });
      }
    }

    if (!navFound && (node.tag === 'header' || baseClasses.includes('page-header')) && (baseClasses.includes('h-16') || baseClasses.some(c => /^h-(?:1[6-9]|[2-9]\d)/.test(c)))) {
      navFound = true;
      violations.push({
        rule: 'NAV-01',
        message: 'Dashboard header uses oversized h-16; use compact h-12 or h-14.',
      });
    }

    if (!frmFound && (node.tag === 'input' || node.tag === 'textarea' || node.tag === 'select')) {
      const type = node.attrs.type;
      if (type !== 'hidden' && type !== 'submit' && type !== 'button') {
        const parentNode = node.parent !== null ? parsed.nodes[node.parent] : null;
        const parentHasField = parentNode && parentNode.classes.map(stripVariants).includes('field');
        if (!parentHasField) {
          frmFound = true;
          violations.push({
            rule: 'FRM-01',
            message: 'Input control missing <div class="field"> wrapper and associated label.',
          });
        }
      }
    }
  }

  const elementNodes = parsed.nodes.filter(n => !['script', 'style'].includes(n.tag));
  const divCount = elementNodes.filter(n => n.tag === 'div').length;
  const hasSemanticTag = elementNodes.some(n => SEMANTIC_TAGS.has(n.tag));
  const hasRedundantDiv = parsed.nodes.some(n =>
    ['main', 'header', 'nav', 'aside', 'footer'].includes(n.tag) &&
    n.parent !== null &&
    parsed.nodes[n.parent]?.tag === 'div' &&
    parsed.nodes.filter(c => c.parent === n.parent).length === 1
  );

  if ((divCount >= 6 && !hasSemanticTag) || hasRedundantDiv) {
    violations.push({
      rule: 'SEM-01',
      message: 'Generic <div> soup or redundant wrapper detected without semantic HTML5 landmark structure.',
    });
  }

  // FRM-02: Reject orphaned form controls without enclosing Field (.field), FieldGroup (.field-group), or <fieldset>
  let frm02Found = false;
  for (const node of parsed.nodes) {
    if (node.tag === 'input' || node.tag === 'select' || node.tag === 'textarea') {
      const type = (node.attrs.type ?? '').toLowerCase();
      if (type !== 'hidden') {
        let p = node.parent;
        let hasEnclosingFieldOrGroup = false;
        while (p !== null) {
          const anc = parsed.nodes[p]!;
          const ancClasses = anc.classes.map(stripVariants);
          if (
            ancClasses.includes('field') ||
            ancClasses.includes('field-group') ||
            anc.tag === 'fieldset'
          ) {
            hasEnclosingFieldOrGroup = true;
            break;
          }
          p = anc.parent;
        }
        if (!hasEnclosingFieldOrGroup && !frm02Found) {
          frm02Found = true;
          violations.push({
            rule: 'FRM-02',
            message: `Orphaned <${node.tag}> control detected without an enclosing Field (.field), FieldGroup (.field-group), or <fieldset>.`,
          });
        }
      }
    }
  }

  // FRM-03: Enforce label for matching control id and aria-describedby binding in .field
  let frm03Found = false;
  for (const node of parsed.nodes) {
    if (node.classes.map(stripVariants).includes('field')) {
      const fieldIndex = node.index;
      const descendants = parsed.nodes.filter(n => {
        let p = n.parent;
        let directField = false;
        while (p !== null) {
          if (p === fieldIndex) { directField = true; break; }
          if (parsed.nodes[p]?.classes.map(stripVariants).includes('field')) break;
          p = parsed.nodes[p]?.parent ?? null;
        }
        return directField;
      });

      const controls = descendants.filter(n =>
        (n.tag === 'input' && (n.attrs.type ?? '').toLowerCase() !== 'hidden') ||
        n.tag === 'select' ||
        n.tag === 'textarea'
      );
      const labels = descendants.filter(n => n.tag === 'label');
      const descriptions = descendants.filter(n => n.classes.map(stripVariants).includes('field-description'));
      const errors = descendants.filter(n => n.classes.map(stripVariants).includes('field-error'));

      for (const ctrl of controls) {
        const ctrlId = ctrl.attrs.id;
        const matchingLabel = ctrlId && labels.some(l => l.attrs.for === ctrlId);
        if (!matchingLabel && !frm03Found) {
          frm03Found = true;
          violations.push({
            rule: 'FRM-03',
            message: `Missing or mismatched <label for="..."> matching control id "${ctrlId || 'missing-id'}" in .field.`,
          });
        }

        const descIds = descriptions.map(d => d.attrs.id).filter((id): id is string => Boolean(id));
        const errIds = errors.map(e => e.attrs.id).filter((id): id is string => Boolean(id));
        const isInvalid = ctrl.attrs['aria-invalid'] === 'true' || node.attrs['data-invalid'] === 'true';

        const describedBy = (ctrl.attrs['aria-describedby'] ?? '').split(/\s+/).filter(Boolean);
        const missingDesc = descIds.some(id => !describedBy.includes(id));
        const missingErr = errIds.some(id => !describedBy.includes(id)) || (isInvalid && errIds.length > 0 && !errIds.some(id => describedBy.includes(id)));

        if ((missingDesc || missingErr) && !frm03Found) {
          frm03Found = true;
          violations.push({
            rule: 'FRM-03',
            message: 'Control in .field missing aria-describedby binding to description/error element id(s).',
          });
        }
      }
    }
  }

  // FRM-04: Reject multiple radio or checkbox controls not enclosed in <fieldset> with <legend>
  const radioInputs = parsed.nodes.filter(n => n.tag === 'input' && (n.attrs.type ?? '').toLowerCase() === 'radio');
  const checkboxInputs = parsed.nodes.filter(n => n.tag === 'input' && (n.attrs.type ?? '').toLowerCase() === 'checkbox');

  function isInsideFieldsetWithLegend(nodeIndex: number): boolean {
    let p = parsed.nodes[nodeIndex]?.parent ?? null;
    while (p !== null) {
      const anc = parsed.nodes[p]!;
      if (anc.tag === 'fieldset') {
        const hasLegend = parsed.nodes.some(n => {
          if (n.tag !== 'legend') return false;
          let cur = n.parent;
          while (cur !== null) {
            if (cur === anc.index) return true;
            cur = parsed.nodes[cur]?.parent ?? null;
          }
          return false;
        });
        if (hasLegend) return true;
      }
      p = anc.parent;
    }
    return false;
  }

  if (radioInputs.length >= 2) {
    const ungrouped = radioInputs.some(r => !isInsideFieldsetWithLegend(r.index));
    if (ungrouped) {
      violations.push({
        rule: 'FRM-04',
        message: 'Multiple radio controls must be enclosed in a <fieldset> with a <legend>.',
      });
    }
  }

  if (checkboxInputs.length >= 2) {
    const ungrouped = checkboxInputs.some(c => !isInsideFieldsetWithLegend(c.index));
    if (ungrouped) {
      violations.push({
        rule: 'FRM-04',
        message: 'Multiple checkbox controls must be enclosed in a <fieldset> with a <legend>.',
      });
    }
  }

  return violations;
}

export function auditMarkup(source: string): Array<{ rule: string; message: string }> {
  return checkCodeViolations(source);
}

export function runRulesEnforcer(input: RulesEnforcerInput = {}) {
  const category = input.category ?? 'all';
  const query = (input.query ?? input.id ?? input.componentId ?? input.name ?? '').trim().toLowerCase();
  const semantics = defaultSemanticsStore.getRegistry();
  const fsmRecipes = Object.values(semantics.fsmRecipes).map(r => ({
    recipe: r.id,
    initialState: r.initialStates[0] ?? 'closed',
    states: r.states.map(s => s.id),
  }));

  let rules = TECHNICAL_RULES.filter(r => category === 'all' || r.category === category);
  if (query) {
    const filtered = rules.filter(r =>
      [r.id, r.category, r.rule, ...r.forbidden, ...r.required]
        .join(' ')
        .toLowerCase()
        .includes(query),
    );
    if (filtered.length > 0) rules = filtered;
  }

  const codeToAudit = input.code ?? input.html;
  const violations = codeToAudit !== undefined && codeToAudit.trim().length > 0
    ? auditMarkup(codeToAudit)
    : [];
  const codeReport = codeToAudit !== undefined
    ? { valid: violations.length === 0, violations: violations.slice(0, 6) }
    : {};

  const fullResult = {
    stage: '2a-rules-enforcer',
    category,
    ...codeReport,
    ruleCount: rules.length,
    rules,
    fsmContracts: fsmRecipes,
    nextStep: 'Pair with basecoat_creative_director, then retrieve markup via basecoat_component_syntax.',
  };

  if (responseBytes(fullResult) <= MAX_DETAIL_BYTES) {
    return fullResult;
  }

  for (const sliceCount of [5, 4, 3, 2, 1]) {
    for (const ruleLimit of [35, 33, 28, 25, 20, 15, 12, 10, 8, 6, 5, 4, 3]) {
      const candidate = {
        stage: '2a-rules-enforcer',
        category,
        ...(codeToAudit !== undefined
          ? { valid: violations.length === 0, violations: violations.slice(0, 6) }
          : {}),
        ruleCount: rules.length,
        rules: rules.slice(0, ruleLimit).map(r => ({
          id: r.id,
          category: r.category,
          rule: r.rule.slice(0, 60),
          forbidden: (r.forbidden ?? []).slice(0, Math.max(1, sliceCount)).map(s => s.slice(0, 50)),
          required: (r.required ?? []).slice(0, Math.max(1, sliceCount)).map(s => s.slice(0, 50)),
        })),
        fsmContracts: fsmRecipes.map(f => sliceCount >= 2 ? `${f.recipe}:${f.initialState}` : f.recipe),
        nextStep: 'Call basecoat_component_syntax for FSM-bound HTML.',
      };
      if (responseBytes(candidate) <= MAX_DETAIL_BYTES) {
        return candidate;
      }
    }
  }

  const minimal = {
    stage: '2a-rules-enforcer',
    category,
    ...(codeToAudit !== undefined
      ? { valid: violations.length === 0, violations: violations.slice(0, 4) }
      : {}),
    ruleCount: rules.length,
    rules: rules.slice(0, 4).map(r => ({
      id: r.id,
      category: r.category,
      forbidden: r.forbidden.slice(0, 1).map(s => s.slice(0, 30)),
      required: r.required.slice(0, 1).map(s => s.slice(0, 30)),
    })),
    fsmContracts: fsmRecipes.map(f => f.recipe),
    nextStep: 'Call basecoat_component_syntax.',
  };
  assertDetailBudget(minimal);
  return minimal;
}
