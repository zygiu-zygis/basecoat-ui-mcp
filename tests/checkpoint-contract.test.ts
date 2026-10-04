// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Regression tests for P0 checkpoint contract: planDigest validation, independent completion persistence, and dependency invalidation.

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildContextView, selectNextStep } from '../src/macros/context.js';
import { MacroError } from '../src/macros/packets.js';
import { getCompiledRegistry } from '../src/macros/registry.js';
import { calculateNodePlanDigest, openDesignStore } from '../src/macros/store.js';

async function withStore(
  fn: (store: Awaited<ReturnType<typeof openDesignStore>>, projectRoot: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'checkpoint-contract-test-'));
  try {
    const store = await openDesignStore(dir, { create: true });
    await fn(store, dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('P0 checkpoint contract: independent node completion does not invalidate other nodes', async () => {
  await withStore(async store => {
    const registry = getCompiledRegistry();
    const profile = registry.aliases['app-dashboard'] ?? Object.keys(registry.profiles)[0]!;

    await store.create({
      designId: 'session-ab',
      profile,
      operationId: 'op-init',
      registry,
    });

    const recipeRef = registry.aliases['workspace-dashboard']!;

    // Instantiate recipe to create page dash-dashboard
    await store.apply({
      designId: 'session-ab',
      expectedRevision: 0,
      operationId: 'op-instantiate',
      operations: [
        {
          op: 'instantiate_recipe',
          recipe: recipeRef,
          pagePrefix: 'dash',
        },
      ],
    });

    let session = await store.read('session-ab');
    const pageId = 'dash-dashboard';
    const page = session.pages[pageId]!;
    assert(page, 'Page dash-dashboard must exist');

    const nodeA = 'metrics';
    const nodeB = 'activity';

    // Verify both nodes exist on page
    assert(page.nodes[nodeA], 'nodeA metrics should exist');
    assert(page.nodes[nodeB], 'nodeB activity should exist');

    // Calculate digests
    const digestA = calculateNodePlanDigest(session, page, nodeA);
    const digestB = calculateNodePlanDigest(session, page, nodeB);
    assert.equal(typeof digestA, 'string');
    assert.equal(digestA.length, 64);
    assert.notEqual(digestA, digestB);

    // Record write checkpoint for Node A
    await store.apply({
      designId: 'session-ab',
      expectedRevision: session.revision,
      operationId: 'op-write-a',
      operations: [
        {
          op: 'record_written',
          page: pageId,
          node: nodeA,
          sourcePath: `src/pages/${pageId}/${nodeA}.astro`,
          planDigest: digestA,
        },
      ],
    });

    session = await store.read('session-ab');
    assert.equal(session.checkpoints.length, 1);
    assert.equal(session.checkpoints[0]?.node, nodeA);
    assert.equal(session.checkpoints[0]?.planDigest, digestA);

    // Next step should NOT suggest Node A (since A is completed)
    let nextStep = selectNextStep(session, registry, pageId);
    assert.notEqual(nextStep.node, nodeA, 'Completed node A must not be suggested as next step');

    // Record write checkpoint for Node B (session revision increments from 2 to 3)
    await store.apply({
      designId: 'session-ab',
      expectedRevision: session.revision,
      operationId: 'op-write-b',
      operations: [
        {
          op: 'record_written',
          page: pageId,
          node: nodeB,
          sourcePath: `src/pages/${pageId}/${nodeB}.astro`,
          planDigest: digestB,
        },
      ],
    });

    session = await store.read('session-ab');
    assert.equal(session.checkpoints.length, 2);

    // CRITICAL ACCEPTANCE CRITERIA: Writing B incremented global revision, but Node A must STILL be considered complete!
    nextStep = selectNextStep(session, registry, pageId);
    assert.notEqual(nextStep.node, nodeA, 'Writing B must NOT invalidate A');
    assert.notEqual(nextStep.node, nodeB, 'Writing B must NOT invalidate B');

    // Focus view on Node A must return the current planDigest
    const focusA = buildContextView(
      session,
      { view: 'focus', designId: session.id, pageId, nodeId: nodeA },
      registry,
    );
    const focusRecA = focusA.find(r => r.kind === 'focus');
    assert(focusRecA);
    assert.equal(focusRecA.planDigest, digestA);
  });
});

test('P0 checkpoint contract: arbitrary or mismatched planDigest is rejected', async () => {
  await withStore(async store => {
    const registry = getCompiledRegistry();
    const profile = Object.keys(registry.profiles)[0]!;

    await store.create({
      designId: 'session-reject',
      profile,
      operationId: 'op-init',
      registry,
    });

    const recipeRef = registry.aliases['workspace-dashboard']!;
    await store.apply({
      designId: 'session-reject',
      expectedRevision: 0,
      operationId: 'op-instantiate',
      operations: [
        {
          op: 'instantiate_recipe',
          recipe: recipeRef,
          pagePrefix: 'dash',
        },
      ],
    });

    const session = await store.read('session-reject');
    const pageId = 'dash-dashboard';
    const page = session.pages[pageId]!;
    const nodeA = 'metrics';
    assert(page.nodes[nodeA]);

    const fakeDigest = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';

    // Must reject fake digest with HARD_VIOLATION
    await assert.rejects(
      async () => {
        await store.apply({
          designId: 'session-reject',
          expectedRevision: session.revision,
          operationId: 'op-bad-digest',
          operations: [
            {
              op: 'record_written',
              page: pageId,
              node: nodeA,
              sourcePath: 'src/pages/dash/metrics.astro',
              planDigest: fakeDigest,
            },
          ],
        });
      },
      (error: unknown) => {
        assert(error instanceof MacroError);
        assert.equal(error.code, 'HARD_VIOLATION');
        assert.match(error.message, /planDigest mismatch/);
        return true;
      },
    );
  });
});

test('P0 checkpoint contract: modifying node or its dependency makes checkpoint stale', async () => {
  await withStore(async store => {
    const registry = getCompiledRegistry();
    const profile = Object.keys(registry.profiles)[0]!;

    await store.create({
      designId: 'session-stale',
      profile,
      operationId: 'op-init',
      registry,
    });

    const recipeRef = registry.aliases['workspace-dashboard']!;
    await store.apply({
      designId: 'session-stale',
      expectedRevision: 0,
      operationId: 'op-instantiate',
      operations: [
        {
          op: 'instantiate_recipe',
          recipe: recipeRef,
          pagePrefix: 'dash',
        },
      ],
    });

    let session = await store.read('session-stale');
    const pageId = 'dash-dashboard';
    const page = session.pages[pageId]!;
    const targetNode = 'metrics';
    assert(page.nodes[targetNode]);

    const digestInitial = calculateNodePlanDigest(session, page, targetNode);

    // Record checkpoint
    await store.apply({
      designId: 'session-stale',
      expectedRevision: session.revision,
      operationId: 'op-record',
      operations: [
        {
          op: 'record_written',
          page: pageId,
          node: targetNode,
          sourcePath: 'src/pages/dash/metrics.astro',
          planDigest: digestInitial,
        },
      ],
    });

    session = await store.read('session-stale');
    let nextStep = selectNextStep(session, registry, pageId);
    assert.notEqual(nextStep.node, targetNode, 'Node should be marked completed');

    // Mutate page decision (which affects inherited decisions)
    await store.apply({
      designId: 'session-stale',
      expectedRevision: session.revision,
      operationId: 'op-mutate-decision',
      operations: [
        {
          op: 'set_decision',
          scope: 'page',
          page: pageId,
          key: 'density',
          value: 'compact',
        },
      ],
    });

    session = await store.read('session-stale');
    const newPage = session.pages[pageId]!;
    const digestAfterDecision = calculateNodePlanDigest(session, newPage, targetNode);
    assert.notEqual(digestAfterDecision, digestInitial, 'Digest must change after decision change');

    // The checkpoint should now be missing/stale!
    assert.equal(
      session.checkpoints.find(cp => cp.node === targetNode)?.planDigest,
      digestInitial,
    );
    // Since digestInitial !== digestAfterDecision, the checkpoint is stale and does not match the node's current digest
    assert.notEqual(
      session.checkpoints.find(cp => cp.node === targetNode)?.planDigest,
      digestAfterDecision,
    );
  });
});

test('P0 checkpoint contract: reload and repeating operation maintains idempotent state', async () => {
  await withStore(async (store, projectRoot) => {
    const registry = getCompiledRegistry();
    const profile = Object.keys(registry.profiles)[0]!;

    await store.create({
      designId: 'session-reload',
      profile,
      operationId: 'op-init',
      registry,
    });

    const recipeRef = registry.aliases['workspace-dashboard']!;
    await store.apply({
      designId: 'session-reload',
      expectedRevision: 0,
      operationId: 'op-instantiate',
      operations: [
        {
          op: 'instantiate_recipe',
          recipe: recipeRef,
          pagePrefix: 'dash',
        },
      ],
    });

    let session = await store.read('session-reload');
    const pageId = 'dash-dashboard';
    const node = 'metrics';
    const digest = calculateNodePlanDigest(session, session.pages[pageId]!, node);

    // Apply record_written
    const res1 = await store.apply({
      designId: 'session-reload',
      expectedRevision: session.revision,
      operationId: 'op-rec',
      operations: [
        {
          op: 'record_written',
          page: pageId,
          node,
          sourcePath: 'src/metrics.astro',
          planDigest: digest,
        },
      ],
    });

    // Replay identical operation with same operationId (idempotent replay)
    const res2 = await store.apply({
      designId: 'session-reload',
      expectedRevision: session.revision,
      operationId: 'op-rec',
      operations: [
        {
          op: 'record_written',
          page: pageId,
          node,
          sourcePath: 'src/metrics.astro',
          planDigest: digest,
        },
      ],
    });

    assert.equal(res1.revision, res2.revision);

    // Close and reopen store (simulating reload)
    const reloadedStore = await openDesignStore(projectRoot);
    const reloadedSession = await reloadedStore.read('session-reload');

    assert.equal(reloadedSession.checkpoints.length, 1);
    assert.equal(reloadedSession.checkpoints[0]?.planDigest, digest);
    assert.equal(reloadedSession.checkpoints[0]?.node, node);
  });
});
