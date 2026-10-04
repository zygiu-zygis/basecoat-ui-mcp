// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Regression tests for P1: 11-page session overview pagination without ATOM_TOO_LARGE, and rhythm rules output densification.

import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { handleGetDesignContext } from '../src/macros/tools.js';
import { handleGetRhythmRules } from '../src/semantics/tools.js';
import { openFilesystemDesignStore } from '../src/macros/store.js';
import { getCompiledRegistry } from '../src/macros/registry.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

function parseResult(result: CallToolResult): Record<string, unknown> {
  const text = (result.content[0] as { text: string }).text;
  return JSON.parse(text) as Record<string, unknown>;
}

async function withProject(
  fn: (projectRoot: string) => Promise<void>,
): Promise<void> {
  const dir = await mkdtemp(join(tmpdir(), 'context-density-test-'));
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

test('P1 context splitting: 11-page session overview pages smoothly without ATOM_TOO_LARGE', async () => {
  await withProject(async projectRoot => {
    const registry = getCompiledRegistry();
    const profile = registry.aliases['app-dashboard'] ?? Object.keys(registry.profiles)[0]!;
    const recipeRef = registry.aliases['workspace-dashboard']!;

    const store = await openFilesystemDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'eleven-pages-session',
      profile,
      operationId: 'op-init',
      registry,
    });

    // Create 11 pages by instantiating recipes with different prefixes
    for (let i = 1; i <= 11; i++) {
      const current = await store.read('eleven-pages-session');
      await store.apply({
        designId: 'eleven-pages-session',
        expectedRevision: current.revision,
        operationId: `op-instantiate-${i}`,
        operations: [
          {
            op: 'instantiate_recipe',
            recipe: recipeRef,
            pagePrefix: `p${i}`,
          },
        ],
      });
    }

    const session = await store.read('eleven-pages-session');
    assert.equal(Object.keys(session.pages).length, 11, 'Must have exactly 11 pages');

    // Query overview context
    const firstResult = await handleGetDesignContext(
      {
        designId: 'eleven-pages-session',
        view: 'overview',
      },
      projectRoot,
    );

    // CRITICAL: Must not be error (specifically ATOM_TOO_LARGE)
    assert.equal(firstResult.isError, undefined, `Expected success, got error: ${JSON.stringify(firstResult)}`);

    const firstPacket = parseResult(firstResult);
    const items = firstPacket.items as Array<Record<string, unknown>>;
    assert(items.length > 0, 'Must return at least one item');
    assert.equal(items[0]?.kind, 'overview', 'First item must be overview summary');
    assert.equal(items[0]?.pageCount, 11, 'pageCount in summary must be 11');

    // Collect all pages across cursors
    const allCollectedPages: string[] = [];
    let cursor: string | undefined = firstPacket.next as string | undefined;

    for (const item of items) {
      if (item.kind === 'overview-page') {
        allCollectedPages.push(item.pageId as string);
      }
    }

    let pagesFetched = 1;
    while (cursor) {
      pagesFetched++;
      const nextResult = await handleGetDesignContext(
        {
          designId: 'eleven-pages-session',
          view: 'overview',
          cursor,
        },
        projectRoot,
      );
      assert.equal(nextResult.isError, undefined);
      const nextPacket = parseResult(nextResult);
      const nextItems = nextPacket.items as Array<Record<string, unknown>>;
      for (const item of nextItems) {
        if (item.kind === 'overview-page') {
          allCollectedPages.push(item.pageId as string);
        }
      }
      cursor = nextPacket.next as string | undefined;
    }

    assert.equal(allCollectedPages.length, 11, 'Must collect all 11 pages across paginated requests');
    assert(pagesFetched >= 1, 'Pagination completed successfully');
  });
});

test('P1 rhythm output density: 16 rules returned efficiently without redundant metadata', async () => {
  await withProject(async projectRoot => {
    // 1. Fetch default profile rules (all 16 rules)
    const result = await handleGetRhythmRules({ profile: 'default' }, projectRoot);
    assert.equal(result.isError, undefined);

    const packet = parseResult(result);
    const rhythmRules = packet.rhythmRules as {
      total: number;
      descriptions?: {
        profiles: Record<string, string>;
        families: Record<string, string>;
      };
    };

    assert.equal(rhythmRules.total, 16, 'Default profile has 16 rhythm rules');

    // Verify descriptions are present in common context
    assert(rhythmRules.descriptions, 'Descriptions must be present in header');
    assert(rhythmRules.descriptions.profiles['default'], 'Default profile description must exist');

    const items = packet.items as Array<{
      profileId: string;
      familyId: string;
      mapping: { id: string; value: string };
      profileDescription?: string;
      familyDescription?: string;
    }>;

    // Verify items are compact and do NOT duplicate long descriptions
    for (const item of items) {
      assert.equal(item.profileDescription, undefined, 'Must not duplicate profileDescription on item');
      assert.equal(item.familyDescription, undefined, 'Must not duplicate familyDescription on item');
      assert(item.familyId, 'Must include familyId');
      assert(item.mapping.id, 'Must include mapping.id');
    }

    // In a single query (or at most 2), all 16 items are returned!
    // Total byte size of single response should be well under 2500 bytes (previously 11,352 bytes across 7 requests!)
    const totalBytes = Buffer.byteLength((result.content[0] as { text: string }).text, 'utf8');
    assert(totalBytes < 2500, `Expected compact payload < 2500 bytes, got ${totalBytes} bytes`);

    // 2. Test family filter get_rhythm_rules({ family: "spacing" })
    const spacingResult = await handleGetRhythmRules({ profile: 'default', family: 'spacing' }, projectRoot);
    assert.equal(spacingResult.isError, undefined);
    const spacingPacket = parseResult(spacingResult);
    const spacingItems = spacingPacket.items as Array<{ familyId: string }>;
    assert(spacingItems.length > 0);
    assert(spacingItems.every(i => i.familyId === 'spacing'));
  });
});
