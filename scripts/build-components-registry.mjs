// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Deterministic builder for src/registry/components.json expanding registry to 60 primitives (61 total curated).
import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { z } from 'zod';

const componentMetadataSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1).max(80),
  intent: z.string().min(1).max(180),
  categories: z.array(z.string().max(40)).max(8),
  keywords: z.array(z.string().max(40)).max(24),
}).strict();

const componentDetailsSchema = z.object({
  dependencies: z.object({ css: z.array(z.string()), js: z.array(z.string()) }).strict(),
  markup_template: z.string().min(1).max(4000),
  composition_rules: z.string().min(1).max(400),
  native_script: z.string().max(1200).optional(),
}).strict();

const registrySchema = z.object({
  schema_version: z.literal(1),
  upstream: z.object({
    repository: z.literal('https://github.com/hunvreus/basecoat'),
    version: z.string(),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    license: z.literal('MIT'),
    components: z.array(z.object({
      id: z.string(), name: z.string(),
      variants: z.array(z.string()), classes: z.array(z.string()),
      source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict()),
    css_classes: z.array(z.string()),
  }).strict(),
  index: z.array(componentMetadataSchema).min(5),
  details: z.record(z.string(), componentDetailsSchema),
}).strict().superRefine((registry, ctx) => {
  const ids = registry.index.map(component => component.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Duplicate component IDs' });
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(ids)) ctx.addIssue({ code: 'custom', message: 'Index must be sorted by ID' });
  for (const id of new Set([...ids, ...Object.keys(registry.details)])) {
    if (!ids.includes(id) || !registry.details[id]) ctx.addIssue({ code: 'custom', message: `Index/details mismatch: ${id}` });
  }
});

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REGISTRY_PATH = resolve(ROOT, 'src/registry/components.json');

const NEW_COMPONENTS = [
  {
    metadata: {
      id: 'aspect-ratio',
      name: 'Aspect Ratio',
      intent: 'Constrain content to a specific ratio such as video or square',
      categories: ['layout'],
      keywords: ['ratio', 'video', 'square', 'embed', 'frame'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="aspect-video w-full overflow-hidden rounded-md bg-muted">\n  <img src="/placeholder.svg" alt="Preview" class="h-full w-full object-cover" />\n</div>`,
      composition_rules: 'Constrain images, videos, and embedded frames to defined aspect ratios (e.g. aspect-video, aspect-square). Use standard Tailwind v4 aspect utilities.',
    },
  },
  {
    metadata: {
      id: 'calendar',
      name: 'Calendar',
      intent: 'Display monthly date grid and enable date navigation',
      categories: ['date-time'],
      keywords: ['month', 'schedule', 'picker', 'days'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="p-4 rounded-lg bg-card text-card-foreground shadow-xs w-fit">\n  <div class="flex items-center justify-between gap-4 mb-4">\n    <h3 class="text-sm font-semibold">February 2026</h3>\n    <div class="flex items-center gap-2">\n      <button type="button" class="btn" data-variant="ghost" aria-label="Previous month">&lt;</button>\n      <button type="button" class="btn" data-variant="ghost" aria-label="Next month">&gt;</button>\n    </div>\n  </div>\n  <div class="grid grid-cols-7 gap-2 text-center text-xs text-muted-foreground">\n    <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>\n  </div>\n  <div class="grid grid-cols-7 gap-2 mt-2 text-center text-sm">\n    <button type="button" class="btn" data-variant="outline" aria-label="Day 1">1</button>\n    <button type="button" class="btn" data-variant="ghost" aria-label="Day 2">2</button>\n    <button type="button" class="btn" data-variant="ghost" aria-label="Day 3">3</button>\n  </div>\n</div>`,
      composition_rules: 'Render monthly date grids using 7-column CSS grid. Day action buttons must declare aria-label for accessibility. Date selection and range states are managed by host logic.',
    },
  },
  {
    metadata: {
      id: 'carousel',
      name: 'Carousel',
      intent: 'Navigate horizontally through featured slides or cards',
      categories: ['layout', 'navigation'],
      keywords: ['slider-cards', 'slides', 'gallery', 'swiper'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="relative w-full max-w-md" role="region" aria-roledescription="carousel" aria-label="Featured items">\n  <div class="flex gap-4 overflow-x-auto snap-x snap-mandatory">\n    <div class="shrink-0 w-full snap-center rounded-lg bg-card p-6 shadow-xs">\n      <h3 class="text-sm font-semibold">Slide 1</h3>\n      <p class="text-sm text-muted-foreground mt-2">First featured item description.</p>\n    </div>\n    <div class="shrink-0 w-full snap-center rounded-lg bg-card p-6 shadow-xs">\n      <h3 class="text-sm font-semibold">Slide 2</h3>\n      <p class="text-sm text-muted-foreground mt-2">Second featured item description.</p>\n    </div>\n  </div>\n  <div class="flex justify-end gap-2 mt-4">\n    <button type="button" class="btn" data-variant="outline" data-size="icon" aria-label="Previous slide">\n      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>\n    </button>\n    <button type="button" class="btn" data-variant="outline" data-size="icon" aria-label="Next slide">\n      <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>\n    </button>\n  </div>\n</div>`,
      composition_rules: 'CSS scroll snap provides native horizontal carousels without heavy JavaScript libraries. Provide aria-label on navigation controls.',
    },
  },
  {
    metadata: {
      id: 'collapsible',
      name: 'Collapsible',
      intent: 'Expand or collapse content sections with an interactive trigger',
      categories: ['disclosure'],
      keywords: ['accordion-item', 'expand', 'collapse', 'details', 'summary'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<details class="w-full rounded-md border border-border p-4">\n  <summary class="flex cursor-pointer items-center justify-between font-medium text-sm list-none">\n    <span>Can I customize the styling?</span>\n    <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m6 9 6 6 6-6"/></svg>\n  </summary>\n  <div class="mt-2 text-sm text-muted-foreground">\n    Yes! Basecoat uses standard Tailwind v4 classes and native HTML.\n  </div>\n</details>`,
      composition_rules: 'Native details and summary elements provide accessible collapsible sections without script dependencies. Do not nest card inside details.',
    },
  },
  {
    metadata: {
      id: 'context-menu',
      name: 'Context Menu',
      intent: 'Display contextual actions triggered by secondary click',
      categories: ['overlay'],
      keywords: ['right-click', 'context', 'actions', 'shortcut-menu'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="flex h-36 w-full max-w-md items-center justify-center rounded-md border border-dashed border-border text-sm text-muted-foreground">\n  Right click here to open\n</div>\n<div role="menu" class="hidden min-w-48 rounded-md border border-border bg-popover p-2 text-popover-foreground shadow-md">\n  <div role="menuitem" class="flex cursor-pointer items-center rounded-sm p-2 text-sm hover:bg-accent hover:text-accent-foreground">\n    Back\n  </div>\n  <div role="menuitem" class="flex cursor-pointer items-center rounded-sm p-2 text-sm hover:bg-accent hover:text-accent-foreground">\n    Reload\n  </div>\n</div>`,
      composition_rules: 'Context menus trigger on secondary pointer click. Position dynamically using coordinates in host client scripts.',
    },
  },
  {
    metadata: {
      id: 'data-table',
      name: 'Data Table',
      intent: 'Display tabular data with structured rows and column headers',
      categories: ['data-display'],
      keywords: ['grid', 'records', 'columns', 'dataset'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="w-full space-y-4">\n  <div class="overflow-x-auto rounded-md border border-border">\n    <table class="table w-full text-sm">\n      <thead>\n        <tr class="border-b border-border text-muted-foreground">\n          <th class="p-4 text-left font-medium">Invoice</th>\n          <th class="p-4 text-left font-medium">Status</th>\n          <th class="p-4 text-right font-medium">Amount</th>\n        </tr>\n      </thead>\n      <tbody>\n        <tr class="border-b border-border">\n          <td class="p-4 font-medium">INV-001</td>\n          <td class="p-4">Paid</td>\n          <td class="p-4 text-right">$250.00</td>\n        </tr>\n      </tbody>\n    </table>\n  </div>\n</div>`,
      composition_rules: 'Always enclose table inside an overflow-x-auto container. Align numeric currency and metric columns to the right.',
    },
  },
  {
    metadata: {
      id: 'date-picker',
      name: 'Date Picker',
      intent: 'Select a date from an input control',
      categories: ['input-controls'],
      keywords: ['calendar-input', 'date-field', 'day-select'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="grid w-full max-w-sm gap-2">\n  <label for="date-input" class="text-sm font-medium leading-none">Pick a date</label>\n  <input id="date-input" type="date" class="input w-full" />\n</div>`,
      composition_rules: 'Pair date input with explicit label for accessibility. Keep input styling consistent with Basecoat input tokens.',
    },
  },
  {
    metadata: {
      id: 'form',
      name: 'Form',
      intent: 'Structure input submission with labeled fields and actions',
      categories: ['form-layout'],
      keywords: ['form-layout', 'input-controls', 'submission', 'fieldset-layout'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<form class="w-full max-w-md space-y-4">\n  <div class="grid gap-2">\n    <label for="username" class="text-sm font-medium leading-none">Username</label>\n    <input id="username" type="text" class="input w-full" placeholder="Enter username" />\n    <p class="text-xs text-muted-foreground">This is your public display name.</p>\n  </div>\n  <button type="submit" class="btn" data-variant="default">Submit</button>\n</form>`,
      composition_rules: 'Structure forms with explicit labels, descriptive helper text, and single primary submit actions.',
    },
  },
  {
    metadata: {
      id: 'hover-card',
      name: 'Hover Card',
      intent: 'Preview detailed profile or entity content on pointer hover',
      categories: ['overlay'],
      keywords: ['preview', 'flyover', 'peek', 'tooltip-card'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="relative inline-block">\n  <a href="#profile" class="text-sm font-medium underline underline-offset-4">@basecoat</a>\n  <div class="absolute top-full left-0 z-50 mt-2 w-80 rounded-md border border-border bg-popover p-4 text-popover-foreground shadow-md">\n    <div class="flex gap-4">\n      <div class="size-10 rounded-full bg-muted flex items-center justify-center font-semibold text-xs">BC</div>\n      <div class="space-y-2">\n        <h4 class="text-sm font-semibold">Basecoat UI</h4>\n        <p class="text-xs text-muted-foreground">Minimalist UI primitives built with Tailwind CSS v4.</p>\n      </div>\n    </div>\n  </div>\n</div>`,
      composition_rules: 'Hover cards provide rich secondary previews on pointer hover. Ensure interactive content remains reachable via focus.',
    },
  },
  {
    metadata: {
      id: 'input-otp',
      name: 'Input OTP',
      intent: 'Enter one-time passcode verification digits into discrete inputs',
      categories: ['input-controls'],
      keywords: ['pin', 'otp', 'code', 'verification', 'auth-digits'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="flex items-center gap-2" role="group" aria-label="One-time password">\n  <input type="text" maxlength="1" class="input size-10 text-center font-semibold" aria-label="Digit 1" />\n  <input type="text" maxlength="1" class="input size-10 text-center font-semibold" aria-label="Digit 2" />\n  <input type="text" maxlength="1" class="input size-10 text-center font-semibold" aria-label="Digit 3" />\n  <input type="text" maxlength="1" class="input size-10 text-center font-semibold" aria-label="Digit 4" />\n  <input type="text" maxlength="1" class="input size-10 text-center font-semibold" aria-label="Digit 5" />\n  <input type="text" maxlength="1" class="input size-10 text-center font-semibold" aria-label="Digit 6" />\n</div>`,
      composition_rules: 'One-time passcode inputs require discrete character cells with individual aria-label attributes and role="group".',
    },
  },
  {
    metadata: {
      id: 'menubar',
      name: 'Menubar',
      intent: 'Present horizontal top-level desktop application menu commands',
      categories: ['navigation'],
      keywords: ['top-menu', 'command-bar', 'app-menu'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="flex items-center gap-2 rounded-md border border-border bg-background p-2" role="menubar" aria-label="Application menu">\n  <button type="button" class="btn" data-variant="ghost" role="menuitem">File</button>\n  <button type="button" class="btn" data-variant="ghost" role="menuitem">Edit</button>\n  <button type="button" class="btn" data-variant="ghost" role="menuitem">View</button>\n</div>`,
      composition_rules: 'Declare role="menubar" with menuitem children. Group application level commands horizontally.',
    },
  },
  {
    metadata: {
      id: 'navigation-menu',
      name: 'Navigation Menu',
      intent: 'Display primary website section navigation links',
      categories: ['navigation'],
      keywords: ['site-nav', 'header-nav', 'nav-links', 'top-nav'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<nav class="flex items-center gap-2" aria-label="Main navigation">\n  <a href="#getting-started" class="btn" data-variant="ghost">Getting Started</a>\n  <a href="#components" class="btn" data-variant="ghost">Components</a>\n  <a href="#documentation" class="btn" data-variant="ghost">Documentation</a>\n</nav>`,
      composition_rules: 'Navigation landmark must declare an aria-label to differentiate from sidebar or footer navigation links.',
    },
  },
  {
    metadata: {
      id: 'pagination',
      name: 'Pagination',
      intent: 'Navigate across paginated list pages with previous and next controls',
      categories: ['navigation'],
      keywords: ['pages', 'pager', 'paging', 'page-numbers'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<nav class="flex items-center justify-center gap-2" aria-label="Pagination">\n  <a href="#prev" class="btn" data-variant="outline" data-size="icon" aria-label="Previous page">\n    <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m15 18-6-6 6-6"/></svg>\n  </a>\n  <a href="#page1" class="btn" data-variant="outline">1</a>\n  <a href="#page2" class="btn" data-variant="ghost">2</a>\n  <a href="#page3" class="btn" data-variant="ghost">3</a>\n  <a href="#next" class="btn" data-variant="outline" data-size="icon" aria-label="Next page">\n    <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m9 18 6-6-6-6"/></svg>\n  </a>\n</nav>`,
      composition_rules: 'Pagination navigation landmark requires aria-label. Active page button uses data-variant="outline" while sibling links use ghost.',
    },
  },
  {
    metadata: {
      id: 'resizable',
      name: 'Resizable',
      intent: 'Split panels with an interactive draggable divider handle',
      categories: ['layout'],
      keywords: ['splitter', 'split-pane', 'divider-handle', 'panes'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="flex h-48 w-full max-w-md rounded-lg border border-border">\n  <div class="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">\n    Panel One\n  </div>\n  <div class="w-px bg-border hover:bg-ring transition-colors" role="separator" aria-orientation="vertical"></div>\n  <div class="flex flex-1 items-center justify-center p-6 text-sm text-muted-foreground">\n    Panel Two\n  </div>\n</div>`,
      composition_rules: 'Use flex containers with divider separator handles. Handle dragging logic is implemented in client script.',
    },
  },
  {
    metadata: {
      id: 'separator',
      name: 'Separator',
      intent: 'Visually separate sections with a horizontal or vertical divider line',
      categories: ['layout'],
      keywords: ['divider', 'rule', 'split', 'hr'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="w-full max-w-md space-y-4">\n  <div class="space-y-2">\n    <h4 class="text-sm font-medium leading-none">Basecoat UI</h4>\n    <p class="text-sm text-muted-foreground">Minimalist primitives for web applications.</p>\n  </div>\n  <div class="h-px w-full bg-border" role="separator"></div>\n  <div class="flex items-center gap-4 text-sm">\n    <span>Docs</span>\n    <div class="h-4 w-px bg-border" role="separator" aria-orientation="vertical"></div>\n    <span>Source</span>\n  </div>\n</div>`,
      composition_rules: 'Separators provide visual division between elements. Declare role="separator" and aria-orientation="vertical" when dividing horizontally.',
    },
  },
  {
    metadata: {
      id: 'sheet',
      name: 'Sheet',
      intent: 'Slide-over secondary panel anchored to viewport edge',
      categories: ['overlay'],
      keywords: ['slide-over', 'side-panel', 'drawer-side', 'off-canvas'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<button type="button" class="btn" data-variant="outline" data-open-sheet="sheet-demo">Open sheet</button>\n<dialog id="sheet-demo" class="fixed inset-y-0 right-0 z-50 m-0 h-full w-80 bg-background p-6 shadow-xl" aria-labelledby="sheet-title">\n  <div class="flex flex-col gap-4">\n    <header class="flex items-center justify-between">\n      <h2 id="sheet-title" class="text-lg font-semibold">Sheet Panel</h2>\n      <form method="dialog"><button class="btn" data-variant="outline" value="cancel">Close</button></form>\n    </header>\n    <p class="text-sm text-muted-foreground">Panel content goes here.</p>\n  </div>\n</dialog>`,
      composition_rules: 'Native dialog provides modal focus trap and escape handling for off-canvas side sheets. Use fixed edge anchoring.',
      native_script: `document.addEventListener('click', (e) => {\n  if (!(e.target instanceof Element)) return;\n  const id = e.target.closest('[data-open-sheet]')?.getAttribute('data-open-sheet');\n  const d = id && document.getElementById(id);\n  if (d instanceof HTMLDialogElement) d.showModal();\n});`,
    },
  },
  {
    metadata: {
      id: 'sonner',
      name: 'Sonner',
      intent: 'Show modern stacked feedback notifications and action alerts',
      categories: ['feedback'],
      keywords: ['stack-toast', 'snackbar', 'notification-feed'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="flex flex-col gap-2 w-full max-w-sm" role="region" aria-label="Notifications">\n  <div class="flex items-center justify-between gap-4 rounded-lg border border-border bg-background p-4 shadow-lg text-sm" role="status">\n    <div class="space-y-2">\n      <p class="font-medium">Event created</p>\n      <p class="text-xs text-muted-foreground">Monday, February 16, 2026 at 9:00 AM</p>\n    </div>\n    <button type="button" class="btn" data-variant="outline" data-size="sm">Undo</button>\n  </div>\n</div>`,
      composition_rules: 'Render toast notifications inside an accessible status region. Include concise message and optional single action.',
    },
  },
  {
    metadata: {
      id: 'spinner',
      name: 'Spinner',
      intent: 'Display animated circular loading indicator',
      categories: ['feedback'],
      keywords: ['loader', 'busy', 'throbber', 'activity'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="flex items-center gap-2" role="status" aria-label="Loading">\n  <svg class="size-4 animate-spin text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">\n    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>\n  </svg>\n  <span class="text-sm text-muted-foreground">Loading...</span>\n</div>`,
      composition_rules: 'Provide role="status" and visible or screen-reader text alongside the animated spinner SVG for accessibility.',
    },
  },
  {
    metadata: {
      id: 'toggle',
      name: 'Toggle',
      intent: 'Single pressable button that switches between on and off states',
      categories: ['input-controls'],
      keywords: ['toggle-button', 'pressed', 'state-button', 'binary-button'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<button type="button" class="btn" data-variant="outline" data-size="icon" aria-pressed="false" aria-label="Toggle italic">\n  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/></svg>\n</button>`,
      composition_rules: 'Two-state toggle button must reflect state with aria-pressed. Provide accessible aria-label on icon-only toggles.',
      native_script: `document.addEventListener('click', (e) => {\n  const btn = (e.target instanceof Element) ? e.target.closest('[aria-pressed]') : null;\n  if (btn) btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');\n});`,
    },
  },
  {
    metadata: {
      id: 'toggle-group',
      name: 'Toggle Group',
      intent: 'Group of coordinated toggle buttons for formatting or option choices',
      categories: ['input-controls'],
      keywords: ['toolbar-buttons', 'segmented-buttons', 'button-toggles'],
    },
    details: {
      dependencies: { css: ['basecoat-css/base'], js: [] },
      markup_template: `<div class="flex items-center gap-2 rounded-md border border-border p-2" role="group" aria-label="Text styles">\n  <button type="button" class="btn" data-variant="ghost" aria-pressed="true">Bold</button>\n  <button type="button" class="btn" data-variant="ghost" aria-pressed="false">Italic</button>\n  <button type="button" class="btn" data-variant="ghost" aria-pressed="false">Underline</button>\n</div>`,
      composition_rules: 'Group toggle buttons inside role="group" container with aria-label. Maintain individual aria-pressed state on buttons.',
      native_script: `document.addEventListener('click', (e) => {\n  const btn = (e.target instanceof Element) ? e.target.closest('[role="group"] [aria-pressed]') : null;\n  if (btn) btn.setAttribute('aria-pressed', btn.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');\n});`,
    },
  },
];

export async function buildComponentsRegistry() {
  const currentRaw = await readFile(REGISTRY_PATH, 'utf8');
  const current = JSON.parse(currentRaw);

  const existingIds = new Set(NEW_COMPONENTS.map(c => c.metadata.id));
  const preservedIndex = current.index.filter(item => !existingIds.has(item.id));
  const preservedDetails = Object.fromEntries(
    Object.entries(current.details).filter(([id]) => !existingIds.has(id))
  );

  const combinedIndex = [...preservedIndex, ...NEW_COMPONENTS.map(c => c.metadata)]
    .sort((a, b) => a.id.localeCompare(b.id));

  const unsortedDetails = {
    ...preservedDetails,
    ...Object.fromEntries(NEW_COMPONENTS.map(c => [c.metadata.id, c.details])),
  };

  const sortedDetails = {};
  for (const item of combinedIndex) {
    sortedDetails[item.id] = unsortedDetails[item.id];
  }

  const nextRegistry = {
    schema_version: current.schema_version,
    upstream: current.upstream,
    index: combinedIndex,
    details: sortedDetails,
  };

  registrySchema.parse(nextRegistry);

  const serialized = JSON.stringify(nextRegistry, null, 2) + '\n';
  await writeFile(REGISTRY_PATH, serialized, 'utf8');
  console.log(`Successfully built registry with ${combinedIndex.length} components.`);
  return nextRegistry;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await buildComponentsRegistry();
}
