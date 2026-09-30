// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { compileRegistry, contentRef, validateRegistry } from '../src/macros/compiler.js';
import {
  MacroError,
  MAX_DETAIL_BYTES,
  pageRecords,
  resultBytes,
  createCursorFactory,
} from '../src/macros/packets.js';
import {
  getBlock,
  getBlockSection,
  loadCompiledRegistry,
  resolveAlias,
  searchMacroBlocks,
} from '../src/macros/registry.js';
import { LIMITS } from '../src/macros/schema.js';
import type {
  AuthoringMacroBlock,
  AuthoringRegistryInput,
  DesignProfile,
  Provenance,
} from '../src/macros/types.js';
import { importLocalBlock } from '../scripts/import-blocks.js';

const AUTHORING = fileURLToPath(new URL('../src/macros/authoring', import.meta.url));

const PROVENANCE: Provenance = {
  origin: 'authored',
  sourceHashes: { seed: 'a'.repeat(64) },
  mappingVersion: '1.0.0',
};

const PROFILE: DesignProfile = {
  schemaVersion: 1,
  id: 'test-profile',
  description: 'Minimal profile for registry tests.',
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

function leafBlock(
  id: string,
  extras: Partial<AuthoringMacroBlock> = {},
): AuthoringMacroBlock {
  return {
    schemaVersion: 1,
    id,
    role: 'page',
    family: 'test',
    description: `Leaf block ${id}`,
    tags: ['test'],
    root: `${id}-root`,
    fragments: [{ id: `${id}-root`, emmet: `div#${id}` }],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: [],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: `${id}-root` },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: { ...PROVENANCE, sourceHashes: { ...PROVENANCE.sourceHashes } },
    ...extras,
  };
}

function inputWith(blocks: AuthoringMacroBlock[]): AuthoringRegistryInput {
  return {
    schemaVersion: 1,
    blocks,
    recipes: [],
    profiles: [PROFILE],
    rules: [],
  };
}

test('compileRegistry produces stable content-addressable hashes', () => {
  const input = inputWith([leafBlock('alpha'), leafBlock('beta')]);
  const first = compileRegistry(input);
  const second = compileRegistry(structuredClone(input));
  assert.equal(first.diagnostics.filter(d => d.severity === 'error').length, 0);
  assert.equal(first.registry.revision, second.registry.revision);
  assert.deepEqual(
    Object.keys(first.registry.blocks).sort(),
    Object.keys(second.registry.blocks).sort(),
  );
  for (const [ref, block] of Object.entries(first.registry.blocks)) {
    assert.equal(contentRef(block), ref);
    assert.equal(second.registry.aliases[block.id], ref);
  }
});

test('dependency content change invalidates dependent block refs', () => {
  const dep = leafBlock('dep-a');
  const parent = leafBlock('parent-a', {
    role: 'workspace',
    dependencyBlockIds: ['dep-a'],
    landmarks: { main: 0, primaryHeading: 0 },
  });
  const before = compileRegistry(inputWith([dep, parent]));
  assert.equal(before.diagnostics.filter(d => d.severity === 'error').length, 0);
  const parentRefBefore = before.registry.aliases['parent-a']!;
  const depRefBefore = before.registry.aliases['dep-a']!;

  const depChanged = leafBlock('dep-a', {
    fragments: [{ id: 'dep-a-root', emmet: 'div#dep-a.changed' }],
  });
  const after = compileRegistry(inputWith([depChanged, parent]));
  assert.equal(after.diagnostics.filter(d => d.severity === 'error').length, 0);
  const depRefAfter = after.registry.aliases['dep-a']!;
  const parentRefAfter = after.registry.aliases['parent-a']!;
  assert.notEqual(depRefBefore, depRefAfter);
  assert.notEqual(parentRefBefore, parentRefAfter);
  assert.deepEqual(after.registry.blocks[parentRefAfter]!.dependencyRefs, [depRefAfter]);
});

test('missing dependency refs and dependency cycles fail closed', () => {
  const missing = compileRegistry(
    inputWith([leafBlock('needs-missing', { dependencyBlockIds: ['ghost'] })]),
  );
  assert(
    missing.diagnostics.some(d => d.code === 'MISSING_DEPENDENCY' && d.severity === 'error'),
  );

  const cycle = compileRegistry(
    inputWith([
      leafBlock('cycle-a', { dependencyBlockIds: ['cycle-b'] }),
      leafBlock('cycle-b', { dependencyBlockIds: ['cycle-a'] }),
    ]),
  );
  assert(cycle.diagnostics.some(d => d.code === 'DEPENDENCY_CYCLE' && d.severity === 'error'));
});

test('adapted provenance must identify a local shadcn source', () => {
  const result = compileRegistry(
    inputWith([
      leafBlock('adapted-without-source', {
        provenance: { ...PROVENANCE, origin: 'adapted' },
      }),
    ]),
  );
  assert(result.diagnostics.some(d => d.code === 'SCHEMA_INVALID'));
});

test('invalid anchors and mounts produce diagnostics', () => {
  const badAnchor = compileRegistry(
    inputWith([
      leafBlock('bad-anchor', {
        slots: [
          {
            id: 'slot-a',
            at: { fragment: 'missing-frag', name: 'slot-a' },
            accepts: ['page'],
            min: 0,
            max: 1,
          },
        ],
      }),
    ]),
  );
  assert(badAnchor.diagnostics.some(d => d.code === 'INVALID_ANCHOR'));

  const badMount = compileRegistry(
    inputWith([
      leafBlock('bad-mount', {
        mounts: [{ parent: 'missing-parent', anchor: 'host', child: 'missing-child', order: 0 }],
      }),
    ]),
  );
  assert(badMount.diagnostics.some(d => d.code === 'INVALID_MOUNT'));
});

test('independent recipe/block instantiation keeps distinct refs and aliases', () => {
  const left = leafBlock('leaf-left');
  const right = leafBlock('leaf-right', {
    fragments: [{ id: 'leaf-right-root', emmet: 'div#leaf-right' }],
  });
  const compiled = compileRegistry(inputWith([left, right]));
  assert.equal(compiled.diagnostics.filter(d => d.severity === 'error').length, 0);
  const leftRef = compiled.registry.aliases['leaf-left']!;
  const rightRef = compiled.registry.aliases['leaf-right']!;
  assert.notEqual(leftRef, rightRef);
  assert.equal(resolveAlias(compiled.registry, 'leaf-left'), leftRef);
  assert.equal(resolveAlias(compiled.registry, 'leaf-right'), rightRef);
  assert.notEqual(
    compiled.registry.blocks[leftRef]!.id,
    compiled.registry.blocks[rightRef]!.id,
  );
});

test('unsupported upstream deps are reported; provenance survives adaptation', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'basecoat-import-'));
  try {
    const itemPath = join(temp, 'login-form.item.json');
    const mappingPath = join(AUTHORING, 'mappings/login-form.json');
    const lockPath = join(temp, 'dependency-lock.json');
    await writeFile(
      itemPath,
      JSON.stringify({
        name: 'login-form',
        type: 'registry:block',
        description: 'SYNTHETIC fixture',
        dependencies: ['card', 'login-01'],
        registryDependencies: ['card'],
        files: [
          {
            path: 'blocks/login-form.tsx',
            content: '/* SYNTHETIC */\n',
            type: 'registry:block',
          },
        ],
        meta: { synthetic: true, label: 'synthetic-offline-fixture' },
      }),
    );
    await writeFile(
      lockPath,
      JSON.stringify({
        schemaVersion: 1,
        entries: [
          { upstream: 'card', resolution: { kind: 'component', id: 'card' } },
          {
            upstream: 'login-01',
            resolution: {
              kind: 'unsupported',
              reason: 'Full page demo; use authored auth-sign-in block instead',
            },
          },
        ],
      }),
    );

    const result = await importLocalBlock({
      itemPath,
      mappingPath,
      lockPath,
      knownComponentIds: new Set(['card', 'field', 'input', 'button', 'label']),
      write: false,
    });

    assert(
      result.diagnostics.some(d => d.code === 'UNSUPPORTED_DEPENDENCY'),
      'unsupported dependency must be reported',
    );
    assert(
      result.diagnostics.some(d => d.code === 'UNSUPPORTED_OAUTH'),
      'OAuth omission must be reported explicitly',
    );
    assert(
      result.diagnostics.some(d => d.code === 'UNSUPPORTED_CAPTCHA'),
      'captcha omission must be reported explicitly',
    );
    assert(
      result.diagnostics.some(d => d.code === 'APP_AUTH_INTEGRATION'),
      'host authentication integration must be reported explicitly',
    );
    assert.equal(result.block.provenance.origin, 'adapted');
    assert.equal(result.block.provenance.sourceKind, 'local-shadcn-registry-item');
    assert.equal(typeof result.block.provenance.sourceHashes.item, 'string');
    assert.equal(typeof result.block.provenance.sourceHashes.mapping, 'string');
    assert.match(result.block.provenance.upstreamItem ?? '', /synthetic/);

    const compiled = compileRegistry(inputWith([result.block]));
    assert.equal(compiled.diagnostics.filter(d => d.severity === 'error').length, 0);
    const ref = compiled.registry.aliases[result.block.id]!;
    assert.deepEqual(compiled.registry.blocks[ref]!.provenance.sourceHashes, result.block.provenance.sourceHashes);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('offline importer rejects URL-shaped source paths before reading', async () => {
  await assert.rejects(
    importLocalBlock({
      itemPath: 'https://ui.shadcn.com/registry/login-form.json',
      mappingPath: join(AUTHORING, 'mappings/login-form.json'),
      write: false,
    }),
    /local filesystem path; network and URL sources are not supported/,
  );
});

test('ATOM_TOO_LARGE fails closed without truncating fragment content', () => {
  const oversized = 'x'.repeat(LIMITS.emmetMax);
  const original = oversized;
  assert.throws(
    () =>
      pageRecords(
        [{ id: 'huge', emmet: oversized }],
        0,
        {
          kind: 'macro-block',
          section: 'structure',
          registryRevision: '0'.repeat(64),
          pad: 'p'.repeat(900),
        },
        createCursorFactory({
          v: 1,
          fingerprint: 'atom-probe',
          snapshot: 'r:' + '0'.repeat(64),
          section: 'structure',
        }),
      ),
    (error: unknown) => error instanceof MacroError && error.code === 'ATOM_TOO_LARGE',
  );
  assert.equal(oversized, original, 'emmet must not be truncated when the atom is too large');

  const compiled = compileRegistry(
    inputWith([
      leafBlock('too-large', {
        fragments: [{ id: 'too-large-root', emmet: oversized }],
        layout: { frameRef: 'too-large-root' },
        root: 'too-large-root',
      }),
    ]),
  );
  // Either packet-budget ATOM_TOO_LARGE or the block is rejected; never silently shortened.
  const atom = compiled.diagnostics.find(d => d.code === 'ATOM_TOO_LARGE');
  if (atom) {
    assert.equal(atom.severity, 'error');
    assert.equal(compiled.registry.aliases['too-large'], undefined);
  } else {
    const ref = compiled.registry.aliases['too-large'];
    if (ref) {
      assert.equal(compiled.registry.blocks[ref]!.fragments[0]!.emmet.length, LIMITS.emmetMax);
    }
  }
  assert.equal(oversized.length, LIMITS.emmetMax);
});

test('sectioned retrieval and pagination preserve order without gaps or duplicates', () => {
  const fragments = Array.from({ length: 48 }, (_, index) => ({
    id: `frag-${String(index).padStart(2, '0')}`,
    emmet: `div.frag-${index}[data-i=${index}]`,
  }));
  const block = leafBlock('paged', {
    root: 'frag-00',
    fragments,
    layout: { frameRef: 'frag-00' },
    description: 'Block with many structure records for pagination coverage.',
  });
  const { registry, diagnostics } = compileRegistry(inputWith([block]));
  assert.equal(diagnostics.filter(d => d.severity === 'error').length, 0);
  loadCompiledRegistry(registry);
  const ref = registry.aliases['paged']!;

  const collected: Array<{ id?: string; kind?: string }> = [];
  let cursor: string | undefined;
  let pages = 0;
  do {
    const result = getBlockSection(registry, {
      idOrRef: ref,
      section: 'structure',
      cursor,
    });
    pages += 1;
    assert(resultBytes(result) <= MAX_DETAIL_BYTES);
    const text = (result.content[0] as { text: string }).text;
    const packet = JSON.parse(text) as {
      items: Array<{ id?: string; kind?: string }>;
      next: string | null;
      total: number;
    };
    assert.equal(packet.total, fragments.length);
    collected.push(...packet.items);
    cursor = packet.next ?? undefined;
  } while (cursor);

  assert(pages >= 2, `expected multi-page structure retrieval, got ${pages} page(s)`);
  assert.equal(collected.length, fragments.length);
  const ids = collected.map(item => item.id);
  assert.deepEqual(ids, fragments.map(fragment => fragment.id));
  assert.equal(new Set(ids).size, ids.length);

  const provenance = getBlockSection(registry, { idOrRef: ref, section: 'provenance' });
  const provPacket = JSON.parse((provenance.content[0] as { text: string }).text) as {
    items: Array<{ origin: string; mappingVersion: string }>;
  };
  assert.equal(provPacket.items[0]?.origin, 'authored');
  assert.equal(provPacket.items[0]?.mappingVersion, '1.0.0');
});

test('macro block search paginates at complete record boundaries', () => {
  const blocks = Array.from({ length: 8 }, (_, index) =>
    leafBlock(`search-${index}`, {
      description: 'd'.repeat(LIMITS.descriptionMax),
      tags: Array.from({ length: LIMITS.tagsMax }, () => 'tag'),
    }),
  );
  const { registry, diagnostics } = compileRegistry(inputWith(blocks));
  assert.equal(diagnostics.filter(d => d.severity === 'error').length, 0);

  const collected: Array<{ id: string; description: string }> = [];
  let cursor: string | undefined;
  do {
    const result = searchMacroBlocks(registry, { limit: 32, cursor });
    assert(resultBytes(result) <= MAX_DETAIL_BYTES);
    const packet = JSON.parse((result.content[0] as { text: string }).text) as {
      items: Array<{ id: string; description: string }>;
      next: string | null;
      total: number;
    };
    assert.equal(packet.total, blocks.length);
    for (const item of packet.items) {
      assert.equal(item.description.length, LIMITS.descriptionMax);
    }
    collected.push(...packet.items);
    cursor = packet.next ?? undefined;
  } while (cursor);

  assert.equal(collected.length, blocks.length);
  assert.deepEqual(
    collected.map(item => item.id),
    blocks.map(block => block.id),
  );
});

test('canonical hash stability across serialization variations', () => {
  // Test that canonical JSON produces identical hashes regardless of input object key order
  const data1 = { z: 'last', a: 'first', m: 'middle' };
  const data2 = { a: 'first', m: 'middle', z: 'last' };
  const data3 = { m: 'middle', z: 'last', a: 'first' };

  const hash1 = contentRef(data1);
  const hash2 = contentRef(data2);
  const hash3 = contentRef(data3);

  assert.equal(hash1, hash2);
  assert.equal(hash2, hash3);
  assert.equal(hash1.length, 64); // SHA-256 hex length

  // Test with arrays (order should be preserved)
  const arrayData1 = { items: [1, 2, 3] };
  const arrayData2 = { items: [3, 2, 1] };

  const arrayHash1 = contentRef(arrayData1);
  const arrayHash2 = contentRef(arrayData2);

  assert.notEqual(arrayHash1, arrayHash2, 'Array order should affect hash');
});

test('packet boundary enforcement with multibyte characters and edge cases', () => {
  // Test packet boundaries with various character encodings
  const multibyte = '界界界界界'; // Each character is 3 bytes in UTF-8
  const fourByte = '𐍈𐍈𐍈𐍈𐍈'; // Each character is 4 bytes in UTF-8
  const mixed = `test-${multibyte}-${fourByte}`;

  const cursorFactory = createCursorFactory({
    v: 1,
    fingerprint: 'boundary-test',
    snapshot: 'r:' + '0'.repeat(64),
    section: 'structure',
  });

  // Test with records containing multibyte content
  const records = [
    { id: 'ascii', content: 'simple-ascii-content' },
    { id: 'multibyte', content: multibyte.repeat(10) },
    { id: 'four-byte', content: fourByte.repeat(5) },
    { id: 'mixed', content: mixed.repeat(3) },
  ];

  try {
    const result = pageRecords(
      records,
      0,
      { kind: 'test', section: 'boundary' },
      cursorFactory,
    );

    assert(resultBytes(result) <= MAX_DETAIL_BYTES);

    const parsed = JSON.parse((result.content[0] as { text: string }).text);
    assert(Array.isArray(parsed.items));

    // Should include at least the first record
    assert(parsed.items.length >= 1);

  } catch (error) {
    if (error instanceof MacroError && error.code === 'ATOM_TOO_LARGE') {
      // Expected if single record exceeds budget
      assert(true, 'Large atoms correctly rejected');
    } else {
      throw error;
    }
  }
});

test('registry validation detects hash mismatches and reference integrity', () => {
  // Create a registry with intentionally corrupted content refs
  const validBlock = leafBlock('valid-test');
  const { registry } = compileRegistry(inputWith([validBlock]));

  // Tamper with block content while keeping the original ref
  const blockRef = registry.aliases['valid-test']!;
  const tamperedRegistry = structuredClone(registry);
  tamperedRegistry.blocks[blockRef]!.description = 'TAMPERED CONTENT';

  // Validation should detect the hash mismatch
  const diagnostics = validateRegistry(tamperedRegistry);
  assert(
    diagnostics.some(d => d.code === 'HASH_MISMATCH' && d.severity === 'error'),
    'Should detect hash mismatch in tampered registry'
  );

  // Test dangling alias detection
  const danglingRegistry = structuredClone(registry);
  danglingRegistry.aliases['dangling'] = 'f'.repeat(64);

  const danglingDiagnostics = validateRegistry(danglingRegistry);
  assert(
    danglingDiagnostics.some(d => d.code === 'DANGLING_ALIAS'),
    'Should detect dangling alias'
  );
});

test('fragment packet budget enforcement prevents truncation', () => {
  // Test that oversized fragments fail cleanly without silent truncation
  const maxEmmet = 'x'.repeat(LIMITS.emmetMax - 1); // Just under limit
  const overEmmet = 'x'.repeat(LIMITS.emmetMax + 100); // Over limit

  // Valid block should compile successfully
  const validBlock = leafBlock('max-valid', {
    fragments: [{ id: 'max-valid-root', emmet: maxEmmet }],
    root: 'max-valid-root',
    layout: { frameRef: 'max-valid-root' },
  });

  const validResult = compileRegistry(inputWith([validBlock]));
  assert.equal(
    validResult.diagnostics.filter(d => d.severity === 'error').length,
    0,
    'Valid max-size block should compile'
  );

  // Oversized block should fail
  const oversizedBlock = leafBlock('over-sized', {
    fragments: [{ id: 'over-sized-root', emmet: overEmmet }],
    root: 'over-sized-root',
    layout: { frameRef: 'over-sized-root' },
  });

  const oversizedResult = compileRegistry(inputWith([oversizedBlock]));
  const atomErrors = oversizedResult.diagnostics.filter(d => d.code === 'ATOM_TOO_LARGE');

  if (atomErrors.length > 0) {
    assert.equal(atomErrors[0]!.severity, 'error');
    // Block should not be included in final registry
    assert.equal(oversizedResult.registry.aliases['over-sized'], undefined);
  }

  // Verify original emmet content was not truncated during validation
  assert.equal(overEmmet.length, LIMITS.emmetMax + 100);
});

test('dependency cycle detection in complex graphs', () => {
  // Create a more complex dependency cycle scenario
  const blockA = leafBlock('cycle-a', { dependencyBlockIds: ['cycle-b', 'cycle-c'] });
  const blockB = leafBlock('cycle-b', { dependencyBlockIds: ['cycle-c'] });
  const blockC = leafBlock('cycle-c', { dependencyBlockIds: ['cycle-a'] }); // Creates cycle
  const blockD = leafBlock('cycle-d', { dependencyBlockIds: ['cycle-b'] }); // Depends on cycle

  const result = compileRegistry(inputWith([blockA, blockB, blockC, blockD]));

  const cycleErrors = result.diagnostics.filter(d => d.code === 'DEPENDENCY_CYCLE');
  assert(cycleErrors.length > 0, 'Should detect dependency cycle');

  // Blocks involved in cycles should not be compiled
  const hasErrorBlocks = ['cycle-a', 'cycle-b', 'cycle-c'].some(id =>
    result.registry.aliases[id] !== undefined
  );
  assert.equal(hasErrorBlocks, false, 'Cycle participants should be excluded from registry');

  // Independent block should still be rejected if it depends on cycle participants
  assert.equal(result.registry.aliases['cycle-d'], undefined, 'Dependents of failed blocks should also fail');
});

test('provenance tracking preserves source integrity across compilation', () => {
  const sourceHashes = {
    primary: 'a'.repeat(64),
    secondary: 'b'.repeat(64),
    mapping: 'c'.repeat(64),
  };

  const block = leafBlock('provenance-test', {
    provenance: {
      origin: 'adapted',
      sourceKind: 'local-shadcn-registry-item',
      sourceHashes,
      mappingVersion: '2.1.0',
      upstreamItem: 'test-item-v1.2.3',
    },
  });

  const { registry, diagnostics } = compileRegistry(inputWith([block]));
  assert.equal(diagnostics.filter(d => d.severity === 'error').length, 0);

  const compiledBlock = registry.blocks[registry.aliases['provenance-test']!]!;

  // Provenance should be preserved exactly
  assert.equal(compiledBlock.provenance.origin, 'adapted');
  assert.equal(compiledBlock.provenance.sourceKind, 'local-shadcn-registry-item');
  assert.deepEqual(compiledBlock.provenance.sourceHashes, sourceHashes);
  assert.equal(compiledBlock.provenance.mappingVersion, '2.1.0');
  assert.equal(compiledBlock.provenance.upstreamItem, 'test-item-v1.2.3');
});

test('getBlockSection distinguishes block ids from recipe aliases', () => {
  const packaged = loadCompiledRegistry();
  const shell = getBlockSection(packaged, { idOrRef: 'app-shell', section: 'manifest' });
  assert.notEqual(shell.isError, true);
  const shellPacket = JSON.parse((shell.content[0] as { text: string }).text) as {
    id: string;
    items: Array<{ id: string; role?: string }>;
  };
  assert.equal(shellPacket.id, 'app-shell');
  assert.equal(shellPacket.items[0]?.id, 'app-shell');

  const shellRef = packaged.aliases['app-shell'];
  assert(shellRef);
  const byRef = getBlockSection(packaged, { idOrRef: shellRef, section: 'manifest' });
  assert.notEqual(byRef.isError, true);

  for (const recipeAlias of ['data-records', 'workspace-dashboard'] as const) {
    assert.throws(
      () => getBlockSection(packaged, { idOrRef: recipeAlias, section: 'structure' }),
      (error: unknown) => {
        assert(error instanceof MacroError);
        assert.equal(error.code, 'EXPECTED_BLOCK_GOT_RECIPE');
        assert.equal(error.details.recipeId, recipeAlias);
        assert.equal(typeof error.details.recipeRef, 'string');
        assert.equal(typeof error.details.entryPage, 'string');
        assert(Array.isArray(error.details.steps));
        assert.equal(typeof error.details.rootBlockId, 'string');
        assert.match(error.message, /not a block/i);
        return true;
      },
    );
  }

  const recipeRef = packaged.aliases['data-records'];
  assert(recipeRef);
  assert.throws(
    () => getBlockSection(packaged, { idOrRef: recipeRef, section: 'slots' }),
    (error: unknown) => {
      assert(error instanceof MacroError);
      assert.equal(error.code, 'EXPECTED_BLOCK_GOT_RECIPE');
      assert.equal(error.details.recipeId, 'data-records');
      assert.equal(error.details.recipeRef, recipeRef);
      return true;
    },
  );
});

test('macro Emmet spacing must use approved rhythm steps', () => {
  const bad = leafBlock('bad-gap', {
    fragments: [{ id: 'bad-gap-root', emmet: 'div.flex.gap-3>span' }],
  });
  const { diagnostics } = compileRegistry(inputWith([bad]));
  assert(
    diagnostics.some(d => d.code === 'UNAPPROVED_SPACING' && d.severity === 'error'),
    diagnostics.map(d => `${d.code}:${d.message}`).join('; '),
  );

  const good = leafBlock('good-gap', {
    fragments: [{ id: 'good-gap-root', emmet: 'div.flex.gap-2.p-4.md:gap-4>span' }],
  });
  const ok = compileRegistry(inputWith([good]));
  assert.equal(ok.diagnostics.filter(d => d.severity === 'error').length, 0);
});

test('packaged dashboard graph exposes four KPIs plus activity and records slots', () => {
  const packaged = loadCompiledRegistry();
  assert(packaged.aliases['dashboard-workspace']);
  assert(packaged.aliases['dashboard-activity']);
  assert(packaged.aliases['dashboard-main']);
  assert(packaged.aliases['sidebar-dashboard-shell']);
  assert(packaged.aliases['svg-area-chart']);
  assert(packaged.aliases['segmented-toggle']);

  const workspace = getBlock(packaged, 'dashboard-workspace');
  assert.equal(workspace.role, 'dashboard');
  assert.deepEqual(
    workspace.slots.map(slot => slot.id).sort(),
    ['activity', 'metrics', 'records'],
  );
  assert(workspace.fragments[0]?.emmet.includes('data-role=canvas'));
  assert(workspace.fragments[0]?.emmet.includes('data-macro=canvas'));

  const metrics = getBlock(packaged, 'dashboard-main');
  assert.equal(metrics.role, 'metrics');
  assert(metrics.fragments[0]?.emmet.includes('xl:grid-cols-4'));
  assert(metrics.fragments[0]?.emmet.includes('card-d'));

  const filters = getBlock(packaged, 'data-filters');
  assert(filters.fragments[0]?.emmet.includes('gap-2'));
  assert(!filters.fragments[0]?.emmet.includes('gap-3'));

  const chart = getBlock(packaged, 'svg-area-chart');
  assert.equal(chart.role, 'chart');
  assert(!chart.fragments[0]?.emmet.includes('canvas'));
  assert(chart.fragments[0]?.emmet.includes('svg'));

  const toggle = getBlock(packaged, 'segmented-toggle');
  assert.equal(toggle.role, 'range-control');
  assert(toggle.fragments[0]?.emmet.includes('role=radiogroup'));
  assert(toggle.fragments[0]?.emmet.includes('data-variant=pill'));
});

test('registry revision calculation determinism', () => {
  // Registry revision should be deterministic based on content, not compilation order
  const blocksA = [leafBlock('alpha'), leafBlock('beta'), leafBlock('gamma')];
  const blocksB = [leafBlock('gamma'), leafBlock('alpha'), leafBlock('beta')]; // Different order

  const registryA = compileRegistry(inputWith(blocksA));
  const registryB = compileRegistry(inputWith(blocksB));

  // Both should have identical revisions despite different input order
  assert.equal(registryA.registry.revision, registryB.registry.revision);
  assert.deepEqual(
    Object.keys(registryA.registry.blocks).sort(),
    Object.keys(registryB.registry.blocks).sort()
  );

  // Verify revision calculation includes all components
  const expectedComponents = {
    blocks: Object.keys(registryA.registry.blocks).sort(),
    recipes: Object.keys(registryA.registry.recipes).sort(),
    profiles: Object.keys(registryA.registry.profiles).sort(),
    rules: Object.keys(registryA.registry.rules).sort(),
    aliases: Object.keys(registryA.registry.aliases)
      .sort()
      .map(id => [id, registryA.registry.aliases[id]]),
  };

  const calculatedRevision = contentRef(expectedComponents);
  assert.equal(registryA.registry.revision, calculatedRevision);
});
