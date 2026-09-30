// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { MAX_DETAIL_BYTES, decodeMacroCursor, encodeMacroCursor, resultBytes } from '../src/macros/packets.js';
import {
  getFsmRecipeInputShape,
  getRhythmRulesInputShape,
  handleGetFsmRecipe,
  handleGetRhythmRules,
} from '../src/semantics/tools.js';

function packet(result: CallToolResult): {
  items?: Array<{ mapping?: { id?: string }; item?: { id?: string }; section?: string }>;
  next?: string | null;
  error?: { code: string };
  rhythmRules?: { effectiveRevision?: string; registryRevision?: string };
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

test('rhythm handler applies project overrides and pins effective cursors', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-rhythm-'));
  try {
    await mkdir(join(projectRoot, '.basecoat'));
    await writeFile(join(projectRoot, '.basecoat', 'rhythm.json'), JSON.stringify({
      schemaVersion: 1,
      baseProfile: 'default',
      overrideMappings: [{
        id: 'gap-rhythm-sm',
        value: 'gap-3',
        description: 'Project small gap',
      }],
    }));
    let cursor: string | undefined;
    let effectiveRevision = '';
    let registryRevision = '';
    let overrideValue: string | undefined;
    do {
      const body = packet(await handleGetRhythmRules({
        profile: 'default',
        family: 'spacing',
        limit: 1,
        cursor,
      }, projectRoot));
      const mapping = body.items?.[0]?.mapping as { id?: string; value?: string } | undefined;
      if (mapping?.id === 'gap-rhythm-sm') overrideValue = mapping.value;
      effectiveRevision = body.rhythmRules?.effectiveRevision ?? effectiveRevision;
      registryRevision = body.rhythmRules?.registryRevision ?? registryRevision;
      cursor = body.next ?? undefined;
    } while (cursor);
    assert.equal(overrideValue, 'gap-3');
    assert.match(effectiveRevision, /^[a-f0-9]{64}$/);
    assert.notEqual(effectiveRevision, registryRevision);

    const first = packet(await handleGetRhythmRules({ profile: 'default', limit: 1 }, projectRoot));
    await writeFile(join(projectRoot, '.basecoat', 'rhythm.json'), JSON.stringify({
      schemaVersion: 1,
      baseProfile: 'default',
      overrideMappings: [{
        id: 'gap-rhythm-sm',
        value: 'gap-4',
        description: 'Changed project small gap',
      }],
    }));
    assert.equal(
      packet(await handleGetRhythmRules({ profile: 'default', limit: 1, cursor: first.next! }, projectRoot)).error?.code,
      'STALE_CURSOR',
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('semantic tool filters reject empty and unsafe identifiers', () => {
  const rhythmSchema = z.object(getRhythmRulesInputShape).strict();
  const fsmSchema = z.object(getFsmRecipeInputShape).strict();
  for (const value of ['', 'Upper', '../escape', 'space value', 'a'.repeat(65)]) {
    assert.equal(rhythmSchema.safeParse({ profile: value }).success, false, value);
    assert.equal(rhythmSchema.safeParse({ family: value }).success, false, value);
    assert.equal(fsmSchema.safeParse({ recipe: value }).success, false, value);
  }
  assert.equal(rhythmSchema.safeParse({ cursor: '' }).success, false);
  assert.equal(fsmSchema.safeParse({ cursor: '' }).success, false);
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

test('rhythm handler accepts singular family aliases for surfaces and borders', async () => {
  const surfaces = packet(await handleGetRhythmRules({ profile: 'default', family: 'surface', limit: 8 }));
  assert.notEqual(surfaces.error?.code, 'NOT_FOUND');
  assert(surfaces.items?.some(item => item.mapping?.id === 'bg-surface-primary'));

  const borders = packet(await handleGetRhythmRules({ profile: 'default', family: 'border', limit: 8 }));
  assert.notEqual(borders.error?.code, 'NOT_FOUND');
  assert(borders.items?.some(item => item.mapping?.id === 'border-subtle'));
});
