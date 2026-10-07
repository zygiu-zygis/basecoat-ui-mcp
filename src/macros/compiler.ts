// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Content-addressable compilation of authoring macros into an immutable registry snapshot.
import { createHash } from 'node:crypto';
import {
  MacroError,
  MAX_DETAIL_BYTES,
  createCursorFactory,
  pageRecords,
  rawMacroResult,
  resultBytes,
} from './packets.js';
import {
  LIMITS,
  authoringRegistryInputSchema,
  compiledMacroRegistrySchema,
  designProfileSchema,
  macroBlockSchema,
  recipeSchema,
  ruleTemplateSchema,
} from './schema.js';
import type {
  AuthoringMacroBlock,
  AuthoringRecipe,
  AuthoringRegistryInput,
  CompiledMacroRegistry,
  DesignProfile,
  Fragment,
  Id,
  MacroBlock,
  NodeInstance,
  PagePlan,
  Recipe,
  Ref,
  RegistryDiagnostic,
  RuleTemplate,
} from './types.js';

/** Deterministic JSON: sorted object keys, arrays preserve order, no undefined. */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (value === null || typeof value !== 'object') {
    if (typeof value === 'number' && !Number.isFinite(value)) {
      throw new MacroError('INVALID_PACKET', 'Non-finite number in canonical JSON');
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

export function registrySnapshotId(revision: Ref): string {
  return `r:${revision}`;
}

/**
 * Fail closed when a single fragment cannot fit in a minimal sectioned packet
 * (header + one item + continuation cursor) under MAX_DETAIL_BYTES.
 */
export function assertFragmentPacketBudget(
  fragment: Fragment,
  registryRevision: Ref,
): void {
  if (fragment.emmet.length > LIMITS.emmetMax) {
    throw new MacroError('ATOM_TOO_LARGE', `Fragment emmet exceeds LIMITS.emmetMax (${fragment.id})`);
  }
  const snapshot = registrySnapshotId(registryRevision);
  const cursorFor = createCursorFactory({
    v: 1,
    fingerprint: 'compile-fragment',
    snapshot,
    section: 'structure',
    registryRevision,
  });
  const header = {
    kind: 'macro-block',
    section: 'structure',
    registryRevision,
  };
  try {
    pageRecords([fragment], 0, header, cursorFor);
  } catch (error) {
    if (error instanceof MacroError && error.code === 'ATOM_TOO_LARGE') {
      throw new MacroError(
        'ATOM_TOO_LARGE',
        `Fragment ${fragment.id} exceeds packet budget with header+cursor overhead`,
      );
    }
    if (error instanceof MacroError && error.code === 'HEADER_TOO_LARGE') {
      throw new MacroError('ATOM_TOO_LARGE', 'Minimal fragment packet header exceeds budget');
    }
    throw error;
  }
  // Defense: also compare a raw single-item packet size.
  const probe = rawMacroResult({
    ...header,
    items: [fragment],
    next: cursorFor(1),
  });
  if (resultBytes(probe) > MAX_DETAIL_BYTES) {
    throw new MacroError(
      'ATOM_TOO_LARGE',
      `Fragment ${fragment.id} exceeds MAX_DETAIL_BYTES with packet overhead`,
    );
  }
}

/** Comfortable rhythm spacing steps approved for macro Emmet authoring. */
export const APPROVED_MACRO_SPACING = new Set(['0', '2', '4', '6', '8', '12']);

const EMMET_SPACING =
  /(?:^|[.>+*^()\[\],\s])(?:(?:sm|md|lg|xl|2xl):)?(!?)(-?)(gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(\d+(?:\.\d+)?)(?=[.>+*^()\[\],\s]|$)/g;

/** Extract spacing utilities from Emmet class chains (e.g. `.gap-3`, `.md:p-4`). */
export function extractEmmetSpacingUtilities(emmet: string): string[] {
  const found: string[] = [];
  EMMET_SPACING.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = EMMET_SPACING.exec(emmet)) !== null) {
    const important = match[1] === '!';
    const negative = match[2] === '-';
    const family = match[3]!;
    const value = match[4]!;
    const token = `${important ? '!' : ''}${negative ? '-' : ''}${family}-${value}`;
    found.push(token);
  }
  return found;
}

export function assertEmmetUsesApprovedSpacing(
  emmet: string,
  context: { blockId: Id; fragmentId: Id },
  approved: ReadonlySet<string> = APPROVED_MACRO_SPACING,
): void {
  for (const token of extractEmmetSpacingUtilities(emmet)) {
    const spacing = /^(!?)(-?)(gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(.+)$/.exec(token);
    if (!spacing) continue;
    const [, , negative, family, value] = spacing;
    const allowedAuto = family!.startsWith('m') && value === 'auto' && !negative;
    if (allowedAuto) continue;
    if (negative || !approved.has(value!)) {
      throw new MacroError(
        'UNAPPROVED_SPACING',
        `Block ${context.blockId} fragment ${context.fragmentId} uses spacing '${token}' outside approved rhythm steps (${[...approved].join(', ')}).`,
      );
    }
  }
}

function diagnostic(
  code: string,
  message: string,
  extra: Partial<RegistryDiagnostic> = {},
): RegistryDiagnostic {
  return { code, severity: 'error', message, ...extra };
}

function warning(
  code: string,
  message: string,
  extra: Partial<RegistryDiagnostic> = {},
): RegistryDiagnostic {
  return { code, severity: 'warning', message, ...extra };
}

/** Kahn topological order over block dependencyBlockIds. */
function topoSortBlocks(
  blocks: AuthoringMacroBlock[],
): { order: AuthoringMacroBlock[]; diagnostics: RegistryDiagnostic[] } {
  const byId = new Map(blocks.map(block => [block.id, block]));
  const diagnostics: RegistryDiagnostic[] = [];
  const indegree = new Map<Id, number>();
  const dependents = new Map<Id, Id[]>();

  for (const block of blocks) {
    indegree.set(block.id, 0);
    dependents.set(block.id, []);
  }
  for (const block of blocks) {
    const seen = new Set<Id>();
    for (const depId of block.dependencyBlockIds) {
      if (!byId.has(depId)) {
        diagnostics.push(
          diagnostic('MISSING_DEPENDENCY', `Block ${block.id} depends on missing block ${depId}`, {
            id: block.id,
          }),
        );
        continue;
      }
      if (seen.has(depId)) continue;
      seen.add(depId);
      indegree.set(block.id, (indegree.get(block.id) ?? 0) + 1);
      dependents.get(depId)!.push(block.id);
    }
  }

  const queue = [...indegree.entries()]
    .filter(([, degree]) => degree === 0)
    .map(([id]) => id)
    .sort();
  const order: AuthoringMacroBlock[] = [];
  while (queue.length > 0) {
    const id = queue.shift()!;
    order.push(byId.get(id)!);
    for (const child of (dependents.get(id) ?? []).slice().sort()) {
      const next = (indegree.get(child) ?? 0) - 1;
      indegree.set(child, next);
      if (next === 0) queue.push(child);
      queue.sort();
    }
  }
  if (order.length !== blocks.length) {
    const remaining = [...indegree.entries()]
      .filter(([, degree]) => degree > 0)
      .map(([id]) => id)
      .sort();
    diagnostics.push(
      diagnostic(
        'DEPENDENCY_CYCLE',
        `Block dependency cycle involving: ${remaining.join(', ') || 'unknown'}`,
      ),
    );
  }
  return { order, diagnostics };
}

function compileRule(rule: RuleTemplate): { ref: Ref; rule: RuleTemplate } {
  const parsed = ruleTemplateSchema.parse(rule);
  const ref = contentRef(parsed);
  return { ref, rule: parsed };
}

function compileProfile(profile: DesignProfile): { ref: Ref; profile: DesignProfile } {
  const parsed = designProfileSchema.parse(profile);
  const ref = contentRef(parsed);
  return { ref, profile: parsed };
}

function compileBlock(
  authoring: AuthoringMacroBlock,
  aliasToRef: ReadonlyMap<Id, Ref>,
  provisionalRevision: Ref,
): { ref: Ref; block: MacroBlock; diagnostics: RegistryDiagnostic[] } {
  const diagnostics: RegistryDiagnostic[] = [];
  const ruleRefs: Ref[] = [];
  for (const ruleId of authoring.ruleRefs) {
    const ref = aliasToRef.get(ruleId);
    if (!ref) {
      diagnostics.push(
        diagnostic('MISSING_RULE', `Block ${authoring.id} references missing rule ${ruleId}`, {
          id: authoring.id,
        }),
      );
      continue;
    }
    ruleRefs.push(ref);
  }
  const dependencyRefs: Ref[] = [];
  for (const depId of authoring.dependencyBlockIds) {
    const ref = aliasToRef.get(depId);
    if (!ref) {
      diagnostics.push(
        diagnostic(
          'MISSING_DEPENDENCY',
          `Block ${authoring.id} dependency ${depId} is not compiled`,
          { id: authoring.id },
        ),
      );
      continue;
    }
    dependencyRefs.push(ref);
  }

  const fragmentIds = new Set(authoring.fragments.map(fragment => fragment.id));
  if (!fragmentIds.has(authoring.root)) {
    diagnostics.push(
      diagnostic('INVALID_ANCHOR', `Block ${authoring.id} root "${authoring.root}" is not a fragment`, {
        id: authoring.id,
      }),
    );
  }
  if (!fragmentIds.has(authoring.layout.frameRef)) {
    diagnostics.push(
      diagnostic(
        'INVALID_ANCHOR',
        `Block ${authoring.id} layout.frameRef "${authoring.layout.frameRef}" is not a fragment`,
        { id: authoring.id },
      ),
    );
  }
  for (const boundary of [authoring.layout.gutterBoundary, authoring.layout.scrollBoundary]) {
    if (boundary !== undefined && !fragmentIds.has(boundary)) {
      diagnostics.push(
        diagnostic(
          'INVALID_ANCHOR',
          `Block ${authoring.id} layout boundary "${boundary}" is not a fragment`,
          { id: authoring.id },
        ),
      );
    }
  }
  for (const slot of authoring.slots) {
    if (!fragmentIds.has(slot.at.fragment)) {
      diagnostics.push(
        diagnostic(
          'INVALID_ANCHOR',
          `Block ${authoring.id} slot "${slot.id}" anchors missing fragment "${slot.at.fragment}"`,
          { id: authoring.id },
        ),
      );
    }
  }
  for (const port of authoring.ports) {
    if (!fragmentIds.has(port.at.fragment)) {
      diagnostics.push(
        diagnostic(
          'INVALID_ANCHOR',
          `Block ${authoring.id} port "${port.id}" anchors missing fragment "${port.at.fragment}"`,
          { id: authoring.id },
        ),
      );
    }
  }
  for (const mount of authoring.mounts) {
    if (!fragmentIds.has(mount.parent) || !fragmentIds.has(mount.child)) {
      diagnostics.push(
        diagnostic(
          'INVALID_MOUNT',
          `Block ${authoring.id} mount parent="${mount.parent}" child="${mount.child}" must reference fragments`,
          { id: authoring.id },
        ),
      );
    }
  }

  for (const fragment of authoring.fragments) {
    try {
      assertFragmentPacketBudget(fragment, provisionalRevision);
      assertEmmetUsesApprovedSpacing(fragment.emmet, {
        blockId: authoring.id,
        fragmentId: fragment.id,
      });
    } catch (error) {
      if (error instanceof MacroError && error.code === 'ATOM_TOO_LARGE') {
        diagnostics.push(
          diagnostic('ATOM_TOO_LARGE', error.message, { id: authoring.id }),
        );
      } else if (error instanceof MacroError && error.code === 'UNAPPROVED_SPACING') {
        diagnostics.push(
          diagnostic('UNAPPROVED_SPACING', error.message, { id: authoring.id }),
        );
      } else {
        throw error;
      }
    }
  }

  const block: MacroBlock = {
    schemaVersion: 1,
    id: authoring.id,
    role: authoring.role,
    family: authoring.family,
    description: authoring.description,
    tags: [...authoring.tags],
    root: authoring.root,
    fragments: authoring.fragments.map(f => ({ ...f })),
    mounts: authoring.mounts.map(m => ({ ...m })),
    slots: authoring.slots.map(s => ({
      ...s,
      accepts: [...s.accepts],
    })),
    ports: authoring.ports.map(p => ({ ...p })),
    componentRefs: [...authoring.componentRefs],
    ruleRefs,
    dependencyRefs,
    layout: { ...authoring.layout },
    landmarks: { ...authoring.landmarks },
    provenance: {
      ...authoring.provenance,
      sourceHashes: { ...authoring.provenance.sourceHashes },
    },
  };

  if (diagnostics.some(d => d.severity === 'error')) {
    return { ref: contentRef(block), block, diagnostics };
  }
  const parsed = macroBlockSchema.parse(block);
  const ref = contentRef(parsed);
  return { ref, block: parsed, diagnostics };
}

function compilePagePlan(
  page: AuthoringRecipe['pages'][number],
  recipeId: Id,
  aliasToRef: ReadonlyMap<Id, Ref>,
  diagnostics: RegistryDiagnostic[],
): PagePlan {
  const nodes: Record<Id, NodeInstance> = {};
  for (const [nodeId, node] of Object.entries(page.nodes)) {
    const blockRef = aliasToRef.get(node.block);
    if (!blockRef) {
      diagnostics.push(
        diagnostic(
          'MISSING_BLOCK',
          `Page ${page.id} node ${nodeId} references missing block ${node.block}`,
          { id: recipeId },
        ),
      );
      continue;
    }
    nodes[nodeId] = {
      id: node.id,
      block: blockRef,
      ...(node.parent ? { parent: { ...node.parent } } : {}),
      bindings: { ...node.bindings },
    };
  }
  return {
    id: page.id,
    route: page.route,
    // Placeholder authoring id for hashing; replaced with content ref after.
    recipe: recipeId as unknown as Ref,
    root: page.root,
    nodes,
    connections: page.connections.map(c => ({
      ...c,
      from: { ...c.from },
      to: { ...c.to },
    })),
    rules: page.rules.map(r => structuredClone(r)),
    decisions: { ...page.decisions },
    status: page.status,
  };
}

function compileRecipe(
  authoring: AuthoringRecipe,
  aliasToRef: ReadonlyMap<Id, Ref>,
): { ref: Ref; recipe: Recipe; diagnostics: RegistryDiagnostic[] } {
  const diagnostics: RegistryDiagnostic[] = [];
  const profileRef = aliasToRef.get(authoring.profile);
  if (!profileRef) {
    diagnostics.push(
      diagnostic(
        'MISSING_PROFILE',
        `Recipe ${authoring.id} references missing profile ${authoring.profile}`,
        { id: authoring.id },
      ),
    );
  }

  const pages = authoring.pages.map(page =>
    compilePagePlan(page, authoring.id, aliasToRef, diagnostics),
  );

  const hashBody = {
    schemaVersion: 1 as const,
    id: authoring.id,
    kind: authoring.kind,
    profile: profileRef ?? '',
    pages: pages.map(page => ({
      ...page,
      recipe: authoring.id,
    })),
    entryPage: authoring.entryPage,
    routeLinks: authoring.routeLinks.map(link => ({
      ...link,
      fromAnchor: { ...link.fromAnchor },
    })),
  };
  const ref = contentRef(hashBody);

  if (!profileRef || diagnostics.some(d => d.severity === 'error')) {
    return {
      ref,
      recipe: {
        schemaVersion: 1,
        id: authoring.id,
        kind: authoring.kind,
        profile: profileRef ?? ('0'.repeat(64) as Ref),
        pages: pages.map(page => ({ ...page, recipe: ref })),
        entryPage: authoring.entryPage,
        routeLinks: hashBody.routeLinks,
      },
      diagnostics,
    };
  }

  const recipe: Recipe = {
    schemaVersion: 1,
    id: authoring.id,
    kind: authoring.kind,
    profile: profileRef,
    pages: pages.map(page => ({ ...page, recipe: ref })),
    entryPage: authoring.entryPage,
    routeLinks: hashBody.routeLinks,
  };
  recipeSchema.parse({
    ...recipe,
    // Schema expects ref-shaped recipe field; already set.
  });
  return { ref, recipe, diagnostics };
}

export function resolveDependencyClosure(
  registry: CompiledMacroRegistry,
  rootRefs: readonly Ref[],
): Ref[] {
  const seen = new Set<Ref>();
  const order: Ref[] = [];
  const visit = (ref: Ref): void => {
    if (seen.has(ref)) return;
    const block = registry.blocks[ref];
    if (!block) {
      throw new MacroError('MISSING_DEPENDENCY', `Unknown block ref ${ref}`);
    }
    seen.add(ref);
    for (const dep of block.dependencyRefs) {
      visit(dep);
    }
    order.push(ref);
  };
  for (const ref of rootRefs) {
    visit(ref);
  }
  return order;
}

export function validateRegistry(registry: CompiledMacroRegistry): RegistryDiagnostic[] {
  const diagnostics: RegistryDiagnostic[] = [];
  const parsed = compiledMacroRegistrySchema.safeParse(registry);
  if (!parsed.success) {
    diagnostics.push(
      diagnostic('SCHEMA_INVALID', parsed.error.issues.map(i => i.message).join('; ')),
    );
    return diagnostics;
  }

  const aliasTargets = new Set<Ref>();
  for (const [alias, ref] of Object.entries(registry.aliases)) {
    aliasTargets.add(ref);
    const found =
      registry.blocks[ref] ||
      registry.recipes[ref] ||
      registry.profiles[ref] ||
      registry.rules[ref];
    if (!found) {
      diagnostics.push(
        diagnostic('DANGLING_ALIAS', `Alias ${alias} points to missing ref ${ref}`, {
          id: alias,
          ref,
        }),
      );
    }
  }

  for (const [ref, block] of Object.entries(registry.blocks)) {
    const recomputed = contentRef(block);
    if (recomputed !== ref) {
      diagnostics.push(
        diagnostic('HASH_MISMATCH', `Block ${block.id} ref does not match content hash`, {
          id: block.id,
          ref,
        }),
      );
    }
    for (const dep of block.dependencyRefs) {
      if (!registry.blocks[dep]) {
        diagnostics.push(
          diagnostic('MISSING_DEPENDENCY', `Block ${block.id} missing dep ${dep}`, {
            id: block.id,
            ref,
          }),
        );
      }
    }
    for (const ruleRef of block.ruleRefs) {
      if (!registry.rules[ruleRef]) {
        diagnostics.push(
          diagnostic('MISSING_RULE', `Block ${block.id} missing rule ${ruleRef}`, {
            id: block.id,
            ref,
          }),
        );
      }
    }
    for (const fragment of block.fragments) {
      try {
        assertFragmentPacketBudget(fragment, registry.revision);
      } catch (error) {
        if (error instanceof MacroError && error.code === 'ATOM_TOO_LARGE') {
          diagnostics.push(diagnostic('ATOM_TOO_LARGE', error.message, { id: block.id, ref }));
        } else {
          throw error;
        }
      }
    }
    try {
      resolveDependencyClosure(registry, [ref]);
    } catch (error) {
      if (error instanceof MacroError) {
        diagnostics.push(diagnostic(error.code, error.message, { id: block.id, ref }));
      } else {
        throw error;
      }
    }
  }

  // Detect dependency cycles via indegree over compiled refs.
  {
    const indegree = new Map<Ref, number>();
    for (const ref of Object.keys(registry.blocks)) indegree.set(ref, 0);
    for (const [ref, block] of Object.entries(registry.blocks)) {
      for (const dep of block.dependencyRefs) {
        if (!indegree.has(dep)) continue;
        indegree.set(ref, (indegree.get(ref) ?? 0) + 1);
      }
    }
    const queue = [...indegree.entries()].filter(([, d]) => d === 0).map(([r]) => r);
    let visited = 0;
    const dependents = new Map<Ref, Ref[]>();
    for (const ref of Object.keys(registry.blocks)) dependents.set(ref, []);
    for (const [ref, block] of Object.entries(registry.blocks)) {
      for (const dep of block.dependencyRefs) {
        dependents.get(dep)?.push(ref);
      }
    }
    while (queue.length > 0) {
      const ref = queue.pop()!;
      visited += 1;
      for (const child of dependents.get(ref) ?? []) {
        const next = (indegree.get(child) ?? 0) - 1;
        indegree.set(child, next);
        if (next === 0) queue.push(child);
      }
    }
    if (visited !== Object.keys(registry.blocks).length) {
      diagnostics.push(diagnostic('DEPENDENCY_CYCLE', 'Compiled block dependency graph has a cycle'));
    }
  }

  for (const [ref, profile] of Object.entries(registry.profiles)) {
    if (contentRef(profile) !== ref) {
      diagnostics.push(
        diagnostic('HASH_MISMATCH', `Profile ${profile.id} ref does not match content hash`, {
          id: profile.id,
          ref,
        }),
      );
    }
  }
  for (const [ref, rule] of Object.entries(registry.rules)) {
    if (contentRef(rule) !== ref) {
      diagnostics.push(
        diagnostic('HASH_MISMATCH', `Rule ${rule.id} ref does not match content hash`, {
          id: rule.id,
          ref,
        }),
      );
    }
  }
  for (const [ref, recipe] of Object.entries(registry.recipes)) {
    const hashBody = {
      schemaVersion: 1 as const,
      id: recipe.id,
      kind: recipe.kind,
      profile: recipe.profile,
      pages: recipe.pages.map(page => ({
        ...page,
        recipe: recipe.id,
      })),
      entryPage: recipe.entryPage,
      routeLinks: recipe.routeLinks,
    };
    if (contentRef(hashBody) !== ref) {
      diagnostics.push(
        diagnostic('HASH_MISMATCH', `Recipe ${recipe.id} ref does not match content hash`, {
          id: recipe.id,
          ref,
        }),
      );
    }
    if (!registry.profiles[recipe.profile]) {
      diagnostics.push(
        diagnostic('MISSING_PROFILE', `Recipe ${recipe.id} missing profile`, {
          id: recipe.id,
          ref,
        }),
      );
    }
  }

  const expectedRevision = contentRef({
    blocks: Object.keys(registry.blocks).sort(),
    recipes: Object.keys(registry.recipes).sort(),
    profiles: Object.keys(registry.profiles).sort(),
    rules: Object.keys(registry.rules).sort(),
    aliases: Object.keys(registry.aliases)
      .sort()
      .map(id => [id, registry.aliases[id]]),
  });
  if (expectedRevision !== registry.revision) {
    diagnostics.push(
      diagnostic(
        'REVISION_MISMATCH',
        'Registry revision does not match content-addressable revision hash',
        { ref: registry.revision },
      ),
    );
  }

  if (aliasTargets.size === 0 && Object.keys(registry.blocks).length > 0) {
    diagnostics.push(warning('NO_ALIASES', 'Registry has blocks but no aliases'));
  }

  return diagnostics;
}

export interface CompileRegistryResult {
  registry: CompiledMacroRegistry;
  diagnostics: RegistryDiagnostic[];
}

export function compileRegistry(input: AuthoringRegistryInput): CompileRegistryResult {
  const diagnostics: RegistryDiagnostic[] = [];
  const parsedInput = authoringRegistryInputSchema.safeParse(input);
  if (!parsedInput.success) {
    return {
      registry: {
        schemaVersion: 1,
        revision: contentRef({ empty: true }),
        blocks: {},
        recipes: {},
        profiles: {},
        rules: {},
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

  const idCounts = new Map<Id, number>();
  for (const item of [
    ...authoring.blocks,
    ...authoring.recipes,
    ...authoring.profiles,
    ...authoring.rules,
  ]) {
    idCounts.set(item.id, (idCounts.get(item.id) ?? 0) + 1);
  }
  for (const [id, count] of idCounts) {
    if (count > 1) {
      diagnostics.push(diagnostic('DUPLICATE_ID', `Duplicate authoring id ${id}`, { id }));
    }
  }

  const aliases: Record<Id, Ref> = {};
  const aliasToRef = new Map<Id, Ref>();
  const rules: Record<Ref, RuleTemplate> = {};
  const profiles: Record<Ref, DesignProfile> = {};
  const blocks: Record<Ref, MacroBlock> = {};
  const recipes: Record<Ref, Recipe> = {};

  for (const rule of authoring.rules) {
    const { ref, rule: compiled } = compileRule(rule);
    if (rules[ref] && rules[ref]!.id !== compiled.id) {
      diagnostics.push(
        diagnostic('HASH_COLLISION', `Rule hash collision for ${compiled.id}`, { id: compiled.id, ref }),
      );
    }
    rules[ref] = compiled;
    aliases[compiled.id] = ref;
    aliasToRef.set(compiled.id, ref);
  }

  for (const profile of authoring.profiles) {
    const { ref, profile: compiled } = compileProfile(profile);
    profiles[ref] = compiled;
    aliases[compiled.id] = ref;
    aliasToRef.set(compiled.id, ref);
  }

  // Provisional revision for fragment budget checks (fixed-width hex).
  const provisionalRevision = '0'.repeat(64);

  const { order: blockOrder, diagnostics: topoDiagnostics } = topoSortBlocks(authoring.blocks);
  diagnostics.push(...topoDiagnostics);

  for (const authoringBlock of blockOrder) {
    const { ref, block, diagnostics: blockDiagnostics } = compileBlock(
      authoringBlock,
      aliasToRef,
      provisionalRevision,
    );
    diagnostics.push(...blockDiagnostics);
    if (blockDiagnostics.some(d => d.severity === 'error')) continue;
    blocks[ref] = block;
    aliases[block.id] = ref;
    aliasToRef.set(block.id, ref);
  }

  for (const authoringRecipe of authoring.recipes) {
    const { ref, recipe, diagnostics: recipeDiagnostics } = compileRecipe(
      authoringRecipe,
      aliasToRef,
    );
    diagnostics.push(...recipeDiagnostics);
    if (recipeDiagnostics.some(d => d.severity === 'error')) continue;
    recipes[ref] = recipe;
    aliases[recipe.id] = ref;
    aliasToRef.set(recipe.id, ref);
  }

  const revision = contentRef({
    blocks: Object.keys(blocks).sort(),
    recipes: Object.keys(recipes).sort(),
    profiles: Object.keys(profiles).sort(),
    rules: Object.keys(rules).sort(),
    aliases: Object.keys(aliases)
      .sort()
      .map(id => [id, aliases[id]]),
  });

  const registry: CompiledMacroRegistry = {
    schemaVersion: 1,
    revision,
    blocks,
    recipes,
    profiles,
    rules,
    aliases,
  };

  if (!diagnostics.some(d => d.severity === 'error')) {
    diagnostics.push(...validateRegistry(registry));
  }

  return { registry, diagnostics };
}
