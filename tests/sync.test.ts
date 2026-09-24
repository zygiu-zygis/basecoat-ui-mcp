import assert from 'node:assert/strict';
import test from 'node:test';
import { registry } from '../src/registry/index.js';
import { buildSnapshot, scrapeComponent } from '../scripts/sync.js';

function fixtures() {
  const sources: Record<string, string> = {
    'package.json': JSON.stringify({ version: '1.0.2', exports: { '.': './dist/basecoat.css', './base': './dist/basecoat.base.css', './tabs': './dist/js/tabs.js', './basecoat': './dist/js/basecoat.js', './dropdown-menu': './dist/js/dropdown-menu.js', './select': './dist/js/select.js', './combobox': './dist/js/combobox.js', './popover': './dist/js/popover.js', './accordion': './dist/js/accordion.js', './command': './dist/js/command.js', './drawer': './dist/js/drawer.js', './sidebar': './dist/js/sidebar.js', './toast': './dist/js/toast.js', './range': './dist/js/range.js', './chart': './dist/js/chart.js' } }),
    'src/css/components/all.css': '.accordion {} .alert {} .alert-dialog {} .avatar {} .badge {} .breadcrumb {} .btn {} .button-group {} .card {} .chart {} .checkbox {} .combobox {} .command {} .dialog {} .drawer {} .dropdown-menu {} .empty {} .field {} .input {} .input-group {} .item {} .kbd {} .label {} .native-select {} .popover {} .progress {} .radio-group {} .scroll-area {} .select {} .sidebar {} .skeleton {} .slider {} .switch {} .table {} .tabs {} .textarea {} .theme-switcher {} .toast {} .tooltip {}',
  };
  for (const { id, name } of registry.index) sources[`site/src/docs/components/${id}.mdx`] = `# ${name}\n<Preview><div class="${id === 'button' ? 'btn' : id}" data-variant="outline"></div></Preview>`;
  const tree = { sha: 'a'.repeat(40), truncated: false, tree: Object.keys(sources).map(path => ({ path, type: 'blob' })) };
  return { sources, tree, read: async (path: string) => { if (!(path in sources)) throw new Error(`Missing fixture: ${path}`); return sources[path]!; } };
}

test('sync extracts variants/classes deterministically and retains curated skeletons', async () => {
  const fixture = fixtures();
  const first = await buildSnapshot(registry, fixture.tree, fixture.read);
  const second = await buildSnapshot(registry, { ...fixture.tree, tree: [...fixture.tree.tree].reverse() }, fixture.read);
  assert.deepEqual(first, second);
  assert.deepEqual(first.details, registry.details);
  assert.equal(first.upstream.revision, 'a'.repeat(40));
  assert.equal(first.upstream.components.length, 39);
  assert.deepEqual(first.upstream.css_classes, ['accordion', 'alert', 'alert-dialog', 'avatar', 'badge', 'breadcrumb', 'btn', 'button-group', 'card', 'chart', 'checkbox', 'combobox', 'command', 'dialog', 'drawer', 'dropdown-menu', 'empty', 'field', 'input', 'input-group', 'item', 'kbd', 'label', 'native-select', 'popover', 'progress', 'radio-group', 'scroll-area', 'select', 'sidebar', 'skeleton', 'slider', 'switch', 'table', 'tabs', 'textarea', 'theme-switcher', 'toast', 'tooltip']);
  const scraped = scrapeComponent('button', '# Button\n<button class="btn btn" data-variant="outline|primary">');
  assert.deepEqual(scraped.variants, ['outline', 'primary']);
  assert.deepEqual(scraped.classes, ['btn']);
});

test('sync permits the documented chart canvas root but preserves other root checks', async () => {
  const fixture = fixtures();
  fixture.sources['site/src/docs/components/chart.mdx'] = '# Chart\n<Preview class="w-full"><canvas></canvas></Preview>';
  const snapshot = await buildSnapshot(registry, fixture.tree, fixture.read);
  assert.deepEqual(snapshot.upstream.components.find(component => component.id === 'chart')?.classes, ['w-full']);

  fixture.sources['site/src/docs/components/button.mdx'] = '# Button\n<Preview><button>Save</button></Preview>';
  await assert.rejects(buildSnapshot(registry, fixture.tree, fixture.read), /Root class changed: btn/);
});

test('sync refuses truncated or moved upstream trees, missing exports and major upgrades', async () => {
  const fixture = fixtures();
  await assert.rejects(buildSnapshot(registry, { ...fixture.tree, truncated: true }, fixture.read), /truncated/);
  await assert.rejects(buildSnapshot(registry, { ...fixture.tree, tree: [] }, fixture.read), /paths changed/);
  fixture.sources['package.json'] = JSON.stringify({ version: '2.0.0', exports: {} });
  await assert.rejects(buildSnapshot(registry, fixture.tree, fixture.read), /major version/);
  fixture.sources['package.json'] = JSON.stringify({ version: '1.0.3', exports: { '.': 'css' } });
  await assert.rejects(buildSnapshot(registry, fixture.tree, fixture.read), /export disappeared/);
});

test('sync preserves the original registry when upstream fetch fails', async () => {
  const before = JSON.stringify(registry);
  const fixture = fixtures();
  await assert.rejects(buildSnapshot(registry, fixture.tree, async () => { throw new Error('offline'); }), /offline/);
  assert.equal(JSON.stringify(registry), before);
  assert.throws(() => scrapeComponent('broken', '<p>No title</p>'), /no title/);
});

test('sync refuses a stale release that would downgrade the registry', async () => {
  const fixture = fixtures();
  const current = structuredClone(registry);
  current.upstream.version = '1.0.2';
  fixture.sources['package.json'] = JSON.stringify({ version: '1.0.1', exports: {} });
  await assert.rejects(buildSnapshot(current, fixture.tree, fixture.read), /downgrade/);
});
