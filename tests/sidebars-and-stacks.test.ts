// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { ensureMacroRegistryLoaded } from '../src/macros/tools.js';
import { getBlock } from '../src/macros/registry.js';
import { runComposeStack } from '../src/tools/compose-stack.js';
import { validateComposition } from '../src/tools/validate.js';

// Canonical daisyUI utility & component classes prohibited in Basecoat UI
const DAISYUI_CLASS_PATTERN =
  /\b(?:btn-(?:primary|secondary|accent|info|success|warning|error|ghost|link|outline|active|disabled|xs|sm|md|lg|circle|square|block)|card-(?:body|title|actions)|navbar(?:-(?:start|center|end))?|badge-(?:primary|secondary|accent|info|success|warning|error|ghost|outline)|drawer-(?:toggle|content|side|overlay)|modal-(?:box|action|backdrop|open)|alert-(?:info|success|warning|error)|stats?|stat-(?:title|value|desc|figure|actions)|chat-(?:start|end|bubble|header|footer)|collapse-(?:title|content)|steps?|step-(?:primary|secondary)|timeline|tabs-(?:boxed|bordered|lifted)|tab-active|join(?:-item)?|indicator(?:-item)?|divider|swap(?:-on|-off)?|toggle-(?:primary|secondary)|checkbox-(?:primary|secondary)|radio-(?:primary|secondary)|range-(?:primary|secondary))\b/;

// Prohibited Tailwind v3 space-between classes (Basecoat uses flex gap-* rhythm)
const SPACE_CLASS_PATTERN = /\bspace-[xy]-(?:\d+(?:\.\d+)?|px)\b/;

describe('Canonical Sidebar Architectures (sidebar-01 .. sidebar-16)', () => {
  it('retrieves all 16 canonical sidebar blocks from compiled macro registry after ensureMacroRegistryLoaded', () => {
    const registry = ensureMacroRegistryLoaded();
    assert(registry, 'Macro registry must be successfully loaded');

    for (let i = 1; i <= 16; i++) {
      const sidebarId = `sidebar-${String(i).padStart(2, '0')}`;
      const block = getBlock(registry, sidebarId);

      assert(block, `Block for ${sidebarId} should exist`);
      assert.equal(block.id, sidebarId, `Block ID must match ${sidebarId}`);
      assert(
        ['navigation', 'application-shell', 'details'].includes(block.role),
        `Block ${sidebarId} role should be valid navigation/shell/details, got: ${block.role}`,
      );
      assert(
        block.fragments && block.fragments.length > 0,
        `Block ${sidebarId} must have at least one fragment`,
      );
      assert(
        block.fragments[0]!.emmet.length > 0,
        `Block ${sidebarId} fragment emmet must not be empty`,
      );
      assert(Array.isArray(block.slots), `Block ${sidebarId} slots must be an array`);
    }
  });

  it('retrieves and renders all 16 canonical sidebar shells from runComposeStack', () => {
    for (let i = 1; i <= 16; i++) {
      const sidebarId = `sidebar-${String(i).padStart(2, '0')}`;
      const output = runComposeStack({ shellId: sidebarId });

      assert.equal(output.shellId, sidebarId, `Shell ID in output must match ${sidebarId}`);
      assert(
        typeof output.html === 'string' && output.html.length > 0,
        `Composed HTML for ${sidebarId} must not be empty`,
      );
      assert(Array.isArray(output.appliedStacks), 'appliedStacks must be an array');
      assert(Array.isArray(output.componentsUsed), 'componentsUsed must be an array');
      assert(output.componentsUsed.length > 0, `componentsUsed for ${sidebarId} should not be empty`);
      assert(Array.isArray(output.fsmContracts), 'fsmContracts must be an array');
      assert(
        output.availableStacksByCategory &&
          typeof output.availableStacksByCategory === 'object',
        'availableStacksByCategory must be populated',
      );
      assert(
        Array.isArray(output.availableStacksByCategory['shell-stacks']),
        'shell-stacks must be present in catalog overview',
      );
      assert(
        output.availableStacksByCategory['shell-stacks'].includes(sidebarId),
        `shell-stacks must include ${sidebarId}`,
      );
    }
  });
});

describe('Canonical Dashboard Architectures (dashboard-01 .. dashboard-07)', () => {
  it('retrieves dashboard-01 through dashboard-07 blocks from the compiled macro registry', () => {
    const registry = ensureMacroRegistryLoaded();
    assert(registry, 'Macro registry must be successfully loaded');

    for (let i = 1; i <= 7; i++) {
      const dashboardId = `dashboard-${String(i).padStart(2, '0')}`;
      const block = getBlock(registry, dashboardId);

      assert(block, `Block for ${dashboardId} should exist`);
      assert.equal(block.id, dashboardId, `Block ID must match ${dashboardId}`);
      assert.equal(block.role, 'dashboard', `Block ${dashboardId} role must be dashboard`);
      assert(
        block.fragments && block.fragments.length > 0,
        `Block ${dashboardId} must have at least one fragment`,
      );
      assert(
        block.fragments[0]!.emmet.length > 0,
        `Block ${dashboardId} fragment emmet must not be empty`,
      );
      assert(Array.isArray(block.slots), `Block ${dashboardId} slots must be an array`);
      assert(block.slots.length > 0, `Block ${dashboardId} must define at least one slot`);
      assert(Array.isArray(block.ruleRefs), `Block ${dashboardId} ruleRefs must be an array`);
    }
  });
});

describe('Dynamic Stack Composition with runComposeStack', () => {
  it('composes full stack using explicit stack IDs into sidebar-07 shell', () => {
    const result = runComposeStack({
      shellId: 'sidebar-07',
      headerId: 'breadcrumb-command-header',
      stacks: [
        'kpi-4-col-delta',
        'area-revenue-stack',
        'data-table-full-crud',
        'detail-inspector-drawer',
        'field-group-settings',
      ],
      title: 'Cloud Fleet Operations',
      density: 'standard',
    });

    assert.equal(result.shellId, 'sidebar-07');
    assert.equal(result.headerId, 'breadcrumb-command-header');
    assert.equal(result.density, 'standard');

    // Verify all applied stacks are recorded
    assert.deepEqual(result.appliedStacks, [
      'breadcrumb-command-header',
      'kpi-4-col-delta',
      'area-revenue-stack',
      'data-table-full-crud',
      'detail-inspector-drawer',
      'field-group-settings',
    ]);

    // Verify components and contracts aggregated across stacks
    assert(result.componentsUsed.includes('sidebar'), 'Must include sidebar component');
    assert(result.componentsUsed.includes('card'), 'Must include card component');
    assert(result.componentsUsed.includes('table'), 'Must include table component');
    assert(result.componentsUsed.includes('drawer'), 'Must include drawer component');
    assert(result.componentsUsed.includes('breadcrumb'), 'Must include breadcrumb component');
    assert(result.componentsUsed.includes('input'), 'Must include input component');

    assert(result.fsmContracts.includes('data-state'), 'Must register data-state FSM');
    assert(result.fsmContracts.includes('data-component'), 'Must register data-component FSM');

    assert(
      result.dependencies.js.includes('basecoat-css/sidebar'),
      'Must depend on basecoat-css/sidebar',
    );
    assert(
      result.dependencies.js.includes('basecoat-css/drawer'),
      'Must depend on basecoat-css/drawer',
    );

    // Verify title injected
    assert(
      result.html.includes('Cloud Fleet Operations'),
      'Custom title must be injected into shell header',
    );
  });

  it('composes full stack using category shorthands (kpi, chart, table, form, overlay)', () => {
    const result = runComposeStack({
      shellId: 'sidebar-07',
      headerId: 'breadcrumb-command-header',
      stacks: ['kpi', 'chart', 'table', 'form', 'overlay'],
    });

    assert.equal(result.shellId, 'sidebar-07');
    assert.equal(result.headerId, 'breadcrumb-command-header');

    // Category shorthands must expand to canonical stack IDs
    assert.deepEqual(result.appliedStacks, [
      'breadcrumb-command-header',
      'kpi-4-col-delta',
      'area-revenue-stack',
      'data-table-full-crud',
      'field-group-settings',
      'detail-inspector-drawer',
    ]);

    assert(result.html.includes('Total Revenue Trend'), 'Chart stack content must be hydrated');
    assert(result.html.includes('Filter transactions...'), 'Table stack content must be hydrated');
    assert(result.html.includes('Security Settings'), 'Form stack content must be hydrated');
    assert(result.html.includes('Order Details'), 'Drawer overlay content must be hydrated');
  });

  it('supports alternative shell architectures: topbar-shell, inset-shell, split-shell', () => {
    const topbar = runComposeStack({ shellId: 'topbar-shell' });
    assert.equal(topbar.shellId, 'topbar-shell');
    assert(topbar.html.includes('topbar-shell') || topbar.html.includes('<header'));
    assert(topbar.componentsUsed.includes('button') || topbar.componentsUsed.includes('avatar'));

    const inset = runComposeStack({ shellId: 'inset-shell' });
    assert.equal(inset.shellId, 'inset-shell');
    assert(inset.fsmContracts.includes('data-state'));
    assert(inset.fsmContracts.includes('data-component'));

    const split = runComposeStack({ shellId: 'split-shell' });
    assert.equal(split.shellId, 'split-shell');
    assert(split.html.length > 0);
  });

  it('handles density profiles (compact, standard, comfortable) and custom page title', () => {
    const baseInput = {
      shellId: 'sidebar-07',
      headerId: 'breadcrumb-command-header',
      stacks: ['kpi-4-col-delta', 'area-revenue-stack', 'data-table-full-crud'],
    };

    const standard = runComposeStack({ ...baseInput, density: 'standard', title: 'Standard Workspace' });
    assert.equal(standard.density, 'standard');
    assert(standard.html.includes('Standard Workspace'));
    assert(standard.html.includes('p-6'), 'Standard density preserves p-6 spacing');
    assert(standard.html.includes('gap-6'), 'Standard density preserves gap-6 spacing');

    const compact = runComposeStack({ ...baseInput, density: 'compact', title: 'Compact Workspace' });
    assert.equal(compact.density, 'compact');
    assert(compact.html.includes('Compact Workspace'));
    assert(compact.html.includes('p-4'), 'Compact density replaces p-6 with p-4');
    assert(compact.html.includes('gap-4'), 'Compact density replaces gap-6 with gap-4');
    assert(!compact.html.includes('p-6'), 'Compact density has no p-6 remaining');

    const comfortable = runComposeStack({ ...baseInput, density: 'comfortable', title: 'Comfortable Workspace' });
    assert.equal(comfortable.density, 'comfortable');
    assert(comfortable.html.includes('Comfortable Workspace'));
    assert(comfortable.html.includes('p-8'), 'Comfortable density replaces p-6 with p-8');
    assert(comfortable.html.includes('gap-8'), 'Comfortable density replaces gap-6 with gap-8');
    assert(!comfortable.html.includes('p-6'), 'Comfortable density has no p-6 remaining');
  });
});

describe('Slot Hydration and Semantic Basecoat HTML Guardrails', () => {
  it('verifies slot hydration replaces default shell slots with composed stack content', () => {
    const defaultShell = runComposeStack({ shellId: 'sidebar-07' });
    // Shell placeholder content before hydration
    assert(defaultShell.html.includes('Overview'), 'Default shell has Overview placeholder');
    assert(defaultShell.html.includes('Recent Transactions'), 'Default shell has Recent Transactions placeholder');
    assert(defaultShell.html.includes('Quick Settings'), 'Default shell has Quick Settings placeholder');

    const composed = runComposeStack({
      shellId: 'sidebar-07',
      headerId: 'breadcrumb-command-header',
      stacks: [
        'kpi-4-col-delta',
        'area-revenue-stack',
        'data-table-full-crud',
        'detail-inspector-drawer',
        'field-group-settings',
      ],
    });

    // Placeholders must be replaced
    assert(!composed.html.includes('Overview'), 'Overview placeholder should be replaced');
    assert(!composed.html.includes('Recent Transactions'), 'Recent Transactions placeholder should be replaced');
    assert(!composed.html.includes('Quick Settings'), 'Quick Settings placeholder should be replaced');

    // Hydrated content must be present
    assert(composed.html.includes('Total Revenue Trend'), 'Hydrated revenue trend chart must be present');
    assert(composed.html.includes('Filter transactions...'), 'Hydrated full CRUD table must be present');
    assert(composed.html.includes('Security Settings'), 'Hydrated settings form must be present');
    assert(composed.html.includes('Order Details'), 'Hydrated inspector drawer must be present');
  });

  it('ensures zero daisyUI classes are present in composed and canonical outputs', () => {
    const outputsToCheck = [
      ...Array.from({ length: 16 }, (_, i) =>
        runComposeStack({ shellId: `sidebar-${String(i + 1).padStart(2, '0')}` }),
      ),
      runComposeStack({ shellId: 'topbar-shell' }),
      runComposeStack({ shellId: 'inset-shell' }),
      runComposeStack({ shellId: 'split-shell' }),
      runComposeStack({
        shellId: 'sidebar-07',
        headerId: 'breadcrumb-command-header',
        stacks: [
          'kpi-4-col-delta',
          'area-revenue-stack',
          'data-table-full-crud',
          'detail-inspector-drawer',
          'field-group-settings',
        ],
      }),
      runComposeStack({
        shellId: 'sidebar-07',
        headerId: 'breadcrumb-command-header',
        stacks: ['kpi', 'chart', 'table', 'form', 'overlay'],
      }),
    ];

    for (const output of outputsToCheck) {
      const match = output.html.match(DAISYUI_CLASS_PATTERN);
      assert.equal(
        match,
        null,
        `Found daisyUI class "${match?.[0]}" in shell "${output.shellId}"`,
      );
    }
  });

  it('ensures zero space-x-* and space-y-* classes are present in composed and canonical outputs', () => {
    const outputsToCheck = [
      ...Array.from({ length: 16 }, (_, i) =>
        runComposeStack({ shellId: `sidebar-${String(i + 1).padStart(2, '0')}` }),
      ),
      runComposeStack({ shellId: 'topbar-shell' }),
      runComposeStack({ shellId: 'inset-shell' }),
      runComposeStack({ shellId: 'split-shell' }),
      runComposeStack({
        shellId: 'sidebar-07',
        headerId: 'breadcrumb-command-header',
        stacks: [
          'kpi-4-col-delta',
          'area-revenue-stack',
          'data-table-full-crud',
          'detail-inspector-drawer',
          'field-group-settings',
        ],
      }),
      runComposeStack({
        shellId: 'sidebar-07',
        headerId: 'breadcrumb-command-header',
        stacks: ['kpi', 'chart', 'table', 'form', 'overlay'],
      }),
    ];

    for (const output of outputsToCheck) {
      const match = output.html.match(SPACE_CLASS_PATTERN);
      assert.equal(
        match,
        null,
        `Found deprecated space-* class "${match?.[0]}" in shell "${output.shellId}"`,
      );
    }
  });

  it('passes composition validation with zero errors and clean semantic structure', () => {
    const composed = runComposeStack({
      shellId: 'sidebar-07',
      headerId: 'breadcrumb-command-header',
      stacks: [
        'kpi-4-col-delta',
        'area-revenue-stack',
        'data-table-full-crud',
        'detail-inspector-drawer',
        'field-group-settings',
      ],
      title: 'Operations Center',
    });

    const validation = validateComposition(composed.html);
    assert.equal(validation.valid, true, 'Composed HTML must be valid');
    const errors = validation.issues.filter(i => i.severity === 'error');
    assert.deepEqual(errors, [], 'Composed HTML must have 0 validation errors');
  });
});

describe('Stage 4 Fidelity: Dashboard-01, Sidebar Semantics, and Modular Stack Composition', () => {
  it('asserts dashboard-01 blueprint matches 1:1 structural fidelity with new-york-v4', () => {
    const registry = ensureMacroRegistryLoaded();
    const d1 = getBlock(registry, 'dashboard-01');
    assert(d1, 'dashboard-01 block must exist in registry');
    assert.equal(d1.role, 'dashboard');

    const emmet = d1.fragments.map(f => f.emmet).join(' ');
    // Responsive shell with container constraint
    assert(emmet.includes('max-w-7xl'), 'dashboard-01 must contain container constraint max-w-7xl');
    assert(emmet.includes('mx-auto'), 'dashboard-01 must contain mx-auto');
    assert(emmet.includes('w-full'), 'dashboard-01 must contain w-full');
    assert(emmet.includes('px-6'), 'dashboard-01 must contain px-6');
    assert(emmet.includes('py-8'), 'dashboard-01 must contain py-8');

    // 2-column grid
    assert(emmet.includes('lg:grid-cols-7'), 'dashboard-01 must contain 2-column grid lg:grid-cols-7');
    assert(emmet.includes('lg:col-span-4'), 'dashboard-01 must contain Column 1 lg:col-span-4');
    assert(emmet.includes('lg:col-span-3'), 'dashboard-01 must contain Column 2 lg:col-span-3');

    // Interactive chart & recent sales slots
    assert(emmet.includes('data-slot=chart') || emmet.includes('chart'), 'dashboard-01 must contain chart slot');
    assert(emmet.includes('data-chart-id=area-interactive'), 'dashboard-01 must contain area-interactive chart id');
    assert(emmet.includes('data-slot=recent-sales') || emmet.includes('recent-sales'), 'dashboard-01 must contain recent-sales slot');
    assert(emmet.includes('kpi'), 'dashboard-01 must contain kpi slot');

    // Slot definitions
    const slotIds = d1.slots.map(s => s.id);
    assert(slotIds.includes('topbar'), 'dashboard-01 must define topbar slot');
    assert(slotIds.includes('kpi'), 'dashboard-01 must define kpi slot');
    assert(slotIds.includes('chart'), 'dashboard-01 must define chart slot');
    assert(slotIds.includes('recent-sales'), 'dashboard-01 must define recent-sales slot');

    // Mounts
    assert.equal(d1.mounts.length, 3, 'dashboard-01 must define 3 mounts for modular fragments');
  });

  it('verifies all 16 sidebar macro blocks and shell stacks include semantic HTML landmarks', () => {
    const registry = ensureMacroRegistryLoaded();

    for (let i = 1; i <= 16; i++) {
      const pad = String(i).padStart(2, '0');
      const sidebarId = `sidebar-${pad}`;

      // 1. Macro block check
      const block = getBlock(registry, sidebarId);
      assert(block, `Macro block ${sidebarId} must exist`);
      const blockEmmet = block.fragments.map(f => f.emmet).join(' ');
      assert(blockEmmet.includes('aside'), `Macro block ${sidebarId} must include <aside>`);
      assert(blockEmmet.includes('nav'), `Macro block ${sidebarId} must include <nav>`);
      assert(
        blockEmmet.includes('aria-current=page'),
        `Macro block ${sidebarId} must include aria-current=page landmark`,
      );

      // 2. Shell stack check
      const shellOutput = runComposeStack({ shellId: sidebarId });
      assert(shellOutput.html.includes('<aside'), `Shell stack ${sidebarId} must include <aside>`);
      assert(shellOutput.html.includes('<nav'), `Shell stack ${sidebarId} must include <nav>`);
      assert(
        shellOutput.html.includes('aria-current="page"'),
        `Shell stack ${sidebarId} must include aria-current="page" on active item`,
      );
    }

    // Verify presence of specific landmark attributes across sidebar suite
    const s7 = runComposeStack({ shellId: 'sidebar-07' });
    assert(s7.html.includes('data-collapsible="icon"'), 'sidebar-07 must specify data-collapsible="icon"');

    const s8 = runComposeStack({ shellId: 'sidebar-08' });
    assert(s8.html.includes('data-variant="inset"'), 'sidebar-08 must specify data-variant="inset"');

    const s1 = runComposeStack({ shellId: 'sidebar-01' });
    assert(s1.html.includes('<details'), 'sidebar-01 must specify <details> for collapsible sections');
  });

  it('runs runComposeStack with empty object {} returning default sidebar-01 and hydrated stacks', () => {
    const res = runComposeStack({});
    assert.equal(res.shellId, 'sidebar-01', 'Default shell must be sidebar-01');
    assert.equal(res.environment, 'html', 'Default environment must be html');
    assert(res.appliedStacks.length >= 3, 'Empty invocation must hydrate default modular stacks');
    assert(res.html.includes('sidebar'), 'Composed HTML must contain sidebar shell');
    assert(res.html.includes('tabular-nums'), 'Composed HTML must contain hydrated metrics/table');
  });

  it('supports Poka-Yoke aliases for shellId: id, componentId, name, shell', () => {
    assert.equal(runComposeStack({ id: 'sidebar-02' }).shellId, 'sidebar-02');
    assert.equal(runComposeStack({ componentId: 'sidebar-03' }).shellId, 'sidebar-03');
    assert.equal(runComposeStack({ name: 'sidebar-04' }).shellId, 'sidebar-04');
    assert.equal(runComposeStack({ shell: 'sidebar-05' }).shellId, 'sidebar-05');
  });

  it('composes modular stacks as an array across sidebar-01..16, topbar-shell, and inset-shell', () => {
    const modularStacks = [
      'kpi-4-col',
      'area-chart-overview',
      'data-table-full-crud',
      'recent-sales-feed',
      'detail-drawer',
    ];

    const shellsToTest = [
      'sidebar-01',
      'sidebar-07',
      'sidebar-16',
      'topbar-shell',
      'inset-shell',
    ];

    for (const shellId of shellsToTest) {
      const res = runComposeStack({ shellId, stacks: modularStacks });
      assert.equal(res.shellId, shellId);
      assert(res.appliedStacks.includes('recent-sales-feed'), 'recent-sales-feed must be in appliedStacks');
      assert(res.html.includes('Recent Sales'), 'Recent Sales heading must be hydrated');
      assert(res.html.includes('Olivia Martin'), 'Customer avatar/name must be hydrated in feed');
      assert(res.html.includes('+$1,999.00'), 'Tabular-nums transaction amount must be hydrated');
      assert(res.html.includes('Order Details'), 'Drawer content must be hydrated');
    }
  });

  it('composes modular stacks as a record mapping slots to stack IDs', () => {
    const recordStacks = {
      kpi: 'kpi-4-col',
      chart: 'area-chart-overview',
      table: 'data-table-full-crud',
      'recent-sales': 'recent-sales-feed',
      drawer: 'detail-drawer',
    };

    const res = runComposeStack({
      shellId: 'sidebar-01',
      stacks: recordStacks,
    });

    assert.equal(res.shellId, 'sidebar-01');
    assert(res.appliedStacks.includes('kpi-4-col'));
    assert(res.appliedStacks.includes('area-chart-overview'));
    assert(res.appliedStacks.includes('data-table-full-crud'));
    assert(res.appliedStacks.includes('recent-sales-feed'));
    assert(res.appliedStacks.includes('detail-drawer'));
    assert(res.html.includes('Recent Sales'), 'Recent sales feed must be hydrated');
    assert(res.html.includes('Olivia Martin'), 'Feed customer must be hydrated');
    assert(res.html.includes('Order Details'), 'Drawer must be hydrated');
  });
});
