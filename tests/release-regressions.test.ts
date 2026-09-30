// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
// Characterization and release-readiness regressions for known defect candidates.
import assert from 'node:assert/strict';
import { mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { compileRegistry } from '../src/macros/compiler.js';
import {
  MAX_DETAIL_BYTES,
  MacroError,
  decodeMacroCursor,
  encodeMacroCursor,
  resultBytes,
} from '../src/macros/packets.js';
import { openFilesystemDesignStore } from '../src/macros/store.js';
import {
  ensureMacroRegistryLoaded,
  handleApplyDesignPatch,
  handleBeginDesign,
} from '../src/macros/tools.js';
import type {
  AuthoringMacroBlock,
  AuthoringRegistryInput,
  CompiledMacroRegistry,
  DesignProfile,
  Provenance,
} from '../src/macros/types.js';
import {
  DEFAULT_SEMANTICS_INPUT,
  canonicalJson,
  compileSemantics,
  createSemanticsStore,
} from '../src/semantics/index.js';
import {
  handleGetFsmRecipe,
  handleGetRhythmRules,
} from '../src/semantics/tools.js';
import { parseHtmlWithDiagnostics } from '../src/tools/html.js';
import { validateComposition } from '../src/tools/validate.js';

const PROVENANCE: Provenance = {
  origin: 'authored',
  sourceHashes: {},
  mappingVersion: '1.0.0',
};

function packet(result: CallToolResult): {
  error?: { code: string };
  revision?: number;
  kind?: string;
  designId?: string;
  operationId?: string;
  items?: Array<{ mapping?: { id?: string; value?: string } }>;
  next?: string | null;
  rhythmRules?: { effectiveRevision?: string };
} {
  assert.equal(result.content.length, 1);
  const block = result.content[0]!;
  assert.equal(block.type, 'text');
  assert(resultBytes(result) <= MAX_DETAIL_BYTES);
  return JSON.parse(block.text);
}

function minimalRegistry(profileId = 'store-profile'): CompiledMacroRegistry {
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
    },
    sharedDecisionKeys: ['density'],
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
  assert.equal(diagnostics.filter(d => d.severity === 'error').length, 0);
  return registry;
}

test('committed apply acknowledgement must not be hidden by PACKET_TOO_LARGE', async () => {
  ensureMacroRegistryLoaded();
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-packet-ack-'));
  try {
    const begin = await handleBeginDesign(
      { designId: 'ack-design', profile: 'app-default', operationId: 'op-begin' },
      projectRoot,
    );
    assert.notEqual(begin.isError, true, JSON.stringify(packet(begin)));

    const toolApply = await handleApplyDesignPatch(
      {
        designId: 'ack-design',
        expectedRevision: 0,
        operationId: 'op-instantiate',
        operations: [{ op: 'instantiate_recipe', recipe: 'workspace-dashboard', pagePrefix: 'ack' }],
      },
      projectRoot,
    );
    assert.notEqual(toolApply.isError, true, JSON.stringify(packet(toolApply)));
    assert.equal(packet(toolApply).revision, 1);

    const store = await openFilesystemDesignStore(projectRoot, { create: false });
    const revisionPath = join(
      store.getDesignerRoot(),
      'sessions',
      'ack-design',
      'revisions',
      '1.json',
    );
    const session = JSON.parse(await readFile(revisionPath, 'utf8')) as {
      receipts: Record<string, { response: Record<string, unknown> }>;
    };
    const receipt = session.receipts['op-instantiate']!;
    receipt.response.validation = {
      mode: 'complete',
      ok: true,
      errorCount: 0,
      obligationCount: 0,
      warningCount: 40,
      diagnostics: Array.from({ length: 40 }, (_, index) => ({
        code: 'WARN',
        severity: 'warning',
        message: `padding-warning-${index}-${'m'.repeat(180)}`,
        repairs: [],
      })),
    };
    await writeFile(revisionPath, JSON.stringify(session));

    const replay = await handleApplyDesignPatch(
      {
        designId: 'ack-design',
        expectedRevision: 0,
        operationId: 'op-instantiate',
        operations: [{ op: 'instantiate_recipe', recipe: 'workspace-dashboard', pagePrefix: 'ack' }],
      },
      projectRoot,
    );
    assert.notEqual(replay.isError, true, 'committed replay must acknowledge success');
    assert.notEqual(packet(replay).error?.code, 'PACKET_TOO_LARGE');
    assert.equal(packet(replay).revision, 1);
    assert.equal(packet(replay).operationId, 'op-instantiate');
    assert(resultBytes(replay) <= MAX_DETAIL_BYTES);
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('pinned macro registry load verifies content hashes, not only revision filename', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-registry-hash-'));
  try {
    const registry = minimalRegistry();
    const store = await openFilesystemDesignStore(projectRoot, { create: true });
    await store.create({
      designId: 'hash-pin',
      profile: registry.aliases['store-profile']!,
      operationId: 'op-create',
      registry,
    });
    const registryPath = join(store.getDesignerRoot(), 'registries', `${registry.revision}.json`);
    const pinned = JSON.parse(await readFile(registryPath, 'utf8')) as CompiledMacroRegistry;
    const blockRef = Object.keys(pinned.blocks)[0]!;
    pinned.blocks[blockRef]!.description = 'TAMPERED PINNED REGISTRY CONTENT';
    await writeFile(registryPath, JSON.stringify(pinned));

    await assert.rejects(
      () => store.loadRegistry(registry.revision),
      (error: unknown) =>
        error instanceof MacroError
        && (error.code === 'CORRUPT_SNAPSHOT'
          || error.code === 'HASH_MISMATCH'
          || error.code === 'REGISTRY_INTEGRITY'),
    );
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('rhythm overrides reject parent-directory symlink escape and preserve mapping order', () => {
  const base = join(dirname(fileURLToPath(import.meta.url)), '../tmp');
  const testDir = join(base, 'semantics-parent-symlink');
  const outside = join(base, 'semantics-parent-outside');
  rmSync(testDir, { recursive: true, force: true });
  rmSync(outside, { recursive: true, force: true });
  mkdirSync(testDir, { recursive: true });
  mkdirSync(outside, { recursive: true });
  try {
    const { registry: snapshot } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
    writeFileSync(join(testDir, 'semantics.snapshot.json'), canonicalJson(snapshot));
    const store = createSemanticsStore(testDir);

    const validOverride = JSON.stringify({
      schemaVersion: 1,
      baseProfile: 'default',
      overrideMappings: [{
        id: 'gap-rhythm-sm',
        value: 'gap-3',
        description: 'Project-specific small gap',
      }],
    });
    writeFileSync(join(outside, 'rhythm.json'), validOverride);
    symlinkSync(outside, join(testDir, '.basecoat'));

    const escaped = store.getEffectiveRhythmProfile('default', testDir);
    const escapedValue = escaped.families
      .find(family => family.id === 'spacing')
      ?.mappings.find(mapping => mapping.id === 'gap-rhythm-sm')
      ?.value;
    assert.equal(escapedValue, 'gap-2', 'parent symlink escape must fall back to packaged profile');

    rmSync(join(testDir, '.basecoat'), { force: true });
    mkdirSync(join(testDir, '.basecoat'), { recursive: true });
    writeFileSync(join(testDir, '.basecoat', 'rhythm.json'), JSON.stringify({
      schemaVersion: 1,
      baseProfile: 'default',
      overrideMappings: [
        {
          id: 'gap-rhythm-md',
          value: 'gap-8',
          description: 'Override middle gap',
        },
        {
          id: 'gap-rhythm-sm',
          value: 'gap-3',
          description: 'Override small gap',
        },
      ],
    }));
    const effective = store.getEffectiveRhythmProfile('default', testDir);
    const spacing = effective.families.find(family => family.id === 'spacing');
    assert.deepEqual(
      spacing?.mappings.map(mapping => [mapping.id, mapping.value]),
      [
        ['gap-rhythm-sm', 'gap-3'],
        ['gap-rhythm-md', 'gap-8'],
        ['gap-rhythm-lg', 'gap-6'],
        ['gap-rhythm-xl', 'gap-12'],
      ],
      'overrides must replace in place and keep base mapping order',
    );
  } finally {
    rmSync(testDir, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

test('rhythm override replacement races invalidate prior cursors', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-rhythm-race-'));
  try {
    await mkdir(join(projectRoot, '.basecoat'));
    const writeOverride = async (value: string) => {
      const temp = join(projectRoot, '.basecoat', `rhythm.${process.pid}.${Date.now()}.tmp`);
      await writeFile(temp, JSON.stringify({
        schemaVersion: 1,
        baseProfile: 'default',
        overrideMappings: [{
          id: 'gap-rhythm-sm',
          value,
          description: 'Race override',
        }],
      }));
      const finalPath = join(projectRoot, '.basecoat', 'rhythm.json');
      await writeFile(finalPath, await readFile(temp));
      await rm(temp, { force: true });
    };

    await writeOverride('gap-3');
    const first = packet(await handleGetRhythmRules({ profile: 'default', family: 'spacing', limit: 1 }, projectRoot));
    assert.equal(first.error, undefined);
    const cursor = first.next!;
    const beforeRevision = first.rhythmRules?.effectiveRevision;

    await writeOverride('gap-4');
    const stale = packet(await handleGetRhythmRules({
      profile: 'default',
      family: 'spacing',
      limit: 1,
      cursor,
    }, projectRoot));
    assert.equal(stale.error?.code, 'STALE_CURSOR');

    let found: string | undefined;
    let pageCursor: string | undefined;
    let afterRevision: string | undefined;
    do {
      const page = packet(await handleGetRhythmRules({
        profile: 'default',
        family: 'spacing',
        limit: 1,
        cursor: pageCursor,
      }, projectRoot));
      assert.equal(page.error, undefined);
      afterRevision = page.rhythmRules?.effectiveRevision ?? afterRevision;
      const hit = page.items?.find(item => item.mapping?.id === 'gap-rhythm-sm');
      if (hit) found = hit.mapping?.value;
      pageCursor = page.next ?? undefined;
    } while (pageCursor && found === undefined);

    assert.notEqual(afterRevision, beforeRevision);
    assert.equal(found, 'gap-4');
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('parser accepts exact 65536 UTF-8 bytes and rejects 65537', () => {
  const exact = 'a'.repeat(65_536);
  assert.equal(Buffer.byteLength(exact, 'utf8'), 65_536);
  const ok = validateComposition(exact);
  assert.equal(ok.issues.some(issue => issue.rule === 'input-size'), false);

  const over = 'a'.repeat(65_537);
  assert.equal(Buffer.byteLength(over, 'utf8'), 65_537);
  const bad = validateComposition(over);
  assert(bad.issues.some(issue => issue.rule === 'input-size'));

  const multibyte = `${'界'.repeat(21_845)}!`;
  assert.equal(Buffer.byteLength(multibyte, 'utf8'), 65_536);
  assert.equal(validateComposition(multibyte).issues.some(issue => issue.rule === 'input-size'), false);

  const multibyteOver = `${'界'.repeat(21_845)}!!`;
  assert(Buffer.byteLength(multibyteOver, 'utf8') > 65_536);
  assert(validateComposition(multibyteOver).issues.some(issue => issue.rule === 'input-size'));
});

test('parser reports CRLF and non-BMP locations without executing markup', () => {
  const crlf = parseHtmlWithDiagnostics('<div>\r\n<span>');
  const span = crlf.diagnostics.find(diagnostic => diagnostic.message.includes('<span>'));
  assert.equal(span?.line, 2);
  assert.equal(span?.column, 1);

  const nonBmp = parseHtmlWithDiagnostics('<p title="𐍈">\n</q>');
  const unmatched = nonBmp.diagnostics.find(diagnostic => diagnostic.code === 'unmatched-closing-tag');
  assert.equal(unmatched?.line, 2);
  assert.equal(unmatched?.column, 1);
});

test('rhythm and FSM continuation rejects past-end, changed-limit, and cross-tool cursors', async () => {
  const firstRhythm = packet(await handleGetRhythmRules({ profile: 'default', limit: 1 }));
  assert.equal(firstRhythm.error, undefined);
  const rhythmCursor = firstRhythm.next!;
  const decoded = decodeMacroCursor(rhythmCursor);

  const pastEnd = encodeMacroCursor({ ...decoded, offset: 10_000 });
  assert.equal(
    packet(await handleGetRhythmRules({ profile: 'default', limit: 1, cursor: pastEnd })).error?.code,
    'INVALID_CURSOR',
  );

  const crossTool = packet(await handleGetFsmRecipe({ recipe: 'dialog', limit: 1, cursor: rhythmCursor }));
  assert.equal(crossTool.error?.code, 'CURSOR_MISMATCH');

  const firstFsm = packet(await handleGetFsmRecipe({ recipe: 'dialog', limit: 2 }));
  assert.equal(firstFsm.error, undefined);
  const fsmCursor = firstFsm.next!;
  const changedLimit = packet(await handleGetFsmRecipe({ recipe: 'dialog', limit: 1, cursor: fsmCursor }));
  assert.equal(changedLimit.error, undefined);
  assert.equal(changedLimit.items?.length, 1);
});

test('bounded semantic CallToolResult envelope stays at or below 1999 UTF-8 bytes including isError', async () => {
  const sizes: number[] = [];
  const record = (tool: string, result: CallToolResult) => {
    const bytes = resultBytes(result);
    sizes.push(bytes);
    assert(bytes <= MAX_DETAIL_BYTES, `${tool} is ${bytes} bytes`);
  };

  record('get_rhythm_rules', await handleGetRhythmRules({ profile: 'default', limit: 1 }));
  record('get_fsm_recipe', await handleGetFsmRecipe({ recipe: 'dialog', limit: 1 }));
  record('get_rhythm_rules_error', await handleGetRhythmRules({ profile: 'missing' }));
  record('get_fsm_recipe_error', await handleGetFsmRecipe({ recipe: 'missing' }));
  record('get_rhythm_rules_bad_cursor', await handleGetRhythmRules({
    profile: 'default',
    cursor: 'not-json',
  }));

  let cursor: string | undefined;
  do {
    const result = await handleGetRhythmRules({ profile: 'default', limit: 1, cursor });
    record('get_rhythm_rules_page', result);
    cursor = packet(result).next ?? undefined;
  } while (cursor);

  cursor = undefined;
  do {
    const result = await handleGetFsmRecipe({ recipe: 'dialog', limit: 1, cursor });
    record('get_fsm_recipe_page', result);
    cursor = packet(result).next ?? undefined;
  } while (cursor);

  assert(sizes.length > 0);
  assert(Math.max(...sizes) <= MAX_DETAIL_BYTES);
});
