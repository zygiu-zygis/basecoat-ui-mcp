---
name: chart
description: Basecoat UI Chart component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Chart (`chart`)

## Overview & Intent
Responsive container for ApexCharts or Basecoat SVG area charts bound to --chart-1..5 tokens.

## Anatomy & DOM Structure
```html
<div class="card p-6">
  <header class="flex items-center justify-between pb-4">
    <h3 class="text-base font-semibold">Revenue Trend</h3>
  </header>
  <div id="chart" class="w-full h-80"></div>
</div>
```

## Variants & Modifiers
Area, bar, line, pie, radial, radar.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| rendered | SVG chart element in DOM | Client initialization |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="card flex flex-col gap-4 rounded-xl bg-card p-6 shadow-sm">
  <h3 class="text-base font-semibold">Overview</h3>
  <div id="revenue-chart" class="w-full h-80"></div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Hardcoded hex colors in chart options bypassing --chart-1..5 -->
<div class="w-[500px] h-[300px] bg-white">
  <canvas id="myChart"></canvas>
</div>
```
