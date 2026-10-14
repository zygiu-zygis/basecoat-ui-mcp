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
  title?: string;
  description: string;
  tags: string[];
  cssTokens: string[];
  requiredTokens?: string[];
  layoutFootprint?: string;
  options?: Record<string, unknown>;
  html: string;
  frameworks: Record<ChartFramework, string>;
}

export interface ChartsCatalog {
  schemaVersion: number;
  totalCharts: number;
  categories: ChartCategory[];
  charts: ChartCatalogItem[];
}

export function loadChartsCatalog(): ChartsCatalog {
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

export const chartsCatalog: ChartsCatalog = loadChartsCatalog();

export const listChartsInputShape = {
  category: z
    .enum(['area', 'bar', 'line', 'pie', 'radar', 'radial', 'tooltip'])
    .optional()
    .describe('Filter charts by category (area, bar, line, pie, radar, radial, tooltip).'),
  search: z
    .string()
    .max(120)
    .optional()
    .describe('Search keyword for chart variant (e.g., stacked, gradient, sparkline, donut, gauge).'),
  query: z
    .string()
    .max(120)
    .optional()
    .describe('Search keyword alias for search.'),
};

export type ListChartsInput = z.infer<z.ZodObject<typeof listChartsInputShape>>;

export interface ListChartsSummary {
  id: string;
  title: string;
  name: string;
  category: ChartCategory;
  description: string;
  requiredTokens: string[];
  cssTokens: string[];
  layoutFootprint: string;
  tags: string[];
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

  const rawSearch = input.search ?? input.query;
  if (rawSearch && rawSearch.trim().length > 0) {
    const q = rawSearch.trim().toLowerCase();
    filtered = filtered.filter(c => {
      return (
        c.id.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        (c.title && c.title.toLowerCase().includes(q)) ||
        c.description.toLowerCase().includes(q) ||
        c.tags.some(t => t.toLowerCase().includes(q))
      );
    });
  }

  const charts: ListChartsSummary[] = filtered.map(c => ({
    id: c.id,
    title: c.title ?? c.name,
    name: c.name,
    category: c.category,
    description: c.description,
    requiredTokens: c.requiredTokens ?? c.cssTokens,
    cssTokens: c.cssTokens,
    layoutFootprint: c.layoutFootprint ?? 'w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]',
    tags: c.tags,
  }));

  return {
    total: charts.length,
    categories: chartsCatalog.categories,
    charts,
  };
}
