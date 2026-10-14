// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Ingestion & translation pipeline for shadcn/ui new-york-v4 blocks into Basecoat UI macros.
// Translates React/Radix JSX into semantic HTML + Tailwind CSS v4 Emmet macros with clean fallbacks.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

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

/**
 * Registry of Curated Authoring Blocks for Ingestion & Synthesis
 */
function buildAuthoringBlocks(upstreamMap) {
  const blocks = {};

  // 1. KPI/metric summary cards
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

  // 2. Data table with filter toolbar, bulk action bar, row action dropdown, sticky header & pagination
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

  // 3. Form field group with validation & loading FSM
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

  // 4. shadcn v4 dashboard-01
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

  // 5. shadcn v4 dashboard-02
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

  // 6. shadcn v4 dashboard-03
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

  // 7. shadcn v4 dashboard-04
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

  // 8. shadcn v4 dashboard-05
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

  // 9. shadcn v4 dashboard-06
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

  // 10. shadcn v4 dashboard-07
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

  // 11. shadcn v4 translated authentication block
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

  // 12. shadcn v4 translated forms block
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

  // 13. shadcn v4 translated tasks workspace block
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

  // 14. shadcn v4 translated mail block
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

  // Target block names
  const targetBlocks = [
    'dashboard-01',
    'dashboard-02',
    'dashboard-03',
    'dashboard-04',
    'dashboard-05',
    'dashboard-06',
    'dashboard-07',
    'authentication',
    'forms',
    'tasks',
    'mail',
    'login-01',
  ];

  const upstreamMap = {};
  for (const name of targetBlocks) {
    const upstream = await fetchUpstreamBlock(name);
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
  const { execSync } = await import('node:child_process');
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
  console.log(`Blocks: ${writtenBlockIds.join(', ')}`);
  console.log(`Recipes: ${writtenRecipeIds.join(', ')}`);
}

main().catch((err) => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
