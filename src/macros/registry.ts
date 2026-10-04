// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Load and serve the compiled immutable macro registry with sectioned reads.
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import {
  MacroError,
  createCursorFactory,
  pageRecords,
  validateMacroCursor,
} from './packets.js';
import { registrySnapshotId } from './compiler.js';
import { compiledMacroRegistrySchema } from './schema.js';
import type {
  BlockManifest,
  BlockSection,
  CompiledMacroRegistry,
  Id,
  MacroBlock,
  Ref,
} from './types.js';
import snapshotJson from './registry.snapshot.json' with { type: 'json' };

const DEFAULT_SNAPSHOT_URL = new URL('./registry.snapshot.json', import.meta.url);

let cached: CompiledMacroRegistry | undefined;

/** Keep cursor fingerprints within LIMITS.fingerprintMax (64). */
function compactFingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('\0'), 'utf8').digest('hex').slice(0, 32);
}

export function loadCompiledRegistry(
  data: unknown = snapshotJson,
): CompiledMacroRegistry {
  const parsed = compiledMacroRegistrySchema.parse(data);
  cached = parsed;
  return parsed;
}

export async function loadCompiledRegistryFromPath(
  path = fileURLToPath(DEFAULT_SNAPSHOT_URL),
): Promise<CompiledMacroRegistry> {
  const raw = JSON.parse(await readFile(path, 'utf8')) as unknown;
  return loadCompiledRegistry(raw);
}

export function getCompiledRegistry(): CompiledMacroRegistry {
  if (!cached) {
    return loadCompiledRegistry();
  }
  return cached;
}

export function resolveAlias(
  registry: CompiledMacroRegistry,
  idOrRef: Id | Ref,
): Ref {
  if (registry.aliases[idOrRef]) {
    return registry.aliases[idOrRef]!;
  }
  if (
    registry.blocks[idOrRef] ||
    registry.recipes[idOrRef] ||
    registry.profiles[idOrRef] ||
    registry.rules[idOrRef]
  ) {
    return idOrRef;
  }
  throw new MacroError('UNKNOWN_ALIAS', `Unknown macro alias or ref: ${idOrRef}`);
}

export function getBlock(
  registry: CompiledMacroRegistry,
  idOrRef: Id | Ref,
): MacroBlock {
  const ref = resolveAlias(registry, idOrRef);
  const block = registry.blocks[ref];
  if (!block) {
    const recipe = registry.recipes[ref];
    if (recipe) {
      const rootBlockId = recipeRootBlockId(registry, recipe);
      throw new MacroError(
        'EXPECTED_BLOCK_GOT_RECIPE',
        `Resolved '${idOrRef}' to recipe '${recipe.id}', not a block. Instantiate the recipe or fetch its root block${rootBlockId ? ` '${rootBlockId}'` : ''}.`,
        {
          recipeId: recipe.id,
          recipeRef: ref,
          entryPage: recipe.entryPage,
          ...(rootBlockId ? { rootBlockId } : {}),
        },
      );
    }
    throw new MacroError('UNKNOWN_BLOCK', `Unknown macro block: ${idOrRef}`);
  }
  return block;
}

function sectionCounts(block: MacroBlock): Record<BlockSection, number> {
  return {
    manifest: 1,
    structure: block.fragments.length + block.mounts.length,
    slots: block.slots.length,
    ports: block.ports.length,
    rules: block.ruleRefs.length,
    dependencies: block.dependencyRefs.length + block.componentRefs.length,
    provenance: 1,
  };
}

export function blockManifest(
  registry: CompiledMacroRegistry,
  idOrRef: Id | Ref,
): BlockManifest {
  const ref = resolveAlias(registry, idOrRef);
  const block = getBlock(registry, ref);
  return {
    ref,
    id: block.id,
    role: block.role,
    family: block.family,
    description: block.description,
    root: block.root,
    tags: [...block.tags],
    sectionCounts: sectionCounts(block),
  };
}

export type SectionRecord = Record<string, unknown>;

function sectionRecords(block: MacroBlock, section: BlockSection): SectionRecord[] {
  switch (section) {
    case 'manifest':
      return [
        {
          id: block.id,
          role: block.role,
          family: block.family,
          description: block.description,
          root: block.root,
          tags: block.tags,
          layout: block.layout,
          landmarks: block.landmarks,
        },
      ];
    case 'structure':
      return [
        ...block.fragments.map(fragment => ({ kind: 'fragment' as const, ...fragment })),
        ...block.mounts.map(mount => ({ kind: 'mount' as const, ...mount })),
      ];
    case 'slots':
      return block.slots.map(slot => ({ ...slot }));
    case 'ports':
      return block.ports.map(port => ({ ...port }));
    case 'rules':
      return block.ruleRefs.map(ref => ({ ref }));
    case 'dependencies':
      return [
        ...block.dependencyRefs.map(ref => ({ kind: 'macro-block' as const, ref })),
        ...block.componentRefs.map(id => ({ kind: 'component' as const, id })),
      ];
    case 'provenance':
      return [{ ...block.provenance }];
    default: {
      const _exhaustive: never = section;
      throw new MacroError('INVALID_SECTION', `Unknown section ${_exhaustive}`);
    }
  }
}

export interface GetBlockSectionInput {
  idOrRef: Id | Ref;
  section: BlockSection;
  cursor?: string;
}

function recipeRootBlockId(
  registry: CompiledMacroRegistry,
  recipe: NonNullable<CompiledMacroRegistry['recipes'][string]>,
): Id | undefined {
  const entry = recipe.pages.find(page => page.id === recipe.entryPage) ?? recipe.pages[0];
  if (!entry) return undefined;
  const rootNode = entry.nodes[entry.root];
  if (!rootNode) return undefined;
  const blockRef = rootNode.block;
  const block = registry.blocks[blockRef];
  if (block) return block.id;
  // Authoring recipes store block aliases; resolve when still an id.
  try {
    return getBlock(registry, blockRef).id;
  } catch {
    return blockRef;
  }
}

export function getBlockSection(
  registry: CompiledMacroRegistry,
  input: GetBlockSectionInput,
) {
  const ref = resolveAlias(registry, input.idOrRef);
  const recipe = registry.recipes[ref];
  if (recipe && !registry.blocks[ref]) {
    const rootBlockId = recipeRootBlockId(registry, recipe);
    const steps = recipe.pages.map(page => ({
      id: page.id,
      route: page.route,
      root: page.root,
      nodeCount: Object.keys(page.nodes).length,
    }));
    throw new MacroError(
      'EXPECTED_BLOCK_GOT_RECIPE',
      `Resolved '${input.idOrRef}' to recipe '${recipe.id}', not a block. Instantiate the recipe or fetch its root block${rootBlockId ? ` '${rootBlockId}'` : ''}.`,
      {
        recipeId: recipe.id,
        recipeRef: ref,
        entryPage: recipe.entryPage,
        steps,
        ...(rootBlockId ? { rootBlockId } : {}),
      },
    );
  }
  const block = getBlock(registry, ref);
  const snapshot = registrySnapshotId(registry.revision);
  const fingerprint = compactFingerprint(['block', ref, input.section]);
  const records = sectionRecords(block, input.section);

  let start = 0;
  if (input.cursor) {
    const payload = validateMacroCursor(input.cursor, {
      fingerprint,
      snapshot,
      section: input.section,
      snapshotExists: true,
    });
    start = payload.offset;
  }

  const cursorFor = createCursorFactory({
    v: 1,
    fingerprint,
    snapshot,
    section: input.section,
  });

  return pageRecords(
    records,
    start,
    {
      kind: 'macro-block',
      ref,
      id: block.id,
      section: input.section,
      registryRevision: registry.revision,
      total: records.length,
    },
    cursorFor,
  );
}

export interface SearchMacroBlocksQuery {
  q?: string;
  role?: string;
  /** When set, block.role must be one of these (slot.accepts). */
  roles?: string[];
  family?: string;
  tag?: string;
  limit?: number;
  cursor?: string;
}

export interface SearchMacroHit {
  ref: Ref;
  id: Id;
  role: string;
  family: Id;
}

function scoreMacroBlock(block: MacroBlock, tokens: string[]): number {
  if (tokens.length === 0) return 1;
  const hay = [block.id, block.role, block.family, block.description, ...block.tags]
    .join(' ')
    .toLowerCase();
  let score = 0;
  for (const token of tokens) {
    if (block.id === token) score += 8;
    else if (block.id.includes(token)) score += 4;
    else if (block.role === token) score += 3;
    else if (hay.includes(token)) score += 1;
  }
  return score;
}

export function searchMacroBlocks(
  registry: CompiledMacroRegistry,
  query: SearchMacroBlocksQuery,
) {
  const limit = Math.min(Math.max(query.limit ?? 8, 1), 32);
  const tokens = (query.q ?? '')
    .toLowerCase()
    .split(/[^a-z0-9-]+/)
    .filter(Boolean);

  const candidates: Array<{ hit: SearchMacroHit; score: number }> = [];
  for (const [ref, block] of Object.entries(registry.blocks)) {
    if (query.role && block.role !== query.role) continue;
    if (query.roles && query.roles.length > 0 && !query.roles.includes(block.role)) continue;
    if (query.family && block.family !== query.family) continue;
    if (query.tag && !block.tags.includes(query.tag)) continue;
    const score = scoreMacroBlock(block, tokens);
    if (tokens.length > 0 && score <= 0) continue;
    candidates.push({
      hit: {
        ref,
        id: block.id,
        role: block.role,
        family: block.family,
      },
      score,
    });
  }

  candidates.sort((a, b) => {
    const scoreDiff = b.score - a.score;
    if (scoreDiff !== 0) return scoreDiff;
    return a.hit.id < b.hit.id ? -1 : a.hit.id > b.hit.id ? 1 : 0;
  });

  const hits: SearchMacroHit[] = candidates.map(c => c.hit);

  const snapshot = registrySnapshotId(registry.revision);
  const fingerprint = compactFingerprint([
    'search',
    query.q ?? '',
    query.role ?? '',
    (query.roles ?? []).join(','),
    query.family ?? '',
    query.tag ?? '',
  ]);
  let start = 0;
  if (query.cursor) {
    const payload = validateMacroCursor(query.cursor, {
      fingerprint,
      snapshot,
      snapshotExists: true,
    });
    start = payload.offset;
  }

  const cursorFor = createCursorFactory({
    v: 1,
    fingerprint,
    snapshot,
  });

  return pageRecords(
    hits,
    start,
    {
      registryRevision: registry.revision,
      total: hits.length,
    },
    cursorFor,
    { maxItems: limit },
  );
}

export function listRecipeSummaries(registry: CompiledMacroRegistry) {
  return Object.entries(registry.recipes)
    .map(([ref, recipe]) => ({
      ref,
      id: recipe.id,
      kind: recipe.kind,
      profile: recipe.profile,
      pageCount: recipe.pages.length,
      entryPage: recipe.entryPage,
    }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

export function getRecipe(registry: CompiledMacroRegistry, idOrRef: Id | Ref) {
  const ref = resolveAlias(registry, idOrRef);
  const recipe = registry.recipes[ref];
  if (!recipe) {
    throw new MacroError('UNKNOWN_RECIPE', `Unknown macro recipe: ${idOrRef}`);
  }
  return recipe;
}

export function getProfile(registry: CompiledMacroRegistry, idOrRef: Id | Ref) {
  const ref = resolveAlias(registry, idOrRef);
  const profile = registry.profiles[ref];
  if (!profile) {
    throw new MacroError('UNKNOWN_PROFILE', `Unknown design profile: ${idOrRef}`);
  }
  return profile;
}
