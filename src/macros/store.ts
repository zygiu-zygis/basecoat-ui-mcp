// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Persistent filesystem DesignStore under <projectRoot>/.basecoat/designer/.
//
// Layout:
//   registries/<registry-hash>.json
//   sessions/<design-id>/revisions/<revision>.json
//
// Atomic publish: write temp -> fsync -> link(temp, final) (no overwrite rename).
// Optimistic concurrency: expectedRevision + operationId with receipt idempotency.
//
// Open dependency: `./validate.ts` should export `validateDesign(session, registry, mode)`.
// Until that module exists, mark_plan_ready uses structuralFallbackValidate only.
import { createHash, randomUUID } from 'node:crypto';
import { constants } from 'node:fs';
import {
  link,
  lstat,
  mkdir,
  open,
  readdir,
  realpath,
  unlink,
} from 'node:fs/promises';
import type { FileHandle } from 'node:fs/promises';
import { dirname, join, resolve, sep } from 'node:path';
import { validateRegistry } from './compiler.js';
import { MacroError } from './packets.js';
import {
  applyDesignPatchInputSchema,
  beginDesignInputSchema,
  compiledMacroRegistrySchema,
  designSessionSchema,
  idSchema,
  LIMITS,
  refSchema,
  revisionSchema,
} from './schema.js';
import type {
  ApplyDesignPatchInput,
  BeginDesignInput,
  CompiledMacroRegistry,
  DesignPatchOp,
  DesignSession,
  DesignStore,
  Diagnostic,
  Id,
  MutationReceipt,
  NodeInstance,
  OperationReceipt,
  PagePlan,
  Ref,
  Scalar,
  SessionSummary,
  ValidationReport,
} from './types.js';

const DESIGNER_DIR = '.basecoat';
const DESIGNER_NAME = 'designer';
const REGISTRIES_DIR = 'registries';
const SESSIONS_DIR = 'sessions';
const REVISIONS_DIR = 'revisions';
const DIR_MODE = 0o700;
const FILE_MODE = 0o600;
const OPEN_READ = constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK;
const OPEN_WRITE = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;

/** Cursor / design snapshot encoding: `d:<designId>@<revision>`. */
export function encodeDesignSnapshot(designId: Id, revision: number): string {
  idSchema.parse(designId);
  revisionSchema.parse(revision);
  return `d:${designId}@${revision}`;
}

export function parseDesignSnapshot(snapshot: string): { designId: Id; revision: number } {
  const match = /^d:([a-z][a-z0-9-]*)@(\d+)$/.exec(snapshot);
  if (!match) throw new MacroError('INVALID_SNAPSHOT', 'Snapshot must be d:<designId>@<revision>');
  const designId = idSchema.parse(match[1]);
  const revision = revisionSchema.parse(Number(match[2]));
  return { designId, revision };
}

/** SHA-256 hex of canonicalized projectRoot; never derived from tool path args as-is. */
export function projectKeyFromRoot(canonicalProjectRoot: string): string {
  if (typeof canonicalProjectRoot !== 'string' || canonicalProjectRoot.length === 0) {
    throw new MacroError('INVALID_PROJECT_ROOT');
  }
  const key = createHash('sha256').update(canonicalProjectRoot, 'utf8').digest('hex');
  if (key.length > LIMITS.projectKeyMax) {
    throw new MacroError('PROJECT_KEY_TOO_LARGE');
  }
  return key;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}

function canonicalize(value: unknown): unknown {
  if (value === null) return null;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return value;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new MacroError('INVALID_PACKET');
    return value;
  }
  if (type !== 'object') throw new MacroError('INVALID_PACKET');
  if (Array.isArray(value)) return value.map(canonicalize);
  const obj = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(obj).sort()) {
    out[key] = canonicalize(obj[key]);
  }
  return out;
}

export function contentHash(value: unknown): Ref {
  return createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex');
}

/**
 * Expected signature for Phase graph-validation (`src/macros/validate.ts`).
 * Store calls this for mark_plan_ready / complete checks when the module is present.
 */
export type ValidateDesignFn = (
  session: DesignSession,
  registry: CompiledMacroRegistry,
  mode: 'draft' | 'complete',
) => ValidationReport | Promise<ValidationReport>;

async function loadValidateDesign(): Promise<ValidateDesignFn | null> {
  try {
    const mod = (await import('./validate.js')) as { validateDesign?: ValidateDesignFn };
    return typeof mod.validateDesign === 'function' ? mod.validateDesign : null;
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;
    if (code === 'ERR_MODULE_NOT_FOUND' || code === 'MODULE_NOT_FOUND') {
      return null;
    }
    throw error;
  }
}

function isErrno(error: unknown, code: string): boolean {
  return Boolean(error && typeof error === 'object' && (error as NodeJS.ErrnoException).code === code);
}

function wrapStorageError(error: unknown, fallbackCode: string): never {
  if (error instanceof MacroError) throw error;
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  throw new MacroError(
    fallbackCode,
    code ? `Storage failure (${code})` : 'Storage failure',
  );
}

async function assertInsideRoot(rootReal: string, candidate: string): Promise<string> {
  let real: string;
  try {
    real = await realpath(candidate);
  } catch (error) {
    wrapStorageError(error, 'PATH_ESCAPE');
  }
  const rootPrefix = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`;
  if (real !== rootReal && !real.startsWith(rootPrefix)) {
    throw new MacroError('PATH_ESCAPE', 'Path escapes project designer root');
  }
  return real;
}

async function ensureDirNoSymlink(rootReal: string, absolutePath: string): Promise<string> {
  const rootPrefix = rootReal.endsWith(sep) ? rootReal : `${rootReal}${sep}`;
  if (absolutePath !== rootReal && !absolutePath.startsWith(rootPrefix)) {
    throw new MacroError('PATH_ESCAPE', 'Refusing to create directory outside designer root');
  }
  const relative = absolutePath === rootReal ? '' : absolutePath.slice(rootPrefix.length);
  const parts = relative.split(sep).filter(Boolean);
  let current = rootReal;
  for (const part of parts) {
    current = join(current, part);
    try {
      const st = await lstat(current);
      if (st.isSymbolicLink()) {
        throw new MacroError('SYMLINK_REJECTED', 'Symlink directories are not allowed under designer');
      }
      if (!st.isDirectory()) {
        throw new MacroError('NOT_DIRECTORY', 'Expected a directory under designer');
      }
    } catch (error) {
      if (isErrno(error, 'ENOENT')) {
        try {
          await mkdir(current, { mode: DIR_MODE });
        } catch (mkdirError) {
          if (!isErrno(mkdirError, 'EEXIST')) wrapStorageError(mkdirError, 'STORAGE_FAILED');
          const st = await lstat(current);
          if (st.isSymbolicLink()) {
            throw new MacroError('SYMLINK_REJECTED', 'Symlink directories are not allowed under designer');
          }
          if (!st.isDirectory()) {
            throw new MacroError('NOT_DIRECTORY', 'Expected a directory under designer');
          }
        }
      } else if (error instanceof MacroError) {
        throw error;
      } else {
        wrapStorageError(error, 'STORAGE_FAILED');
      }
    }
  }
  return assertInsideRoot(rootReal, current);
}

async function readJsonFile<T>(
  absolutePath: string,
  parse: (raw: unknown) => T,
  designerRootReal: string,
): Promise<T> {
  await assertInsideRoot(designerRootReal, dirname(absolutePath));
  let handle;
  try {
    handle = await open(absolutePath, OPEN_READ);
    const st = await handle.stat();
    if (!st.isFile()) throw new MacroError('NOT_FILE', 'Expected a regular file');
    const text = await handle.readFile('utf8');
    let raw: unknown;
    try {
      raw = JSON.parse(text);
    } catch {
      throw new MacroError('CORRUPT_SNAPSHOT', 'Revision or registry JSON is corrupt');
    }
    return parse(raw);
  } catch (error) {
    if (error instanceof MacroError) throw error;
    if (isErrno(error, 'ENOENT')) throw new MacroError('NOT_FOUND');
    if (isErrno(error, 'ELOOP')) throw new MacroError('SYMLINK_REJECTED', 'Symlink files are not followed');
    throw wrapStorageError(error, 'STORAGE_FAILED');
  } finally {
    await handle?.close();
  }
}

/**
 * Crash-safe immutable publish: temp + fsync + link(final) + directory fsync. Never overwrite via rename.
 * Temp names are never read by list/read paths.
 */
type DirectorySync = (handle: FileHandle) => Promise<void>;

function directorySyncUnsupported(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return process.platform === 'win32' && ['EBADF', 'EINVAL', 'ENOTSUP', 'EPERM'].includes(code ?? '');
}

let publicationDurabilityFailures = 0;

/** Process-local signal for a rare post-link directory sync failure. */
export function getPublicationDurabilityFailureCount(): number {
  return publicationDurabilityFailures;
}

export async function publishImmutableJson(
  designerRootReal: string,
  finalPath: string,
  value: unknown,
  syncDirectory: DirectorySync = async handle => handle.sync(),
): Promise<void> {
  const dir = dirname(finalPath);
  await ensureDirNoSymlink(designerRootReal, dir);
  await assertInsideRoot(designerRootReal, dir);

  const payload = `${canonicalJson(value)}\n`;
  const tempPath = join(dir, `.${randomUUID()}.tmp`);
  let handle;
  let dirHandle;
  try {
    handle = await open(tempPath, OPEN_WRITE, FILE_MODE);
    await handle.writeFile(payload, 'utf8');
    await handle.sync();
    await handle.close();
    handle = undefined;
    let directorySyncSupported = true;
    dirHandle = await open(dir, constants.O_RDONLY);
    try {
      await syncDirectory(dirHandle);
    } catch (error) {
      if (!directorySyncUnsupported(error)) throw error;
      directorySyncSupported = false;
    }
    try {
      await link(tempPath, finalPath);
    } catch (error) {
      if (isErrno(error, 'EEXIST')) {
        throw new MacroError('REVISION_CONFLICT', 'Immutable target already exists');
      }
      wrapStorageError(error, 'STORAGE_FAILED');
    }
    if (directorySyncSupported) {
      try {
        await syncDirectory(dirHandle);
      } catch {
        // The immutable target is already committed and visible. Reporting the
        // mutation as failed would invite an unsafe retry. Expose the rare
        // durability uncertainty through the process-local counter instead.
        publicationDurabilityFailures++;
      }
    }
  } catch (error) {
    if (error instanceof MacroError) throw error;
    wrapStorageError(error, 'STORAGE_FAILED');
  } finally {
    await handle?.close().catch(() => undefined);
    await dirHandle?.close().catch(() => undefined);
    await unlink(tempPath).catch(() => undefined);
  }
}

function demotePage(page: PagePlan): void {
  if (page.status === 'plan-ready') page.status = 'draft';
}

function cloneSession(session: DesignSession): DesignSession {
  return structuredClone(session);
}

function pageStatusSummary(pages: Record<Id, PagePlan>): SessionSummary['status'] {
  const statuses = Object.values(pages).map(page => page.status);
  if (statuses.length === 0) return 'draft';
  const allDraft = statuses.every(status => status === 'draft');
  const allReady = statuses.every(status => status === 'plan-ready');
  if (allDraft) return 'draft';
  if (allReady) return 'plan-ready';
  return 'mixed';
}

function assertDecisionValue(
  key: string,
  value: Scalar,
  spec: CompiledMacroRegistry['profiles'][string]['allowedDecisions'][string] | undefined,
): void {
  if (!spec) {
    throw new MacroError('HARD_VIOLATION', `Decision key is not allowed by profile: ${key}`);
  }
  switch (spec.type) {
    case 'string':
      if (typeof value !== 'string') {
        throw new MacroError('HARD_VIOLATION', `Decision ${key} must be a string`);
      }
      break;
    case 'number':
      if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new MacroError('HARD_VIOLATION', `Decision ${key} must be a finite number`);
      }
      break;
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new MacroError('HARD_VIOLATION', `Decision ${key} must be a boolean`);
      }
      break;
    case 'null':
      if (value !== null) {
        throw new MacroError('HARD_VIOLATION', `Decision ${key} must be null`);
      }
      break;
    case 'enum':
      if (!spec.values || !spec.values.some(candidate => Object.is(candidate, value))) {
        throw new MacroError('HARD_VIOLATION', `Decision ${key} is not an allowed enum value`);
      }
      break;
    default: {
      const _exhaustive: never = spec.type;
      void _exhaustive;
      throw new MacroError('HARD_VIOLATION', `Unknown decision type for ${key}`);
    }
  }
}

function collectSubtree(page: PagePlan, rootId: Id): Set<Id> {
  const ids = new Set<Id>();
  const visit = (id: Id) => {
    if (ids.has(id)) return;
    ids.add(id);
    for (const node of Object.values(page.nodes)) {
      if (node.parent?.node === id) visit(node.id);
    }
  };
  visit(rootId);
  return ids;
}

function nextSiblingOrder(page: PagePlan, parentId: Id, slotId: Id): number {
  let max = -1;
  for (const node of Object.values(page.nodes)) {
    if (node.parent?.node === parentId && node.parent.slot === slotId) {
      max = Math.max(max, node.parent.order);
    }
  }
  return max + 1;
}

function countSlotOccupants(page: PagePlan, parentId: Id, slotId: Id): number {
  let count = 0;
  for (const node of Object.values(page.nodes)) {
    if (node.parent?.node === parentId && node.parent.slot === slotId) count += 1;
  }
  return count;
}

function remapPrefixedId(prefix: Id, id: Id): Id {
  return idSchema.parse(`${prefix}-${id}`);
}

function applyInstantiateRecipe(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  op: Extract<DesignPatchOp, { op: 'instantiate_recipe' }>,
): void {
  const recipe = registry.recipes[op.recipe];
  if (!recipe) throw new MacroError('HARD_VIOLATION', `Unknown recipe ref: ${op.recipe}`);
  if (recipe.profile !== session.profile) {
    throw new MacroError('HARD_VIOLATION', 'Recipe profile does not match session profile');
  }
  const pageIdMap = new Map<Id, Id>();
  for (const page of recipe.pages) {
    const newId = remapPrefixedId(op.pagePrefix, page.id);
    if (Object.hasOwn(session.pages, newId)) {
      throw new MacroError('HARD_VIOLATION', `Page id already exists: ${newId}`);
    }
    pageIdMap.set(page.id, newId);
  }
  if (Object.keys(session.pages).length + recipe.pages.length > LIMITS.pagesMax) {
    throw new MacroError('HARD_VIOLATION', `At most ${LIMITS.pagesMax} pages`);
  }
  for (const page of recipe.pages) {
    const newPageId = pageIdMap.get(page.id)!;
    const cloned: PagePlan = structuredClone(page);
    cloned.id = newPageId;
    cloned.recipe = op.recipe;
    cloned.status = 'draft';
    session.pages[newPageId] = cloned;
  }
  for (const link of recipe.routeLinks) {
    const fromPage = pageIdMap.get(link.fromPage);
    const toPage = pageIdMap.get(link.toPage);
    if (!fromPage || !toPage) {
      throw new MacroError('HARD_VIOLATION', 'Recipe routeLink references unknown page');
    }
    if (session.routeLinks.length >= LIMITS.routeLinksMax) {
      throw new MacroError('HARD_VIOLATION', `At most ${LIMITS.routeLinksMax} routeLinks`);
    }
    session.routeLinks.push({
      fromPage,
      fromAnchor: structuredClone(link.fromAnchor),
      toPage,
    });
  }
}

function applyAttachBlock(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  op: Extract<DesignPatchOp, { op: 'attach_block' }>,
): void {
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  if (Object.hasOwn(page.nodes, op.node)) {
    throw new MacroError('HARD_VIOLATION', `Node id already exists: ${op.node}`);
  }
  if (Object.keys(page.nodes).length >= LIMITS.nodesMax) {
    throw new MacroError('HARD_VIOLATION', `At most ${LIMITS.nodesMax} nodes`);
  }
  const parent = page.nodes[op.parent];
  if (!parent) throw new MacroError('HARD_VIOLATION', `Unknown parent node: ${op.parent}`);
  const parentBlock = registry.blocks[parent.block];
  if (!parentBlock) throw new MacroError('HARD_VIOLATION', `Parent block missing from registry: ${parent.block}`);
  const slot = parentBlock.slots.find(candidate => candidate.id === op.slot);
  if (!slot) throw new MacroError('HARD_VIOLATION', `Unknown slot on parent: ${op.slot}`);
  const childBlock = registry.blocks[op.block];
  if (!childBlock) throw new MacroError('HARD_VIOLATION', `Unknown block ref: ${op.block}`);
  if (slot.accepts.length > 0 && !slot.accepts.includes(childBlock.role)) {
    throw new MacroError('HARD_VIOLATION', `Block role ${childBlock.role} is not accepted by slot ${op.slot}`);
  }
  const occupants = countSlotOccupants(page, op.parent, op.slot);
  if (occupants >= slot.max) {
    throw new MacroError('HARD_VIOLATION', `Slot ${op.slot} is at max occupancy`);
  }
  const order = op.order ?? nextSiblingOrder(page, op.parent, op.slot);
  if (order > LIMITS.orderMax) {
    throw new MacroError('HARD_VIOLATION', 'Node order exceeds limit');
  }
  demotePage(page);
  const node: NodeInstance = {
    id: op.node,
    block: op.block,
    parent: { node: op.parent, slot: op.slot, order },
    bindings: op.bindings ? { ...op.bindings } : {},
  };
  page.nodes[op.node] = node;
}

function applyReplaceBlock(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  op: Extract<DesignPatchOp, { op: 'replace_block' }>,
): void {
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  const node = page.nodes[op.node];
  if (!node) throw new MacroError('HARD_VIOLATION', `Unknown node: ${op.node}`);
  if (!registry.blocks[op.block]) {
    throw new MacroError('HARD_VIOLATION', `Unknown block ref: ${op.block}`);
  }
  demotePage(page);
  node.block = op.block;
}

function applyRemoveBlock(
  session: DesignSession,
  op: Extract<DesignPatchOp, { op: 'remove_block' }>,
): void {
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  const node = page.nodes[op.node];
  if (!node) throw new MacroError('HARD_VIOLATION', `Unknown node: ${op.node}`);
  if (page.root === op.node) {
    throw new MacroError('HARD_VIOLATION', 'Cannot remove the page root node');
  }
  const children = Object.values(page.nodes).filter(candidate => candidate.parent?.node === op.node);
  if (children.length > 0 && !op.removeSubtree) {
    throw new MacroError('HARD_VIOLATION', 'Node has children; set removeSubtree to true');
  }
  const removeIds = op.removeSubtree ? collectSubtree(page, op.node) : new Set<Id>([op.node]);
  demotePage(page);
  for (const id of removeIds) delete page.nodes[id];
  page.connections = page.connections.filter(
    connection => !removeIds.has(connection.from.node) && !removeIds.has(connection.to.node),
  );
  session.checkpoints = session.checkpoints.filter(
    checkpoint => checkpoint.page !== op.page || !removeIds.has(checkpoint.node),
  );
}

function applyConnectPorts(
  session: DesignSession,
  op: Extract<DesignPatchOp, { op: 'connect_ports' }>,
): void {
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  if (page.connections.some(connection => connection.id === op.id)) {
    throw new MacroError('HARD_VIOLATION', `Connection id already exists: ${op.id}`);
  }
  if (page.connections.length >= LIMITS.connectionsMax) {
    throw new MacroError('HARD_VIOLATION', `At most ${LIMITS.connectionsMax} connections`);
  }
  if (!page.nodes[op.from.node]) {
    throw new MacroError('HARD_VIOLATION', `Unknown from node: ${op.from.node}`);
  }
  if (!page.nodes[op.to.node]) {
    throw new MacroError('HARD_VIOLATION', `Unknown to node: ${op.to.node}`);
  }
  demotePage(page);
  page.connections.push({
    id: op.id,
    relation: op.relation,
    from: { ...op.from },
    to: { ...op.to },
  });
}

function applyDisconnectPorts(
  session: DesignSession,
  op: Extract<DesignPatchOp, { op: 'disconnect_ports' }>,
): void {
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  const index = page.connections.findIndex(connection => connection.id === op.connection);
  if (index < 0) {
    throw new MacroError('HARD_VIOLATION', `Unknown connection: ${op.connection}`);
  }
  demotePage(page);
  page.connections.splice(index, 1);
}

function applySetDecision(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  op: Extract<DesignPatchOp, { op: 'set_decision' }>,
): void {
  const profile = registry.profiles[session.profile];
  if (!profile) throw new MacroError('HARD_VIOLATION', 'Session profile missing from pinned registry');
  const spec = profile.allowedDecisions[op.key];
  assertDecisionValue(op.key, op.value, spec);
  if (op.scope === 'project') {
    if (op.page !== undefined) {
      throw new MacroError('HARD_VIOLATION', 'Project decision must not include page');
    }
    const previous = Object.hasOwn(session.projectDecisions, op.key)
      ? session.projectDecisions[op.key]
      : undefined;
    session.projectDecisions[op.key] = op.value;
    if (!Object.is(previous, op.value)) {
      for (const page of Object.values(session.pages)) {
        const hasPageOverride = Object.hasOwn(page.decisions, op.key);
        const affectsPage = !hasPageOverride || spec?.allowPageOverride === false;
        if (!affectsPage) continue;
        demotePage(page);
        session.checkpoints = session.checkpoints.filter(
          checkpoint => checkpoint.page !== page.id,
        );
      }
    }
    return;
  }
  if (!op.page) throw new MacroError('HARD_VIOLATION', 'Page decision requires page id');
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  if (spec && !spec.allowPageOverride && Object.hasOwn(session.projectDecisions, op.key)) {
    throw new MacroError('HARD_VIOLATION', `Decision ${op.key} does not allow page override`);
  }
  demotePage(page);
  page.decisions[op.key] = op.value;
}

function applyRecordWritten(
  session: DesignSession,
  nextRevision: number,
  op: Extract<DesignPatchOp, { op: 'record_written' }>,
): void {
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  if (!page.nodes[op.node]) throw new MacroError('HARD_VIOLATION', `Unknown node: ${op.node}`);
  if (session.checkpoints.length >= LIMITS.checkpointsMax) {
    throw new MacroError('HARD_VIOLATION', `At most ${LIMITS.checkpointsMax} checkpoints`);
  }
  refSchema.parse(op.planDigest);
  session.checkpoints.push({
    page: op.page,
    node: op.node,
    sourcePath: op.sourcePath,
    planDigest: op.planDigest,
    reportedAtRevision: nextRevision,
  });
}

function structuralFallbackValidate(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  mode: 'draft' | 'complete',
): ValidationReport {
  const diagnostics: Diagnostic[] = [];
  for (const page of Object.values(session.pages)) {
    if (!Object.hasOwn(page.nodes, page.root)) {
      diagnostics.push({
        code: 'MISSING_ROOT',
        severity: 'error',
        page: page.id,
        message: 'Page root node is missing',
        repairs: [],
      });
    }
    for (const node of Object.values(page.nodes)) {
      if (!registry.blocks[node.block]) {
        diagnostics.push({
          code: 'MISSING_BLOCK',
          severity: 'error',
          page: page.id,
          node: node.id,
          message: 'Node block ref is absent from pinned registry',
          repairs: [{ kind: 'replace_block', message: 'Replace with a registry block' }],
        });
      }
      if (node.parent && !page.nodes[node.parent.node]) {
        diagnostics.push({
          code: 'MISSING_PARENT',
          severity: 'error',
          page: page.id,
          node: node.id,
          message: 'Node parent is missing',
          repairs: [],
        });
      }
    }
    for (const connection of page.connections) {
      if (!page.nodes[connection.from.node] || !page.nodes[connection.to.node]) {
        diagnostics.push({
          code: 'DANGLING_CONNECTION',
          severity: 'error',
          page: page.id,
          message: `Connection ${connection.id} references a missing node`,
          repairs: [{ kind: 'connect_ports', message: 'Reconnect valid endpoints' }],
        });
      }
    }
  }
  if (mode === 'complete' && !registry.profiles[session.profile]) {
    diagnostics.push({
      code: 'MISSING_PROFILE',
      severity: 'error',
      message: 'Pinned registry is missing the session profile',
      repairs: [],
    });
  }
  // Without validate.ts, do not block plan-ready on a synthetic obligation.
  if (mode === 'complete') {
    diagnostics.push({
      code: 'VALIDATE_MODULE_PENDING',
      severity: 'warning',
      message: 'Full graph validation awaits src/macros/validate.ts; structural checks only',
      repairs: [],
    });
  }
  const errorCount = diagnostics.filter(item => item.severity === 'error').length;
  const obligationCount = diagnostics.filter(item => item.severity === 'obligation').length;
  const warningCount = diagnostics.filter(item => item.severity === 'warning').length;
  return {
    mode,
    ok: errorCount === 0,
    errorCount,
    obligationCount,
    warningCount,
    diagnostics,
  };
}

async function runValidation(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  mode: 'draft' | 'complete',
): Promise<ValidationReport> {
  const validateDesign = await loadValidateDesign();
  if (validateDesign) {
    return validateDesign(session, registry, mode);
  }
  return structuralFallbackValidate(session, registry, mode);
}

async function applyMarkPlanReady(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  op: Extract<DesignPatchOp, { op: 'mark_plan_ready' }>,
): Promise<ValidationReport> {
  const page = session.pages[op.page];
  if (!page) throw new MacroError('HARD_VIOLATION', `Unknown page: ${op.page}`);
  const report = await runValidation(session, registry, 'complete');
  const pageErrors = report.diagnostics.filter(
    item => item.severity === 'error' && (item.page === undefined || item.page === op.page),
  );
  const pageObligations = report.diagnostics.filter(
    item => item.severity === 'obligation' && (item.page === undefined || item.page === op.page),
  );
  if (pageErrors.length > 0) {
    throw new MacroError('HARD_VIOLATION', pageErrors[0]!.message);
  }
  // When validate.ts is present, complete-mode obligations block plan-ready.
  // Draft patches may leave obligations outstanding; mark_plan_ready may not.
  const validateDesign = await loadValidateDesign();
  if (validateDesign && pageObligations.length > 0) {
    throw new MacroError('HARD_VIOLATION', pageObligations[0]!.message);
  }
  page.status = 'plan-ready';
  return report;
}

async function applyPatchesInMemory(
  session: DesignSession,
  registry: CompiledMacroRegistry,
  operations: DesignPatchOp[],
  nextRevision: number,
): Promise<{ validation?: ValidationReport }> {
  let validation: ValidationReport | undefined;
  for (const operation of operations) {
    switch (operation.op) {
      case 'instantiate_recipe':
        applyInstantiateRecipe(session, registry, operation);
        break;
      case 'attach_block':
        applyAttachBlock(session, registry, operation);
        break;
      case 'replace_block':
        applyReplaceBlock(session, registry, operation);
        break;
      case 'remove_block':
        applyRemoveBlock(session, operation);
        break;
      case 'connect_ports':
        applyConnectPorts(session, operation);
        break;
      case 'disconnect_ports':
        applyDisconnectPorts(session, operation);
        break;
      case 'set_decision':
        applySetDecision(session, registry, operation);
        break;
      case 'record_written':
        applyRecordWritten(session, nextRevision, operation);
        break;
      case 'mark_plan_ready':
        validation = await applyMarkPlanReady(session, registry, operation);
        break;
      default: {
        const _exhaustive: never = operation;
        void _exhaustive;
        throw new MacroError('HARD_VIOLATION', 'Unknown patch operation');
      }
    }
  }
  designSessionSchema.parse(session);
  return { validation };
}

function receiptToMutation(
  designId: Id,
  operationId: Id,
  receipt: OperationReceipt,
): MutationReceipt {
  return {
    designId,
    revision: receipt.committedRevision,
    operationId,
    response: receipt.response,
  };
}

function createRequestHash(input: BeginDesignInput): Ref {
  return contentHash({
    kind: 'begin_design',
    designId: input.designId,
    profile: input.profile,
    decisions: input.decisions ?? {},
    registryRevision: input.registry.revision,
  });
}

function applyRequestHash(input: ApplyDesignPatchInput): Ref {
  return contentHash({
    kind: 'apply_design_patch',
    designId: input.designId,
    expectedRevision: input.expectedRevision,
    operations: input.operations,
  });
}

export class FilesystemDesignStore implements DesignStore {
  private readonly designerRootReal: string;
  private readonly projectKey: string;
  /** Serialize mutations per process to reduce lost-update races on the same design. */
  private readonly locks = new Map<Id, Promise<unknown>>();

  private constructor(designerRootReal: string, projectKey: string) {
    this.designerRootReal = designerRootReal;
    this.projectKey = projectKey;
  }

  /**
   * Open the project designer store.
   * `create: true` (default) ensures directories for mutations.
   * `create: false` never creates paths; fails with NOT_FOUND when the store is absent
   * so pure list/read tools stay side-effect free.
   */
  static async open(
    projectRoot: string,
    options: { create?: boolean } = {},
  ): Promise<FilesystemDesignStore> {
    const create = options.create ?? true;
    if (typeof projectRoot !== 'string' || projectRoot.trim() === '') {
      throw new MacroError('INVALID_PROJECT_ROOT');
    }
    let projectRootReal: string;
    try {
      projectRootReal = await realpath(resolve(projectRoot));
    } catch (error) {
      wrapStorageError(error, 'INVALID_PROJECT_ROOT');
    }
    const st = await lstat(projectRootReal);
    if (!st.isDirectory()) throw new MacroError('INVALID_PROJECT_ROOT', 'projectRoot must be a directory');

    const basecoatPath = join(projectRootReal, DESIGNER_DIR);
    const designerPath = join(basecoatPath, DESIGNER_NAME);
    let designerRootReal: string;

    if (create) {
      await ensureDirNoSymlink(projectRootReal, basecoatPath);
      designerRootReal = await ensureDirNoSymlink(projectRootReal, designerPath);
      await ensureDirNoSymlink(designerRootReal, join(designerRootReal, REGISTRIES_DIR));
      await ensureDirNoSymlink(designerRootReal, join(designerRootReal, SESSIONS_DIR));
    } else {
      try {
        const designerSt = await lstat(designerPath);
        if (designerSt.isSymbolicLink()) {
          throw new MacroError('SYMLINK_REJECTED', 'Symlink designer roots are not allowed');
        }
        if (!designerSt.isDirectory()) {
          throw new MacroError('NOT_DIRECTORY', 'Designer path is not a directory');
        }
        designerRootReal = await assertInsideRoot(projectRootReal, designerPath);
      } catch (error) {
        if (error instanceof MacroError) throw error;
        if (isErrno(error, 'ENOENT')) {
          throw new MacroError('NOT_FOUND', 'No designer store under project root');
        }
        wrapStorageError(error, 'STORAGE_FAILED');
      }
    }

    const projectKey = projectKeyFromRoot(projectRootReal);
    return new FilesystemDesignStore(designerRootReal, projectKey);
  }

  /** Load a pinned compiled registry revision from the designer store. */
  async loadRegistry(revision: Ref): Promise<CompiledMacroRegistry> {
    return this.readRegistry(revision);
  }

  getProjectKey(): string {
    return this.projectKey;
  }

  getDesignerRoot(): string {
    return this.designerRootReal;
  }

  private registryPath(revision: Ref): string {
    refSchema.parse(revision);
    return join(this.designerRootReal, REGISTRIES_DIR, `${revision}.json`);
  }

  private sessionDir(designId: Id): string {
    idSchema.parse(designId);
    return join(this.designerRootReal, SESSIONS_DIR, designId);
  }

  private revisionPath(designId: Id, revision: number): string {
    revisionSchema.parse(revision);
    return join(this.sessionDir(designId), REVISIONS_DIR, `${revision}.json`);
  }

  private async withDesignLock<T>(designId: Id, fn: () => Promise<T>): Promise<T> {
    const previous = this.locks.get(designId) ?? Promise.resolve();
    let release!: () => void;
    const gate = new Promise<void>(resolveGate => {
      release = resolveGate;
    });
    const current = previous.catch(() => undefined).then(() => gate);
    this.locks.set(designId, current);
    await previous.catch(() => undefined);
    try {
      return await fn();
    } finally {
      release();
      if (this.locks.get(designId) === current) {
        this.locks.delete(designId);
      }
    }
  }

  private async listRevisionNumbers(designId: Id): Promise<number[]> {
    const revisionsDir = join(this.sessionDir(designId), REVISIONS_DIR);
    let entries: string[];
    try {
      const st = await lstat(revisionsDir);
      if (st.isSymbolicLink()) throw new MacroError('SYMLINK_REJECTED');
      if (!st.isDirectory()) throw new MacroError('NOT_DIRECTORY');
      await assertInsideRoot(this.designerRootReal, revisionsDir);
      entries = await readdir(revisionsDir);
    } catch (error) {
      if (isErrno(error, 'ENOENT')) return [];
      if (error instanceof MacroError) throw error;
      wrapStorageError(error, 'STORAGE_FAILED');
    }
    const revisions: number[] = [];
    for (const name of entries) {
      // Never treat temp publish files as revisions.
      if (!/^\d+\.json$/.test(name)) continue;
      const revision = Number(name.slice(0, -'.json'.length));
      if (!Number.isSafeInteger(revision) || revision < 0 || revision > LIMITS.revisionMax) continue;
      revisions.push(revision);
    }
    return revisions.sort((a, b) => a - b);
  }

  private async latestRevision(designId: Id): Promise<number | undefined> {
    const revisions = await this.listRevisionNumbers(designId);
    return revisions.length === 0 ? undefined : revisions[revisions.length - 1];
  }

  private async receiptAfterPublishConflict(
    designId: Id,
    operationId: Id,
    requestHash: Ref,
  ): Promise<MutationReceipt | undefined> {
    const latest = await this.latestRevision(designId);
    if (latest === undefined) return undefined;
    const session = await this.readRevision(designId, latest);
    const receipt = session.receipts[operationId];
    if (!receipt) return undefined;
    if (receipt.requestHash !== requestHash) {
      throw new MacroError('OPERATION_ID_REUSED', 'operationId was used with a different request');
    }
    return receiptToMutation(designId, operationId, receipt);
  }

  private async readRevision(designId: Id, revision: number): Promise<DesignSession> {
    const path = this.revisionPath(designId, revision);
    const session = await readJsonFile(path, raw => designSessionSchema.parse(raw), this.designerRootReal);
    if (session.id !== designId) {
      throw new MacroError('CORRUPT_SNAPSHOT', 'Session id does not match path');
    }
    if (session.revision !== revision) {
      throw new MacroError('CORRUPT_SNAPSHOT', 'Session revision does not match path');
    }
    if (session.projectKey !== this.projectKey) {
      throw new MacroError('PROJECT_MISMATCH', 'Session projectKey does not match store root');
    }
    return session;
  }

  private async readRegistry(revision: Ref): Promise<CompiledMacroRegistry> {
    const path = this.registryPath(revision);
    const registry = await readJsonFile(
      path,
      raw => compiledMacroRegistrySchema.parse(raw),
      this.designerRootReal,
    );
    if (registry.revision !== revision) {
      throw new MacroError('CORRUPT_SNAPSHOT', 'Registry revision does not match path');
    }
    const integrity = validateRegistry(registry);
    const hard = integrity.find(diagnostic => diagnostic.severity === 'error');
    if (hard) {
      throw new MacroError(
        'CORRUPT_SNAPSHOT',
        hard.message || `Pinned registry failed integrity check: ${hard.code}`,
      );
    }
    return registry;
  }

  private async pinRegistry(registry: CompiledMacroRegistry): Promise<void> {
    const parsed = compiledMacroRegistrySchema.parse(registry);
    const path = this.registryPath(parsed.revision);
    try {
      await this.readRegistry(parsed.revision);
      return;
    } catch (error) {
      if (!(error instanceof MacroError) || error.code !== 'NOT_FOUND') throw error;
    }
    try {
      await publishImmutableJson(this.designerRootReal, path, parsed);
    } catch (error) {
      if (error instanceof MacroError && error.code === 'REVISION_CONFLICT') {
        // Another writer published the same content-addressed bundle.
        await this.readRegistry(parsed.revision);
        return;
      }
      throw error;
    }
  }

  async listSessions(): Promise<SessionSummary[]> {
    const sessionsRoot = join(this.designerRootReal, SESSIONS_DIR);
    let designIds: string[];
    try {
      await assertInsideRoot(this.designerRootReal, sessionsRoot);
      designIds = await readdir(sessionsRoot);
    } catch (error) {
      if (isErrno(error, 'ENOENT')) return [];
      wrapStorageError(error, 'STORAGE_FAILED');
    }
    const summaries: SessionSummary[] = [];
    for (const name of designIds) {
      if (!idSchema.safeParse(name).success) continue;
      const designId = name as Id;
      try {
        const st = await lstat(this.sessionDir(designId));
        if (st.isSymbolicLink() || !st.isDirectory()) continue;
        const latest = await this.latestRevision(designId);
        if (latest === undefined) continue;
        const session = await this.readRevision(designId, latest);
        summaries.push({
          id: session.id,
          revision: session.revision,
          profile: session.profile,
          pageCount: Object.keys(session.pages).length,
          status: pageStatusSummary(session.pages),
        });
      } catch {
        // Skip unreadable / corrupt session dirs rather than failing the whole listing.
        continue;
      }
    }
    return summaries.sort((a, b) => a.id.localeCompare(b.id));
  }

  async read(designId: Id, revision?: number): Promise<DesignSession> {
    idSchema.parse(designId);
    if (revision !== undefined) revisionSchema.parse(revision);
    const target = revision ?? (await this.latestRevision(designId));
    if (target === undefined) throw new MacroError('NOT_FOUND', `Design session not found: ${designId}`);
    return this.readRevision(designId, target);
  }

  async create(input: BeginDesignInput): Promise<MutationReceipt> {
    const parsed = beginDesignInputSchema.parse(input) as BeginDesignInput;
    return this.withDesignLock(parsed.designId, async () => {
      const requestHash = createRequestHash(parsed);
      const existingRevision = await this.latestRevision(parsed.designId);
      if (existingRevision !== undefined) {
        const existing = await this.readRevision(parsed.designId, existingRevision);
        const receipt = existing.receipts[parsed.operationId];
        if (receipt) {
          if (receipt.requestHash !== requestHash) {
            throw new MacroError('OPERATION_ID_REUSED', 'operationId was used with a different request');
          }
          return receiptToMutation(parsed.designId, parsed.operationId, receipt);
        }
        throw new MacroError('DESIGN_EXISTS', `Design session already exists: ${parsed.designId}`);
      }

      // Registry revision identity is owned by the compiler; store pins by that ref.
      if (!parsed.registry.profiles[parsed.profile]) {
        throw new MacroError('HARD_VIOLATION', `Profile ref missing from registry: ${parsed.profile}`);
      }
      const profile = parsed.registry.profiles[parsed.profile]!;
      const decisions = { ...(parsed.decisions ?? {}) };
      for (const [key, value] of Object.entries(decisions)) {
        assertDecisionValue(key, value, profile.allowedDecisions[key]);
      }
      for (const [key, spec] of Object.entries(profile.allowedDecisions)) {
        if (!Object.hasOwn(decisions, key) && spec.defaultValue !== undefined) {
          decisions[key] = spec.defaultValue;
        }
      }

      await this.pinRegistry(parsed.registry);

      const revision = 0;
      const response: Record<string, unknown> = {
        snapshot: encodeDesignSnapshot(parsed.designId, revision),
        projectKey: this.projectKey,
        registryRevision: parsed.registry.revision,
        profile: parsed.profile,
      };
      const receipt: OperationReceipt = {
        requestHash,
        committedRevision: revision,
        response,
      };
      const session: DesignSession = {
        schemaVersion: 1,
        id: parsed.designId,
        projectKey: this.projectKey,
        revision,
        registryRevision: parsed.registry.revision,
        profile: parsed.profile,
        projectDecisions: decisions,
        pages: {},
        routeLinks: [],
        checkpoints: [],
        receipts: { [parsed.operationId]: receipt },
      };
      designSessionSchema.parse(session);
      try {
        await publishImmutableJson(
          this.designerRootReal,
          this.revisionPath(parsed.designId, revision),
          session,
        );
      } catch (error) {
        if (error instanceof MacroError && error.code === 'REVISION_CONFLICT') {
          const replay = await this.receiptAfterPublishConflict(
            parsed.designId,
            parsed.operationId,
            requestHash,
          );
          if (replay) return replay;
          throw new MacroError('DESIGN_EXISTS', `Design session already exists: ${parsed.designId}`);
        }
        throw error;
      }
      return receiptToMutation(parsed.designId, parsed.operationId, receipt);
    });
  }

  async apply(input: ApplyDesignPatchInput): Promise<MutationReceipt> {
    const parsed = applyDesignPatchInputSchema.parse(input);
    return this.withDesignLock(parsed.designId, async () => {
      const requestHash = applyRequestHash(parsed);
      const latest = await this.latestRevision(parsed.designId);
      if (latest === undefined) {
        throw new MacroError('NOT_FOUND', `Design session not found: ${parsed.designId}`);
      }
      const current = await this.readRevision(parsed.designId, latest);

      const existingReceipt = current.receipts[parsed.operationId];
      if (existingReceipt) {
        if (existingReceipt.requestHash !== requestHash) {
          throw new MacroError('OPERATION_ID_REUSED', 'operationId was used with a different request');
        }
        return receiptToMutation(parsed.designId, parsed.operationId, existingReceipt);
      }

      if (parsed.expectedRevision !== current.revision) {
        throw new MacroError(
          'REVISION_CONFLICT',
          `expectedRevision ${parsed.expectedRevision} != current ${current.revision}`,
        );
      }

      const registry = await this.readRegistry(current.registryRevision);
      const nextRevision = current.revision + 1;
      if (nextRevision > LIMITS.revisionMax) {
        throw new MacroError('HARD_VIOLATION', 'Revision limit exceeded');
      }

      const draft = cloneSession(current);
      draft.revision = nextRevision;
      const { validation } = await applyPatchesInMemory(draft, registry, parsed.operations, nextRevision);

      const response: Record<string, unknown> = {
        snapshot: encodeDesignSnapshot(parsed.designId, nextRevision),
        registryRevision: draft.registryRevision,
        pageCount: Object.keys(draft.pages).length,
        status: pageStatusSummary(draft.pages),
      };
      if (validation) response.validation = validation;

      const receipt: OperationReceipt = {
        requestHash,
        committedRevision: nextRevision,
        response,
      };
      draft.receipts[parsed.operationId] = receipt;
      designSessionSchema.parse(draft);

      try {
        await publishImmutableJson(
          this.designerRootReal,
          this.revisionPath(parsed.designId, nextRevision),
          draft,
        );
      } catch (error) {
        if (error instanceof MacroError && error.code === 'REVISION_CONFLICT') {
          const replay = await this.receiptAfterPublishConflict(
            parsed.designId,
            parsed.operationId,
            requestHash,
          );
          if (replay) return replay;
        }
        throw error;
      }
      return receiptToMutation(parsed.designId, parsed.operationId, receipt);
    });
  }
}

/** Open a filesystem-backed DesignStore. Never falls back to an in-memory store. */
export async function openDesignStore(
  projectRoot: string,
  options?: { create?: boolean },
): Promise<DesignStore> {
  return FilesystemDesignStore.open(projectRoot, options);
}

export async function openFilesystemDesignStore(
  projectRoot: string,
  options?: { create?: boolean },
): Promise<FilesystemDesignStore> {
  return FilesystemDesignStore.open(projectRoot, options);
}
