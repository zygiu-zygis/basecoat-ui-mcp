import { createHash } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import {
  buildContextView,
  buildSessionsView,
} from './context.js';
import {
  MacroError,
  boundedMacroResult,
  createCursorFactory,
  pageRecords,
  validateMacroCursor,
} from './packets.js';
import {
  getBlock,
  getBlockSection,
  getCompiledRegistry,
  resolveAlias,
  searchMacroBlocks,
} from './registry.js';
import {
  LIMITS,
  blockSectionSchema,
  contextViewSchema,
  designPatchOpSchema,
  idSchema,
  refSchema,
  revisionSchema,
  scalarSchema,
} from './schema.js';
import {
  encodeDesignSnapshot,
  openFilesystemDesignStore,
  type FilesystemDesignStore,
} from './store.js';
import { validateDesign, validatePage } from './validate.js';
import type {
  CompiledMacroRegistry,
  DesignPatchOp,
  DesignSession,
  Id,
  MutationReceipt,
  Ref,
  Scalar,
} from './types.js';

const MESSAGE_CLIP = LIMITS.messageMax;
const SHA256_HEX = /^[a-f0-9]{64}$/;

function clip(message: string): string {
  return message.length <= MESSAGE_CLIP ? message : message.slice(0, MESSAGE_CLIP);
}

function compactFingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('\0'), 'utf8').digest('hex').slice(0, 32);
}

/**
 * Acknowledge a committed mutation without allowing PACKET_TOO_LARGE to hide it.
 * Oversized optional payload (for example validation reports) is omitted first;
 * a minimal revision receipt is always returned when the mutation already landed.
 */
function acknowledgeMutation(
  kind: 'begin_design' | 'apply_design_patch',
  receipt: MutationReceipt,
): CallToolResult {
  const base = {
    v: 1 as const,
    kind,
    designId: receipt.designId,
    revision: receipt.revision,
    operationId: receipt.operationId,
  };
  try {
    return boundedMacroResult({
      ...base,
      ...receipt.response,
    });
  } catch (error) {
    if (!(error instanceof MacroError) || error.code !== 'PACKET_TOO_LARGE') {
      throw error;
    }
  }

  const { validation: _validation, ...rest } = receipt.response;
  try {
    return boundedMacroResult({
      ...base,
      ...rest,
      truncated: true,
    });
  } catch (error) {
    if (!(error instanceof MacroError) || error.code !== 'PACKET_TOO_LARGE') {
      throw error;
    }
  }

  return boundedMacroResult({
    ...base,
    ...(typeof receipt.response.snapshot === 'string'
      ? { snapshot: receipt.response.snapshot }
      : {}),
    ...(typeof receipt.response.registryRevision === 'string'
      ? { registryRevision: receipt.response.registryRevision }
      : {}),
    truncated: true,
  });
}

export function macroErrorResult(
  error: unknown,
  extras: Record<string, unknown> = {},
): CallToolResult {
  let code = 'INTERNAL_ERROR';
  let message: string | undefined;
  const details: Record<string, unknown> = { ...extras };

  if (error instanceof MacroError) {
    code = error.code;
    if (error.message && error.message !== error.code) {
      message = clip(error.message);
    }
    for (const [key, value] of Object.entries(error.details)) {
      if (!(key in details)) details[key] = value;
    }
  } else if (error instanceof z.ZodError) {
    code = 'INVALID_INPUT';
    message = clip(error.issues[0]?.message ?? 'Invalid input');
  } else if (error instanceof Error && error.message) {
    message = clip(error.message);
  }

  const packet = {
    v: 1 as const,
    error: {
      code,
      ...(message ? { message } : {}),
      ...details,
    },
  };

  try {
    return boundedMacroResult(packet, true);
  } catch {
    return boundedMacroResult({ v: 1, error: { code } }, true);
  }
}

async function openStore(
  projectRoot: string,
  create: boolean,
): Promise<FilesystemDesignStore> {
  return openFilesystemDesignStore(projectRoot, { create });
}

async function openStoreForRead(
  projectRoot: string,
): Promise<FilesystemDesignStore | null> {
  try {
    return await openStore(projectRoot, false);
  } catch (error) {
    if (error instanceof MacroError && error.code === 'NOT_FOUND') return null;
    throw error;
  }
}

async function loadSessionRegistry(
  store: FilesystemDesignStore,
  session: DesignSession,
  packaged: CompiledMacroRegistry,
): Promise<CompiledMacroRegistry> {
  if (session.registryRevision === packaged.revision) {
    return packaged;
  }
  return store.loadRegistry(session.registryRevision);
}

function resolveProfileRef(
  registry: CompiledMacroRegistry,
  profile: string,
): Ref {
  return resolveAlias(registry, profile);
}

/** Soft op schema: recipe/block may be human aliases; resolved before store apply. */
const softIdOrRef = z.string().min(1).max(64);

export const softPatchOpSchema = z.discriminatedUnion('op', [
  z
    .object({
      op: z.literal('instantiate_recipe'),
      recipe: softIdOrRef,
      pagePrefix: idSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('attach_block'),
      page: idSchema,
      parent: idSchema,
      slot: idSchema,
      node: idSchema,
      block: softIdOrRef,
      order: z.number().int().min(0).max(LIMITS.orderMax).optional(),
      bindings: z.record(idSchema, idSchema).optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal('replace_block'),
      page: idSchema,
      node: idSchema,
      block: softIdOrRef,
    })
    .strict(),
  z
    .object({
      op: z.literal('remove_block'),
      page: idSchema,
      node: idSchema,
      removeSubtree: z.boolean(),
    })
    .strict(),
  z
    .object({
      op: z.literal('connect_ports'),
      page: idSchema,
      id: idSchema,
      relation: z.enum(['controls', 'data']),
      from: z.object({ node: idSchema, port: idSchema }).strict(),
      to: z.object({ node: idSchema, port: idSchema }).strict(),
    })
    .strict(),
  z
    .object({
      op: z.literal('disconnect_ports'),
      page: idSchema,
      connection: idSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('set_decision'),
      scope: z.enum(['project', 'page']),
      page: idSchema.optional(),
      key: z.string().min(1).max(LIMITS.decisionKeyMax),
      value: scalarSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('record_written'),
      page: idSchema,
      node: idSchema,
      sourcePath: z.string().min(1).max(LIMITS.pathMax),
      planDigest: softIdOrRef,
    })
    .strict(),
  z
    .object({
      op: z.literal('mark_plan_ready'),
      page: idSchema,
    })
    .strict(),
]);

function resolveAndValidateOps(
  registry: CompiledMacroRegistry,
  raw: unknown[],
): DesignPatchOp[] {
  if (raw.length < 1 || raw.length > LIMITS.operationsMax) {
    throw new MacroError('INVALID_INPUT', `operations must have 1..${LIMITS.operationsMax} entries`);
  }
  const operations: DesignPatchOp[] = [];
  for (let index = 0; index < raw.length; index++) {
    const soft = softPatchOpSchema.safeParse(raw[index]);
    if (!soft.success) {
      throw new MacroError(
        'INVALID_OPERATION',
        clip(`Operation ${index}: ${soft.error.issues[0]?.message ?? 'invalid'}`),
      );
    }
    const op = soft.data;
    let candidate: unknown = op;
    switch (op.op) {
      case 'instantiate_recipe':
        candidate = { ...op, recipe: resolveAlias(registry, op.recipe) };
        break;
      case 'attach_block':
      case 'replace_block':
        candidate = { ...op, block: resolveAlias(registry, op.block) };
        break;
      case 'record_written': {
        const digest = SHA256_HEX.test(op.planDigest)
          ? op.planDigest
          : resolveAlias(registry, op.planDigest);
        candidate = { ...op, planDigest: digest };
        break;
      }
      default:
        candidate = op;
        break;
    }
    const parsed = designPatchOpSchema.safeParse(candidate);
    if (!parsed.success) {
      throw new MacroError(
        'INVALID_OPERATION',
        clip(`Operation ${index}: ${parsed.error.issues[0]?.message ?? 'invalid'}`),
      );
    }
    operations.push(parsed.data as DesignPatchOp);
  }
  return operations;
}

function compatibleRoleFilter(
  role: string | undefined,
  slotAccepts: string[] | undefined,
): { role?: string; roles?: string[] } {
  if (slotAccepts && slotAccepts.length > 0) {
    if (role && !slotAccepts.includes(role)) {
      throw new MacroError('INCOMPATIBLE_ROLE', 'Requested role is not accepted by the target slot');
    }
    if (role) return { role };
    return { roles: slotAccepts };
  }
  return role ? { role } : {};
}

export const searchMacroBlocksInputShape = {
  q: z.string().max(200).optional().describe('Full-text search query across macro block IDs, descriptions, and tag sets.'),
  id: z.string().max(80).optional().describe('Alternative identifier or query alias.'),
  componentId: z.string().max(80).optional().describe('Alternative identifier or query alias.'),
  name: z.string().max(80).optional().describe('Alternative identifier or query alias.'),
  environment: z.enum(['html', 'astro', 'react', 'vue', 'svelte']).optional().describe('Target environment.'),
  role: z.string().max(LIMITS.roleMax).optional().describe('Macro role filter (e.g. "navigation", "canvas", "header", "region", "form").'),
  family: z.string().max(LIMITS.idMax).optional().describe('Block family filter (e.g. "layout", "workspace", "auth", "detail").'),
  tag: z.string().max(LIMITS.tagMax).optional().describe('Specific functional tag to filter by (e.g. "sidebar", "data-table", "kpi").'),
  designId: z.string().max(LIMITS.idMax).optional().describe('Active design session ID to search with session-specific block registry overrides.'),
  pageId: z.string().max(LIMITS.idMax).optional().describe('Target page ID in the design session when scoping to a slot.'),
  slotId: z.string().max(LIMITS.idMax).optional().describe('Target parent slot ID to filter compatible blocks by role.'),
  parentNodeId: z.string().max(LIMITS.idMax).optional().describe('Parent node ID hosting the target slot.'),
  limit: z.number().int().min(1).max(32).optional().describe('Maximum number of block manifests to return per page (1-32, default 10).'),
  cursor: z.string().max(LIMITS.cursorMaxBytes).optional().describe('Pagination cursor returned from a previous search.'),
};

export async function handleSearchMacroBlocks(
  input: z.infer<z.ZodObject<typeof searchMacroBlocksInputShape>>,
  projectRoot: string,
): Promise<CallToolResult> {
  try {
    const packaged = getCompiledRegistry();
    let registry = packaged;
    let slotAccepts: string[] | undefined;

    if (input.designId) {
      const designId = idSchema.parse(input.designId);
      const store = await openStoreForRead(projectRoot);
      if (!store) throw new MacroError('NOT_FOUND', `Design session not found: ${designId}`);
      const session = await store.read(designId);
      registry = await loadSessionRegistry(store, session, packaged);

      if (input.pageId && input.slotId && input.parentNodeId) {
        const page = session.pages[idSchema.parse(input.pageId)];
        if (!page) throw new MacroError('NOT_FOUND', `Unknown page: ${input.pageId}`);
        const parent = page.nodes[idSchema.parse(input.parentNodeId)];
        if (!parent) throw new MacroError('NOT_FOUND', `Unknown parent node: ${input.parentNodeId}`);
        const parentBlock = getBlock(registry, parent.block);
        const slot = parentBlock.slots.find(candidate => candidate.id === input.slotId);
        if (!slot) throw new MacroError('NOT_FOUND', `Unknown slot: ${input.slotId}`);
        slotAccepts = slot.accepts;
      }
    }

    const identifier = input.id ?? input.componentId ?? input.name;
    const query = input.q ?? identifier;
    const roleFilter = compatibleRoleFilter(input.role, slotAccepts);
    const packet = searchMacroBlocks(registry, {
      q: query,
      ...roleFilter,
      family: input.family,
      tag: input.tag,
      limit: input.limit,
      cursor: input.cursor,
    });

    return packet;
  } catch (error) {
    return macroErrorResult(error);
  }
}

export const getMacroBlockInputShape = {
  idOrRef: z.string().min(1).max(80).optional().describe('Canonical macro block ID or SHA-256 content reference hash.'),
  id: z.string().min(1).max(80).optional().describe('Alternative block identifier alias matching idOrRef.'),
  componentId: z.string().min(1).max(80).optional().describe('Alternative block identifier alias matching idOrRef.'),
  name: z.string().min(1).max(80).optional().describe('Alternative block identifier alias matching idOrRef.'),
  environment: z.enum(['html', 'astro', 'react', 'vue', 'svelte']).optional().describe('Target environment (defaults to html).'),
  section: blockSectionSchema.optional().describe('Specific block section to retrieve: "all", "manifest", "structure", "slots", "ports", "rules", "dependencies", or "provenance". Defaults to "all".'),
  designId: z.string().max(LIMITS.idMax).optional().describe('Active design session ID to retrieve session-bound block variants.'),
  cursor: z.string().max(LIMITS.cursorMaxBytes).optional().describe('Pagination cursor for large section reads exceeding packet limits.'),
};

export async function handleGetMacroBlock(
  input: z.infer<z.ZodObject<typeof getMacroBlockInputShape>>,
  projectRoot: string,
): Promise<CallToolResult> {
  try {
    const packaged = getCompiledRegistry();
    let registry = packaged;
    if (input.designId) {
      const designId = idSchema.parse(input.designId);
      const store = await openStoreForRead(projectRoot);
      if (!store) throw new MacroError('NOT_FOUND', `Design session not found: ${designId}`);
      const session = await store.read(designId);
      registry = await loadSessionRegistry(store, session, packaged);
    }
    const targetIdOrRef = input.idOrRef || input.id || input.componentId || input.name;
    if (!targetIdOrRef || targetIdOrRef.trim().length === 0) {
      return searchMacroBlocks(registry, { limit: 32 });
    }
    return getBlockSection(registry, {
      idOrRef: targetIdOrRef,
      section: input.section || 'all',
      cursor: input.cursor,
    });
  } catch (error) {
    return macroErrorResult(error);
  }
}

export const beginDesignInputShape = {
  designId: z.string().min(1).max(LIMITS.idMax).describe('Unique identifier for the new design session (slug format, e.g. "workspace-v1").'),
  profile: z.string().min(1).max(64).describe('Target rhythm/scaffold profile or recipe alias (e.g. "workspace-dashboard", "executive-dashboard").'),
  operationId: z.string().min(1).max(LIMITS.idMax).describe('Idempotency key for session creation.'),
  decisions: z
    .record(
      z.string().min(1).max(LIMITS.decisionKeyMax),
      z.union([z.string().max(LIMITS.scalarStringMax), z.number(), z.boolean(), z.null()]),
    )
    .optional()
    .describe('Initial architectural decisions for the session (e.g. density, stylePack, responsive breakpoints).'),
};

export async function handleBeginDesign(
  input: z.infer<z.ZodObject<typeof beginDesignInputShape>>,
  projectRoot: string,
): Promise<CallToolResult> {
  try {
    const designId = idSchema.parse(input.designId);
    const operationId = idSchema.parse(input.operationId);
    const registry = getCompiledRegistry();
    const profile = resolveProfileRef(registry, input.profile);
    refSchema.parse(profile);

    const decisions: Record<string, Scalar> | undefined = input.decisions
      ? Object.fromEntries(
          Object.entries(input.decisions).map(([key, value]) => {
            scalarSchema.parse(value);
            return [key, value as Scalar];
          }),
        )
      : undefined;

    const store = await openStore(projectRoot, true);
    const receipt = await store.create({
      designId,
      profile,
      operationId,
      registry,
      decisions,
    });

    return acknowledgeMutation('begin_design', receipt);
  } catch (error) {
    return macroErrorResult(error);
  }
}

export const getDesignContextInputShape = {
  view: contextViewSchema.optional().describe('Context perspective to retrieve: "sessions", "overview", "decisions", "graph", "rules", "focus", or "next". Defaults to "sessions".'),
  id: z.string().max(LIMITS.idMax).optional().describe('Alternative design session ID alias matching designId.'),
  componentId: z.string().max(LIMITS.idMax).optional().describe('Alternative design session ID alias matching designId.'),
  name: z.string().max(LIMITS.idMax).optional().describe('Alternative design session ID alias matching designId.'),
  environment: z.enum(['html', 'astro', 'react', 'vue', 'svelte']).optional().describe('Target environment.'),
  designId: z.string().max(LIMITS.idMax).optional().describe('Target design session ID (required for all views except "sessions").'),
  pageId: z.string().max(LIMITS.idMax).optional().describe('Target page ID within the design session (for "page" or "node" view).'),
  nodeId: z.string().max(LIMITS.idMax).optional().describe('Target node ID within the page (for "node" view).'),
  revision: z.number().int().min(0).max(LIMITS.revisionMax).optional().describe('Target design session revision to inspect (defaults to latest).'),
  cursor: z.string().max(LIMITS.cursorMaxBytes).optional().describe('Pagination cursor for paginated context listings.'),
};

export async function handleGetDesignContext(
  input: z.infer<z.ZodObject<typeof getDesignContextInputShape>>,
  projectRoot: string,
): Promise<CallToolResult> {
  try {
    const view = input.view ?? 'sessions';
    const packaged = getCompiledRegistry();

    if (view === 'sessions') {
      const store = await openStoreForRead(projectRoot);
      const summaries = store ? await store.listSessions() : [];
      const records = buildSessionsView(summaries);
      const snapshot = compactFingerprint(['context', 'sessions', JSON.stringify(records)]);
      const fingerprint = compactFingerprint(['context', 'sessions']);
      let start = 0;
      if (input.cursor) {
        const payload = validateMacroCursor(input.cursor, {
          fingerprint,
          snapshot,
          view: 'sessions',
          snapshotExists: true,
        });
        start = payload.offset;
      }
      const cursorFor = createCursorFactory({
        v: 1,
        fingerprint,
        snapshot,
        view: 'sessions',
      });
      return pageRecords(
        records,
        start,
        {
          kind: 'context',
          view: 'sessions',
          total: records.length,
          ...(store ? { projectRoot: store.getProjectRoot(), projectKey: store.getProjectKey() } : {}),
        },
        cursorFor,
      );
    }

    const rawDesignId = input.designId ?? input.id ?? input.componentId ?? input.name;
    if (!rawDesignId) {
      throw new MacroError('INVALID_INPUT', 'designId is required unless view is sessions');
    }

    const designId = idSchema.parse(rawDesignId);
    const store = await openStoreForRead(projectRoot);
    if (!store) throw new MacroError('NOT_FOUND', `Design session not found: ${designId}`);

    const revision =
      input.revision !== undefined ? revisionSchema.parse(input.revision) : undefined;
    const session = await store.read(designId, revision);
    const registry = await loadSessionRegistry(store, session, packaged);
    const snapshot = encodeDesignSnapshot(session.id, session.revision);
    const fingerprint = compactFingerprint([
      'context',
      view,
      input.pageId ?? '',
      input.nodeId ?? '',
    ]);

    const records = buildContextView(
      session,
      {
        view,
        designId,
        pageId: input.pageId ? idSchema.parse(input.pageId) : undefined,
        nodeId: input.nodeId ? idSchema.parse(input.nodeId) : undefined,
        revision: session.revision,
        cursor: input.cursor,
      },
      registry,
    );

    let start = 0;
    if (input.cursor) {
      const payload = validateMacroCursor(input.cursor, {
        fingerprint,
        snapshot,
        view,
        designRevision: session.revision,
        snapshotExists: true,
      });
      start = payload.offset;
    }

    const cursorFor = createCursorFactory({
      v: 1,
      fingerprint,
      snapshot,
      view,
      designRevision: session.revision,
    });

    return pageRecords(
      records,
      start,
      {
        kind: 'context',
        view,
        designId: session.id,
        designRevision: session.revision,
        registryRevision: session.registryRevision,
        projectRoot: store.getProjectRoot(),
        projectKey: store.getProjectKey(),
        total: records.length,
      },
      cursorFor,
    );
  } catch (error) {
    return macroErrorResult(error);
  }
}

export const applyDesignPatchInputShape = {
  designId: z.string().min(1).max(LIMITS.idMax).describe('Identifier of the design session to mutate.'),
  expectedRevision: z.number().int().min(0).max(LIMITS.revisionMax).describe('Expected current revision of the session to guarantee optimistic concurrency.'),
  operationId: z.string().min(1).max(LIMITS.idMax).describe('Idempotency key for this patch transaction.'),
  operations: z.array(softPatchOpSchema).min(1).max(LIMITS.operationsMax).describe('Ordered array of patch operations (add_node, remove_node, move_node, connect, disconnect, set_decision, set_binding).'),
};

export async function handleApplyDesignPatch(
  input: z.infer<z.ZodObject<typeof applyDesignPatchInputShape>>,
  projectRoot: string,
): Promise<CallToolResult> {
  try {
    const designId = idSchema.parse(input.designId);
    const operationId = idSchema.parse(input.operationId);
    const expectedRevision = revisionSchema.parse(input.expectedRevision);
    const packaged = getCompiledRegistry();
    const store = await openStore(projectRoot, true);

    let currentRevision: number | undefined;
    let registry = packaged;
    try {
      const current = await store.read(designId);
      currentRevision = current.revision;
      registry = await loadSessionRegistry(store, current, packaged);
    } catch (error) {
      if (!(error instanceof MacroError) || error.code !== 'NOT_FOUND') throw error;
    }

    const operations = resolveAndValidateOps(registry, input.operations);

    try {
      const receipt = await store.apply({
        designId,
        expectedRevision,
        operationId,
        operations,
      });
      return acknowledgeMutation('apply_design_patch', receipt);
    } catch (error) {
      if (error instanceof MacroError && error.code === 'REVISION_CONFLICT') {
        return macroErrorResult(error, {
          ...(currentRevision !== undefined ? { currentRevision } : {}),
        });
      }
      throw error;
    }
  } catch (error) {
    return macroErrorResult(error);
  }
}

export const validateDesignInputShape = {
  designId: z.string().min(1).max(LIMITS.idMax).describe('Identifier of the design session to validate.'),
  revision: z.number().int().min(0).max(LIMITS.revisionMax).optional().describe('Specific revision to validate (defaults to latest).'),
  pageId: z.string().max(LIMITS.idMax).optional().describe('Optionally scope validation to a single page within the session.'),
  mode: z.enum(['draft', 'complete']).default('draft').describe('Validation strictness mode: "draft" allows unbound slots; "complete" enforces zero open slots and full port connectivity.'),
  cursor: z.string().max(LIMITS.cursorMaxBytes).optional().describe('Pagination cursor if validation diagnostics exceed single response limit.'),
};

export async function handleValidateDesign(
  input: z.infer<z.ZodObject<typeof validateDesignInputShape>>,
  projectRoot: string,
): Promise<CallToolResult> {
  try {
    const designId = idSchema.parse(input.designId);
    const packaged = getCompiledRegistry();
    const store = await openStoreForRead(projectRoot);
    if (!store) throw new MacroError('NOT_FOUND', `Design session not found: ${designId}`);

    const revision =
      input.revision !== undefined ? revisionSchema.parse(input.revision) : undefined;
    const session = await store.read(designId, revision);
    const registry = await loadSessionRegistry(store, session, packaged);
    const mode = input.mode ?? 'draft';

    if (input.pageId) {
      idSchema.parse(input.pageId);
      if (!session.pages[input.pageId]) {
        throw new MacroError('NOT_FOUND', `Unknown page: ${input.pageId}`);
      }
    }

    const report = input.pageId
      ? validatePage(session.pages[input.pageId]!, session, registry, mode)
      : validateDesign(session, registry, mode);

    const snapshot = encodeDesignSnapshot(session.id, session.revision);
    const fingerprint = compactFingerprint(['validate', mode, input.pageId ?? '']);
    const diagnostics = report.diagnostics.map(item => ({
      code: item.code,
      severity: item.severity,
      message: item.message,
      ...(item.page ? { page: item.page } : {}),
      ...(item.node ? { node: item.node } : {}),
      ...(item.slot ? { slot: item.slot } : {}),
      ...(item.rule ? { rule: item.rule } : {}),
      repairs: item.repairs.slice(0, 2).map(repair => ({
        kind: repair.kind,
        message: repair.message,
        ...(repair.slot ? { slot: repair.slot } : {}),
        ...(repair.port ? { port: repair.port } : {}),
        ...(repair.candidateRefs
          ? { candidateRefs: repair.candidateRefs.slice(0, 3) }
          : {}),
      })),
    }));

    let start = 0;
    if (input.cursor) {
      const payload = validateMacroCursor(input.cursor, {
        fingerprint,
        snapshot,
        designRevision: session.revision,
        snapshotExists: true,
      });
      start = payload.offset;
    }

    const cursorFor = createCursorFactory({
      v: 1,
      fingerprint,
      snapshot,
      designRevision: session.revision,
    });

    return pageRecords(
      diagnostics,
      start,
      {
        kind: 'validation',
        designId: session.id,
        designRevision: session.revision,
        registryRevision: session.registryRevision,
        mode: report.mode,
        ok: report.ok,
        errorCount: report.errorCount,
        obligationCount: report.obligationCount,
        warningCount: report.warningCount,
        total: diagnostics.length,
      },
      cursorFor,
    );
  } catch (error) {
    return macroErrorResult(error);
  }
}

/** Eagerly load the packaged compiled registry so handlers share one snapshot. */
export function ensureMacroRegistryLoaded(): CompiledMacroRegistry {
  return getCompiledRegistry();
}

export type { Id };
