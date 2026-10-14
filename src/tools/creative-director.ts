// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { RHYTHM } from '../design/rhythm.js';
import { THEMING } from '../design/theming.js';
import { defaultSemanticsStore } from '../semantics/index.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';

export const creativeDirectorInputShape = {
  topic: z
    .enum(['all', 'typography', 'whitespace', 'hierarchy', 'elevation', 'style-packs', 'content-strategy', 'density'])
    .optional()
    .describe('Design topic to inspect: "typography", "whitespace", "hierarchy", "elevation", "style-packs", "content-strategy", "density", or "all".'),
  visitorJob: z
    .enum(['operate', 'persuade', 'read', 'experience'])
    .optional()
    .describe('Visitor mental model and primary task: "operate" (fast scanning SaaS), "persuade" (marketing landing), "read" (prose doc), or "experience" (immersive showcase).'),
  stylePack: z
    .enum(['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'])
    .optional()
    .describe('Basecoat curated style pack aesthetic: "vega" (default New York v4), "nova" (SaaS), "maia" (organic pill), "lyra" (high-density brutalist), "mira" (editorial), "luma" (soft), "sera" (architectural), or "rhea" (curved).'),
  density: z
    .enum(['compact', 'standard', 'comfortable'])
    .optional()
    .describe('Interface spatial density profile: "compact" (dense table/data tool, p-4/h-12), "standard" (balanced dashboard, p-6/h-14), or "comfortable" (generous whitespace reading, p-8/h-14).'),
  id: z.string().max(80).optional().describe('Principle ID or component ID alias.'),
  componentId: z.string().max(80).optional().describe('Component ID alias.'),
  name: z.string().max(80).optional().describe('Component name or principle name alias.'),
  environment: z.enum(['html', 'astro', 'react', 'vue', 'svelte']).optional().describe('Target environment (defaults to "html").'),
};

export type CreativeDirectorInput = z.infer<z.ZodObject<typeof creativeDirectorInputShape>>;

export interface CreativePrinciple {
  id: string;
  name: string;
  principle: string;
  domain: string;
}

export const CREATIVE_PRINCIPLES: CreativePrinciple[] = [
  { id: 'KP-01', name: 'Kanso (Simplicity)', principle: 'Eliminate decorative clutter; beauty emerges from purposeful function and restraint.', domain: 'kanso' },
  { id: 'KP-02', name: 'Shibui (Subtlety)', principle: 'Favor subtle 1px ring shadows over heavy drop-shadows or jarring border contrasts.', domain: 'elevation' },
  { id: 'KP-03', name: 'Fukinsei (Asymmetry)', principle: 'Balance functional density with dynamic focal asymmetry rather than monotonous grid clones.', domain: 'hierarchy' },
  { id: 'KP-04', name: 'Seijaku (Tranquility)', principle: 'Quiet slate/zinc chrome surfaces let user data and primary metrics command attention.', domain: 'tokens' },
  { id: 'KP-05', name: 'Yugen (Subtle Depth)', principle: 'Communicate elevation through surface token gradation (canvas to card to popover).', domain: 'elevation' },
  { id: 'KP-06', name: 'Datsuzoku (Freedom)', principle: 'Break layout conventions intelligently based on user operational mental models.', domain: 'hierarchy' },
  { id: 'KP-07', name: 'Shizen (Naturalness)', principle: 'Ensure interactive transitions feel natural and bound by deterministic FSM contracts.', domain: 'fsm' },
  { id: 'BC-01', name: 'Optical Spacing Scale', principle: 'Strict adherence to 4px/8px modular rhythm scale (0, 2, 4, 6, 8, 12).', domain: 'whitespace' },
  { id: 'BC-02', name: 'Compact Density First', principle: 'In data-dense dashboards, enforce compact headers (h-12 or h-14, never h-16).', domain: 'density' },
  { id: 'BC-03', name: 'Internal Spacing Ratio', principle: 'Internal group spacing must remain <= 1/3 of inter-section spacing.', domain: 'whitespace' },
  { id: 'BC-04', name: 'Single Primary Action', principle: 'Exactly one primary button per visual decision context; use secondary/ghost for others.', domain: 'hierarchy' },
  { id: 'BC-05', name: 'Left-Aligned Foundation', principle: 'Left-align copy, data tables, and input labels; reserve center-alignment for hero/empty states.', domain: 'hierarchy' },
  { id: 'BC-06', name: 'Tabular Numeral Stability', principle: 'Enforce tabular-nums on all metrics, timers, percentages, and financial values.', domain: 'typography' },
  { id: 'BC-07', name: 'Semantic Contrast Pairs', principle: 'Always pair surface and foreground tokens (e.g. bg-primary with text-primary-foreground).', domain: 'tokens' },
  { id: 'BC-08', name: 'Zero Hardcoded Palettes', principle: 'Never write raw hex or rgb utilities; resolve colors via semantic CSS custom properties.', domain: 'tokens' },
  { id: 'BC-09', name: 'Single Theme Resolver', principle: 'Resolve themes via single html.dark root class and window.basecoat.theme controller.', domain: 'tokens' },
  { id: 'BC-10', name: 'Semantic HTML5 Landmarks', principle: 'Structure pages with standard landmarks: <header>, <nav>, <main>, <aside>, <footer>.', domain: 'semantics' },
  { id: 'BC-11', name: 'Automatic Icon Sizing', principle: 'Use data-icon="inline-start|inline-end" with automatic CSS geometry instead of manual sizing.', domain: 'semantics' },
  { id: 'BC-12', name: 'Deterministic FSM States', principle: 'Interactive primitives must bind data-state and recipe contracts for testability and styling.', domain: 'fsm' },
  { id: 'BC-13', name: 'Encapsulated Form Fields', principle: 'Encapsulate controls in Field (.field) or FieldGroup (.field-group) with linked labels.', domain: 'forms' },
  { id: 'BC-14', name: 'Dual Validation Contract', principle: 'Validation errors must synchronize container data-invalid with control aria-invalid.', domain: 'forms' },
  { id: 'BC-15', name: 'Choice Group Fieldsets', principle: 'Group multiple related radio or checkbox options within a semantic fieldset and legend.', domain: 'forms' },
  { id: 'BC-16', name: 'Accessible Chart Twins', principle: 'SVG and canvas data visualizations must provide companion screen-reader table data.', domain: 'accessibility' },
  { id: 'BC-17', name: 'Realistic Domain Data', principle: 'Use authentic domain identifiers and realistic metrics; forbid Lorem Ipsum filler text.', domain: 'content' },
];

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
        'kpi: text-2xl or text-3xl font-semibold tracking-tight tabular-nums',
        'h1: text-3xl font-semibold tracking-tight (one per page)',
        'h2: text-xl font-semibold tracking-tight (section headings)',
        'h3: text-lg font-medium (card/sub-group titles)',
        'body: text-base text-foreground (60-75ch prose measure)',
        'data/meta: text-sm text-muted-foreground tabular-nums (tables, secondary labels)',
        'caption: text-xs text-muted-foreground (badges, kbd, timestamps)',
      ],
      opticalRules: 'No eyebrow/kicker above headings. More space above a heading than below it. tabular-nums on all numeric data.',
    },
    whitespace: {
      opticalGrid: '4px/8px grid (1 unit = 4px; base rhythm = 8px).',
      densityProfiles: {
        compact: 'p-4 gap-4, header h-12, table py-2 (dense data apps, micro-steps: 1, 1.5, 2.5, 3)',
        standard: 'p-6 gap-4 md:gap-6, header h-14, table py-3 (default admin dashboard)',
        comfortable: 'p-6 md:p-8 gap-6 md:gap-8, header h-14 (content reading & marketing)',
      },
      rhythmScale: [
        '4px (p-1 / gap-1): micro-chrome, badge padding, compact toolbar cells',
        '8px (gap-2 / 0.5rem): label/control pairs, inline icon+text, compact actions',
        '16px (gap-4 / 1rem): neighboring fields, related control rows, card grid gaps',
        '24px (gap-6 / 1.5rem): section heading to content, standard card p-6',
        '48px (gap-12 / 3rem): major page sections',
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
      surfaces: 'Cards (.card) carry an intrinsic 1px ring shadow (ring-1 ring-foreground/10)—never add border/border-border. Use bg-muted/50 for subtle row highlights.',
      surfaceElevation: 'Canvas: bg-background -> Card: bg-card -> Row/Subcard: bg-muted/50 -> Popover/Dialog: bg-popover shadow-md.',
      borderContrast: 'Subtle dividers use border-border/60; text requires WCAG 2.1 AA >= 4.5:1 (APCA Lc >= 60) with paired foreground tokens (--primary-foreground).',
      themingContract: THEMING.includes('window.basecoat.theme') && RHYTHM.includes('Shadcn Aesthetic')
        ? 'Single html.dark class + window.basecoat.theme (localStorage key "themeMode").'
        : 'Class-based html.dark only.',
    },
    contentStrategy: {
      guidelines: [
        'Realistic data IDs: use structured IDs (INV-2026-001, usr_8a9f) over placeholder strings.',
        'Zero Lorem Ipsum: use concise, real-world domain labels and realistic metrics.',
        'Cognitive hierarchy: lead with status/delta badge, followed by primary metric, then timestamp/meta.',
      ],
    },
    density: {
      compact: 'p-4 gap-4, header h-12, table py-2 (dense data apps, micro-steps: 1, 1.5, 2.5, 3)',
      standard: 'p-6 gap-4 md:gap-6, header h-14, table py-3 (default admin dashboard)',
      comfortable: 'p-6 md:p-8 gap-6 md:gap-8, header h-14 (content reading & marketing)',
    },
    stylePack: {
      selected: packKey,
      ...STYLE_PACKS[packKey]!,
      availablePacks: Object.keys(STYLE_PACKS),
    },
  };

  const topicGuidance =
    topic === 'content-strategy'
      ? sections.contentStrategy
      : topic === 'density'
        ? sections.density
        : topic === 'style-packs'
          ? { selected: sections.stylePack, allPacks: STYLE_PACKS }
          : topic !== 'all'
            ? sections[topic]
            : undefined;

  const payload =
    topic === 'all'
      ? {
          stage: '2b-creative-director',
          philosophy: 'Kanso minimalism + Shadcn New York v4 precision',
          principlesCount: CREATIVE_PRINCIPLES.length,
          ...sections,
          semanticTokens,
          nextStep: 'Fetch exact state-bound component HTML via basecoat_component_syntax.',
        }
      : {
          stage: '2b-creative-director',
          topic,
          principlesCount: CREATIVE_PRINCIPLES.length,
          guidance: topicGuidance,
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
    principlesCount: CREATIVE_PRINCIPLES.length,
    typography: sections.typography.ladder.slice(0, 4),
    whitespace: sections.whitespace.rhythmScale.slice(0, 4),
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
