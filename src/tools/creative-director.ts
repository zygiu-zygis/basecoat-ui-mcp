// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { RHYTHM } from '../design/rhythm.js';
import { THEMING } from '../design/theming.js';
import { defaultSemanticsStore } from '../semantics/index.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';

export const creativeDirectorInputShape = {
  topic: z
    .enum(['all', 'typography', 'whitespace', 'hierarchy', 'elevation', 'style-packs'])
    .optional(),
  visitorJob: z.enum(['operate', 'persuade', 'read', 'experience']).optional(),
  stylePack: z
    .enum(['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'])
    .optional(),
};

export type CreativeDirectorInput = z.infer<z.ZodObject<typeof creativeDirectorInputShape>>;

const STYLE_PACKS: Record<string, { importCss: string; aesthetic: string }> = {
  vega: {
    importCss: '@import "basecoat-css/vega";',
    aesthetic: 'Default shadcn/ui New York v4: rounded-md buttons, rounded-xl ring-1 cards, balanced padding.',
  },
  nova: {
    importCss: '@import "basecoat-css/nova";',
    aesthetic: 'Modern SaaS: rounded-lg buttons, rounded-xl ring cards, compact vertical rhythm.',
  },
  maia: {
    importCss: '@import "basecoat-css/maia";',
    aesthetic: 'Organic modern: rounded-4xl pill buttons, rounded-2xl cards, open:bg-muted/50.',
  },
  lyra: {
    importCss: '@import "basecoat-css/lyra";',
    aesthetic: 'High-density technical/brutalist: rounded-none buttons/cards, text-xs, crisp 1px rings.',
  },
  mira: {
    importCss: '@import "basecoat-css/mira";',
    aesthetic: 'Editorial compact: rounded-md text-xs/relaxed controls, rounded-lg cards.',
  },
  luma: {
    importCss: '@import "basecoat-css/luma";',
    aesthetic: 'Soft modern: rounded-4xl controls, soft ring-foreground/5 elevation.',
  },
  sera: {
    importCss: '@import "basecoat-css/sera";',
    aesthetic: 'Architectural flat: rounded-none uppercase font-semibold buttons, shadow-sm cards.',
  },
  rhea: {
    importCss: '@import "basecoat-css/rhea";',
    aesthetic: 'Modern curved: rounded-2xl buttons and cards.',
  },
};

const VISITOR_JOBS: Record<string, { density: 'compact' | 'comfortable'; guidance: string }> = {
  operate: {
    density: 'compact',
    guidance: 'Dense & scannable: max 3 regions, 5 actions, ~25 text fragments in first viewport; toolbar + table/list upfront.',
  },
  persuade: {
    density: 'comfortable',
    guidance: 'Generous whitespace, intentional focal hierarchy; avoid cliché hero + 3 equal cards.',
  },
  read: {
    density: 'comfortable',
    guidance: 'Single column (max-w-prose, 60-75ch); more space above headings than between heading and paragraph.',
  },
  experience: {
    density: 'comfortable',
    guidance: 'Imagery leads; keep chrome, nav, and labels quiet in the background.',
  },
};

export function runCreativeDirector(input: CreativeDirectorInput = {}, projectRoot?: string) {
  const topic = input.topic ?? 'all';
  const jobKey = input.visitorJob ?? 'operate';
  const packKey = input.stylePack ?? 'vega';
  const profile = defaultSemanticsStore.getEffectiveRhythmProfile('default', projectRoot);

  const semanticTokens = Object.fromEntries(
    profile.families.map(f => [
      f.id,
      f.mappings.map(m => `${m.id}->${m.value}`),
    ]),
  );

  const sections = {
    typography: {
      ladder: [
        'h1: text-3xl font-semibold tracking-tight (exactly one per page)',
        'h2: text-xl font-semibold tracking-tight (section headings)',
        'body: text-base text-foreground (60-75ch prose measure)',
        'data/meta: text-sm text-muted-foreground (tables, secondary labels, captions)',
        'numeric: tabular-nums on KPIs, prices, and table cells',
      ],
      opticalRules: 'No eyebrow/kicker above headings. More space above a heading than below it.',
    },
    whitespace: {
      rhythmScale: [
        'gap-2 (0.5rem): label/control pairs, inline icon+text, compact actions',
        'gap-4 (1rem): neighboring fields, related control rows, card grid gaps',
        'gap-6 (1.5rem): section heading to content, major local groups, standard card p-6',
        'gap-12 (3rem): major page sections',
      ],
      kansoMinimalism: 'Internal group spacing <= 1/3 of inter-section spacing. Compact headers use h-12 or h-14 (never h-16).',
    },
    hierarchy: {
      ctaRule: 'One primary .btn per decision group; use data-variant="outline"|"secondary" for secondary and "ghost" for tertiary.',
      alignment: 'Left-align body copy, labels, and tables. Reserve text-center for short empty states or focal heroes only.',
      visitorJob: { job: jobKey, ...VISITOR_JOBS[jobKey]! },
    },
    elevation: {
      palette: 'Neutral oklch zinc/slate (--background, --card, --foreground, --muted-foreground, --border). No decorative gradients.',
      surfaces: 'Cards (.card) carry an intrinsic 1px ring shadow—never add border/border-border. Use bg-muted/50 for subtle row highlights.',
      contrast: 'Maintain WCAG AA contrast; text on tinted fills must use matching foreground tokens (--primary-foreground).',
      themingContract: THEMING.includes('window.basecoat.theme') && RHYTHM.includes('Shadcn Aesthetic')
        ? 'Single html.dark class + window.basecoat.theme (localStorage key "themeMode").'
        : 'Class-based html.dark only.',
    },
    stylePack: {
      selected: packKey,
      ...STYLE_PACKS[packKey]!,
      availablePacks: Object.keys(STYLE_PACKS),
    },
  };

  const payload =
    topic === 'all'
      ? {
          stage: '2b-creative-director',
          philosophy: 'Kanso minimalism + Shadcn New York v4 precision',
          ...sections,
          semanticTokens,
          nextStep: 'Fetch exact state-bound component HTML via basecoat_component_syntax.',
        }
      : {
          stage: '2b-creative-director',
          topic,
          guidance:
            topic === 'style-packs'
              ? { selected: sections.stylePack, allPacks: STYLE_PACKS }
              : sections[topic],
          semanticTokens,
          nextStep: 'Fetch exact state-bound component HTML via basecoat_component_syntax.',
        };

  if (responseBytes(payload) <= MAX_DETAIL_BYTES) {
    return payload;
  }

  const { semanticTokens: _omit, ...withoutTokens } = payload;
  if (responseBytes(withoutTokens) <= MAX_DETAIL_BYTES) {
    return withoutTokens;
  }

  const compact = {
    stage: '2b-creative-director',
    philosophy: 'Kanso minimalism + Shadcn New York v4 precision',
    typography: sections.typography.ladder,
    whitespace: sections.whitespace.rhythmScale,
    hierarchy: sections.hierarchy,
    elevation: {
      palette: sections.elevation.palette,
      surfaces: sections.elevation.surfaces,
    },
    stylePack: sections.stylePack,
    nextStep: 'Retrieve state-bound component HTML via basecoat_component_syntax.',
  };
  assertDetailBudget(compact);
  return compact;
}
