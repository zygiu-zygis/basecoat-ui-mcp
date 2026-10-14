import { z } from 'zod';
import { defaultSemanticsStore } from '../semantics/index.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';
import { parseHtmlWithDiagnostics } from './html.js';
import { INTERACTIVE_PRIMITIVES, SEMANTIC_TAGS, TW3_DEPRECATED_UTILITY } from './validate.js';

export const rulesEnforcerInputShape = {
  category: z
    .enum(['all', 'tailwind-v4', 'fsm-contracts', 'tokens', 'semantic-html'])
    .optional(),
  query: z.string().max(120).optional(),
  code: z.string().max(16000).optional(),
};

export type RulesEnforcerInput = z.infer<z.ZodObject<typeof rulesEnforcerInputShape>>;

export interface TechnicalRule {
  id: string;
  category: 'tailwind-v4' | 'fsm-contracts' | 'tokens' | 'semantic-html';
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

  const violations = input.code !== undefined && input.code.trim().length > 0
    ? checkCodeViolations(input.code)
    : [];
  const codeReport = input.code !== undefined
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
    const candidate = {
      stage: '2a-rules-enforcer',
      category,
      ...(input.code !== undefined
        ? { valid: violations.length === 0, violations: violations.slice(0, 6) }
        : {}),
      ruleCount: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        category: r.category,
        ...(sliceCount > 0 ? { rule: r.rule.slice(0, 80) } : {}),
        forbidden: r.forbidden.slice(0, Math.max(1, sliceCount)),
        required: r.required.slice(0, Math.max(1, sliceCount)),
      })),
      fsmContracts: fsmRecipes.map(f => sliceCount === 2 ? `${f.recipe}:${f.initialState}` : f.recipe),
      nextStep: 'Call basecoat_component_syntax for FSM-bound HTML.',
    };
    if (responseBytes(candidate) <= MAX_DETAIL_BYTES) {
      return candidate;
    }
  }

  const minimal = {
    stage: '2a-rules-enforcer',
    category,
    ...(input.code !== undefined
      ? { valid: violations.length === 0, violations: violations.slice(0, 6) }
      : {}),
    ruleCount: rules.length,
    rules: rules.map(r => ({
      id: r.id,
      category: r.category,
      forbidden: r.forbidden.slice(0, 1),
      required: r.required.slice(0, 1),
    })),
    fsmContracts: fsmRecipes.map(f => f.recipe),
    nextStep: 'Call basecoat_component_syntax.',
  };
  assertDetailBudget(minimal);
  return minimal;
}
