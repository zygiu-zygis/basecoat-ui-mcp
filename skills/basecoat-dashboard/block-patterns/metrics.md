# KPI Metric Cards & Stat Grids

## Anatomy of a High-Impact KPI Card

```html
<article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
  <header class="flex items-center justify-between">
    <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>
    <span class="badge" data-variant="outline">+12.5%</span>
  </header>
  <div class="flex flex-col gap-1">
    <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>
    <p class="text-xs text-muted-foreground">+20.1% from last month</p>
  </div>
</article>
```

## 4-Card Responsive Metric Grid
```html
<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Performance Metrics">
  <!-- 4 KPI Cards -->
</section>
```
