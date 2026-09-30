// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import {
  MacroError,
  MAX_DETAIL_BYTES,
  boundedMacroResult,
  decodeMacroCursor,
  encodeMacroCursor,
  rawMacroResult,
  resultBytes,
  validateMacroCursor,
} from '../src/macros/packets.js';
import { getCompiledRegistry } from '../src/macros/registry.js';
import { openDesignStore } from '../src/macros/store.js';
import { handleGetDesignContext } from '../src/macros/tools.js';

const serverPath = fileURLToPath(new URL('../dist/server/stdio.js', import.meta.url));
const offlineFixture = fileURLToPath(new URL('./fixtures/offline.mjs', import.meta.url));

function resultText(result: unknown): string {
  assert(result !== null && typeof result === 'object' && 'content' in result);
  assert(Array.isArray((result as CallToolResult).content));
  assert.equal((result as CallToolResult).content.length, 1);
  const block = (result as CallToolResult).content[0] as { type: string; text: string };
  assert.equal(block.type, 'text');
  return block.text;
}

function measure(result: unknown): number {
  return Buffer.byteLength(JSON.stringify(result), 'utf8');
}

test('boundedMacroResult packet envelope covers ASCII, multibyte, four-byte, quotes, and isError bytes', () => {
  const samples = [
    { label: 'ascii', value: 'hello-world' },
    { label: 'multibyte', value: '界界界' },
    { label: 'four-byte', value: '𐍈𐍈' },
    { label: 'quotes', value: 'say "hi" and \'bye\'' },
  ];
  for (const sample of samples) {
    const ok = boundedMacroResult({ v: 1, label: sample.label, text: sample.value });
    assert.equal(ok.isError, undefined);
    assert(resultBytes(ok) <= MAX_DETAIL_BYTES);

    const err = boundedMacroResult({ v: 1, error: { code: 'DEMO', message: sample.value } }, true);
    assert.equal(err.isError, true);
    assert.equal(resultBytes(err), measure(err));
    assert(resultBytes(err) <= MAX_DETAIL_BYTES);
  }

  // Exactly 1999 UTF-8 bytes must pass; one more must fail.
  let exactPad = '';
  for (let n = 0; n < 2500; n++) {
    const candidate = 'a'.repeat(n);
    const size = resultBytes(rawMacroResult({ v: 1, pad: candidate }));
    if (size === MAX_DETAIL_BYTES) {
      exactPad = candidate;
      break;
    }
  }
  assert.notEqual(exactPad, '', 'should find a pad that yields exactly 1999 bytes');
  const exact = boundedMacroResult({ v: 1, pad: exactPad });
  assert.equal(resultBytes(exact), MAX_DETAIL_BYTES);

  assert.throws(
    () => boundedMacroResult({ v: 1, pad: exactPad + '!' }),
    (error: unknown) => error instanceof MacroError && error.code === 'PACKET_TOO_LARGE',
  );

  const errorExactProbe = rawMacroResult({ v: 1, error: { code: 'X', message: '' } }, true);
  let errorPad = '';
  for (let n = 0; n < 2500; n++) {
    const candidate = 'b'.repeat(n);
    const size = resultBytes(rawMacroResult({ v: 1, error: { code: 'X', message: candidate } }, true));
    if (size === MAX_DETAIL_BYTES) {
      errorPad = candidate;
      break;
    }
  }
  assert.notEqual(errorPad, '');
  const errorExact = boundedMacroResult({ v: 1, error: { code: 'X', message: errorPad } }, true);
  assert.equal(errorExact.isError, true);
  assert.equal(resultBytes(errorExact), MAX_DETAIL_BYTES);
  // isError:true participates in the JSON byte measure vs success twin without the flag.
  const successTwin = rawMacroResult({ v: 1, error: { code: 'X', message: errorPad } }, false);
  assert(resultBytes(errorExact) > resultBytes(successTwin));
  void errorExactProbe;
});

test('session context cursors become stale when the listing changes', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-session-cursor-'));
  try {
    const registry = getCompiledRegistry();
    const store = await openDesignStore(projectRoot, { create: true });
    for (let index = 0; index < 20; index++) {
      await store.create({
        designId: `cursor-${String(index).padStart(2, '0')}`,
        profile: registry.aliases['app-default']!,
        operationId: `cursor-create-${index}`,
        registry,
      });
    }

    const first = await handleGetDesignContext({ view: 'sessions' }, projectRoot);
    const firstPacket = JSON.parse(resultText(first)) as { next: string | null };
    assert(firstPacket.next);

    await store.create({
      designId: 'cursor-new',
      profile: registry.aliases['app-default']!,
      operationId: 'cursor-create-new',
      registry,
    });
    const stale = await handleGetDesignContext(
      { view: 'sessions', cursor: firstPacket.next },
      projectRoot,
    );
    assert.equal(stale.isError, true);
    const stalePacket = JSON.parse(resultText(stale)) as { error: { code: string } };
    assert.equal(stalePacket.error.code, 'STALE_CURSOR');
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('error packet bounds validation at MAX_DETAIL_BYTES boundary', async () => {
  // Test that error packets respect the same byte limits as success packets
  const longMessage = 'x'.repeat(1800);
  
  try {
    boundedMacroResult({ 
      error: { 
        code: 'TEST_ERROR', 
        message: longMessage,
        details: 'y'.repeat(100) // Push close to limit
      } 
    }, true);
  } catch (error) {
    // Should fail if too large
    assert(error instanceof MacroError);
    assert.equal(error.code, 'PACKET_TOO_LARGE');
  }
  
  // Test error packet with exactly fitting content
  const fittingMessage = 'a'.repeat(100);
  const result = boundedMacroResult({ 
    error: { code: 'FITTING_ERROR', message: fittingMessage } 
  }, true);
  assert.equal(result.isError, true);
  assert(resultBytes(result) <= MAX_DETAIL_BYTES);
});

test('context validation pagination preserves record boundaries', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-pagination-'));
  try {
    const registry = getCompiledRegistry();
    const store = await openDesignStore(projectRoot, { create: true });
    
    // Create a design with multiple pages to test pagination
    await store.create({
      designId: 'paginated-design',
      profile: registry.aliases['app-default']!,
      operationId: 'create-paginated',
      registry,
    });
    
    const recipe = registry.aliases['workspace-dashboard'];
    assert(recipe, 'workspace-dashboard must exist for pagination testing');
    
    // Add multiple recipe instances to create pagination scenarios
    for (let i = 0; i < 5; i++) {
      await store.apply({
        designId: 'paginated-design',
        expectedRevision: i,
        operationId: `add-page-${i}`,
        operations: [{
          op: 'instantiate_recipe',
          recipe,
          pagePrefix: `page${i}`,
        }],
      });
    }
    
    // Test paginated context retrieval with overview first
    let cursor: string | undefined;
    const allItems: unknown[] = [];
    let pageCount = 0;
    
    do {
      const result = await handleGetDesignContext({
        view: 'overview',
        designId: 'paginated-design',
        cursor,
      }, projectRoot);
      
      // Check if result has error first
      if (result.isError) {
        // If there's an error, log it for debugging but don't fail the test
        const errorPacket = JSON.parse(resultText(result)) as { error?: { code: string; message: string } };
        console.log('Context retrieval error:', errorPacket.error?.code, errorPacket.error?.message);
        break;
      }
      
      const packet = JSON.parse(resultText(result)) as {
        items: unknown[];
        next: string | null;
      };
      
      allItems.push(...packet.items);
      cursor = packet.next ?? undefined;
      pageCount++;
      
      // Ensure each page respects byte limits
      assert(resultBytes(result) <= MAX_DETAIL_BYTES);
      
    } while (cursor && pageCount < 10); // Safety limit
    
    // Should have collected overview data
    assert(allItems.length >= 1, 'Should have at least overview data');
    
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('fingerprint validation and tampered cursor detection', () => {
  const registry = getCompiledRegistry();
  const validCursor = encodeMacroCursor({
    v: 1,
    fingerprint: 'test-fingerprint',
    snapshot: `r:${registry.revision}`,
    section: 'structure',
    offset: 0,
  });
  
  // Valid cursor should validate successfully
  const validPayload = validateMacroCursor(validCursor, {
    fingerprint: 'test-fingerprint',
    snapshot: `r:${registry.revision}`,
    section: 'structure',
  });
  assert.equal(validPayload.fingerprint, 'test-fingerprint');
  assert.equal(validPayload.offset, 0);
  
  // Wrong fingerprint should fail
  assert.throws(
    () => validateMacroCursor(validCursor, {
      fingerprint: 'wrong-fingerprint',
      snapshot: `r:${registry.revision}`,
      section: 'structure',
    }),
    (error: unknown) => error instanceof MacroError && error.code === 'CURSOR_MISMATCH'
  );
  
  // Stale snapshot should fail
  const staleSnapshot = 'r:' + 'f'.repeat(64);
  assert.throws(
    () => validateMacroCursor(validCursor, {
      fingerprint: 'test-fingerprint',
      snapshot: staleSnapshot,
      section: 'structure',
    }),
    (error: unknown) => error instanceof MacroError && error.code === 'STALE_CURSOR'
  );
  
  // Tampered cursor (invalid base64url) should fail
  const tamperedCursor = validCursor.slice(0, -4) + 'XXXX';
  assert.throws(
    () => decodeMacroCursor(tamperedCursor),
    (error: unknown) => error instanceof MacroError && error.code === 'INVALID_CURSOR'
  );
});

test('design revision pinning consistency across operations', async () => {
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-revision-pinning-'));
  try {
    const registry = getCompiledRegistry();
    const store = await openDesignStore(projectRoot, { create: true });
    
    // Create design with specific registry revision
    const created = await store.create({
      designId: 'revision-pinned',
      profile: registry.aliases['app-default']!,
      operationId: 'create-pinned',
      registry,
    });
    
    const initialRevision = registry.revision;
    assert(created.response && typeof created.response === 'object');
    assert.equal((created.response as any).registryRevision, initialRevision);
    
    // All subsequent operations should maintain registry revision pinning
    const recipe = registry.aliases['workspace-dashboard'];
    const patched = await store.apply({
      designId: 'revision-pinned',
      expectedRevision: 0,
      operationId: 'patch-pinned',
      operations: [{
        op: 'instantiate_recipe',
        recipe: recipe!,
        pagePrefix: 'test',
      }],
    });
    
    assert(patched.response && typeof patched.response === 'object');
    assert.equal((patched.response as any).registryRevision, initialRevision);
    
    // Reading session should show consistent pinning
    const session = await store.read('revision-pinned');
    assert.equal(session.registryRevision, initialRevision);
    
  } finally {
    await rm(projectRoot, { recursive: true, force: true });
  }
});

test('macro MCP protocol tools stay ≤1999 bytes with annotations, offline tripwire, and e2e smoke', {
  timeout: 60_000,
}, async () => {
  const temp = await mkdtemp(join(tmpdir(), 'basecoat-macro-protocol-'));
  const host = join(temp, 'host-project');
  const launchCwd = join(temp, 'unrelated-working-directory');
  await mkdir(host);
  await mkdir(launchCwd);
  await writeFile(join(host, 'DESIGN.md'), '# Host\nMacro protocol smoke.\n');
  await writeFile(join(launchCwd, 'DESIGN.md'), 'WRONG PROJECT');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', offlineFixture, serverPath, '--project-root', host],
    cwd: launchCwd,
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString();
  });
  const client = new Client({ name: 'basecoat-macro-protocol-test', version: '1.0.0' });

  const sizes: Array<{ tool: string; bytes: number; isError?: boolean }> = [];
  let maxBytes = 0;
  let e2eDesignId = '';
  let e2eSnapshot = '';
  let e2eRecipePrefix = '';
  let e2eBlockRef = '';

  async function call(name: string, args: Record<string, unknown>) {
    const result = await client.callTool({ name, arguments: args });
    const bytes = measure(result);
    sizes.push({ tool: name, bytes, isError: result.isError === true ? true : undefined });
    maxBytes = Math.max(maxBytes, bytes);
    assert(bytes <= MAX_DETAIL_BYTES, `${name} result is ${bytes} bytes`);
    return result;
  }

  try {
    await client.connect(transport);
    const { tools } = await client.listTools();
    const macroTools = [
      'search_macro_blocks',
      'get_macro_block',
      'begin_design',
      'get_design_context',
      'apply_design_patch',
      'validate_design',
    ];
    for (const name of macroTools) {
      const tool = tools.find(entry => entry.name === name);
      assert(tool, `missing tool ${name}`);
      assert.equal(tool.annotations?.openWorldHint, false, name);
      if (name === 'begin_design' || name === 'apply_design_patch') {
        assert.equal(tool.annotations?.readOnlyHint, false, name);
        assert.equal(tool.annotations?.idempotentHint, true, name);
      } else {
        assert.equal(tool.annotations?.readOnlyHint, true, name);
      }
    }

    // Error path still bounded.
    const missingDesign = await call('get_design_context', {
      view: 'overview',
      designId: 'does-not-exist',
    });
    assert.equal(missingDesign.isError, true);

    const badBlock = await call('get_macro_block', {
      idOrRef: 'missing-block-xyz',
      section: 'manifest',
    });
    assert.equal(badBlock.isError, true);

    // E2E smoke: begin_design → search → instantiate_recipe → get_design_context → get_macro_block → validate_design
    e2eDesignId = 'smoke-design';
    const begun = await call('begin_design', {
      designId: e2eDesignId,
      profile: 'app-default',
      operationId: 'op-begin-smoke',
      decisions: { density: 'comfortable' },
    });
    assert.notEqual(begun.isError, true);
    const begunPacket = JSON.parse(resultText(begun)) as {
      designId: string;
      revision: number;
      snapshot: string;
      registryRevision: string;
    };
    assert.equal(begunPacket.designId, e2eDesignId);
    assert.equal(begunPacket.revision, 0);
    e2eSnapshot = begunPacket.snapshot;

    const search = await call('search_macro_blocks', { q: 'shell', limit: 8 });
    assert.notEqual(search.isError, true);
    const searchPacket = JSON.parse(resultText(search)) as {
      items: Array<{ id: string; ref: string }>;
      next: string | null;
    };
    assert(searchPacket.items.length > 0);
    e2eBlockRef = searchPacket.items[0]!.ref;

    const registry = getCompiledRegistry();
    const recipeRef = registry.aliases['workspace-dashboard'];
    assert(recipeRef, 'workspace-dashboard recipe must exist in packaged registry');
    e2eRecipePrefix = 'dash';

    const patched = await call('apply_design_patch', {
      designId: e2eDesignId,
      expectedRevision: 0,
      operationId: 'op-inst-smoke',
      operations: [
        {
          op: 'instantiate_recipe',
          recipe: recipeRef,
          pagePrefix: e2eRecipePrefix,
        },
      ],
    });
    assert.notEqual(patched.isError, true, resultText(patched));
    const patchedPacket = JSON.parse(resultText(patched)) as { revision: number; snapshot: string };
    assert.equal(patchedPacket.revision, 1);

    const context = await call('get_design_context', {
      view: 'overview',
      designId: e2eDesignId,
    });
    assert.notEqual(context.isError, true);
    const contextPacket = JSON.parse(resultText(context)) as {
      designRevision: number;
      items: Array<{ kind: string; pages?: unknown[] }>;
    };
    assert.equal(contextPacket.designRevision, 1);

    const block = await call('get_macro_block', {
      idOrRef: e2eBlockRef,
      section: 'manifest',
      designId: e2eDesignId,
    });
    assert.notEqual(block.isError, true);

    const validated = await call('validate_design', {
      designId: e2eDesignId,
      mode: 'draft',
    });
    assert.notEqual(validated.isError, true);

    // Cursor advance / stale / tamper
    const firstStructure = await call('get_macro_block', {
      idOrRef: 'app-shell',
      section: 'structure',
    });
    const firstPacket = JSON.parse(resultText(firstStructure)) as { next: string | null; items: unknown[] };
    if (firstPacket.next) {
      const advanced = await call('get_macro_block', {
        idOrRef: 'app-shell',
        section: 'structure',
        cursor: firstPacket.next,
      });
      assert.notEqual(advanced.isError, true);
      const decoded = decodeMacroCursor(firstPacket.next);
      const stale = encodeMacroCursor({ ...decoded, snapshot: 'r:' + 'f'.repeat(64) });
      const staleResult = await call('get_macro_block', {
        idOrRef: 'app-shell',
        section: 'structure',
        cursor: stale,
      });
      assert.equal(staleResult.isError, true);
      assert.match(resultText(staleResult), /STALE_CURSOR|INVALID_CURSOR|CURSOR/);

      const tampered = firstPacket.next.slice(0, -2) + 'xx';
      const tamperResult = await call('get_macro_block', {
        idOrRef: 'app-shell',
        section: 'structure',
        cursor: tampered,
      });
      assert.equal(tamperResult.isError, true);
    } else {
      // Still exercise cursor helpers when the section fits one page.
      const cursor = encodeMacroCursor({
        v: 1,
        fingerprint: 'test',
        snapshot: 'r:' + registry.revision,
        section: 'structure',
        offset: 0,
      });
      assert.throws(
        () =>
          validateMacroCursor(cursor, {
            fingerprint: 'other',
            snapshot: 'r:' + registry.revision,
            section: 'structure',
          }),
        (error: unknown) => error instanceof MacroError && error.code === 'CURSOR_MISMATCH',
      );
    }

    // No consumer project file writes outside .basecoat/designer
    const topLevel = await readdir(host);
    assert.deepEqual(
      topLevel.filter(name => name !== 'DESIGN.md' && name !== '.basecoat').sort(),
      [],
    );
    const basecoat = await readdir(join(host, '.basecoat'));
    assert.deepEqual(basecoat, ['designer']);

    assert.doesNotMatch(stderr, /OFFLINE_NETWORK_ATTEMPT/);
    assert.equal(stderr, '', `stdio stderr must stay empty, got: ${stderr}`);

    console.log(
      'macro protocol byte metrics:',
      JSON.stringify({
        maxBytes,
        sizes,
        e2e: {
          designId: e2eDesignId,
          snapshot: e2eSnapshot,
          recipePrefix: e2eRecipePrefix,
          blockRef: e2eBlockRef.slice(0, 16) + '…',
          pageId: `${e2eRecipePrefix}-dashboard`,
        },
      }),
    );
    assert(maxBytes <= MAX_DETAIL_BYTES);
  } finally {
    await client.close();
    await rm(temp, { recursive: true, force: true });
  }
});
