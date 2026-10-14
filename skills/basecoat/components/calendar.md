---
name: calendar
description: Basecoat UI Calendar component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Calendar (`calendar`)

## Overview & Intent
Date grid selector for single date or date range picking.

## Anatomy & DOM Structure
```html
<div class="calendar p-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm max-w-xs">
  <header class="flex items-center justify-between pb-3">
    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Previous month">
      <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>
    </button>
    <span class="text-sm font-medium">October 2026</span>
    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Next month">
      <svg data-icon="inline-end" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>
    </button>
  </header>
  <table class="w-full border-collapse text-center text-xs">
    <thead><tr class="text-muted-foreground"><th class="h-8">Su</th><th class="h-8">Mo</th><th class="h-8">Tu</th><th class="h-8">We</th><th class="h-8">Th</th><th class="h-8">Fr</th><th class="h-8">Sa</th></tr></thead>
    <tbody><tr><td class="p-1"><button type="button" class="btn size-8 rounded-md" data-variant="ghost">1</button></td></tr></tbody>
  </table>
</div>
```

## Variants & Modifiers
Single date selection, date range selection.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | data-variant="ghost" | Unselected date cell |
| selected | data-variant="default" bg-primary text-primary-foreground | Selected date cell |
| disabled | opacity-50 pointer-events-none | Out-of-bounds date cell |

## `data-icon` Placement
data-icon on month navigation buttons.

## Correct HTML Example
```html
<div class="calendar p-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm max-w-xs">
  <header class="flex items-center justify-between pb-2">
    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Previous month">‹</button>
    <span class="text-sm font-semibold">May 2026</span>
    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Next month">›</button>
  </header>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Non-table div grid missing accessible date navigation labels -->
<div class="grid grid-cols-7 gap-1">
  <div>1</div><div>2</div>
</div>
```
