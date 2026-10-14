---
name: basecoat-charts
description: Basecoat Charts skill for ApexCharts and SVG data visualization. Maps colors to CSS tokens (--chart-1..5) with zero React dependencies and 5-framework mounts.
---

# Basecoat Charts: Master Visualization Protocol

Basecoat Charts provides robust, theme-aware chart blueprints designed to integrate seamlessly with Basecoat CSS and Tailwind CSS v4.

## Core Directives

1. **Theme-Token Color Mapping**: All series colors must bind directly to CSS variables (`var(--chart-1)` through `var(--chart-5)`) or surface tokens (`var(--foreground)`, `var(--muted-foreground)`, `var(--border)`).
2. **Container Sizing & Responsive Footprint**: Chart viewport wrappers must specify the standard responsive layout footprint: `w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]`. Outer containers specify `chart-container card p-6 flex flex-col gap-4 w-full` with `role="img"` and descriptive `aria-label`.
3. **Glassmorphic Tooltip Markup**: Interactive chart tooltips must feature Basecoat glassmorphic styling: `<div class="rounded-lg border border-border bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-sm" data-chart-tooltip>...</div>` with indicator dot/line/dashed/badge and numeric value formatting with `tabular-nums`.
4. **Screen-Reader Data Fallback**: Every chart blueprint embeds an accessible table fallback for assistive technology: `<table class="sr-only"><caption>${title}</caption><thead>...</thead><tbody>...</tbody></table>`.
5. **Zero Framework Wrappers**: Do not require heavy framework wrappers like `react-apexcharts`. Initialize charts directly with client-side vanilla ApexCharts mounts across all 5 supported frameworks (`vanilla`, `astro`, `react`, `vue`, `svelte`).
6. **SVG Fallback & Macro Dashboard Binding**: For offline dashboards without third-party dependencies, declarative Basecoat SVG area charts (`svg-area-chart`) and layout blocks like `dashboard-01` bind directly to `data-chart-id="area-interactive"`.

## Chart Categories

| Type | Guide | Best For |
|---|---|---|
| Area | [area.md](./area.md) | Magnitude, cumulative volume, filled trends |
| Bar | [bar.md](./bar.md) | Leaderboards, discrete rank comparison |
| Line | [line.md](./line.md) | Continuous time-series trends |
| Pie / Donut | [pie.md](./pie.md) | Part-to-whole proportions and shares |
| Radar | [radar.md](./radar.md) | Multi-axis assessment and skill matrices |
| Radial | [radial.md](./radial.md) | Progress percentage dials and gauges |
| Tooltip | [tooltip.md](./tooltip.md) | Custom Basecoat popover tooltip styling |
| Audit | [audit/checklist.md](./audit/checklist.md) | Quality inspection and validation gate |
