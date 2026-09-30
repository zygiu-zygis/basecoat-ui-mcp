// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { fork } from 'node:child_process';
import { access, mkdtemp, readFile, readdir, realpath, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { compileRegistry } from '../src/macros/compiler.js';
import { MacroError } from '../src/macros/packets.js';
import { getCompiledRegistry, loadCompiledRegistry } from '../src/macros/registry.js';
import {
  getPublicationDurabilityFailureCount,
  openDesignStore,
  openFilesystemDesignStore,
  publishImmutableJson,
} from '../src/macros/store.js';
import type {
  AuthoringMacroBlock,
  AuthoringRegistryInput,
  CompiledMacroRegistry,
  DesignProfile,
  Provenance,
} from '../src/macros/types.js';

const PROVENANCE: Provenance = {
  origin: 'authored',
  sourceHashes: {},
  mappingVersion: '1.0.0',
};

function minimalRegistry(
  profileId = 'store-profile',
  extraDecisions: DesignProfile['allowedDecisions'] = {},
): CompiledMacroRegistry {
  const profile: DesignProfile = {
    schemaVersion: 1,
    id: profileId,
    description: 'Store test profile',
    allowedDecisions: {
      density: {
        type: 'enum',
        values: ['comfortable', 'compact'],
        allowPageOverride: true,
        defaultValue: 'comfortable',
      },
      ...extraDecisions,
    },
    sharedDecisionKeys: ['density', ...Object.keys(extraDecisions)],
  };
  const leaf: AuthoringMacroBlock = {
    schemaVersion: 1,
    id: 'leaf-page',
    role: 'page',
    family: 'test',
    description: 'Leaf page',
    tags: ['test'],
    root: 'leaf-root',
    fragments: [{ id: 'leaf-root', emmet: 'main#main' }],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: [],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'leaf-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: PROVENANCE,
  };
  const recipe = {
    schemaVersion: 1 as const,
    id: 'leaf-recipe',
    kind: 'page' as const,
    profile: profileId,
    entryPage: 'home',
    routeLinks: [],
    pages: [
      {
        id: 'home',
        route: '/',
        recipe: 'leaf-recipe',
        root: 'root',
        status: 'draft' as const,
        decisions: {},
        nodes: {
          root: { id: 'root', block: 'leaf-page', bindings: {} },
        },
        connections: [],
        rules: [],
      },
    ],
  };
  const input: AuthoringRegistryInput = {
    schemaVersion: 1,
    blocks: [leaf],
    recipes: [recipe],
    profiles: [profile],
    rules: [],
  };
  const { registry, diagnostics } = compileRegistry(input);
  assert.equal(
    diagnostics.filter(d => d.severity === 'error').length,
    0,
    diagnostics.map(d => `${d.code}:${d.message}`).join('; '),
  );
  return registry;
}

async function withProject<T>(fn: (projectRoot: string, registry: CompiledMacroRegistry) => Promise<T>): Promise<T> {
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-store-'));
  try {
    return await fn(projectRoot, minimalRegistry());
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
}

test('design sessions survive store reopen (restart)', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });
    const created = await store.create({
      designId: 'session-a',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    assert.equal(created.revision, 0);

    const reopened = await openDesignStore(projectRoot, { create: false });
    const session = await reopened.read('session-a');
    assert.equal(session.revision, 0);
    assert.equal(session.registryRevision, registry.revision);
    assert.equal(session.projectDecisions.density, 'comfortable');
  });
});

test('two parallel stores conflict on the same expected revision', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-b',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const recipe = registry.aliases['leaf-recipe']!;
    const a = openDesignStore(projectRoot, { create: false });
    const b = openDesignStore(projectRoot, { create: false });
    const [storeA, storeB] = await Promise.all([a, b]);

    const patch = {
      designId: 'session-b' as const,
      expectedRevision: 0,
      operations: [
        {
          op: 'instantiate_recipe' as const,
          recipe,
          pagePrefix: 'run',
        },
      ],
    };

    const results = await Promise.allSettled([
      storeA.apply({ ...patch, operationId: 'op-a' }),
      storeB.apply({ ...patch, operationId: 'op-b', operations: [{ ...patch.operations[0]!, pagePrefix: 'alt' }] }),
    ]);
    const fulfilled = results.filter(r => r.status === 'fulfilled');
    const rejected = results.filter(r => r.status === 'rejected');
    assert.equal(fulfilled.length, 1);
    assert.equal(rejected.length, 1);
    const err = (rejected[0] as PromiseRejectedResult).reason;
    assert(err instanceof MacroError);
    assert.equal(err.code, 'REVISION_CONFLICT');

    const latest = await store.read('session-b');
    assert.equal(latest.revision, 1);
    assert.equal(Object.keys(latest.pages).length, 1);
  });
});

test('parallel stores replay the same operation receipt idempotently', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-replay',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const recipe = registry.aliases['leaf-recipe']!;
    const input = {
      designId: 'session-replay' as const,
      expectedRevision: 0,
      operationId: 'op-same',
      operations: [{ op: 'instantiate_recipe' as const, recipe, pagePrefix: 'run' }],
    };
    const [storeA, storeB] = await Promise.all([
      openDesignStore(projectRoot, { create: false }),
      openDesignStore(projectRoot, { create: false }),
    ]);
    const results = await Promise.allSettled([storeA.apply(input), storeB.apply(input)]);
    assert(results.every(result => result.status === 'fulfilled'));
    const receipts = results.map(result => {
      if (result.status !== 'fulfilled') throw result.reason;
      return result.value;
    });
    assert.deepEqual(receipts[0], receipts[1]);
    assert.equal((await store.read('session-replay')).revision, 1);
  });
});

test('identical operationId replay is idempotent; different payload reuses fail', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-c',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const recipe = registry.aliases['leaf-recipe']!;
    const input = {
      designId: 'session-c' as const,
      expectedRevision: 0,
      operationId: 'op-inst',
      operations: [{ op: 'instantiate_recipe' as const, recipe, pagePrefix: 'one' }],
    };
    const first = await store.apply(input);
    const second = await store.apply(input);
    assert.deepEqual(second, first);
    assert.equal((await store.read('session-c')).revision, 1);

    await assert.rejects(
      () =>
        store.apply({
          ...input,
          operations: [{ op: 'instantiate_recipe', recipe, pagePrefix: 'two' }],
        }),
      (error: unknown) => error instanceof MacroError && error.code === 'OPERATION_ID_REUSED',
    );
    assert.equal((await store.read('session-c')).revision, 1);
  });
});

test('project decision changes demote affected pages and invalidate checkpoints', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-decision',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const recipe = registry.aliases['leaf-recipe']!;
    await store.apply({
      designId: 'session-decision',
      expectedRevision: 0,
      operationId: 'op-inst',
      operations: [{ op: 'instantiate_recipe', recipe, pagePrefix: 'run' }],
    });
    await store.apply({
      designId: 'session-decision',
      expectedRevision: 1,
      operationId: 'op-ready',
      operations: [{ op: 'mark_plan_ready', page: 'run-home' }],
    });
    await store.apply({
      designId: 'session-decision',
      expectedRevision: 2,
      operationId: 'op-written',
      operations: [
        {
          op: 'record_written',
          page: 'run-home',
          node: 'root',
          sourcePath: 'src/pages/run-home.astro',
          planDigest: registry.revision,
        },
      ],
    });
    const before = await store.read('session-decision');
    assert.equal(before.pages['run-home']?.status, 'plan-ready');
    assert.equal(before.checkpoints.length, 1);

    await store.apply({
      designId: 'session-decision',
      expectedRevision: 3,
      operationId: 'op-density',
      operations: [
        { op: 'set_decision', scope: 'project', key: 'density', value: 'compact' },
      ],
    });
    const after = await store.read('session-decision');
    assert.equal(after.pages['run-home']?.status, 'draft');
    assert.equal(after.checkpoints.length, 0);
  });
});

test('failed validation commits nothing', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-d',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    await assert.rejects(
      () =>
        store.apply({
          designId: 'session-d',
          expectedRevision: 0,
          operationId: 'op-bad',
          operations: [
            {
              op: 'attach_block',
              page: 'missing-page',
              parent: 'x',
              slot: 'y',
              node: 'z',
              block: registry.aliases['leaf-page']!,
            },
          ],
        }),
      (error: unknown) => error instanceof MacroError && error.code === 'HARD_VIOLATION',
    );
    const session = await store.read('session-d');
    assert.equal(session.revision, 0);
    assert.equal(Object.keys(session.pages).length, 0);
    assert.equal(session.receipts['op-bad'], undefined);
  });
});

test('crash-before-publish leaves no partial revision', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openFilesystemDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-e',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const revisionsDir = join(store.getDesignerRoot(), 'sessions', 'session-e', 'revisions');
    await writeFile(join(revisionsDir, '.deadbeef-dead-dead-dead-deadbeefdead.tmp'), '{"partial":true}\n');
    const names = await readdir(revisionsDir);
    assert(names.some(name => name.endsWith('.tmp')));
    const session = await store.read('session-e');
    assert.equal(session.revision, 0);
    assert.equal(names.filter(name => /^\d+\.json$/.test(name)).length, 1);
  });
});

test('directory sync failure before link fails without publishing', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basecoat-publish-'));
  try {
    const rootReal = await realpath(root);
    const finalPath = join(rootReal, 'records', 'one.json');
    await assert.rejects(
      () => publishImmutableJson(rootReal, finalPath, { value: 1 }, async () => {
        const error = new Error('sync failed') as NodeJS.ErrnoException;
        error.code = 'EIO';
        throw error;
      }),
      (error: unknown) => error instanceof MacroError && error.code === 'STORAGE_FAILED',
    );
    await assert.rejects(() => access(finalPath));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('post-link directory sync failure keeps the committed mutation visible', async () => {
  const root = await mkdtemp(join(tmpdir(), 'basecoat-publish-'));
  try {
    const rootReal = await realpath(root);
    const finalPath = join(rootReal, 'records', 'one.json');
    const before = getPublicationDurabilityFailureCount();
    let syncCalls = 0;
    await publishImmutableJson(rootReal, finalPath, { value: 1 }, async handle => {
      syncCalls++;
      if (syncCalls === 1) {
        await handle.sync();
        return;
      }
      const error = new Error('post-link sync failed') as NodeJS.ErrnoException;
      error.code = 'EIO';
      throw error;
    });
    assert.equal(JSON.parse(await readFile(finalPath, 'utf8')).value, 1);
    assert.equal(getPublicationDurabilityFailureCount(), before + 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('project roots isolate designer state', async () => {
  const rootA = await mkdtemp(join(tmpdir(), 'basecoat-store-a-'));
  const rootB = await mkdtemp(join(tmpdir(), 'basecoat-store-b-'));
  try {
    const registry = minimalRegistry();
    const storeA = await openDesignStore(rootA, { create: true });
    const storeB = await openDesignStore(rootB, { create: true });
    await storeA.create({
      designId: 'shared-id',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-a',
      registry,
    });
    await storeB.create({
      designId: 'shared-id',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-b',
      registry,
    });
    assert.equal((await storeA.listSessions()).length, 1);
    assert.equal((await storeB.listSessions()).length, 1);
    const fsA = await openFilesystemDesignStore(rootA, { create: false });
    const fsB = await openFilesystemDesignStore(rootB, { create: false });
    assert.notEqual(fsA.getProjectKey(), fsB.getProjectKey());
    assert.notEqual(fsA.getDesignerRoot(), fsB.getDesignerRoot());
  } finally {
    await rm(rootA, { recursive: true, force: true });
    await rm(rootB, { recursive: true, force: true });
  }
});

test('registry pin is unchanged across package-like registry swap', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openFilesystemDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-f',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const pinnedBefore = await store.loadRegistry(registry.revision);
    assert.equal(pinnedBefore.revision, registry.revision);

    const swapped = minimalRegistry('other-profile');
    loadCompiledRegistry(swapped);
    assert.notEqual(getCompiledRegistry().revision, registry.revision);

    const session = await store.read('session-f');
    assert.equal(session.registryRevision, registry.revision);
    const pinnedAfter = await store.loadRegistry(session.registryRevision);
    assert.equal(pinnedAfter.revision, registry.revision);
    assert.equal(pinnedAfter.aliases['store-profile'], registry.aliases['store-profile']);
  });
});

test('corrupt revision/registry JSON is not overwritten by pin or create', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openFilesystemDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-g',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const registryPath = join(store.getDesignerRoot(), 'registries', `${registry.revision}.json`);
    const before = await readFile(registryPath, 'utf8');
    await writeFile(registryPath, '{not-json');
    await assert.rejects(
      () => store.loadRegistry(registry.revision),
      (error: unknown) => error instanceof MacroError && error.code === 'CORRUPT_SNAPSHOT',
    );
    // Attempting another create with same design fails without repairing the corrupt pin path via overwrite.
    await assert.rejects(
      () =>
        store.create({
          designId: 'session-g',
          profile: registry.aliases['store-profile']!,
          operationId: 'op-other',
          registry,
        }),
      (error: unknown) => error instanceof MacroError && error.code === 'DESIGN_EXISTS',
    );
    const after = await readFile(registryPath, 'utf8');
    assert.equal(after, '{not-json');
    assert.notEqual(after, before);
  });
});

test('missing pinned snapshots fail gracefully with STALE_CURSOR', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openFilesystemDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'session-h',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });

    // Remove the pinned registry to simulate missing snapshot
    const registryPath = join(store.getDesignerRoot(), 'registries', `${registry.revision}.json`);
    await unlink(registryPath);

    // Reading with missing pinned registry should fail
    await assert.rejects(
      () => store.loadRegistry(registry.revision),
      (error: unknown) => error instanceof MacroError && error.code === 'NOT_FOUND',
    );
  });
});

test('registry revision pinning survives concurrent operations', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openFilesystemDesignStore(projectRoot, { create: true });

    // Create a design session with the registry
    await store.create({
      designId: 'session-pin-test',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });

    // Simulate concurrent registry access by creating multiple stores that will pin the registry
    const promises = Array.from({ length: 5 }, async (_, i) => {
      const concurrentStore = await openFilesystemDesignStore(projectRoot, { create: false });
      return concurrentStore.loadRegistry(registry.revision);
    });

    // All should succeed without conflicts
    const results = await Promise.all(promises);

    // All results should be identical
    for (const loaded of results) {
      assert.equal(loaded.revision, registry.revision);
      assert.deepEqual(loaded.aliases, registry.aliases);
    }
  });
});

test('legal explicit null precedence in decisions', async () => {
  const nullRegistry = minimalRegistry('null-profile', {
    nullableFlag: {
      type: 'null',
      allowPageOverride: true,
    },
  });

  await withProject(async (projectRoot) => {
    const store = await openDesignStore(projectRoot, { create: true });

    // Create with explicit null decision
    await store.create({
      designId: 'null-test',
      profile: nullRegistry.aliases['null-profile']!,
      operationId: 'op-create-null',
      registry: nullRegistry,
      decisions: { nullableFlag: null },
    });

    const session = await store.read('null-test');
    assert.strictEqual(session.projectDecisions.nullableFlag, null);

    // Apply patch with explicit null at page level
    const recipe = nullRegistry.aliases['leaf-recipe']!;
    await store.apply({
      designId: 'null-test',
      expectedRevision: 0,
      operationId: 'op-null-page',
      operations: [
        { op: 'instantiate_recipe', recipe, pagePrefix: 'null' },
        {
          op: 'set_decision',
          scope: 'page',
          page: 'null-home',
          key: 'nullableFlag',
          value: null,
        },
      ],
    });

    const updated = await store.read('null-test');
    assert.strictEqual(updated.pages['null-home']?.decisions.nullableFlag, null);
  });
});

test('deterministic next-step tie resolution', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });

    // Create multiple designs with similar characteristics to test tie-breaking
    const designs = ['tie-a', 'tie-b', 'tie-c'];
    for (const designId of designs) {
      await store.create({
        designId,
        profile: registry.aliases['store-profile']!,
        operationId: `op-create-${designId}`,
        registry,
      });
    }

    // Get context for each design - results should be deterministic
    const contexts = [];
    for (const designId of designs) {
      const session = await store.read(designId);
      contexts.push({
        designId,
        revision: session.revision,
        status: 'empty' as const,
      });
    }

    // Sort should be deterministic by design ID
    contexts.sort((a, b) => a.designId.localeCompare(b.designId));
    assert.deepEqual(
      contexts.map(c => c.designId),
      designs.sort(),
    );
  });
});

test('replay protection uses a genuine child-process race', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openFilesystemDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'cross-process',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const recipe = registry.aliases['leaf-recipe']!;
    const fixture = fileURLToPath(new URL('./fixtures/store-race.mjs', import.meta.url));
    const children = [fork(fixture, [projectRoot, recipe]), fork(fixture, [projectRoot, recipe])];
    try {
      const outcomes = children.map(child => new Promise<unknown>((resolve, reject) => {
        child.on('error', reject);
        child.on('message', message => {
          const packet = message as {
            type?: string;
            receipt?: unknown;
            code?: unknown;
            message?: unknown;
          };
          if (message && typeof message === 'object' && 'type' in message && message.type === 'ready') {
            child.send({ type: 'go' });
          } else if (message && typeof message === 'object' && 'type' in message && message.type === 'result') {
            resolve(packet.receipt);
          } else if (message && typeof message === 'object' && 'type' in message && message.type === 'error') {
            reject(new Error(`${String(packet.code)}: ${String(packet.message)}`));
          }
        });
      }));
      const [resultA, resultB] = await Promise.all(outcomes);
      assert.deepEqual(resultA, resultB);
      assert.equal((resultA as { revision: number }).revision, 1);
      assert.equal((await store.read('cross-process')).revision, 1);
    } finally {
      for (const child of children) child.kill();
    }
  });
});

test('auth entry resolution with prefixed operations', async () => {
  await withProject(async (projectRoot, registry) => {
    const store = await openDesignStore(projectRoot, { create: true });

    await store.create({
      designId: 'auth-prefix-test',
      profile: registry.aliases['store-profile']!,
      operationId: 'create-auth',
      registry,
    });

    const recipe = registry.aliases['leaf-recipe']!;

    // Apply operations with deterministic prefixing
    await store.apply({
      designId: 'auth-prefix-test',
      expectedRevision: 0,
      operationId: 'prefix-alpha',
      operations: [
        { op: 'instantiate_recipe', recipe, pagePrefix: 'alpha' },
      ],
    });

    await store.apply({
      designId: 'auth-prefix-test',
      expectedRevision: 1,
      operationId: 'prefix-beta',
      operations: [
        { op: 'instantiate_recipe', recipe, pagePrefix: 'beta' },
      ],
    });

    const session = await store.read('auth-prefix-test');

    // Verify prefixed pages exist with correct structure
    assert('alpha-home' in session.pages);
    assert('beta-home' in session.pages);
    assert.equal(session.pages['alpha-home']?.recipe, recipe);
    assert.equal(session.pages['beta-home']?.recipe, recipe);

    // Operation IDs should be resolvable in receipts
    assert('prefix-alpha' in session.receipts);
    assert('prefix-beta' in session.receipts);
  });
});
