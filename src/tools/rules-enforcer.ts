import { z } from 'zod';
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

const TECHNICAL_RULES: TechnicalRule[] = [
  {
    id: 'TW4-01',
    category: 'tailwind-v4',
    rule: 'Use strict Tailwind CSS v4 syntax, @import directives, and deterministic class ordering.',
    forbidden: [
      'bg-opacity-*',
      'flex-shrink-*',
      'flex-grow-*',
      'overflow-ellipsis',
      '@tailwind base/components/utilities',
    ],
    required: [
      '@import "tailwindcss"; @import "basecoat-css/vega";',
      'bg-primary/80 (slash alpha)',
      'shrink-0 / grow / text-ellipsis',
      'Order: layout->flex/grid->size->space->type->bg->border->state',
    ],
  },
  {
    id: 'TW4-02',
    category: 'tailwind-v4',
    rule: 'Respect .card 1px ring shadow and 4px/8px spacing scale; forbid arbitrary dimensions/colors.',
    forbidden: [
      '.card with border or border-border',
      'w-[327px], h-[412px] (arbitrary bracket sizing)',
      'bg-[#...], text-[rgb(...)], bg-gradient-*',
      'gap-3, gap-5, p-5, p-7 (in comfortable mode)',
    ],
    required: [
      'class="card" (no border class)',
      'spacing steps: 0, 2, 4, 6, 8, 12 (compact adds 1, 1.5, 2.5, 3, 5)',
    ],
  },
  {
    id: 'FSM-01',
    category: 'fsm-contracts',
    rule: 'Interactive primitives (dialog, dropdown-menu, accordion, tabs, navigation) require FSM data-state and ARIA bindings.',
    forbidden: [
      'Unbound interactive containers without data-state or data-fsm-*',
      'import "basecoat-css/all"',
    ],
    required: [
      'dialog: <dialog class="dialog" data-state="closed" data-fsm-recipe="dialog" data-fsm-state="closed">',
      'dropdown: <div class="dropdown-menu" data-state="closed"> + trigger aria-expanded="false" aria-controls="id"',
      'accordion: <section class="accordion" data-state="open|closed"> using <details>/<summary>',
      'tabs: <div class="tabs" data-state="active" data-fsm-recipe="tabs" data-fsm-state="active">',
    ],
  },
  {
    id: 'TOK-01',
    category: 'tokens',
    rule: 'Enforce semantic tokens (--color-primary, --color-surface), WCAG/APCA contrast pairings, and html.dark resolver.',
    forbidden: [
      'Hardcoded hex (#fff, #09090b), rgb(), or w-[327px] in markup',
      'Low-contrast pairings (bg-primary with text-primary)',
      '@media (prefers-color-scheme: dark) mixed with .dark class',
      '<meta name="color-scheme" content="light dark">',
      'Custom localStorage theme keys other than "themeMode"',
    ],
    required: [
      'CSS variables: --color-primary (--primary), --color-surface (--background, --card), --foreground, --muted, --border',
      'Paired classes: bg-primary + text-primary-foreground, bg-card + text-card-foreground, bg-background + text-foreground',
      'Single theme resolver: window.basecoat.theme.toggle() + localStorage "themeMode"',
      'Native <select> dark CSS: .dark select, .dark select option { background-color: var(--card); color: var(--foreground); color-scheme: dark; }',
    ],
  },
  {
    id: 'SEM-01',
    category: 'semantic-html',
    rule: 'Use semantic HTML5 landmarks and native controls over generic <div> wrappers; forbid emojis and external CDNs.',
    forbidden: [
      'Generic <div> soup or duplicate wrapper <div> containers',
      'Multiple <main> or multiple <h1> elements',
      'Nested .card inside .card without data-variant="subcard"',
      'Unicode emojis or external CDN <script>/<link>',
    ],
    required: [
      'Landmarks in order: <header>, <nav aria-label="...">, <main>, <aside aria-label="...">, <footer>',
      'Forms: <div class="field"><label class="label" for="id"> + <input class="input" id="id">',
      'Inline SVG icons (size-4, stroke="currentColor") and aria-label on icon buttons',
    ],
  },
  {
    id: 'MET-01',
    category: 'dashboard-patterns',
    rule: 'Enforce KPI metric card typography hierarchy, tabular numerals, and semantic trend badge indicators.',
    forbidden: [
      'KPI numerals without tabular-nums (e.g. text-3xl font-semibold without tabular-nums)',
      'Ambiguous trend percentages without semantic badge container or aria-label',
      '.card with border or border-border in Vega style pack',
    ],
    required: [
      'Value typography: text-2xl or text-3xl font-semibold tracking-tight tabular-nums',
      'Trend indicator: <span class="badge" data-variant="outline"><svg class="size-3" ...><span class="sr-only">Trend</span>',
      'Card padding: p-4 (compact) or p-6 (standard) without border class',
    ],
  },
  {
    id: 'TBL-01',
    category: 'dashboard-patterns',
    rule: 'Enforce data table geometry: overflow-x-auto wrapper, sticky header, toolbar, row actions, and tabular-nums.',
    forbidden: [
      'Bare <table> without <div class="overflow-x-auto"> wrapper container',
      'Numeric columns without tabular-nums and text-right alignment',
      'Interactive row action dropdown triggers without aria-expanded and data-state',
    ],
    required: [
      'Container: <div class="overflow-x-auto"><table class="table">',
      'Sticky header: <thead class="sticky top-0 bg-background/90 backdrop-blur">',
      'Toolbar: <div class="flex items-center justify-between gap-4"> above table',
      'Row dropdowns with FSM contract: data-state="closed" aria-expanded="false"',
    ],
  },
  {
    id: 'FRM-01',
    category: 'dashboard-patterns',
    rule: 'Enforce form field wrappers with label association and data-state="loading" submit button handling.',
    forbidden: [
      'Native <input> without <div class="field"> and matching <label class="label" for="id">',
      'Submit buttons without data-state / loading state handling during async submission',
      'Hardcoded input sizes (e.g. w-[320px]); use w-full or responsive grid columns',
    ],
    required: [
      'Wrapper: <div class="field"><label class="label" for="id">Label</label><input class="input" id="id">',
      'Submit action: <button type="submit" class="btn" data-state="default" data-loading-variant="spinner">',
      'Validation helper: <p class="text-xs text-muted-foreground" id="id-help"> bound via aria-describedby',
    ],
  },
  {
    id: 'NAV-01',
    category: 'dashboard-patterns',
    rule: 'Enforce sidebar and shell geometry with collapsible tooltip mode and compact top app bar.',
    forbidden: [
      'App headers with h-16 or taller in data-dense dashboards',
      'Unlabelled <aside> or <nav> landmarks without aria-label or aria-labelledby',
      'Sidebar container without data-state="expanded"|"collapsed" FSM contract',
    ],
    required: [
      'Sidebar: <aside class="sidebar group/sidebar" data-state="expanded" data-collapsible="tooltip" data-fsm-recipe="navigation" data-fsm-state="expanded" aria-label="Primary navigation">',
      'Header: <header class="flex h-12 (or h-14) items-center justify-between border-b border-border/60">',
      'Breadcrumb: <nav aria-label="Breadcrumb" class="breadcrumb text-sm">',
    ],
  },
  {
    id: 'no-space-xy',
    category: 'tailwind-v4',
    rule: 'Forbid space-x-* and space-y-* utility classes; enforce flex gap-* or flex flex-col gap-*.',
    forbidden: [
      'space-x-* (legacy margin injection)',
      'space-y-* (causes flex layout bleed)',
    ],
    required: [
      'flex gap-* (horizontal flex child spacing)',
      'flex flex-col gap-* (vertical flex stack spacing)',
    ],
  },
  {
    id: 'enforce-size-shorthand',
    category: 'tailwind-v4',
    rule: 'Use modern Tailwind size-* utility instead of matching pairs of w-* and h-*.',
    forbidden: [
      'w-4 h-4 (redundant dimension pair)',
      'w-8 h-8, w-10 h-10, w-12 h-12',
    ],
    required: [
      'size-4, size-8, size-10, size-12 shorthand utilities',
    ],
  },
  {
    id: 'no-manual-dark',
    category: 'tokens',
    rule: 'Forbid manual dark: class overrides; rely exclusively on semantic CSS variables.',
    forbidden: [
      'dark:bg-slate-900 (manual dark class override)',
      'dark:text-white, dark:border-zinc-800',
    ],
    required: [
      'Semantic CSS variables: bg-background, text-foreground, border-border, bg-card',
      'HTML root .dark class managed by single theme controller',
    ],
  },
  {
    id: 'semantic-color-tokens',
    category: 'tokens',
    rule: 'Forbid raw Tailwind palette colors (e.g. bg-blue-500, text-gray-600); enforce semantic theme tokens.',
    forbidden: [
      'bg-blue-500, bg-red-600, text-gray-600, bg-slate-100',
      'Non-semantic color utilities outside badge semantic variants',
    ],
    required: [
      'bg-primary, text-primary-foreground, bg-muted, text-muted-foreground',
      'bg-destructive, text-destructive-foreground, border-border',
    ],
  },
  {
    id: 'field-group-hierarchy',
    category: 'dashboard-patterns',
    rule: 'Enforce FieldGroup (data-component="field-group") and Field (data-component="field" / .field) with label association and dual data-invalid / aria-invalid contracts.',
    forbidden: [
      'Raw input stacked with label in plain space-y-* div',
      'data-invalid on container without aria-invalid on input control',
    ],
    required: [
      '<div class="field" data-component="field"><label class="label" for="id">...<input class="input" id="id">',
      'Dual invalid contract: container data-invalid="true" + control aria-invalid="true"',
    ],
  },
  {
    id: 'input-group-addon',
    category: 'dashboard-patterns',
    rule: 'Enforce InputGroup structure (data-component="input-group") with explicit addons (data-slot="input-group-addon").',
    forbidden: [
      'Unstructured inline icons floating over inputs without input-group slot',
      'Ad-hoc absolute positioned icon overlays inside raw text inputs',
    ],
    required: [
      '<div class="input-group" data-component="input-group"><span data-slot="input-group-addon">...</span><input class="input"></div>',
    ],
  },
  {
    id: 'select-and-menu-groups',
    category: 'semantic-html',
    rule: 'Enforce grouped selections inside <optgroup>, SelectGroup, DropdownMenuGroup, or CommandGroup wrappers.',
    forbidden: [
      'Flat lists of options or menu items without categorical grouping',
      'Ad-hoc divider divs separating option lists',
    ],
    required: [
      '<optgroup label="..."> in native <select>',
      '<div data-slot="select-group" role="group"> with group label in custom menus',
    ],
  },
  {
    id: 'icon-data-attribute-no-size',
    category: 'semantic-html',
    rule: 'Enforce data-icon="inline-start|inline-end" on button icons without manual size-4 / w-4 h-4 classes.',
    forbidden: [
      '<button class="btn"><svg class="size-4" data-icon="inline-start"> (redundant sizing)',
      '<button class="btn"><svg class="w-4 h-4"> (missing data-icon attribute)',
    ],
    required: [
      '<button class="btn"><svg data-icon="inline-start" ...> (automatic CSS sizing)',
      'data-icon="inline-start" for leading icons, data-icon="inline-end" for trailing',
    ],
  },
  {
    id: 'dialog-accessible-title',
    category: 'fsm-contracts',
    rule: 'Require DialogTitle / <h2> with aria-labelledby on <dialog>, drawer, and sheet overlays.',
    forbidden: [
      '<dialog class="dialog"> without aria-labelledby or visible accessible title',
      'Sheet / drawer panels with missing modal title heading',
    ],
    required: [
      '<dialog id="dlg" class="dialog" aria-labelledby="dlg-title"><h2 id="dlg-title" class="text-lg font-semibold">Title</h2></dialog>',
    ],
  },
  {
    id: 'empty-and-skeleton-primitives',
    category: 'dashboard-patterns',
    rule: 'Require .empty state containers and .skeleton primitives instead of custom animate-pulse divs.',
    forbidden: [
      'Ad-hoc <div class="animate-pulse bg-gray-200"> loading placeholders',
      'Empty table/card fallback without .empty landmark structure',
    ],
    required: [
      '<div class="skeleton h-4 w-full"> or <div class="skeleton size-10 rounded-full">',
      '<div class="empty text-center p-8"><p class="text-sm text-muted-foreground">No records</p></div>',
    ],
  },
];

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

  return violations;
}

export function runRulesEnforcer(input: RulesEnforcerInput = {}) {
  const category = input.category ?? 'all';
  const query = (input.query ?? '').trim().toLowerCase();
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
    ? checkCodeViolations(codeToAudit)
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

  for (const sliceCount of [2, 1, 0]) {
    for (const ruleLimit of [19, 15, 12, 10, 8, 6, 5, 4, 3]) {
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
          ...(sliceCount > 0 ? { rule: r.rule.slice(0, 60) } : {}),
          forbidden: r.forbidden.slice(0, Math.max(1, sliceCount)).map(s => s.slice(0, 40)),
          required: r.required.slice(0, Math.max(1, sliceCount)).map(s => s.slice(0, 40)),
        })),
        fsmContracts: fsmRecipes.map(f => sliceCount === 2 ? `${f.recipe}:${f.initialState}` : f.recipe),
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
