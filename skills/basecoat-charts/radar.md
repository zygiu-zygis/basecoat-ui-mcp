---
name: radar
description: Render multi-axis spider charts for multi-dimensional performance assessment.
---

# Radar Charts

## Overview & Guardrails
- **Appearance**: Theme-aware radar visualization bound to Basecoat OKLCH CSS tokens.
- **Tokens**: Uses `var(--chart-1)` through `var(--chart-5)`.
- **Container**: Parent element must be `w-full h-80` or explicit responsive height.

## Canonical ApexCharts Configuration

```javascript
const options = {
  chart: {
    type: "radar",
    height: "100%",
    fontFamily: "inherit",
    toolbar: { show: false },
    zoom: { enabled: false }
  },
  colors: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"],
  series: [
    { name: "Metric A", data: [30, 40, 35, 50, 49, 60] },
    { name: "Metric B", data: [20, 32, 28, 42, 38, 52] }
  ],
  grid: {
    borderColor: "var(--border)",
    strokeDashArray: 4
  },
  dataLabels: { enabled: false }
};
```

## 5-Framework Mount Snippets

### 1. Vanilla HTML / JS
```html
<div class="card p-6">
  <div id="chart" class="w-full h-80"></div>
</div>
<script type="module">
  import ApexCharts from 'apexcharts';
  const chart = new ApexCharts(document.getElementById('chart'), options);
  chart.render();
</script>
```

### 2. Astro
```astro
<div class="card p-6">
  <div id="astro-chart" class="w-full h-80"></div>
</div>
<script>
  import ApexCharts from 'apexcharts';
  const el = document.getElementById('astro-chart');
  if (el) {
    const chart = new ApexCharts(el, options);
    chart.render();
  }
</script>
```

### 3. Next.js Client Component
```tsx
'use client';
import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

export function ChartWidget() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = new ApexCharts(ref.current, options);
    chart.render();
    return () => chart.destroy();
  }, []);
  return <div ref={ref} className="w-full h-80" />;
}
```

### 4. Svelte
```svelte
<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';
  let chartEl;
  onMount(() => {
    const chart = new ApexCharts(chartEl, options);
    chart.render();
    return () => chart.destroy();
  });
</script>
<div bind:this={chartEl} class="w-full h-80"></div>
```

### 5. Vue
```vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import ApexCharts from 'apexcharts';
const chartRef = ref(null);
let chartInstance = null;
onMounted(() => {
  chartInstance = new ApexCharts(chartRef.value, options);
  chartInstance.render();
});
onUnmounted(() => chartInstance?.destroy());
</script>
<template>
  <div ref="chartRef" class="w-full h-80"></div>
</template>
```
