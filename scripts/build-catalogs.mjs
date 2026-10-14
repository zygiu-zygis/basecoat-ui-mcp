// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Deterministic generator for Basecoat UI Component Stacks and Charts Catalogs.
// Generates:
// 1. src/data/catalog/component-stacks.json (41 modular dashboard stacks across 7 categories)
// 2. src/data/catalog/charts-catalog.json (56 chart variants across 7 categories with 5 framework mounts)

import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const CATALOG_DIR = join(ROOT, 'src', 'data', 'catalog');

// Common SVG icons (Lucide-compatible, purely semantic SVG)
const ICONS = {
  chevronDown: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
  chevronRight: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>',
  dashboard: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>',
  folder: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>',
  file: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg>',
  search: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>',
  settings: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  user: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 1 0-16 0"/></svg>',
  bell: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>',
  moreVertical: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>',
  moreHorizontal: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  plus: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="M12 5v14"/></svg>',
  filter: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/></svg>',
  calendar: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>',
  download: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>',
  check: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>',
  x: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" x2="6" y1="6" y2="18"/><line x1="6" x2="18" y1="6" y2="18"/></svg>',
  trash: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>',
  alertTriangle: '<svg class="size-4 shrink-0 text-amber-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" x2="12" y1="9" y2="13"/><line x1="12" x2="12.01" y1="17" y2="17"/></svg>',
  panelLeft: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M9 3v18"/></svg>',
  inbox: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
  creditCard: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>',
  activity: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
  sparkles: '<svg class="size-4 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>'
};

// Generates explicit slot placeholders inside shell stacks adhering to Basecoat v1 data attributes and contrast rules
function createShellSlots() {
  return `
    <header class="flex h-14 items-center justify-between border-b border-border bg-background px-6" data-slot="header">
      <div class="flex items-center gap-3">
        <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" aria-label="Toggle Navigation">${ICONS.panelLeft}</button>
        <nav aria-label="Breadcrumb" class="breadcrumb text-sm text-muted-foreground flex items-center gap-2">
          <span>Workspace</span>
          <span class="opacity-40">/</span>
          <span class="font-medium text-foreground">Dashboard</span>
        </nav>
      </div>
      <div class="flex items-center gap-2">
        <button type="button" class="btn text-muted-foreground" data-variant="outline" data-size="sm">${ICONS.search}<span>Search...</span><kbd class="kbd text-[10px] px-1 py-0.5">⌘K</kbd></button>
        <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" aria-label="Notifications">${ICONS.bell}</button>
        <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">JD</div>
      </div>
    </header>
    <main class="flex-1 overflow-y-auto p-6 flex flex-col gap-6" data-slot="main-content">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-slot="metrics">
        <div class="card p-6 flex flex-col gap-2">
          <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</span>
          <strong class="text-2xl font-semibold tabular-nums">$45,231.89</strong>
          <span class="text-xs text-emerald-600 font-medium tabular-nums">+20.1% from last month</span>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2" data-slot="charts">
        <div class="card p-6 flex flex-col gap-4">
          <h3 class="text-base font-semibold">Overview</h3>
          <div class="h-48 w-full rounded bg-muted/20 flex items-center justify-center text-xs text-foreground">Chart Area</div>
        </div>
      </div>
      <div class="flex flex-col gap-4" data-slot="table">
        <div class="card p-6 flex flex-col gap-4">
          <h3 class="text-base font-semibold">Recent Transactions</h3>
          <div class="overflow-x-auto">
            <table class="table w-full text-sm">
              <thead>
                <tr>
                  <th class="text-left font-medium text-muted-foreground">Customer</th>
                  <th class="text-left font-medium text-muted-foreground">Status</th>
                  <th class="text-right font-medium text-muted-foreground">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Olivia Martin</td>
                  <td><span class="badge" data-variant="secondary">Success</span></td>
                  <td class="text-right tabular-nums font-medium">$1,999.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      <div class="flex flex-col gap-4" data-slot="forms">
        <div class="card p-6 flex flex-col gap-4">
          <h3 class="text-base font-semibold">Quick Settings</h3>
          <div class="flex items-center justify-between">
            <span class="text-sm">Two-Factor Authentication</span>
            <button type="button" class="btn" data-variant="outline" data-size="sm">Configure</button>
          </div>
        </div>
      </div>
    </main>
    <div data-slot="overlays"></div>
  `;
}

// ---------------------------------------------------------------------------
// 1. COMPONENT STACKS CATALOG GENERATION
// ---------------------------------------------------------------------------

export function generateComponentStacks() {
  const stacks = [];

  // 1.1 Shell Stacks (19 stacks)
  // sidebar-01 through sidebar-16 + topbar-shell + inset-shell + split-shell

  // sidebar-01: Grouped details
  stacks.push({
    id: 'sidebar-01',
    category: 'shell-stacks',
    name: 'Grouped Details Sidebar Shell',
    description: 'Dashboard shell featuring collapsible navigation groups implemented with HTML details and summary elements for accordion-style sections.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-side', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">A</div>
        <span>Acme Corp</span>
      </div>
      <div class="flex flex-col gap-2">
        <details class="accordion group" open>
          <summary class="flex items-center justify-between cursor-pointer px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider rounded-md hover:bg-muted/50">
            <span>Platform</span>
            <span class="transition-transform group-open:rotate-180">${ICONS.chevronDown}</span>
          </summary>
          <nav class="flex flex-col gap-1 mt-1">
            <a class="btn justify-start gap-2 bg-muted font-medium text-foreground" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Overview</span></a>
            <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.activity}<span>Analytics</span></a>
            <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.inbox}<span>Inbox</span></a>
          </nav>
        </details>
        <details class="accordion group" open>
          <summary class="flex items-center justify-between cursor-pointer px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider rounded-md hover:bg-muted/50">
            <span>Projects</span>
            <span class="transition-transform group-open:rotate-180">${ICONS.chevronDown}</span>
          </summary>
          <nav class="flex flex-col gap-1 mt-1">
            <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.folder}<span>Basecoat UI</span></a>
            <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.folder}<span>Design Tokens</span></a>
          </nav>
        </details>
      </div>
    </div>
    <div class="border-t border-border pt-4 flex items-center justify-between px-2">
      <div class="flex items-center gap-2">
        <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">JD</div>
        <div class="flex flex-col text-xs"><span class="font-medium">Jane Doe</span><span class="text-muted-foreground">jane@acme.com</span></div>
      </div>
      <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Settings">${ICONS.settings}</button>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-02: Collapsible header switcher
  stacks.push({
    id: 'sidebar-02',
    category: 'shell-stacks',
    name: 'Header Workspace Switcher Sidebar Shell',
    description: 'Application shell featuring a persistent workspace switcher dropdown in the sidebar header with team selection and organization status.',
    slotTarget: 'shell',
    components: ['sidebar', 'dropdown-menu', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-side', 'data-state', 'aria-haspopup', 'aria-expanded'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar', 'basecoat-css/dropdown-menu'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="dropdown-menu relative" data-state="closed" data-slot="workspace-switcher">
        <button type="button" class="btn justify-between w-full h-11 px-3" data-variant="outline" aria-haspopup="menu" aria-expanded="false">
          <div class="flex items-center gap-2">
            <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">E</div>
            <div class="flex flex-col text-left"><span class="text-xs font-semibold leading-tight">Enterprise Corp</span><span class="text-[10px] text-muted-foreground leading-tight">Pro Plan</span></div>
          </div>
          ${ICONS.chevronDown}
        </button>
      </div>
      <nav class="flex flex-col gap-1">
        <a class="btn justify-start gap-2 bg-muted font-medium text-foreground" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Dashboard</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.activity}<span>Metrics</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.creditCard}<span>Billing</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.settings}<span>Settings</span></a>
      </nav>
    </div>
    <div class="border-t border-border pt-4 flex items-center justify-between px-2">
      <div class="flex items-center gap-2">
        <div class="size-8 rounded-full bg-muted flex items-center justify-center text-xs font-semibold">EC</div>
        <span class="text-xs font-medium">Enterprise Admin</span>
      </div>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-03: Nested submenus
  stacks.push({
    id: 'sidebar-03',
    category: 'shell-stacks',
    name: 'Nested Submenus Sidebar Shell',
    description: 'Dashboard shell with multi-level hierarchical navigation submenus with indented child links and toggle chevrons.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-side', 'data-state', 'aria-expanded'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">N</div>
        <span>Nexus Hub</span>
      </div>
      <nav class="flex flex-col gap-1">
        <a class="btn justify-start gap-2 text-foreground font-medium" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Overview</span></a>
        <div class="flex flex-col gap-1">
          <button type="button" class="btn w-full justify-between font-medium" data-variant="ghost" data-size="sm" aria-expanded="true">
            <span class="flex items-center gap-2">${ICONS.settings}<span>Settings</span></span>
            ${ICONS.chevronDown}
          </button>
          <div class="ps-6 flex flex-col gap-1 border-s border-border ml-4 mt-0.5">
            <a class="btn justify-start text-xs text-foreground bg-muted/60" data-variant="ghost" data-size="sm">General</a>
            <a class="btn justify-start text-xs text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">Security</a>
            <a class="btn justify-start text-xs text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">Notifications</a>
            <a class="btn justify-start text-xs text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">API Keys</a>
          </div>
        </div>
      </nav>
    </div>
    <div class="border-t border-border pt-4 px-2">
      <a class="btn w-full justify-start gap-2 text-muted-foreground" data-variant="ghost" data-size="sm">${ICONS.user}<span>Account</span></a>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-04: data-variant="floating"
  stacks.push({
    id: 'sidebar-04',
    category: 'shell-stacks',
    name: 'Floating Card Sidebar Shell',
    description: 'Application shell with a floating sidebar container detached from viewport borders, styled with rounded corners and elevated shadow.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-variant', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-muted/30 p-3 text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 rounded-xl border border-border bg-background p-4 shadow-sm flex flex-col justify-between shrink-0" data-variant="floating" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">F</div>
        <span>Float Console</span>
      </div>
      <nav class="flex flex-col gap-1">
        <a class="btn justify-start gap-2 bg-muted text-foreground font-medium" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Dashboard</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.activity}<span>Reports</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.folder}<span>Documents</span></a>
      </nav>
    </div>
    <div class="border-t border-border pt-4 px-2 flex items-center gap-2">
      <div class="size-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-semibold">U</div>
      <span class="text-xs font-medium">User Profile</span>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden ms-3 rounded-xl border border-border bg-background shadow-sm">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-05: Submenu trees
  stacks.push({
    id: 'sidebar-05',
    category: 'shell-stacks',
    name: 'Submenu Trees Sidebar Shell',
    description: 'Application shell with deep tree-style navigation featuring connector guide lines, expandable folder nodes, and child item leaves.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-side', 'data-state', 'aria-expanded'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">T</div>
        <span>Tree Workspace</span>
      </div>
      <nav class="flex flex-col gap-1 text-sm">
        <div class="flex flex-col gap-1">
          <div class="flex items-center gap-2 px-2 py-1.5 font-medium text-foreground cursor-pointer hover:bg-muted/50 rounded-md">
            ${ICONS.folder}<span>Design System</span>
          </div>
          <div class="ps-6 flex flex-col gap-1 border-s border-border ml-4">
            <a class="btn justify-start text-xs text-foreground bg-muted" data-variant="ghost" data-size="sm">${ICONS.file}<span>Tokens</span></a>
            <a class="btn justify-start text-xs text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.file}<span>Components</span></a>
            <a class="btn justify-start text-xs text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.file}<span>Typography</span></a>
          </div>
        </div>
      </nav>
    </div>
    <div class="border-t border-border pt-4 px-2">
      <span class="text-xs text-muted-foreground">Basecoat v1.0.2</span>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-06: Dropdown submenus
  stacks.push({
    id: 'sidebar-06',
    category: 'shell-stacks',
    name: 'Dropdown Action Submenus Sidebar Shell',
    description: 'Sidebar navigation where each primary nav item includes an action button triggering a floating dropdown menu.',
    slotTarget: 'shell',
    components: ['sidebar', 'dropdown-menu', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-side', 'data-state', 'aria-haspopup', 'aria-expanded'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar', 'basecoat-css/dropdown-menu'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">A</div>
        <span>Action Nav</span>
      </div>
      <nav class="flex flex-col gap-1">
        <div class="group flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted/60 bg-muted">
          <a class="flex items-center gap-2 text-sm font-medium text-foreground">${ICONS.dashboard}<span>Dashboard</span></a>
          <div class="dropdown-menu relative" data-state="closed">
            <button type="button" class="btn opacity-70 group-hover:opacity-100" data-variant="ghost" data-size="icon-xs" aria-haspopup="menu" aria-expanded="false">${ICONS.moreHorizontal}</button>
          </div>
        </div>
        <div class="group flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted/60">
          <a class="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground">${ICONS.folder}<span>Projects</span></a>
          <div class="dropdown-menu relative" data-state="closed">
            <button type="button" class="btn opacity-0 group-hover:opacity-100" data-variant="ghost" data-size="icon-xs" aria-haspopup="menu" aria-expanded="false">${ICONS.moreHorizontal}</button>
          </div>
        </div>
      </nav>
    </div>
    <div class="border-t border-border pt-4 px-2">
      <button type="button" class="btn w-full gap-2" data-variant="outline" data-size="sm">${ICONS.plus}<span>New Project</span></button>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-07: data-collapsible="icon"
  stacks.push({
    id: 'sidebar-07',
    category: 'shell-stacks',
    name: 'Collapsible Icon Rail Sidebar Shell',
    description: 'Responsive sidebar shell that collapses into a slim 4rem icon-only rail with tooltip indicators when collapsed.',
    slotTarget: 'shell',
    components: ['sidebar', 'tooltip', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-collapsible', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar group/sidebar w-16 border-e border-border bg-background p-2 flex flex-col justify-between shrink-0 transition-all duration-300" data-collapsible="icon" data-state="collapsed" data-fsm-recipe="navigation" data-fsm-state="collapsed" data-component="sidebar">
    <div class="flex flex-col items-center gap-4">
      <div class="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">C</div>
      <nav class="flex flex-col items-center gap-2">
        <a class="btn bg-muted" data-variant="ghost" data-size="icon-sm" aria-label="Dashboard">${ICONS.dashboard}</a>
        <a class="btn text-muted-foreground" data-variant="ghost" data-size="icon-sm" aria-label="Analytics">${ICONS.activity}</a>
        <a class="btn text-muted-foreground" data-variant="ghost" data-size="icon-sm" aria-label="Inbox">${ICONS.inbox}</a>
      </nav>
    </div>
    <div class="flex flex-col items-center gap-2 border-t border-border pt-3">
      <a class="btn text-muted-foreground" data-variant="ghost" data-size="icon-sm" aria-label="Settings">${ICONS.settings}</a>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-08: data-variant="inset"
  stacks.push({
    id: 'sidebar-08',
    category: 'shell-stacks',
    name: 'Inset Canvas Sidebar Shell',
    description: 'Application shell where the main workspace canvas is inset within the viewport frame with rounded borders and background contrast.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-variant', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-muted/40 text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 bg-transparent p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">I</div>
        <span>Inset Console</span>
      </div>
      <nav class="flex flex-col gap-1">
        <a class="btn justify-start gap-2 bg-background shadow-xs text-foreground font-medium" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Overview</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.activity}<span>Reports</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.creditCard}<span>Transactions</span></a>
      </nav>
    </div>
    <div class="border-t border-border/40 pt-4 px-2">
      <span class="text-xs text-muted-foreground">Connected to Production</span>
    </div>
  </aside>
  <div class="flex flex-1 flex-col my-3 me-3 rounded-xl border border-border bg-background shadow-sm overflow-hidden" data-variant="inset">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-09: Dual nested rail+list
  stacks.push({
    id: 'sidebar-09',
    category: 'shell-stacks',
    name: 'Dual Nested Rail and List Sidebar Shell',
    description: 'Dual-column navigation shell featuring a primary compact icon rail paired with a secondary expandable list panel (Mail/Chat style).',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'badge', 'avatar', 'breadcrumb', 'card', 'table'],
    fsmContracts: ['data-component', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="w-16 border-e border-border bg-muted/30 p-2 flex flex-col items-center justify-between shrink-0" data-slot="primary-rail">
    <div class="flex flex-col items-center gap-3">
      <div class="size-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">D</div>
      <nav class="flex flex-col items-center gap-2">
        <a class="btn bg-background shadow-xs text-primary" data-variant="ghost" data-size="icon-sm">${ICONS.inbox}</a>
        <a class="btn text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="icon-sm">${ICONS.folder}</a>
        <a class="btn text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="icon-sm">${ICONS.activity}</a>
      </nav>
    </div>
    <div class="flex flex-col items-center gap-2">
      <a class="btn text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="icon-sm">${ICONS.settings}</a>
    </div>
  </aside>
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-slot="secondary-panel" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <h3 class="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Folders</h3>
      <nav class="flex flex-col gap-1">
        <a class="btn justify-between bg-muted text-foreground font-medium" data-variant="ghost" data-size="sm"><span>Inbox</span><span class="badge tabular-nums" data-variant="secondary">12</span></a>
        <a class="btn justify-between text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm"><span>Sent</span><span class="badge tabular-nums" data-variant="outline">48</span></a>
        <a class="btn justify-between text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm"><span>Drafts</span><span class="badge tabular-nums" data-variant="outline">3</span></a>
      </nav>
    </div>
    <div class="border-t border-border pt-4 px-2">
      <span class="text-xs text-muted-foreground">Storage: 4.2 GB of 15 GB</span>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-10: Popover sidebar
  stacks.push({
    id: 'sidebar-10',
    category: 'shell-stacks',
    name: 'Floating Popover Drawer Sidebar Shell',
    description: 'Application shell with a floating modal-like popover sidebar drawer that overlays the workspace with backdrop blur.',
    slotTarget: 'shell',
    components: ['sidebar', 'drawer', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['data-component', 'data-variant', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar', 'basecoat-css/drawer'] },
    html: `<div class="relative flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <div class="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity hidden md:hidden" data-slot="sidebar-backdrop"></div>
  <aside class="sidebar fixed inset-y-2 left-2 z-50 w-72 rounded-2xl border border-border bg-background p-4 shadow-2xl flex flex-col justify-between shrink-0" data-variant="popover" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between px-2">
        <div class="flex items-center gap-2 font-semibold">
          <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">P</div>
          <span>Popover Hub</span>
        </div>
        <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Close">${ICONS.x}</button>
      </div>
      <nav class="flex flex-col gap-1">
        <a class="btn justify-start gap-2 bg-muted text-foreground font-medium" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Dashboard</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.folder}<span>Files</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.activity}<span>Insights</span></a>
      </nav>
    </div>
    <div class="border-t border-border pt-4 px-2">
      <span class="text-xs text-muted-foreground">Temporary Modal Shell</span>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden md:ps-80">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-11: role="tree" file tree
  stacks.push({
    id: 'sidebar-11',
    category: 'shell-stacks',
    name: 'File Explorer Tree Sidebar Shell',
    description: 'Developer workspace shell with an accessible file tree navigation implementing role=tree and role=treeitem with expand/collapse states.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'breadcrumb', 'card', 'table', 'badge'],
    fsmContracts: ['role', 'aria-expanded', 'aria-selected', 'data-component', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between px-2 font-semibold text-sm">
        <span>EXPLORER</span>
        <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="New File">${ICONS.plus}</button>
      </div>
      <div role="tree" aria-label="File tree navigation" class="flex flex-col gap-1 text-xs">
        <div role="treeitem" aria-expanded="true" class="flex flex-col gap-0.5">
          <div class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted cursor-pointer font-medium">
            ${ICONS.chevronDown}${ICONS.folder}<span>src</span>
          </div>
          <div role="group" class="ps-5 flex flex-col gap-0.5 border-s border-border ml-3 mt-0.5">
            <div role="treeitem" aria-selected="true" class="flex items-center gap-2 px-2 py-1 rounded-md bg-muted text-foreground cursor-pointer">
              ${ICONS.file}<span>index.ts</span>
            </div>
            <div role="treeitem" aria-selected="false" class="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-muted text-muted-foreground cursor-pointer">
              ${ICONS.file}<span>catalog.json</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="border-t border-border pt-4 px-2">
      <span class="text-xs text-muted-foreground">Git: main*</span>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-12: Calendar sidebar
  stacks.push({
    id: 'sidebar-12',
    category: 'shell-stacks',
    name: 'Mini Calendar Embedded Sidebar Shell',
    description: 'Productivity shell integrating an interactive mini month calendar grid and upcoming appointment list directly inside the sidebar.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'badge', 'avatar', 'breadcrumb', 'card', 'table'],
    fsmContracts: ['data-component', 'data-state', 'aria-selected'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-64 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-side="left" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">C</div>
        <span>Calendar Hub</span>
      </div>
      <div class="rounded-lg border border-border bg-muted/20 p-3 flex flex-col gap-2">
        <div class="flex items-center justify-between text-xs font-semibold">
          <span>October 2026</span>
          <div class="flex gap-1">
            <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Previous Month">‹</button>
            <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Next Month">›</button>
          </div>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-[10px] text-muted-foreground">
          <span>Su</span><span>Mo</span><span>Tu</span><span>We</span><span>Th</span><span>Fr</span><span>Sa</span>
        </div>
        <div class="grid grid-cols-7 gap-1 text-center text-xs">
          <span class="p-1 text-muted-foreground/40">28</span><span class="p-1 text-muted-foreground/40">29</span><span class="p-1 text-muted-foreground/40">30</span>
          <span class="p-1">1</span><span class="p-1">2</span><span class="p-1">3</span><span class="p-1">4</span>
          <span class="p-1">5</span><span class="p-1">6</span><span class="p-1">7</span><span class="p-1">8</span><span class="p-1">9</span><span class="p-1">10</span><span class="p-1">11</span>
          <span class="p-1">12</span><span class="p-1">13</span><span class="rounded bg-primary text-primary-foreground font-semibold p-1">14</span><span class="p-1">15</span><span class="p-1">16</span><span class="p-1">17</span><span class="p-1">18</span>
        </div>
      </div>
      <div class="flex flex-col gap-2">
        <span class="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2">Upcoming</span>
        <div class="flex flex-col gap-1 text-xs">
          <div class="rounded-md border border-border p-2 flex flex-col gap-0.5">
            <span class="font-medium">Sprint Review</span>
            <span class="text-[10px] text-muted-foreground tabular-nums">Today, 2:00 PM</span>
          </div>
        </div>
      </div>
    </div>
    <div class="border-t border-border pt-4 px-2">
      <button type="button" class="btn w-full gap-2" data-variant="primary" data-size="sm">${ICONS.plus}<span>New Event</span></button>
    </div>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-13: Dialog settings sidebar
  stacks.push({
    id: 'sidebar-13',
    category: 'shell-stacks',
    name: 'Dialog Settings Modal Two-Column Shell',
    description: 'Settings management modal layout featuring a dedicated category sidebar on the left and settings form panel on the right.',
    slotTarget: 'shell',
    components: ['dialog', 'sidebar', 'button', 'card', 'input', 'badge', 'table'],
    fsmContracts: ['data-component', 'data-state', 'aria-labelledby'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="relative flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <dialog class="dialog fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-state="open" data-component="dialog" aria-labelledby="settings-dialog-title">
    <div class="flex h-[560px] w-full max-w-4xl overflow-hidden rounded-xl bg-background shadow-2xl border border-border">
      <aside class="w-60 border-e border-border bg-muted/20 p-4 flex flex-col justify-between shrink-0" data-slot="dialog-sidebar">
        <div class="flex flex-col gap-4">
          <h2 id="settings-dialog-title" class="text-base font-semibold px-2">Settings</h2>
          <nav class="flex flex-col gap-1">
            <a class="btn justify-start bg-muted text-foreground font-medium" data-variant="ghost" data-size="sm">General</a>
            <a class="btn justify-start text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">Billing</a>
            <a class="btn justify-start text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">Members</a>
            <a class="btn justify-start text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">Integrations</a>
          </nav>
        </div>
        <button type="button" class="btn" data-variant="outline" data-size="sm">Close Modal</button>
      </aside>
      <div class="flex-1 p-6 overflow-y-auto flex flex-col gap-6">
        <h3 class="text-lg font-semibold">General Preferences</h3>
        <div class="flex flex-col gap-4">
          <div class="flex flex-col gap-1.5">
            <label class="label font-medium text-sm">Organization Name</label>
            <input type="text" class="input" value="Acme Enterprise">
          </div>
        </div>
      </div>
    </div>
  </dialog>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
</div>`
  });

  // sidebar-14: data-side="right" sidebar
  stacks.push({
    id: 'sidebar-14',
    category: 'shell-stacks',
    name: 'Right Context Inspector Sidebar Shell',
    description: 'Application shell featuring a secondary right-docked inspector sidebar for contextual properties, audit notes, and live feeds.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'badge', 'breadcrumb', 'card', 'table'],
    fsmContracts: ['data-component', 'data-side', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
  <aside class="sidebar w-72 border-s border-border bg-background p-4 flex flex-col justify-between shrink-0" data-side="right" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center justify-between border-b border-border pb-3">
        <h3 class="text-sm font-semibold">Properties</h3>
        <span class="badge" data-variant="secondary">Active</span>
      </div>
      <div class="flex flex-col gap-3 text-xs">
        <div class="flex justify-between"><span class="text-muted-foreground">ID:</span><span class="font-mono">rec_9872</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">Updated:</span><span class="tabular-nums">2 min ago</span></div>
        <div class="flex justify-between"><span class="text-muted-foreground">Region:</span><span>us-east-1</span></div>
      </div>
    </div>
    <div class="border-t border-border pt-4">
      <button type="button" class="btn w-full" data-variant="outline" data-size="sm">Export Metadata</button>
    </div>
  </aside>
</div>`
  });

  // sidebar-15: Dual left+right sidebars
  stacks.push({
    id: 'sidebar-15',
    category: 'shell-stacks',
    name: 'Dual Navigation and Inspector Sidebars Shell',
    description: 'Comprehensive 3-column enterprise shell with primary navigation sidebar on the left, central canvas, and inspector on the right.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'badge', 'breadcrumb', 'card', 'table'],
    fsmContracts: ['data-component', 'data-side', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="sidebar-shell">
  <aside class="sidebar w-60 border-e border-border bg-background p-4 flex flex-col justify-between shrink-0" data-side="left" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <div class="flex items-center gap-2 px-2 py-1 font-semibold text-base">
        <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">M</div>
        <span>Main Console</span>
      </div>
      <nav class="flex flex-col gap-1">
        <a class="btn justify-start gap-2 bg-muted text-foreground font-medium" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Dashboard</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.activity}<span>Reports</span></a>
      </nav>
    </div>
    <span class="text-xs text-muted-foreground">Navigation</span>
  </aside>
  <div class="flex flex-1 flex-col overflow-hidden">
    ${createShellSlots()}
  </div>
  <aside class="sidebar w-64 border-s border-border bg-background p-4 flex flex-col justify-between shrink-0" data-side="right" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col gap-4">
      <h3 class="text-sm font-semibold border-b border-border pb-2">Context Inspector</h3>
      <div class="flex flex-col gap-2 text-xs">
        <div class="rounded-md border border-border p-2">
          <span class="font-medium text-foreground">Cluster Health</span>
          <p class="text-[11px] text-muted-foreground mt-0.5">All 12 nodes reporting nominal latency.</p>
        </div>
      </div>
    </div>
    <button type="button" class="btn w-full" data-variant="outline" data-size="sm">Inspect Logs</button>
  </aside>
</div>`
  });

  // sidebar-16: Sticky header + sidebar
  stacks.push({
    id: 'sidebar-16',
    category: 'shell-stacks',
    name: 'Full-Width Sticky Header and Sidebar Shell',
    description: 'Application shell with a continuous full-width sticky header spanning across the entire top, with sticky sidebar docked underneath.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'badge', 'breadcrumb', 'card', 'table'],
    fsmContracts: ['data-component', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full flex-col bg-background text-foreground" data-component="sidebar-shell">
  <header class="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border bg-background/95 px-6 backdrop-blur-sm" data-slot="header">
    <div class="flex items-center gap-3">
      <div class="size-6 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">S</div>
      <span class="font-semibold text-base">Sticky Header Suite</span>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="btn" data-variant="outline" data-size="sm">Support</button>
      <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">U</div>
    </div>
  </header>
  <div class="flex flex-1 overflow-hidden">
    <aside class="sidebar sticky top-14 h-[calc(100vh-3.5rem)] w-64 border-e border-border p-4 flex flex-col justify-between shrink-0" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
      <nav class="flex flex-col gap-1">
        <a class="btn justify-start gap-2 bg-muted text-foreground font-medium" data-variant="ghost" data-size="sm">${ICONS.dashboard}<span>Home</span></a>
        <a class="btn justify-start gap-2 text-muted-foreground hover:text-foreground" data-variant="ghost" data-size="sm">${ICONS.folder}<span>Files</span></a>
      </nav>
      <span class="text-xs text-muted-foreground">v1.7.1</span>
    </aside>
    <main class="flex-1 overflow-y-auto p-6 flex flex-col gap-6" data-slot="main-content">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-slot="metrics">
        <div class="card p-6 flex flex-col gap-2">
          <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Workflows</span>
          <strong class="text-2xl font-semibold tabular-nums">48</strong>
        </div>
      </div>
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-2" data-slot="charts">
        <div class="card p-6 flex flex-col gap-4">
          <h3 class="text-base font-semibold">Throughput</h3>
          <div class="h-40 w-full rounded bg-muted/20 flex items-center justify-center text-xs text-foreground">Chart</div>
        </div>
      </div>
      <div class="flex flex-col gap-4" data-slot="table">
        <div class="card p-6 flex flex-col gap-4">
          <h3 class="text-base font-semibold">Execution Log</h3>
          <div class="overflow-x-auto"><table class="table w-full text-sm"><thead><tr><th>ID</th><th class="text-right">Time</th></tr></thead><tbody><tr><td>#4091</td><td class="text-right tabular-nums">12ms</td></tr></tbody></table></div>
        </div>
      </div>
      <div class="flex flex-col gap-4" data-slot="forms">
        <div class="card p-6 flex flex-col gap-4">
          <h3 class="text-base font-semibold">Trigger Webhook</h3>
          <button type="button" class="btn w-36" data-variant="primary" data-size="sm">Dispatch</button>
        </div>
      </div>
    </main>
  </div>
  <div data-slot="overlays"></div>
</div>`
  });

  // topbar-shell
  stacks.push({
    id: 'topbar-shell',
    category: 'shell-stacks',
    name: 'Horizontal Topbar Navigation Shell',
    description: 'Clean horizontal navigation shell without sidebar, featuring brand logo, horizontal nav links, search bar, and user profile.',
    slotTarget: 'shell',
    components: ['button', 'avatar', 'badge', 'breadcrumb', 'card', 'table'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="flex min-h-screen w-full flex-col bg-background text-foreground" data-component="topbar-shell">
  <header class="flex h-16 w-full items-center justify-between border-b border-border bg-background px-8" data-slot="header">
    <div class="flex items-center gap-8">
      <div class="flex items-center gap-2 font-bold text-lg">
        <div class="size-7 rounded bg-primary text-primary-foreground flex items-center justify-center text-xs">T</div>
        <span>Topbar App</span>
      </div>
      <nav class="flex items-center gap-4 text-sm font-medium">
        <a class="text-foreground border-b-2 border-primary py-4">Dashboard</a>
        <a class="text-muted-foreground hover:text-foreground py-4">Projects</a>
        <a class="text-muted-foreground hover:text-foreground py-4">Analytics</a>
        <a class="text-muted-foreground hover:text-foreground py-4">Settings</a>
      </nav>
    </div>
    <div class="flex items-center gap-3">
      <button type="button" class="btn text-muted-foreground" data-variant="outline" data-size="sm">${ICONS.search}<span>Search</span><kbd class="kbd text-[10px]">⌘K</kbd></button>
      <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">U</div>
    </div>
  </header>
  <main class="flex-1 overflow-y-auto p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full" data-slot="main-content">
    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" data-slot="metrics">
      <div class="card p-6 flex flex-col gap-2">
        <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Sessions</span>
        <strong class="text-2xl font-semibold tabular-nums">1,420</strong>
      </div>
    </div>
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2" data-slot="charts">
      <div class="card p-6 flex flex-col gap-4">
        <h3 class="text-base font-semibold">User Activity</h3>
        <div class="h-44 w-full rounded bg-muted/20 flex items-center justify-center text-xs text-foreground">Chart</div>
      </div>
    </div>
    <div class="flex flex-col gap-4" data-slot="table">
      <div class="card p-6 flex flex-col gap-4">
        <h3 class="text-base font-semibold">Live Feed</h3>
        <div class="overflow-x-auto"><table class="table w-full text-sm"><thead><tr><th>User</th><th class="text-right">Latency</th></tr></thead><tbody><tr><td>Alex Kim</td><td class="text-right tabular-nums">42ms</td></tr></tbody></table></div>
      </div>
    </div>
    <div class="flex flex-col gap-4" data-slot="forms">
      <div class="card p-6 flex flex-col gap-4">
        <h3 class="text-base font-semibold">Preferences</h3>
        <button type="button" class="btn w-36" data-variant="outline" data-size="sm">Save</button>
      </div>
    </div>
  </main>
  <div data-slot="overlays"></div>
</div>`
  });

  // inset-shell
  stacks.push({
    id: 'inset-shell',
    category: 'shell-stacks',
    name: 'Responsive Inset Shell',
    description: 'Modern SaaS shell layout with a slim responsive navigation rail framing a floating elevated workspace canvas.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'badge', 'breadcrumb', 'card', 'table'],
    fsmContracts: ['data-component', 'data-variant', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/sidebar'] },
    html: `<div class="flex min-h-screen w-full bg-muted/50 p-3 text-foreground" data-component="inset-shell">
  <aside class="sidebar w-16 bg-transparent flex flex-col items-center justify-between py-4 shrink-0" data-component="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded">
    <div class="flex flex-col items-center gap-4">
      <div class="size-8 rounded bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs">R</div>
      <nav class="flex flex-col items-center gap-2">
        <a class="btn bg-background shadow-xs text-primary" data-variant="ghost" data-size="icon-sm">${ICONS.dashboard}</a>
        <a class="btn text-foreground" data-variant="ghost" data-size="icon-sm">${ICONS.activity}</a>
      </nav>
    </div>
    <a class="btn text-foreground" data-variant="ghost" data-size="icon-sm">${ICONS.settings}</a>
  </aside>
  <div class="flex flex-1 flex-col rounded-xl border border-border bg-background shadow-sm overflow-hidden" data-variant="inset">
    ${createShellSlots()}
  </div>
</div>`
  });

  // split-shell
  stacks.push({
    id: 'split-shell',
    category: 'shell-stacks',
    name: 'Split Master-Detail Workspace Shell',
    description: 'Split workspace layout with a master list pane for browsing items on the left and a detailed inspection panel on the right.',
    slotTarget: 'shell',
    components: ['sidebar', 'button', 'avatar', 'badge', 'breadcrumb', 'card', 'table', 'tabs'],
    fsmContracts: ['data-component', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/tabs'] },
    html: `<div class="flex min-h-screen w-full bg-background text-foreground" data-component="split-shell">
  <div class="flex w-80 flex-col border-e border-border shrink-0" data-slot="master-pane">
    <div class="flex h-14 items-center justify-between border-b border-border px-4">
      <h3 class="font-semibold text-sm">Customers</h3>
      <button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Add">${ICONS.plus}</button>
    </div>
    <div class="p-3 border-b border-border">
      <input type="search" class="input w-full text-xs" placeholder="Filter items...">
    </div>
    <div class="flex-1 overflow-y-auto divide-y divide-border">
      <div class="p-3 hover:bg-muted/50 cursor-pointer bg-muted/30">
        <div class="flex items-center justify-between"><strong class="text-sm font-semibold">Olivia Martin</strong><span class="text-xs text-foreground tabular-nums">Oct 12</span></div>
        <p class="text-xs text-foreground/80 mt-0.5 truncate">Subscription renewed for Enterprise plan.</p>
      </div>
      <div class="p-3 hover:bg-muted/50 cursor-pointer">
        <div class="flex items-center justify-between"><strong class="text-sm font-medium">Jackson Lee</strong><span class="text-xs text-foreground tabular-nums">Oct 11</span></div>
        <p class="text-xs text-foreground/80 mt-0.5 truncate">Requested license seat upgrade.</p>
      </div>
    </div>
  </div>
  <div class="flex flex-1 flex-col overflow-hidden" data-slot="detail-pane">
    ${createShellSlots()}
  </div>
</div>`
  });

  // -------------------------------------------------------------------------
  // 1.2 Header Stacks (3 stacks)
  // -------------------------------------------------------------------------

  stacks.push({
    id: 'breadcrumb-command-header',
    category: 'header-stacks',
    name: 'Breadcrumb and Command Header',
    description: 'Header stack featuring breadcrumb hierarchy path, quick search shortcut with kbd indicator, notification bell, and user avatar.',
    slotTarget: 'header',
    components: ['breadcrumb', 'button', 'kbd', 'avatar', 'badge'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<header class="flex h-14 w-full items-center justify-between border-b border-border bg-background px-6" data-slot="header">
  <div class="flex items-center gap-3">
    <nav aria-label="Breadcrumb" class="breadcrumb text-sm text-muted-foreground flex items-center gap-2">
      <a class="hover:text-foreground">Console</a>
      <span class="opacity-40">/</span>
      <a class="hover:text-foreground">Analytics</a>
      <span class="opacity-40">/</span>
      <span class="font-medium text-foreground">Revenue</span>
    </nav>
  </div>
  <div class="flex items-center gap-3">
    <button type="button" class="btn text-muted-foreground w-56 justify-between" data-variant="outline" data-size="sm">
      <span class="flex items-center gap-2">${ICONS.search}<span>Search records...</span></span>
      <kbd class="kbd text-[10px] px-1.5 py-0.5">⌘K</kbd>
    </button>
    <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" aria-label="Notifications">${ICONS.bell}</button>
    <div class="size-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-semibold text-xs">JM</div>
  </div>
</header>`
  });

  stacks.push({
    id: 'tabs-filter-header',
    category: 'header-stacks',
    name: 'Tabs and Filter Header',
    description: 'Interactive header stack with breadcrumb context, segmented tab switcher triggers, and faceted filter action buttons.',
    slotTarget: 'header',
    components: ['breadcrumb', 'tabs', 'button', 'badge'],
    fsmContracts: ['data-slot', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/tabs'] },
    html: `<header class="flex h-14 w-full items-center justify-between border-b border-border bg-background px-6" data-slot="header">
  <div class="flex items-center gap-6">
    <nav aria-label="Breadcrumb" class="breadcrumb text-sm text-muted-foreground flex items-center gap-2">
      <span>Dashboard</span>
      <span class="opacity-40">/</span>
      <span class="font-medium text-foreground">Transactions</span>
    </nav>
    <div class="tabs flex items-center gap-1 border-b-0" data-state="active">
      <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md bg-muted text-foreground" data-state="active">All Records</button>
      <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md text-foreground/80 hover:text-foreground" data-state="inactive">Completed</button>
      <button type="button" class="px-3 py-1.5 text-xs font-medium rounded-md text-foreground/80 hover:text-foreground" data-state="inactive">Pending</button>
    </div>
  </div>
  <div class="flex items-center gap-2">
    <button type="button" class="btn gap-1.5" data-variant="outline" data-size="sm">${ICONS.filter}<span>Filters</span><span class="badge tabular-nums" data-variant="secondary">2</span></button>
    <button type="button" class="btn gap-1.5" data-variant="primary" data-size="sm">${ICONS.plus}<span>Create</span></button>
  </div>
</header>`
  });

  stacks.push({
    id: 'date-range-export-header',
    category: 'header-stacks',
    name: 'Date Range and Export Header',
    description: 'Header stack equipped with calendar date-range selector button, active filter indicator badge, and primary export action.',
    slotTarget: 'header',
    components: ['breadcrumb', 'button', 'badge'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<header class="flex h-14 w-full items-center justify-between border-b border-border bg-background px-6" data-slot="header">
  <div class="flex items-center gap-3">
    <nav aria-label="Breadcrumb" class="breadcrumb text-sm text-muted-foreground flex items-center gap-2">
      <span>Finance</span>
      <span class="opacity-40">/</span>
      <span class="font-medium text-foreground">Ledger</span>
    </nav>
  </div>
  <div class="flex items-center gap-3">
    <button type="button" class="btn gap-2" data-variant="outline" data-size="sm">
      ${ICONS.calendar}
      <span class="tabular-nums">Oct 01, 2026 - Oct 14, 2026</span>
    </button>
    <span class="badge gap-1 font-medium" data-variant="outline">Status: Live</span>
    <button type="button" class="btn gap-1.5" data-variant="primary" data-size="sm">
      ${ICONS.download}
      <span>Export CSV</span>
    </button>
  </div>
</header>`
  });

  // -------------------------------------------------------------------------
  // 1.3 KPI Stacks (4 stacks)
  // -------------------------------------------------------------------------

  stacks.push({
    id: 'kpi-4-col-delta',
    category: 'kpi-stacks',
    name: '4-Column Delta KPI Metrics Grid',
    description: 'Responsive 4-column metric cards grid showing large tabular figures, status color deltas, and comparison descriptions.',
    slotTarget: 'metrics',
    components: ['card', 'badge'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full" data-slot="metrics">
  <div class="card p-6 flex flex-col gap-2">
    <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Revenue</span>
    <strong class="text-3xl font-semibold tabular-nums tracking-tight">$45,231.89</strong>
    <div class="flex items-center gap-2 text-xs">
      <span class="badge font-medium tabular-nums text-emerald-600" data-variant="secondary">+20.1%</span>
      <span class="text-muted-foreground">from last month</span>
    </div>
  </div>
  <div class="card p-6 flex flex-col gap-2">
    <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subscriptions</span>
    <strong class="text-3xl font-semibold tabular-nums tracking-tight">+2,350</strong>
    <div class="flex items-center gap-2 text-xs">
      <span class="badge font-medium tabular-nums text-emerald-600" data-variant="secondary">+180.1%</span>
      <span class="text-muted-foreground">from last month</span>
    </div>
  </div>
  <div class="card p-6 flex flex-col gap-2">
    <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Sales Volume</span>
    <strong class="text-3xl font-semibold tabular-nums tracking-tight">+12,234</strong>
    <div class="flex items-center gap-2 text-xs">
      <span class="badge font-medium tabular-nums text-emerald-600" data-variant="secondary">+19%</span>
      <span class="text-muted-foreground">from last month</span>
    </div>
  </div>
  <div class="card p-6 flex flex-col gap-2">
    <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Now</span>
    <strong class="text-3xl font-semibold tabular-nums tracking-tight">+573</strong>
    <div class="flex items-center gap-2 text-xs">
      <span class="badge font-medium tabular-nums text-emerald-600" data-variant="secondary">+201</span>
      <span class="text-muted-foreground">since last hour</span>
    </div>
  </div>
</div>`
  });

  stacks.push({
    id: 'kpi-sparkline-grid',
    category: 'kpi-stacks',
    name: 'Sparkline Trend KPI Metrics Grid',
    description: '4-column KPI metric cards featuring integrated inline SVG sparklines for rapid visual trend inspection.',
    slotTarget: 'metrics',
    components: ['card'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full" data-slot="metrics">
  <div class="card p-6 flex flex-col justify-between gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Daily Revenue</span>
      <strong class="text-2xl font-semibold tabular-nums">$8,640.00</strong>
    </div>
    <div class="h-8 w-full flex items-end">
      <svg class="h-8 w-full text-primary" viewBox="0 0 100 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="0,20 20,16 40,18 60,8 80,12 100,4" />
      </svg>
    </div>
  </div>
  <div class="card p-6 flex flex-col justify-between gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Conversion Rate</span>
      <strong class="text-2xl font-semibold tabular-nums">3.42%</strong>
    </div>
    <div class="h-8 w-full flex items-end">
      <svg class="h-8 w-full text-emerald-500" viewBox="0 0 100 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="0,18 20,20 40,14 60,16 80,8 100,6" />
      </svg>
    </div>
  </div>
  <div class="card p-6 flex flex-col justify-between gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Avg. Session</span>
      <strong class="text-2xl font-semibold tabular-nums">4m 32s</strong>
    </div>
    <div class="h-8 w-full flex items-end">
      <svg class="h-8 w-full text-primary" viewBox="0 0 100 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="0,12 20,14 40,10 60,18 80,8 100,10" />
      </svg>
    </div>
  </div>
  <div class="card p-6 flex flex-col justify-between gap-4">
    <div class="flex flex-col gap-1">
      <span class="text-xs font-medium uppercase tracking-wider text-muted-foreground">Bounce Rate</span>
      <strong class="text-2xl font-semibold tabular-nums">41.8%</strong>
    </div>
    <div class="h-8 w-full flex items-end">
      <svg class="h-8 w-full text-amber-500" viewBox="0 0 100 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <polyline points="0,6 20,10 40,8 60,14 80,18 100,20" />
      </svg>
    </div>
  </div>
</div>`
  });

  stacks.push({
    id: 'kpi-compact-strip',
    category: 'kpi-stacks',
    name: 'Compact Horizontal KPI Strip',
    description: 'High-density metric strip layout consolidating key performance indicators into a single horizontal panel with separators.',
    slotTarget: 'metrics',
    components: ['card', 'badge'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-4 flex flex-wrap items-center justify-between divide-y sm:divide-y-0 sm:divide-x divide-border w-full" data-slot="metrics">
  <div class="flex flex-col gap-0.5 px-4 py-2 sm:py-0">
    <span class="text-xs text-muted-foreground">Monthly MRR</span>
    <strong class="text-xl font-semibold tabular-nums">$94,200</strong>
    <span class="text-[11px] text-emerald-600 font-medium tabular-nums">+14.2%</span>
  </div>
  <div class="flex flex-col gap-0.5 px-4 py-2 sm:py-0">
    <span class="text-xs text-muted-foreground">Active Accounts</span>
    <strong class="text-xl font-semibold tabular-nums">1,890</strong>
    <span class="text-[11px] text-emerald-600 font-medium tabular-nums">+8.5%</span>
  </div>
  <div class="flex flex-col gap-0.5 px-4 py-2 sm:py-0">
    <span class="text-xs text-muted-foreground">Gross Churn</span>
    <strong class="text-xl font-semibold tabular-nums">1.12%</strong>
    <span class="text-[11px] text-emerald-600 font-medium tabular-nums">-0.3%</span>
  </div>
  <div class="flex flex-col gap-0.5 px-4 py-2 sm:py-0">
    <span class="text-xs text-muted-foreground">LTV Average</span>
    <strong class="text-xl font-semibold tabular-nums">$4,850</strong>
    <span class="text-[11px] text-emerald-600 font-medium tabular-nums">+$320</span>
  </div>
</div>`
  });

  stacks.push({
    id: 'kpi-progress-goals',
    category: 'kpi-stacks',
    name: 'Progress Goals KPI Metric Cards',
    description: 'Metric cards displaying numeric current vs target figures and semantic progress bar completion indicators.',
    slotTarget: 'metrics',
    components: ['card', 'progress'],
    fsmContracts: ['data-slot', 'role', 'aria-valuenow'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 w-full" data-slot="metrics">
  <div class="card p-6 flex flex-col gap-3">
    <div class="flex justify-between items-center text-xs">
      <span class="font-medium text-muted-foreground uppercase">Revenue Target</span>
      <span class="font-semibold tabular-nums text-foreground">84%</span>
    </div>
    <strong class="text-2xl font-semibold tabular-nums">$84,000 / $100,000</strong>
    <div class="progress h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow="84" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full bg-primary" style="width: 84%"></div>
    </div>
  </div>
  <div class="card p-6 flex flex-col gap-3">
    <div class="flex justify-between items-center text-xs">
      <span class="font-medium text-muted-foreground uppercase">User Signups</span>
      <span class="font-semibold tabular-nums text-foreground">92%</span>
    </div>
    <strong class="text-2xl font-semibold tabular-nums">4,600 / 5,000</strong>
    <div class="progress h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow="92" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full bg-emerald-500" style="width: 92%"></div>
    </div>
  </div>
  <div class="card p-6 flex flex-col gap-3">
    <div class="flex justify-between items-center text-xs">
      <span class="font-medium text-muted-foreground uppercase">Ticket Resolution</span>
      <span class="font-semibold tabular-nums text-foreground">67%</span>
    </div>
    <strong class="text-2xl font-semibold tabular-nums">134 / 200</strong>
    <div class="progress h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow="67" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full bg-amber-500" style="width: 67%"></div>
    </div>
  </div>
  <div class="card p-6 flex flex-col gap-3">
    <div class="flex justify-between items-center text-xs">
      <span class="font-medium text-muted-foreground uppercase">API Quota</span>
      <span class="font-semibold tabular-nums text-foreground">45%</span>
    </div>
    <strong class="text-2xl font-semibold tabular-nums">450k / 1M</strong>
    <div class="progress h-2 w-full rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow="45" aria-valuemin="0" aria-valuemax="100">
      <div class="h-full rounded-full bg-primary" style="width: 45%"></div>
    </div>
  </div>
</div>`
  });

  // -------------------------------------------------------------------------
  // 1.4 Chart Stacks (4 stacks)
  // -------------------------------------------------------------------------

  stacks.push({
    id: 'area-revenue-stack',
    category: 'chart-stacks',
    name: 'Revenue Area Chart Stack',
    description: 'Card-enclosed dual-series SVG area chart showing monthly recurring revenue and target trajectory with interactive legend.',
    slotTarget: 'charts',
    components: ['card', 'badge'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-4 w-full" data-slot="charts">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
    <div>
      <h3 class="text-base font-semibold">Total Revenue Trend</h3>
      <p class="text-sm text-muted-foreground">Showing performance across desktop and mobile channels.</p>
    </div>
    <div class="flex items-center gap-4 text-xs font-medium">
      <div class="flex items-center gap-1.5"><span class="size-2.5 rounded-full" style="background-color: var(--chart-1)"></span><span>Desktop: <strong class="tabular-nums font-semibold">$24,120</strong></span></div>
      <div class="flex items-center gap-1.5"><span class="size-2.5 rounded-full" style="background-color: var(--chart-2)"></span><span>Mobile: <strong class="tabular-nums font-semibold">$18,450</strong></span></div>
    </div>
  </div>
  <div class="h-64 w-full relative">
    <svg class="h-full w-full overflow-visible" viewBox="0 0 500 200" role="img" aria-label="Revenue Area Chart">
      <defs>
        <linearGradient id="area-grad-desktop" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--chart-1)" stop-opacity="0.3"/>
          <stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0.0"/>
        </linearGradient>
      </defs>
      <line x1="0" y1="50" x2="500" y2="50" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="4"/>
      <line x1="0" y1="100" x2="500" y2="100" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="4"/>
      <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" stroke-opacity="0.08" stroke-dasharray="4"/>
      <path d="M0,150 Q125,80 250,110 T500,40 L500,200 L0,200 Z" fill="url(#area-grad-desktop)"/>
      <path d="M0,150 Q125,80 250,110 T500,40" fill="none" stroke="var(--chart-1)" stroke-width="2.5"/>
    </svg>
  </div>
</div>`
  });

  stacks.push({
    id: 'bar-comparison-stack',
    category: 'chart-stacks',
    name: 'Bar Comparison Analytics Stack',
    description: 'Comparison column bar chart container contrasting actual results against projected benchmarks across 6 periods.',
    slotTarget: 'charts',
    components: ['card', 'badge'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-4 w-full" data-slot="charts">
  <div class="flex items-center justify-between border-b border-border pb-4">
    <div>
      <h3 class="text-base font-semibold">Quarterly Sales vs Target</h3>
      <p class="text-sm text-muted-foreground">Consolidated breakdown for the fiscal year.</p>
    </div>
    <div class="flex items-center gap-3 text-xs">
      <span class="flex items-center gap-1.5"><span class="size-2 rounded" style="background-color: var(--chart-1)"></span><span>Actual</span></span>
      <span class="flex items-center gap-1.5"><span class="size-2 rounded" style="background-color: var(--chart-2)"></span><span>Target</span></span>
    </div>
  </div>
  <div class="h-64 w-full">
    <svg class="h-full w-full" viewBox="0 0 400 180" role="img" aria-label="Sales Comparison Bar Chart">
      <rect x="30" y="40" width="18" height="120" rx="3" fill="var(--chart-1)"/>
      <rect x="52" y="60" width="18" height="100" rx="3" fill="var(--chart-2)"/>
      <rect x="130" y="30" width="18" height="130" rx="3" fill="var(--chart-1)"/>
      <rect x="152" y="45" width="18" height="115" rx="3" fill="var(--chart-2)"/>
      <rect x="230" y="20" width="18" height="140" rx="3" fill="var(--chart-1)"/>
      <rect x="252" y="35" width="18" height="125" rx="3" fill="var(--chart-2)"/>
      <rect x="330" y="10" width="18" height="150" rx="3" fill="var(--chart-1)"/>
      <rect x="352" y="25" width="18" height="135" rx="3" fill="var(--chart-2)"/>
    </svg>
  </div>
</div>`
  });

  stacks.push({
    id: 'radial-gauge-stack',
    category: 'chart-stacks',
    name: 'Radial Gauge Status Stack',
    description: 'Circular radial gauge chart card displaying resource utilization capacity with centered tabular readout.',
    slotTarget: 'charts',
    components: ['card'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-4 w-full" data-slot="charts">
  <div class="border-b border-border pb-3">
    <h3 class="text-base font-semibold">Storage Capacity</h3>
    <p class="text-sm text-muted-foreground">High-performance SSD pool utilization.</p>
  </div>
  <div class="flex items-center justify-center p-4">
    <div class="relative size-48 flex items-center justify-center">
      <svg class="size-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Storage capacity gauge">
        <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="8"/>
        <circle cx="50" cy="50" r="40" fill="none" stroke="var(--chart-1)" stroke-width="8" stroke-dasharray="251.2" stroke-dashoffset="65" stroke-linecap="round"/>
      </svg>
      <div class="absolute flex flex-col items-center">
        <strong class="text-3xl font-bold tabular-nums">$74.2%</strong>
        <span class="text-xs text-muted-foreground">Used of 2 TB</span>
      </div>
    </div>
  </div>
</div>`
  });

  stacks.push({
    id: 'mixed-analytics-grid',
    category: 'chart-stacks',
    name: 'Mixed Multi-Metric Analytics Grid',
    description: 'Two-column composite dashboard analytics grid combining timeline area trend and channel distribution bar breakdown.',
    slotTarget: 'charts',
    components: ['card', 'badge'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 w-full" data-slot="charts">
  <div class="card p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between border-b border-border pb-3">
      <h3 class="text-base font-semibold">Visitor Frequency</h3>
      <span class="text-xs font-semibold tabular-nums text-primary">+12.4%</span>
    </div>
    <div class="h-48 w-full flex items-end">
      <svg class="h-full w-full" viewBox="0 0 300 120" role="img" aria-label="Visitor Frequency Area">
        <path d="M0,100 Q75,30 150,60 T300,20 L300,120 L0,120 Z" fill="var(--chart-1)" fill-opacity="0.2"/>
        <path d="M0,100 Q75,30 150,60 T300,20" fill="none" stroke="var(--chart-1)" stroke-width="2"/>
      </svg>
    </div>
  </div>
  <div class="card p-6 flex flex-col gap-4">
    <div class="flex items-center justify-between border-b border-border pb-3">
      <h3 class="text-base font-semibold">Traffic Channels</h3>
      <span class="text-xs text-muted-foreground">Last 30 Days</span>
    </div>
    <div class="flex flex-col gap-3 py-2">
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs"><span class="font-medium">Direct Search</span><span class="tabular-nums font-semibold">45%</span></div>
        <div class="h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full bg-primary" style="width: 45%"></div></div>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs"><span class="font-medium">Organic Referral</span><span class="tabular-nums font-semibold">32%</span></div>
        <div class="h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full bg-emerald-500" style="width: 32%"></div></div>
      </div>
      <div class="flex flex-col gap-1">
        <div class="flex justify-between text-xs"><span class="font-medium">Social Feeds</span><span class="tabular-nums font-semibold">23%</span></div>
        <div class="h-2 rounded-full bg-muted overflow-hidden"><div class="h-full rounded-full bg-amber-500" style="width: 23%"></div></div>
      </div>
    </div>
  </div>
</div>`
  });

  // -------------------------------------------------------------------------
  // 1.5 Table Stacks (3 stacks)
  // -------------------------------------------------------------------------

  stacks.push({
    id: 'data-table-full-crud',
    category: 'table-stacks',
    name: 'Full CRUD Data Table with Toolbar and Pager',
    description: 'Production data table stack with search filter toolbar, faceted selects, bulk operations, right-aligned tabular currency, and pagination controls.',
    slotTarget: 'table',
    components: ['table', 'input', 'select', 'button', 'badge', 'checkbox', 'pagination', 'card'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-4 w-full" data-slot="table">
  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
    <div class="flex items-center gap-2">
      <input type="search" class="input w-64 text-xs" placeholder="Filter transactions...">
      <select class="select w-36 text-xs" aria-label="Status filter">
        <option value="">All Statuses</option>
        <option value="completed">Completed</option>
        <option value="pending">Pending</option>
        <option value="refunded">Refunded</option>
      </select>
    </div>
    <div class="flex items-center gap-2">
      <button type="button" class="btn gap-1.5" data-variant="outline" data-size="sm">${ICONS.download}<span>Export</span></button>
      <button type="button" class="btn gap-1.5" data-variant="primary" data-size="sm">${ICONS.plus}<span>Add Transaction</span></button>
    </div>
  </div>
  <div class="overflow-x-auto">
    <table class="table w-full text-sm">
      <thead>
        <tr>
          <th class="w-10"><input type="checkbox" class="checkbox" aria-label="Select all"></th>
          <th class="text-left font-medium text-muted-foreground">Order ID</th>
          <th class="text-left font-medium text-muted-foreground">Customer</th>
          <th class="text-left font-medium text-muted-foreground">Status</th>
          <th class="text-left font-medium text-muted-foreground">Date</th>
          <th class="text-right font-medium text-muted-foreground">Amount</th>
          <th class="w-12 text-right font-medium text-muted-foreground">Actions</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><input type="checkbox" class="checkbox" aria-label="Select row"></td>
          <td class="font-mono text-xs">ORD-7291</td>
          <td class="font-medium text-foreground">Sophia Vance</td>
          <td><span class="badge" data-variant="secondary">Completed</span></td>
          <td class="text-muted-foreground tabular-nums">2026-10-14</td>
          <td class="text-right tabular-nums font-semibold">$350.00</td>
          <td class="text-right"><button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Actions">${ICONS.moreHorizontal}</button></td>
        </tr>
        <tr>
          <td><input type="checkbox" class="checkbox" aria-label="Select row"></td>
          <td class="font-mono text-xs">ORD-7292</td>
          <td class="font-medium text-foreground">Liam Walker</td>
          <td><span class="badge" data-variant="outline">Pending</span></td>
          <td class="text-muted-foreground tabular-nums">2026-10-13</td>
          <td class="text-right tabular-nums font-semibold">$1,249.50</td>
          <td class="text-right"><button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Actions">${ICONS.moreHorizontal}</button></td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between border-t border-border pt-4 text-xs text-muted-foreground">
    <span class="tabular-nums">Showing 1 to 2 of 24 records</span>
    <div class="flex items-center gap-1">
      <button type="button" class="btn" data-variant="outline" data-size="xs" disabled>Previous</button>
      <button type="button" class="btn" data-variant="outline" data-size="xs">Next</button>
    </div>
  </div>
</div>`
  });

  stacks.push({
    id: 'activity-feed-table',
    category: 'table-stacks',
    name: 'Security and Audit Activity Feed Table',
    description: 'Audit log table tracking system events, user identity avatars, severity badges, and right-aligned timestamp records.',
    slotTarget: 'table',
    components: ['table', 'card', 'badge', 'avatar'],
    fsmContracts: ['data-slot'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-4 w-full" data-slot="table">
  <div class="flex items-center justify-between border-b border-border pb-3">
    <div>
      <h3 class="text-base font-semibold">Audit Event Trail</h3>
      <p class="text-sm text-muted-foreground">Real-time log of security events and administrative actions.</p>
    </div>
    <span class="badge gap-1" data-variant="secondary">Live Sync</span>
  </div>
  <div class="overflow-x-auto">
    <table class="table w-full text-sm">
      <thead>
        <tr>
          <th class="text-left font-medium text-muted-foreground">Actor</th>
          <th class="text-left font-medium text-muted-foreground">Event Description</th>
          <th class="text-left font-medium text-muted-foreground">Target Resource</th>
          <th class="text-left font-medium text-muted-foreground">Severity</th>
          <th class="text-right font-medium text-muted-foreground">Timestamp</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td class="flex items-center gap-2">
            <div class="size-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold">AK</div>
            <span class="font-medium">Anna Kowalski</span>
          </td>
          <td>Created API credential token</td>
          <td class="font-mono text-xs">token_prod_90</td>
          <td><span class="badge" data-variant="secondary">Info</span></td>
          <td class="text-right tabular-nums text-muted-foreground">2 min ago</td>
        </tr>
        <tr>
          <td class="flex items-center gap-2">
            <div class="size-6 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold">SY</div>
            <span class="font-medium">System Daemon</span>
          </td>
          <td>Automated database snapshot completed</td>
          <td class="font-mono text-xs">db_cluster_eu</td>
          <td><span class="badge" data-variant="secondary">Routine</span></td>
          <td class="text-right tabular-nums text-muted-foreground">15 min ago</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`
  });

  stacks.push({
    id: 'expandable-row-table',
    category: 'table-stacks',
    name: 'Expandable Master-Detail Row Table',
    description: 'Hierarchical data table supporting nested row inspection and itemized order breakdowns with right-aligned numeric data.',
    slotTarget: 'table',
    components: ['table', 'card', 'badge', 'button'],
    fsmContracts: ['data-slot', 'aria-expanded'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-4 w-full" data-slot="table">
  <div class="border-b border-border pb-3">
    <h3 class="text-base font-semibold">Fulfillments</h3>
    <p class="text-sm text-muted-foreground">Click chevron to expand order line item manifests.</p>
  </div>
  <div class="overflow-x-auto">
    <table class="table w-full text-sm">
      <thead>
        <tr>
          <th class="w-8"></th>
          <th class="text-left font-medium text-muted-foreground">Shipment</th>
          <th class="text-left font-medium text-muted-foreground">Destination</th>
          <th class="text-left font-medium text-muted-foreground">Carrier</th>
          <th class="text-right font-medium text-muted-foreground">Weight</th>
          <th class="text-right font-medium text-muted-foreground">Cost</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Expand details">${ICONS.chevronRight}</button></td>
          <td class="font-semibold text-foreground">SHP-1094</td>
          <td>Berlin, Germany</td>
          <td>DHL Express</td>
          <td class="text-right tabular-nums">1.4 kg</td>
          <td class="text-right tabular-nums font-semibold">$48.50</td>
        </tr>
        <tr>
          <td><button type="button" class="btn" data-variant="ghost" data-size="icon-xs" aria-label="Expand details">${ICONS.chevronRight}</button></td>
          <td class="font-semibold text-foreground">SHP-1095</td>
          <td>Vilnius, Lithuania</td>
          <td>DPD Courier</td>
          <td class="text-right tabular-nums">4.2 kg</td>
          <td class="text-right tabular-nums font-semibold">$82.00</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>`
  });

  // -------------------------------------------------------------------------
  // 1.6 Overlay Stacks (4 stacks)
  // -------------------------------------------------------------------------

  stacks.push({
    id: 'detail-inspector-drawer',
    category: 'overlay-stacks',
    name: 'Detail Inspector Slide-over Drawer',
    description: 'Slide-over drawer panel for deep inspection of records, featuring titled header, metadata fields, and action buttons.',
    slotTarget: 'overlays',
    components: ['drawer', 'button', 'badge', 'tabs'],
    fsmContracts: ['data-slot', 'data-component', 'data-state', 'aria-labelledby'],
    dependencies: { css: ['basecoat-css/vega'], js: ['basecoat-css/drawer'] },
    html: `<aside class="drawer fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-background shadow-2xl border-s border-border" data-state="open" data-component="drawer" aria-labelledby="detail-inspector-title" data-slot="overlays">
  <div class="flex items-center justify-between border-b border-border p-4">
    <div class="flex items-center gap-2">
      <h2 id="detail-inspector-title" class="text-base font-semibold">Order Details</h2>
      <span class="badge" data-variant="secondary">ORD-7291</span>
    </div>
    <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" aria-label="Close drawer">${ICONS.x}</button>
  </div>
  <div class="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
    <div class="flex flex-col gap-1">
      <span class="text-xs uppercase tracking-wider text-muted-foreground">Total Charged</span>
      <strong class="text-3xl font-bold tabular-nums">$1,999.00</strong>
    </div>
    <div class="flex flex-col gap-3 rounded-lg border border-border p-4 text-xs">
      <div class="flex justify-between"><span class="text-muted-foreground">Customer</span><span class="font-medium text-foreground">Sophia Vance</span></div>
      <div class="flex justify-between"><span class="text-muted-foreground">Email</span><span>sophia@example.com</span></div>
      <div class="flex justify-between"><span class="text-muted-foreground">Payment Method</span><span>Visa ending in 4242</span></div>
    </div>
  </div>
  <div class="border-t border-border p-4 flex justify-end gap-2">
    <button type="button" class="btn" data-variant="outline" data-size="sm">Issue Refund</button>
    <button type="button" class="btn" data-variant="primary" data-size="sm">Download Receipt</button>
  </div>
</aside>`
  });

  stacks.push({
    id: 'command-palette-dialog',
    category: 'overlay-stacks',
    name: 'Command Palette Quick Navigation Dialog',
    description: 'Accessible modal command palette dialog with fast keyboard filtering, categorized action lists, and shortcut badges.',
    slotTarget: 'overlays',
    components: ['dialog', 'command', 'input', 'kbd'],
    fsmContracts: ['data-slot', 'data-component', 'data-state', 'aria-labelledby'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<dialog class="dialog fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-state="open" data-component="dialog" aria-labelledby="cmd-dialog-title" data-slot="overlays">
  <div class="w-full max-w-lg rounded-xl bg-background p-4 shadow-2xl border border-border flex flex-col gap-3">
    <h2 id="cmd-dialog-title" class="sr-only">Command Palette Navigation</h2>
    <div class="flex items-center gap-2 border-b border-border pb-3 px-1">
      ${ICONS.search}
      <input type="text" class="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground" placeholder="Type a command or search...">
      <kbd class="kbd text-[10px] px-1.5 py-0.5">ESC</kbd>
    </div>
    <div class="flex flex-col gap-2 max-h-72 overflow-y-auto">
      <span class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-2">Navigation</span>
      <button type="button" class="flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium hover:bg-muted text-foreground text-left">
        <span class="flex items-center gap-2">${ICONS.dashboard}<span>Go to Dashboard</span></span>
        <kbd class="kbd text-[10px]">G D</kbd>
      </button>
      <button type="button" class="flex items-center justify-between rounded-md px-3 py-2 text-xs font-medium hover:bg-muted text-foreground text-left">
        <span class="flex items-center gap-2">${ICONS.activity}<span>Go to Analytics</span></span>
        <kbd class="kbd text-[10px]">G A</kbd>
      </button>
    </div>
    <div class="border-t border-border pt-2 flex justify-end">
      <button type="button" class="btn" data-variant="ghost" data-size="xs">Close</button>
    </div>
  </div>
</dialog>`
  });

  stacks.push({
    id: 'multi-step-wizard-modal',
    category: 'overlay-stacks',
    name: 'Multi-Step Setup Wizard Modal',
    description: 'Modal wizard dialog guiding users through complex configurations with step progression, inputs, and navigation buttons.',
    slotTarget: 'overlays',
    components: ['dialog', 'button', 'input', 'badge', 'progress'],
    fsmContracts: ['data-slot', 'data-component', 'data-state', 'aria-labelledby'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<dialog class="dialog fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-state="open" data-component="dialog" aria-labelledby="wizard-modal-title" data-slot="overlays">
  <div class="w-full max-w-md rounded-xl bg-background p-6 shadow-2xl border border-border flex flex-col gap-6">
    <div class="flex items-center justify-between border-b border-border pb-3">
      <div>
        <h2 id="wizard-modal-title" class="text-base font-semibold">New Organization</h2>
        <p class="text-xs text-muted-foreground">Step 1 of 3: Organization Details</p>
      </div>
      <span class="badge tabular-nums" data-variant="secondary">33%</span>
    </div>
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-1.5">
        <label class="label text-xs font-medium">Display Name</label>
        <input type="text" class="input text-xs" placeholder="e.g. Acme Studio">
      </div>
      <div class="flex flex-col gap-1.5">
        <label class="label text-xs font-medium">Domain Slug</label>
        <input type="text" class="input text-xs" placeholder="acme-studio">
      </div>
    </div>
    <div class="flex items-center justify-between border-t border-border pt-4">
      <button type="button" class="btn" data-variant="outline" data-size="sm">Cancel</button>
      <button type="button" class="btn" data-variant="primary" data-size="sm">Continue</button>
    </div>
  </div>
</dialog>`
  });

  stacks.push({
    id: 'confirmation-alert-dialog',
    category: 'overlay-stacks',
    name: 'Destructive Confirmation Alert Dialog',
    description: 'Accessible alert dialog modal prompting explicit confirmation before executing permanent or destructive operations.',
    slotTarget: 'overlays',
    components: ['alert-dialog', 'button'],
    fsmContracts: ['data-slot', 'data-component', 'data-state', 'aria-labelledby'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<dialog class="dialog fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" data-state="open" data-component="dialog" aria-labelledby="alert-dialog-title" data-slot="overlays">
  <div class="w-full max-w-md rounded-xl bg-background p-6 shadow-2xl border border-border flex flex-col gap-4">
    <div class="flex items-center gap-3 text-destructive">
      ${ICONS.alertTriangle}
      <h2 id="alert-dialog-title" class="text-base font-semibold text-foreground">Revoke Production API Key?</h2>
    </div>
    <p class="text-sm text-muted-foreground">
      This action is immediate and irreversible. Any services relying on this key will instantly encounter authentication errors.
    </p>
    <div class="flex items-center justify-end gap-2 border-t border-border pt-4">
      <button type="button" class="btn" data-variant="outline" data-size="sm">Cancel</button>
      <button type="button" class="btn" data-variant="destructive" data-size="sm">Revoke Key</button>
    </div>
  </div>
</dialog>`
  });

  // -------------------------------------------------------------------------
  // 1.7 Form Stacks (4 stacks)
  // -------------------------------------------------------------------------

  stacks.push({
    id: 'field-group-settings',
    category: 'form-stacks',
    name: 'Settings Field Group Form Stack',
    description: 'Structured form section utilizing field-group semantics, input fields, contextual descriptions, and submission actions.',
    slotTarget: 'forms',
    components: ['field', 'input', 'select', 'button', 'card'],
    fsmContracts: ['data-slot', 'data-component'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-6 w-full" data-slot="forms">
  <div class="border-b border-border pb-3">
    <h3 class="text-base font-semibold">Security Settings</h3>
    <p class="text-sm text-muted-foreground">Configure multi-factor policies and session expiration limits.</p>
  </div>
  <form class="flex flex-col gap-6" data-component="field-group">
    <div class="flex flex-col gap-2" data-component="field">
      <label class="label text-sm font-medium">Session Timeout</label>
      <select class="select w-full max-w-md">
        <option value="15">15 minutes (Strict)</option>
        <option value="60" selected>1 hour (Recommended)</option>
        <option value="1440">24 hours</option>
      </select>
      <p class="text-xs text-muted-foreground">Users will be signed out after remaining idle for this period.</p>
    </div>
    <div class="flex flex-col gap-2" data-component="field">
      <label class="label text-sm font-medium">Notification Email</label>
      <input type="email" class="input w-full max-w-md" value="security-alerts@acme.com">
      <p class="text-xs text-muted-foreground">Security dispatch emails will be sent to this destination.</p>
    </div>
    <div class="flex justify-start border-t border-border pt-4">
      <button type="submit" class="btn" data-variant="primary" data-size="sm" data-state="default">Save Settings</button>
    </div>
  </form>
</div>`
  });

  stacks.push({
    id: 'input-group-search-addons',
    category: 'form-stacks',
    name: 'Input Group with Addons Stack',
    description: 'Composite search and query form stack combining icon addons, keyboard hints, and filter trigger buttons.',
    slotTarget: 'forms',
    components: ['input-group', 'input', 'button', 'kbd', 'card'],
    fsmContracts: ['data-slot', 'data-component'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col gap-4 w-full" data-slot="forms">
  <div class="border-b border-border pb-3">
    <h3 class="text-base font-semibold">Repository Query Filter</h3>
    <p class="text-sm text-muted-foreground">Search by keyword, author, or regex pattern.</p>
  </div>
  <div class="flex items-center gap-2" data-component="input-group">
    <div class="relative flex-1 flex items-center">
      <span class="absolute left-3 text-muted-foreground" data-slot="input-group-addon">${ICONS.search}</span>
      <input type="text" class="input w-full ps-9 pe-16 text-xs" placeholder="Find files or symbols...">
      <span class="absolute right-3" data-slot="input-group-addon"><kbd class="kbd text-[10px] px-1.5 py-0.5">⌘F</kbd></span>
    </div>
    <button type="button" class="btn gap-1.5" data-variant="outline" data-size="sm">${ICONS.filter}<span>Filters</span></button>
    <button type="button" class="btn" data-variant="primary" data-size="sm">Search</button>
  </div>
</div>`
  });

  stacks.push({
    id: 'segmented-toggle-bar',
    category: 'form-stacks',
    name: 'Segmented View Toggle Bar',
    description: 'Segmented group control for toggling between visualization modes, data intervals, or presentation views.',
    slotTarget: 'forms',
    components: ['button', 'card'],
    fsmContracts: ['data-slot', 'role', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full" data-slot="forms">
  <div>
    <h3 class="text-base font-semibold">Display Presentation</h3>
    <p class="text-sm text-muted-foreground">Select layout arrangement for data records.</p>
  </div>
  <div class="flex items-center rounded-lg bg-muted p-1" role="group" aria-label="View Mode">
    <button type="button" class="px-3 py-1 text-xs font-medium rounded-md bg-background text-foreground shadow-xs" data-state="active">Grid View</button>
    <button type="button" class="px-3 py-1 text-xs font-medium rounded-md text-foreground hover:text-foreground" data-state="inactive">Table View</button>
    <button type="button" class="px-3 py-1 text-xs font-medium rounded-md text-foreground hover:text-foreground" data-state="inactive">Timeline</button>
  </div>
</div>`
  });

  stacks.push({
    id: 'auth-card-stack',
    category: 'form-stacks',
    name: 'Authentication Sign-In Card Stack',
    description: 'Complete user authentication card stack featuring brand mark, OAuth options, form validation, and submit button.',
    slotTarget: 'forms',
    components: ['card', 'field', 'input', 'button', 'checkbox'],
    fsmContracts: ['data-slot', 'data-component', 'data-state'],
    dependencies: { css: ['basecoat-css/vega'], js: [] },
    html: `<div class="card p-8 max-w-md w-full mx-auto flex flex-col gap-6" data-slot="forms">
  <div class="flex flex-col items-center gap-2 text-center">
    <div class="size-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">B</div>
    <h2 class="text-xl font-semibold tracking-tight">Sign in to your account</h2>
    <p class="text-xs text-muted-foreground">Enter your credentials below to access the console</p>
  </div>
  <form class="flex flex-col gap-4" data-component="field-group">
    <div class="flex flex-col gap-1.5" data-component="field">
      <label class="label text-xs font-medium">Email address</label>
      <input type="email" class="input" placeholder="name@company.com" required>
    </div>
    <div class="flex flex-col gap-1.5" data-component="field">
      <div class="flex items-center justify-between text-xs">
        <label class="label font-medium">Password</label>
        <a class="text-primary hover:underline">Forgot password?</a>
      </div>
      <input type="password" class="input" required>
    </div>
    <div class="flex items-center gap-2">
      <input type="checkbox" id="remember-me" class="checkbox">
      <label for="remember-me" class="text-xs text-muted-foreground">Remember me for 30 days</label>
    </div>
    <button type="submit" class="btn w-full mt-2" data-variant="primary" data-size="sm" data-state="default">Sign In</button>
  </form>
</div>`
  });

  return {
    schemaVersion: 1,
    totalStacks: stacks.length,
    categories: [
      'shell-stacks',
      'header-stacks',
      'kpi-stacks',
      'chart-stacks',
      'table-stacks',
      'overlay-stacks',
      'form-stacks'
    ],
    stacks
  };
}

// ---------------------------------------------------------------------------
// 2. CHARTS CATALOG GENERATION (56 variants across 7 categories)
// ---------------------------------------------------------------------------

function generateChartSvg(category, variantId) {
  // Deterministic SVG charts using cssTokens var(--chart-1)..var(--chart-5)
  switch (category) {
    case 'area':
      if (variantId === 'area-step') {
        return `<svg class="h-48 w-full" viewBox="0 0 400 160" role="img" aria-label="Step Area Chart">
          <path d="M0,140 L80,140 L80,100 L160,100 L160,60 L240,60 L240,80 L320,80 L320,30 L400,30 L400,160 L0,160 Z" fill="var(--chart-1)" fill-opacity="0.2"/>
          <path d="M0,140 L80,140 L80,100 L160,100 L160,60 L240,60 L240,80 L320,80 L320,30 L400,30" fill="none" stroke="var(--chart-1)" stroke-width="2"/>
        </svg>`;
      }
      if (variantId === 'area-stacked' || variantId === 'area-stacked-expanded') {
        return `<svg class="h-48 w-full" viewBox="0 0 400 160" role="img" aria-label="Stacked Area Chart">
          <path d="M0,120 Q100,80 200,90 T400,50 L400,160 L0,160 Z" fill="var(--chart-1)" fill-opacity="0.3"/>
          <path d="M0,80 Q100,40 200,50 T400,20 L400,120 Q300,90 200,90 T0,120 Z" fill="var(--chart-2)" fill-opacity="0.3"/>
          <path d="M0,120 Q100,80 200,90 T400,50" fill="none" stroke="var(--chart-1)" stroke-width="2"/>
          <path d="M0,80 Q100,40 200,50 T400,20" fill="none" stroke="var(--chart-2)" stroke-width="2"/>
        </svg>`;
      }
      return `<svg class="h-48 w-full" viewBox="0 0 400 160" role="img" aria-label="Area Chart">
        <defs>
          <linearGradient id="grad-${variantId}" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--chart-1)" stop-opacity="0.35"/>
            <stop offset="100%" stop-color="var(--chart-1)" stop-opacity="0.0"/>
          </linearGradient>
        </defs>
        <path d="M0,130 Q100,50 200,90 T400,30 L400,160 L0,160 Z" fill="url(#grad-${variantId})"/>
        <path d="M0,130 Q100,50 200,90 T400,30" fill="none" stroke="var(--chart-1)" stroke-width="2.5"/>
      </svg>`;

    case 'bar':
      if (variantId === 'bar-horizontal') {
        return `<svg class="h-48 w-full" viewBox="0 0 400 160" role="img" aria-label="Horizontal Bar Chart">
          <rect x="0" y="20" width="280" height="18" rx="3" fill="var(--chart-1)"/>
          <rect x="0" y="55" width="340" height="18" rx="3" fill="var(--chart-1)"/>
          <rect x="0" y="90" width="210" height="18" rx="3" fill="var(--chart-1)"/>
          <rect x="0" y="125" width="310" height="18" rx="3" fill="var(--chart-1)"/>
        </svg>`;
      }
      if (variantId === 'bar-negative') {
        return `<svg class="h-48 w-full" viewBox="0 0 400 160" role="img" aria-label="Negative Bar Chart">
          <line x1="0" y1="80" x2="400" y2="80" stroke="currentColor" stroke-opacity="0.2"/>
          <rect x="40" y="30" width="24" height="50" rx="2" fill="var(--chart-1)"/>
          <rect x="120" y="80" width="24" height="40" rx="2" fill="var(--chart-5)"/>
          <rect x="200" y="20" width="24" height="60" rx="2" fill="var(--chart-1)"/>
          <rect x="280" y="80" width="24" height="30" rx="2" fill="var(--chart-5)"/>
          <rect x="340" y="40" width="24" height="40" rx="2" fill="var(--chart-1)"/>
        </svg>`;
      }
      return `<svg class="h-48 w-full" viewBox="0 0 400 160" role="img" aria-label="Bar Chart">
        <rect x="30" y="40" width="28" height="120" rx="3" fill="var(--chart-1)"/>
        <rect x="90" y="20" width="28" height="140" rx="3" fill="var(--chart-1)"/>
        <rect x="150" y="60" width="28" height="100" rx="3" fill="var(--chart-1)"/>
        <rect x="210" y="30" width="28" height="130" rx="3" fill="var(--chart-1)"/>
        <rect x="270" y="70" width="28" height="90" rx="3" fill="var(--chart-1)"/>
        <rect x="330" y="15" width="28" height="145" rx="3" fill="var(--chart-1)"/>
      </svg>`;

    case 'line':
      return `<svg class="h-48 w-full" viewBox="0 0 400 160" role="img" aria-label="Line Chart">
        <path d="M0,120 Q100,30 200,80 T400,20" fill="none" stroke="var(--chart-1)" stroke-width="2.5"/>
        <circle cx="100" cy="55" r="4" fill="var(--chart-1)"/>
        <circle cx="200" cy="80" r="4" fill="var(--chart-1)"/>
        <circle cx="300" cy="50" r="4" fill="var(--chart-1)"/>
        <circle cx="400" cy="20" r="4" fill="var(--chart-1)"/>
      </svg>`;

    case 'pie':
      if (variantId.includes('donut')) {
        return `<div class="flex items-center justify-center h-48 w-full">
          <div class="relative size-40 flex items-center justify-center">
            <svg class="size-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Donut Chart">
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--chart-1)" stroke-width="14" stroke-dasharray="140 238"/>
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--chart-2)" stroke-width="14" stroke-dasharray="60 238" stroke-dashoffset="-140"/>
              <circle cx="50" cy="50" r="38" fill="none" stroke="var(--chart-3)" stroke-width="14" stroke-dasharray="38 238" stroke-dashoffset="-200"/>
            </svg>
            <div class="absolute flex flex-col items-center">
              <strong class="text-xl font-bold tabular-nums">4,280</strong>
              <span class="text-[10px] text-muted-foreground uppercase">Total</span>
            </div>
          </div>
        </div>`;
      }
      return `<div class="flex items-center justify-center h-48 w-full">
        <svg class="size-40" viewBox="0 0 100 100" role="img" aria-label="Pie Chart">
          <circle cx="50" cy="50" r="40" fill="var(--chart-1)"/>
          <path d="M50,50 L50,10 A40,40 0 0,1 90,50 Z" fill="var(--chart-2)"/>
          <path d="M50,50 L90,50 A40,40 0 0,1 50,90 Z" fill="var(--chart-3)"/>
        </svg>
      </div>`;

    case 'radar':
      return `<div class="flex items-center justify-center h-48 w-full">
        <svg class="size-44" viewBox="0 0 120 120" role="img" aria-label="Radar Chart">
          <polygon points="60,10 105,38 105,82 60,110 15,82 15,38" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
          <polygon points="60,25 90,44 90,76 60,95 30,76 30,44" fill="none" stroke="currentColor" stroke-opacity="0.15" stroke-width="1"/>
          <polygon points="60,20 95,40 85,80 60,90 25,70 35,42" fill="var(--chart-1)" fill-opacity="0.25" stroke="var(--chart-1)" stroke-width="2"/>
        </svg>
      </div>`;

    case 'radial':
      return `<div class="flex items-center justify-center h-48 w-full">
        <div class="relative size-40 flex items-center justify-center">
          <svg class="size-full -rotate-90" viewBox="0 0 100 100" role="img" aria-label="Radial Gauge">
            <circle cx="50" cy="50" r="36" fill="none" stroke="currentColor" stroke-opacity="0.1" stroke-width="8"/>
            <circle cx="50" cy="50" r="36" fill="none" stroke="var(--chart-1)" stroke-width="8" stroke-dasharray="226" stroke-dashoffset="60" stroke-linecap="round"/>
          </svg>
          <div class="absolute flex flex-col items-center">
            <strong class="text-2xl font-bold tabular-nums">72%</strong>
            <span class="text-[10px] text-muted-foreground uppercase">Goal</span>
          </div>
        </div>
      </div>`;

    case 'tooltip':
      return `<div class="relative h-48 w-full flex items-center justify-center">
        <svg class="h-full w-full" viewBox="0 0 400 160" role="img" aria-label="Interactive Chart with Tooltip">
          <path d="M0,130 Q100,50 200,90 T400,30" fill="none" stroke="var(--chart-1)" stroke-width="2.5"/>
          <line x1="200" y1="0" x2="200" y2="160" stroke="currentColor" stroke-opacity="0.3" stroke-dasharray="4"/>
          <circle cx="200" cy="90" r="5" fill="var(--chart-1)"/>
        </svg>
        <div class="absolute left-1/2 top-4 -translate-x-1/2 rounded-lg border border-border bg-background p-2.5 shadow-xl text-xs flex flex-col gap-1 z-10" data-slot="tooltip">
          <span class="font-semibold text-muted-foreground">Wednesday, Oct 14</span>
          <div class="flex items-center gap-2">
            <span class="size-2 rounded-full" style="background-color: var(--chart-1)"></span>
            <span class="font-medium">Visitors: <strong class="tabular-nums font-semibold">14,250</strong></span>
          </div>
        </div>
      </div>`;

    default:
      return `<svg class="h-48 w-full" viewBox="0 0 400 160"><rect width="400" height="160" fill="var(--chart-1)" fill-opacity="0.1"/></svg>`;
  }
}

function generateFrameworkMounts(id, name, description, chartHtml) {
  const componentName = id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Chart';

  // Vanilla
  const vanilla = `// Mount and bind ${name}
const container = document.getElementById("${id}");
if (container) {
  container.querySelectorAll("[data-series]").forEach((el) => {
    el.addEventListener("mouseenter", () => {
      container.querySelector("[data-slot='tooltip']")?.setAttribute("data-state", "visible");
    });
    el.addEventListener("mouseleave", () => {
      container.querySelector("[data-slot='tooltip']")?.setAttribute("data-state", "hidden");
    });
  });
}`;

  // Astro
  const astro = `---
// ${componentName}.astro
interface Props {
  title?: string;
  description?: string;
  class?: string;
}
const { title = "${name}", description = "${description}", class: className = "" } = Astro.props;
---
<div id="${id}" class:list={["w-full", className]}>
  ${chartHtml}
</div>
<script>
  const root = document.getElementById("${id}");
  root?.querySelectorAll("[data-series]").forEach(el => {
    el.addEventListener("mouseenter", () => root.querySelector("[data-slot='tooltip']")?.setAttribute("data-state", "visible"));
    el.addEventListener("mouseleave", () => root.querySelector("[data-slot='tooltip']")?.setAttribute("data-state", "hidden"));
  });
</script>`;

  // React
  const reactHtml = chartHtml
    .replace(/class=/g, 'className=')
    .replace(/stroke-width=/g, 'strokeWidth=')
    .replace(/stroke-linecap=/g, 'strokeLinecap=')
    .replace(/stroke-linejoin=/g, 'strokeLinejoin=')
    .replace(/stroke-dasharray=/g, 'strokeDasharray=')
    .replace(/stroke-dashoffset=/g, 'strokeDashoffset=')
    .replace(/stroke-opacity=/g, 'strokeOpacity=')
    .replace(/fill-opacity=/g, 'fillOpacity=')
    .replace(/stop-color=/g, 'stopColor=')
    .replace(/stop-opacity=/g, 'stopOpacity=')
    .replace(/aria-label=/g, 'aria-label=');

  const react = `import React from 'react';

interface ${componentName}Props {
  title?: string;
  description?: string;
  className?: string;
}

export function ${componentName}({
  title = "${name}",
  description = "${description}",
  className = ""
}: ${componentName}Props) {
  return (
    <div id="${id}" className={\`w-full \${className}\`}>
      ${reactHtml}
    </div>
  );
}`;

  // Vue
  const vue = `<script setup lang="ts">
const props = withDefaults(defineProps<{
  title?: string;
  description?: string;
  class?: string;
}>(), {
  title: "${name}",
  description: "${description}",
  class: ""
});
</script>

<template>
  <div :id="'${id}'" :class="['w-full', props.class]">
    ${chartHtml}
  </div>
</template>`;

  // Svelte
  const svelte = `<script lang="ts">
  export let title: string = "${name}";
  export let description: string = "${description}";
  export let className: string = "";
</script>

<div id="${id}" class="w-full {className}">
  ${chartHtml}
</div>`;

  return { vanilla, astro, react, vue, svelte };
}

export function generateChartsCatalog() {
  const categories = ['area', 'bar', 'line', 'pie', 'radar', 'radial', 'tooltip'];
  const variantsPerCategory = {
    area: [
      { id: 'area-default', name: 'Area Chart Default', description: 'Smooth curved single series area chart with vertical fill.' },
      { id: 'area-linear', name: 'Area Chart Linear', description: 'Linear point-to-point area chart with straight segment boundaries.' },
      { id: 'area-step', name: 'Area Chart Step', description: 'Stepped area chart displaying discrete transition steps.' },
      { id: 'area-stacked', name: 'Area Chart Stacked', description: 'Multi-series stacked area chart showing cumulative volume.' },
      { id: 'area-stacked-expanded', name: 'Area Chart Stacked Expanded', description: 'Normalized 100% stacked area chart displaying percentage share.' },
      { id: 'area-gradient', name: 'Area Chart Gradient', description: 'Area chart styled with vertical fade gradient.' },
      { id: 'area-axes', name: 'Area Chart with Axes', description: 'Area chart with explicit X and Y coordinate grid lines.' },
      { id: 'area-interactive', name: 'Area Chart Interactive', description: 'Interactive area chart supporting time filter ranges and cursor highlights.' }
    ],
    bar: [
      { id: 'bar-default', name: 'Bar Chart Default', description: 'Classic vertical column bar chart with rounded edges.' },
      { id: 'bar-horizontal', name: 'Bar Chart Horizontal', description: 'Horizontal oriented bar chart for category comparisons.' },
      { id: 'bar-multiple', name: 'Bar Chart Multiple', description: 'Clustered multi-series bar chart contrasting grouped periods.' },
      { id: 'bar-stacked', name: 'Bar Chart Stacked', description: 'Vertical stacked bar chart representing cumulative quantities.' },
      { id: 'bar-negative', name: 'Bar Chart Negative', description: 'Diverging bar chart depicting positive gains and negative variances from baseline.' },
      { id: 'bar-interactive', name: 'Bar Chart Interactive', description: 'Interactive bar chart with active bar selection state.' },
      { id: 'bar-mixed', name: 'Bar Chart Mixed', description: 'Composite bar chart combining volume columns with benchmark target line.' },
      { id: 'bar-active', name: 'Bar Chart Active State', description: 'Bar chart emphasizing the current active period.' }
    ],
    line: [
      { id: 'line-default', name: 'Line Chart Default', description: 'Smooth cubic curve single series line chart.' },
      { id: 'line-linear', name: 'Line Chart Linear', description: 'Linear line chart with direct straight coordinate segments.' },
      { id: 'line-step', name: 'Line Chart Step', description: 'Step staircase line chart tracking discrete state changes.' },
      { id: 'line-multiple', name: 'Line Chart Multiple', description: 'Multi-series line chart comparing parallel trajectories.' },
      { id: 'line-dots', name: 'Line Chart with Dots', description: 'Line chart with distinct point markers at each coordinate.' },
      { id: 'line-dots-custom', name: 'Line Chart Custom Dots', description: 'Line chart with customized diamond and square vertex markers.' },
      { id: 'line-dots-colors', name: 'Line Chart Multi-Color Dots', description: 'Line chart with dynamic conditional color markers.' },
      { id: 'line-interactive', name: 'Line Chart Interactive', description: 'Interactive line chart with inspection guide cursor.' }
    ],
    pie: [
      { id: 'pie-default', name: 'Pie Chart Default', description: 'Circular pie chart displaying proportioned slices.' },
      { id: 'pie-separator-none', name: 'Pie Chart Separator None', description: 'Seamless pie chart without slice borders.' },
      { id: 'pie-label', name: 'Pie Chart with Labels', description: 'Pie chart with percentage callout labels.' },
      { id: 'pie-label-custom', name: 'Pie Chart Custom Labels', description: 'Pie chart with pointer lines connecting to external descriptions.' },
      { id: 'pie-donut', name: 'Pie Donut Chart', description: 'Donut chart with hollow central core.' },
      { id: 'pie-donut-active', name: 'Pie Donut Active Slice', description: 'Donut chart with elevated active hovered slice.' },
      { id: 'pie-donut-text', name: 'Pie Donut with Center Text', description: 'Donut chart displaying total metric figure in hollow center.' },
      { id: 'pie-stacked', name: 'Pie Stacked Concentric', description: 'Multi-ring concentric donut chart comparing internal and external tiers.' }
    ],
    radar: [
      { id: 'radar-default', name: 'Radar Chart Default', description: 'Polygonal radar spider chart displaying multi-variable attributes.' },
      { id: 'radar-dots', name: 'Radar Chart with Dots', description: 'Radar chart with circular vertex indicators.' },
      { id: 'radar-multiple', name: 'Radar Chart Multiple', description: 'Multi-dataset overlay radar chart comparing profiles.' },
      { id: 'radar-lines-only', name: 'Radar Chart Lines Only', description: 'Wireframe radar chart with outlines and transparent fill.' },
      { id: 'radar-grid-custom', name: 'Radar Chart Custom Grid', description: 'Radar chart with dashed concentric polygon grid lines.' },
      { id: 'radar-grid-none', name: 'Radar Chart Minimal', description: 'Minimalist radar chart with spokes only.' },
      { id: 'radar-grid-circle', name: 'Radar Chart Circular Grid', description: 'Radar chart featuring circular web grid concentric lines.' },
      { id: 'radar-radius', name: 'Radar Chart Radius Labels', description: 'Radar chart with percentage radius scale markings.' }
    ],
    radial: [
      { id: 'radial-default', name: 'Radial Chart Default', description: 'Circular radial gauge progress arc.' },
      { id: 'radial-label', name: 'Radial Chart with Labels', description: 'Radial bar chart with labeled arc terminals.' },
      { id: 'radial-grid', name: 'Radial Chart with Grid', description: 'Radial chart with background circular track grid.' },
      { id: 'radial-text', name: 'Radial Chart Center Text', description: 'Radial gauge with large centered percentage and goal label.' },
      { id: 'radial-shape', name: 'Radial Chart Rounded Shape', description: 'Radial gauge featuring smooth rounded caps.' },
      { id: 'radial-stacked', name: 'Radial Chart Stacked Rings', description: 'Concentric multi-series activity progress rings.' },
      { id: 'radial-half', name: 'Radial Semi-Circle Gauge', description: '180-degree semi-circular speedometer gauge.' },
      { id: 'radial-angle', name: 'Radial Custom Angle Gauge', description: '270-degree custom start/end angle radial gauge.' }
    ],
    tooltip: [
      { id: 'tooltip-default', name: 'Tooltip Default', description: 'Floating card tooltip with category heading and value marker.' },
      { id: 'tooltip-indicator-line', name: 'Tooltip with Indicator Line', description: 'Chart tooltip featuring vertical dashed guideline.' },
      { id: 'tooltip-indicator-none', name: 'Tooltip Indicator None', description: 'Clean chart tooltip without cursor line.' },
      { id: 'tooltip-label-custom', name: 'Tooltip Custom Label', description: 'Tooltip with customized date and time formatting.' },
      { id: 'tooltip-label-formatter', name: 'Tooltip Formatted Values', description: 'Tooltip with localized currency and delta calculations.' },
      { id: 'tooltip-no-label', name: 'Tooltip Minimal Value', description: 'Compact badge tooltip displaying only numeric value.' },
      { id: 'tooltip-formatter', name: 'Tooltip Multi-Series Formatter', description: 'Comparison tooltip detailing series differences.' },
      { id: 'tooltip-icons', name: 'Tooltip with Icons', description: 'Rich tooltip incorporating status icons beside series values.' }
    ]
  };

  const charts = [];

  for (const cat of categories) {
    const list = variantsPerCategory[cat];
    for (const item of list) {
      const svg = generateChartSvg(cat, item.id);
      const html = `<div class="card p-6 flex flex-col gap-4 w-full">
  <div class="border-b border-border pb-3">
    <h3 class="text-base font-semibold">${item.name}</h3>
    <p class="text-sm text-muted-foreground">${item.description}</p>
  </div>
  ${svg}
  <div class="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
    <span>Series Total</span>
    <strong class="tabular-nums font-semibold text-foreground">$14,250.00</strong>
  </div>
</div>`;

      const frameworks = generateFrameworkMounts(item.id, item.name, item.description, html);

      charts.push({
        id: item.id,
        category: cat,
        name: item.name,
        description: item.description,
        tags: ['chart', cat, item.id.replace(/-/g, ' ')],
        cssTokens: [
          'var(--chart-1)',
          'var(--chart-2)',
          'var(--chart-3)',
          'var(--chart-4)',
          'var(--chart-5)'
        ],
        html,
        frameworks
      });
    }
  }

  return {
    schemaVersion: 1,
    totalCharts: charts.length,
    categories,
    charts
  };
}

// ---------------------------------------------------------------------------
// 3. MAIN BUILD ROUTINE
// ---------------------------------------------------------------------------

async function main() {
  console.log('[build-catalogs] Initializing Basecoat UI catalogs build...');
  await mkdir(CATALOG_DIR, { recursive: true });

  // Generate Component Stacks
  const stacksCatalog = generateComponentStacks();
  const stacksPath = join(CATALOG_DIR, 'component-stacks.json');
  await writeFile(stacksPath, JSON.stringify(stacksCatalog, null, 2) + '\n', 'utf8');
  console.log(`[build-catalogs] Successfully generated: ${stacksPath} (${stacksCatalog.stacks.length} stacks across ${stacksCatalog.categories.length} categories)`);

  // Generate Charts Catalog
  const chartsCatalog = generateChartsCatalog();
  const chartsPath = join(CATALOG_DIR, 'charts-catalog.json');
  await writeFile(chartsPath, JSON.stringify(chartsCatalog, null, 2) + '\n', 'utf8');
  console.log(`[build-catalogs] Successfully generated: ${chartsPath} (${chartsCatalog.charts.length} charts across ${chartsCatalog.categories.length} categories)`);

  console.log('[build-catalogs] Complete! All catalogs written deterministically with 0 network calls.');
}

// Run when executed directly
if (process.argv[1] === __filename) {
  main().catch((err) => {
    console.error('[build-catalogs] Build error:', err);
    process.exit(1);
  });
}
