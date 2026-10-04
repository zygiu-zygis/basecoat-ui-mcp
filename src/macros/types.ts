// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Macro-layout composition domain types. Compact transport encoding belongs at the packet boundary.

/** Safe domain identifier (filename-safe). Format enforced by Zod, not by this alias. */
export type Id = string;

/** Full SHA-256 hex of canonical compiled content. Format enforced by Zod, not by this alias. */
export type Ref = string;

export type Scalar = string | number | boolean | null;

export interface Anchor {
  fragment: Id;
  name: Id;
}

export interface Fragment {
  id: Id;
  emmet: string;
}

export interface FragmentMount {
  parent: Id;
  anchor: Id;
  child: Id;
  order: number;
}

export interface Slot {
  id: Id;
  at: Anchor;
  /** Approved block roles that may occupy this slot. */
  accepts: string[];
  min: number;
  max: number;
  boundary?: Id;
}

export interface Port {
  id: Id;
  at: Anchor;
  direction: 'in' | 'out';
  kind: 'control' | 'region' | 'data';
  contract: Id;
  minLinks: number;
  maxLinks: number;
  scope: 'shell' | 'page';
}

export interface Provenance {
  origin: 'authored' | 'adapted';
  /** Identifies the local authoring source, never a runtime dependency. */
  sourceKind?: 'authored' | 'local-shadcn-registry-item';
  upstreamItem?: string;
  repository?: string;
  revision?: string;
  license?: string;
  sourceHashes: Record<string, string>;
  mappingVersion: string;
}

export interface MacroBlock {
  schemaVersion: 1;
  id: Id;
  role: string;
  family: Id;
  description: string;
  tags: string[];
  root: Id;
  fragments: Fragment[];
  mounts: FragmentMount[];
  slots: Slot[];
  ports: Port[];
  componentRefs: string[];
  ruleRefs: Ref[];
  /** Content refs of required macro blocks (pinned deps; included in content hash). */
  dependencyRefs: Ref[];
  layout: {
    frameRef: Id;
    gutterBoundary?: Id;
    scrollBoundary?: Id;
  };
  landmarks: {
    main: number;
    primaryHeading: number;
  };
  provenance: Provenance;
}

export interface NodeInstance {
  id: Id;
  block: Ref;
  parent?: {
    node: Id;
    slot: Id;
    order: number;
  };
  bindings: Record<string, Id>;
}

export interface Endpoint {
  node: Id;
  port: Id;
}

export interface Connection {
  id: Id;
  relation: 'controls' | 'data';
  from: Endpoint;
  to: Endpoint;
}

export type BoundRule =
  | {
      id: Id;
      type: 'same-shell';
      nodes: Id[];
    }
  | {
      id: Id;
      type: 'same-frame';
      nodes: Id[];
    }
  | {
      id: Id;
      type: 'ordered';
      parent: Id;
      slot: Id;
      nodes: Id[];
    }
  | {
      id: Id;
      type: 'single-owner';
      boundary: Id;
      property: 'gutter' | 'scroll';
      nodes: Id[];
    }
  | {
      id: Id;
      type: 'shared-data';
      binding: Id;
      nodes: Id[];
    };

export interface PagePlan {
  id: Id;
  route: string;
  recipe: Ref;
  root: Id;
  nodes: Record<Id, NodeInstance>;
  connections: Connection[];
  rules: BoundRule[];
  decisions: Record<string, Scalar>;
  status: 'draft' | 'plan-ready';
}

export interface RouteLink {
  fromPage: Id;
  fromAnchor: Anchor;
  toPage: Id;
}

export interface Recipe {
  schemaVersion: 1;
  id: Id;
  kind: 'page' | 'flow';
  profile: Ref;
  pages: PagePlan[];
  entryPage: Id;
  routeLinks: RouteLink[];
}

export interface WriteCheckpoint {
  page: Id;
  node: Id;
  sourcePath: string;
  planDigest: string;
  reportedAtRevision: number;
}

export interface OperationReceipt {
  requestHash: string;
  committedRevision: number;
  response: Record<string, unknown>;
}

export interface DesignSession {
  schemaVersion: 1;
  id: Id;
  projectKey: string;
  revision: number;
  registryRevision: Ref;
  profile: Ref;
  projectDecisions: Record<string, Scalar>;
  pages: Record<Id, PagePlan>;
  routeLinks: RouteLink[];
  checkpoints: WriteCheckpoint[];
  receipts: Record<Id, OperationReceipt>;
}

/** Independently retrievable sections of a compiled block. */
export type BlockSection =
  | 'manifest'
  | 'structure'
  | 'slots'
  | 'ports'
  | 'rules'
  | 'dependencies'
  | 'provenance';

export interface BlockManifest {
  ref: Ref;
  id: Id;
  role: string;
  family: Id;
  description: string;
  root: Id;
  tags: string[];
  sectionCounts: Record<BlockSection, number>;
}

export type DecisionValueType = 'string' | 'number' | 'boolean' | 'null' | 'enum';

export interface DecisionSpec {
  type: DecisionValueType;
  values?: Scalar[];
  allowPageOverride: boolean;
  defaultValue?: Scalar;
}

export interface DesignProfile {
  schemaVersion: 1;
  id: Id;
  description: string;
  allowedDecisions: Record<string, DecisionSpec>;
  sharedDecisionKeys: string[];
}

/** Reusable composition contracts stored in the compiled registry (pre-binding). */
export type RuleTemplate = BoundRule;

export interface CompiledMacroRegistry {
  schemaVersion: 1;
  revision: Ref;
  blocks: Record<Ref, MacroBlock>;
  recipes: Record<Ref, Recipe>;
  profiles: Record<Ref, DesignProfile>;
  rules: Record<Ref, RuleTemplate>;
  /** Human-readable alias -> immutable content ref (block, recipe, profile, or rule). */
  aliases: Record<Id, Ref>;
}

// --- Authoring layer (human-readable IDs; resolved to Ref at compile / instantiate) ---

export interface AuthoringNodeInstance {
  id: Id;
  block: Id;
  parent?: {
    node: Id;
    slot: Id;
    order: number;
  };
  bindings: Record<string, Id>;
}

export interface AuthoringPagePlan {
  id: Id;
  route: string;
  recipe: Id;
  root: Id;
  nodes: Record<Id, AuthoringNodeInstance>;
  connections: Connection[];
  rules: BoundRule[];
  decisions: Record<string, Scalar>;
  status: 'draft' | 'plan-ready';
}

export interface AuthoringMacroBlock {
  schemaVersion: 1;
  id: Id;
  role: string;
  family: Id;
  description: string;
  tags: string[];
  root: Id;
  fragments: Fragment[];
  mounts: FragmentMount[];
  slots: Slot[];
  ports: Port[];
  componentRefs: string[];
  /** Human-readable rule template ids until compilation. */
  ruleRefs: Id[];
  /** Explicit dependency block ids (not containment or connections). */
  dependencyBlockIds: Id[];
  layout: MacroBlock['layout'];
  landmarks: MacroBlock['landmarks'];
  provenance: Provenance;
}

export interface AuthoringRecipe {
  schemaVersion: 1;
  id: Id;
  kind: 'page' | 'flow';
  profile: Id;
  pages: AuthoringPagePlan[];
  entryPage: Id;
  routeLinks: RouteLink[];
}

export interface AuthoringRegistryInput {
  schemaVersion: 1;
  blocks: AuthoringMacroBlock[];
  recipes: AuthoringRecipe[];
  profiles: DesignProfile[];
  rules: RuleTemplate[];
}

export type DependencyLockResolution =
  | { kind: 'component'; id: string }
  | { kind: 'macro-block'; id: Id }
  | { kind: 'unsupported'; reason: string };

export interface DependencyLockEntry {
  upstream: string;
  resolution: DependencyLockResolution;
}

export interface CuratedBlockMapping {
  schemaVersion: 1;
  /** Explicit boundary: a local shadcn item is adapted into this project's macro layer. */
  adaptationBoundary: {
    source: 'shadcn-registry-item';
    target: 'basecoat-macro';
    layout: 'curated';
  };
  upstreamName: string;
  role: string;
  family: Id;
  description: string;
  tags: string[];
  root: Id;
  fragments: Fragment[];
  mounts: FragmentMount[];
  slots: Slot[];
  ports: Port[];
  componentRefs: string[];
  ruleRefs: Id[];
  dependencyBlockIds: Id[];
  layout: MacroBlock['layout'];
  landmarks: MacroBlock['landmarks'];
  adapted: string[];
  omitted: string[];
  requiresAppIntegration: string[];
  mappingVersion: string;
}

export interface ImportDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  path?: string;
  feature?: string;
  message: string;
}

export interface RegistryDiagnostic {
  code: string;
  severity: 'error' | 'warning';
  ref?: Ref;
  id?: Id;
  message: string;
}

// --- Design store / patch / validation / context ---

export type DesignPatchOp =
  | {
      op: 'instantiate_recipe';
      recipe: Ref;
      pagePrefix: Id;
    }
  | {
      op: 'attach_block';
      page: Id;
      parent: Id;
      slot: Id;
      node: Id;
      block: Ref;
      order?: number;
      bindings?: Record<string, Id>;
    }
  | {
      op: 'replace_block';
      page: Id;
      node: Id;
      block: Ref;
    }
  | {
      op: 'remove_block';
      page: Id;
      node: Id;
      removeSubtree: boolean;
    }
  | {
      op: 'connect_ports';
      page: Id;
      id: Id;
      relation: 'controls' | 'data';
      from: Endpoint;
      to: Endpoint;
    }
  | {
      op: 'disconnect_ports';
      page: Id;
      connection: Id;
    }
  | {
      op: 'set_decision';
      scope: 'project' | 'page';
      page?: Id;
      key: string;
      value: Scalar;
    }
  | {
      op: 'record_written';
      page: Id;
      node: Id;
      sourcePath: string;
      planDigest: string;
    }
  | {
      op: 'mark_plan_ready';
      page: Id;
    };

export interface SessionSummary {
  id: Id;
  revision: number;
  profile: Ref;
  pageCount: number;
  status: 'draft' | 'plan-ready' | 'mixed';
}

export interface BeginDesignInput {
  designId: Id;
  profile: Ref;
  operationId: Id;
  /** Compiled registry pinned into `.basecoat/designer/registries/` on create. */
  registry: CompiledMacroRegistry;
  decisions?: Record<string, Scalar>;
}

export interface ApplyDesignPatchInput {
  designId: Id;
  expectedRevision: number;
  operationId: Id;
  operations: DesignPatchOp[];
}

export interface MutationReceipt {
  designId: Id;
  revision: number;
  operationId: Id;
  response: Record<string, unknown>;
}

export interface DesignStore {
  listSessions(): Promise<SessionSummary[]>;
  read(designId: Id, revision?: number): Promise<DesignSession>;
  create(input: BeginDesignInput): Promise<MutationReceipt>;
  apply(input: ApplyDesignPatchInput): Promise<MutationReceipt>;
  getProjectRoot(): string;
  getProjectKey(): string;
}

export type RepairKind =
  | 'attach_block'
  | 'connect_ports'
  | 'set_decision'
  | 'replace_block'
  | 'other';

export interface RepairSuggestion {
  kind: RepairKind;
  message: string;
  candidateRefs?: Ref[];
  slot?: Id;
  port?: Id;
}

export interface Diagnostic {
  code: string;
  severity: 'error' | 'obligation' | 'warning';
  page?: Id;
  node?: Id;
  slot?: Id;
  rule?: Id;
  message: string;
  repairs: RepairSuggestion[];
}

export interface ValidationReport {
  mode: 'draft' | 'complete';
  ok: boolean;
  errorCount: number;
  obligationCount: number;
  warningCount: number;
  diagnostics: Diagnostic[];
}

export type ContextView =
  | 'sessions'
  | 'overview'
  | 'decisions'
  | 'graph'
  | 'rules'
  | 'focus'
  | 'next';

export interface ContextRequest {
  view: ContextView;
  designId?: Id;
  pageId?: Id;
  nodeId?: Id;
  revision?: number;
  cursor?: string;
}

/** Bounded context packet records; concrete shapes depend on the view. */
export type ContextRecord = Record<string, unknown>;

export interface NextStep {
  priority: number;
  code: string;
  message: string;
  page?: Id;
  node?: Id;
  suggestedOps?: DesignPatchOp[];
}

/** Distinct graph edge kinds kept separate from each other. */
export type RelationKind = 'dependency' | 'containment' | 'connection';

export interface DependencyEdge {
  kind: 'dependency';
  fromBlock: Ref | Id;
  toBlock: Ref | Id;
}

export interface ContainmentEdge {
  kind: 'containment';
  parentNode: Id;
  childNode: Id;
  slot: Id;
  order: number;
}

export interface ConnectionEdge {
  kind: 'connection';
  connection: Connection;
}

export type GraphEdge = DependencyEdge | ContainmentEdge | ConnectionEdge;
