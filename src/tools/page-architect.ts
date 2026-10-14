// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { getBlock, getCompiledRegistry } from '../macros/registry.js';
import type { CompiledMacroRegistry, MacroBlock, Recipe } from '../macros/types.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';

export const pageArchitectInputShape = {
  intent: z.string().max(200).optional(),
  recipe: z.string().max(80).optional(),
  block: z.string().max(80).optional(),
  density: z.enum(['comfortable', 'compact']).optional(),
};

export type PageArchitectInput = z.infer<z.ZodObject<typeof pageArchitectInputShape>>;

const INTENT_MAP: Array<{ id: string; keywords: string[]; label: string }> = [
  {
    id: 'workspace-dashboard',
    label: 'Workspace Dashboard',
    keywords: ['dashboard', 'workspace', 'metrics', 'analytics', 'kpi', 'overview', 'admin', 'home'],
  },
  {
    id: 'auth-split-flow',
    label: 'Auth Split-Screen',
    keywords: ['split', 'split-screen', 'auth-split', 'onboarding', 'branded-auth', 'two-column-auth'],
  },
  {
    id: 'workspace-detail',
    label: 'Data Table Detail',
    keywords: ['detail', 'drawer', 'inspection', 'table-detail', 'master-detail', 'slide-over'],
  },
  {
    id: 'workspace-settings',
    label: 'Workspace Settings',
    keywords: ['settings', 'preferences', 'account', 'profile', 'billing', 'configuration'],
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

function tokenize(text: string): string[] {
  return text.toLowerCase().split(/[^a-z0-9-]+/).filter(Boolean);
}

function formatRecipeLabel(id: string): string {
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
): { recipe: Recipe; label: string } | null {
  const recipesById = new Map<string, Recipe>();
  for (const r of Object.values(registry.recipes)) {
    recipesById.set(r.id, r);
  }

  if (recipeParam) {
    const clean = recipeParam.trim().toLowerCase();
    const direct = recipesById.get(clean);
    if (direct) {
      return { recipe: direct, label: formatRecipeLabel(direct.id) };
    }
    const byMatch = INTENT_MAP.find(
      m => m.id === clean || m.label.toLowerCase() === clean || m.keywords.includes(clean),
    );
    if (byMatch && recipesById.has(byMatch.id)) {
      return { recipe: recipesById.get(byMatch.id)!, label: byMatch.label };
    }
  }

  if (intentParam && intentParam.trim().length > 0) {
    const tokens = tokenize(intentParam);
    const joined = tokens.join('-');
    if (recipesById.has(joined)) {
      return { recipe: recipesById.get(joined)!, label: formatRecipeLabel(joined) };
    }
    let best: { id: string; label: string; score: number } | undefined;
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
        best = { id: entry.id, label: entry.label, score };
      }
    }
    if (best && recipesById.has(best.id)) {
      return { recipe: recipesById.get(best.id)!, label: best.label };
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

function buildSemanticScaffold(
  recipeId: string,
  density: 'comfortable' | 'compact',
  slotNames: string[],
): string {
  const pad = density === 'compact' ? 'p-4 gap-4' : 'p-6 gap-6';
  const hdr = density === 'compact' ? 'h-12 px-4' : 'h-14 px-6';
  const slotsComment = slotNames.slice(0, 5).map(s => `<!-- slot:${s} -->`).join(' ');
  if (recipeId.startsWith('auth')) {
    return `<main class="grid min-h-dvh grid-cols-1 lg:grid-cols-2 bg-background text-foreground"><section class="flex items-center justify-center ${pad}" data-slot="form">${slotsComment}</section><aside class="hidden lg:flex bg-muted ${pad}" aria-label="Brand showcase" data-slot="hero"></aside></main>`;
  }
  return `<div class="min-h-dvh bg-background text-foreground"><aside class="sidebar" data-state="expanded" data-fsm-recipe="navigation" data-fsm-state="expanded" aria-label="Primary navigation" data-slot="nav"></aside><header class="flex ${hdr} items-center justify-between border-b border-border/60" data-slot="header"><h1 class="text-xl font-semibold tracking-tight">Title</h1></header><main class="grid grid-cols-1 md:grid-cols-12 ${pad}" data-slot="content">${slotsComment}</main></div>`;
}

export function runPageArchitect(input: PageArchitectInput = {}) {
  const registry = getCompiledRegistry();

  if (input.block && input.block.trim().length > 0) {
    const cleanBlock = input.block.trim().toLowerCase();
    const block = safeGetBlock(registry, cleanBlock);
    if (block) {
      const slotTopology = block.slots.map(s => ({
        node: s.id,
        block: block.id,
        slot: s.id,
        acceptsSlots: s.accepts,
      }));
      const blockResult = {
        stage: '1-page-architect' as const,
        matched: true as const,
        recipe: block.id,
        block: block.id,
        role: block.role,
        family: block.family,
        emmet: (block.fragments[0]?.emmet ?? '').slice(0, 240),
        slotTopology,
        slots: block.slots.map(s => ({ id: s.id, accepts: s.accepts })),
        components: block.componentRefs,
        landmarks: block.landmarks,
        nextStep: 'Call basecoat_rules_enforcer and basecoat_creative_director before writing markup.',
      };
      assertDetailBudget(blockResult);
      return blockResult;
    }
  }

  const matched = resolveRecipe(registry, input.recipe, input.intent);

  if (!matched) {
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
    const overview = {
      stage: '1-page-architect' as const,
      matched: false as const,
      recipe: null,
      availableScaffolds: catalog,
      blockCount: Object.keys(registry.blocks).length,
      usage: 'Pass recipe (e.g. "workspace-dashboard", "auth-split-flow", "workspace-detail", "workspace-settings"), block (e.g. "topbar-shell"), or intent.',
    };
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
    recipe.id,
    density,
    nodes.map(n => n.node),
  );

  const baseResult = {
    stage: '1-page-architect' as const,
    matched: true as const,
    recipe: recipe.id,
    label,
    kind: recipe.kind,
    route: page.route,
    density,
    containerContract: {
      frame: rootBlock?.layout.frameRef ?? 'app-frame',
      gutter: density === 'compact' ? 'px-4 py-3 gap-4' : 'px-6 py-6 gap-6',
      grid: 'grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6',
      landmarks: { main: 1, h1: 1 },
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

  for (const nodeLimit of [10, 8, 6, 5]) {
    const candidate = {
      stage: '1-page-architect' as const,
      matched: true as const,
      recipe: recipe.id,
      label,
      kind: recipe.kind,
      route: page.route,
      density,
      containerContract: baseResult.containerContract,
      scaffoldHtml,
      rootEmmet: rootEmmet.slice(0, 72),
      slotTopology: nodes.slice(0, nodeLimit).map(n => ({
        node: n.node,
        block: n.block,
        slot: n.slot,
      })),
      totalNodes: nodes.length,
      leafComponents: leafComponents.slice(0, 10),
      nextStep: baseResult.nextStep,
    };
    if (responseBytes(candidate) <= MAX_DETAIL_BYTES) {
      return candidate;
    }
  }

  const minimal = {
    stage: '1-page-architect' as const,
    matched: true as const,
    recipe: recipe.id,
    label,
    kind: recipe.kind,
    route: page.route,
    density,
    containerContract: baseResult.containerContract,
    scaffoldHtml,
    rootEmmet: rootEmmet.slice(0, 60),
    slotTopology: nodes.slice(0, 4).map(n => ({ node: n.node, block: n.block, slot: n.slot })),
    leafComponents: leafComponents.slice(0, 8),
    nextStep: baseResult.nextStep,
  };
  assertDetailBudget(minimal);
  return minimal;
}
