import assert from 'node:assert/strict';
import test from 'node:test';
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
    assert.ok(chart.description, 'Chart must have a description');
    assert.ok(Array.isArray(chart.tags) && chart.tags.length > 0, `Chart ${chart.id} must have non-empty tags`);
    assert.ok(Array.isArray(chart.cssTokens) && chart.cssTokens.length > 0, `Chart ${chart.id} must have cssTokens`);
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
    assert.equal(blueprint.category, 'area');
    assert.equal(blueprint.framework, framework);
    assert.deepEqual(blueprint.allFrameworksAvailable, FRAMEWORKS);

    assert.ok(blueprint.cssTokens.length > 0, 'Must provide cssTokens');
    for (const token of blueprint.cssTokens) {
      assert.match(token, /^var\(--chart-[1-5]\)$/, `Token ${token} must match var(--chart-1..5)`);
    }

    assert.ok(blueprint.html.includes('var(--chart-'), 'HTML must use Basecoat var(--chart-*) tokens');
    assert.ok(blueprint.html.startsWith('<div'), 'HTML must start with root element');
    assert.ok(blueprint.mountCode.length > 0, `Mount code for ${framework} must not be empty`);

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
