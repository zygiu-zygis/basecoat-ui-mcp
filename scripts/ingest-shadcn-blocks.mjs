// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Ingestion & translation pipeline for shadcn/ui new-york-v4 blocks into Basecoat UI macros.
// Translates React/Radix JSX into semantic HTML + Tailwind CSS v4 Emmet macros with clean fallbacks.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const BLOCKS_DIR = join(ROOT, 'src/macros/authoring/blocks');
const RECIPES_DIR = join(ROOT, 'src/macros/authoring/recipes');
const GENERATED_DIR = join(ROOT, 'src/macros/generated');
const SNAPSHOT_PATH = join(ROOT, 'src/macros/registry.snapshot.json');
const GENERATED_SNAPSHOT_PATH = join(GENERATED_DIR, 'registry.snapshot.json');

const UPSTREAM_V4_BASE = 'https://ui.shadcn.com/r/styles/new-york-v4';
const FETCH_TIMEOUT_MS = 5000;

function sha256(text) {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/**
 * Fetch a shadcn/ui new-york-v4 block registry item with timeout.
 * Returns null if network is unavailable or returns non-200.
 */
async function fetchUpstreamBlock(blockName) {
  const url = `${UPSTREAM_V4_BASE}/${blockName}.json`;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return { data, raw: JSON.stringify(data), url };
  } catch {
    return null;
  }
}

/**
 * Translation Pipeline for React/Radix abstractions:
 * 1. Strips React/Radix JSX tags: <Card>, <Button>, <Table>, <Tabs>, etc.
 * 2. Compiles into clean semantic HTML tags with Basecoat + Tailwind CSS v4 utilities.
 * 3. Preserves headless data-state attributes (data-state="open", data-state="active", etc.).
 * 4. Replaces proprietary icon imports with standardized SVG icon slots (svg[aria-hidden=true]).
 * 5. Normalizes spacing to rhythm scale (0, 2, 4, 6, 8, 12).
 */
export function translateReactJsxToEmmet(sourceJsx) {
  let translated = sourceJsx;

  // Replace Lucide/Tabler icon tags with standardized SVG icon slots
  translated = translated.replace(
    /<(?:Lucide[A-Z][a-zA-Z0-9]*|[A-Z][a-zA-Z0-9]*Icon)\s*([^>]*)\/?>/g,
    'svg[aria-hidden=true].size-4',
  );

  // Map Radix / Shadcn components to semantic HTML + Basecoat classes
  const tagMap = [
    [/<Card\b[^>]*>/g, 'div.card'],
    [/<\/Card>/g, ''],
    [/<CardHeader\b[^>]*>/g, 'header.flex.flex-col.gap-2'],
    [/<\/CardHeader>/g, ''],
    [/<CardTitle\b[^>]*>/g, 'h3.text-lg.font-semibold'],
    [/<\/CardTitle>/g, ''],
    [/<CardDescription\b[^>]*>/g, 'p.text-xs.text-muted-foreground'],
    [/<\/CardDescription>/g, ''],
    [/<CardContent\b[^>]*>/g, 'div.flex.flex-col.gap-4'],
    [/<\/CardContent>/g, ''],
    [/<CardFooter\b[^>]*>/g, 'footer.flex.items-center.gap-2'],
    [/<\/CardFooter>/g, ''],
    [/<Button\b[^>]*variant="outline"[^>]*>/g, 'button.btn.btn-sm.btn-outline'],
    [/<Button\b[^>]*variant="ghost"[^>]*>/g, 'button.btn.btn-sm.btn-ghost'],
    [/<Button\b[^>]*variant="destructive"[^>]*>/g, 'button.btn.btn-sm.btn-destructive'],
    [/<Button\b[^>]*>/g, 'button.btn.btn-sm.btn-primary'],
    [/<\/Button>/g, ''],
    [/<Badge\b[^>]*>/g, 'span.badge'],
    [/<\/Badge>/g, ''],
    [/<Input\b([^>]*)\/?>/g, 'input.input.input-sm$1'],
    [/<Label\b[^>]*>/g, 'label.text-xs.font-medium'],
    [/<\/Label>/g, ''],
    [/<Field\b[^>]*>/g, 'div[data-component=field]'],
    [/<\/Field>/g, ''],
    [/<FieldGroup\b[^>]*>/g, 'div.flex.flex-col.gap-4'],
    [/<\/FieldGroup>/g, ''],
    [/<FieldLabel\b[^>]*>/g, 'label.text-xs.font-medium'],
    [/<\/FieldLabel>/g, ''],
    [/<Table\b[^>]*>/g, 'table.table.w-full'],
    [/<\/Table>/g, ''],
    [/<TableHeader\b[^>]*>/g, 'thead'],
    [/<\/TableHeader>/g, ''],
    [/<TableBody\b[^>]*>/g, 'tbody'],
    [/<\/TableBody>/g, ''],
    [/<TableRow\b[^>]*>/g, 'tr'],
    [/<\/TableRow>/g, ''],
    [/<TableHead\b[^>]*>/g, 'th.px-4.py-2.font-medium'],
    [/<\/TableHead>/g, ''],
    [/<TableCell\b[^>]*>/g, 'td.px-4.py-2'],
    [/<\/TableCell>/g, ''],
    [/<Tabs\b[^>]*>/g, 'div.tabs'],
    [/<\/Tabs>/g, ''],
    [/<TabsList\b[^>]*>/g, 'nav[role=tablist].flex.gap-2'],
    [/<\/TabsList>/g, ''],
    [/<TabsTrigger\b[^>]*>/g, 'button[role=tab].btn.btn-sm'],
    [/<\/TabsTrigger>/g, ''],
    [/<TabsContent\b[^>]*>/g, 'div[role=tabpanel]'],
    [/<\/TabsContent>/g, ''],
    [/<DropdownMenu\b[^>]*>/g, 'div[data-component=dropdown-menu]'],
    [/<\/DropdownMenu>/g, ''],
    [/<Dialog\b[^>]*>/g, 'dialog'],
    [/<\/Dialog>/g, ''],
  ];

  for (const [pattern, replacement] of tagMap) {
    translated = translated.replace(pattern, replacement);
  }

  // Normalize spacing to rhythm scale (0, 2, 4, 6, 8, 12)
  translated = normalizeSpacingUtilities(translated);

  return translated;
}

/**
 * Normalizes any Tailwind spacing utilities to approved rhythm steps: 0, 2, 4, 6, 8, 12.
 */
function normalizeSpacingUtilities(emmet) {
  return emmet.replace(
    /(gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(\d+(?:\.\d+)?)/g,
    (match, prop, val) => {
      const n = Number.parseFloat(val);
      let approved = 0;
      if (n <= 1) approved = 0;
      else if (n <= 3) approved = 2;
      else if (n <= 5) approved = 4;
      else if (n <= 7) approved = 6;
      else if (n <= 10) approved = 8;
      else approved = 12;
      return `${prop}-${approved}`;
    },
  );
}

const APPROVED_MACRO_SPACING = new Set(['0', '2', '4', '6', '8', '12']);
const EMMET_SPACING =
  /(?:^|[.>+*^()\[\],\s])(?:(?:sm|md|lg|xl|2xl):)?(!?)(-?)(gap(?:-[xy])?|space-[xy]|[mp][trblxyse]?)-(\d+(?:\.\d+)?)(?=[.>+*^()\[\],\s]|$)/g;

function assertValidSpacing(emmet, blockId, fragId) {
  EMMET_SPACING.lastIndex = 0;
  let match;
  while ((match = EMMET_SPACING.exec(emmet)) !== null) {
    const family = match[3];
    const val = match[4];
    if (family.startsWith('m') && val === 'auto') continue;
    if (!APPROVED_MACRO_SPACING.has(val)) {
      throw new Error(`Block ${blockId} fragment ${fragId} uses unapproved spacing '${match[0]}'`);
    }
  }
}

function makeProvenance(upstream, blockId) {
  if (upstream) {
    return {
      origin: 'authored',
      sourceHashes: { [`upstream:${blockId}`]: sha256(upstream.raw) },
      mappingVersion: '1.0.0',
    };
  }
  return {
    origin: 'authored',
    sourceHashes: {},
    mappingVersion: '1.0.0',
  };
}

/**
 * Registry of Curated Authoring Blocks for Ingestion & Synthesis
 */
function buildAuthoringBlocks(upstreamMap) {
  const blocks = {};

  // -------------------------------------------------------------------------
  // 1. Core / Helper Authoring Blocks
  // -------------------------------------------------------------------------

  // KPI/metric summary cards
  blocks['metrics-summary'] = {
    schemaVersion: 1,
    id: 'metrics-summary',
    role: 'metrics',
    family: 'workspace',
    description: 'KPI and metric summary cards: 4-card responsive grid with trend delta badges, primary values, and comparative helper text.',
    tags: ['dashboard', 'cards', 'metrics', 'kpi', 'responsive', 'states'],
    root: 'metrics-root',
    fragments: [
      {
        id: 'metrics-root',
        emmet: 'div.grid.grid-cols-1.gap-4.md:gap-6.md:grid-cols-2.lg:grid-cols-4[data-slot=metrics-summary]>article.card.flex.min-h-32.min-w-0.flex-col.gap-4.rounded-xl.bg-card.p-6.text-card-foreground.shadow-sm[data-slot=card-$]*4>(header.flex.items-center.justify-between>span.text-sm.font-medium.text-muted-foreground[data-slot=title]{Total Revenue}+span.badge.rounded-full.border.border-border.px-2.text-xs.font-medium[data-variant=outline][data-slot=delta]{+12%})+div.flex.flex-col.gap-2>strong.text-2xl.font-semibold.tabular-nums[data-slot=value]{$45,231.89}+p.text-xs.text-muted-foreground[data-slot=helper]{+20.1% from last month})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'card-1', at: { fragment: 'metrics-root', name: 'card-1' }, accepts: ['kpi'], min: 0, max: 1 },
      { id: 'card-2', at: { fragment: 'metrics-root', name: 'card-2' }, accepts: ['kpi'], min: 0, max: 1 },
      { id: 'card-3', at: { fragment: 'metrics-root', name: 'card-3' }, accepts: ['kpi'], min: 0, max: 1 },
      { id: 'card-4', at: { fragment: 'metrics-root', name: 'card-4' }, accepts: ['kpi'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'metrics-in', at: { fragment: 'metrics-root', name: 'metrics-root' }, direction: 'in', kind: 'region', contract: 'metrics', minLinks: 0, maxLinks: 1, scope: 'page' },
    ],
    componentRefs: ['card', 'badge'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'metrics-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // Data table rich
  blocks['data-table-rich'] = {
    schemaVersion: 1,
    id: 'data-table-rich',
    role: 'table',
    family: 'data',
    description: 'Rich data table with filter toolbar, bulk action bar, row action dropdown, sticky header & pagination.',
    tags: ['data', 'table', 'filters', 'pagination', 'bulk-actions', 'responsive'],
    root: 'table-root',
    fragments: [
      {
        id: 'table-root',
        emmet: 'div.flex.flex-col.gap-4.rounded-xl.border.border-border.bg-card.p-4.text-card-foreground[data-component=data-table-rich][data-slot=table-host]>(div.flex.items-center.justify-between.gap-4[data-slot=toolbar]>div.flex.flex-1.items-center.gap-2>input.input.input-sm.w-64[type=search][placeholder=\'Filter records...\'][data-slot=search]+button.btn.btn-sm.btn-outline[data-slot=filter-status]{Status: All}+button.btn.btn-sm.btn-outline[data-slot=view-options]{View})+(div.flex.items-center.justify-between.rounded-lg.bg-muted.px-4.py-2.text-sm[data-slot=bulk-actions][data-state=inactive]>span.font-medium{0 selected}+div.flex.items-center.gap-2>button.btn.btn-xs.btn-outline{Export}+button.btn.btn-xs.btn-destructive{Delete})+div[data-slot=table-body]+(div.flex.items-center.justify-between.gap-4.px-2.py-2[data-slot=pagination]>span.text-xs.text-muted-foreground{Showing 1 to 10 of 100 entries}+div.flex.items-center.gap-2>button.btn.btn-sm.btn-outline[disabled]{Previous}+button.btn.btn-sm.btn-outline{Next})',
      },
      {
        id: 'table-body',
        emmet: 'div.relative.overflow-auto.rounded-lg.border.border-border[data-slot=table-scroll]>table.table.w-full.text-sm>thead.sticky.top-0.border-b.border-border.bg-background>tr>th.h-10.px-4.text-left.font-medium[data-slot=th-select]>input.checkbox.checkbox-sm[type=checkbox]+th.h-10.px-4.text-left.font-medium{Task}+th.h-10.px-4.text-left.font-medium{Status}+th.h-10.px-4.text-right.font-medium{Actions}^tbody.divide-y.divide-border>tr.hover:bg-muted*2>td.px-4.py-2>input.checkbox.checkbox-sm[type=checkbox]+td.px-4.py-2.font-mono.text-xs{TASK-$}+td.px-4.py-2>span.badge.badge-outline.text-xs{In Progress}+td.px-4.py-2.text-right>button.btn.btn-ghost.btn-xs[aria-haspopup=menu][data-state=closed][aria-label=Actions]>svg[aria-hidden=true].size-4',
      },
    ],
    mounts: [
      { parent: 'table-root', anchor: 'table-body', child: 'table-body', order: 0 },
    ],
    slots: [],
    ports: [
      { id: 'dataset-in', at: { fragment: 'table-root', name: 'table-root' }, direction: 'in', kind: 'data', contract: 'dataset', minLinks: 0, maxLinks: 1, scope: 'page' },
      { id: 'dataset-out', at: { fragment: 'table-root', name: 'table-root' }, direction: 'out', kind: 'data', contract: 'dataset', minLinks: 0, maxLinks: 1, scope: 'page' },
    ],
    componentRefs: ['table', 'button', 'input', 'checkbox', 'badge', 'dropdown-menu', 'pagination'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'table-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // Form field group
  blocks['form-field-group'] = {
    schemaVersion: 1,
    id: 'form-field-group',
    role: 'form',
    family: 'form',
    description: 'Form field group layout with reactive validation feedback states, helper copy, and loading FSM submit actions.',
    tags: ['form', 'fields', 'validation', 'states', 'actions'],
    root: 'form-root',
    fragments: [
      {
        id: 'form-root',
        emmet: 'form.flex.flex-col.gap-6.rounded-xl.border.border-border.bg-card.p-6.text-card-foreground.shadow-sm[data-component=form-field-group][data-fsm-recipe=form-flow][data-fsm-state=idle][data-slot=form-host]>(div.flex.flex-col.gap-2>h2.text-lg.font-semibold[data-slot=form-title]{Account Details}+p.text-xs.text-muted-foreground[data-slot=form-desc]{Update your profile and notification preferences.})+div[data-slot=form-fields]+(div.flex.items-center.justify-end.gap-4.pt-2[data-slot=actions]>button.btn.btn-sm.btn-ghost[type=button]{Cancel}+button.btn.btn-sm.btn-primary[type=submit][data-state=idle]>svg[aria-hidden=true].size-4+span{Save Changes})',
      },
      {
        id: 'form-fields',
        emmet: 'div.flex.flex-col.gap-4[data-slot=fields]>(div.flex.flex-col.gap-2[data-slot=field-name]>label.text-xs.font-medium[for=name]{Full Name}+input.input.input-sm#name[type=text][placeholder=\'Jane Doe\'][required][data-state=valid]+p.text-xs.text-muted-foreground{Displayed on your public profile.})+(div.flex.flex-col.gap-2[data-slot=field-email]>label.text-xs.font-medium[for=email]{Email Address}+input.input.input-sm#email[type=email][placeholder=\'jane@example.com\'][required][data-state=valid]+p.text-xs.text-destructive[data-state=invalid]{Please enter a valid email address.})+(div.flex.flex-col.gap-2[data-slot=field-bio]>label.text-xs.font-medium[for=bio]{Bio}+textarea.textarea.textarea-sm#bio[placeholder=\'Brief description...\'][rows=3]+p.text-xs.text-muted-foreground{Max 250 characters.})',
      },
    ],
    mounts: [
      { parent: 'form-root', anchor: 'form-fields', child: 'form-fields', order: 0 },
    ],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'textarea', 'label', 'field'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'form-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // -------------------------------------------------------------------------
  // 2. Sidebar Architectures (sidebar-01 through sidebar-16)
  // -------------------------------------------------------------------------

  // sidebar-01: Grouped navigation sidebar with <details> collapsible sections
  blocks['sidebar-01'] = {
    schemaVersion: 1,
    id: 'sidebar-01',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-01']?.data?.description ?? 'Grouped navigation sidebar with <details> collapsible sections, workspace switcher header, and user profile footer.',
    tags: ['navigation', 'sidebar', 'collapsible', 'details', 'grouped'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-64.border-e.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=Sidebar][data-slot=sidebar-host][data-component=sidebar][data-side=left]>nav.flex.h-full.flex-col.justify-between.p-2>(div.flex.flex-col.gap-2>div.flex.items-center.gap-2.p-2.text-sm.font-semibold[data-slot=workspace-switcher]{Acme Corp}+details.group[open]>summary.flex.items-center.justify-between.p-2.text-xs.font-medium.cursor-pointer.hover:bg-muted{Getting Started+span{▾}}+div.flex.flex-col.gap-2.pl-4>a.btn.btn-ghost.btn-sm.justify-start[data-state=active]{Installation}+a.btn.btn-ghost.btn-sm.justify-start{Structure}^details.group[open]>summary.flex.items-center.justify-between.p-2.text-xs.font-medium.cursor-pointer.hover:bg-muted{Building Apps+span{▾}}+div.flex.flex-col.gap-2.pl-4>a.btn.btn-ghost.btn-sm.justify-start{Routing}+a.btn.btn-ghost.btn-sm.justify-start{Fetching})+(div.mt-auto.p-2.border-t.border-border[data-slot=user-footer]>div.flex.items-center.gap-2>div.size-8.rounded.bg-muted+div.text-xs>span.font-medium{shadcn})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'workspace-switcher', at: { fragment: 'nav-root', name: 'workspace-switcher' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-01'], 'sidebar-01'),
  };

  // sidebar-02: Collapsible sections sidebar with workspace switcher header
  blocks['sidebar-02'] = {
    schemaVersion: 1,
    id: 'sidebar-02',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-02']?.data?.description ?? 'Collapsible sections sidebar with workspace switcher header, chevron triggers, and collapsible nav groups.',
    tags: ['navigation', 'sidebar', 'collapsible-sections', 'workspace-switcher'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-64.border-e.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=Sidebar][data-slot=sidebar-host][data-component=sidebar][data-side=left]>nav.flex.h-full.flex-col.justify-between.p-2>(div.flex.flex-col.gap-4>div.flex.items-center.justify-between.rounded-lg.border.border-border.p-2.text-sm.font-semibold[data-slot=workspace-switcher]>div.flex.items-center.gap-2>div.size-6.rounded.bg-primary+span{Workspace}^button.btn.btn-ghost.btn-xs{↕}^section.flex.flex-col.gap-2>span.px-2.text-xs.text-muted-foreground{Platform}+details.group[open]>summary.flex.items-center.justify-between.p-2.text-xs.cursor-pointer.hover:bg-muted{Playground+span{▾}}+div.flex.flex-col.gap-2.pl-4>a.btn.btn-ghost.btn-sm.justify-start{History}+a.btn.btn-ghost.btn-sm.justify-start{Starred}^^section.flex.flex-col.gap-2>span.px-2.text-xs.text-muted-foreground{Projects}+a.btn.btn-ghost.btn-sm.justify-start{Design}+a.btn.btn-ghost.btn-sm.justify-start{Sales})+(div.mt-auto.p-2.border-t.border-border[data-slot=user-footer]>div.flex.items-center.gap-2>div.size-8.rounded.bg-muted+div.text-xs>span.font-medium{User})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'workspace-switcher', at: { fragment: 'nav-root', name: 'workspace-switcher' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-02'], 'sidebar-02'),
  };

  // sidebar-03: Nested submenu navigation sidebar
  blocks['sidebar-03'] = {
    schemaVersion: 1,
    id: 'sidebar-03',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-03']?.data?.description ?? 'Nested submenu navigation sidebar with multi-level hierarchical link trees and active state indicators.',
    tags: ['navigation', 'sidebar', 'nested-submenu', 'hierarchy'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-64.border-e.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=Sidebar][data-slot=sidebar-host][data-component=sidebar][data-side=left]>nav.flex.h-full.flex-col.justify-between.p-2>(div.flex.flex-col.gap-4>div.p-2.text-sm.font-semibold[data-slot=header]{Documentation}+div.flex.flex-col.gap-2[data-slot=nav-tree]>div.flex.flex-col.gap-2>span.px-2.text-xs.font-semibold{Core Concepts}+a.btn.btn-ghost.btn-sm.justify-start.pl-4[data-state=active]{Overview}+div.flex.flex-col.gap-2.pl-6>a.text-xs.text-muted-foreground.hover:underline{Architecture}+a.text-xs.text-muted-foreground.hover:underline{Rendering}^a.btn.btn-ghost.btn-sm.justify-start.pl-4{State Machines}+div.flex.flex-col.gap-2.pl-6>a.text-xs.text-muted-foreground.hover:underline{FSM Patterns}+a.text-xs.text-muted-foreground.hover:underline{Transitions}})+(div.mt-auto.p-2.border-t.border-border[data-slot=user-footer]>a.btn.btn-ghost.btn-sm.w-full.justify-start{Support})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'header', at: { fragment: 'nav-root', name: 'header' }, accepts: ['action', 'navigation'], min: 0, max: 1 },
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-03'], 'sidebar-03'),
  };

  // sidebar-04: Floating sidebar with rounded card container (data-variant="floating")
  blocks['sidebar-04'] = {
    schemaVersion: 1,
    id: 'sidebar-04',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-04']?.data?.description ?? 'Floating sidebar with rounded card container (data-variant="floating") detached from viewport edges.',
    tags: ['navigation', 'sidebar', 'floating', 'card-container'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.p-4.md:sticky.md:top-0.md:h-screen[aria-label=Sidebar][data-slot=sidebar-host][data-component=sidebar][data-variant=floating][data-side=left]>div.card.flex.h-full.w-64.flex-col.justify-between.rounded-xl.border.border-border.bg-card.p-4.shadow-md>div.flex.flex-col.gap-4>(div.flex.items-center.gap-2.p-2.text-sm.font-semibold[data-slot=workspace-switcher]>div.size-6.rounded.bg-primary+span{Acme Inc})+nav.flex.flex-col.gap-2[aria-label=FloatingNav]>a.btn.btn-ghost.btn-sm.justify-start[data-state=active]{Dashboard}+a.btn.btn-ghost.btn-sm.justify-start{Analytics}+a.btn.btn-ghost.btn-sm.justify-start{Projects}+a.btn.btn-ghost.btn-sm.justify-start{Settings}^div.mt-auto.flex.flex-col.gap-2.border-t.border-border.pt-2[data-slot=user-footer]>div.flex.items-center.gap-2.p-2>div.size-8.rounded-full.bg-muted+div.flex-1.text-xs>span.font-medium{Alex}+span.text-muted-foreground{alex@acme.inc}',
      },
    ],
    mounts: [],
    slots: [
      { id: 'workspace-switcher', at: { fragment: 'nav-root', name: 'workspace-switcher' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button', 'card'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-04'], 'sidebar-04'),
  };

  // sidebar-05: Collapsible submenu tree sidebar with active state indicators
  blocks['sidebar-05'] = {
    schemaVersion: 1,
    id: 'sidebar-05',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-05']?.data?.description ?? 'Collapsible submenu tree sidebar with active state indicators and nested route accordions.',
    tags: ['navigation', 'sidebar', 'collapsible-tree', 'active-indicators'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-64.border-e.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=Sidebar][data-slot=sidebar-host][data-component=sidebar][data-side=left]>nav.flex.h-full.flex-col.justify-between.p-2>(div.flex.flex-col.gap-2>div.p-2.text-sm.font-semibold[data-slot=brand]{Enterprise App}+div.flex.flex-col.gap-2[data-slot=menu-tree]>details.group[open]>summary.flex.items-center.justify-between.p-2.text-xs.font-medium.cursor-pointer.hover:bg-muted{Analytics+span{▾}}+div.flex.flex-col.gap-2.pl-4>a.btn.btn-ghost.btn-sm.justify-start.border-l-2.border-primary.pl-2[data-state=active]{Realtime}+a.btn.btn-ghost.btn-sm.justify-start.pl-2{Conversions}^details.group>summary.flex.items-center.justify-between.p-2.text-xs.font-medium.cursor-pointer.hover:bg-muted{Reports+span{▾}}+div.flex.flex-col.gap-2.pl-4>a.btn.btn-ghost.btn-sm.justify-start.pl-2{Scheduled}+a.btn.btn-ghost.btn-sm.justify-start.pl-2{Custom})+(div.mt-auto.p-2.border-t.border-border[data-slot=user-footer]>span.text-xs.text-muted-foreground{v2.4.0-stable})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'brand', at: { fragment: 'nav-root', name: 'brand' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-05'], 'sidebar-05'),
  };

  // sidebar-06: Compact sidebar with popover/dropdown submenus
  blocks['sidebar-06'] = {
    schemaVersion: 1,
    id: 'sidebar-06',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-06']?.data?.description ?? 'Compact sidebar with popover/dropdown submenus for dense navigation spaces.',
    tags: ['navigation', 'sidebar', 'compact', 'popover-menus', 'dropdown'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-56.border-e.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=Sidebar][data-slot=sidebar-host][data-component=sidebar][data-variant=compact][data-side=left]>nav.flex.h-full.flex-col.justify-between.p-2>(div.flex.flex-col.gap-2>div.flex.items-center.gap-2.p-2[data-slot=header]>div.size-6.rounded.bg-primary+span.text-sm.font-semibold{SaaS Kit}+div.flex.flex-col.gap-2[data-slot=nav-items]>div.relative>button.btn.btn-ghost.btn-sm.w-full.justify-between[data-slot=menu-trigger][aria-haspopup=menu]{Workspace+span{▸}}+div.relative>button.btn.btn-ghost.btn-sm.w-full.justify-between[data-slot=menu-trigger][aria-haspopup=menu]{Billing+span{▸}}+div.relative>button.btn.btn-ghost.btn-sm.w-full.justify-between[data-slot=menu-trigger][aria-haspopup=menu]{Integrations+span{▸}})+(div.mt-auto.p-2.border-t.border-border[data-slot=user-footer]>button.btn.btn-ghost.btn-sm.w-full.justify-start{Settings})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'header', at: { fragment: 'nav-root', name: 'header' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-06'], 'sidebar-06'),
  };

  // sidebar-07: Collapsible icon-rail sidebar (data-collapsible="icon")
  blocks['sidebar-07'] = {
    schemaVersion: 1,
    id: 'sidebar-07',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-07']?.data?.description ?? 'Collapsible icon-rail sidebar (data-collapsible="icon") with icon button targets, badge notifications, and profile avatar.',
    tags: ['navigation', 'sidebar', 'icon-rail', 'collapsible-icon'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-16.border-e.border-border.bg-background.flex.flex-col.items-center.py-4.gap-4.md:sticky.md:top-0.md:h-screen[aria-label=Sidebar][data-slot=sidebar-host][data-component=sidebar][data-collapsible=icon][data-side=left]>(button.btn.btn-ghost.size-10.rounded-lg[data-slot=workspace-switcher][aria-label=Home]>div.size-6.rounded.bg-primary)+nav.flex.flex-col.gap-2.flex-1.items-center[aria-label=IconNav]>button.btn.btn-ghost.size-10.rounded-lg[data-state=active][aria-label=Dashboard]>span{D}^button.btn.btn-ghost.size-10.rounded-lg.relative[aria-label=Notifications]>span{N}+span.badge.size-4.rounded-full.p-0.text-xs{3}^button.btn.btn-ghost.size-10.rounded-lg[aria-label=Analytics]>span{A}^button.btn.btn-ghost.size-10.rounded-lg[aria-label=Settings]>span{S}^div.mt-auto.flex.flex-col.gap-2.items-center[data-slot=user-footer]>div.size-8.rounded-full.bg-muted[aria-label=User]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'workspace-switcher', at: { fragment: 'nav-root', name: 'workspace-switcher' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-07'], 'sidebar-07'),
  };

  // sidebar-08: Inset sidebar shell (data-variant="inset") with rounded main viewport
  blocks['sidebar-08'] = {
    schemaVersion: 1,
    id: 'sidebar-08',
    role: 'application-shell',
    family: 'layout',
    description: upstreamMap['sidebar-08']?.data?.description ?? 'Inset sidebar shell (data-variant="inset") with rounded main viewport canvas, header breadcrumb, and navigation slots.',
    tags: ['shell', 'sidebar', 'inset', 'workspace-shell'],
    root: 'shell-root',
    fragments: [
      {
        id: 'shell-root',
        emmet: 'div.flex.min-h-screen.w-full.bg-muted[data-slot=shell-root][data-component=sidebar][data-variant=inset]>aside.sidebar.w-64.bg-muted.p-4[data-slot=navigation][data-side=left]>div.flex.flex-col.gap-4>div.p-2.text-sm.font-semibold{Acme Inset}+nav.flex.flex-col.gap-2>a.btn.btn-ghost.btn-sm.justify-start[data-state=active]{Dashboard}+a.btn.btn-ghost.btn-sm.justify-start{Documents}+a.btn.btn-ghost.btn-sm.justify-start{Settings}^div.mt-auto.pt-4{User}^^div.flex.flex-1.flex-col.p-2>div.flex.flex-1.flex-col.rounded-xl.border.border-border.bg-background.shadow-sm[data-slot=inset-canvas]>header.flex.h-12.items-center.justify-between.border-b.border-border.px-4[data-slot=header]>span.text-sm.font-medium{Overview}^main.flex-1.overflow-auto.p-6[data-slot=content]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'navigation', at: { fragment: 'shell-root', name: 'navigation' }, accepts: ['navigation'], min: 1, max: 1 },
      { id: 'header', at: { fragment: 'shell-root', name: 'header' }, accepts: ['header', 'workspace-header'], min: 1, max: 1 },
      { id: 'content', at: { fragment: 'shell-root', name: 'content' }, accepts: ['dashboard', 'workspace', 'table'], min: 1, max: 1 },
    ],
    ports: [
      { id: 'main-region', at: { fragment: 'shell-root', name: 'content' }, direction: 'out', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'breadcrumb', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'shell-root', gutterBoundary: 'shell-root', scrollBoundary: 'shell-root' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-08'], 'sidebar-08'),
  };

  // sidebar-09: Dual nested sidebars (icon rail + secondary list pane)
  blocks['sidebar-09'] = {
    schemaVersion: 1,
    id: 'sidebar-09',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-09']?.data?.description ?? 'Dual nested sidebars (icon rail primary sidebar + secondary collapsible folder list pane).',
    tags: ['navigation', 'sidebar', 'dual-sidebar', 'nested-sidebars', 'rail'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'div.flex.h-screen.border-e.border-border[data-slot=sidebar-host][data-component=sidebar]>(aside.w-16.border-e.border-border.bg-muted.flex.flex-col.items-center.py-4.gap-4[data-slot=rail]>button.btn.btn-ghost.size-10.rounded-lg[data-state=active]{M}+button.btn.btn-ghost.size-10.rounded-lg{F}+button.btn.btn-ghost.size-10.rounded-lg{T}+div.mt-auto>div.size-8.rounded-full.bg-muted)+aside.w-64.bg-background.flex.flex-col.justify-between.p-4[data-slot=secondary-pane]>(div.flex.flex-col.gap-4>div.flex.items-center.justify-between>span.text-sm.font-semibold{Mailboxes}+button.btn.btn-ghost.btn-xs{+}^nav.flex.flex-col.gap-2>a.btn.btn-ghost.btn-sm.justify-start[data-state=active]{All Inboxes}+a.btn.btn-ghost.btn-sm.justify-start{Primary}+a.btn.btn-ghost.btn-sm.justify-start{Promotions}+a.btn.btn-ghost.btn-sm.justify-start{Updates}+a.btn.btn-ghost.btn-sm.justify-start{Spam})+(div.mt-auto.border-t.border-border.pt-2>span.text-xs.text-muted-foreground{Storage: 12GB of 15GB})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'rail', at: { fragment: 'nav-root', name: 'rail' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'secondary-pane', at: { fragment: 'nav-root', name: 'secondary-pane' }, accepts: ['navigation'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-09'], 'sidebar-09'),
  };

  // sidebar-10: Floating popover/drawer sidebar container
  blocks['sidebar-10'] = {
    schemaVersion: 1,
    id: 'sidebar-10',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-10']?.data?.description ?? 'Floating popover/drawer sidebar container with trigger toggles and mobile slide-over sheet behavior.',
    tags: ['navigation', 'sidebar', 'popover', 'drawer', 'slide-over'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'div[data-slot=sidebar-host][data-component=sidebar]>(div.flex.items-center.gap-2.p-4.border-b.border-border>button.btn.btn-sm.btn-outline[data-slot=toggle-btn]{Toggle Navigation}+span.text-sm.font-semibold{Project Space})+aside.fixed.inset-y-0.left-0.z-40.w-72.border-e.border-border.bg-background.p-4.shadow-xl.flex.flex-col.justify-between[data-slot=popover-sidebar][data-state=open]>(div.flex.flex-col.gap-4>div.flex.items-center.justify-between>span.text-sm.font-semibold{Quick Nav}+button.btn.btn-ghost.btn-xs{✕}^nav.flex.flex-col.gap-2>a.btn.btn-ghost.btn-sm.justify-start{Recent Files}+a.btn.btn-ghost.btn-sm.justify-start{Shared With Me}+a.btn.btn-ghost.btn-sm.justify-start{Archived})+(div.mt-auto.border-t.border-border.pt-2>span.text-xs.text-muted-foreground{Press Esc to close})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'toggle-btn', at: { fragment: 'nav-root', name: 'toggle-btn' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'popover-sidebar', at: { fragment: 'nav-root', name: 'popover-sidebar' }, accepts: ['navigation'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-10'], 'sidebar-10'),
  };

  // sidebar-11: File tree directory browser sidebar (role="tree")
  blocks['sidebar-11'] = {
    schemaVersion: 1,
    id: 'sidebar-11',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-11']?.data?.description ?? 'File tree directory browser sidebar (role="tree") with expandable directories and file node items.',
    tags: ['navigation', 'sidebar', 'file-tree', 'explorer', 'tree'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-64.border-e.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=FileExplorer][data-slot=sidebar-host][data-component=sidebar][data-side=left]>nav.flex.h-full.flex-col.justify-between.p-2>(div.flex.flex-col.gap-2>div.flex.items-center.justify-between.p-2>span.text-xs.font-semibold.uppercase.text-muted-foreground{Explorer}+button.btn.btn-ghost.btn-xs{+}^div.flex.flex-col.gap-2[role=tree][aria-label=Files]>details.group[open]>summary.flex.items-center.gap-2.p-2.text-xs.cursor-pointer.hover:bg-muted{📁+span{src}+span{▾}}+div.flex.flex-col.gap-2.pl-4>details.group[open]>summary.flex.items-center.gap-2.p-2.text-xs.cursor-pointer.hover:bg-muted{📁+span{ui}}+div.flex.flex-col.gap-2.pl-4>a.flex.items-center.gap-2.p-2.text-xs.hover:bg-muted[data-state=active]{📄+button.tsx}^a.flex.items-center.gap-2.p-2.text-xs.hover:bg-muted{📄+index.ts}^a.flex.items-center.gap-2.p-2.text-xs.hover:bg-muted{📄+package.json})+(div.mt-auto.p-2.border-t.border-border>span.text-xs.text-muted-foreground{main})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'user-footer', at: { fragment: 'nav-root', name: 'user-footer' }, accepts: ['action'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-11'], 'sidebar-11'),
  };

  // sidebar-12: Calendar & schedule sidebar
  blocks['sidebar-12'] = {
    schemaVersion: 1,
    id: 'sidebar-12',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-12']?.data?.description ?? 'Calendar & schedule sidebar with inline mini monthly calendar widget, upcoming events list, and quick add action.',
    tags: ['navigation', 'sidebar', 'calendar', 'schedule', 'events'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-72.border-e.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=CalendarSidebar][data-slot=sidebar-host][data-component=sidebar][data-side=left]>nav.flex.h-full.flex-col.justify-between.p-4>(div.flex.flex-col.gap-4>div.flex.items-center.justify-between>span.text-sm.font-semibold{Schedule}+button.btn.btn-sm.btn-primary{+ Event}^div.rounded-lg.border.border-border.p-2[data-slot=calendar-widget]>div.flex.items-center.justify-between.p-2.text-xs.font-semibold{<span>Oct 2026</span>+div.flex.gap-2>button.btn.btn-ghost.btn-xs{‹}+button.btn.btn-ghost.btn-xs{›}}^div.grid.grid-cols-7.gap-2.text-center.text-xs>span.text-muted-foreground*7{D}+span.p-2.hover:bg-muted*14{$}^^div.flex.flex-col.gap-2[data-slot=upcoming-events]>span.text-xs.font-semibold.text-muted-foreground{Upcoming}+div.flex.flex-col.gap-2.rounded-lg.border.border-border.p-2.text-xs>strong{Sprint Review}+span.text-muted-foreground{10:00 AM})+(div.mt-auto.pt-2.border-t.border-border>span.text-xs.text-muted-foreground{UTC+3})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'calendar-widget', at: { fragment: 'nav-root', name: 'calendar-widget' }, accepts: ['details'], min: 0, max: 1 },
      { id: 'upcoming-events', at: { fragment: 'nav-root', name: 'upcoming-events' }, accepts: ['workspace'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-12'], 'sidebar-12'),
  };

  // sidebar-13: Settings dialog modal with embedded sidebar navigation
  blocks['sidebar-13'] = {
    schemaVersion: 1,
    id: 'sidebar-13',
    role: 'details',
    family: 'workspace',
    description: upstreamMap['sidebar-13']?.data?.description ?? 'Settings dialog modal with embedded sidebar navigation, category tabs, and active settings panel.',
    tags: ['modal', 'dialog', 'sidebar', 'settings', 'embedded-nav'],
    root: 'dialog-root',
    fragments: [
      {
        id: 'dialog-root',
        emmet: 'div.card.flex.w-full.max-w-4xl.overflow-hidden.rounded-xl.border.border-border.bg-card.shadow-2xl[data-slot=settings-dialog][data-component=sidebar]>(aside.w-48.border-e.border-border.bg-muted.p-4.flex.flex-col.justify-between[data-slot=settings-nav]>div.flex.flex-col.gap-2>span.text-xs.font-semibold.uppercase.text-muted-foreground.px-2{Settings}+a.btn.btn-ghost.btn-sm.justify-start[data-state=active]{General}+a.btn.btn-ghost.btn-sm.justify-start{Account}+a.btn.btn-ghost.btn-sm.justify-start{Billing}^div.mt-auto>button.btn.btn-ghost.btn-xs.w-full.justify-start{Log Out})+section.flex.flex-1.flex-col.gap-4.p-6[data-slot=settings-content]>(header.flex.flex-col.gap-2.border-b.border-border.pb-4>h2.text-lg.font-semibold{General Settings}+p.text-xs.text-muted-foreground{Manage workspace details.})+div.flex.flex-col.gap-4[data-slot=settings-fields]>div.flex.flex-col.gap-2>label.text-xs.font-medium{Workspace Name}+input.input.input-sm[value=\'Acme Labs\']^footer.mt-auto.flex.justify-end.gap-2.pt-4.border-t.border-border>button.btn.btn-sm.btn-ghost{Cancel}+button.btn.btn-sm.btn-primary{Save Changes})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'settings-nav', at: { fragment: 'dialog-root', name: 'settings-nav' }, accepts: ['navigation'], min: 0, max: 1 },
      { id: 'settings-content', at: { fragment: 'dialog-root', name: 'settings-content' }, accepts: ['form', 'workspace'], min: 0, max: 1 },
    ],
    ports: [],
    componentRefs: ['sidebar', 'button', 'input'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'dialog-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-13'], 'sidebar-13'),
  };

  // sidebar-14: Right-hand inspector sidebar (data-side="right")
  blocks['sidebar-14'] = {
    schemaVersion: 1,
    id: 'sidebar-14',
    role: 'navigation',
    family: 'layout',
    description: upstreamMap['sidebar-14']?.data?.description ?? 'Right-hand inspector sidebar (data-side="right") with property sheet controls, metadata inspector, and action buttons.',
    tags: ['navigation', 'sidebar', 'inspector', 'right-side', 'properties'],
    root: 'nav-root',
    fragments: [
      {
        id: 'nav-root',
        emmet: 'aside.sidebar.w-72.border-s.border-border.bg-background.md:sticky.md:top-0.md:h-screen[aria-label=Inspector][data-slot=sidebar-host][data-component=sidebar][data-side=right]>div.flex.h-full.flex-col.justify-between.p-4>(div.flex.flex-col.gap-4>div.flex.items-center.justify-between.border-b.border-border.pb-2>span.text-sm.font-semibold{Inspector}+button.btn.btn-ghost.btn-xs{✕}^div.flex.flex-col.gap-4[data-slot=inspector-properties]>div.flex.flex-col.gap-2>label.text-xs.font-medium{Component ID}+input.input.input-sm[value=\'hero-card\'][readonly]^^div.flex.flex-col.gap-2>label.text-xs.font-medium{Layout}+select.select.select-sm>option{Center}+option{Left}+option{Right}^^div.flex.flex-col.gap-2>span.text-xs.font-semibold.text-muted-foreground{Metadata}+div.flex.justify-between.text-xs>span.text-muted-foreground{Modified}+span{2 mins ago})+(div.mt-auto.flex.flex-col.gap-2.pt-4.border-t.border-border>button.btn.btn-sm.btn-primary.w-full{Apply}+button.btn.btn-sm.btn-outline.w-full{Revert})',
      },
    ],
    mounts: [],
    slots: [
      { id: 'inspector-properties', at: { fragment: 'nav-root', name: 'inspector-properties' }, accepts: ['details', 'settings'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'nav-toggle-in', at: { fragment: 'nav-root', name: 'nav-root' }, direction: 'in', kind: 'control', contract: 'nav-toggle', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button', 'input', 'select'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'nav-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-14'], 'sidebar-14'),
  };

  // sidebar-15: Dual left + right sidebars surrounding main workspace canvas
  blocks['sidebar-15'] = {
    schemaVersion: 1,
    id: 'sidebar-15',
    role: 'application-shell',
    family: 'layout',
    description: upstreamMap['sidebar-15']?.data?.description ?? 'Dual left + right sidebars surrounding main workspace canvas with center viewport and multi-panel inspector.',
    tags: ['shell', 'sidebar', 'dual-sidebars', 'left-right', 'workspace'],
    root: 'shell-root',
    fragments: [
      {
        id: 'shell-root',
        emmet: 'div.flex.min-h-screen.w-full[data-slot=shell-root][data-component=sidebar]>(aside.sidebar.w-64.border-e.border-border.bg-background.p-4[data-slot=nav-left][data-side=left]>div.flex.flex-col.gap-4>span.text-sm.font-semibold{Left Nav}+nav.flex.flex-col.gap-2>a.btn.btn-ghost.btn-sm.justify-start{Files}+a.btn.btn-ghost.btn-sm.justify-start{Assets})+div.flex.flex-1.flex-col.min-w-0>header.flex.h-12.items-center.border-b.border-border.px-4[data-slot=header]>span.text-sm.font-medium{Editor Workspace}^main.flex-1.overflow-auto.p-6[data-slot=content]^^aside.sidebar.w-64.border-s.border-border.bg-background.p-4[data-slot=nav-right][data-side=right]>div.flex.flex-col.gap-4>span.text-sm.font-semibold{Right Panel}+div.flex.flex-col.gap-2>span.text-xs.text-muted-foreground{Properties}',
      },
    ],
    mounts: [],
    slots: [
      { id: 'nav-left', at: { fragment: 'shell-root', name: 'nav-left' }, accepts: ['navigation'], min: 1, max: 1 },
      { id: 'header', at: { fragment: 'shell-root', name: 'header' }, accepts: ['header', 'workspace-header'], min: 1, max: 1 },
      { id: 'content', at: { fragment: 'shell-root', name: 'content' }, accepts: ['dashboard', 'workspace', 'table'], min: 1, max: 1 },
      { id: 'nav-right', at: { fragment: 'shell-root', name: 'nav-right' }, accepts: ['navigation', 'details'], min: 1, max: 1 },
    ],
    ports: [
      { id: 'main-region', at: { fragment: 'shell-root', name: 'content' }, direction: 'out', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'shell-root', gutterBoundary: 'shell-root', scrollBoundary: 'shell-root' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-15'], 'sidebar-15'),
  };

  // sidebar-16: Sticky global top header with collapsible sidebar below
  blocks['sidebar-16'] = {
    schemaVersion: 1,
    id: 'sidebar-16',
    role: 'application-shell',
    family: 'layout',
    description: upstreamMap['sidebar-16']?.data?.description ?? 'Sticky global top header with collapsible sidebar below and responsive layout grid.',
    tags: ['shell', 'sidebar', 'topbar-header', 'collapsible-sidebar'],
    root: 'shell-root',
    fragments: [
      {
        id: 'shell-root',
        emmet: 'div.flex.min-h-screen.flex-col.w-full[data-slot=shell-root][data-component=sidebar]>(header.sticky.top-0.z-30.flex.h-12.items-center.justify-between.border-b.border-border.bg-background.px-4[data-slot=top-header]>div.flex.items-center.gap-2>button.btn.btn-ghost.btn-xs[data-slot=sidebar-toggle]{☰}+span.text-sm.font-semibold{Global Platform}^div.flex.items-center.gap-2>div.size-8.rounded-full.bg-muted)+div.flex.flex-1.min-h-0>aside.sidebar.w-64.border-e.border-border.bg-background.p-4[data-slot=navigation][data-side=left]>nav.flex.flex-col.gap-2>a.btn.btn-ghost.btn-sm.justify-start[data-state=active]{Dashboard}+a.btn.btn-ghost.btn-sm.justify-start{Settings}^^main.flex-1.overflow-auto.p-6[data-slot=content]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'top-header', at: { fragment: 'shell-root', name: 'top-header' }, accepts: ['header'], min: 0, max: 1 },
      { id: 'navigation', at: { fragment: 'shell-root', name: 'navigation' }, accepts: ['navigation'], min: 1, max: 1 },
      { id: 'content', at: { fragment: 'shell-root', name: 'content' }, accepts: ['dashboard', 'workspace', 'table'], min: 1, max: 1 },
    ],
    ports: [
      { id: 'main-region', at: { fragment: 'shell-root', name: 'content' }, direction: 'out', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['sidebar', 'button'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'shell-root', gutterBoundary: 'shell-root', scrollBoundary: 'shell-root' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: makeProvenance(upstreamMap['sidebar-16'], 'sidebar-16'),
  };

  // -------------------------------------------------------------------------
  // 3. Dashboards (dashboard-01 through dashboard-07)
  // -------------------------------------------------------------------------

  // dashboard-01
  const d01Upstream = upstreamMap['dashboard-01'];
  blocks['dashboard-01'] = {
    schemaVersion: 1,
    id: 'dashboard-01',
    role: 'dashboard',
    family: 'workspace',
    description: d01Upstream?.data?.description ?? 'Shadcn new-york-v4 Dashboard 01: Inset workspace hosting KPI section cards, interactive area chart, and transactional data table.',
    tags: ['dashboard', 'workspace', 'new-york-v4', 'metrics', 'chart', 'table'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=dashboard-01]>div[data-slot=kpi]+div[data-slot=chart]+div[data-slot=table]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'kpi', at: { fragment: 'content-frame', name: 'kpi' }, accepts: ['metrics', 'kpi'], min: 0, max: 1 },
      { id: 'chart', at: { fragment: 'content-frame', name: 'chart' }, accepts: ['chart', 'activity'], min: 0, max: 1 },
      { id: 'table', at: { fragment: 'content-frame', name: 'table' }, accepts: ['table', 'data'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'button', 'badge', 'table', 'chart'],
    ruleRefs: [],
    dependencyBlockIds: ['metrics-summary', 'svg-area-chart', 'data-table-rich'],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: d01Upstream
      ? {
          origin: 'authored',
          sourceHashes: { 'upstream:dashboard-01': sha256(d01Upstream.raw) },
          mappingVersion: '1.0.0',
        }
      : { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // dashboard-02
  blocks['dashboard-02'] = {
    schemaVersion: 1,
    id: 'dashboard-02',
    role: 'dashboard',
    family: 'workspace',
    description: 'Shadcn new-york-v4 Dashboard 02: Analytics & E-commerce workspace with tabbed period selectors, revenue chart canvas, and recent orders table.',
    tags: ['dashboard', 'workspace', 'new-york-v4', 'ecommerce', 'analytics'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=dashboard-02]>div.flex.items-center.justify-between.gap-4>div[data-slot=tabs]+div[data-slot=actions]^^div[data-slot=kpi]+div.grid.grid-cols-1.gap-6.lg:grid-cols-3>div.lg:col-span-2[data-slot=overview]+div[data-slot=recent-orders]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'tabs', at: { fragment: 'content-frame', name: 'tabs' }, accepts: ['tabs'], min: 0, max: 1 },
      { id: 'actions', at: { fragment: 'content-frame', name: 'actions' }, accepts: ['action'], min: 0, max: 1 },
      { id: 'kpi', at: { fragment: 'content-frame', name: 'kpi' }, accepts: ['metrics', 'kpi'], min: 0, max: 1 },
      { id: 'overview', at: { fragment: 'content-frame', name: 'overview' }, accepts: ['chart', 'activity', 'workspace'], min: 0, max: 1 },
      { id: 'recent-orders', at: { fragment: 'content-frame', name: 'recent-orders' }, accepts: ['table', 'data', 'workspace'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'badge', 'button', 'tabs'],
    ruleRefs: [],
    dependencyBlockIds: ['metrics-summary', 'svg-area-chart', 'data-table-rich'],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // dashboard-03
  blocks['dashboard-03'] = {
    schemaVersion: 1,
    id: 'dashboard-03',
    role: 'dashboard',
    family: 'workspace',
    description: 'Shadcn new-york-v4 Dashboard 03: Split prompt studio canvas with model settings sidebar, message stream, and structured input console.',
    tags: ['dashboard', 'workspace', 'new-york-v4', 'ai', 'prompt-studio'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=dashboard-03]>div.flex.flex-1.flex-col.gap-4>div.flex-1.rounded-xl.border.border-border.bg-card.p-4[data-slot=chat-stream]+div[data-slot=prompt-input]^^aside.w-80.rounded-xl.border.border-border.bg-card.p-4[data-slot=model-settings]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'chat-stream', at: { fragment: 'content-frame', name: 'chat-stream' }, accepts: ['workspace', 'content'], min: 0, max: 1 },
      { id: 'prompt-input', at: { fragment: 'content-frame', name: 'prompt-input' }, accepts: ['form', 'input'], min: 0, max: 1 },
      { id: 'model-settings', at: { fragment: 'content-frame', name: 'model-settings' }, accepts: ['settings', 'form'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'button', 'textarea', 'badge'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // dashboard-04
  blocks['dashboard-04'] = {
    schemaVersion: 1,
    id: 'dashboard-04',
    role: 'dashboard',
    family: 'workspace',
    description: 'Shadcn new-york-v4 Dashboard 04: Two-column settings layout with sticky sub-navigation rail and stacked configuration sections.',
    tags: ['dashboard', 'workspace', 'new-york-v4', 'settings'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=dashboard-04]>nav.w-48.flex.flex-col.gap-2[data-slot=settings-nav]+div.flex.flex-1.flex-col.gap-6[data-slot=settings-content]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'settings-nav', at: { fragment: 'content-frame', name: 'settings-nav' }, accepts: ['navigation'], min: 0, max: 1 },
      { id: 'settings-content', at: { fragment: 'content-frame', name: 'settings-content' }, accepts: ['form', 'workspace'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['button', 'card'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // dashboard-05
  blocks['dashboard-05'] = {
    schemaVersion: 1,
    id: 'dashboard-05',
    role: 'dashboard',
    family: 'workspace',
    description: 'Shadcn new-york-v4 Dashboard 05: Multi-column order operations canvas with summary cards, order table, and slide-over receipt inspector.',
    tags: ['dashboard', 'workspace', 'new-york-v4', 'orders'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=dashboard-05]>div.flex.flex-1.flex-col.gap-6>div[data-slot=kpi]+div[data-slot=orders-table]^^aside.w-96.rounded-xl.border.border-border.bg-card.p-6[data-slot=order-detail]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'kpi', at: { fragment: 'content-frame', name: 'kpi' }, accepts: ['metrics', 'kpi'], min: 0, max: 1 },
      { id: 'orders-table', at: { fragment: 'content-frame', name: 'orders-table' }, accepts: ['table', 'data'], min: 0, max: 1 },
      { id: 'order-detail', at: { fragment: 'content-frame', name: 'order-detail' }, accepts: ['details', 'workspace'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'badge', 'button', 'table'],
    ruleRefs: [],
    dependencyBlockIds: ['metrics-summary', 'data-table-rich'],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // dashboard-06
  blocks['dashboard-06'] = {
    schemaVersion: 1,
    id: 'dashboard-06',
    role: 'dashboard',
    family: 'workspace',
    description: 'Shadcn new-york-v4 Dashboard 06: Catalog management workspace with tabbed category filters, bulk actions, and inventory table.',
    tags: ['dashboard', 'workspace', 'new-york-v4', 'inventory', 'table'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=dashboard-06]>div[data-slot=tabs]+div[data-slot=filters]+div[data-slot=inventory-table]+div[data-slot=pager]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'tabs', at: { fragment: 'content-frame', name: 'tabs' }, accepts: ['tabs'], min: 0, max: 1 },
      { id: 'filters', at: { fragment: 'content-frame', name: 'filters' }, accepts: ['filters'], min: 0, max: 1 },
      { id: 'inventory-table', at: { fragment: 'content-frame', name: 'inventory-table' }, accepts: ['table', 'data'], min: 0, max: 1 },
      { id: 'pager', at: { fragment: 'content-frame', name: 'pager' }, accepts: ['pager', 'pagination'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'tabs', 'table', 'button', 'badge'],
    ruleRefs: [],
    dependencyBlockIds: ['data-table-rich'],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // dashboard-07
  blocks['dashboard-07'] = {
    schemaVersion: 1,
    id: 'dashboard-07',
    role: 'dashboard',
    family: 'workspace',
    description: 'Shadcn new-york-v4 Dashboard 07: Product authoring studio with primary details, status dropdown, image gallery, and pricing forms.',
    tags: ['dashboard', 'workspace', 'new-york-v4', 'editor', 'forms'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=dashboard-07]>div.flex.flex-1.flex-col.gap-6>div[data-slot=general-info]+div[data-slot=variants]^^aside.w-80.flex.flex-col.gap-6>div[data-slot=status-card]+div[data-slot=media-card]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'general-info', at: { fragment: 'content-frame', name: 'general-info' }, accepts: ['form', 'workspace'], min: 0, max: 1 },
      { id: 'variants', at: { fragment: 'content-frame', name: 'variants' }, accepts: ['form', 'table'], min: 0, max: 1 },
      { id: 'status-card', at: { fragment: 'content-frame', name: 'status-card' }, accepts: ['card', 'details'], min: 0, max: 1 },
      { id: 'media-card', at: { fragment: 'content-frame', name: 'media-card' }, accepts: ['card', 'details'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'button', 'input', 'badge'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // -------------------------------------------------------------------------
  // 4. Auth Blocks (login-01..05, signup-01..05, otp-01..05, authentication)
  // -------------------------------------------------------------------------

  // authentication
  const loginUpstream = upstreamMap['login-01'];
  blocks['authentication'] = {
    schemaVersion: 1,
    id: 'authentication',
    role: 'page',
    family: 'auth',
    description: 'Shadcn new-york-v4 authentication card with social OAuth triggers, credential inputs, FSM state attributes, and forgot-password link.',
    tags: ['auth', 'login', 'social-auth', 'new-york-v4', 'states'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.w-full.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.w-full.max-w-md.rounded-xl.border.border-border.bg-card.p-6.text-card-foreground.shadow-md[data-component=auth-card][data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold[data-slot=title]{Sign In}+p.text-xs.text-muted-foreground[data-slot=desc]{Enter your credentials to access your account})+div[data-slot=auth-form]+(footer.text-center.text-xs.text-muted-foreground.pt-4>span{Don\'t have an account? }+a.text-primary.font-medium.hover:underline[href=\'#signup\']{Sign Up})',
      },
      {
        id: 'auth-form',
        emmet: 'div.flex.flex-col.gap-4.py-4[data-slot=form-container]>(div.grid.grid-cols-2.gap-4>button.btn.btn-sm.btn-outline.w-full[type=button]>svg[aria-hidden=true].size-4+span{GitHub}^button.btn.btn-sm.btn-outline.w-full[type=button]>svg[aria-hidden=true].size-4+span{Google})+(div.relative.flex.items-center.justify-center>hr.w-full.border-border+span.bg-card.px-2.text-xs.text-muted-foreground{or continue with})+(form.flex.flex-col.gap-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium[for=auth-email]{Email}+input.input.input-sm#auth-email[type=email][placeholder=\'name@example.com\'][required][data-state=valid])+(div.flex.flex-col.gap-2>div.flex.items-center.justify-between>label.text-xs.font-medium[for=auth-password]{Password}+a.text-xs.text-primary.hover:underline[href=\'#forgot\']{Forgot?}^input.input.input-sm#auth-password[type=password][required][data-state=valid])+button.btn.btn-sm.btn-primary.w-full[type=submit][data-state=idle]{Sign In})',
      },
    ],
    mounts: [
      { parent: 'auth-root', anchor: 'auth-form', child: 'auth-form', order: 0 },
    ],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: loginUpstream
      ? {
          origin: 'authored',
          sourceHashes: { 'upstream:login-01': sha256(loginUpstream.raw) },
          mappingVersion: '1.0.0',
        }
      : { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // login-01
  blocks['login-01'] = {
    schemaVersion: 1,
    id: 'login-01',
    role: 'page',
    family: 'auth',
    description: upstreamMap['login-01']?.data?.description ?? 'Simple centered card login form with email, password, and sign-in button.',
    tags: ['auth', 'login', 'simple', 'card'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.w-full.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.w-full.max-w-sm.rounded-xl.border.border-border.bg-card.p-6.text-card-foreground.shadow-md[data-component=auth-card][data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Login}+p.text-xs.text-muted-foreground{Enter your credentials to login})+form.flex.flex-col.gap-4.pt-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium[for=login-01-email]{Email}+input.input.input-sm#login-01-email[type=email][placeholder=\'m@example.com\'][required])+(div.flex.flex-col.gap-2>div.flex.items-center.justify-between>label.text-xs.font-medium[for=login-01-password]{Password}+a.text-xs.text-muted-foreground.hover:underline[href=\'#forgot\']{Forgot?}^input.input.input-sm#login-01-password[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Login}+(footer.text-center.text-xs.text-muted-foreground.pt-2>a.text-primary.font-medium.hover:underline[href=\'#signup\']{Sign up})',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['login-01'], 'login-01'),
  };

  // login-02
  blocks['login-02'] = {
    schemaVersion: 1,
    id: 'login-02',
    role: 'page',
    family: 'auth',
    description: upstreamMap['login-02']?.data?.description ?? 'Two-column split login page with cover brand banner, social providers, and credentials form.',
    tags: ['auth', 'login', 'split-screen', 'social-auth'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.grid.min-h-screen.grid-cols-1.lg:grid-cols-2[data-slot=auth-page]>(div.relative.hidden.h-full.flex-col.justify-between.bg-muted.p-12.lg:flex>div.flex.items-center.gap-2.text-lg.font-medium>div.size-6.rounded.bg-primary+span{Acme Corp}^blockquote.space-y-2>p.text-lg{\"Saved me countless hours.\"}+footer.text-sm.text-muted-foreground{Sofia Davis})+div.flex.items-center.justify-center.p-6>div.mx-auto.flex.w-full.max-w-sm.flex-col.gap-6[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Login}+p.text-xs.text-muted-foreground{Enter your credentials})+form.flex.flex-col.gap-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Email}+input.input.input-sm[type=email][required])+(div.flex.flex-col.gap-2>div.flex.items-center.justify-between>label.text-xs.font-medium{Password}+a.text-xs.hover:underline{Forgot?}^input.input.input-sm[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Sign In}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['login-02'], 'login-02'),
  };

  // login-03
  blocks['login-03'] = {
    schemaVersion: 1,
    id: 'login-03',
    role: 'page',
    family: 'auth',
    description: upstreamMap['login-03']?.data?.description ?? 'Clean login card on muted background with card shadow and helper links.',
    tags: ['auth', 'login', 'card', 'muted-background'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.bg-muted.p-6[data-slot=auth-page]>div.card.w-full.max-w-md.rounded-xl.border.border-border.bg-card.p-8.shadow-lg[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Welcome Back}+p.text-xs.text-muted-foreground{Enter your credentials to continue})+form.flex.flex-col.gap-4.pt-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Email}+input.input.input-sm[type=email][placeholder=\'m@example.com\'][required])+(div.flex.flex-col.gap-2>div.flex.items-center.justify-between>label.text-xs.font-medium{Password}+a.text-xs.hover:underline{Forgot?}^input.input.input-sm[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Sign In}+div.text-center.text-xs.text-muted-foreground>a.hover:underline[href=\'#signup\']{Don\'t have an account? Sign up}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['login-03'], 'login-03'),
  };

  // login-04
  blocks['login-04'] = {
    schemaVersion: 1,
    id: 'login-04',
    role: 'page',
    family: 'auth',
    description: upstreamMap['login-04']?.data?.description ?? 'Horizontal card login with side-by-side marketing preview and sign-in form.',
    tags: ['auth', 'login', 'horizontal-card', 'marketing'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.grid.w-full.max-w-3xl.grid-cols-1.overflow-hidden.rounded-xl.border.border-border.bg-card.shadow-xl.md:grid-cols-2[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(div.p-8.flex.flex-col.justify-between>(header.flex.flex-col.gap-2>h1.text-2xl.font-semibold{Welcome back}+p.text-xs.text-muted-foreground{Sign in to access your dashboard})+form.flex.flex-col.gap-4.py-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Email}+input.input.input-sm[type=email][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Password}+input.input.input-sm[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Login})+footer.text-xs.text-muted-foreground>a.underline{Terms & Privacy})^div.hidden.bg-muted.p-8.flex.flex-col.justify-between.md:flex>span.text-sm.font-semibold{Acme Platform}+p.text-xs.text-muted-foreground{Fast, secure enterprise design system.}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['login-04'], 'login-04'),
  };

  // login-05
  blocks['login-05'] = {
    schemaVersion: 1,
    id: 'login-05',
    role: 'page',
    family: 'auth',
    description: upstreamMap['login-05']?.data?.description ?? 'Minimal passwordless / magic-link email-only login form with validation states.',
    tags: ['auth', 'login', 'magic-link', 'passwordless'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.w-full.max-w-sm.rounded-xl.border.border-border.bg-card.p-6.shadow-md[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Magic Link Login}+p.text-xs.text-muted-foreground{Enter your work email and we\'ll send you a login link})+form.flex.flex-col.gap-4.pt-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Work Email}+input.input.input-sm[type=email][placeholder=\'you@company.com\'][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Send Magic Link}+(footer.text-center.text-xs.text-muted-foreground.pt-2>a.hover:underline[href=\'#sso\']{Sign in with Enterprise SSO})',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['login-05'], 'login-05'),
  };

  // signup-01
  blocks['signup-01'] = {
    schemaVersion: 1,
    id: 'signup-01',
    role: 'page',
    family: 'auth',
    description: upstreamMap['signup-01']?.data?.description ?? 'Simple centered card registration form with email, password, confirm password, and terms checkbox.',
    tags: ['auth', 'signup', 'register', 'card'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.w-full.max-w-sm.rounded-xl.border.border-border.bg-card.p-6.shadow-md[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Create an account}+p.text-xs.text-muted-foreground{Enter your email below to create your account})+form.flex.flex-col.gap-4.pt-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Email}+input.input.input-sm[type=email][placeholder=\'m@example.com\'][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Password}+input.input.input-sm[type=password][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Confirm Password}+input.input.input-sm[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Sign Up}+(footer.text-center.text-xs.text-muted-foreground.pt-2>span{Already have an account? }+a.text-primary.font-medium.hover:underline[href=\'#login\']{Sign in})',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field', 'checkbox'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['signup-01'], 'signup-01'),
  };

  // signup-02
  blocks['signup-02'] = {
    schemaVersion: 1,
    id: 'signup-02',
    role: 'page',
    family: 'auth',
    description: upstreamMap['signup-02']?.data?.description ?? 'Two-column split registration page with testimonial branding and account creation form.',
    tags: ['auth', 'signup', 'split-screen', 'branding'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.grid.min-h-screen.grid-cols-1.lg:grid-cols-2[data-slot=auth-page]>(div.relative.hidden.h-full.flex-col.justify-between.bg-muted.p-12.lg:flex>div.flex.items-center.gap-2.text-lg.font-medium>div.size-6.rounded.bg-primary+span{Acme Corp}^blockquote.space-y-2>p.text-lg{\"Join thousands of teams.\"}+footer.text-sm.text-muted-foreground{Sofia Davis})+div.flex.items-center.justify-center.p-6>div.mx-auto.flex.w-full.max-w-sm.flex-col.gap-6[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Create account}+p.text-xs.text-muted-foreground{Start your 14-day trial})+form.flex.flex-col.gap-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Name}+input.input.input-sm[required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Email}+input.input.input-sm[type=email][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Password}+input.input.input-sm[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Create Account}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field', 'checkbox'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['signup-02'], 'signup-02'),
  };

  // signup-03
  blocks['signup-03'] = {
    schemaVersion: 1,
    id: 'signup-03',
    role: 'page',
    family: 'auth',
    description: upstreamMap['signup-03']?.data?.description ?? 'Elevated registration card on subtle muted backdrop with social OAuth triggers.',
    tags: ['auth', 'signup', 'card', 'oauth'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.bg-muted.p-6[data-slot=auth-page]>div.card.w-full.max-w-md.rounded-xl.border.border-border.bg-card.p-8.shadow-lg[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Sign Up for Acme}+p.text-xs.text-muted-foreground{Choose your preferred sign up method})+(div.grid.grid-cols-2.gap-4.pt-4>button.btn.btn-sm.btn-outline.w-full{GitHub}+button.btn.btn-sm.btn-outline.w-full{Google})+(div.relative.flex.items-center.justify-center.py-2>hr.w-full.border-border+span.bg-card.px-2.text-xs.text-muted-foreground{or})+form.flex.flex-col.gap-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Email}+input.input.input-sm[type=email][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Password}+input.input.input-sm[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Continue with Email}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field', 'checkbox'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['signup-03'], 'signup-03'),
  };

  // signup-04
  blocks['signup-04'] = {
    schemaVersion: 1,
    id: 'signup-04',
    role: 'page',
    family: 'auth',
    description: upstreamMap['signup-04']?.data?.description ?? 'Split card registration with feature showcase image and tiered account signup.',
    tags: ['auth', 'signup', 'split-card', 'showcase'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.grid.w-full.max-w-3xl.grid-cols-1.overflow-hidden.rounded-xl.border.border-border.bg-card.shadow-xl.md:grid-cols-2[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(div.p-8.flex.flex-col.justify-between>(header.flex.flex-col.gap-2>h1.text-2xl.font-semibold{Start building}+p.text-xs.text-muted-foreground{Create your free account today})+form.flex.flex-col.gap-4.py-4>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Email}+input.input.input-sm[type=email][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Password}+input.input.input-sm[type=password][required])+button.btn.btn-sm.btn-primary.w-full[type=submit]{Register})+footer.text-xs.text-muted-foreground>span{By signing up you agree to our Terms.})^div.hidden.bg-muted.p-8.flex.flex-col.justify-between.md:flex>span.text-sm.font-semibold{Starter Plan Included}+p.text-xs.text-muted-foreground{Unlimited sandbox projects and free deployments.}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field', 'checkbox'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['signup-04'], 'signup-04'),
  };

  // signup-05
  blocks['signup-05'] = {
    schemaVersion: 1,
    id: 'signup-05',
    role: 'page',
    family: 'auth',
    description: upstreamMap['signup-05']?.data?.description ?? 'Full-featured registration form with social providers, credentials, and password strength indicator.',
    tags: ['auth', 'signup', 'full-featured', 'password-strength'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.w-full.max-w-md.rounded-xl.border.border-border.bg-card.p-6.shadow-md[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Create your account}+p.text-xs.text-muted-foreground{Start your 30-day trial})+(div.grid.grid-cols-2.gap-4.pt-2>button.btn.btn-sm.btn-outline.w-full{GitHub}+button.btn.btn-sm.btn-outline.w-full{Google})+form.flex.flex-col.gap-4.pt-2>(div.flex.flex-col.gap-2>label.text-xs.font-medium{Full Name}+input.input.input-sm[placeholder=\'Jane Doe\'][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Work Email}+input.input.input-sm[type=email][placeholder=\'jane@company.com\'][required])+(div.flex.flex-col.gap-2>label.text-xs.font-medium{Password}+input.input.input-sm[type=password][required]+div.flex.gap-2.pt-2>div.h-2.flex-1.rounded.bg-primary*3)+button.btn.btn-sm.btn-primary.w-full[type=submit]{Create Account}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label', 'field', 'checkbox'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: makeProvenance(upstreamMap['signup-05'], 'signup-05'),
  };

  // otp-01
  blocks['otp-01'] = {
    schemaVersion: 1,
    id: 'otp-01',
    role: 'page',
    family: 'auth',
    description: 'Centered 6-digit PIN verification card with segmented digit inputs, countdown timer, and resend action.',
    tags: ['auth', 'otp', '2fa', 'verification', 'pin'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.p-6.bg-muted[data-slot=auth-page]>div.card.w-full.max-w-sm.rounded-xl.border.border-border.bg-card.p-6.text-center.shadow-md[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2>h1.text-2xl.font-semibold{Two-Factor Auth}+p.text-xs.text-muted-foreground{Enter the 6-digit code sent to your device})+form.flex.flex-col.gap-6.pt-4>(div.flex.justify-center.gap-2>input.input.input-sm.size-10.text-center.font-mono.text-lg[type=text][maxlength=1][required]*6)+button.btn.btn-sm.btn-primary.w-full[type=submit]{Verify Code}+(footer.flex.flex-col.gap-2.text-xs.text-muted-foreground.pt-2>span{Didn\'t receive code?}+button.btn.btn-ghost.btn-xs{Resend code (0:59)})',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // otp-02
  blocks['otp-02'] = {
    schemaVersion: 1,
    id: 'otp-02',
    role: 'page',
    family: 'auth',
    description: 'Two-column split security verification page with recovery code option and authenticator helper.',
    tags: ['auth', 'otp', 'split-screen', 'recovery-code'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.grid.min-h-screen.grid-cols-1.lg:grid-cols-2[data-slot=auth-page]>(div.relative.hidden.h-full.flex-col.justify-between.bg-muted.p-12.text-foreground.lg:flex>div.flex.items-center.gap-2.text-lg.font-medium>div.size-6.rounded.bg-primary+span{Security Check}^p.text-sm.text-muted-foreground{Protecting your workspace with hardware-backed encryption.})+div.flex.items-center.justify-center.p-6>div.mx-auto.flex.w-full.max-w-sm.flex-col.gap-6[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-2xl.font-semibold{Enter OTP Code}+p.text-xs.text-muted-foreground{Open your authenticator app to view your code})+form.flex.flex-col.gap-4>(div.flex.justify-center.gap-2>input.input.input-sm.size-10.text-center.font-mono.text-lg[type=text][maxlength=1]*6)+button.btn.btn-sm.btn-primary.w-full[type=submit]{Verify Identity}+div.text-center.text-xs>a.text-primary.hover:underline[href=\'#recovery\']{Use emergency backup code}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // otp-03
  blocks['otp-03'] = {
    schemaVersion: 1,
    id: 'otp-03',
    role: 'page',
    family: 'auth',
    description: 'Minimal numeric OTP card with auto-focus digit slots, expiry indicator, and verify submit.',
    tags: ['auth', 'otp', 'minimal', 'verification'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.bg-muted.p-6[data-slot=auth-page]>div.card.w-full.max-w-sm.rounded-xl.border.border-border.bg-card.p-6.shadow-md[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2.text-center>h1.text-xl.font-semibold{Verification Required}+p.text-xs.text-muted-foreground{Code expires in 5 minutes})+form.flex.flex-col.gap-4.pt-4>(div.flex.justify-center.gap-2>input.input.input-sm.size-10.text-center.font-mono.text-lg[type=text][maxlength=1]*6)+button.btn.btn-sm.btn-primary.w-full[type=submit]{Confirm}+div.text-center.text-xs.text-muted-foreground>a.hover:underline{Need help? Contact support}',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // otp-04
  blocks['otp-04'] = {
    schemaVersion: 1,
    id: 'otp-04',
    role: 'page',
    family: 'auth',
    description: 'Security modal dialog OTP verification with automatic submit on completion and cancel button.',
    tags: ['auth', 'otp', 'modal', 'dialog'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.items-center.justify-center.p-6.bg-muted-80[data-slot=auth-page]>div.card.w-full.max-w-md.rounded-xl.border.border-border.bg-card.p-6.shadow-2xl[data-fsm-recipe=auth-flow][data-fsm-state=idle]>(header.flex.flex-col.gap-2>h2.text-lg.font-semibold{Confirm High-Risk Action}+p.text-xs.text-muted-foreground{Please enter your one-time code to authorize this transfer.})+form.flex.flex-col.gap-4.pt-4>(div.flex.justify-center.gap-2>input.input.input-sm.size-10.text-center.font-mono.text-lg[type=text][maxlength=1]*6)+(div.flex.justify-end.gap-2.pt-2>button.btn.btn-sm.btn-ghost[type=button]{Cancel}+button.btn.btn-sm.btn-primary[type=submit]{Authorize})',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // otp-05
  blocks['otp-05'] = {
    schemaVersion: 1,
    id: 'otp-05',
    role: 'page',
    family: 'auth',
    description: 'Mobile-friendly full-height OTP card with numeric keypad layout and resend countdown.',
    tags: ['auth', 'otp', 'mobile-optimized', 'keypad'],
    root: 'auth-root',
    fragments: [
      {
        id: 'auth-root',
        emmet: 'main.flex.min-h-screen.flex-col.justify-between.p-6.bg-background[data-slot=auth-page]>(header.flex.flex-col.gap-2.pt-6.text-center>h1.text-2xl.font-semibold{Enter SMS Code}+p.text-xs.text-muted-foreground{Sent to +1 (555) ***-4829})+form.flex.flex-col.gap-6.py-6>(div.flex.justify-center.gap-2>input.input.input-sm.size-12.text-center.font-mono.text-xl[type=text][maxlength=1]*4)+button.btn.btn-sm.btn-primary.w-full[type=submit]{Verify}+div.text-center.text-xs.text-muted-foreground>span{Resend available in 30s})',
      },
    ],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: ['card', 'button', 'input', 'label'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'auth-root' },
    landmarks: { main: 1, primaryHeading: 1 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // -------------------------------------------------------------------------
  // 5. Workspace Blocks (mail, tasks, forms, products, analytics, billing, settings)
  // -------------------------------------------------------------------------

  // mail
  blocks['mail'] = {
    schemaVersion: 1,
    id: 'mail',
    role: 'workspace',
    family: 'workspace',
    description: 'Shadcn new-york-v4 mail workspace: 3-pane layout with mailbox folders, message list, and reading pane.',
    tags: ['mail', 'new-york-v4', 'workspace', '3-pane'],
    root: 'mail-root',
    fragments: [
      {
        id: 'mail-root',
        emmet: 'div.flex.flex-1.h-screen.divide-x.divide-border.border.border-border.bg-background[data-role=canvas][data-macro=canvas][data-block=mail]>div[data-slot=mail-nav]+div[data-slot=mail-list]+div[data-slot=mail-reading-pane]',
      },
      {
        id: 'mail-nav',
        emmet: 'nav.w-64.flex.flex-col.gap-2.p-4[data-slot=mail-nav]>div.flex.items-center.gap-2.pb-2>button.btn.btn-sm.btn-primary.w-full{Compose}^div.flex.flex-col.gap-2>a.btn.btn-ghost.btn-sm.justify-start.w-full[data-state=active]{Inbox}+a.btn.btn-ghost.btn-sm.justify-start.w-full{Drafts}+a.btn.btn-ghost.btn-sm.justify-start.w-full{Sent}+a.btn.btn-ghost.btn-sm.justify-start.w-full{Trash}',
      },
      {
        id: 'mail-list',
        emmet: 'div.w-96.flex.flex-col.gap-2.p-4[data-slot=mail-list]>input.input.input-sm[type=search][placeholder=\'Search messages...\']+div.flex.flex-col.gap-2.overflow-auto>div.flex.flex-col.gap-2.rounded-lg.border.border-border.p-4.hover:bg-muted[data-state=active]*2>div.flex.items-center.justify-between>span.text-xs.font-semibold{Alice}+span.text-xs.text-muted-foreground{10:42 AM}^span.text-xs.font-medium{Project Update}+p.text-xs.text-muted-foreground{Summary of deliverables...}',
      },
      {
        id: 'mail-reading-pane',
        emmet: 'section.flex.flex-1.flex-col.gap-4.p-6[data-slot=mail-reading-pane]>header.flex.items-center.justify-between.border-b.border-border.pb-4>div.flex.items-center.gap-2>div.size-8.rounded-full.bg-muted+div.flex.flex-col>span.text-sm.font-semibold{Alice}+span.text-xs.text-muted-foreground{alice@example.com}^^span.text-xs.text-muted-foreground{Oct 14, 2026}^div.flex-1.text-sm.leading-relaxed{Hi team, please find attached the reviewed milestones...}+footer.flex.items-center.gap-2.pt-4.border-t.border-border>button.btn.btn-sm.btn-outline{Reply}+button.btn.btn-sm.btn-outline{Forward}',
      },
    ],
    mounts: [
      { parent: 'mail-root', anchor: 'mail-nav', child: 'mail-nav', order: 0 },
      { parent: 'mail-root', anchor: 'mail-list', child: 'mail-list', order: 1 },
      { parent: 'mail-root', anchor: 'mail-reading-pane', child: 'mail-reading-pane', order: 2 },
    ],
    slots: [],
    ports: [
      { id: 'main-in', at: { fragment: 'mail-root', name: 'mail-root' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['button', 'input', 'badge'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'mail-root' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // tasks
  blocks['tasks'] = {
    schemaVersion: 1,
    id: 'tasks',
    role: 'workspace',
    family: 'data',
    description: 'Shadcn new-york-v4 tasks table workspace with task priority badges, status filters, and row action controls.',
    tags: ['tasks', 'new-york-v4', 'table', 'workspace'],
    root: 'tasks-root',
    fragments: [
      {
        id: 'tasks-root',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=tasks]>div.flex.items-center.justify-between.gap-4[data-slot=tasks-header]>div.flex.flex-col.gap-2>h2.text-xl.font-semibold{Tasks}+p.text-xs.text-muted-foreground{Here is a list of your tasks for this month!}^button.btn.btn-sm.btn-primary{+ New Task}^^div[data-slot=table]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'table', at: { fragment: 'tasks-root', name: 'table' }, accepts: ['table', 'data'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'tasks-root', name: 'tasks-root' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['button', 'badge', 'table'],
    ruleRefs: [],
    dependencyBlockIds: ['data-table-rich'],
    layout: { frameRef: 'tasks-root' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // forms
  blocks['forms'] = {
    schemaVersion: 1,
    id: 'forms',
    role: 'form',
    family: 'form',
    description: 'Shadcn new-york-v4 form layout with multi-section inputs, select dropdowns, toggles, and validation feedback.',
    tags: ['forms', 'new-york-v4', 'profile', 'validation'],
    root: 'forms-root',
    fragments: [
      {
        id: 'forms-root',
        emmet: 'section.flex.flex-col.gap-6.rounded-xl.border.border-border.bg-card.p-6.text-card-foreground.shadow-sm[data-component=forms][data-slot=form-container]>(header.flex.flex-col.gap-2>h2.text-lg.font-semibold{Profile Settings}+p.text-xs.text-muted-foreground{Configure how your personal information is shown})+div[data-slot=form-body]+(div.flex.items-center.justify-end.gap-4.pt-2>button.btn.btn-sm.btn-ghost{Reset}+button.btn.btn-sm.btn-primary{Save Changes})',
      },
      {
        id: 'forms-body',
        emmet: 'div.flex.flex-col.gap-4[data-slot=form-body]>(div.flex.flex-col.gap-2>label.text-xs.font-medium[for=usr]{Username}+input.input.input-sm#usr[placeholder=\'shadcn\'][required][data-state=valid]+p.text-xs.text-muted-foreground{Public display name.})+(div.flex.flex-col.gap-2>label.text-xs.font-medium[for=pref-lang]{Language}+select.select.select-sm#pref-lang[data-state=valid]>option{English}+option{Lithuanian}+option{French}^p.text-xs.text-muted-foreground{Preferred interface language.})+(div.flex.items-center.justify-between.rounded-lg.border.border-border.p-4>div.flex.flex-col.gap-2>span.text-xs.font-medium{Marketing Emails}+span.text-xs.text-muted-foreground{Receive updates about new features.}^input.switch.switch-sm[type=checkbox][data-state=checked])',
      },
    ],
    mounts: [
      { parent: 'forms-root', anchor: 'forms-body', child: 'forms-body', order: 0 },
    ],
    slots: [],
    ports: [],
    componentRefs: ['card', 'input', 'select', 'switch', 'button', 'label'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'forms-root' },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // products
  blocks['products'] = {
    schemaVersion: 1,
    id: 'products',
    role: 'workspace',
    family: 'workspace',
    description: 'Product catalog workspace with filter toolbar, inventory table, stock status badges, and pagination.',
    tags: ['workspace', 'products', 'ecommerce', 'catalog', 'table'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=products]>div.flex.items-center.justify-between.gap-4[data-slot=header]>div.flex.flex-col.gap-2>h2.text-xl.font-semibold{Products}+p.text-xs.text-muted-foreground{Manage catalog items, pricing, and stock status.}^button.btn.btn-sm.btn-primary{+ Add Product}^^div[data-slot=table]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'table', at: { fragment: 'content-frame', name: 'table' }, accepts: ['table', 'data'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'table', 'button', 'input'],
    ruleRefs: [],
    dependencyBlockIds: ['data-table-rich'],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // analytics
  blocks['analytics'] = {
    schemaVersion: 1,
    id: 'analytics',
    role: 'dashboard',
    family: 'workspace',
    description: 'Multi-metric analytics dashboard workspace with period selectors, conversion metrics, revenue chart canvas, and source breakdown.',
    tags: ['dashboard', 'analytics', 'workspace', 'chart', 'metrics'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=analytics]>div.flex.items-center.justify-between.gap-4[data-slot=header]>div.flex.flex-col.gap-2>h2.text-xl.font-semibold{Analytics Overview}+p.text-xs.text-muted-foreground{Realtime user traffic and conversion performance.}^div[data-slot=period-filter]^^div[data-slot=kpi]+div.grid.grid-cols-1.gap-6.lg:grid-cols-3>div.lg:col-span-2[data-slot=chart]+div[data-slot=sources]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'period-filter', at: { fragment: 'content-frame', name: 'period-filter' }, accepts: ['action', 'range-control'], min: 0, max: 1 },
      { id: 'kpi', at: { fragment: 'content-frame', name: 'kpi' }, accepts: ['metrics', 'kpi'], min: 0, max: 1 },
      { id: 'chart', at: { fragment: 'content-frame', name: 'chart' }, accepts: ['chart', 'activity'], min: 0, max: 1 },
      { id: 'sources', at: { fragment: 'content-frame', name: 'sources' }, accepts: ['table', 'data', 'workspace'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'button', 'table'],
    ruleRefs: [],
    dependencyBlockIds: ['metrics-summary', 'svg-area-chart'],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // billing
  blocks['billing'] = {
    schemaVersion: 1,
    id: 'billing',
    role: 'workspace',
    family: 'workspace',
    description: 'Subscription and billing workspace with active plan card, payment method list, invoice history table, and upgrade CTA.',
    tags: ['workspace', 'billing', 'subscription', 'invoices', 'payment'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=billing]>div.flex.items-center.justify-between.gap-4[data-slot=header]>div.flex.flex-col.gap-2>h2.text-xl.font-semibold{Billing & Subscription}+p.text-xs.text-muted-foreground{Manage your plan, payment methods, and invoice history.}^button.btn.btn-sm.btn-primary{Upgrade Plan}^^div.grid.grid-cols-1.gap-6.md:grid-cols-2>div.card.p-6.border.border-border.rounded-xl.bg-card[data-slot=plan-card]>span.text-xs.text-muted-foreground{Current Plan}+h3.text-xl.font-semibold.pt-2{Pro Team Plan}+p.text-xs.text-muted-foreground{Renews on Nov 1, 2026}^div.card.p-6.border.border-border.rounded-xl.bg-card[data-slot=payment-card]>span.text-xs.text-muted-foreground{Payment Method}+h3.text-lg.font-semibold.pt-2{Visa ending in 4242}+button.btn.btn-xs.btn-outline.mt-2{Update}^^div[data-slot=invoice-table]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'plan-card', at: { fragment: 'content-frame', name: 'plan-card' }, accepts: ['card', 'workspace'], min: 0, max: 1 },
      { id: 'payment-card', at: { fragment: 'content-frame', name: 'payment-card' }, accepts: ['card', 'workspace'], min: 0, max: 1 },
      { id: 'invoice-table', at: { fragment: 'content-frame', name: 'invoice-table' }, accepts: ['table', 'data'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'table', 'button'],
    ruleRefs: [],
    dependencyBlockIds: ['data-table-rich'],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // settings
  blocks['settings'] = {
    schemaVersion: 1,
    id: 'settings',
    role: 'workspace',
    family: 'workspace',
    description: 'Organization and user settings workspace with tabbed navigation, general settings form, and security options.',
    tags: ['workspace', 'settings', 'profile', 'organization', 'tabs'],
    root: 'content-frame',
    fragments: [
      {
        id: 'content-frame',
        emmet: 'div.flex.flex-1.flex-col.gap-6.p-6[data-role=canvas][data-macro=canvas][data-block=settings]>div.flex.flex-col.gap-2[data-slot=header]>h2.text-xl.font-semibold{Settings}+p.text-xs.text-muted-foreground{Manage your account settings and preferences.}^^div[data-slot=tabs]+div[data-slot=content]',
      },
    ],
    mounts: [],
    slots: [
      { id: 'tabs', at: { fragment: 'content-frame', name: 'tabs' }, accepts: ['tabs'], min: 0, max: 1 },
      { id: 'content', at: { fragment: 'content-frame', name: 'content' }, accepts: ['form', 'workspace'], min: 0, max: 1 },
    ],
    ports: [
      { id: 'main-in', at: { fragment: 'content-frame', name: 'content-frame' }, direction: 'in', kind: 'region', contract: 'main', minLinks: 0, maxLinks: 1, scope: 'shell' },
    ],
    componentRefs: ['card', 'button', 'input', 'select'],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: 'content-frame' },
    landmarks: { main: 1, primaryHeading: 0 },
    provenance: { origin: 'authored', sourceHashes: {}, mappingVersion: '1.0.0' },
  };

  // Safety assertions on all generated fragments: length and spacing
  for (const [blockId, block] of Object.entries(blocks)) {
    for (const frag of block.fragments) {
      if (frag.emmet.length > 1200) {
        throw new Error(`Block ${blockId} fragment ${frag.id} exceeds 1200 chars: ${frag.emmet.length}`);
      }
      assertValidSpacing(frag.emmet, blockId, frag.id);
    }
  }

  return blocks;
}

/**
 * Registry of Curated Authoring Recipes for Ingestion & Synthesis
 */
function buildAuthoringRecipes() {
  const recipes = {};

  // 1. E-commerce Overview
  recipes['ecommerce-overview'] = {
    schemaVersion: 1,
    id: 'ecommerce-overview',
    kind: 'page',
    profile: 'app-default',
    entryPage: 'overview',
    routeLinks: [],
    pages: [
      {
        id: 'overview',
        route: '/dashboard/ecommerce',
        recipe: 'ecommerce-overview',
        root: 'shell',
        status: 'plan-ready',
        decisions: { density: 'comfortable' },
        nodes: {
          shell: { id: 'shell', block: 'app-shell', bindings: {} },
          nav: { id: 'nav', block: 'sidebar-dashboard-shell', parent: { node: 'shell', slot: 'navigation', order: 0 }, bindings: {} },
          header: { id: 'header', block: 'page-header', parent: { node: 'shell', slot: 'header', order: 0 }, bindings: {} },
          canvas: { id: 'canvas', block: 'dashboard-02', parent: { node: 'shell', slot: 'content', order: 0 }, bindings: {} },
          kpi: { id: 'kpi', block: 'metrics-summary', parent: { node: 'canvas', slot: 'kpi', order: 0 }, bindings: {} },
          overview: { id: 'overview', block: 'svg-area-chart', parent: { node: 'canvas', slot: 'overview', order: 0 }, bindings: {} },
          orders: { id: 'orders', block: 'data-table-rich', parent: { node: 'canvas', slot: 'recent-orders', order: 0 }, bindings: {} },
        },
        connections: [
          { id: 'shell-to-canvas', relation: 'controls', from: { node: 'shell', port: 'main-region' }, to: { node: 'canvas', port: 'main-in' } },
          { id: 'header-to-nav', relation: 'controls', from: { node: 'header', port: 'nav-toggle-out' }, to: { node: 'nav', port: 'nav-toggle-in' } },
        ],
        rules: [
          { id: 'ecom-shell-frame', type: 'same-frame', nodes: ['header', 'canvas'] },
          { id: 'ecom-same-shell', type: 'same-shell', nodes: ['nav', 'header', 'canvas'] },
          { id: 'ecom-shell-gutter', type: 'single-owner', boundary: 'shell-root', property: 'gutter', nodes: ['shell'] },
        ],
      },
    ],
  };

  // 2. Analytics Workspace
  recipes['analytics-workspace'] = {
    schemaVersion: 1,
    id: 'analytics-workspace',
    kind: 'page',
    profile: 'app-default',
    entryPage: 'analytics',
    routeLinks: [],
    pages: [
      {
        id: 'analytics',
        route: '/workspace/analytics',
        recipe: 'analytics-workspace',
        root: 'shell',
        status: 'plan-ready',
        decisions: { density: 'comfortable' },
        nodes: {
          shell: { id: 'shell', block: 'app-shell', bindings: {} },
          nav: { id: 'nav', block: 'sidebar-dashboard-shell', parent: { node: 'shell', slot: 'navigation', order: 0 }, bindings: {} },
          header: { id: 'header', block: 'page-header', parent: { node: 'shell', slot: 'header', order: 0 }, bindings: {} },
          canvas: { id: 'canvas', block: 'dashboard-01', parent: { node: 'shell', slot: 'content', order: 0 }, bindings: {} },
          kpi: { id: 'kpi', block: 'metrics-summary', parent: { node: 'canvas', slot: 'kpi', order: 0 }, bindings: {} },
          chart: { id: 'chart', block: 'svg-area-chart', parent: { node: 'canvas', slot: 'chart', order: 0 }, bindings: {} },
          table: { id: 'table', block: 'data-table-rich', parent: { node: 'canvas', slot: 'table', order: 0 }, bindings: {} },
        },
        connections: [
          { id: 'shell-to-canvas', relation: 'controls', from: { node: 'shell', port: 'main-region' }, to: { node: 'canvas', port: 'main-in' } },
          { id: 'header-to-nav', relation: 'controls', from: { node: 'header', port: 'nav-toggle-out' }, to: { node: 'nav', port: 'nav-toggle-in' } },
        ],
        rules: [
          { id: 'analytics-shell-frame', type: 'same-frame', nodes: ['header', 'canvas'] },
          { id: 'analytics-same-shell', type: 'same-shell', nodes: ['nav', 'header', 'canvas'] },
          { id: 'analytics-shell-gutter', type: 'single-owner', boundary: 'shell-root', property: 'gutter', nodes: ['shell'] },
        ],
      },
    ],
  };

  // 3. Tasks Table Workspace (Data Table Detail variant)
  recipes['tasks-table-workspace'] = {
    schemaVersion: 1,
    id: 'tasks-table-workspace',
    kind: 'page',
    profile: 'app-default',
    entryPage: 'tasks',
    routeLinks: [],
    pages: [
      {
        id: 'tasks',
        route: '/workspace/tasks',
        recipe: 'tasks-table-workspace',
        root: 'shell',
        status: 'plan-ready',
        decisions: { density: 'compact' },
        nodes: {
          shell: { id: 'shell', block: 'app-shell', bindings: {} },
          nav: { id: 'nav', block: 'sidebar-dashboard-shell', parent: { node: 'shell', slot: 'navigation', order: 0 }, bindings: {} },
          header: { id: 'header', block: 'page-header', parent: { node: 'shell', slot: 'header', order: 0 }, bindings: {} },
          canvas: { id: 'canvas', block: 'tasks', parent: { node: 'shell', slot: 'content', order: 0 }, bindings: {} },
          table: { id: 'table', block: 'data-table-rich', parent: { node: 'canvas', slot: 'table', order: 0 }, bindings: {} },
        },
        connections: [
          { id: 'shell-to-canvas', relation: 'controls', from: { node: 'shell', port: 'main-region' }, to: { node: 'canvas', port: 'main-in' } },
          { id: 'header-to-nav', relation: 'controls', from: { node: 'header', port: 'nav-toggle-out' }, to: { node: 'nav', port: 'nav-toggle-in' } },
        ],
        rules: [
          { id: 'tasks-shell-frame', type: 'same-frame', nodes: ['header', 'canvas'] },
          { id: 'tasks-same-shell', type: 'same-shell', nodes: ['nav', 'header', 'canvas'] },
          { id: 'tasks-shell-gutter', type: 'single-owner', boundary: 'shell-root', property: 'gutter', nodes: ['shell'] },
        ],
      },
    ],
  };

  // 4. Mail Workspace
  recipes['mail-workspace'] = {
    schemaVersion: 1,
    id: 'mail-workspace',
    kind: 'page',
    profile: 'app-default',
    entryPage: 'mail',
    routeLinks: [],
    pages: [
      {
        id: 'mail',
        route: '/workspace/mail',
        recipe: 'mail-workspace',
        root: 'shell',
        status: 'plan-ready',
        decisions: { density: 'compact' },
        nodes: {
          shell: { id: 'shell', block: 'app-shell', bindings: {} },
          nav: { id: 'nav', block: 'sidebar-dashboard-shell', parent: { node: 'shell', slot: 'navigation', order: 0 }, bindings: {} },
          header: { id: 'header', block: 'page-header', parent: { node: 'shell', slot: 'header', order: 0 }, bindings: {} },
          canvas: { id: 'canvas', block: 'mail', parent: { node: 'shell', slot: 'content', order: 0 }, bindings: {} },
        },
        connections: [
          { id: 'shell-to-canvas', relation: 'controls', from: { node: 'shell', port: 'main-region' }, to: { node: 'canvas', port: 'main-in' } },
          { id: 'header-to-nav', relation: 'controls', from: { node: 'header', port: 'nav-toggle-out' }, to: { node: 'nav', port: 'nav-toggle-in' } },
        ],
        rules: [
          { id: 'mail-shell-frame', type: 'same-frame', nodes: ['header', 'canvas'] },
          { id: 'mail-same-shell', type: 'same-shell', nodes: ['nav', 'header', 'canvas'] },
          { id: 'mail-shell-gutter', type: 'single-owner', boundary: 'shell-root', property: 'gutter', nodes: ['shell'] },
        ],
      },
    ],
  };

  return recipes;
}

async function main() {
  console.log('Ingesting shadcn/ui new-york-v4 blocks and authoring recipes...');

  // Target block names: sidebars 01-16, dashboards 01-07, auth, workspaces
  const targetBlocks = [
    // Sidebars
    'sidebar-01',
    'sidebar-02',
    'sidebar-03',
    'sidebar-04',
    'sidebar-05',
    'sidebar-06',
    'sidebar-07',
    'sidebar-08',
    'sidebar-09',
    'sidebar-10',
    'sidebar-11',
    'sidebar-12',
    'sidebar-13',
    'sidebar-14',
    'sidebar-15',
    'sidebar-16',
    // Dashboards
    'dashboard-01',
    'dashboard-02',
    'dashboard-03',
    'dashboard-04',
    'dashboard-05',
    'dashboard-06',
    'dashboard-07',
    // Auth
    'login-01',
    'login-02',
    'login-03',
    'login-04',
    'login-05',
    'signup-01',
    'signup-02',
    'signup-03',
    'signup-04',
    'signup-05',
    'otp-01',
    'otp-02',
    'otp-03',
    'otp-04',
    'otp-05',
    'authentication',
    // Workspaces
    'mail',
    'tasks',
    'forms',
    'products',
    'analytics',
    'billing',
    'settings',
  ];

  const upstreamMap = {};
  const fetchPromises = targetBlocks.map(async (name) => {
    const upstream = await fetchUpstreamBlock(name);
    return [name, upstream];
  });
  const fetchResults = await Promise.all(fetchPromises);
  for (const [name, upstream] of fetchResults) {
    if (upstream) {
      console.log(`✓ Fetched upstream: ${name}`);
      upstreamMap[name] = upstream;
    } else {
      console.log(`- Upstream 404/offline for ${name}, synthesizing from Basecoat v4 templates`);
    }
  }

  // Ensure directories exist
  await mkdir(BLOCKS_DIR, { recursive: true });
  await mkdir(RECIPES_DIR, { recursive: true });
  await mkdir(GENERATED_DIR, { recursive: true });

  // Generate blocks
  const blocks = buildAuthoringBlocks(upstreamMap);
  const writtenBlockIds = [];
  for (const [id, block] of Object.entries(blocks)) {
    const targetFile = join(BLOCKS_DIR, `${id}.json`);
    await writeFile(targetFile, `${JSON.stringify(block, null, 2)}\n`, 'utf8');
    writtenBlockIds.push(id);
    console.log(`✓ Wrote block: ${id}`);
  }

  // Generate recipes
  const recipes = buildAuthoringRecipes();
  const writtenRecipeIds = [];
  for (const [id, recipe] of Object.entries(recipes)) {
    const targetFile = join(RECIPES_DIR, `${id}.json`);
    await writeFile(targetFile, `${JSON.stringify(recipe, null, 2)}\n`, 'utf8');
    writtenRecipeIds.push(id);
    console.log(`✓ Wrote recipe: ${id}`);
  }

  // Compile blocks into snapshot
  try {
    execSync('npm run compile:blocks', { cwd: ROOT, stdio: 'inherit' });
  } catch (err) {
    console.error('compile:blocks failed:', err);
    throw err;
  }

  // Mirror snapshot to generated directory
  try {
    const snapshotContent = await readFile(SNAPSHOT_PATH, 'utf8');
    await writeFile(GENERATED_SNAPSHOT_PATH, snapshotContent, 'utf8');
    console.log('✓ Mirrored snapshot to src/macros/generated/registry.snapshot.json');
  } catch (err) {
    console.error('Failed to mirror snapshot:', err);
  }

  console.log('\nIngestion Complete:');
  console.log(`Blocks (${writtenBlockIds.length}): ${writtenBlockIds.join(', ')}`);
  console.log(`Recipes (${writtenRecipeIds.length}): ${writtenRecipeIds.join(', ')}`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
