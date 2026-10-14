// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';
import {
  type ChartAccessibilitySpec,
  type ChartCategory,
  type ChartFramework,
  chartsCatalog,
} from './list-charts.js';

export const getChartBlueprintInputShape = {
  chartId: z
    .string()
    .max(80)
    .optional()
    .describe(
      'Chart blueprint ID from basecoat_list_charts (e.g., area-default, area-stacked, bar-multiple, pie-donut, radar-default, radial-half, tooltip-default). Also accepts category name or keyword alias.',
    ),
  id: z
    .string()
    .max(80)
    .optional()
    .describe('Alias for chartId. Defaults to "area-default" if neither chartId nor id is provided.'),
  componentId: z
    .string()
    .max(80)
    .optional()
    .describe('Alias for chartId/id.'),
  name: z
    .string()
    .max(80)
    .optional()
    .describe('Alias for chartId/name.'),
  environment: z
    .enum(['html', 'astro', 'react', 'vue', 'svelte'])
    .optional()
    .default('html')
    .describe('Target environment (html, astro, react, vue, svelte). Defaults to html.'),
  framework: z
    .enum(['vanilla', 'astro', 'react', 'vue', 'svelte', 'html'])
    .optional()
    .describe('Target framework mount generator (vanilla, astro, react, vue, svelte, html). When html or omitted, resolves to vanilla.'),
  engine: z
    .enum(['svg', 'apexcharts'])
    .optional()
    .default('svg')
    .describe('Chart rendering engine (svg or apexcharts). Defaults to svg.'),
  themeTokens: z
    .record(z.string(), z.string())
    .optional()
    .describe('Optional CSS theme token overrides (e.g. { "var(--chart-1)": "var(--color-primary)" }).'),
};

export type GetChartBlueprintInput = z.input<z.ZodObject<typeof getChartBlueprintInputShape>>;

export interface GetChartBlueprintOutput {
  id: string;
  chartId: string;
  title: string;
  name: string;
  category: ChartCategory;
  description: string;
  tags: string[];
  engine: 'svg' | 'apexcharts';
  environment: 'html' | 'astro' | 'react' | 'vue' | 'svelte';
  framework: ChartFramework;
  layoutFootprint: string;
  requiredTokens: string[];
  cssTokens: string[];
  accessibilitySpec?: ChartAccessibilitySpec;
  options: Record<string, unknown>;
  html: string;
  code: string;
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

function applyThemeTokens(text: string, themeTokens?: Record<string, string>): string {
  if (!themeTokens || Object.keys(themeTokens).length === 0) return text;
  let result = text;
  for (const [key, val] of Object.entries(themeTokens)) {
    const varPattern = key.startsWith('var(') ? key : `var(${key})`;
    const rawPattern = key.startsWith('var(') ? key.slice(4, -1) : key;
    result = result.replaceAll(varPattern, val);
    result = result.replaceAll(`var(${rawPattern})`, val);
  }
  return result;
}

function applyThemeTokensToOptions(
  options: Record<string, unknown>,
  themeTokens?: Record<string, string>,
): Record<string, unknown> {
  if (!themeTokens || Object.keys(themeTokens).length === 0) return options;
  const serialized = JSON.stringify(options);
  const replaced = applyThemeTokens(serialized, themeTokens);
  try {
    return JSON.parse(replaced);
  } catch {
    return options;
  }
}

export function runGetChartBlueprint(input: GetChartBlueprintInput = {}): GetChartBlueprintOutput {
  const rawId = (input.chartId ?? input.id ?? input.componentId ?? input.name ?? 'area-default').trim();
  const lowerId = rawId.toLowerCase();

  const targetId =
    CATEGORY_DEFAULT_MAP[lowerId] ??
    CHART_ALIASES[lowerId] ??
    rawId;

  let chart = chartsCatalog.charts.find(
    c => c.id === targetId || c.id.toLowerCase() === targetId.toLowerCase() || c.name.toLowerCase() === targetId.toLowerCase(),
  );

  if (!chart) {
    chart = chartsCatalog.charts.find(
      c => c.tags.includes(lowerId) || c.id.toLowerCase().includes(lowerId) || c.name.toLowerCase().includes(lowerId),
    );
  }

  if (!chart) {
    const validIds = chartsCatalog.charts.map(c => c.id);
    throw new Error(
      `Unknown chart ID: "${rawId}". Available categories: ${chartsCatalog.categories.join(', ')}. Popular chart IDs: ${validIds.slice(0, 10).join(', ')}... (run 'basecoat_list_charts' to discover all ${chartsCatalog.totalCharts} charts).`,
    );
  }

  // Resolve environment and framework
  let environment: 'html' | 'astro' | 'react' | 'vue' | 'svelte';
  let framework: ChartFramework;

  if (input.framework && input.framework !== 'html') {
    framework = input.framework as ChartFramework;
    environment = input.framework === 'vanilla' ? 'html' : (input.framework as 'astro' | 'react' | 'vue' | 'svelte');
  } else if (input.environment && input.environment !== 'html') {
    environment = input.environment;
    framework = input.environment as ChartFramework;
  } else {
    // Both omitted or 'html'
    environment = 'html';
    framework = 'vanilla';
  }

  const engine: 'svg' | 'apexcharts' = input.engine ?? 'svg';

  const frameworkMap = engine === 'apexcharts'
    ? (chart.apexFrameworks ?? chart.frameworks)
    : (chart.svgFrameworks ?? chart.frameworks);

  const rawMountCode = frameworkMap[framework] ?? frameworkMap.vanilla ?? '';
  const rawHtml = (engine === 'apexcharts' && chart.apexHtml) ? chart.apexHtml : chart.html;

  const html = applyThemeTokens(rawHtml, input.themeTokens);
  const code = applyThemeTokens(rawMountCode, input.themeTokens);
  const mountCode = code;
  const options = applyThemeTokensToOptions(chart.options ?? {}, input.themeTokens);

  const requiredTokens = (chart.requiredTokens ?? chart.cssTokens).map(t => {
    return input.themeTokens?.[t] ?? input.themeTokens?.[t.slice(4, -1)] ?? t;
  });
  const cssTokens = chart.cssTokens.map(t => {
    return input.themeTokens?.[t] ?? input.themeTokens?.[t.slice(4, -1)] ?? t;
  });

  return {
    id: chart.id,
    chartId: chart.id,
    title: chart.title ?? chart.name,
    name: chart.name,
    category: chart.category,
    description: chart.description,
    tags: chart.tags,
    engine,
    environment,
    framework,
    layoutFootprint: chart.layoutFootprint ?? 'w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]',
    requiredTokens,
    cssTokens,
    accessibilitySpec: chart.accessibilitySpec,
    options,
    html,
    code,
    mountCode,
    allFrameworksAvailable: ['vanilla', 'astro', 'react', 'vue', 'svelte'],
  };
}
