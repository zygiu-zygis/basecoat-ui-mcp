// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const serverPath = fileURLToPath(new URL('../dist/server/stdio.js', import.meta.url));
const offlineFixture = fileURLToPath(new URL('./fixtures/offline.mjs', import.meta.url));

test('MCP resources protocol: lists and reads skills vault resources and baseline docs', { timeout: 30_000 }, async () => {
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', offlineFixture, serverPath],
    stderr: 'pipe',
  });

  const client = new Client({ name: 'basecoat-resources-test', version: '1.0.0' });

  try {
    await client.connect(transport);

    // 1. Test resources/list
    const { resources } = await client.listResources();
    assert(Array.isArray(resources), 'resources must be an array');
    assert(resources.length >= 95, `expected at least 95 resources, got ${resources.length}`);

    const uris = new Set(resources.map(r => r.uri));

    // Assert baseline design & integration resources
    const baselineResources = [
      'basecoat://design/rhythm',
      'basecoat://design/theming',
      'basecoat://integration/frameworks',
      'basecoat://project/context',
    ];
    for (const uri of baselineResources) {
      assert(uris.has(uri), `baseline resource missing: ${uri}`);
    }

    // Assert top-level skill resources
    const topLevelSkills = [
      'basecoat://skills/core',
      'basecoat://skills/dashboard',
      'basecoat://skills/charts',
    ];
    for (const uri of topLevelSkills) {
      assert(uris.has(uri), `top-level skill resource missing: ${uri}`);
      const entry = resources.find(r => r.uri === uri)!;
      assert.equal(entry.mimeType, 'text/markdown');
    }

    // Assert individual skill file resources
    const sampleFiles = [
      'basecoat://skills/files/basecoat/rules/styling.md',
      'basecoat://skills/files/basecoat/rules/composition.md',
      'basecoat://skills/files/basecoat/components/button.md',
      'basecoat://skills/files/basecoat/components/dialog.md',
      'basecoat://skills/files/basecoat-dashboard/SKILL.md',
      'basecoat://skills/files/basecoat-dashboard/block-patterns/sidebars.md',
      'basecoat://skills/files/basecoat-charts/SKILL.md',
      'basecoat://skills/files/basecoat-charts/area.md',
    ];
    for (const uri of sampleFiles) {
      assert(uris.has(uri), `individual skill file resource missing: ${uri}`);
      const entry = resources.find(r => r.uri === uri)!;
      assert.equal(entry.mimeType, 'text/markdown');
    }

    // 2. Test resources/read across top-level skills
    const core = await client.readResource({ uri: 'basecoat://skills/core' });
    assert.equal(core.contents.length, 1);
    assert.equal(core.contents[0]?.mimeType, 'text/markdown');
    assert(typeof (core.contents[0] as { text?: string }).text === 'string');
    assert((core.contents[0] as { text: string }).text.length > 200);

    const dashboard = await client.readResource({ uri: 'basecoat://skills/dashboard' });
    assert.equal(dashboard.contents.length, 1);
    assert.equal(dashboard.contents[0]?.mimeType, 'text/markdown');
    assert((dashboard.contents[0] as { text: string }).text.length > 200);

    const charts = await client.readResource({ uri: 'basecoat://skills/charts' });
    assert.equal(charts.contents.length, 1);
    assert.equal(charts.contents[0]?.mimeType, 'text/markdown');
    assert((charts.contents[0] as { text: string }).text.length > 200);

    // 3. Test resources/read across individual files
    const stylingRule = await client.readResource({ uri: 'basecoat://skills/files/basecoat/rules/styling.md' });
    assert.equal(stylingRule.contents.length, 1);
    assert.equal(stylingRule.contents[0]?.mimeType, 'text/markdown');
    assert((stylingRule.contents[0] as { text: string }).text.includes('Semantic Tokens Only'));

    const buttonDoc = await client.readResource({ uri: 'basecoat://skills/files/basecoat/components/button.md' });
    assert.equal(buttonDoc.contents.length, 1);
    assert.equal(buttonDoc.contents[0]?.mimeType, 'text/markdown');
    assert((buttonDoc.contents[0] as { text: string }).text.length > 100);

    // 4. Test baseline resource read
    const rhythm = await client.readResource({ uri: 'basecoat://design/rhythm' });
    assert.equal(rhythm.contents.length, 1);
    assert((rhythm.contents[0] as { text: string }).text.includes('gap-'));
  } finally {
    await client.close();
  }
});
