// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Distinguishes dependency, containment, and connection relationships.
// DOM ids are stable across session revisions.
import { SAFE_ID_REGEX } from './schema.js';
import type {
  Connection,
  ConnectionEdge,
  ContainmentEdge,
  DependencyEdge,
  GraphEdge,
  Id,
  MacroBlock,
  NodeInstance,
  PagePlan,
  Ref,
  RelationKind,
} from './types.js';

const DOM_ID_PREFIX = 'bc';
const DOM_ID_SEP = '__';

function assertSafePart(label: string, value: string): void {
  if (typeof value !== 'string' || !SAFE_ID_REGEX.test(value)) {
    throw new Error(`Invalid ${label} for DOM id: must be a safe Id`);
  }
}

/**
 * Stable instance-specific DOM identifier.
 * Inputs: designId, pageId, instanceId, anchorName.
 * Session revision is intentionally excluded so ids remain stable across edits.
 */
export function generateDomId(
  designId: Id,
  pageId: Id,
  instanceId: Id,
  anchorName: Id,
): string {
  assertSafePart('designId', designId);
  assertSafePart('pageId', pageId);
  assertSafePart('instanceId', instanceId);
  assertSafePart('anchorName', anchorName);
  return [DOM_ID_PREFIX, designId, pageId, instanceId, anchorName].join(DOM_ID_SEP);
}

export interface ParsedDomId {
  designId: Id;
  pageId: Id;
  instanceId: Id;
  anchorName: Id;
}

export function parseDomId(domId: string): ParsedDomId {
  if (typeof domId !== 'string' || !domId.startsWith(`${DOM_ID_PREFIX}${DOM_ID_SEP}`)) {
    throw new Error('Invalid DOM id format');
  }
  const parts = domId.split(DOM_ID_SEP);
  if (parts.length !== 5 || parts[0] !== DOM_ID_PREFIX) {
    throw new Error('Invalid DOM id format');
  }
  const [, designId, pageId, instanceId, anchorName] = parts;
  assertSafePart('designId', designId!);
  assertSafePart('pageId', pageId!);
  assertSafePart('instanceId', instanceId!);
  assertSafePart('anchorName', anchorName!);
  return { designId: designId!, pageId: pageId!, instanceId: instanceId!, anchorName: anchorName! };
}

/** Validate that a set of DOM ids has no duplicates. */
export function assertUniqueDomIds(ids: readonly string[]): void {
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) throw new Error(`Duplicate DOM id: ${id}`);
    seen.add(id);
  }
}

export function isDependencyEdge(edge: GraphEdge): edge is DependencyEdge {
  return edge.kind === 'dependency';
}

export function isContainmentEdge(edge: GraphEdge): edge is ContainmentEdge {
  return edge.kind === 'containment';
}

export function isConnectionEdge(edge: GraphEdge): edge is ConnectionEdge {
  return edge.kind === 'connection';
}

export function relationKindOf(edge: GraphEdge): RelationKind {
  return edge.kind;
}

/** Declared block-to-block dependency edges (what a block requires). Not placement. */
export function dependencyEdgesFromBlock(
  blockRef: Ref | Id,
  dependencyRefs: readonly (Ref | Id)[],
): DependencyEdge[] {
  return dependencyRefs.map(toBlock => ({
    kind: 'dependency' as const,
    fromBlock: blockRef,
    toBlock,
  }));
}

/**
 * Containment edges from page graph parents (where an instance belongs).
 * Distinct from registry dependency refs and from port connections.
 */
export function containmentEdgesFromPage(page: PagePlan): ContainmentEdge[] {
  const edges: ContainmentEdge[] = [];
  for (const node of Object.values(page.nodes)) {
    if (!node.parent) continue;
    edges.push({
      kind: 'containment',
      parentNode: node.parent.node,
      childNode: node.id,
      slot: node.parent.slot,
      order: node.parent.order,
    });
  }
  return edges;
}

/** Connection edges from page port wiring (how siblings coordinate). */
export function connectionEdgesFromPage(page: PagePlan): ConnectionEdge[] {
  return page.connections.map(connection => ({
    kind: 'connection' as const,
    connection,
  }));
}

export function allGraphEdgesFromPage(
  page: PagePlan,
  blockDependencies: ReadonlyMap<Ref, readonly (Ref | Id)[]>,
): GraphEdge[] {
  const edges: GraphEdge[] = [];
  for (const node of Object.values(page.nodes)) {
    const deps = blockDependencies.get(node.block) ?? [];
    edges.push(...dependencyEdgesFromBlock(node.block, deps));
  }
  edges.push(...containmentEdgesFromPage(page));
  edges.push(...connectionEdgesFromPage(page));
  return edges;
}

/** True when node A is an ancestor of node B via containment parents. */
export function isContainmentAncestor(
  page: PagePlan,
  ancestorId: Id,
  nodeId: Id,
): boolean {
  let current: NodeInstance | undefined = page.nodes[nodeId];
  const seen = new Set<Id>();
  while (current?.parent) {
    if (seen.has(current.id)) return false;
    seen.add(current.id);
    if (current.parent.node === ancestorId) return true;
    current = page.nodes[current.parent.node];
  }
  return false;
}

/**
 * Detect a containment cycle starting from any node.
 * Reciprocal *connections* are not cycles; only parent links count.
 */
export function findContainmentCycle(page: PagePlan): Id[] | undefined {
  const visiting = new Set<Id>();
  const visited = new Set<Id>();
  const stack: Id[] = [];

  const visit = (id: Id): Id[] | undefined => {
    if (visited.has(id)) return undefined;
    if (visiting.has(id)) {
      const start = stack.indexOf(id);
      return start >= 0 ? stack.slice(start).concat(id) : [id];
    }
    visiting.add(id);
    stack.push(id);
    const node = page.nodes[id];
    if (node?.parent) {
      const cycle = visit(node.parent.node);
      if (cycle) return cycle;
    }
    stack.pop();
    visiting.delete(id);
    visited.add(id);
    return undefined;
  };

  for (const id of Object.keys(page.nodes)) {
    const cycle = visit(id);
    if (cycle) return cycle;
  }
  return undefined;
}

/** Collect connection ids that reference a given node endpoint. */
export function connectionsForNode(page: PagePlan, nodeId: Id): Connection[] {
  return page.connections.filter(
    connection => connection.from.node === nodeId || connection.to.node === nodeId,
  );
}

/** Component / block dependency refs declared on a compiled block (not slots or ports). */
export function declaredDependencies(block: MacroBlock): {
  componentRefs: string[];
  ruleRefs: Ref[];
  dependencyRefs: Ref[];
} {
  return {
    componentRefs: [...block.componentRefs],
    ruleRefs: [...block.ruleRefs],
    dependencyRefs: [...block.dependencyRefs],
  };
}

/**
 * Generate DOM ids for every slot/port/layout anchor on an instance.
 * Does not include session revision.
 */
export function instanceAnchorDomIds(
  designId: Id,
  pageId: Id,
  instanceId: Id,
  anchorNames: readonly Id[],
): string[] {
  const ids = anchorNames.map(name => generateDomId(designId, pageId, instanceId, name));
  assertUniqueDomIds(ids);
  return ids;
}
