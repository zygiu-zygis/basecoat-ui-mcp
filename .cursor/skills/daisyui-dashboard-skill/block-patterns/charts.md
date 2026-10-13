---
name: block-patterns/charts
description: STRICT RULES for installing and rendering data visualizations. Deviation from these structural, setup, and UX constraints is forbidden.
---

# Chart Component

## GUARDRAILS
* **Exclusive Library & Interactivity:** You MUST use ApexCharts exclusively for complex data visualization; drawing direct `<svg>` charts is FORBIDDEN. Additionally, if the chart's card includes control UI (e.g., time duration buttons, filters, toggles), the chart **MUST be dynamic** and reactively update its data or configuration based on those user interactions.
* **Responsive Sizing:** Do NOT apply `overflow-auto` or `overflow-x-scroll` to the parent wrapper. The parent card MUST use `w-full h-full` so the chart resizes natively to fit. Furthermore, do NOT set the chart height via HTML wrapper CSS; you MUST set the height explicitly inside the chart configuration object (e.g., `options.chart.height`).
* **Native Theme Synchronization:** Hardcoding hex or RGB colors (e.g., `#FF0000`) inside the chart configuration is strictly FORBIDDEN. You MUST map all chart entities directly to DaisyUI CSS variables as raw strings:
  * **Series:** `var(--color-primary)`, `var(--color-secondary)`.
  * **Typography:** `var(--color-base-content)` for X/Y-axis labels and legends.
  * **Structure:** Low-contrast variables for grids, borders, and tick marks.
* **Strict Tooltip Sync:** You MUST dynamically toggle the chart's tooltip theme ('light' or 'dark') to match the application's global theme. Use appropriate framework logic or state management to trigger this update. Hardcoding a static tooltip theme is FORBIDDEN. This synchronization applies EXCLUSIVELY to the tooltip; do not sync other chart options this way.

## External Resources
- [ApexCharts Reference Library](https://github.com/apexcharts/apexcharts-skill/tree/main/references): You MUST refer to this for advanced specs, API configuration, and rendering logic.

## 1. INSTALLATION & SETUP
You MUST ensure ApexCharts (and its corresponding framework wrapper, if applicable) is installed before attempting to render charts:
```bash
npm install apexcharts
```

```javascript
const options = {
  chart: {
    type: 'area',
    height: 350,
    toolbar: { show: false },
    sparkline: { enabled: false }
  },
  // STRICT THEME INJECTION
  colors: ['var(--color-primary)', 'var(--color-secondary)'],
  stroke: { curve: 'smooth', width: 2 },
  grid: {
    borderColor: 'rgba(var(--color-base-content), 0.1)',
  },
  xaxis: {
    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    labels: {
      style: { colors: 'var(--color-base-content)' }
    }
  },
  yaxis: {
    labels: {
      style: { colors: 'var(--color-base-content)' }
    }
  }
};
```
