// Copyright Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { THEMING } from '../src/design/theming.js';
import { FRAMEWORK_INTEGRATION } from '../src/design/integration.js';
import { getComponentDetails } from '../src/tools/details.js';
import { responseBytes, MAX_DETAIL_BYTES } from '../src/tools/budget.js';
import { validateComposition } from '../src/tools/validate.js';

describe('Basecoat Style Packs and Theming Contract', () => {
  const STYLE_PACKS = ['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'] as const;

  it('documents all 8 style packs in the theming contract', () => {
    for (const style of STYLE_PACKS) {
      const capitalized = style.charAt(0).toUpperCase() + style.slice(1);
      assert(THEMING.includes(capitalized), `THEMING should mention style pack ${capitalized}`);
      assert(THEMING.includes(`basecoat-css/${style}`), `THEMING should mention basecoat-css/${style}`);
    }
    assert(THEMING.includes('style-variant-select'), 'THEMING should document the style-variant-select element');
  });

  it('documents style pack import in framework integration', () => {
    assert(FRAMEWORK_INTEGRATION.includes('basecoat-css/vega'), 'FRAMEWORK_INTEGRATION should mention basecoat-css/vega');
  });
});

describe('Theme Switcher Component Quality and Accessibility', () => {
  it('delivers authentic Lucide sun and moon SVGs in HTML and Astro environments', () => {
    for (const env of ['html', 'astro'] as const) {
      const detail = getComponentDetails('theme-switcher', env);
      assert(responseBytes(detail) <= MAX_DETAIL_BYTES, `theme-switcher in ${env} must fit within ${MAX_DETAIL_BYTES} bytes`);
      assert(detail.markup.includes('lucide-sun'), 'markup should include lucide-sun SVG');
      assert(detail.markup.includes('lucide-moon'), 'markup should include lucide-moon SVG');
      assert(detail.markup.includes('aria-label="Toggle dark mode"'), 'must have accessible aria-label');
      assert(detail.markup.includes('data-tooltip="Toggle dark mode"'), 'must have data-tooltip attribute');
      assert(detail.markup.includes('size-8'), 'must have size-8 class for standard 32x32px icon button');
      assert(detail.markup.includes('data-size="icon"'), 'must have data-size="icon"');
      assert(detail.markup.includes('data-variant="outline"'), 'must have data-variant="outline"');
      assert(detail.markup.includes('hidden dark:block'), 'sun icon must be hidden in light mode and shown in dark mode');
      assert(detail.markup.includes('block dark:hidden'), 'moon icon must be shown in light mode and hidden in dark mode');
      assert(detail.markup.includes('aria-hidden="true"'), 'inner icon wrappers must be aria-hidden');
      assert(detail.markup.includes('window.basecoat.theme.toggle()'), 'must trigger Basecoat runtime theme.toggle()');

      const validation = validateComposition(detail.markup);
      assert.deepEqual(validation.issues, [], `theme-switcher in ${env} should have no validation issues`);
    }
  });
});

describe('Website Composition with Header Controls and Macro Blocks', () => {
  it('validates a complete modern header with style preset selector and theme switcher adhering to rhythm and a11y', () => {
    const headerMarkup = `<header class="flex items-center justify-between border-b bg-background p-4">
  <div class="flex items-center gap-4">
    <a href="/" class="flex items-center gap-2 font-semibold">
      <span class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">B</span>
      <span>Basecoat UI</span>
    </a>
    <nav class="hidden md:flex items-center gap-2 text-sm text-muted-foreground" aria-label="Main Navigation">
      <a href="/docs" class="hover:text-foreground">Docs</a>
      <a href="/components" class="hover:text-foreground">Components</a>
      <a href="/blocks" class="hover:text-foreground">Blocks</a>
    </nav>
  </div>
  <div class="flex items-center gap-2">
    <select id="style-variant-select" class="select h-8 w-28 text-sm leading-none" aria-label="Style pack">
      <option value="vega">Vega</option>
      <option value="nova">Nova</option>
      <option value="maia">Maia</option>
      <option value="lyra">Lyra</option>
      <option value="mira">Mira</option>
      <option value="luma">Luma</option>
      <option value="sera">Sera</option>
      <option value="rhea">Rhea</option>
    </select>
    <button
      type="button"
      aria-label="Toggle dark mode"
      data-tooltip="Toggle dark mode"
      data-side="bottom"
      onclick="window.basecoat.theme.toggle()"
      class="btn size-8"
      data-variant="outline"
      data-size="icon"
    >
      <span class="hidden dark:block" aria-hidden="true">
        <svg class="lucide lucide-sun size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2m0 16v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2m-2.93 7.07-1.41-1.41M6.34 6.34 4.93 4.93"/>
        </svg>
      </span>
      <span class="block dark:hidden" aria-hidden="true">
        <svg class="lucide lucide-moon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/>
        </svg>
      </span>
    </button>
  </div>
</header>`;

    const result = validateComposition(headerMarkup);
    assert.deepEqual(result.issues, [], 'Header with style selector and theme switcher should pass composition validation');
  });

  it('validates a complete dashboard shell composition with theme-switcher, cards, and required scripts', () => {
    const dashboardMarkup = `<div class="flex min-h-screen bg-background text-foreground">
  <aside class="sidebar border-r p-4 w-64 flex flex-col gap-4" aria-label="Sidebar">
    <div class="font-semibold text-lg">Admin Console</div>
    <nav class="flex flex-col gap-2 text-sm" aria-label="Sidebar navigation">
      <a href="/overview" aria-current="page" class="btn justify-start" data-variant="secondary">Overview</a>
      <a href="/analytics" class="btn justify-start" data-variant="ghost">Analytics</a>
      <a href="/settings" class="btn justify-start" data-variant="ghost">Settings</a>
    </nav>
  </aside>
  <div class="flex flex-1 flex-col">
    <header class="flex items-center justify-between border-b p-4">
      <div class="text-sm font-medium">Dashboard Overview</div>
      <div class="flex items-center gap-2">
        <button type="button" aria-label="Toggle dark mode" data-tooltip="Toggle dark mode" data-side="bottom" onclick="window.basecoat.theme.toggle()" class="btn size-8" data-variant="outline" data-size="icon">
          <span class="hidden dark:block" aria-hidden="true">
            <svg class="lucide lucide-sun size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/></svg>
          </span>
          <span class="block dark:hidden" aria-hidden="true">
            <svg class="lucide lucide-moon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472"/></svg>
          </span>
        </button>
      </div>
    </header>
    <main class="flex-1 p-6 flex flex-col gap-6">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <section class="card p-4">
          <div class="text-sm text-muted-foreground">Total Revenue</div>
          <div class="text-2xl font-bold">€45,231.89</div>
        </section>
        <section class="card p-4">
          <div class="text-sm text-muted-foreground">Active Subscriptions</div>
          <div class="text-2xl font-bold">+2,350</div>
        </section>
        <section class="card p-4">
          <div class="text-sm text-muted-foreground">Active Now</div>
          <div class="text-2xl font-bold">+573</div>
        </section>
      </div>
    </main>
  </div>
</div>
<script src="/assets/basecoat.min.js" defer></script>
<script src="/assets/sidebar.min.js" defer></script>`;

    const result = validateComposition(dashboardMarkup);
    assert.deepEqual(result.issues, [], 'Dashboard shell composition should be completely valid');
  });

  it('detects conflicting dark mode strategies when users improperly mix media queries with .dark class', () => {
    const mixedMarkup = `<style>
  @media (prefers-color-scheme: dark) {
    :root { --background: #000; }
  }
</style>
<script>
  document.documentElement.classList.add('dark');
</script>
<body>
  <button class="btn" onclick="window.basecoat.theme.toggle()">Toggle</button>
</body>`;
    const result = validateComposition(mixedMarkup);
    const hasThemeConflict = result.issues.some(i => i.rule === 'theme-strategy-mixed');
    assert.equal(hasThemeConflict, true, 'Must flag mixed prefers-color-scheme and .dark class strategies');
  });

  it('detects custom localStorage keys diverging from canonical themeMode', () => {
    const customKeyMarkup = `<script>
  const mode = localStorage.getItem('myCustomThemeKey');
  if (mode === 'dark') document.documentElement.classList.add('dark');
</script>`;
    const result = validateComposition(customKeyMarkup);
    const hasDivergentKey = result.issues.some(i => i.rule === 'theme-storage-key');
    assert.equal(hasDivergentKey, true, 'Must flag non-canonical theme storage key');
  });
});
