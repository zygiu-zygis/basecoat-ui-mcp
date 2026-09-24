// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { registry } from '../src/registry/index.js';

const serverPath = fileURLToPath(new URL('../dist/server/stdio.js', import.meta.url));
const offlineFixture = fileURLToPath(new URL('./fixtures/offline.mjs', import.meta.url));

function resultText(result: unknown): string {
  assert(result !== null && typeof result === 'object' && 'content' in result);
  assert(Array.isArray(result.content));
  assert.equal(result.content.length, 1);
  const block = result.content[0] as { type: string; text: string };
  assert.equal(block.type, 'text');
  return block.text;
}

test('offline stdio initializes and serves the bounded, project-scoped MCP surface', { timeout: 30_000 }, async () => {
  const temp = await mkdtemp(join(tmpdir(), 'basecoat-protocol-'));
  const host = join(temp, 'host-project');
  const launchCwd = join(temp, 'unrelated-working-directory');
  await mkdir(host);
  await mkdir(launchCwd);
  const design = '# Host project\nUse 72rem containers and gap-6 gutters.\n';
  await writeFile(join(host, 'DESIGN.md'), design);
  await writeFile(join(launchCwd, 'DESIGN.md'), 'WRONG PROJECT: this must never be returned');

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', offlineFixture, serverPath, '--project-root', host],
    cwd: launchCwd,
    stderr: 'pipe',
  });
  let stderr = '';
  transport.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
  const client = new Client({ name: 'basecoat-protocol-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    assert.equal(client.getServerVersion()?.name, 'basecoat-ui-mcp');
    assert.match(client.getInstructions() ?? '', /content hierarchy.*layout.*component selection/i);
    assert.match(client.getInstructions() ?? '', /offline/i);

    const { tools } = await client.listTools();
    assert.deepEqual(tools.map(tool => tool.name).sort(), [
      'get_component_details', 'search_components', 'validate_composition',
    ]);
    for (const tool of tools) {
      assert.equal(tool.annotations?.readOnlyHint, true);
      assert.equal(tool.annotations?.openWorldHint, false);
    }
    const { resources } = await client.listResources();
    assert.deepEqual(resources.map(resource => resource.uri).sort(), [
      'basecoat://design/rhythm', 'basecoat://integration/astro', 'basecoat://project/context',
    ]);

    const query = { name: 'search_components', arguments: { intent: '', query: 'forms' } };
    const first = await client.callTool(query);
    const second = await client.callTool(query);
    assert.deepEqual(first, second, 'search ordering and payload are deterministic');
    const summaries = JSON.parse(resultText(first)) as Array<Record<string, unknown>>;
    assert.equal(summaries.length, 8);
    for (const summary of summaries) {
      assert.deepEqual(Object.keys(summary).sort(), ['id', 'intent', 'name']);
      assert.equal(typeof summary.id, 'string');
      assert.equal(typeof summary.intent, 'string');
      assert.equal(typeof summary.name, 'string');
    }
    assert.doesNotMatch(resultText(first), /markup_template|<button|<dialog|<table/);

    for (const [query, expected] of [
      ['dropdown', ['dropdown-menu']], ['compact status', ['badge']], ['empty state', ['empty']],
      ['unmatchedxyz', []], ['', []],
    ] as const) {
      const result = await client.callTool({ name: 'search_components', arguments: { intent: '', query } });
      assert.deepEqual(JSON.parse(resultText(result)).map((item: { id: string }) => item.id), expected);
    }

    for (const id of ['badge', 'item', 'card', 'dropdown-menu', 'empty']) {
      assert(registry.index.some(component => component.id === id), `${id} must be curated`);
    }

    for (const { id } of registry.index) {
      for (const environment of ['astro', 'html']) {
        const result = await client.callTool({ name: 'get_component_details', arguments: { id, environment } });
        assert.notEqual(result.isError, true, `${id}/${environment} should resolve`);
        assert(Buffer.byteLength(JSON.stringify(result), 'utf8') <= 1999, `${id}/${environment} exceeds the full result budget`);
        assert.match(resultText(result), /</, `${id}/${environment} must include markup`);
      }
    }

    for (const args of [
      { id: 'does-not-exist', environment: 'astro' },
      { id: 'button', environment: 'react' },
    ]) {
      const result = await client.callTool({ name: 'get_component_details', arguments: args });
      assert.equal(result.isError, true, 'invalid IDs/environments return tool errors');
    }

    const validated = await client.callTool({ name: 'validate_composition', arguments: {
      code: '<div class="card"><div class="card"></div></div>',
    } });
    assert.match(resultText(validated), /nested-cards/);

    const allImport = await client.callTool({ name: 'validate_composition', arguments: {
      code: '<script>import "basecoat-css/all";</script>',
    } });
    const rejected = JSON.parse(resultText(allImport));
    assert.equal(rejected.valid, false);
    assert(rejected.issues.some((issue: { rule: string; severity: string }) => issue.rule === 'all-js-bundle' && issue.severity === 'error'));

    const rhythm = await client.readResource({ uri: 'basecoat://design/rhythm' });
    assert.match(JSON.stringify(rhythm), /gap-2.*gap-4.*gap-6.*gap-12/s);
    assert.match(JSON.stringify(rhythm), /cards inside cards/i);
    const astro = await client.readResource({ uri: 'basecoat://integration/astro' });
    assert.match(JSON.stringify(astro), /@tailwindcss\/vite/);
    assert.match(JSON.stringify(astro), /basecoat-css\/basecoat/);
    assert.match(JSON.stringify(astro), /basecoat-css\/base\\"/);
    assert.match(JSON.stringify(astro), /astro:page-load/);

    async function context() {
      const result = await client.readResource({ uri: 'basecoat://project/context' });
      assert.equal(result.contents.length, 1);
      const content = result.contents[0];
      assert(content && 'text' in content);
      return JSON.parse(content.text) as { status: string; content?: string };
    }
    assert.deepEqual(await context().then(({ status, content }) => ({ status, content })), {
      status: 'found', content: design,
    });
    await rm(join(host, 'DESIGN.md'));
    assert.equal((await context()).status, 'absent');
    assert.doesNotMatch(stderr, /OFFLINE_NETWORK_ATTEMPT/);
    assert.equal(stderr, '', 'stdio must not emit errors during successful requests');
  } finally {
    await client.close();
    await rm(temp, { recursive: true, force: true });
  }
});
