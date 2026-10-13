// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import { getBlock, getCompiledRegistry } from '../macros/registry.js';
import type { CompiledMacroRegistry, MacroBlock, Recipe } from '../macros/types.js';
import { assertDetailBudget, MAX_DETAIL_BYTES, responseBytes } from './budget.js';

export const pageArchitectInputShape = {
  intent: z.string().max(200).optional(),
  recipe: z.string().max(80).optional(),
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
      const meta = INTENT_MAP.find(m => m.id === direct.id);
      return { recipe: direct, label: meta?.label ?? direct.id };
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
      const meta = INTENT_MAP.find(m => m.id === joined);
      return { recipe: recipesById.get(joined)!, label: meta?.label ?? joined };
    }
    let best: { id: string; label: string; score: number } | undefined;
    for (const entry of INTENT_MAP) {
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

export function runPageArchitect(input: PageArchitectInput = {}) {
  const registry = getCompiledRegistry();
  const matched = resolveRecipe(registry, input.recipe, input.intent);

  if (!matched) {
    const catalog = INTENT_MAP.map(item => {
      const r = Object.values(registry.recipes).find(rec => rec.id === item.id);
      const entry = r?.pages.find(p => p.id === r.entryPage) ?? r?.pages[0];
      return {
        recipe: item.id,
        label: item.label,
        kind: r?.kind ?? 'page',
        route: entry?.route ?? '/',
        nodeCount: entry ? Object.keys(entry.nodes).length : 0,
      };
    });
    const overview = {
      stage: '1-page-architect' as const,
      matched: false as const,
      recipe: null,
      availableScaffolds: catalog,
      usage: 'Pass recipe (e.g. "workspace-dashboard", "auth-split-flow", "workspace-detail", "workspace-settings") or intent.',
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
    rootEmmet: rootEmmet.slice(0, 320),
    slotTopology: nodes,
    leafComponents,
    nextStep: 'Call basecoat_rules_enforcer and basecoat_creative_director before writing markup.',
  };

  if (responseBytes(baseResult) <= MAX_DETAIL_BYTES) {
    return baseResult;
  }

  for (const nodeLimit of [12, 10, 8, 6]) {
    const candidate = {
      stage: '1-page-architect' as const,
      matched: true as const,
      recipe: recipe.id,
      label,
      kind: recipe.kind,
      route: page.route,
      density,
      containerContract: baseResult.containerContract,
      rootEmmet: rootEmmet.slice(0, 80),
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
    rootEmmet: rootEmmet.slice(0, 60),
    slotTopology: nodes.slice(0, 5).map(n => ({ node: n.node, block: n.block, slot: n.slot })),
    leafComponents: leafComponents.slice(0, 8),
    nextStep: baseResult.nextStep,
  };
  assertDetailBudget(minimal);
  return minimal;
}
