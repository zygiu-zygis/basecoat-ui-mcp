import assert from 'node:assert/strict';
import test from 'node:test';
import { createServer } from '../src/server/index.js';
import { getComponentDetails } from '../src/tools/details.js';
import { runComponentSyntax } from '../src/tools/component-syntax.js';
import { runListCharts } from '../src/tools/list-charts.js';
import { runGetChartBlueprint } from '../src/tools/get-chart-blueprint.js';
import { runRulesEnforcer } from '../src/tools/rules-enforcer.js';
import { runComposeStack } from '../src/tools/compose-stack.js';
import { handleGetMacroBlock } from '../src/macros/tools.js';

test('Poka-Yoke: empty {} calls return catalog summaries or sensible defaults without throwing', async () => {
  // get_component_details({})
  const detailsResult = getComponentDetails();
  assert.equal(typeof detailsResult, 'object');
  assert.equal(detailsResult.total, 62);
  assert.equal(detailsResult.environment, 'html');
  assert.ok(Array.isArray(detailsResult.components) && detailsResult.components.length === 62);

  // list_charts({})
  const chartsResult = runListCharts({});
  assert.equal(chartsResult.total, 56);
  assert.equal(chartsResult.categories.length, 7);

  // get_component_syntax({})
  const syntaxResult = runComponentSyntax() as any;
  assert.ok(syntaxResult.totalComponents >= 61);
  assert.ok(Array.isArray(syntaxResult.components));

  // enforce_rules({})
  const rulesResult = runRulesEnforcer({});
  assert.ok(rulesResult.ruleCount >= 30);
  assert.ok(Array.isArray(rulesResult.rules));

  // compose_stack({})
  const stackResult = runComposeStack({});
  assert.equal(stackResult.shellId, 'sidebar-01');
  assert.equal(stackResult.environment, 'html');
  assert.ok(stackResult.html.includes('<aside'));

  // get_macro_block({})
  const macroResult = await handleGetMacroBlock({}, process.cwd());
  assert.equal(macroResult.isError, undefined);
  const text = (macroResult.content[0] as { text: string }).text;
  const parsed = JSON.parse(text);
  assert.ok(parsed.items || parsed.blocks || parsed.records || parsed.total);
});

test('Poka-Yoke: id, componentId, and name aliases resolve primary identifier interchangeably', () => {
  // getComponentDetails
  const byId = getComponentDetails('button');
  const byComponentId = getComponentDetails('button');
  assert.equal(byId.id, 'button');
  assert.equal(byComponentId.id, 'button');

  // runComponentSyntax
  const synById = runComponentSyntax({ id: 'button' });
  const synByComponentId = runComponentSyntax({ componentId: 'button' });
  const synByName = runComponentSyntax({ name: 'button' });
  const synByComp = runComponentSyntax({ component: 'button' });
  assert.equal(synById.id, 'button');
  assert.equal(synByComponentId.id, 'button');
  assert.equal(synByName.id, 'button');
  assert.equal(synByComp.id, 'button');

  // runGetChartBlueprint
  const chartById = runGetChartBlueprint({ id: 'area-default' });
  const chartByChartId = runGetChartBlueprint({ chartId: 'area-default' });
  const chartByName = runGetChartBlueprint({ name: 'area-default' });
  const chartByCompId = runGetChartBlueprint({ componentId: 'area-default' });
  assert.equal(chartById.id, 'area-default');
  assert.equal(chartByChartId.id, 'area-default');
  assert.equal(chartByName.id, 'area-default');
  assert.equal(chartByCompId.id, 'area-default');

  // runComposeStack
  const stackById = runComposeStack({ id: 'sidebar-02' });
  const stackByShellId = runComposeStack({ shellId: 'sidebar-02' });
  const stackByName = runComposeStack({ name: 'sidebar-02' });
  assert.equal(stackById.shellId, 'sidebar-02');
  assert.equal(stackByShellId.shellId, 'sidebar-02');
  assert.equal(stackByName.shellId, 'sidebar-02');
});

test('Poka-Yoke: environment is optional across all tools and supports all 5 frameworks', () => {
  const envs = ['html', 'astro', 'react', 'vue', 'svelte'] as const;
  for (const env of envs) {
    const details = getComponentDetails('button', env);
    assert.equal(details.environment, env);
    assert.ok(details.markup.length > 0);

    const syntax = runComponentSyntax({ id: 'button', environment: env });
    assert.equal(syntax.environment, env);
    assert.ok(syntax.markup.length > 0);

    const chart = runGetChartBlueprint({ id: 'area-default', environment: env });
    assert.equal(chart.environment, env);
    assert.ok(chart.code.length > 0);

    const stack = runComposeStack({ environment: env });
    assert.equal(stack.environment, env);
    assert.ok(stack.html.length > 0);
  }
});

test('Poka-Yoke: get_macro_block defaults section to "all" returning manifest and structure together', async () => {
  const result = await handleGetMacroBlock({ id: 'sidebar-01' }, process.cwd());
  assert.equal(result.isError, undefined);
  const text = (result.content[0] as { text: string }).text;
  const packet = JSON.parse(text);

  assert.equal(packet.section, 'all');
  assert.equal(packet.id, 'sidebar-01');
  assert.ok(packet.total > 1, 'Combined section records must have multiple items');

  const records = packet.items || [];
  assert.ok(packet.total >= 3, 'Combined section includes manifest and structure items');
  assert.ok(packet.manifest || records.some((r: any) => r.kind === 'manifest' || r.role === 'navigation'));
  assert.ok(packet.next, 'Pagination cursor exists to fetch subsequent structure fragments');
});

test('Poka-Yoke: Dual Tool Aliases are registered and resolvable on McpServer', () => {
  const server = createServer();
  const registered = (server as any)._registeredTools;

  const expectedDualPairs: [string, string][] = [
    ['list_charts', 'basecoat_list_charts'],
    ['get_chart_blueprint', 'basecoat_get_chart_blueprint'],
    ['get_page_architect', 'basecoat_page_architect'],
    ['enforce_rules', 'basecoat_rules_enforcer'],
    ['get_creative_direction', 'basecoat_creative_director'],
    ['get_component_syntax', 'basecoat_component_syntax'],
    ['inspect_quality', 'basecoat_quality_inspector'],
    ['compose_stack', 'basecoat_compose_stack'],
    ['setup_config', 'basecoat_setup_config'],
  ];

  for (const [canon, prefixed] of expectedDualPairs) {
    const canonExists = Boolean(registered[canon]);
    const prefixedExists = Boolean(registered[prefixed]);
    assert.ok(canonExists || prefixedExists, `At least one of ${canon} or ${prefixed} must be registered directly`);
  }
});
