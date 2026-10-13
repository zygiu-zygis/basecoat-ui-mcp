// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { defaultSemanticsStore } from '../semantics/index.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';

export const rulesEnforcerInputShape = {
  category: z
    .enum(['all', 'tailwind-v4', 'fsm-contracts', 'tokens', 'semantic-html'])
    .optional(),
  query: z.string().max(120).optional(),
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
    rule: 'Use strict Tailwind CSS v4 syntax and CSS-first @import directives; never emit deprecated v3 utilities.',
    forbidden: [
      'bg-opacity-*',
      'text-opacity-*',
      'border-opacity-*',
      'flex-shrink-*',
      'flex-grow-*',
      'overflow-ellipsis',
      '@tailwind base/components/utilities',
    ],
    required: [
      '@import "tailwindcss"; @import "basecoat-css/vega";',
      'bg-primary/80 (slash alpha modifier)',
      'shrink-0 / grow',
      'text-ellipsis',
    ],
  },
  {
    id: 'TW4-02',
    category: 'tailwind-v4',
    rule: 'Respect Basecoat .card 1px ring shadow and approved spacing scale; forbid arbitrary color/gradient utilities.',
    forbidden: [
      '.card with border or border-border (causes 2px double border)',
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
    rule: 'Interactive primitives (dialog, dropdown-menu, accordion, tabs, navigation, auth-flow) must declare explicit FSM data-state and ARIA bindings.',
    forbidden: [
      'Unbound interactive containers without data-state or data-fsm-recipe/data-fsm-state',
      'import "basecoat-css/all"',
    ],
    required: [
      'dialog: <dialog class="dialog" data-state="closed" data-fsm-recipe="dialog" data-fsm-state="closed">',
      'dropdown: <div class="dropdown-menu" data-state="closed"> + trigger aria-expanded="false"',
      'accordion: <section class="accordion" data-state="open|closed"> using <details>/<summary>',
      'tabs: <div class="tabs" data-state="active" data-fsm-recipe="tabs" data-fsm-state="active">',
      'JS: import "basecoat-css/basecoat" before selective module imports',
    ],
  },
  {
    id: 'TOK-01',
    category: 'tokens',
    rule: 'Enforce semantic CSS variable tokens (--color-primary / --primary, --color-surface / --background / --card) and single html.dark resolver.',
    forbidden: [
      'Hardcoded hex (#fff, #09090b), rgb(), or arbitrary var() colors in markup',
      '@media (prefers-color-scheme: dark) mixed with .dark class',
      '<meta name="color-scheme" content="light dark"> (leaks dark OS controls into light mode)',
      'Custom localStorage theme keys other than "themeMode"',
    ],
    required: [
      'CSS variables: --color-primary (--primary), --color-surface (--background, --card), --foreground, --muted, --border, --ring',
      'Semantic classes: bg-background, bg-card, text-foreground, text-muted-foreground, border-border',
      'Single theme resolver: window.basecoat.theme.toggle() + localStorage "themeMode"',
      'Native <select>/<option> dark styling: .dark select, .dark select option { background-color: var(--card); color: var(--foreground); color-scheme: dark; } and :root { color-scheme: light; }',
    ],
  },
  {
    id: 'SEM-01',
    category: 'semantic-html',
    rule: 'Use semantic HTML5 landmarks and native controls over generic <div> nesting; forbid emojis and external CDNs.',
    forbidden: [
      'Generic <div> soup for page regions or clickable controls',
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

  const fullResult = {
    stage: '2a-rules-enforcer',
    category,
    ruleCount: rules.length,
    rules,
    fsmContracts: fsmRecipes,
    nextStep: 'Pair with basecoat_creative_director, then retrieve markup via basecoat_component_syntax.',
  };

  if (responseBytes(fullResult) <= MAX_DETAIL_BYTES) {
    return fullResult;
  }

  for (const sliceCount of [2, 1]) {
    const candidate = {
      stage: '2a-rules-enforcer',
      category,
      ruleCount: rules.length,
      rules: rules.map(r => ({
        id: r.id,
        category: r.category,
        rule: r.rule.slice(0, 90),
        forbidden: r.forbidden.slice(0, sliceCount),
        required: r.required.slice(0, sliceCount),
      })),
      fsmContracts: fsmRecipes.map(f => `${f.recipe}:${f.initialState}`),
      nextStep: 'Call basecoat_component_syntax for FSM-bound HTML.',
    };
    if (responseBytes(candidate) <= MAX_DETAIL_BYTES) {
      return candidate;
    }
  }

  const minimal = {
    stage: '2a-rules-enforcer',
    category,
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
