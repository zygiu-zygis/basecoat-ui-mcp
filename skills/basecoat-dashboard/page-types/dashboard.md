# Dashboard Blueprints: Complete 01-07 Catalog

## Summary of All 7 Dashboard Archetypes

| ID | Archetype | Core Components & Slots |
|---|---|---|
| `dashboard-01` | Executive KPI Overview | 4 Metric Cards -> Revenue Area Chart -> Recent Orders Table |
| `dashboard-02` | Analytics Workspace | Time-Series Line Comparison -> Funnel Bar Chart -> Geography Table |
| `dashboard-03` | E-Commerce Storefront Manager | Sales Trend Area -> Fulfillment Alert Cards -> Low Stock Grid |
| `dashboard-04` | SaaS Subscription Console | MRR / ARR Metrics -> Churn Bar Chart -> Active Seat Management Table |
| `dashboard-05` | Project & Task Management | Sprint Progress Gauges -> Burn-down Line Chart -> Kanban Task Cards |
| `dashboard-06` | CRM & Customer Pipeline | Deal Stage Funnel -> Activity Timeline -> Contact Directory Ledger |
| `dashboard-07` | DevOps & Infrastructure Health | System Status Badges -> CPU/RAM Area Charts -> Incident Log Table |

---

## Blueprint: `dashboard-01` (Executive KPI Overview)

```html
<div class="flex min-h-screen bg-background text-foreground">
  <!-- Sidebar -->
  <aside class="sidebar hidden md:flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
    <header class="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold">Executive Console</header>
    <nav class="flex-1 p-3 space-y-1">
      <a href="#" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent" data-state="active">Overview</a>
      <a href="#" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent">Reports</a>
    </nav>
  </aside>

  <!-- Main View -->
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Topbar -->
    <header class="flex h-14 items-center justify-between border-b border-border px-6">
      <h1 class="text-lg font-semibold tracking-tight">Executive Overview</h1>
      <div class="flex items-center gap-2">
        <button type="button" class="btn" data-variant="outline" data-size="sm">Export Report</button>
      </div>
    </header>

    <!-- Main Content Grid -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- 4 Metric Cards -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
          <header class="flex items-center justify-between">
            <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>
            <span class="badge" data-variant="outline">+20.1%</span>
          </header>
          <div class="flex flex-col gap-1">
            <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>
            <p class="text-xs text-muted-foreground">+20.1% from last month</p>
          </div>
        </article>
      </section>

      <!-- Charts & Tables -->
      <section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article class="card col-span-2 flex flex-col gap-4 rounded-xl bg-card p-6 shadow-sm">
          <header class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Revenue Overview</h3>
          </header>
          <div class="h-80 w-full" id="revenue-chart"></div>
        </article>
        <article class="card flex flex-col gap-4 rounded-xl bg-card p-6 shadow-sm">
          <header class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Recent Sales</h3>
          </header>
          <div class="space-y-4">
            <!-- Recent sales items -->
          </div>
        </article>
      </section>
    </main>
  </div>
</div>
```
