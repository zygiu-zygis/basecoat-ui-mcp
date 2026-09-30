// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { compileRegistry, contentRef } from '../src/macros/compiler.js';
import {
  MacroError,
  MAX_DETAIL_BYTES,
  pageRecords,
  resultBytes,
  createCursorFactory,
} from '../src/macros/packets.js';
import {
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
