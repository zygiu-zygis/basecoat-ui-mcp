// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { getBlock, getCompiledRegistry } from '../macros/registry.js';
import type { CompiledMacroRegistry, MacroBlock, Recipe } from '../macros/types.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';

export const pageArchitectInputShape = {
  intent: z
    .string()
    .max(200)
    .optional()
    .describe('User or business intent for page scaffolding (e.g. "workspace-dashboard", "executive-dashboard", "sidebar-07", "data-table-detail", "auth-split-flow").'),
  recipe: z
    .string()
    .max(80)
    .optional()
    .describe('Macro recipe identifier to resolve directly (e.g. "workspace-dashboard", "workspace-detail", "workspace-settings", "auth-split-flow").'),
  block: z
    .string()
    .max(80)
    .optional()
    .describe('Specific block identifier or pattern to retrieve scaffold for (e.g. "sidebar-01".."sidebar-16", "dashboard-01".."dashboard-07", "login-01").'),
  density: z
    .enum(['comfortable', 'compact'])
    .optional()
    .describe('Visual layout density: "comfortable" (standard SaaS spacing, p-6/h-14) or "compact" (dense data tools, p-4/h-12).'),
};

export type PageArchitectInput = z.infer<z.ZodObject<typeof pageArchitectInputShape>>;

const INTENT_MAP: Array<{ id: string; keywords: string[]; label: string; scaffoldVariant?: string }> = [
  {
    id: 'workspace-dashboard',
    label: 'Workspace Dashboard',
    keywords: [
      'dashboard',
      'workspace',
      'metrics',
      'analytics',
      'kpi',
      'overview',
      'admin',
      'home',
      'executive-dashboard',
      'executive',
      'ecommerce-overview',
      'ecommerce',
      'analytics-workspace',
    ],
  },
  {
    id: 'auth-split-flow',
    label: 'Auth Split-Screen',
    keywords: ['split', 'split-screen', 'auth-split', 'onboarding', 'branded-auth', 'two-column-auth'],
  },
  {
    id: 'workspace-detail',
    label: 'Data Table Detail',
    keywords: [
      'detail',
      'drawer',
      'inspection',
      'table-detail',
      'master-detail',
      'slide-over',
      'data-table-detail',
      'data-table',
      'tasks',
    ],
  },
  {
    id: 'workspace-settings',
    label: 'Workspace Settings',
    keywords: [
      'settings',
      'preferences',
      'account',
      'profile',
      'billing',
      'configuration',
      'settings-split-screen',
    ],
  },
  {
    id: 'data-records',
    label: 'Data Records Table',
    keywords: ['records', 'table', 'list', 'crud', 'datagrid', 'filter', 'pagination'],
  },
  {
    id: 'auth-flow',
    label: 'Auth Sign-In / Sign-Up',
    keywords: ['auth', 'login', 'signin', 'sign-in', 'signup', 'sign-up', 'password'],
  },
  {
    id: 'marketing-pricing',
    label: 'Marketing Pricing',
    keywords: ['pricing', 'marketing', 'tiers', 'plans', 'landing', 'waitlist'],
  },
];

const RECIPE_ALIASES: Record<string, { recipeId: string; label: string; variant: string }> = {
  'executive-dashboard': { recipeId: 'workspace-dashboard', label: 'Executive Dashboard', variant: 'executive-dashboard' },
  'dashboard': { recipeId: 'workspace-dashboard', label: 'Executive Dashboard', variant: 'executive-dashboard' },
  'ecommerce-overview': { recipeId: 'workspace-dashboard', label: 'E-commerce Overview', variant: 'ecommerce-overview' },
  'ecommerce': { recipeId: 'workspace-dashboard', label: 'E-commerce Overview', variant: 'ecommerce-overview' },
  'analytics-workspace': { recipeId: 'workspace-dashboard', label: 'Analytics Workspace', variant: 'analytics-workspace' },
  'analytics': { recipeId: 'workspace-dashboard', label: 'Analytics Workspace', variant: 'analytics-workspace' },
  'data-table-detail': { recipeId: 'workspace-detail', label: 'Data Table Detail', variant: 'data-table-detail' },
  'data-table': { recipeId: 'workspace-detail', label: 'Data Table Detail', variant: 'data-table-detail' },
  'table-detail': { recipeId: 'workspace-detail', label: 'Data Table Detail', variant: 'data-table-detail' },
  'tasks': { recipeId: 'workspace-detail', label: 'Data Table Detail', variant: 'data-table-detail' },
  'settings-split-screen': { recipeId: 'workspace-settings', label: 'Settings Split-Screen', variant: 'settings-split-screen' },
  'settings': { recipeId: 'workspace-settings', label: 'Settings Split-Screen', variant: 'settings-split-screen' },
};

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
}

function formatRecipeLabel(id: string): string {
  const alias = RECIPE_ALIASES[id];
  if (alias) return alias.label;
  const known = INTENT_MAP.find(m => m.id === id);
  if (known) return known.label;
  return id
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function resolveRecipe(
  registry: CompiledMacroRegistry,
  recipeParam?: string,
  intentParam?: string,
): { recipe: Recipe; label: string; resultId?: string; variant: string } | null {
  const recipesById = new Map<string, Recipe>();
  for (const r of Object.values(registry.recipes)) {
    recipesById.set(r.id, r);
  }

  if (recipeParam) {
    const clean = recipeParam.trim().toLowerCase();
    const alias = RECIPE_ALIASES[clean];
    if (alias && recipesById.has(alias.recipeId)) {
      return { recipe: recipesById.get(alias.recipeId)!, label: alias.label, resultId: clean, variant: alias.variant };
    }
    const direct = recipesById.get(clean);
    if (direct) {
      return { recipe: direct, label: formatRecipeLabel(direct.id), variant: direct.id };
    }
    const byMatch = INTENT_MAP.find(
      m => m.id === clean || m.label.toLowerCase() === clean || m.keywords.includes(clean),
    );
    if (byMatch && recipesById.has(byMatch.id)) {
      return { recipe: recipesById.get(byMatch.id)!, label: byMatch.label, variant: byMatch.id };
    }
  }

  if (intentParam && intentParam.trim().length > 0) {
    const cleanIntent = intentParam.trim().toLowerCase();
    const alias = RECIPE_ALIASES[cleanIntent];
    if (alias && recipesById.has(alias.recipeId)) {
      return { recipe: recipesById.get(alias.recipeId)!, label: alias.label, variant: alias.variant };
    }

    const tokens = tokenize(intentParam);
    const joined = tokens.join('-');
    const joinedAlias = RECIPE_ALIASES[joined];
    if (joinedAlias && recipesById.has(joinedAlias.recipeId)) {
      return { recipe: recipesById.get(joinedAlias.recipeId)!, label: joinedAlias.label, variant: joinedAlias.variant };
    }
    if (recipesById.has(joined)) {
      return { recipe: recipesById.get(joined)!, label: formatRecipeLabel(joined), variant: joined };
    }

    let best: { id: string; label: string; score: number; variant?: string } | undefined;
    for (const [aliasKey, aliasVal] of Object.entries(RECIPE_ALIASES)) {
      if (cleanIntent === aliasKey || tokens.includes(aliasKey)) {
        if (recipesById.has(aliasVal.recipeId)) {
          best = { id: aliasVal.recipeId, label: aliasVal.label, score: 30, variant: aliasVal.variant };
          break;
        }
      }
    }

    if (!best) {
      for (const r of recipesById.values()) {
        const entry = INTENT_MAP.find(m => m.id === r.id) ?? {
          id: r.id,
          label: formatRecipeLabel(r.id),
          keywords: r.id.split('-'),
        };
        let score = 0;
        for (const token of tokens) {
          if (entry.id === token) score += 10;
          else if (entry.id.includes(token)) score += 5;
          if (entry.keywords.includes(token)) score += 6;
          else if (entry.keywords.some(k => k.includes(token) || token.includes(k))) score += 3;
        }
        if (tokens.includes('split') && entry.id === 'auth-split-flow') score += 8;
        if (tokens.includes('detail') && entry.id === 'workspace-detail') score += 8;
        if (tokens.includes('settings') && entry.id === 'workspace-settings') score += 8;
        if (score > 0 && (!best || score > best.score)) {
          best = { id: entry.id, label: entry.label, score, variant: entry.id };
        }
      }
    }

    if (best && recipesById.has(best.id)) {
      return { recipe: recipesById.get(best.id)!, label: best.label, variant: best.variant ?? best.id };
    }
  }

  return null;
}

function safeGetBlock(registry: CompiledMacroRegistry, refOrId: string): MacroBlock | undefined {
  try {
    return getBlock(registry, refOrId);
  } catch {
    return undefined;
  }
}

function resolveBlockByQuery(
  registry: CompiledMacroRegistry,
  query: string,
): MacroBlock | undefined {
  const clean = query.trim().toLowerCase();
  if (!clean) return undefined;
  const direct = safeGetBlock(registry, clean);
  if (direct) return direct;

  const tokens = tokenize(clean);
  if (tokens.length === 0) return undefined;

  let best: { block: MacroBlock; score: number } | undefined;
  for (const block of Object.values(registry.blocks)) {
    let score = 0;
    const blockIdTokens = tokenize(block.id);
    const roleTokens = tokenize(block.role);
    const familyTokens = tokenize(block.family);

    for (const t of tokens) {
      if (block.id === t) score += 10;
      else if (block.id.includes(t)) score += 5;
      if (blockIdTokens.includes(t)) score += 6;
      if (roleTokens.includes(t)) score += 4;
      if (familyTokens.includes(t)) score += 3;
    }

    if (score > 0 && (!best || score > best.score)) {
      best = { block, score };
    }
  }

  return best?.block;
}

function buildSemanticScaffold(
  variantOrRecipeId: string,
  density: 'comfortable' | 'compact',
  slotNames: string[],
): string {
  const pad = density === 'compact' ? 'p-4 gap-4' : 'p-6 gap-6';
  const hdr = density === 'compact' ? 'h-12 px-4' : 'h-14 px-6';
  const slotsComment = slotNames.slice(0, 3).map(s => `<!-- SLOT: ${s} -->`).join(' ');

  if (variantOrRecipeId.startsWith('auth')) {
    return `<main class="grid min-h-dvh grid-cols-1 lg:grid-cols-2 bg-background text-foreground"><section class="flex items-center justify-center ${pad}" data-slot="form"><!-- SLOT: form --> ${slotsComment}</section><aside class="hidden lg:flex bg-muted ${pad}" aria-label="Brand showcase" data-slot="hero"><!-- SLOT: hero --></aside></main>`;
  }

  const aside = `<aside class="sidebar group/sidebar" data-state="expanded" data-collapsible="tooltip" data-fsm-recipe="navigation" data-fsm-state="expanded" aria-label="Primary navigation" data-slot="nav"><!-- SLOT: nav --></aside>`;

  if (variantOrRecipeId === 'marketing-pricing') {
    return `<div class="min-h-dvh bg-background text-foreground"><header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><span class="font-semibold">Acme</span><nav aria-label="Nav" class="flex gap-4 text-sm"><!-- SLOT: nav --></nav></header><main class="grid grid-cols-1 md:grid-cols-3 ${pad}" data-slot="content"><!-- SLOT: pricing --> ${slotsComment}</main></div>`;
  }

  if (variantOrRecipeId === 'ecommerce-overview' || variantOrRecipeId === 'ecommerce') {
    return `<div class="min-h-dvh bg-background text-foreground flex">${aside}<div class="flex-1 min-w-0"><header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><nav aria-label="Breadcrumb" class="breadcrumb text-sm flex gap-1 text-muted-foreground"><span>Store</span>/<span>Overview</span></nav><div class="flex gap-2" data-slot="header-actions"><!-- SLOT: actions --></div></header><main class="grid grid-cols-1 md:grid-cols-12 ${pad}" data-slot="content"><section class="col-span-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4" data-slot="metrics"><!-- SLOT: metrics --></section><section class="col-span-12 xl:col-span-8 card p-4" data-slot="sales-chart"><!-- SLOT: sales-chart --></section><section class="col-span-12 xl:col-span-4 card p-4" data-slot="top-products"><!-- SLOT: top-products --> ${slotsComment}</section></main></div></div>`;
  }

  if (variantOrRecipeId === 'analytics-workspace' || variantOrRecipeId === 'analytics') {
    return `<div class="min-h-dvh bg-background text-foreground flex">${aside}<div class="flex-1 min-w-0"><header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><nav aria-label="Breadcrumb" class="breadcrumb text-sm flex gap-1 text-muted-foreground"><span>Analytics</span>/<span>Metrics</span></nav><div class="flex gap-2" data-slot="header-actions"><!-- SLOT: actions --></div></header><main class="grid grid-cols-1 md:grid-cols-12 ${pad}" data-slot="content"><section class="col-span-12 flex justify-between gap-4" data-slot="filters"><!-- SLOT: filter-toolbar --></section><section class="col-span-12 lg:col-span-8 card p-4" data-slot="chart"><!-- SLOT: chart --></section><section class="col-span-12 lg:col-span-4 card p-4" data-slot="cohorts"><!-- SLOT: cohorts --> ${slotsComment}</section></main></div></div>`;
  }

  if (variantOrRecipeId === 'workspace-detail' || variantOrRecipeId === 'data-table-detail' || variantOrRecipeId === 'data-records' || variantOrRecipeId === 'table-detail' || variantOrRecipeId === 'tasks') {
    return `<div class="min-h-dvh bg-background text-foreground flex">${aside}<div class="flex-1 min-w-0"><header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><nav aria-label="Breadcrumb" class="breadcrumb text-sm flex gap-1 text-muted-foreground"><span>Admin</span>/<span>Records</span></nav><div class="flex gap-2" data-slot="header-actions"><!-- SLOT: actions --></div></header><main class="grid grid-cols-1 md:grid-cols-12 ${pad}" data-slot="content"><section class="col-span-12 flex justify-between gap-4" data-slot="toolbar"><!-- SLOT: table-toolbar --></section><section class="col-span-12 lg:col-span-8 card overflow-x-auto" data-slot="table"><!-- SLOT: data-table --></section><section class="col-span-12 lg:col-span-4 card p-4" data-slot="drawer"><!-- SLOT: detail-drawer --> ${slotsComment}</section></main></div></div>`;
  }

  if (variantOrRecipeId === 'workspace-settings' || variantOrRecipeId === 'settings-split-screen' || variantOrRecipeId === 'settings') {
    return `<div class="min-h-dvh bg-background text-foreground flex">${aside}<div class="flex-1 min-w-0"><header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><nav aria-label="Breadcrumb" class="breadcrumb text-sm flex gap-1 text-muted-foreground"><span>Settings</span>/<span>General</span></nav></header><main class="grid grid-cols-1 md:grid-cols-12 ${pad}" data-slot="content"><nav aria-label="Settings nav" class="col-span-12 md:col-span-3 space-y-1" data-slot="settings-nav"><!-- SLOT: settings-nav --></nav><section class="col-span-12 md:col-span-9 card p-4" data-slot="settings-form"><!-- SLOT: settings-form --> ${slotsComment}</section></main></div></div>`;
  }

  // Default: Executive Dashboard / Workspace Dashboard
  return `<div class="min-h-dvh bg-background text-foreground flex">${aside}<div class="flex-1 min-w-0"><header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><nav aria-label="Breadcrumbs" class="breadcrumb text-sm flex gap-1 text-muted-foreground"><span>App</span>/<span>Overview</span></nav><div class="flex gap-2" data-slot="header-actions"><!-- SLOT: actions --></div></header><main class="grid grid-cols-1 md:grid-cols-12 ${pad}" data-slot="content"><section class="col-span-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" data-slot="metrics"><!-- SLOT: metrics --></section><section class="col-span-12 lg:col-span-8 card p-4" data-slot="chart"><!-- SLOT: chart --></section><section class="col-span-12 lg:col-span-4 card p-4" data-slot="activity"><!-- SLOT: activity --> ${slotsComment}</section></main></div></div>`;
}

function buildBlockResult(
  block: MacroBlock,
  density: 'comfortable' | 'compact',
) {
  const slotTopology = block.slots.map(s => ({
    node: s.id,
    block: block.id,
    slot: s.id,
    acceptsSlots: s.accepts,
  }));
  const pad = density === 'compact' ? 'p-4 gap-4' : 'p-6 gap-6';
  const hdr = density === 'compact' ? 'h-12 px-4' : 'h-14 px-6';
  const explicitSlotMarkers = block.slots.length > 0
    ? block.slots.slice(0, 4).map(s => `<div data-slot="${s.id}"><!-- SLOT: ${s.id} --></div>`).join('')
    : `<!-- SLOT: ${block.id} -->`;
  let scaffoldHtml: string;
  if (block.id.startsWith('sidebar-') || block.id.includes('sidebar') || block.id.includes('nav')) {
    scaffoldHtml = `<aside class="sidebar group/sidebar" data-state="expanded" data-collapsible="tooltip" data-fsm-recipe="navigation" data-fsm-state="expanded" aria-label="Primary navigation" data-slot="nav">${explicitSlotMarkers}</aside>`;
  } else if (block.id.startsWith('dashboard-') || block.id.includes('dashboard')) {
    scaffoldHtml = `<div class="flex flex-1 flex-col ${pad}" data-slot="${block.id}">${explicitSlotMarkers}</div>`;
  } else if (block.id.includes('topbar') || block.id.includes('header')) {
    scaffoldHtml = `<header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><nav aria-label="Breadcrumb" class="breadcrumb text-sm flex gap-1 text-muted-foreground"><span>App</span>/<span>Overview</span></nav><div class="flex gap-2" data-slot="header-actions">${explicitSlotMarkers}</div></header>`;
  } else if (block.id.includes('card') || block.id.includes('table') || block.id.includes('chart') || block.id.includes('metric')) {
    scaffoldHtml = `<section class="card ${pad}" data-slot="${block.id}">${explicitSlotMarkers}</section>`;
  } else {
    scaffoldHtml = `<div class="${pad}" data-slot="${block.id}">${explicitSlotMarkers}</div>`;
  }

  const containerContract = {
    frame: block.layout?.frameRef ?? 'app-frame',
    gutter: density === 'compact' ? 'px-4 py-3 gap-4' : 'px-6 py-6 gap-6',
    grid: 'grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6',
    landmarks: { main: 1, h1: 1 },
  };

  let blockResult = {
    stage: '1-page-architect' as const,
    matched: true as const,
    recipe: block.id,
    block: block.id,
    role: block.role,
    family: block.family,
    density,
    containerContract,
    scaffoldHtml,
    emmet: (block.fragments[0]?.emmet ?? '').slice(0, 120),
    slotTopology: slotTopology.slice(0, 4),
    slots: block.slots.slice(0, 4).map(s => ({ id: s.id, accepts: s.accepts })),
    components: block.componentRefs.slice(0, 4),
    landmarks: block.landmarks,
    nextStep: 'Call basecoat_compose_stack or basecoat_rules_enforcer next before assembling markup.',
  };

  if (responseBytes(blockResult) <= MAX_DETAIL_BYTES) {
    return blockResult;
  }

  blockResult = {
    ...blockResult,
    emmet: (block.fragments[0]?.emmet ?? '').slice(0, 40),
    components: block.componentRefs.slice(0, 3),
    slotTopology: slotTopology.slice(0, 2),
    slots: block.slots.slice(0, 2).map(s => ({ id: s.id, accepts: s.accepts })),
    nextStep: 'Call basecoat_compose_stack or basecoat_rules_enforcer next.',
  };

  if (responseBytes(blockResult) <= MAX_DETAIL_BYTES) {
    return blockResult;
  }

  const minimalBlockResult = {
    ...blockResult,
    emmet: '',
    components: block.componentRefs.slice(0, 2),
    slotTopology: slotTopology.slice(0, 2),
    slots: block.slots.slice(0, 2).map(s => ({ id: s.id, accepts: s.accepts })),
    nextStep: 'Call basecoat_compose_stack or basecoat_rules_enforcer next.',
  };
  assertDetailBudget(minimalBlockResult);
  return minimalBlockResult;
}

export function runPageArchitect(input: PageArchitectInput = {}) {
  const registry = getCompiledRegistry();
  const requestedDensity = input.density ?? 'comfortable';

  if (input.block && input.block.trim().length > 0) {
    const block = resolveBlockByQuery(registry, input.block);
    if (block) {
      return buildBlockResult(block, requestedDensity);
    }
  }

  const matched = resolveRecipe(registry, input.recipe, input.intent);

  if (!matched) {
    const fallbackBlockQuery = input.recipe ?? input.intent;
    if (fallbackBlockQuery && fallbackBlockQuery.trim().length > 0) {
      const block = resolveBlockByQuery(registry, fallbackBlockQuery);
      if (block) {
        return buildBlockResult(block, requestedDensity);
      }
    }
    const allRecipes = Object.values(registry.recipes);
    const catalog = allRecipes.map(r => {
      const entry = r.pages.find(p => p.id === r.entryPage) ?? r.pages[0];
      return {
        recipe: r.id,
        label: formatRecipeLabel(r.id),
        kind: r.kind,
        route: entry?.route ?? '/',
        nodeCount: entry ? Object.keys(entry.nodes).length : 0,
      };
    });
    let overview = {
      stage: '1-page-architect' as const,
      matched: false as const,
      recipe: null,
      availableScaffolds: catalog,
      blockCount: Object.keys(registry.blocks).length,
      usage: 'Pass recipe (e.g. "workspace-dashboard"), block, or intent.',
    };
    if (responseBytes(overview) > MAX_DETAIL_BYTES) {
      for (const cap of [12, 10, 8, 7]) {
        overview = {
          ...overview,
          availableScaffolds: catalog.slice(0, cap),
        };
        if (responseBytes(overview) <= MAX_DETAIL_BYTES) break;
      }
    }
    assertDetailBudget(overview);
    return overview;
  }

  const { recipe, label } = matched;
  const page = recipe.pages.find(p => p.id === recipe.entryPage) ?? recipe.pages[0]!;
  const density = input.density ?? (page.decisions.density === 'compact' ? 'compact' : 'comfortable');
  const rootNode = page.nodes[page.root];
  const rootBlock = rootNode ? safeGetBlock(registry, rootNode.block) : undefined;

  const nodes = Object.values(page.nodes).map(node => {
    const block = safeGetBlock(registry, node.block);
    return {
      node: node.id,
      block: block?.id ?? node.block,
      role: block?.role ?? 'region',
      slot: node.parent ? `${node.parent.node}.${node.parent.slot}` : 'root',
      acceptsSlots: block?.slots.map(s => s.id) ?? [],
      components: block?.componentRefs ?? [],
    };
  });

  const leafComponents = [...new Set(nodes.flatMap(n => n.components))].sort();
  const rootEmmet = rootBlock?.fragments[0]?.emmet ?? '';
  const scaffoldHtml = buildSemanticScaffold(
    matched.variant ?? recipe.id,
    density,
    nodes.map(n => n.node),
  );

  const baseResult = {
    stage: '1-page-architect' as const,
    matched: true as const,
    recipe: matched.resultId ?? recipe.id,
    label,
    kind: recipe.kind,
    route: page.route,
    density,
    containerContract: {
      frame: rootBlock?.layout.frameRef ?? 'app-frame',
      gutter: density === 'compact' ? 'px-4 py-3 gap-4' : 'px-6 py-6 gap-6',
      grid: 'grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6',
      landmarks: { main: 1, header: 1, aside: 1, h1: 1 },
    },
    scaffoldHtml,
    rootEmmet: rootEmmet.slice(0, 200),
    slotTopology: nodes,
    leafComponents,
    nextStep: 'Call basecoat_rules_enforcer and basecoat_creative_director before writing markup.',
  };

  if (responseBytes(baseResult) <= MAX_DETAIL_BYTES) {
    return baseResult;
  }

  for (const nodeLimit of [10, 8, 6, 5, 4, 3, 2, 1]) {
    const candidate = {
      stage: '1-page-architect' as const,
      matched: true as const,
      recipe: baseResult.recipe,
      label,
      kind: recipe.kind,
      route: page.route,
      density,
      containerContract: baseResult.containerContract,
      scaffoldHtml,
      rootEmmet: rootEmmet.slice(0, 40),
      slotTopology: nodes.slice(0, nodeLimit).map(n => ({
        node: n.node,
        block: n.block,
        slot: n.slot,
      })),
      totalNodes: nodes.length,
      leafComponents: leafComponents.slice(0, 6),
      nextStep: 'Call basecoat_rules_enforcer.',
    };
    if (responseBytes(candidate) <= MAX_DETAIL_BYTES) {
      return candidate;
    }
  }

  const minimal = {
    stage: '1-page-architect' as const,
    matched: true as const,
    recipe: baseResult.recipe,
    label,
    kind: recipe.kind,
    route: page.route,
    density,
    containerContract: baseResult.containerContract,
    scaffoldHtml,
    rootEmmet: '',
    slotTopology: nodes.slice(0, 1).map(n => ({ node: n.node, block: n.block, slot: n.slot })),
    leafComponents: leafComponents.slice(0, 3),
    nextStep: 'Call basecoat_rules_enforcer.',
  };
  assertDetailBudget(minimal);
  return minimal;
}
