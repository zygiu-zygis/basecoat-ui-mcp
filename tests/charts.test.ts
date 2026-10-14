import assert from 'node:assert/strict';
import test from 'node:test';
import { loadCompiledRegistry, getBlock } from '../src/macros/registry.js';
import {
  runListCharts,
  runGetChartBlueprint,
  type ChartCategory,
  type ChartFramework,
} from '../src/tools/charts.js';

const CATEGORIES: ChartCategory[] = ['area', 'bar', 'line', 'pie', 'radar', 'radial', 'tooltip'];
const FRAMEWORKS: ChartFramework[] = ['vanilla', 'astro', 'react', 'vue', 'svelte'];

test('runListCharts({}) returns all 56 charts across all 7 categories', () => {
  const result = runListCharts({});
  assert.equal(result.total, 56);
  assert.equal(result.charts.length, 56);
  assert.deepEqual(result.categories, CATEGORIES);

  const foundCategories = new Set(result.charts.map(c => c.category));
  for (const cat of CATEGORIES) {
    assert.equal(foundCategories.has(cat), true, `Category "${cat}" should be present in results`);
  }

  for (const chart of result.charts) {
    assert.ok(chart.id, 'Chart must have an id');
    assert.ok(chart.name, 'Chart must have a name');
    assert.equal(chart.title, chart.name, 'Chart title must equal name');
    assert.ok(chart.description, 'Chart must have a description');
    assert.ok(chart.layoutFootprint, 'Chart must have layoutFootprint');
    assert.ok(Array.isArray(chart.tags) && chart.tags.length > 0, `Chart ${chart.id} must have non-empty tags`);
    assert.ok(Array.isArray(chart.cssTokens) && chart.cssTokens.length > 0, `Chart ${chart.id} must have cssTokens`);
    assert.ok(Array.isArray(chart.requiredTokens) && chart.requiredTokens.length > 0, `Chart ${chart.id} must have requiredTokens`);
  }
});

test('filtering by each of the 7 categories returns at least 7 variants per category', () => {
  for (const category of CATEGORIES) {
    const result = runListCharts({ category });
    assert.ok(
      result.total >= 7,
      `Category "${category}" expected >= 7 variants, got ${result.total}`,
    );
    assert.equal(result.charts.length, result.total);
    for (const chart of result.charts) {
      assert.equal(
        chart.category,
        category,
        `Expected chart ${chart.id} to have category "${category}", got "${chart.category}"`,
      );
    }
  }
});

test('keyword search filtering works for queries "stacked", "donut", and "gauge"', () => {
  const stackedResult = runListCharts({ query: 'stacked' });
  assert.ok(stackedResult.total >= 1, 'Query "stacked" should return at least 1 chart');
  assert.ok(
    stackedResult.charts.some(c => c.id === 'area-stacked'),
    'Expected "area-stacked" in results for query "stacked"',
  );
  for (const c of stackedResult.charts) {
    const matches =
      c.id.toLowerCase().includes('stacked') ||
      c.name.toLowerCase().includes('stacked') ||
      c.description.toLowerCase().includes('stacked') ||
      c.tags.some(t => t.toLowerCase().includes('stacked'));
    assert.ok(matches, `Chart ${c.id} should match keyword "stacked"`);
  }

  const donutResult = runListCharts({ query: 'donut' });
  assert.ok(donutResult.total >= 1, 'Query "donut" should return at least 1 chart');
  assert.ok(
    donutResult.charts.some(c => c.id === 'pie-donut'),
    'Expected "pie-donut" in results for query "donut"',
  );
  for (const c of donutResult.charts) {
    const matches =
      c.id.toLowerCase().includes('donut') ||
      c.name.toLowerCase().includes('donut') ||
      c.description.toLowerCase().includes('donut') ||
      c.tags.some(t => t.toLowerCase().includes('donut'));
    assert.ok(matches, `Chart ${c.id} should match keyword "donut"`);
  }

  const gaugeResult = runListCharts({ query: 'gauge' });
  assert.ok(gaugeResult.total >= 1, 'Query "gauge" should return at least 1 chart');
  assert.ok(
    gaugeResult.charts.some(c => c.id === 'radial-half' || c.tags.includes('gauge')),
    'Expected gauge-tagged chart in results for query "gauge"',
  );
  for (const c of gaugeResult.charts) {
    const matches =
      c.id.toLowerCase().includes('gauge') ||
      c.name.toLowerCase().includes('gauge') ||
      c.description.toLowerCase().includes('gauge') ||
      c.tags.some(t => t.toLowerCase().includes('gauge'));
    assert.ok(matches, `Chart ${c.id} should match keyword "gauge"`);
  }
});

test('runGetChartBlueprint returns valid Basecoat HTML using var(--chart-1)..var(--chart-5) tokens and mount code for all 5 frameworks', () => {
  const chartId = 'area-default';

  for (const framework of FRAMEWORKS) {
    const blueprint = runGetChartBlueprint({ id: chartId, framework });
    assert.equal(blueprint.id, chartId);
    assert.equal(blueprint.chartId, chartId);
    assert.equal(blueprint.category, 'area');
    assert.equal(blueprint.framework, framework);
    assert.deepEqual(blueprint.allFrameworksAvailable, FRAMEWORKS);
    assert.ok(blueprint.options && typeof blueprint.options === 'object', 'Must provide options');
    assert.ok(blueprint.layoutFootprint, 'Must provide layoutFootprint');

    assert.ok(blueprint.cssTokens.length > 0, 'Must provide cssTokens');
    for (const token of blueprint.cssTokens) {
      assert.match(token, /^var\(--(chart-[1-5]|color-border|color-muted-foreground)\)$/, `Token ${token} must match approved CSS variables`);
    }

    assert.ok(blueprint.html.includes('var(--chart-'), 'HTML must use Basecoat var(--chart-*) tokens');
    assert.ok(blueprint.html.startsWith('<div'), 'HTML must start with root element');
    assert.ok(blueprint.html.includes('chart-container'), 'HTML must have chart-container class');
    assert.ok(blueprint.html.includes('role="img"'), 'HTML must have role="img"');
    assert.ok(blueprint.html.includes('<table class="sr-only">'), 'HTML must have accessible table fallback');
    assert.ok(blueprint.html.includes('data-chart-tooltip'), 'HTML must have glassmorphic tooltip');
    assert.ok(blueprint.mountCode.length > 0, `Mount code for ${framework} must not be empty`);
    assert.equal(blueprint.code, blueprint.mountCode, 'blueprint.code must match mountCode');

    switch (framework) {
      case 'vanilla':
        assert.ok(
          blueprint.mountCode.includes('document.') || blueprint.mountCode.includes('addEventListener'),
          'Vanilla mount code should reference standard DOM APIs',
        );
        break;
      case 'astro':
        assert.ok(
          blueprint.mountCode.includes('---'),
          'Astro mount code should contain Astro frontmatter (---)',
        );
        break;
      case 'react':
        assert.ok(
          blueprint.mountCode.includes("from 'react'") && blueprint.mountCode.includes('export function'),
          'React mount code should contain React import and component function',
        );
        break;
      case 'vue':
        assert.ok(
          blueprint.mountCode.includes('<script setup') && blueprint.mountCode.includes('<template>'),
          'Vue mount code should contain Vue SFC template/script',
        );
        break;
      case 'svelte':
        assert.ok(
          blueprint.mountCode.includes('<script') && blueprint.mountCode.includes('export let'),
          'Svelte mount code should contain Svelte script and props',
        );
        break;
    }
  }
});

test('runGetChartBlueprint resolves aliases and category defaults correctly', () => {
  const areaDefault = runGetChartBlueprint({ id: 'area' });
  assert.equal(areaDefault.id, 'area-default');

  const donutAlias = runGetChartBlueprint({ id: 'donut' });
  assert.equal(donutAlias.id, 'pie-donut');

  const gaugeAlias = runGetChartBlueprint({ id: 'gauge' });
  assert.equal(gaugeAlias.id, 'radial-half');

  assert.throws(
    () => runGetChartBlueprint({ id: 'non-existent-chart-id-xyz' }),
    /Unknown chart ID/,
  );
});

test('all 56 chart blueprints provide valid CSS tokens and mount code for all 5 frameworks', () => {
  const { charts } = runListCharts({});

  for (const chart of charts) {
    const blueprint = runGetChartBlueprint({ id: chart.id });
    assert.ok(
      blueprint.html.includes('var(--chart-'),
      `Chart ${chart.id} HTML must contain var(--chart-*) token`,
    );

    for (const fw of FRAMEWORKS) {
      const fwBp = runGetChartBlueprint({ id: chart.id, framework: fw });
      assert.ok(
        fwBp.mountCode.trim().length > 0,
        `Chart ${chart.id} must have non-empty mount code for framework ${fw}`,
      );
    }
  }
});

test('zero daisyUI class names or signatures exist in any chart HTML or mount code', () => {
  const daisySignatures = [
    'daisy',
    'daisyui',
    'btn-primary',
    'btn-secondary',
    'btn-accent',
    'btn-neutral',
    'btn-ghost',
    'btn-link',
    'btn-outline',
    'card-body',
    'card-title',
    'card-actions',
    'stat-title',
    'stat-value',
    'stat-desc',
    'stats-vertical',
    'radial-progress',
    'join-item',
    'form-control',
    'label-text',
    'chat-bubble',
    'chat-start',
    'chat-end',
    'drawer-side',
    'drawer-content',
    'menu-title',
    'collapse-title',
  ];

  const { charts } = runListCharts({});

  for (const chart of charts) {
    const bp = runGetChartBlueprint({ id: chart.id });

    for (const sig of daisySignatures) {
      assert.equal(
        bp.html.toLowerCase().includes(sig),
        false,
        `Chart ${chart.id} HTML should not contain daisyUI signature "${sig}"`,
      );
    }

    for (const framework of FRAMEWORKS) {
      const fwBp = runGetChartBlueprint({ id: chart.id, framework });
      for (const sig of daisySignatures) {
        assert.equal(
          fwBp.mountCode.toLowerCase().includes(sig),
          false,
          `Chart ${chart.id} ${framework} mount code should not contain daisyUI signature "${sig}"`,
        );
      }
    }
  }
});

test('search parameter and layoutFootprint / requiredTokens / title work in runListCharts', () => {
  const searchResult = runListCharts({ search: 'stacked' });
  const queryResult = runListCharts({ query: 'stacked' });
  assert.equal(searchResult.total, queryResult.total);
  assert.ok(searchResult.total >= 1);

  for (const c of searchResult.charts) {
    assert.ok(c.id);
    assert.equal(c.title, c.name);
    assert.equal(c.layoutFootprint, 'w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]');
    assert.ok(Array.isArray(c.requiredTokens) && c.requiredTokens.length === 7);
  }
});

test('runGetChartBlueprint supports chartId, defaults, and applies themeTokens override across all 5 frameworks', () => {
  // Defaults to area-default when called with empty input
  const defaultBp = runGetChartBlueprint({});
  assert.equal(defaultBp.id, 'area-default');
  assert.equal(defaultBp.chartId, 'area-default');

  // Accepts chartId
  const areaInteractive = runGetChartBlueprint({ chartId: 'area-interactive' });
  assert.equal(areaInteractive.id, 'area-interactive');
  assert.equal(areaInteractive.chartId, 'area-interactive');

  // Theme tokens override across all 5 frameworks
  const overrides = {
    'var(--chart-1)': 'var(--color-primary)',
    'var(--chart-2)': 'var(--color-secondary)',
  };

  for (const fw of FRAMEWORKS) {
    const bp = runGetChartBlueprint({
      chartId: 'area-interactive',
      framework: fw,
      themeTokens: overrides,
    });

    assert.equal(bp.chartId, 'area-interactive');
    assert.equal(bp.framework, fw);
    assert.ok(bp.html.includes('var(--color-primary)'), `HTML for ${fw} must include token override`);
    assert.ok(bp.code.includes('var(--color-primary)'), `Code for ${fw} must include token override`);
    assert.ok(bp.mountCode.includes('var(--color-primary)'), `mountCode for ${fw} must include token override`);
    assert.ok(bp.html.includes('chart-container'), 'Must have chart-container class');
    assert.ok(bp.html.includes('role="img"'), 'Must have role="img"');
    assert.ok(bp.html.includes('<table class="sr-only">'), 'Must have screen reader data table fallback');
    assert.ok(bp.html.includes('data-chart-tooltip'), 'Must have data-chart-tooltip');
    assert.ok(bp.options && typeof bp.options === 'object', 'Must have options object');
  }
});

test('dashboard-01 correctly references and resolves its embedded chart (area-interactive) from charts-catalog', () => {
  const packaged = loadCompiledRegistry();
  const block = getBlock(packaged, 'dashboard-01');
  assert.ok(block, 'dashboard-01 block must exist in compiled registry');

  const rootFragment = block.fragments.find(f => f.id === 'content-frame');
  assert.ok(rootFragment, 'dashboard-01 must have content-frame fragment');
  assert.ok(
    rootFragment.emmet.includes('data-chart-id=area-interactive'),
    'dashboard-01 emmet must bind to data-chart-id=area-interactive',
  );

  // Assert area-interactive resolves cleanly from charts catalog
  const chartBlueprint = runGetChartBlueprint({ chartId: 'area-interactive' });
  assert.equal(chartBlueprint.id, 'area-interactive');
  assert.equal(chartBlueprint.chartId, 'area-interactive');
  assert.equal(chartBlueprint.category, 'area');
  assert.ok(chartBlueprint.html.includes('chart-container'));
  assert.ok(chartBlueprint.html.includes('role="img"'));
});

test('engine: svg (default) outputs native SVG cubic Bezier paths, ResizeObserver, gradients, and a11y', () => {
  // Empty call defaults to area-default, engine: 'svg', environment: 'html'
  const bp = runGetChartBlueprint({});
  assert.equal(bp.id, 'area-default');
  assert.equal(bp.engine, 'svg');
  assert.equal(bp.environment, 'html');
  assert.equal(bp.framework, 'vanilla');

  // Verify all required tokens and engine output markers in html
  assert.ok(bp.html.includes('ResizeObserver'), 'HTML must include ResizeObserver script');
  assert.ok(bp.html.includes('viewBox'), 'HTML must include viewBox on SVG');
  assert.ok(bp.html.includes('stroke-border/50'), 'HTML must include stroke-border/50 linear grid lines');
  assert.ok(bp.html.includes('tabular-nums'), 'HTML must include tabular-nums');
  assert.ok(bp.html.includes('stroke-muted-foreground stroke-dashed'), 'HTML must include crosshair line with dashed muted-foreground');
  assert.ok(bp.html.includes('<table class="sr-only">'), 'HTML must include screen-reader accessible hidden fallback table');
  assert.ok(bp.html.includes('var(--chart-1)'), 'HTML must bind desktop color to var(--chart-1)');
  assert.ok(bp.html.includes('var(--chart-2)'), 'HTML must bind mobile color to var(--chart-2)');
  assert.ok(bp.html.includes('url(#fillDesktop)'), 'HTML must bind fill="url(#fillDesktop)"');
  assert.ok(bp.html.includes('url(#fillMobile)'), 'HTML must bind fill="url(#fillMobile)"');

  // Verify cubic Bezier M... C... paths
  assert.match(bp.html, /<path[^>]*d="M[^"]*C[^"]*"/, 'HTML must contain smooth cubic Bezier paths (M... C...)');

  // Verify mountCode contains zero-dependency ResizeObserver and hover tracking
  assert.ok(bp.mountCode.includes('ResizeObserver'), 'mountCode must include ResizeObserver');
  assert.equal(bp.code, bp.mountCode);

  // Verify accessibilitySpec
  assert.ok(bp.accessibilitySpec, 'Must include accessibilitySpec metadata');
  assert.equal(bp.accessibilitySpec?.role, 'img');
  assert.equal(bp.accessibilitySpec?.tableFallback, true);
});

test('engine: apexcharts outputs ApexCharts configuration options and mount code across all frameworks', () => {
  for (const fw of FRAMEWORKS) {
    const bp = runGetChartBlueprint({ id: 'area-default', engine: 'apexcharts', framework: fw });
    assert.equal(bp.id, 'area-default');
    assert.equal(bp.engine, 'apexcharts');
    assert.equal(bp.framework, fw);

    // Verify ApexCharts options
    assert.ok(bp.options && typeof bp.options === 'object', 'Must provide ApexCharts options');
    const chartConfig = bp.options.chart as Record<string, unknown> | undefined;
    assert.ok(chartConfig, 'ApexCharts options must define chart object');
    assert.equal(chartConfig.type, 'area');

    // Verify ApexCharts mount code
    assert.ok(bp.mountCode.includes('ApexCharts'), `Framework ${fw} mount code must reference ApexCharts`);
    assert.ok(bp.mountCode.includes('new ApexCharts'), `Framework ${fw} mount code must instantiate ApexCharts`);
  }
});

test('parameter aliases id, chartId, componentId, name and environment work seamlessly', () => {
  // Empty call succeeds
  const emptyBp = runGetChartBlueprint({});
  assert.equal(emptyBp.id, 'area-default');
  assert.equal(emptyBp.engine, 'svg');
  assert.equal(emptyBp.environment, 'html');
  assert.equal(emptyBp.framework, 'vanilla');

  // ID aliases in runGetChartBlueprint
  const byId = runGetChartBlueprint({ id: 'area-stacked' });
  assert.equal(byId.id, 'area-stacked');

  const byChartId = runGetChartBlueprint({ chartId: 'area-stacked' });
  assert.equal(byChartId.id, 'area-stacked');

  const byComponentId = runGetChartBlueprint({ componentId: 'area-stacked' });
  assert.equal(byComponentId.id, 'area-stacked');

  const byName = runGetChartBlueprint({ name: 'Area Chart Stacked' });
  assert.equal(byName.id, 'area-stacked');

  // Environment and framework resolution
  const envHtml = runGetChartBlueprint({ environment: 'html' });
  assert.equal(envHtml.environment, 'html');
  assert.equal(envHtml.framework, 'vanilla');

  const fwHtml = runGetChartBlueprint({ framework: 'html' });
  assert.equal(fwHtml.environment, 'html');
  assert.equal(fwHtml.framework, 'vanilla');

  const envAstro = runGetChartBlueprint({ environment: 'astro' });
  assert.equal(envAstro.environment, 'astro');
  assert.equal(envAstro.framework, 'astro');

  const envReact = runGetChartBlueprint({ environment: 'react' });
  assert.equal(envReact.environment, 'react');
  assert.equal(envReact.framework, 'react');

  const envVue = runGetChartBlueprint({ environment: 'vue' });
  assert.equal(envVue.environment, 'vue');
  assert.equal(envVue.framework, 'vue');

  const envSvelte = runGetChartBlueprint({ environment: 'svelte' });
  assert.equal(envSvelte.environment, 'svelte');
  assert.equal(envSvelte.framework, 'svelte');

  // Filter aliases in runListCharts
  const listById = runListCharts({ id: 'bar-default' });
  assert.equal(listById.total, 1);
  assert.equal(listById.charts[0]!.id, 'bar-default');

  const listByCompId = runListCharts({ componentId: 'line-default' });
  assert.equal(listByCompId.total, 1);
  assert.equal(listByCompId.charts[0]!.id, 'line-default');

  const listByName = runListCharts({ name: 'Pie Donut Chart' });
  assert.ok(listByName.total >= 1);
  assert.ok(listByName.charts.some(c => c.id === 'pie-donut'));

  const listEmpty = runListCharts({});
  assert.equal(listEmpty.total, 56);
  assert.equal(listEmpty.categories.length, 7);
});
