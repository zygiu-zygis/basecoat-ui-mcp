// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Semantic design system types: rhythm profiles and FSM recipes.

/** Safe domain identifier (filename-safe). Format enforced by Zod, not by this alias. */
export type Id = string;

/** Full SHA-256 hex of canonical compiled content. Format enforced by Zod, not by this alias. */
export type Ref = string;

/** Bounded scalar value: string, number, boolean, or null. */
export type Scalar = string | number | boolean | null;

// --- Semantic Rhythm System ---

/** Tailwind v4 @theme declaration or utility class mapping. */
export interface SemanticMapping {
  /** Semantic token ID (e.g., 'spacing-tight', 'color-primary'). */
  id: Id;
  /** Tailwind v4 @theme path or utility class (e.g., 'spacing.2', 'gap-2'). */
  value: string;
  /** Human-readable description for the semantic token. */
  description: string;
}

/** Semantic rhythm family for consistent design tokens. */
export interface RhythmFamily {
  /** Family ID (density, gaps, typography, surfaces, borders). */
  id: Id;
  /** Human-readable description. */
  description: string;
  /** Semantic token mappings in this family. */
  mappings: SemanticMapping[];
}

/** Authored rhythm profile input. */
export interface AuthoringRhythmProfile {
  schemaVersion: 1;
  /** Profile ID (e.g., 'default', 'dense', 'comfortable'). */
  id: Id;
  /** Human-readable description. */
  description: string;
  /** Rhythm families in this profile. */
  families: RhythmFamily[];
}

/** Compiled rhythm profile with content-addressed revision. */
export interface CompiledRhythmProfile {
  schemaVersion: 1;
  id: Id;
  description: string;
  families: RhythmFamily[];
  /** Generated markdown text for basecoat://design/rhythm. */
  rhythmText: string;
}

// --- FSM Recipe System ---

/** FSM state definition. */
export interface FsmState {
  /** State ID. */
  id: Id;
  /** Human-readable description. */
  description: string;
  /** Whether this is an initial state. */
  initial?: boolean;
  /** Whether this is a terminal state. */
  terminal?: boolean;
}

/** FSM event definition. */
export interface FsmEvent {
  /** Event ID. */
  id: Id;
  /** Human-readable description. */
  description: string;
}

/** FSM guard condition. */
export interface FsmGuard {
  /** Guard ID. */
  id: Id;
  /** Human-readable description. */
  description: string;
}

/** FSM action metadata (no executable code). */
export interface FsmAction {
  /** Action ID. */
  id: Id;
  /** Human-readable description. */
  description: string;
  /** Metadata-only properties. */
  metadata?: Record<string, Scalar>;
}

/** FSM state transition. */
export interface FsmTransition {
  /** Transition ID. */
  id: Id;
  /** Source state ID. */
  from: Id;
  /** Target state ID. */
  to: Id;
  /** Triggering event ID. */
  event: Id;
  /** Optional guard condition ID. */
  guard?: Id;
  /** Optional action ID executed on transition. */
  action?: Id;
}

/** Authored FSM recipe input. */
export interface AuthoringFsmRecipe {
  schemaVersion: 1;
  /** Recipe ID (e.g., 'dialog', 'collapsible-navigation'). */
  id: Id;
  /** Human-readable description. */
  description: string;
  /** FSM states. */
  states: FsmState[];
  /** FSM events. */
  events: FsmEvent[];
  /** FSM guards. */
  guards: FsmGuard[];
  /** FSM actions (metadata only). */
  actions: FsmAction[];
  /** FSM transitions. */
  transitions: FsmTransition[];
}

/** Compiled FSM recipe with validation. */
export interface CompiledFsmRecipe {
  schemaVersion: 1;
  id: Id;
  description: string;
  states: FsmState[];
  events: FsmEvent[];
  guards: FsmGuard[];
  actions: FsmAction[];
  transitions: FsmTransition[];
  /** Derived initial states. */
  initialStates: Id[];
  /** Derived terminal states. */
  terminalStates: Id[];
}

// --- Registry System ---

/** Authored semantics registry input. */
export interface AuthoringSemanticsInput {
  schemaVersion: 1;
  /** Rhythm profiles. */
  rhythmProfiles: AuthoringRhythmProfile[];
  /** FSM recipes. */
  fsmRecipes: AuthoringFsmRecipe[];
}

/** Compiled semantics registry. */
export interface CompiledSemanticsRegistry {
  schemaVersion: 1;
  /** Content-addressed revision hash. */
  revision: Ref;
  /** Compiled rhythm profiles by content ref. */
  rhythmProfiles: Record<Ref, CompiledRhythmProfile>;
  /** Compiled FSM recipes by content ref. */
  fsmRecipes: Record<Ref, CompiledFsmRecipe>;
  /** Human-readable alias -> immutable content ref. */
  aliases: Record<Id, Ref>;
}

// --- Diagnostic System ---

export interface SemanticsDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  id?: Id;
  ref?: Ref;
  message: string;
}

// --- Project Override System ---

/** Project-specific rhythm override (read-only). */
export interface ProjectRhythmOverride {
  schemaVersion: 1;
  /** Base profile ID to extend. */
  baseProfile: Id;
  /** Override mappings (replaces base mappings with same ID). */
  overrideMappings: SemanticMapping[];
}