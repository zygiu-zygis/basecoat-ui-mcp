---
name: page-types/dashboard
description: Strict rules for Basecoat dashboard macro-layouts, 12-column responsive grids, spatial constraints, and multi-dashboard variance.
---

# Dashboard Layout Archetype

## Guardrails

* **Application Shell Architecture**:
  * Root wrapper MUST use `h-screen w-full overflow-hidden flex bg-background text-foreground`.
  * The Sidebar must NEVER scroll with page content; it must remain pinned (`md:sticky md:top-0 md:h-screen`).
  * The Main Application Canvas must scroll independently: `flex-1 flex flex-col min-w-0 overflow-y-auto`.
  * Page-level titles, date filters, and primary CTA buttons belong inside the main canvas header, NEVER in the global top app bar.
  * A minimal footer must be placed at the very bottom of the scrollable canvas (`mt-auto border-t border-border py-4 text-xs text-muted-foreground`).
* **Strict Header Alignment**:
  * The Sidebar brand header and the Top App Bar MUST share identical heights (`h-12` or `h-14`) with their bottom borders (`border-b border-border`) seamlessly aligned.
* **12-Column Responsive Grid & Desktop Sizing**:
  * Structure dashboard content using responsive CSS Grid layouts (`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 md:gap-6`).
  * **Never use full-screen-width single blocks on desktop.** Always place at least two components side-by-side.
  * Use asymmetrical column spans to establish visual hierarchy (e.g., `lg:col-span-8` for primary charts paired with `lg:col-span-4` for recent transactions or quick feeds).
  * Enforce KPI tier layouts: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6`.
* **Content Density & Void Prevention**:
  * When placing cards side-by-side in a row, match their visual weight and height (`h-full flex flex-col justify-between`). Do not leave empty vertical voids; fill them with relevant contextual feeds, breakdowns, or micro-metrics.

## Multi-Dashboard Variance Protocol

In applications containing multiple dashboards, duplicating identical layouts, widget configurations, or chart types is strictly **FORBIDDEN**. Each dashboard must embody its distinct functional domain:

| Dashboard Type | Primary Chart | Asymmetrical Grid Pairing | Key Widgets |
| :--- | :--- | :--- | :--- |
| **Executive** | High-level Trend Area Chart (`lg:col-span-8`) | Revenue Breakdown / Progress Bars (`lg:col-span-4`) | 4 High-level KPI Cards, Target Projections, Executive Summary |
| **Analytics** | Multi-series Timeseries Line Chart (`lg:col-span-7`) | Segment Donut Chart / Conversion Funnel (`lg:col-span-5`) | Session KPIs, Top Acquisition Channels, Geographic Geo-table |
| **Operations** | Real-time Resource Bar Chart (`lg:col-span-8`) | Live Incident / System Health Feed (`lg:col-span-4`) | Uptime KPIs, Service Latency Gauges, Interactive Audit Logs |
| **Financial** | Cash Flow Waterfall / Dual-bar (`lg:col-span-8`) | Accounts Aging List (`lg:col-span-4`) | ARR/MRR KPIs, Recent Invoices Table, Quick Payment Drawer |

## Reference Basecoat Dashboard Macro Layout

```html
<div class="flex h-screen w-full overflow-hidden bg-background text-foreground">
  <!-- Pinned Sidebar -->
  <aside class="sidebar hidden md:flex flex-col w-64 border-e border-border bg-card/50 md:sticky md:top-0 md:h-screen" data-component="sidebar" data-state="expanded">
    <header class="flex items-center h-14 px-4 border-b border-border font-semibold">
      <span>Enterprise Console</span>
    </header>
    <nav class="flex-1 p-3 space-y-1">
      <a href="/dashboard" class="btn btn-ghost w-full justify-start text-sm bg-muted font-medium" data-active="true" aria-current="page">Dashboard</a>
      <a href="/analytics" class="btn btn-ghost w-full justify-start text-sm text-muted-foreground">Analytics</a>
      <a href="/reports" class="btn btn-ghost w-full justify-start text-sm text-muted-foreground">Reports</a>
    </nav>
  </aside>

  <!-- Scrollable Canvas -->
  <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
    <!-- Topbar (h-14) -->
    <header class="flex items-center justify-between h-14 px-6 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <p class="text-sm text-muted-foreground">Workspace / Overview</p>
      <div class="flex items-center gap-2">
        <button type="button" class="btn btn-ghost size-8 p-0" onclick="window.basecoat.theme.toggle()" aria-label="Toggle theme">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2"/></svg>
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="flex-1 p-6 space-y-6">
      <!-- Page Header & Action Bar -->
      <section class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 class="text-2xl font-semibold tracking-tight text-foreground">Operations Dashboard</h1>
          <p class="text-sm text-muted-foreground">Monitor platform reliability, throughput, and active clusters.</p>
        </div>
        <div class="flex items-center gap-2">
          <button type="button" class="btn btn-outline text-sm">Download Report</button>
          <button type="button" class="btn btn-primary text-sm">+ Deploy Service</button>
        </div>
      </section>

      <!-- Tier 1: 4 KPI Cards -->
      <section class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <article class="card p-6 bg-card text-card-foreground flex flex-col justify-between">
          <p class="text-sm font-medium text-muted-foreground">Avg. Response Time</p>
          <p class="text-3xl font-semibold tabular-nums mt-2">142ms</p>
          <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1">↓ 12ms from yesterday</p>
        </article>
        <article class="card p-6 bg-card text-card-foreground flex flex-col justify-between">
          <p class="text-sm font-medium text-muted-foreground">Request Throughput</p>
          <p class="text-3xl font-semibold tabular-nums mt-2">48.2k/s</p>
          <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1">↑ 8.4% peak load</p>
        </article>
        <article class="card p-6 bg-card text-card-foreground flex flex-col justify-between">
          <p class="text-sm font-medium text-muted-foreground">Active Clusters</p>
          <p class="text-3xl font-semibold tabular-nums mt-2">18 / 20</p>
          <p class="text-xs text-muted-foreground mt-1">2 draining for maintenance</p>
        </article>
        <article class="card p-6 bg-card text-card-foreground flex flex-col justify-between">
          <p class="text-sm font-medium text-muted-foreground">Error Rate (SLO)</p>
          <p class="text-3xl font-semibold tabular-nums mt-2">0.012%</p>
          <p class="text-xs text-emerald-600 dark:text-emerald-400 mt-1">Well within 0.05% SLO</p>
        </article>
      </section>

      <!-- Tier 2: Asymmetrical Chart (8 col) & Live Activity (4 col) -->
      <section class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <article class="card lg:col-span-8 p-6 bg-card text-card-foreground flex flex-col justify-between">
          <header class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-foreground">Cluster Throughput (QPS)</h2>
            <span class="badge text-xs px-2 py-0.5 bg-emerald-500/10 text-emerald-600">Live</span>
          </header>
          <div class="h-64 w-full bg-muted/20 rounded flex items-center justify-center text-muted-foreground text-sm">
            <!-- Integrated SVG or ApexChart slot -->
            <p>Chart Slot (Zero-runtime SVG Area Chart)</p>
          </div>
        </article>

        <article class="card lg:col-span-4 p-6 bg-card text-card-foreground flex flex-col justify-between">
          <header class="flex items-center justify-between mb-4">
            <h2 class="text-lg font-semibold text-foreground">Node Status</h2>
            <button type="button" class="text-xs text-primary hover:underline">View all</button>
          </header>
          <div class="space-y-3 flex-1">
            <div class="flex items-center justify-between text-sm py-1 border-b border-border">
              <span class="font-mono text-xs">node-us-east-1a</span>
              <span class="text-xs text-emerald-600 font-medium">Healthy (99.9%)</span>
            </div>
            <div class="flex items-center justify-between text-sm py-1 border-b border-border">
              <span class="font-mono text-xs">node-us-east-1b</span>
              <span class="text-xs text-emerald-600 font-medium">Healthy (99.8%)</span>
            </div>
            <div class="flex items-center justify-between text-sm py-1 border-b border-border">
              <span class="font-mono text-xs">node-eu-west-1a</span>
              <span class="text-xs text-amber-600 font-medium">Rebalancing</span>
            </div>
          </div>
        </article>
      </section>
    </main>

    <!-- Minimal Canvas Footer -->
    <footer class="mt-auto border-t border-border py-4 px-6 text-xs text-muted-foreground flex items-center justify-between">
      <p>&copy; 2026 Intellmedia. All rights reserved.</p>
      <div class="flex items-center gap-4">
        <a href="/privacy" class="hover:underline">Privacy</a>
        <a href="/terms" class="hover:underline">Terms</a>
        <a href="/status" class="hover:underline">Status</a>
      </div>
    </footer>
  </div>
</div>
```
