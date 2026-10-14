#!/usr/bin/env node

/**
 * Subprocess JSON-RPC stdio probe for Basecoat UI MCP server.
 * Verifies initialization, tools list, resources list/read, and tool calls over raw stdio.
 * Usage: node scripts/probe-stdio.mjs [path-to-stdio.js]
 */

import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';

const target = process.argv[2] ?? 'dist/server/stdio.js';
const child = target.endsWith('.js') || target.endsWith('.mjs') || target.endsWith('.ts')
  ? spawn(process.execPath, [target, ...process.argv.slice(3)], { stdio: ['pipe', 'pipe', 'pipe'] })
  : spawn(target, process.argv.slice(3), { stdio: ['pipe', 'pipe', 'pipe'] });

let stderr = '';
child.stderr.on('data', (d) => { stderr += d.toString(); });

const pending = new Map();
let idCounter = 0;
const rl = createInterface({ input: child.stdout, crlfDelay: Infinity });

rl.on('line', (line) => {
  let m;
  try { m = JSON.parse(line); } catch { return; }
  if (m && m.id != null && pending.has(m.id)) {
    const { resolve } = pending.get(m.id);
    pending.delete(m.id);
    resolve(m);
  }
});

function req(method, params = {}, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const id = `${Date.now().toString(36)}-${(++idCounter).toString(36)}`;
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Timeout waiting for ${method} (id=${id})`));
    }, timeout);
    pending.set(id, {
      resolve: (m) => {
        clearTimeout(timer);
        resolve(m);
      },
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id, method, params }) + '\n');
  });
}

function fail(msg) {
  console.error(`FAIL: ${msg}`);
  if (stderr.trim()) console.error(`  stderr: ${stderr.trim().slice(0, 500)}`);
  child.kill('SIGKILL');
  process.exit(1);
}

try {
  // 1. initialize
  const init = await req('initialize', {
    protocolVersion: '2025-06-18',
    capabilities: {},
    clientInfo: { name: 'probe-stdio', version: '1.0.0' },
  });
  if (init.error) fail(`initialize failed: ${JSON.stringify(init.error)}`);
  const serverInfo = init.result?.serverInfo ?? {};
  child.stdin.write(JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized', params: {} }) + '\n');

  // 2. tools/list
  const toolsRes = await req('tools/list', {});
  if (toolsRes.error) fail(`tools/list failed: ${JSON.stringify(toolsRes.error)}`);
  const tools = toolsRes.result?.tools ?? [];
  const toolNames = new Set(tools.map(t => t.name));

  const expectedTools = [
    'basecoat_setup_config',
    'basecoat_page_architect',
    'basecoat_compose_stack',
    'basecoat_rules_enforcer',
    'basecoat_creative_director',
    'basecoat_component_syntax',
    'basecoat_list_charts',
    'basecoat_get_chart_blueprint',
    'basecoat_quality_inspector',
  ];
  for (const tool of expectedTools) {
    if (!toolNames.has(tool)) {
      fail(`tools/list missing expected workflow tool: ${tool}`);
    }
  }

  // 3. resources/list
  const resList = await req('resources/list', {});
  if (resList.error) fail(`resources/list failed: ${JSON.stringify(resList.error)}`);
  const resources = resList.result?.resources ?? [];
  const resourceUris = new Set(resources.map(r => r.uri));

  if (!resourceUris.has('basecoat://skills/core')) fail('Missing resource basecoat://skills/core');
  if (!resourceUris.has('basecoat://skills/dashboard')) fail('Missing resource basecoat://skills/dashboard');
  if (!resourceUris.has('basecoat://skills/charts')) fail('Missing resource basecoat://skills/charts');

  const fileResources = resources.filter(r => r.uri.startsWith('basecoat://skills/files/'));
  if (fileResources.length < 95) {
    fail(`Expected >= 95 skill file resources, found ${fileResources.length}`);
  }

  // 4. resources/read
  const readTargets = [
    'basecoat://skills/core',
    'basecoat://skills/dashboard',
    'basecoat://skills/charts',
    'basecoat://skills/files/basecoat/rules/styling.md',
  ];
  for (const uri of readTargets) {
    const readRes = await req('resources/read', { uri });
    if (readRes.error) fail(`resources/read failed for ${uri}: ${JSON.stringify(readRes.error)}`);
    const contents = readRes.result?.contents ?? [];
    if (!contents.length || !contents[0].text) {
      fail(`resources/read returned empty content for ${uri}`);
    }
  }

  // 5. tools/call execution checks
  // basecoat_setup_config
  const setupCall = await req('tools/call', {
    name: 'basecoat_setup_config',
    arguments: { framework: 'astro', stylePack: 'vega' },
  });
  if (setupCall.error || setupCall.result?.isError) {
    fail(`tools/call basecoat_setup_config failed: ${JSON.stringify(setupCall.error ?? setupCall.result)}`);
  }

  // basecoat_page_architect
  const architectCall = await req('tools/call', {
    name: 'basecoat_page_architect',
    arguments: { query: 'dashboard' },
  });
  if (architectCall.error || architectCall.result?.isError) {
    fail(`tools/call basecoat_page_architect failed: ${JSON.stringify(architectCall.error ?? architectCall.result)}`);
  }

  // basecoat_compose_stack
  const composeCall = await req('tools/call', {
    name: 'basecoat_compose_stack',
    arguments: { shellId: 'sidebar-07', stacks: ['kpi-4-col-delta'] },
  });
  if (composeCall.error || composeCall.result?.isError) {
    fail(`tools/call basecoat_compose_stack failed: ${JSON.stringify(composeCall.error ?? composeCall.result)}`);
  }

  // basecoat_list_charts
  const listChartsCall = await req('tools/call', {
    name: 'basecoat_list_charts',
    arguments: { category: 'area' },
  });
  if (listChartsCall.error || listChartsCall.result?.isError) {
    fail(`tools/call basecoat_list_charts failed: ${JSON.stringify(listChartsCall.error ?? listChartsCall.result)}`);
  }

  // basecoat_get_chart_blueprint
  const chartBlueprintCall = await req('tools/call', {
    name: 'basecoat_get_chart_blueprint',
    arguments: { id: 'area-default', framework: 'vanilla' },
  });
  if (chartBlueprintCall.error || chartBlueprintCall.result?.isError) {
    fail(`tools/call basecoat_get_chart_blueprint failed: ${JSON.stringify(chartBlueprintCall.error ?? chartBlueprintCall.result)}`);
  }

  // basecoat_component_syntax
  const componentSyntaxCall = await req('tools/call', {
    name: 'basecoat_component_syntax',
    arguments: { component: 'button', state: 'default', environment: 'html' },
  });
  if (componentSyntaxCall.error || componentSyntaxCall.result?.isError) {
    fail(`tools/call basecoat_component_syntax failed: ${JSON.stringify(componentSyntaxCall.error ?? componentSyntaxCall.result)}`);
  }

  // basecoat_quality_inspector
  const qualityCall = await req('tools/call', {
    name: 'basecoat_quality_inspector',
    arguments: { code: '<button class="btn">Submit</button>' },
  });
  if (qualityCall.error || qualityCall.result?.isError) {
    fail(`tools/call basecoat_quality_inspector failed: ${JSON.stringify(qualityCall.error ?? qualityCall.result)}`);
  }

  console.log(`PASS: Basecoat UI MCP stdio probe verified:`);
  console.log(`  - server: ${serverInfo.name ?? 'basecoat-ui-mcp'} v${serverInfo.version ?? '?'}`);
  console.log(`  - tools: ${tools.length} registered (${expectedTools.length} workflow tools verified)`);
  console.log(`  - resources: ${resources.length} registered (${fileResources.length} skill files, 3 skills top-level, 4 baseline)`);
  console.log(`  - reads: all 4 sample skill/file resources read successfully`);
  console.log(`  - tool calls: all 7 required workflow tools executed cleanly`);

  child.stdin.end();
  setTimeout(() => process.exit(0), 100);
} catch (err) {
  fail(err.message);
}
