# Sidebar Architectures: Complete 01-16 Catalog

Basecoat UI defines 16 distinct sidebar architectures catering to diverse enterprise workspace patterns.

## Summary of All 16 Sidebar Architectures

| ID | Name | Architecture | Slot Targets |
|---|---|---|---|
| `sidebar-01` | Standard Workspace | Header workspace switcher, collapsible nav sections, user footer profile | `#sidebar-header`, `#sidebar-nav`, `#sidebar-footer` |
| `sidebar-02` | Floating Card Sidebar | Inset floating card with rounded-xl border, search input trigger | `#sidebar-search`, `#sidebar-nav`, `#sidebar-footer` |
| `sidebar-03` | Inset Dashboard Layout | Persistent breadcrumb header, badge counters, status ring | `#sidebar-header`, `#sidebar-nav`, `#header-breadcrumb` |
| `sidebar-04` | Multi-Level Tree | Collapsible nested child items with tree line indicators | `#sidebar-tree`, `#sidebar-footer` |
| `sidebar-05` | Compact Icon Rail | 64px width (w-16) icon-only bar with hover tooltips and flyout | `#sidebar-rail`, `#sidebar-flyout` |
| `sidebar-06` | Dual-Rail Workspace | Fixed primary icon bar paired with contextual secondary tree panel | `#primary-rail`, `#secondary-panel`, `#main-content` |
| `sidebar-07` | Minimalist Flat Nav | Quiet typography, section dividers, footer system health indicator | `#sidebar-nav`, `#sidebar-status` |
| `sidebar-08` | Team Project Workspace | Team switcher dropdown, project list, quick action modal button | `#team-switcher`, `#project-list`, `#quick-action` |
| `sidebar-09` | Document Outline | Scroll-spy heading navigation with active anchor indicators | `#doc-outline`, `#doc-content` |
| `sidebar-10` | Faceted Filter Sidebar | Facet checkboxes, price range sliders, active filter tag pills | `#filter-facets`, `#filter-actions` |
| `sidebar-11` | Account Settings Nav | Categorized preference tabs paired with billing quota meter | `#settings-nav`, `#quota-meter` |
| `sidebar-12` | Mobile Slide-Out Drawer | Slide-over backdrop with touch gesture dismiss and full-width links | `#drawer-header`, `#drawer-nav`, `#drawer-backdrop` |
| `sidebar-13` | Collapsible Inset Rail | Toggle button switching `data-state="expanded"` to `"collapsed"` | `#sidebar-toggle`, `#sidebar-nav` |
| `sidebar-14` | Brand / Upgrade Callout | Prominent logo header, navigation items, plan upgrade callout card | `#sidebar-logo`, `#upgrade-card` |
| `sidebar-15` | Help & Resource Center | Search bar, FAQ category links, documentation pills, live chat trigger | `#help-search`, `#resource-links` |
| `sidebar-16` | E-commerce Taxonomy | Deep hierarchical category navigation with item counts | `#category-tree`, `#price-filter` |

---

## Canonical Blueprint: `sidebar-01` (Standard Workspace)

```html
<aside class="sidebar flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground" data-state="expanded">
  <!-- Slot: #sidebar-header -->
  <header class="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
    <div class="flex items-center gap-2">
      <div class="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold">A</div>
      <div class="flex flex-col">
        <span class="text-sm font-semibold leading-none">Acme Corp</span>
        <span class="text-xs text-muted-foreground">Enterprise Plan</span>
      </div>
    </div>
  </header>

  <!-- Slot: #sidebar-nav -->
  <nav class="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main Navigation">
    <a href="/dashboard" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" data-state="active">
      <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      Dashboard
    </a>
    <a href="/analytics" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" data-state="default">
      <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
      Analytics
    </a>
    <a href="/orders" class="sidebar-item flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" data-state="default">
      <div class="flex items-center gap-3">
        <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        Orders
      </div>
      <span class="badge" data-variant="secondary">24</span>
    </a>
  </nav>

  <!-- Slot: #sidebar-footer -->
  <footer class="border-t border-sidebar-border p-3">
    <div class="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent cursor-pointer">
      <span class="avatar size-8 rounded-full" data-state="loaded">
        <span class="avatar-fallback flex size-full items-center justify-center bg-muted text-xs font-medium">JD</span>
      </span>
      <div class="flex flex-col overflow-hidden">
        <span class="truncate text-sm font-medium">Jane Doe</span>
        <span class="truncate text-xs text-muted-foreground">jane@acme.com</span>
      </div>
    </div>
  </footer>
</aside>
```
