#!/usr/bin/env node

/**
 * ingest-shadcn-charts.mjs
 *
 * Standalone offline chart engine generator for Basecoat UI MCP.
 * Deterministically generates src/data/catalog/charts-catalog.json:
 * - 56 chart blueprints across 7 categories (area, bar, line, pie, radar, radial, tooltip)
 * - Strict Basecoat OKLCH CSS tokens (var(--chart-1)..var(--chart-5), var(--color-border), var(--color-muted-foreground))
 * - Standard layout footprint: w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]
 * - Glassmorphic tooltip markup with data-chart-tooltip, bg-background/95, backdrop-blur-sm, border-border
 * - Screen-reader accessible data table fallback (<table class="sr-only">)
 * - Full client-side ApexCharts options bound to CSS variables
 * - Complete mount lifecycle code across 5 frameworks (vanilla, astro, react, vue, svelte)
 *
 * Usage: node scripts/ingest-shadcn-charts.mjs
 */

import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');
const CATALOG_DIR = join(ROOT, 'src', 'data', 'catalog');
const DIST_CATALOG_DIR = join(ROOT, 'dist', 'data', 'catalog');

export const CSS_TOKENS = [
  'var(--chart-1)',
  'var(--chart-2)',
  'var(--chart-3)',
  'var(--chart-4)',
  'var(--chart-5)',
  'var(--color-border)',
  'var(--color-muted-foreground)'
];

export const LAYOUT_FOOTPRINT = 'w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]';

export function generateChartSvg(category, variantId) {
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
      </div>`;

    default:
      return `<svg class="h-48 w-full" viewBox="0 0 400 160"><rect width="400" height="160" fill="var(--chart-1)" fill-opacity="0.1"/></svg>`;
  }
}

export function generateChartTooltipHtml(variantId, category) {
  if (variantId === 'tooltip-indicator-line') {
    return `<div class="rounded-lg border border-border bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-sm flex flex-col gap-1 z-10" data-chart-tooltip>
      <span class="font-semibold text-muted-foreground">Wednesday, Oct 14</span>
      <div class="flex items-center gap-2">
        <span class="w-0.5 h-3 bg-[var(--chart-1)] rounded"></span>
        <span class="font-medium">Visitors: <strong class="tabular-nums font-semibold">14,250</strong></span>
      </div>
    </div>`;
  }
  if (variantId === 'tooltip-indicator-none') {
    return `<div class="rounded-lg border border-border bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-sm flex flex-col gap-1 z-10" data-chart-tooltip>
      <span class="font-semibold text-muted-foreground">Wednesday, Oct 14</span>
      <div class="flex items-center gap-2">
        <span class="font-medium">Visitors: <strong class="tabular-nums font-semibold">14,250</strong></span>
      </div>
    </div>`;
  }
  if (variantId === 'tooltip-no-label') {
    return `<div class="rounded-lg border border-border bg-background/95 p-2 text-xs shadow-xl backdrop-blur-sm flex items-center gap-1.5 z-10" data-chart-tooltip>
      <span class="size-2 rounded-full" style="background-color: var(--chart-1)"></span>
      <strong class="tabular-nums font-semibold">14,250</strong>
    </div>`;
  }
  if (variantId === 'tooltip-formatter' || variantId === 'tooltip-label-formatter') {
    return `<div class="rounded-lg border border-border bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-sm flex flex-col gap-1 z-10" data-chart-tooltip>
      <span class="font-semibold text-muted-foreground">Oct 2026 (Q4)</span>
      <div class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-full" style="background-color: var(--chart-1)"></span>Revenue</span>
        <strong class="tabular-nums font-semibold">$14,250.00</strong>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span class="flex items-center gap-1.5"><span class="size-2 rounded-full" style="background-color: var(--chart-2)"></span>Target</span>
        <strong class="tabular-nums font-semibold">$12,000.00</strong>
      </div>
    </div>`;
  }
  if (variantId === 'tooltip-icons') {
    return `<div class="rounded-lg border border-border bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-sm flex flex-col gap-1 z-10" data-chart-tooltip>
      <span class="font-semibold text-muted-foreground">Daily Active Users</span>
      <div class="flex items-center gap-2">
        <span class="size-2 rounded-full" style="background-color: var(--chart-1)"></span>
        <span class="font-medium">Active: <strong class="tabular-nums font-semibold">14,250</strong></span>
      </div>
    </div>`;
  }

  return `<div class="rounded-lg border border-border bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-sm flex flex-col gap-1 z-10" data-chart-tooltip>
    <span class="font-semibold text-muted-foreground">Series Overview</span>
    <div class="flex items-center gap-2">
      <span class="size-2 rounded-full" style="background-color: var(--chart-1)"></span>
      <span class="font-medium">Total: <strong class="tabular-nums font-semibold">$14,250.00</strong></span>
    </div>
  </div>`;
}

export function generateChartOptions(category, variantId) {
  const baseTokens = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)', 'var(--chart-5)'];

  switch (category) {
    case 'area':
      return {
        chart: {
          type: 'area',
          height: '100%',
          toolbar: { show: false },
          fontFamily: 'inherit',
          stacked: variantId.includes('stacked')
        },
        colors: baseTokens.slice(0, 3),
        stroke: {
          curve: variantId.includes('step') ? 'stepline' : variantId.includes('linear') ? 'straight' : 'smooth',
          width: 2
        },
        fill: {
          type: 'gradient',
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.45,
            opacityTo: 0.05,
            stops: [0, 100]
          }
        },
        grid: {
          borderColor: 'var(--color-border)',
          strokeDashArray: 4
        },
        xaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } },
          axisBorder: { color: 'var(--color-border)' },
          axisTicks: { color: 'var(--color-border)' }
        },
        yaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } }
        },
        tooltip: { theme: 'dark' }
      };

    case 'bar':
      return {
        chart: {
          type: 'bar',
          height: '100%',
          toolbar: { show: false },
          fontFamily: 'inherit',
          stacked: variantId.includes('stacked')
        },
        plotOptions: {
          bar: {
            horizontal: variantId.includes('horizontal'),
            borderRadius: 4,
            columnWidth: '55%'
          }
        },
        colors: baseTokens,
        grid: {
          borderColor: 'var(--color-border)',
          strokeDashArray: 4
        },
        xaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } },
          axisBorder: { color: 'var(--color-border)' },
          axisTicks: { color: 'var(--color-border)' }
        },
        yaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } }
        },
        tooltip: { theme: 'dark' }
      };

    case 'line':
      return {
        chart: {
          type: 'line',
          height: '100%',
          toolbar: { show: false },
          fontFamily: 'inherit'
        },
        colors: baseTokens.slice(0, 3),
        stroke: {
          curve: variantId.includes('step') ? 'stepline' : variantId.includes('linear') ? 'straight' : 'smooth',
          width: 2.5
        },
        markers: {
          size: variantId.includes('dots') ? 5 : 0,
          strokeColors: 'var(--color-border)'
        },
        grid: {
          borderColor: 'var(--color-border)',
          strokeDashArray: 4
        },
        xaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } },
          axisBorder: { color: 'var(--color-border)' },
          axisTicks: { color: 'var(--color-border)' }
        },
        yaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } }
        },
        tooltip: { theme: 'dark' }
      };

    case 'pie':
      return {
        chart: {
          type: variantId.includes('donut') ? 'donut' : 'pie',
          height: '100%',
          toolbar: { show: false },
          fontFamily: 'inherit'
        },
        colors: baseTokens,
        stroke: {
          colors: ['var(--color-border)'],
          width: 1
        },
        legend: {
          labels: { colors: 'var(--color-muted-foreground)' }
        },
        tooltip: { theme: 'dark' }
      };

    case 'radar':
      return {
        chart: {
          type: 'radar',
          height: '100%',
          toolbar: { show: false },
          fontFamily: 'inherit'
        },
        colors: baseTokens.slice(0, 2),
        stroke: { width: 2 },
        fill: { opacity: 0.2 },
        markers: {
          size: variantId.includes('dots') ? 4 : 0
        },
        yaxis: { show: false },
        xaxis: {
          labels: { style: { colors: ['var(--color-muted-foreground)'] } }
        },
        tooltip: { theme: 'dark' }
      };

    case 'radial':
      return {
        chart: {
          type: 'radialBar',
          height: '100%',
          toolbar: { show: false },
          fontFamily: 'inherit'
        },
        plotOptions: {
          radialBar: {
            startAngle: variantId.includes('half') ? -90 : variantId.includes('angle') ? -135 : 0,
            endAngle: variantId.includes('half') ? 90 : variantId.includes('angle') ? 135 : 360,
            track: {
              background: 'var(--color-border)',
              strokeWidth: '100%'
            },
            dataLabels: {
              value: {
                color: 'var(--color-muted-foreground)',
                fontSize: '20px',
                show: true
              }
            }
          }
        },
        colors: baseTokens.slice(0, 3),
        tooltip: { theme: 'dark' }
      };

    case 'tooltip':
      return {
        chart: {
          type: 'area',
          height: '100%',
          toolbar: { show: false },
          fontFamily: 'inherit'
        },
        colors: baseTokens.slice(0, 2),
        stroke: { curve: 'smooth', width: 2 },
        grid: {
          borderColor: 'var(--color-border)',
          strokeDashArray: 4
        },
        xaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } },
          axisBorder: { color: 'var(--color-border)' }
        },
        yaxis: {
          labels: { style: { colors: 'var(--color-muted-foreground)' } }
        },
        tooltip: {
          theme: 'dark'
        }
      };

    default:
      return {
        chart: { type: 'area', height: '100%', fontFamily: 'inherit' },
        colors: baseTokens,
        tooltip: { theme: 'dark' }
      };
  }
}

export function generateFrameworkMounts(id, name, description, chartHtml, options) {
  const componentName = id.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('') + 'Chart';
  const optionsJson = JSON.stringify(options, null, 2);

  // Vanilla
  const vanilla = `// Mount and bind ${name}
import ApexCharts from 'apexcharts';

const chartOptions = ${optionsJson};
const container = document.getElementById("${id}");
if (container) {
  const chartEl = container.querySelector("[data-chart-viewport]") || container;
  const chart = new ApexCharts(chartEl, chartOptions);
  chart.render();
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
  import ApexCharts from 'apexcharts';
  const chartOptions = ${optionsJson};
  const root = document.getElementById("${id}");
  if (root) {
    const chartEl = root.querySelector("[data-chart-viewport]") || root;
    const chart = new ApexCharts(chartEl, chartOptions);
    chart.render();
  }
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
    .replace(/aria-label=/g, 'aria-label=')
    .replace(/style="background-color: var\(--chart-1\)"/g, 'style={{ backgroundColor: "var(--chart-1)" }}')
    .replace(/style="background-color: var\(--chart-2\)"/g, 'style={{ backgroundColor: "var(--chart-2)" }}')
    .replace(/style="background-color: var\(--chart-3\)"/g, 'style={{ backgroundColor: "var(--chart-3)" }}')
    .replace(/style="background-color: var\(--chart-4\)"/g, 'style={{ backgroundColor: "var(--chart-4)" }}')
    .replace(/style="background-color: var\(--chart-5\)"/g, 'style={{ backgroundColor: "var(--chart-5)" }}');

  const react = `import React, { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

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
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const chartOptions = ${optionsJson};
    if (chartRef.current) {
      const chartEl = chartRef.current.querySelector('[data-chart-viewport]') || chartRef.current;
      const chart = new ApexCharts(chartEl, chartOptions);
      chart.render();
      return () => {
        chart.destroy();
      };
    }
  }, []);

  return (
    <div id="${id}" ref={chartRef} className={\`w-full \${className}\`}>
      ${reactHtml}
    </div>
  );
}`;

  // Vue
  const vue = `<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import ApexCharts from 'apexcharts';

const props = withDefaults(defineProps<{
  title?: string;
  description?: string;
  class?: string;
}>(), {
  title: "${name}",
  description: "${description}",
  class: ""
});

const chartRoot = ref<HTMLElement | null>(null);
let chart: ApexCharts | null = null;

onMounted(() => {
  const chartOptions = ${optionsJson};
  if (chartRoot.value) {
    const chartEl = chartRoot.value.querySelector('[data-chart-viewport]') || chartRoot.value;
    chart = new ApexCharts(chartEl, chartOptions);
    chart.render();
  }
});

onUnmounted(() => {
  if (chart) {
    chart.destroy();
  }
});
</script>

<template>
  <div :id="'${id}'" ref="chartRoot" :class="['w-full', props.class]">
    ${chartHtml}
  </div>
</template>`;

  // Svelte
  const svelte = `<script lang="ts">
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';

  export let title: string = "${name}";
  export let description: string = "${description}";
  export let className: string = "";

  let chartRoot: HTMLElement;
  let chart: ApexCharts;

  onMount(() => {
    const chartOptions = ${optionsJson};
    if (chartRoot) {
      const chartEl = chartRoot.querySelector('[data-chart-viewport]') || chartRoot;
      chart = new ApexCharts(chartEl, chartOptions);
      chart.render();
    }
    return () => {
      if (chart) chart.destroy();
    };
  });
</script>

<div id="${id}" bind:this={chartRoot} class="w-full {className}">
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
      const tooltipHtml = generateChartTooltipHtml(item.id, cat);
      const options = generateChartOptions(cat, item.id);

      const html = `<div class="chart-container card p-6 flex flex-col gap-4 w-full" role="img" aria-label="${item.name} - ${item.description}">
  <div class="border-b border-border pb-3">
    <h3 class="text-base font-semibold">${item.name}</h3>
    <p class="text-sm text-muted-foreground">${item.description}</p>
  </div>
  <div class="w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px] relative flex items-center justify-center" data-chart-viewport>
    ${svg}
    ${tooltipHtml}
    <table class="sr-only">
      <caption>${item.name}</caption>
      <thead>
        <tr>
          <th scope="col">Series</th>
          <th scope="col">Period</th>
          <th scope="col">Value</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Series 1</td>
          <td>Jan</td>
          <td>14,250</td>
        </tr>
        <tr>
          <td>Series 2</td>
          <td>Jan</td>
          <td>8,420</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
    <span>Series Total</span>
    <strong class="tabular-nums font-semibold text-foreground">$14,250.00</strong>
  </div>
</div>`;

      const frameworks = generateFrameworkMounts(item.id, item.name, item.description, html, options);

      charts.push({
        id: item.id,
        category: cat,
        name: item.name,
        title: item.name,
        description: item.description,
        tags: ['chart', cat, item.id.replace(/-/g, ' ')],
        cssTokens: [...CSS_TOKENS],
        requiredTokens: [...CSS_TOKENS],
        layoutFootprint: LAYOUT_FOOTPRINT,
        options,
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

async function main() {
  console.log('[ingest-shadcn-charts] Generating Basecoat UI charts catalog...');
  await mkdir(CATALOG_DIR, { recursive: true });

  const chartsCatalog = generateChartsCatalog();
  const chartsPath = join(CATALOG_DIR, 'charts-catalog.json');
  await writeFile(chartsPath, JSON.stringify(chartsCatalog, null, 2) + '\n', 'utf8');
  console.log(`[ingest-shadcn-charts] Successfully generated: ${chartsPath} (${chartsCatalog.charts.length} charts across ${chartsCatalog.categories.length} categories)`);

  if (existsSync(DIST_CATALOG_DIR)) {
    const distChartsPath = join(DIST_CATALOG_DIR, 'charts-catalog.json');
    await writeFile(distChartsPath, JSON.stringify(chartsCatalog, null, 2) + '\n', 'utf8');
    console.log(`[ingest-shadcn-charts] Synchronized to dist: ${distChartsPath}`);
  }
}

if (process.argv[1] === __filename) {
  main().catch((err) => {
    console.error('[ingest-shadcn-charts] Error:', err);
    process.exit(1);
  });
}
