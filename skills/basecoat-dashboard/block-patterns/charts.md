---
name: block-patterns/charts
description: Strict rules for Basecoat charts, CSS token mappings, zero-runtime SVG visualizations, and responsive sizing.
---

# Chart Components & Data Visualizations

## Guardrails

* **Zero Hardcoded Colors**: Hardcoding hex codes (`#3b82f6`, `#000000`) or raw RGB values inside chart options or SVG markup is strictly **FORBIDDEN**. You MUST map all visual elements to Basecoat semantic CSS variables:
  * Primary Series: `var(--primary)`
  * Secondary Series: `var(--secondary)` (or `var(--muted-foreground)` / `var(--accent)`)
  * Gridlines & Dividers: `var(--border)`
  * Axis Labels & Legends: `var(--muted-foreground)`
  * Canvas & Popovers: `var(--card)`, `var(--popover)`, `var(--foreground)`
* **Responsive Sizing Constraints**:
  * The parent card container MUST use `w-full h-full`. Do **NOT** apply `overflow-auto` or `overflow-x-scroll` to the parent card wrapper, as this breaks layout calculations.
  * Explicit height MUST be applied to the chart host container (e.g., `h-[240px]`, `h-[300px]`, or `h-[350px]`).
* **Zero-Runtime SVG Area Chart First**:
  * For offline dashboards, fast static rendering, or zero-JS environments, prefer Basecoat's canonical zero-runtime SVG area chart pattern.
  * Use inline `<svg role="img" class="w-full h-full overflow-visible">` with `<title>` and `<desc>` elements for accessibility, responsive `viewBox`, and SVG linear gradients mapped to CSS custom properties.
* **External Chart Library Configuration (ApexCharts)**:
  * When complex interactions (zoom, brush, dynamic series) require ApexCharts:
    * Set chart height explicitly in options (`options.chart.height = 320`).
    * Reference CSS variables as string literals (e.g., `colors: ['var(--primary)', 'var(--secondary)']`).
    * Synchronize the tooltip theme (`theme.mode = 'dark' | 'light'`) by observing the `html.dark` class.

## Pattern A: Zero-Runtime Accessible SVG Area Chart

```html
<article class="card flex flex-col justify-between gap-4 p-6 bg-card text-card-foreground">
  <header class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
    <div>
      <h3 class="text-base font-semibold text-foreground">Traffic & Performance</h3>
      <p class="text-xs text-muted-foreground">Daily visitors over the last 30 days</p>
    </div>
    <!-- Range Toggle -->
    <div class="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs font-medium" role="group" aria-label="Date range selector">
      <button type="button" class="px-2.5 py-1 rounded-md bg-background text-foreground shadow-sm" aria-current="true">30D</button>
      <button type="button" class="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground">90D</button>
      <button type="button" class="px-2.5 py-1 rounded-md text-muted-foreground hover:text-foreground">1Y</button>
    </div>
  </header>

  <!-- SVG Chart Host Container -->
  <div class="relative w-full h-[240px] pt-4" data-component="svg-area-chart">
    <svg class="w-full h-full text-foreground" viewBox="0 0 500 180" preserveAspectRatio="none" role="img" aria-labelledby="chart-title chart-desc">
      <title id="chart-title">Visitor Analytics Chart</title>
      <desc id="chart-desc">Area graph showing total desktop and mobile sessions over 30 days.</desc>
      <defs>
        <linearGradient id="primary-gradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--primary)" stop-opacity="0.3" />
          <stop offset="100%" stop-color="var(--primary)" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <!-- Horizontal Guide Lines -->
      <line x1="0" y1="40" x2="500" y2="40" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="0" y1="90" x2="500" y2="90" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" />
      <line x1="0" y1="140" x2="500" y2="140" stroke="var(--border)" stroke-width="1" stroke-dasharray="4 4" />

      <!-- Area Path -->
      <path d="M 0 140 Q 120 70 250 100 T 500 30 L 500 180 L 0 180 Z" fill="url(#primary-gradient)" />
      <!-- Stroke Path -->
      <path d="M 0 140 Q 120 70 250 100 T 500 30" fill="none" stroke="var(--primary)" stroke-width="2" />
    </svg>
  </div>

  <!-- Chart Legend -->
  <footer class="flex items-center justify-center gap-6 pt-2 text-xs text-muted-foreground">
    <div class="flex items-center gap-2">
      <span class="size-2.5 rounded-full bg-primary" aria-hidden="true"></span>
      <span>Desktop Visitors (68%)</span>
    </div>
    <div class="flex items-center gap-2">
      <span class="size-2.5 rounded-full bg-border" aria-hidden="true"></span>
      <span>Mobile Visitors (32%)</span>
    </div>
  </footer>
</article>
```

## Pattern B: ApexCharts Options with Semantic Variable Mapping

```javascript
const chartOptions = {
  chart: {
    type: 'area',
    height: 320,
    fontFamily: 'inherit',
    toolbar: { show: false },
    animations: { enabled: true }
  },
  // Strictly map to CSS custom properties
  colors: ['var(--primary)', 'var(--secondary)'],
  stroke: { curve: 'smooth', width: 2 },
  grid: {
    borderColor: 'var(--border)',
    strokeDashArray: 4
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    labels: {
      style: { colors: 'var(--muted-foreground)', fontSize: '12px' }
    },
    axisBorder: { color: 'var(--border)' },
    axisTicks: { color: 'var(--border)' }
  },
  yaxis: {
    labels: {
      style: { colors: 'var(--muted-foreground)', fontSize: '12px' }
    }
  },
  tooltip: {
    // Synchronize theme with html.dark class
    theme: document.documentElement.classList.contains('dark') ? 'dark' : 'light'
  }
};
```
