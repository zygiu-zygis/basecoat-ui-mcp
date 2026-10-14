---
name: block-patterns/metrics
description: Strict rules for Basecoat KPI metric cards, stats summaries, trend badges, and micro-charts.
---

# Metric Cards & KPIs

## Guardrails

* **Card Elevation & Spacing**:
  * The Basecoat `.card` component includes its own subtle 1px ring shadow (`shadow-sm ring-1 ring-foreground/10` or style-pack equivalent). Adding `border` or `border-border` to `.card` is strictly **FORBIDDEN**.
  * Use deliberate, optical spacing (`gap-2`, `gap-4`, `p-6`) between card headers, values, and contextual metadata.
  * Structure cards using semantic `<article class="card flex flex-col justify-between p-6 bg-card text-card-foreground">`.
* **Universal Paragraph Tags (`<p>`)**:
  * Using `<span>` tags for text content within metric cards is **FORBIDDEN**. You MUST universally use `<p>` tags for labels, values, deltas, and helper context.
* **Strict Typography Hierarchy**:
  * **Title / Category Label**: `<p class="text-sm font-medium text-muted-foreground">`
  * **Core Value**: The visually dominant element, strictly utilizing `<p class="text-3xl font-semibold tabular-nums tracking-tight">` (or `text-4xl` for hero stats). Format large numbers cleanly (e.g., `\$1.42M`, `45.8K`).
  * **Secondary Context**: `<p class="text-xs text-muted-foreground">` (e.g., "vs. previous 30 days").
* **Trend & Delta Indicators**:
  * Using mathematical symbols (`+` or `-`) alone is **FORBIDDEN**.
  * You MUST use explicit directional inline SVG icons (up/down arrow) paired with semantic color utilities:
    * Positive: `<span class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">`
    * Negative: `<span class="inline-flex items-center gap-1 text-xs font-medium text-rose-600 dark:text-rose-400">`
    * Neutral: `<span class="inline-flex items-center gap-1 text-xs font-medium text-amber-600 dark:text-amber-400">`
  * Include screen-reader accessibility using a paragraph tag: `<p class="sr-only">Increased by 12% compared to last period</p>`.
* **Neutral Icon Wrappers**:
  * Center icons inside a muted, neutral wrapper (`size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground`) to maintain an uncluttered aesthetic. Forbid overly saturated icon background chips.
* **Micro-Chart / Sparkline Slot**:
  * When rendering sparklines or micro-charts, strictly constrain their height (e.g., `h-8` or `h-10`) and position them at the bottom of the card or as an integrated slot below the core metric.

## Reference Basecoat KPI Card Pattern

```html
<article class="card flex flex-col justify-between gap-4 p-6 bg-card text-card-foreground">
  <header class="flex items-center justify-between">
    <p class="text-sm font-medium text-muted-foreground">Total Revenue</p>
    <div class="size-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground">
      <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    </div>
  </header>

  <div class="flex flex-col gap-1">
    <p class="text-3xl font-semibold tabular-nums tracking-tight">$45,231.89</p>
    <div class="flex items-center gap-2">
      <div class="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        <svg class="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <polyline points="18 15 12 9 6 15" />
        </svg>
        <span>+20.1%</span>
        <p class="sr-only">Increased by 20.1% compared to last month</p>
      </div>
      <p class="text-xs text-muted-foreground">vs last month</p>
    </div>
  </div>

  <!-- Optional Micro-Chart / Sparkline Slot -->
  <div class="h-8 w-full pt-1" aria-hidden="true">
    <svg class="h-full w-full overflow-visible text-primary" viewBox="0 0 100 24" preserveAspectRatio="none">
      <path d="M0 20 Q 25 12, 50 16 T 100 4" fill="none" stroke="currentColor" stroke-width="2" />
    </svg>
  </div>
</article>
```
