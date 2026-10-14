---
name: block-patterns/navigation
description: Strict rules for Basecoat navigation, collapsible sidebars, top app bars, breadcrumb trails, and matched heights.
---

# Navigation Systems & Shell Components

## Guardrails

* **Collapsible Sidebar Specifications**:
  * Desktop width MUST be constrained to `w-64` (16rem).
  * Collapsed icon-only mode MUST use `w-16` with tooltips indicating navigation item labels.
  * Sidebar must remain pinned and scroll independently if content exceeds viewport: `md:sticky md:top-0 md:h-screen overflow-y-auto`.
  * Declare FSM state on host: `<aside class="sidebar w-64 border-e border-border bg-background md:sticky md:top-0 md:h-screen" data-component="sidebar" data-state="expanded">`.
* **Matched Header Alignment**:
  * The Sidebar brand header container and the Main Topbar MUST share identical height: either strictly `h-12` (compact) or `h-14` (comfortable/standard).
  * Their bottom horizontal borders (`border-b border-border`) must align seamlessly across the viewport.
* **Top App Bar & Breadcrumb Trail**:
  * The top app bar hosts global utility controls, breadcrumb trail navigation, and user identity.
  * Breadcrumbs must use `<nav aria-label="Breadcrumb">` with an `<ol class="flex items-center gap-1.5 text-sm text-muted-foreground">`.
  * Page-level titles, primary page actions, and tabs belong in the scrollable main canvas, NOT the global top app bar.
* **Active Navigation State**:
  * Apply `data-active="true"` and `aria-current="page"` to the active route link:
    `<a href="..." class="btn btn-ghost w-full justify-start gap-2.5 text-sm bg-muted text-foreground font-medium" data-active="true" aria-current="page">`.
  * Inactive links must use standard ghost styling: `<a href="..." class="btn btn-ghost w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground">`.
* **Category Grouping & Headings**:
  * Use unclickable category labels: `<h3 class="px-2 pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">`.
* **Trailing Badges & Status**:
  * Badges or counter pills inside navigation items MUST be pushed to the right edge using `ms-auto` or `ml-auto` (e.g., `<span class="badge badge-sm ms-auto px-1.5 py-0.5 text-xs">8</span>`).

## Reference Basecoat Navigation Shell

```html
<div class="flex min-h-screen w-full bg-background text-foreground">
  <!-- Collapsible Desktop Sidebar -->
  <aside class="sidebar hidden md:flex flex-col w-64 border-e border-border bg-card/50 md:sticky md:top-0 md:h-screen" data-component="sidebar" data-state="expanded" aria-label="Main Navigation">
    <!-- Brand Header (Matched Height h-14) -->
    <header class="flex items-center justify-between h-14 px-4 border-b border-border">
      <a href="/workspace" class="flex items-center gap-2 font-semibold text-foreground">
        <div class="size-7 rounded-md bg-primary flex items-center justify-center text-primary-foreground font-bold text-xs">
          BC
        </div>
        <span>Basecoat Admin</span>
      </a>
      <button type="button" class="btn btn-ghost size-8 p-0 text-muted-foreground" aria-label="Collapse sidebar">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="18" height="18" x="3" y="3" rx="2" />
          <path d="M9 3v18" />
        </svg>
      </button>
    </header>

    <!-- Navigation Item Groups -->
    <nav class="flex-1 flex flex-col gap-1 p-3 overflow-y-auto" aria-label="Workspace Links">
      <h3 class="px-2 pt-2 pb-1 text-xs font-medium text-muted-foreground">Overview</h3>
      <a href="/dashboard" class="btn btn-ghost w-full justify-start gap-2.5 text-sm bg-muted text-foreground font-medium" data-active="true" aria-current="page">
        <svg class="size-4 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <rect width="7" height="9" x="3" y="3" rx="1" />
          <rect width="7" height="5" x="14" y="3" rx="1" />
          <rect width="7" height="9" x="14" y="12" rx="1" />
          <rect width="7" height="5" x="3" y="16" rx="1" />
        </svg>
        <span>Dashboard</span>
      </a>

      <a href="/analytics" class="btn btn-ghost w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M3 3v18h18" />
          <path d="m19 9-5 5-4-4-3 3" />
        </svg>
        <span>Analytics</span>
      </a>

      <a href="/orders" class="btn btn-ghost w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <circle cx="8" cy="21" r="1" />
          <circle cx="19" cy="21" r="1" />
          <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
        </svg>
        <span>Orders</span>
        <span class="badge ms-auto px-1.5 py-0.5 text-xs bg-muted text-muted-foreground font-mono">14</span>
      </a>

      <h3 class="px-2 pt-4 pb-1 text-xs font-medium text-muted-foreground">Management</h3>
      <a href="/customers" class="btn btn-ghost w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
        <span>Customers</span>
      </a>

      <a href="/settings" class="btn btn-ghost w-full justify-start gap-2.5 text-sm text-muted-foreground hover:text-foreground">
        <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>Settings</span>
      </a>
    </nav>

    <!-- User Profile Footer -->
    <footer class="flex items-center gap-3 p-3 border-t border-border">
      <div class="size-8 rounded-full bg-muted flex items-center justify-center font-semibold text-xs text-muted-foreground">
        JD
      </div>
      <div class="flex flex-col overflow-hidden">
        <span class="text-xs font-medium text-foreground truncate">John Doe</span>
        <span class="text-xs text-muted-foreground truncate">john@acme.com</span>
      </div>
    </footer>
  </aside>

  <!-- Main Canvas Wrapper -->
  <div class="flex-1 flex flex-col min-w-0">
    <!-- Top App Bar (Matched Height h-14) -->
    <header class="flex items-center justify-between h-14 px-6 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
      <!-- Breadcrumb Trail -->
      <nav aria-label="Breadcrumb">
        <ol class="flex items-center gap-1.5 text-sm text-muted-foreground">
          <li><a href="/workspace" class="hover:text-foreground">Workspace</a></li>
          <li aria-hidden="true"><span class="text-muted-foreground/60">/</span></li>
          <li><span class="font-medium text-foreground" aria-current="page">Dashboard</span></li>
        </ol>
      </nav>

      <!-- Utility Actions -->
      <div class="flex items-center gap-2">
        <button type="button" class="btn btn-ghost size-8 p-0 text-muted-foreground" aria-label="Search shortcut">
          <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
        </button>
        <!-- Theme Switcher -->
        <button type="button" class="btn btn-ghost size-8 p-0 text-muted-foreground" onclick="window.basecoat.theme.toggle()" aria-label="Toggle theme">
          <svg class="size-4 dark:hidden" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
          </svg>
          <svg class="size-4 hidden dark:block" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          </svg>
        </button>
      </div>
    </header>

    <!-- Scrollable Main Canvas -->
    <main class="flex-1 p-6 overflow-y-auto">
      <!-- Page Content Mounts Here -->
    </main>
  </div>
</div>
```
