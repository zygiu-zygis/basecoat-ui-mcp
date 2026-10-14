---
name: sidebar
description: Basecoat UI Sidebar component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Sidebar (`sidebar`)

## Overview & Intent
Master navigation sidebar containing brand switcher, nav items, and profile footer.

## Anatomy & DOM Structure
```html
<aside class="sidebar flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
  <header class="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold">Brand</header>
  <nav class="flex-1 p-3 space-y-1"><a href="#" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium" data-state="active">Home</a></nav>
  <footer class="border-t border-sidebar-border p-3">User</footer>
</aside>
```

## Variants & Modifiers
Full sidebar (w-64), compact icon rail (w-16), dual rail.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| expanded | data-state="expanded" | Default open sidebar |
| collapsed | data-state="collapsed" | Toggle icon rail mode |

## `data-icon` Placement
data-icon="inline-start" on navigation items.

## Correct HTML Example
```html
<aside class="sidebar flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
  <header class="flex h-14 items-center px-4 font-semibold">Console</header>
</aside>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Sidebar lacking --sidebar-* semantic token bindings -->
<div class="w-64 bg-gray-100 text-black border-r">Nav</div>
```
