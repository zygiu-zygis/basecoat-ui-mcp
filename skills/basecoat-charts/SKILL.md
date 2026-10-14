---
name: basecoat-charts
description: Basecoat Charts skill for ApexCharts and SVG data visualization. Maps colors to CSS tokens (--chart-1..5) with zero React dependencies and 5-framework mounts.
---

# Basecoat Charts: Master Visualization Protocol

Basecoat Charts provides robust, theme-aware chart blueprints designed to integrate seamlessly with Basecoat CSS and Tailwind CSS v4.

## Core Directives

1. **Theme-Token Color Mapping**: All series colors must bind directly to CSS variables (`var(--chart-1)` through `var(--chart-5)`) or surface tokens (`var(--foreground)`, `var(--muted-foreground)`, `var(--border)`).
2. **Container Sizing**: Chart parent containers must specify explicit dimensions (e.g. `h-80 w-full`). Set height in ApexCharts options: `options.chart.height = "100%"`.
3. **Zero Framework Wrappers**: Do not require heavy framework wrappers like `react-apexcharts`. Initialize charts directly with vanilla ApexCharts in the client.
4. **SVG Fallback Option**: For offline dashboards without third-party libraries, prefer declarative Basecoat SVG area charts (`svg-area-chart`).

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
