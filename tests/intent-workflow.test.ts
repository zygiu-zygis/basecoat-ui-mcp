// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { registry } from '../src/registry/index.js';
import { MAX_DETAIL_BYTES, responseBytes } from '../src/tools/budget.js';
import { COMPONENT_STATES, runComponentSyntax } from '../src/tools/component-syntax.js';
import { runCreativeDirector } from '../src/tools/creative-director.js';
import { runPageArchitect } from '../src/tools/page-architect.js';
import { runQualityInspector } from '../src/tools/quality-inspector.js';
import { runRulesEnforcer } from '../src/tools/rules-enforcer.js';
import { validateComposition } from '../src/tools/validate.js';
import { resolveComponentId } from '../src/tools/component-id.js';
import { handleGetFsmRecipe } from '../src/semantics/tools.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverPath = join(root, 'dist', 'server', 'stdio.js');
const offlineFixture = join(root, 'tests', 'fixtures', 'offline.mjs');

test('basecoat_page_architect lists scaffolds and resolves recipes by intent within byte budget', () => {
  const catalog = runPageArchitect({});
  assert.equal(catalog.stage, '1-page-architect');
  assert.equal(catalog.matched, false);
  assert(catalog.availableScaffolds.length >= 7);
  assert(responseBytes(catalog) <= MAX_DETAIL_BYTES);

  const cases = [
    { input: { intent: 'Workspace Dashboard', density: 'compact' as const }, expected: 'workspace-dashboard' },
    { input: { intent: 'Auth Split-Screen' }, expected: 'auth-split-flow' },
    { input: { intent: 'Data Table Detail' }, expected: 'workspace-detail' },
    { input: { intent: 'Settings' }, expected: 'workspace-settings' },
    { input: { recipe: 'marketing-pricing' }, expected: 'marketing-pricing' },
    { input: { recipe: 'auth-flow' }, expected: 'auth-flow' },
    { input: { recipe: 'data-records' }, expected: 'data-records' },
  ];

  for (const { input, expected } of cases) {
    const result = runPageArchitect(input);
    assert.equal(result.matched, true);
    assert.equal(result.recipe, expected);
    assert(Array.isArray(result.slotTopology) && result.slotTopology.length > 0);
    assert(responseBytes(result) <= MAX_DETAIL_BYTES, `${expected} exceeded ${MAX_DETAIL_BYTES} bytes`);
  }
});

test('basecoat_rules_enforcer returns indexed technical constraints within byte budget', () => {
  const categories = ['all', 'tailwind-v4', 'fsm-contracts', 'tokens', 'semantic-html'] as const;
  for (const category of categories) {
    const res = runRulesEnforcer({ category });
    assert.equal(res.stage, '2a-rules-enforcer');
    assert(res.rules.length > 0);
    assert(res.fsmContracts.length >= 5);
    assert(responseBytes(res) <= MAX_DETAIL_BYTES, `category ${category} exceeded budget`);
  }

  const tw4 = runRulesEnforcer({ category: 'tailwind-v4' });
  assert(tw4.rules.some(r => r.forbidden.includes('bg-opacity-*')));
  assert(tw4.rules.some(r => r.forbidden.includes('flex-shrink-*')));

  const tok = runRulesEnforcer({ category: 'tokens' });
  assert(tok.rules.some(r => r.required.some(req => req.includes('--color-primary'))));
});

test('basecoat_creative_director surfaces Kanso minimalism, rhythm, and style packs within byte budget', () => {
  const topics = ['all', 'typography', 'whitespace', 'hierarchy', 'elevation', 'style-packs'] as const;
  for (const topic of topics) {
    const res = runCreativeDirector({ topic, visitorJob: 'operate', stylePack: 'vega' });
    assert.equal(res.stage, '2b-creative-director');
    assert(responseBytes(res) <= MAX_DETAIL_BYTES, `topic ${topic} exceeded budget`);
  }
});

test('basecoat_component_syntax generates FSM-bound markup for all components and state variants within byte budget', () => {
  for (const { id } of registry.index) {
    for (const state of COMPONENT_STATES) {
      for (const environment of ['html', 'astro'] as const) {
        const res = runComponentSyntax({ component: id, state, environment });
        assert.equal(res.id, id);
        assert.equal(res.state, state);
        assert(res.markup.includes(`data-state="${state}"`), `${id} missing data-state="${state}"`);
        assert(responseBytes(res) <= MAX_DETAIL_BYTES, `${id} (${state}, ${environment}) exceeded ${MAX_DETAIL_BYTES} bytes`);
      }
    }
  }

  const dialogOpen = runComponentSyntax({ component: 'dialog', state: 'open' });
  assert(dialogOpen.markup.includes('data-fsm-recipe="dialog"'));
  assert(dialogOpen.markup.includes('data-fsm-state="open"'));

  const buttonLoading = runComponentSyntax({ component: 'button', state: 'loading', variant: 'outline' });
  assert(buttonLoading.markup.includes('aria-busy="true"'));
  assert(buttonLoading.markup.includes('data-variant="outline"'));

  assert.throws(() => runComponentSyntax({ component: 'nonexistent-widget' }), /Unknown component/);
});

test('basecoat_quality_inspector scores valid markup 100/A and flags Tailwind v3, FSM, a11y, and div-soup issues', () => {
  const cleanHtml = [
    '<header class="flex h-12 items-center justify-between px-4">',
    '  <h1 class="text-xl font-semibold">Workspace</h1>',
    '</header>',
    '<main class="p-6">',
    '  <section class="card p-6">',
    '    <div class="field">',
    '      <label class="label" for="email">Email</label>',
    '      <input class="input" id="email" type="email" />',
    '    </div>',
    '    <button class="btn" type="button" data-state="default">Save</button>',
    '  </section>',
    '</main>',
  ].join('\n');

  const cleanReport = runQualityInspector(cleanHtml);
  assert.equal(cleanReport.valid, true);
  assert.equal(cleanReport.score, 100);
  assert.equal(cleanReport.grade, 'A');
  assert.equal(cleanReport.syntaxViolations.length, 0);
  assert.equal(cleanReport.accessibilityOmissions.length, 0);
  assert(responseBytes(cleanReport) <= MAX_DETAIL_BYTES);

  const defectiveHtml = [
    '<div><div><div><div><div><div>',
    '  <div class="card border bg-opacity-50 flex-shrink-0 bg-[#ff0000]">',
    '    <img src="/logo.svg" />',
    '    <button class="btn" data-size="icon"><svg class="size-4"></svg></button>',
    '    <dialog class="dialog">Unbound</dialog>',
    '  </div>',
    '</div></div></div></div></div></div>',
  ].join('\n');

  const defectiveReport = runQualityInspector(defectiveHtml, { enforceFsm: true });
  assert.equal(defectiveReport.valid, false);
  assert(defectiveReport.score < 50);
  assert(defectiveReport.syntaxViolations.some(v => v.rule === 'tailwind-v3-deprecated'));
  assert(defectiveReport.syntaxViolations.some(v => v.rule === 'card-double-border'));
  assert(defectiveReport.syntaxViolations.some(v => v.rule === 'arbitrary-color'));
  assert(defectiveReport.accessibilityOmissions.some(v => v.rule === 'a11y-img-alt'));
  assert(defectiveReport.accessibilityOmissions.some(v => v.rule === 'a11y-button-icon-label'));
  assert(defectiveReport.accessibilityOmissions.some(v => v.rule === 'fsm-data-state-missing'));
  assert(defectiveReport.accessibilityOmissions.some(v => v.rule === 'semantic-div-nesting'));
  assert(defectiveReport.autoFixSuggestions.length > 0);
  assert(responseBytes(defectiveReport) <= MAX_DETAIL_BYTES);
});

test('4-stage intent-driven tools work over stdio MCP with zero network imports', async () => {
  const newToolFiles = [
    'page-architect.ts',
    'rules-enforcer.ts',
    'creative-director.ts',
    'component-syntax.ts',
    'quality-inspector.ts',
  ];
  for (const file of newToolFiles) {
    const source = readFileSync(join(root, 'src', 'tools', file), 'utf8');
    assert(!/\b(?:node:http|node:https|node:net|node:tls|node:dns|fetch|XMLHttpRequest|WebSocket)\b/.test(source), `${file} contains forbidden network reference`);
  }

  const transport = new StdioClientTransport({
    command: process.execPath,
    args: ['--import', offlineFixture, serverPath, '--project-root', root],
    cwd: root,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'intent-workflow-test', version: '1.0.0' });
  try {
    await client.connect(transport);
    const stage1 = await client.callTool({
      name: 'basecoat_page_architect',
      arguments: { intent: 'Workspace Dashboard', density: 'compact' },
    });
    assert.notEqual(stage1.isError, true);
    assert(Buffer.byteLength(JSON.stringify(stage1), 'utf8') <= MAX_DETAIL_BYTES);

    const stage2a = await client.callTool({
      name: 'basecoat_rules_enforcer',
      arguments: { category: 'all' },
    });
    assert.notEqual(stage2a.isError, true);
    assert(Buffer.byteLength(JSON.stringify(stage2a), 'utf8') <= MAX_DETAIL_BYTES);

    const stage2b = await client.callTool({
      name: 'basecoat_creative_director',
      arguments: { topic: 'all', visitorJob: 'operate', stylePack: 'vega' },
    });
    assert.notEqual(stage2b.isError, true);
    assert(Buffer.byteLength(JSON.stringify(stage2b), 'utf8') <= MAX_DETAIL_BYTES);

    const stage3 = await client.callTool({
      name: 'basecoat_component_syntax',
      arguments: { component: 'tabs', state: 'active', environment: 'html' },
    });
    assert.notEqual(stage3.isError, true);
    assert(Buffer.byteLength(JSON.stringify(stage3), 'utf8') <= MAX_DETAIL_BYTES);

    const stage4 = await client.callTool({
      name: 'basecoat_quality_inspector',
      arguments: {
        code: '<header class="h-12 px-4"><h1 class="text-xl">Title</h1></header><main class="p-6"><section class="card p-6"><p class="text-sm text-muted-foreground">Ready</p></section></main>',
        densityProfile: 'compact',
      },
    });
    assert.notEqual(stage4.isError, true);
    assert(Buffer.byteLength(JSON.stringify(stage4), 'utf8') <= MAX_DETAIL_BYTES);
  } finally {
    await client.close();
  }
});

test('Phase 2 improvements: oversized-header, ID aliases, sidebar FSM recipe, action icon SVGs, and meta color-scheme validation', async () => {
  // 1. oversized-header: <header class="h-16"> warns, but non-header <div class="card h-16"> does not
  const headerReport = validateComposition('<header class="h-16 flex items-center px-4"><h1 class="text-xl">Title</h1></header>');
  assert(headerReport.issues.some(i => i.rule === 'oversized-header'), 'expected oversized-header on <header class="h-16">');

  const cardReport = validateComposition('<div class="card h-16 p-4"><p>Content</p></div>');
  assert(!cardReport.issues.some(i => i.rule === 'oversized-header'), 'did not expect oversized-header on <div class="card h-16">');

  // card-double-border: subcard with border-0 should not trigger error
  assert.equal(resolveComponentId('sheet'), 'drawer');
  assert.equal(resolveComponentId('modal'), 'dialog');
  assert.equal(resolveComponentId('dropdown'), 'dropdown-menu');
  assert.equal(resolveComponentId('range'), 'slider');
  assert.equal(resolveComponentId('nav'), 'sidebar');

  // 2. ID_ALIASES in runComponentSyntax
  const sheetSyntax = runComponentSyntax({ component: 'sheet' });
  assert.equal(sheetSyntax.id, 'drawer');
  const modalSyntax = runComponentSyntax({ component: 'modal' });
  assert.equal(modalSyntax.id, 'dialog');
  const dropdownSyntax = runComponentSyntax({ component: 'dropdown' });
  assert.equal(dropdownSyntax.id, 'dropdown-menu');
  const rangeSyntax = runComponentSyntax({ component: 'range' });
  assert.equal(rangeSyntax.id, 'slider');

  // 3. get_fsm_recipe({ recipe: 'sidebar' }) -> resolves to 'navigation'
  const fsmResult = await handleGetFsmRecipe({ recipe: 'sidebar' });
  assert.equal(fsmResult.isError, undefined);
  const fsmPayload = JSON.parse((fsmResult.content[0] as { text: string }).text);
  assert(fsmPayload.items.length > 0);
  assert.equal(fsmPayload.items[0].recipeId, 'navigation');

  // 4. icon SVG in basecoat_component_syntax
  const buttonWithIcon = runComponentSyntax({ component: 'button', icon: 'plus' });
  assert.equal(buttonWithIcon.icon, 'plus');
  assert(typeof buttonWithIcon.iconSvg === 'string' && buttonWithIcon.iconSvg.includes('<svg'));
  assert(responseBytes(buttonWithIcon) <= MAX_DETAIL_BYTES);

  // 5. theme-meta-color-scheme leakage detection
  const metaLeakReport = validateComposition([
    '<meta name="color-scheme" content="light dark">',
    '<script>try { document.documentElement.classList.toggle("dark", localStorage.getItem("themeMode") === "dark"); } catch(e){}</script>',
  ].join('\n'));
  assert(metaLeakReport.issues.some(i => i.rule === 'theme-meta-color-scheme'), 'expected theme-meta-color-scheme warning');

  const metaSafeReport = validateComposition([
    '<meta name="color-scheme" content="light">',
    '<script>try { document.documentElement.classList.toggle("dark", localStorage.getItem("themeMode") === "dark"); } catch(e){}</script>',
  ].join('\n'));
  assert(!metaSafeReport.issues.some(i => i.rule === 'theme-meta-color-scheme'), 'did not expect theme-meta-color-scheme warning on safe meta');
});
