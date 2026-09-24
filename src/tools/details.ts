import { registry } from '../registry/index.js';
import type { Registry } from '../registry/schema.js';
import { assertDetailBudget } from './budget.js';

export function getComponentDetails(id: string, environment: 'astro' | 'html', source: Registry = registry) {
  if (!Object.hasOwn(source.details, id)) throw new Error(`Unknown component: ${id.slice(0, 80)}. Use search_components.`);
  const entry = source.details[id]!;
  const scripts = environment === 'astro'
    ? entry.dependencies.js.map(path => `import '${path}';`).join('\n')
    : '';
  const native = entry.native_script ?? '';
  const inline = [scripts, native].filter(Boolean).join('\n');
  const assets = environment === 'html' ? entry.dependencies.js.map(path =>
    `<script src="/assets/${path.split('/').at(-1)}.min.js" defer></script>`).join('\n') : '';
  const markup = [entry.markup_template, assets, inline ? `<script>\n${inline}\n</script>` : ''].filter(Boolean).join('\n');
  const result = {
    id, environment, basecoat_version: source.upstream.version, markup,
    dependencies: entry.dependencies,
    composition_rules: entry.composition_rules,
    setup: environment === 'astro' ? 'Read basecoat://integration/astro. Rename IDs when repeating.' :
      'Serve compiled Tailwind/Basecoat CSS. Copy listed JS from basecoat-css/dist/js to /assets; preserve order. Rename repeated IDs.',
  };
  assertDetailBudget(result);
  return result;
}
