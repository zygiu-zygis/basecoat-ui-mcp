---
name: block-patterns/tables
description: Strict rules for Basecoat data tables, filter toolbars, bulk action bars, row dropdowns, and pagination.
---

# Data Tables & Grids

## Guardrails

* **Container Wrapping**: Wrap all `<table>` elements in `<div class="overflow-x-auto rounded-md border border-border">`. This ensures responsive horizontal scrolling on small screens without breaking layout boundaries.
* **Sticky Header**: In scrolling data tables, pin the header using `thead.sticky.top-0.z-10.border-b.border-border.bg-muted/50.backdrop-blur` with subtle background blur so headers remain legible when passing over row content.
* **Deterministic Column Alignments**:
  * **Text/Entity Columns**: Align left (`text-left font-medium`).
  * **Numeric/Currency Columns**: Align right (`text-right tabular-nums font-mono` or `text-end tabular-nums`) so decimal points align vertically.
  * **Status & Badges**: Align left or center (`text-center`).
  * **Action Columns**: Fixed minimal width (`w-12 text-right`).
* **Interactive Row States**: Table rows (`<tr>`) inside `<tbody>` must have smooth hover feedback: `hover:bg-muted/40 transition-colors`.
* **Row Actions Dropdown**: Row action menus MUST use the Basecoat dropdown pattern with FSM `data-state="closed"`, trigger `aria-expanded="false"`, and `aria-controls="dropdown-id"`.
* **Integrated Filter Toolbar**: Every table view must be preceded by an integrated filter bar featuring a search input with inline SVG icon, filter dropdowns, and a view switcher or export button.
* **Bulk Action Bar**: When selectable rows exist (`<input type="checkbox" class="checkbox">`), provide a bulk actions container displaying selected count, batch status changes, export, and delete actions.
* **Pagination Controls**: Position pagination directly beneath the table container. Show the current slice (`Showing 1 to 10 of 124 results`) and standard-sized button controls (`.btn .btn-outline` or `.btn .btn-ghost`). Never use tiny buttons (`btn-xs`). Active page must declare `aria-current="page"`.
* **Actionable Empty State**: When rows are empty, render a single `<tr><td colspan="100%" class="h-48 text-center">` containing an SVG icon, heading, descriptive text, and a primary action button.
* **Loading State**: When fetching data, replace active rows with `<div class="skeleton h-8 w-full rounded">` inside table cells to preserve layout footprint.
* **Data Density**: For full-page tables, generate at least 10 realistic mock records.

## Reference Basecoat Table Pattern

```html
<section class="flex flex-col gap-4">
  <!-- Integrated Filter Toolbar -->
  <header class="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
    <div class="relative flex-1 max-w-sm">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
      <input type="search" class="input w-full pl-9 text-sm" placeholder="Search orders, customers..." aria-label="Search orders" />
    </div>

    <div class="flex items-center gap-2">
      <!-- Status Filter Dropdown -->
      <div class="dropdown-menu relative inline-block text-left" data-state="closed">
        <button type="button" class="btn btn-outline flex items-center gap-2 text-sm" id="filter-btn" aria-haspopup="true" aria-expanded="false" aria-controls="filter-menu">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Status
          <svg class="size-4 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </button>
        <div class="dropdown-content hidden absolute right-0 mt-1 w-44 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md z-20" id="filter-menu" role="menu" aria-labelledby="filter-btn">
          <button type="button" class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-muted" role="menuitem">All Orders</button>
          <button type="button" class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-muted" role="menuitem">Completed</button>
          <button type="button" class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-muted" role="menuitem">Pending</button>
          <button type="button" class="flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-muted" role="menuitem">Failed</button>
        </div>
      </div>

      <button type="button" class="btn btn-outline text-sm">Export</button>
      <button type="button" class="btn btn-primary text-sm">+ Add Record</button>
    </div>
  </header>

  <!-- Table Container with Sticky Header & Responsive Scroll -->
  <div class="overflow-x-auto rounded-md border border-border">
    <table class="table w-full text-sm">
      <thead class="sticky top-0 z-10 border-b border-border bg-muted/50 backdrop-blur text-muted-foreground font-medium">
        <tr>
          <th class="w-10 px-4 py-3 text-left">
            <input type="checkbox" class="checkbox size-4 rounded border-border" aria-label="Select all rows" />
          </th>
          <th class="px-4 py-3 text-left">Order ID</th>
          <th class="px-4 py-3 text-left">Customer</th>
          <th class="px-4 py-3 text-left">Status</th>
          <th class="px-4 py-3 text-right">Amount</th>
          <th class="px-4 py-3 text-left">Date</th>
          <th class="w-12 px-4 py-3 text-right"><span class="sr-only">Actions</span></th>
        </tr>
      </thead>
      <tbody class="divide-y divide-border">
        <tr class="hover:bg-muted/40 transition-colors">
          <td class="px-4 py-3">
            <input type="checkbox" class="checkbox size-4 rounded border-border" aria-label="Select order ORD-9201" />
          </td>
          <td class="px-4 py-3 font-mono font-medium text-foreground">ORD-9201</td>
          <td class="px-4 py-3">
            <div class="flex flex-col">
              <span class="font-medium text-foreground">Sarah Connor</span>
              <span class="text-xs text-muted-foreground">sarah@cyberdyne.io</span>
            </div>
          </td>
          <td class="px-4 py-3">
            <span class="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              Paid
            </span>
          </td>
          <td class="px-4 py-3 text-right font-mono tabular-nums font-medium text-foreground">$1,240.00</td>
          <td class="px-4 py-3 text-muted-foreground">Oct 14, 2026</td>
          <td class="px-4 py-3 text-right">
            <!-- Row Action Dropdown -->
            <div class="dropdown-menu relative inline-block" data-state="closed">
              <button type="button" class="btn btn-ghost size-8 p-0 rounded-md" id="row-btn-1" aria-haspopup="true" aria-expanded="false" aria-controls="row-menu-1" aria-label="Row actions">
                <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="1" />
                  <circle cx="12" cy="5" r="1" />
                  <circle cx="12" cy="19" r="1" />
                </svg>
              </button>
              <div class="dropdown-content hidden absolute right-0 mt-1 w-36 rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md z-20" id="row-menu-1" role="menu" aria-labelledby="row-btn-1">
                <button type="button" class="flex w-full items-center px-2 py-1.5 text-xs rounded-sm hover:bg-muted" role="menuitem">View details</button>
                <button type="button" class="flex w-full items-center px-2 py-1.5 text-xs rounded-sm hover:bg-muted" role="menuitem">Download invoice</button>
                <button type="button" class="flex w-full items-center px-2 py-1.5 text-xs rounded-sm text-destructive hover:bg-destructive/10" role="menuitem">Refund</button>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- Pagination Controls -->
  <footer class="flex flex-col sm:flex-row items-center justify-between gap-4 py-2 text-sm text-muted-foreground">
    <p>Showing <span class="font-medium text-foreground">1</span> to <span class="font-medium text-foreground">10</span> of <span class="font-medium text-foreground">124</span> orders</p>
    <div class="flex items-center gap-1.5">
      <button type="button" class="btn btn-outline text-sm" disabled>Previous</button>
      <button type="button" class="btn btn-outline text-sm" aria-current="page">1</button>
      <button type="button" class="btn btn-ghost text-sm">2</button>
      <button type="button" class="btn btn-ghost text-sm">3</button>
      <span class="px-1 text-xs">…</span>
      <button type="button" class="btn btn-ghost text-sm">13</button>
      <button type="button" class="btn btn-outline text-sm">Next</button>
    </div>
  </footer>
</section>
```
