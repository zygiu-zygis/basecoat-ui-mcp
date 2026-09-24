import assert from 'node:assert/strict';
import test from 'node:test';
import { registry, metadata } from '../src/registry/index.js';
import { registrySchema } from '../src/registry/schema.js';
import { searchComponents } from '../src/tools/search.js';
import { getComponentDetails } from '../src/tools/details.js';
import { responseBytes, assertDetailBudget } from '../src/tools/budget.js';
import { validateComposition } from '../src/tools/validate.js';

test('registry links metadata and details, preserves upstream provenance', () => {
  assert.equal(registry.upstream.version, '1.0.2');
  assert(registry.upstream.components.length >= 5);
  for (const item of metadata) assert(!('markup_template' in item));
  const broken = structuredClone(registry);
  delete broken.details.button;
  assert.equal(registrySchema.safeParse(broken).success, false);
  const duplicate = structuredClone(registry);
  duplicate.index.push(duplicate.index[0]!);
  assert.equal(registrySchema.safeParse(duplicate).success, false);
});

test('registry preserves the exact curated and discovered component boundary', () => {
  const curatedIds = new Set(registry.index.map(component => component.id));
  const discoveredIds = new Set(registry.upstream.components.map(component => component.id));
  assert.equal(registry.index.length, 39);
  assert.equal(Object.keys(registry.details).length, 39);
  assert.equal(registry.upstream.components.length, 41);
  for (const id of ['pagination', 'spinner']) {
    assert.equal(curatedIds.has(id), false);
    assert.equal(Object.hasOwn(registry.details, id), false);
    assert.equal(discoveredIds.has(id), true);
  }
  assert.deepEqual(registry.details.slider?.dependencies.js, [
    'basecoat-css/basecoat',
    'basecoat-css/range',
  ]);
});

test('search uses intent synonyms, stable ties, unknown queries and metadata only', () => {
  assert.equal(searchComponents({ intent: 'destructive confirmation', query: '' })[0]?.id, 'dialog');
  assert.equal(searchComponents({ intent: '', query: 'modal' })[0]?.id, 'dialog');
  assert.equal(searchComponents({ intent: '', query: 'email' })[0]?.id, 'input');
  assert.deepEqual(searchComponents({ intent: '', query: '' }), []);
  assert.deepEqual(searchComponents({ intent: '', query: '?!' }), []);
  assert.deepEqual(searchComponents({ intent: '', query: 'forms' }).map(item => item.id), ['button', 'button-group', 'checkbox', 'combobox', 'field', 'input', 'input-group', 'label']);
  assert.deepEqual(searchComponents({ intent: '', query: 'unmatchedxyz' }), []);
  assert.deepEqual(searchComponents({ intent: '', query: 'MODAL' }), searchComponents({ intent: '', query: 'modal' }));
  for (const item of searchComponents({ intent: '', query: 'forms' })) assert.deepEqual(Object.keys(item), ['id', 'name', 'intent']);
});

test('search matches the new curated intents without unrelated fallback results', () => {
  for (const [query, id] of [['dropdown', 'dropdown-menu'], ['compact status', 'badge'], ['empty state', 'empty']] as const) {
    assert.deepEqual(searchComponents({ intent: '', query }).map(item => item.id), [id]);
    assert.deepEqual(searchComponents({ intent: query, query: '' }).map(item => item.id), [id]);
  }
});

test('all minimal templates pass static validation and complete result byte bounds', () => {
  const metrics = [];
  for (const { id } of metadata) for (const environment of ['astro', 'html'] as const) {
    const detail = getComponentDetails(id, environment);
    assert(responseBytes(detail) <= 1999);
    assert.deepEqual(validateComposition(detail.markup).issues, [], `${id}/${environment}`);
    metrics.push({ id, environment, bytes: responseBytes(detail) });
  }
  console.log('MCP detail byte metrics:', JSON.stringify(metrics));
});

test('oversized details fail closed instead of returning broken JSON', () => {
  const oversized = structuredClone(registry);
  oversized.details.dialog!.markup_template = '<div>' + '界'.repeat(1000) + '</div>';
  assert.throws(() => getComponentDetails('dialog', 'astro', oversized), /1999/);
  assert.throws(() => assertDetailBudget({ text: '😀'.repeat(600) }), /1999/);
  assert.throws(() => getComponentDetails('__proto__', 'astro'), /Unknown/);
});

test('HTML uses local ordered scripts; Astro imports runtime before granular modules', () => {
  for (const id of ['tabs', 'dropdown-menu']) {
    const astro = getComponentDetails(id, 'astro').markup;
    assert(astro.includes('<script>'));
    assert(astro.indexOf("import 'basecoat-css/basecoat'") < astro.indexOf(`import 'basecoat-css/${id}'`));
    assert(!astro.includes('type="module"'));
    const html = getComponentDetails(id, 'html').markup;
    assert(html.indexOf('/assets/basecoat.min.js') < html.indexOf(`/assets/${id}.min.js`));
    assert(!html.includes('https://'));
  }
  for (const { id } of metadata) assert.deepEqual(getComponentDetails(id, 'astro').dependencies.css, ['basecoat-css/base']);
  assert.equal(getComponentDetails('dialog', 'astro').dependencies.js.length, 0);
  assert.match(getComponentDetails('dialog', 'astro').markup, /\.showModal\(\)/);
});
