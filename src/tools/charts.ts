// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

export type ChartCategory = 'area' | 'bar' | 'line' | 'pie' | 'radar' | 'radial' | 'tooltip';
export type ChartFramework = 'vanilla' | 'astro' | 'react' | 'vue' | 'svelte';

export interface ChartCatalogItem {
  id: string;
  category: ChartCategory;
  name: string;
  description: string;
  tags: string[];
  cssTokens: string[];
  html: string;
  frameworks: Record<ChartFramework, string>;
}

export interface ChartsCatalog {
  schemaVersion: number;
  totalCharts: number;
  categories: ChartCategory[];
  charts: ChartCatalogItem[];
}

function loadChartsCatalog(): ChartsCatalog {
  const urlPath = fileURLToPath(new URL('../data/catalog/charts-catalog.json', import.meta.url));
  if (existsSync(urlPath)) {
    return JSON.parse(readFileSync(urlPath, 'utf-8'));
  }
  const altPath = urlPath.includes('/dist/')
    ? urlPath.replace('/dist/', '/src/')
    : urlPath.replace('/src/', '/dist/');
  if (existsSync(altPath)) {
    return JSON.parse(readFileSync(altPath, 'utf-8'));
  }
  return JSON.parse(readFileSync(urlPath, 'utf-8'));
}

const chartsCatalog: ChartsCatalog = loadChartsCatalog();

export const listChartsInputShape = {
  category: z
    .enum(['area', 'bar', 'line', 'pie', 'radar', 'radial', 'tooltip'])
    .optional()
    .describe('Filter charts by category (area, bar, line, pie, radar, radial, tooltip).'),
  query: z
    .string()
    .max(120)
    .optional()
    .describe('Search keyword for chart variant (e.g., stacked, gradient, sparkline, donut, gauge).'),
};

export type ListChartsInput = z.infer<z.ZodObject<typeof listChartsInputShape>>;

export interface ListChartsSummary {
  id: string;
  category: ChartCategory;
  name: string;
  description: string;
  tags: string[];
  cssTokens: string[];
}

export interface ListChartsOutput {
  total: number;
  categories: ChartCategory[];
  charts: ListChartsSummary[];
}

export function runListCharts(input: ListChartsInput): ListChartsOutput {
  let filtered = chartsCatalog.charts;

  if (input.category) {
    filtered = filtered.filter(c => c.category === input.category);
  }

  if (input.query && input.query.trim().length > 0) {
    const q = input.query.trim().toLowerCase();
    filtered = filtered.filter(c => {
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }

  const charts: ListChartsSummary[] = filtered.map(c => ({
    id: c.id,
    category: c.category,
    name: c.name,
    description: c.description,
    tags: c.tags,
    cssTokens: c.cssTokens,
  }));

  return {
    total: charts.length,
    categories: chartsCatalog.categories,
    charts,
  };
}

export const getChartBlueprintInputShape = {
  id: z
    .string()
    .max(80)
    .describe(
      'Chart blueprint ID from basecoat_list_charts (e.g., area-default, area-stacked, bar-comparison, line-multiple, pie-donut, radar-default, radial-gauge, tooltip-default). Also accepts category name to return its default chart.',
    ),
  framework: z
    .enum(['vanilla', 'astro', 'react', 'vue', 'svelte'])
    .optional()
    .describe('Target framework mount generator (vanilla, astro, react, vue, svelte). Defaults to vanilla.'),
};

export type GetChartBlueprintInput = z.infer<z.ZodObject<typeof getChartBlueprintInputShape>>;

export interface GetChartBlueprintOutput {
  id: string;
  category: ChartCategory;
  name: string;
  description: string;
  framework: ChartFramework;
  cssTokens: string[];
  html: string;
  mountCode: string;
  allFrameworksAvailable: ['vanilla', 'astro', 'react', 'vue', 'svelte'];
}

const CATEGORY_DEFAULT_MAP: Record<string, string> = {
  area: 'area-default',
  bar: 'bar-default',
  line: 'line-default',
  pie: 'pie-default',
  radar: 'radar-default',
  radial: 'radial-default',
  tooltip: 'tooltip-default',
};

const CHART_ALIASES: Record<string, string> = {
  'radial-gauge': 'radial-half',
  gauge: 'radial-half',
  'radial-semi': 'radial-half',
  'bar-comparison': 'bar-multiple',
  donut: 'pie-donut',
  sparkline: 'area-linear',
  gradient: 'area-gradient',
  stacked: 'area-stacked',
};

export function runGetChartBlueprint(input: GetChartBlueprintInput): GetChartBlueprintOutput {
  const rawId = input.id.trim();
  const lowerId = rawId.toLowerCase();

  // Check category default mapping or smart aliases
  const targetId =
    CATEGORY_DEFAULT_MAP[lowerId] ??
    CHART_ALIASES[lowerId] ??
    rawId;

  let chart = chartsCatalog.charts.find(c => c.id === targetId || c.id.toLowerCase() === targetId.toLowerCase());

  if (!chart) {
    // Attempt tag or substring search
    chart = chartsCatalog.charts.find(
      c => c.tags.includes(lowerId) || c.id.toLowerCase().includes(lowerId),
    );
  }

  if (!chart) {
    const validIds = chartsCatalog.charts.map(c => c.id);
    throw new Error(
      `Unknown chart ID: "${input.id}". Available categories: ${chartsCatalog.categories.join(', ')}. Popular chart IDs: ${validIds.slice(0, 10).join(', ')}... (run 'basecoat_list_charts' to discover all ${chartsCatalog.totalCharts} charts).`,
    );
  }

  const framework: ChartFramework = input.framework ?? 'vanilla';
  const mountCode = chart.frameworks[framework] ?? chart.frameworks.vanilla ?? '';

  return {
    id: chart.id,
    category: chart.category,
    name: chart.name,
    description: chart.description,
    framework,
    cssTokens: chart.cssTokens,
    html: chart.html,
    mountCode,
    allFrameworksAvailable: ['vanilla', 'astro', 'react', 'vue', 'svelte'],
  };
}
