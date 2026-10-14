---
name: sheet
description: Basecoat UI Sheet component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Sheet (`sheet`)

## Overview & Intent
Slide-out overlay drawer anchored to the viewport edge for inspections and side forms.

## Anatomy & DOM Structure
```html
<dialog class="sheet fixed inset-y-0 right-0 z-50 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="sheet-title">
  <header class="mb-4">
    <h2 id="sheet-title" class="text-lg font-semibold">Sheet Title</h2>
  </header>
  <div class="text-sm">Sheet content</div>
</dialog>
```

## Variants & Modifiers
data-side="right | left | bottom | top"

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" | Initial state |
| open | data-state="open" | Open action |

## `data-icon` Placement
data-icon on close button.

## Correct HTML Example
```html
<dialog class="sheet fixed inset-y-0 right-0 z-50 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="sh-title">
  <h2 id="sh-title" class="text-lg font-semibold">User Details</h2>
</dialog>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Sheet missing close button or accessible heading binding -->
<div class="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">Sheet</div>
```
