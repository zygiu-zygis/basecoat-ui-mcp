import { registry } from '../registry/index.js';
import type { Registry } from '../registry/schema.js';
import { assertDetailBudget } from './budget.js';
import { resolveComponentId, suggestComponentId } from './component-id.js';

export type ComponentEnvironment = 'html' | 'astro' | 'react' | 'vue' | 'svelte';

export interface ComponentCatalogIndex {
  total: number;
  environment: ComponentEnvironment;
  components: Registry['index'];
}

export interface ComponentDetail {
  id: string;
  environment: ComponentEnvironment;
  basecoat_version: string;
  markup: string;
  dependencies: {
    css: string[];
    js: string[];
  };
  composition_rules: string;
  setup: string;
}

export function getComponentDetails(
  id: string,
  environment?: ComponentEnvironment,
  source?: Registry,
): ComponentDetail;
export function getComponentDetails(
  id?: undefined,
  environment?: ComponentEnvironment,
  source?: Registry,
): ComponentCatalogIndex;
export function getComponentDetails(
  id?: string,
  environment?: ComponentEnvironment,
  source?: Registry,
): ComponentDetail | ComponentCatalogIndex;
export function getComponentDetails(
  id?: string,
  environment: ComponentEnvironment = 'html',
  source: Registry = registry,
): ComponentDetail | ComponentCatalogIndex {
  if (!id || id.trim().length === 0) {
    return {
      total: source.index.length,
      environment,
      components: source.index,
    };
  }
  const resolved = resolveComponentId(id);
  if (!Object.hasOwn(source.details, resolved)) {
    const hint = suggestComponentId(resolved);
    const suffix = hint ? ` Did you mean ${hint}?` : '';
    throw new Error(`Unknown component: ${id.slice(0, 80)}.${suffix} Use search_components.`);
  }
  id = resolved;
  const entry = source.details[id]!;
  const scripts = environment === 'astro'
    ? entry.dependencies.js.map(path => `import '${path}';`).join('\n')
    : '';
  const native = entry.native_script ?? '';
  const inline = [scripts, native].filter(Boolean).join('\n');
  const assets = environment === 'html' ? entry.dependencies.js.map(path =>
    `<script src="/assets/${path.split('/').at(-1)}.min.js" defer></script>`).join('\n') : '';
  const scriptTag = inline
    ? (environment === 'astro'
        ? `<!-- Add to your layout or component script, not <head> -->\n<script>\n${inline}\n</script>`
        : environment === 'html'
          ? `<script>\n${inline}\n</script>`
          : `<!-- Framework script setup: import ${entry.dependencies.js.map(p => p.split('/').at(-1)).join(', ')} -->`)
    : '';
  const markup = [
    entry.markup_template, 
    assets, 
    scriptTag
  ].filter(Boolean).join('\n');
  const setup = environment === 'astro'
    ? 'Read basecoat://integration/frameworks. Rename IDs when repeating.'
    : environment === 'react'
      ? 'In React/Next.js: use markup with className. Import Basecoat JS in client mount effect. Read basecoat://integration/frameworks.'
      : environment === 'vue'
        ? 'In Vue: paste markup in <template>. Import Basecoat JS in onMounted hook. Read basecoat://integration/frameworks.'
        : environment === 'svelte'
          ? 'In Svelte: paste markup template directly. Import Basecoat JS in onMount. Read basecoat://integration/frameworks.'
          : 'Serve compiled Tailwind/Basecoat CSS. Copy listed JS from basecoat-css/dist/js to /assets; preserve order. Rename repeated IDs.';
  const result = {
    id, environment, basecoat_version: source.upstream.version, markup,
    dependencies: entry.dependencies,
    composition_rules: entry.composition_rules,
    setup,
  };
  assertDetailBudget(result);
  return result;
}
