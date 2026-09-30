// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Content-addressable compilation of semantic rhythm profiles and FSM recipes into an immutable registry snapshot.
import { createHash } from 'node:crypto';
import {
  SEMANTICS_LIMITS,
  authoringSemanticsInputSchema,
  compiledSemanticsRegistrySchema,
  authoringRhythmProfileSchema,
  authoringFsmRecipeSchema,
  compiledRhythmProfileSchema,
  compiledFsmRecipeSchema,
} from './schema.js';
import type {
  Id,
  Ref,
  AuthoringSemanticsInput,
  CompiledSemanticsRegistry,
  AuthoringRhythmProfile,
  CompiledRhythmProfile,
  AuthoringFsmRecipe,
  CompiledFsmRecipe,
  SemanticsDiagnostic,
} from './types.js';

/** Deterministic JSON: sorted object keys, arrays preserve order, no undefined. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new SemanticsError('INVALID_VALUE', 'Non-finite number in canonical JSON');
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    const entry = obj[key];
    if (entry === undefined) continue;
    out[key] = sortValue(entry);
  }
  return out;
}

/** Full SHA-256 hex of canonical compiled content. */
export function contentRef(value: unknown): Ref {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

export class SemanticsError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'SemanticsError';
  }
}

function diagnostic(
  code: string,
  message: string,
  extra: Partial<SemanticsDiagnostic> = {},
): SemanticsDiagnostic {
  return { code, severity: 'error', message, ...extra };
}

function warning(
  code: string,
  message: string,
  extra: Partial<SemanticsDiagnostic> = {},
): SemanticsDiagnostic {
  return { code, severity: 'warning', message, ...extra };
}

/** Generate rhythm text content for basecoat://design/rhythm resource. */
function generateRhythmText(profile: CompiledRhythmProfile): string {
  // Start with the core composition guide (preserved from existing RHYTHM)
  let text = `# Basecoat composition guide

Follow this sequence without skipping the content decision:
Content Hierarchy -> Layout -> Component Selection -> Spacing -> Typography -> Final Composition.

1. Content hierarchy: identify the page purpose, primary task, essential evidence,
supporting information, and secondary actions. Remove decorative content that
does not help a decision. Give each section a descriptive heading and each control
a visible label. There should be one dominant action in a decision group.
2. Layout: choose the reading order before selecting widgets. Prefer one aligned
content column; introduce columns only for independent, comparable information.
Keep body copy and form labels aligned to the reading edge. Centered containers
are fine; centering every heading, paragraph, field, and action is forbidden.
Preserve logical DOM order when adapting a multi-column view for small screens.
3. Component selection: choose by intent. Use a table for comparable records,
tabs for peer views of one subject, and a dialog for a short interrupting task.
Use ordinary sections and whitespace for grouping. A card needs an independent
object or meaningful boundary; do not wrap every section in one.
4. Spacing: use the rhythm below consistently, then tune density globally.
5. Typography: create contrast with size, weight, line length, and muted supporting
text. Avoid increasing every heading or making every sentence bold.
6. Final composition: verify the primary action, reading order, alignment,
keyboard path, labels, narrow-screen behavior, and empty/error states.

## Rhythm and density

`;

  // Add dynamic content from rhythm profile families
  const spacingFamily = profile.families.find(f => f.id === 'spacing' || f.id === 'gaps');
  if (spacingFamily) {
    text += 'Use the semantic spacing tokens from this profile:\n';
    for (const mapping of spacingFamily.mappings) {
      text += `- ${mapping.value}: ${mapping.description}\n`;
    }
    text += '\n';
  } else {
    // Fallback to existing default text if no spacing family
    text += `Use the Tailwind spacing scale deliberately: gap-2 (0.5rem), gap-4 (1rem),
gap-6 (1.5rem), and gap-12 (3rem) with the default Tailwind spacing token.
If the host changes that token, preserve these relative relationships.
- gap-2: label/control relationships, inline icon/text groups, compact actions.
- gap-4: neighboring fields, rows of related controls, local content groups.
- gap-6: section heading to content or separation of meaningful local groups.
- gap-12: major page sections with distinct purposes.

`;
  }

  text += `Use the corresponding space-x/space-y, margin, and padding values when gap is
unsuitable. Keep touching content closer than unrelated content. Do not sprinkle
arbitrary pixel gaps or ad hoc spacing overrides into a page.
Zero spacing and auto alignment are valid structural choices. Borders and focus
rings are not spacing. Responsive changes should move between approved tokens.
Do not override every Basecoat component's intrinsic padding; apply this rhythm
to composition around components. This is the MCP design policy, not a claim
that upstream Basecoat examples all use this restricted spacing scale.

Comfortable default: apply semantic spacing consistently within context.
Dense data screens may use tighter tokens between rows while retaining labels
and clear targets. Choose density once per context. Never compress interactive
targets merely to fit more decoration. Use an agreed container width and
consistent page gutters; read basecoat://project/context for DESIGN.md before
introducing new tokens.

## Typography and visual hierarchy

`;

  // Add typography family if available
  const typographyFamily = profile.families.find(f => f.id === 'typography');
  if (typographyFamily) {
    text += 'Use semantic typography tokens from this profile:\n';
    for (const mapping of typographyFamily.mappings) {
      text += `- ${mapping.value}: ${mapping.description}\n`;
    }
    text += '\n';
  } else {
    text += `Use one page h1, then meaningful h2/h3 levels. Keep headings concise and body
text readable. Use a restrained progression such as text-3xl for the page,
text-xl for sections, text-base for body, and text-sm for supporting metadata.
`;
  }

  text += `Avoid muted text for essential instructions and preserve adequate contrast.
Keep long prose near 60-75 characters per line. Tables and code may be wider.
Prefer theme tokens over hard-coded colors. Let content and typography provide
hierarchy before adding borders, shadows, backgrounds, or more wrappers.

## Hard prohibitions

- No cards inside cards, including legacy .ui-card wrappers. Basecoat's modern
  class is .card; use semantic sections, separators, or rows inside it.
- No everything-centered pages. Reserve centered text for a short, intentional
  hero or empty state and keep reading-heavy content aligned to the start.
- No random spacing or arbitrary gaps; use the semantic tokens above.
- No every-button-is-primary groups. Use one default .btn for the principal
  action, data-variant="outline" or "secondary" for alternatives, and "ghost"
  for tertiary actions. Use "destructive" only for a destructive operation.
- No random gradients, decorative metric cards, excessive rounded containers,
  repeated shadows, or nested bordered panels without an information purpose.

Prefer a page header, a useful action row, and direct content over a dashboard
of empty wrappers. Treat validation findings as review guidance: static source
cannot establish visual contrast, computed spacing, or actual keyboard behavior.

## Component families

- Navigable entity lists: use .item rows inside .item-group. Do not render one .card per row.
- Zero results: use the .empty component with one next action. Do not invent a centered paragraph or a nested card.
- Labeled controls: each sits in .field with a visible .label. Use .input-group only for addons, not instead of .field.
- Badges: keep visually smaller than adjacent buttons. Do not mix a large badge with a small button in the same row.
- Filters and primary action: one toolbar above the table or list, with gap-4 under the toolbar, not inside each row.

## Measure

- On an operate (work) surface, the first viewport shows at most three regions, five actions, and about twenty-five text fragments. Persuade and read surfaces may use more whitespace, but not more competing actions.
- Space inside a label, control, and action group is at most one third of the space between sections, so related controls stay attached.
- Size a control to the value it holds (a year, a price, a short name). Do not stretch every input to the full row.
- No eyebrow or kicker above a heading. One short heading and one supporting line.

## Surface

- A hero image is optional and only one; do not place a card row under the hero in the same viewport.
- A feed row is a title, one supporting line, and small meta inside .item. Do not put a gallery in the row.
- Use one icon source and one stroke weight. Do not use emoji as icons.
- On each control, check hover, focus-visible, disabled, and loading. A disabled control must not remain actionable.
- Accent color is for hover and quiet highlights. The primary action carries the main fill.
- Build surfaces from the theme background and card tokens. Do not invent one-off background utilities.
- Text on a tinted fill uses that fill's foreground, not a generic muted gray.

## Visitor job

Let the visitor's goal set density before you pick components.

- Operate: dense and scannable; a table, list, or filters belong in the first viewport.
- Persuade: generous whitespace; avoid defaulting to a hero plus three equal cards.
- Read: a single column; more space above each heading than between that heading and its text.
- Experience: let imagery lead; keep labels, nav, and chrome in the background.

## Structural clarity

A divider earns its place when adjacent groups remain ambiguous after spacing;
otherwise leave the boundary unmarked. Check rendered text and icon edges for
optical alignment; equal CSS bounds need not look aligned. Give a heading more
separation from the preceding group than from the content it introduces.
Name the layout skeleton explicitly: one column, toolbar plus table, or sidebar
plus content. On a working screen, put the task controls and relevant records
at the start; a promotional hero must not push the work down.
`;

  return text;
}

function compileRhythmProfile(
  authoring: AuthoringRhythmProfile,
): { ref: Ref; profile: CompiledRhythmProfile; diagnostics: SemanticsDiagnostic[] } {
  const diagnostics: SemanticsDiagnostic[] = [];
  
  // Validate authoring schema
  const parsedAuthoring = authoringRhythmProfileSchema.safeParse(authoring);
  if (!parsedAuthoring.success) {
    const schemaErrors = parsedAuthoring.error.issues.map(i => 
      `${i.path.join('.')}: ${i.message}`
    ).join('; ');
    diagnostics.push(diagnostic('SCHEMA_INVALID', schemaErrors, { id: authoring.id }));
    
    // Return minimal valid structure for error case
    const errorProfile: CompiledRhythmProfile = {
      schemaVersion: 1,
      id: authoring.id,
      description: authoring.description || 'Invalid profile',
      families: [],
      rhythmText: '',
    };
    return { ref: contentRef(errorProfile), profile: errorProfile, diagnostics };
  }

  const validated = parsedAuthoring.data;
  
  // Check for required family types
  const requiredFamilies = ['spacing', 'typography'];
  for (const requiredFamily of requiredFamilies) {
    if (!validated.families.some(f => f.id === requiredFamily)) {
      diagnostics.push(warning('MISSING_FAMILY', 
        `Profile ${validated.id} missing recommended family: ${requiredFamily}`, 
        { id: validated.id }
      ));
    }
  }

  // Validate Tailwind values format
  for (const family of validated.families) {
    for (const mapping of family.mappings) {
      // Check if value looks like a Tailwind @theme path or utility class
      if (!mapping.value.includes('.') && !mapping.value.includes('-') && !mapping.value.includes('[')) {
        diagnostics.push(warning('INVALID_TAILWIND_VALUE',
          `Mapping ${mapping.id} value "${mapping.value}" should be a Tailwind @theme path or utility class`,
          { id: validated.id }
        ));
      }
    }
  }

  const compiled: CompiledRhythmProfile = {
    schemaVersion: 1,
    id: validated.id,
    description: validated.description,
    families: validated.families,
    rhythmText: '', // Will be set below
  };

  // Generate rhythm text
  compiled.rhythmText = generateRhythmText(compiled);
  
  // Validate compiled schema
  const parsedCompiled = compiledRhythmProfileSchema.safeParse(compiled);
  if (!parsedCompiled.success) {
    diagnostics.push(diagnostic('COMPILATION_FAILED', 
      `Failed to compile rhythm profile: ${parsedCompiled.error.issues.map(i => i.message).join('; ')}`,
      { id: validated.id }
    ));
  }

  const ref = contentRef(compiled);
  return { ref, profile: compiled, diagnostics };
}

function compileFsmRecipe(
  authoring: AuthoringFsmRecipe,
): { ref: Ref; recipe: CompiledFsmRecipe; diagnostics: SemanticsDiagnostic[] } {
  const diagnostics: SemanticsDiagnostic[] = [];

  // Validate authoring schema
  const parsedAuthoring = authoringFsmRecipeSchema.safeParse(authoring);
  if (!parsedAuthoring.success) {
    const schemaErrors = parsedAuthoring.error.issues.map(i => 
      `${i.path.join('.')}: ${i.message}`
    ).join('; ');
    diagnostics.push(diagnostic('SCHEMA_INVALID', schemaErrors, { id: authoring.id }));
    
    // Return minimal valid structure for error case
    const errorRecipe: CompiledFsmRecipe = {
      schemaVersion: 1,
      id: authoring.id,
      description: authoring.description || 'Invalid recipe',
      states: [],
      events: [],
      guards: [],
      actions: [],
      transitions: [],
      initialStates: [],
      terminalStates: [],
    };
    return { ref: contentRef(errorRecipe), recipe: errorRecipe, diagnostics };
  }

  const validated = parsedAuthoring.data;

  // Derive initial and terminal states
  const initialStates = validated.states.filter(s => s.initial).map(s => s.id);
  const terminalStates = validated.states.filter(s => s.terminal).map(s => s.id);

  // Check for unreachable states
  const stateIds = new Set(validated.states.map(s => s.id));
  const reachableStates = new Set(initialStates);
  
  // Simple reachability: follow transitions from initial states
  let changed = true;
  while (changed) {
    changed = false;
    for (const transition of validated.transitions) {
      if (reachableStates.has(transition.from) && !reachableStates.has(transition.to)) {
        reachableStates.add(transition.to);
        changed = true;
      }
    }
  }
  
  for (const stateId of stateIds) {
    if (!reachableStates.has(stateId)) {
      diagnostics.push(warning('UNREACHABLE_STATE', 
        `State ${stateId} is not reachable from any initial state`,
        { id: validated.id }
      ));
    }
  }

  // Check for nondeterministic transitions (same from+event combination)
  const transitionKeys = new Map<string, string[]>();
  for (const transition of validated.transitions) {
    const key = `${transition.from}:${transition.event}`;
    if (!transitionKeys.has(key)) {
      transitionKeys.set(key, []);
    }
    transitionKeys.get(key)!.push(transition.id);
  }
  
  for (const [key, transitionIds] of transitionKeys) {
    if (transitionIds.length > 1) {
      diagnostics.push(diagnostic('NONDETERMINISTIC_TRANSITION',
        `Multiple transitions for ${key}: ${transitionIds.join(', ')}`,
        { id: validated.id }
      ));
    }
  }

  const compiled: CompiledFsmRecipe = {
    schemaVersion: 1,
    id: validated.id,
    description: validated.description,
    states: validated.states,
    events: validated.events,
    guards: validated.guards,
    actions: validated.actions,
    transitions: validated.transitions,
    initialStates,
    terminalStates,
  };

  // Validate compiled schema
  const parsedCompiled = compiledFsmRecipeSchema.safeParse(compiled);
  if (!parsedCompiled.success) {
    diagnostics.push(diagnostic('COMPILATION_FAILED',
      `Failed to compile FSM recipe: ${parsedCompiled.error.issues.map(i => i.message).join('; ')}`,
      { id: validated.id }
    ));
  }

  const ref = contentRef(compiled);
  return { ref, recipe: compiled, diagnostics };
}

export interface CompileSemanticsResult {
  registry: CompiledSemanticsRegistry;
  diagnostics: SemanticsDiagnostic[];
}

export function compileSemantics(input: AuthoringSemanticsInput): CompileSemanticsResult {
  const diagnostics: SemanticsDiagnostic[] = [];
  
  // Validate input schema
  const parsedInput = authoringSemanticsInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      registry: {
        schemaVersion: 1,
        revision: contentRef({ empty: true }),
        rhythmProfiles: {},
        fsmRecipes: {},
        aliases: {},
      },
      diagnostics: [
        diagnostic(
          'SCHEMA_INVALID',
          parsedInput.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '),
        ),
      ],
    };
  }

  const authoring = parsedInput.data;

  // Check for duplicate IDs across all items
  const idCounts = new Map<Id, number>();
  for (const item of [...authoring.rhythmProfiles, ...authoring.fsmRecipes]) {
    idCounts.set(item.id, (idCounts.get(item.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      diagnostics.push(diagnostic('DUPLICATE_ID', `Duplicate ID: ${id}`, { id }));
    }
  }

  const aliases: Record<Id, Ref> = {};
  const rhythmProfiles: Record<Ref, CompiledRhythmProfile> = {};
  const fsmRecipes: Record<Ref, CompiledFsmRecipe> = {};

  // Compile rhythm profiles
  for (const authoringProfile of authoring.rhythmProfiles) {
    const { ref, profile, diagnostics: profileDiagnostics } = compileRhythmProfile(authoringProfile);
    diagnostics.push(...profileDiagnostics);
    
    if (!profileDiagnostics.some(d => d.severity === 'error')) {
      rhythmProfiles[ref] = profile;
      aliases[profile.id] = ref;
    }
  }

  // Compile FSM recipes
  for (const authoringRecipe of authoring.fsmRecipes) {
    const { ref, recipe, diagnostics: recipeDiagnostics } = compileFsmRecipe(authoringRecipe);
    diagnostics.push(...recipeDiagnostics);
    
    if (!recipeDiagnostics.some(d => d.severity === 'error')) {
      fsmRecipes[ref] = recipe;
      aliases[recipe.id] = ref;
    }
  }

  // Calculate registry revision
  const revision = contentRef({
    rhythmProfiles: Object.keys(rhythmProfiles).sort(),
    fsmRecipes: Object.keys(fsmRecipes).sort(),
    aliases: Object.keys(aliases)
      .sort()
      .map(id => [id, aliases[id]]),
  });

  const registry: CompiledSemanticsRegistry = {
    schemaVersion: 1,
    revision,
    rhythmProfiles,
    fsmRecipes,
    aliases,
  };

  // Validate final registry
  const parsedRegistry = compiledSemanticsRegistrySchema.safeParse(registry);
  if (!parsedRegistry.success) {
    diagnostics.push(
      diagnostic('REGISTRY_INVALID', parsedRegistry.error.issues.map(i => i.message).join('; '))
    );
  }

  return { registry, diagnostics };
}