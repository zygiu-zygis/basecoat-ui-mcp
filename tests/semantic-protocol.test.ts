// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import test from 'node:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { MAX_DETAIL_BYTES, decodeMacroCursor, encodeMacroCursor, resultBytes } from '../src/macros/packets.js';
import { handleGetFsmRecipe, handleGetRhythmRules } from '../src/semantics/tools.js';

function packet(result: CallToolResult): {
  items?: Array<{ mapping?: { id?: string }; item?: { id?: string }; section?: string }>;
  next?: string | null;
  error?: { code: string };
} {
  assert.equal(result.content.length, 1);
  const block = result.content[0]!;
  assert.equal(block.type, 'text');
  assert(!Object.hasOwn(result, 'structuredContent'));
  assert(resultBytes(result) <= MAX_DETAIL_BYTES);
  return JSON.parse(block.text);
}

test('rhythm handler pages complete records and rejects mismatched, stale, and tampered cursors', async () => {
  const ids: string[] = [];
  let cursor: string | undefined;
  let maxBytes = 0;
  do {
    const result = await handleGetRhythmRules({ profile: 'default', limit: 1, cursor });
    maxBytes = Math.max(maxBytes, resultBytes(result));
    const body = packet(result);
    assert.notEqual(result.isError, true);
    assert.equal(body.items?.length, 1);
    ids.push(body.items![0]!.mapping!.id!);
    cursor = body.next ?? undefined;
  } while (cursor);
  assert.equal(ids.length, new Set(ids).size);
  assert(ids.includes('gap-rhythm-sm'));

  const first = packet(await handleGetRhythmRules({ profile: 'default', limit: 1 })).next!;
  const mismatch = await handleGetRhythmRules({ profile: 'default', family: 'spacing', limit: 1, cursor: first });
  assert.equal(packet(mismatch).error?.code, 'CURSOR_MISMATCH');
  const decoded = decodeMacroCursor(first);
  const stale = encodeMacroCursor({ ...decoded, snapshot: 'f'.repeat(64) });
  assert.equal(packet(await handleGetRhythmRules({ profile: 'default', limit: 1, cursor: stale })).error?.code, 'STALE_CURSOR');
  assert.equal(packet(await handleGetRhythmRules({ profile: 'default', cursor: 'not-json' })).error?.code, 'INVALID_CURSOR');
  assert.equal(packet(await handleGetRhythmRules({ profile: 'missing' })).error?.code, 'NOT_FOUND');
  assert(maxBytes > 0);
});

test('FSM handler pages complete records and rejects mismatched, stale, and tampered cursors', async () => {
  const records: string[] = [];
  let cursor: string | undefined;
  let maxBytes = 0;
  do {
    const result = await handleGetFsmRecipe({ recipe: 'dialog', limit: 1, cursor });
    maxBytes = Math.max(maxBytes, resultBytes(result));
    const body = packet(result);
    assert.notEqual(result.isError, true);
    assert.equal(body.items?.length, 1);
    const entry = body.items![0]!;
    records.push(`${entry.section}:${entry.item?.id}`);
    cursor = body.next ?? undefined;
  } while (cursor);
  assert.equal(records.length, new Set(records).size);
  assert(records.some(record => record === 'states:closed'));

  const first = packet(await handleGetFsmRecipe({ recipe: 'dialog', limit: 1 })).next!;
  const mismatch = await handleGetFsmRecipe({ recipe: 'dialog', section: 'states', limit: 1, cursor: first });
  assert.equal(packet(mismatch).error?.code, 'CURSOR_MISMATCH');
  const decoded = decodeMacroCursor(first);
  const stale = encodeMacroCursor({ ...decoded, registryRevision: 'f'.repeat(64) });
  assert.equal(packet(await handleGetFsmRecipe({ recipe: 'dialog', limit: 1, cursor: stale })).error?.code, 'STALE_CURSOR');
  assert.equal(packet(await handleGetFsmRecipe({ recipe: 'dialog', cursor: 'not-json' })).error?.code, 'INVALID_CURSOR');
  assert.equal(packet(await handleGetFsmRecipe({ recipe: 'missing' })).error?.code, 'NOT_FOUND');
  assert(maxBytes > 0);
});
