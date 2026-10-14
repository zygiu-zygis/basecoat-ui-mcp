---
name: drawer
description: Basecoat UI Drawer component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Drawer (`drawer`)

## Overview & Intent
Slide-out panel anchored to the bottom (mobile) or right (desktop) edge of the viewport.

## Anatomy & DOM Structure
```html
<dialog class="drawer fixed inset-y-0 right-0 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="drw-title">
  <header class="mb-4">
    <h2 id="drw-title" class="text-lg font-semibold">Drawer Title</h2>
  </header>
  <div class="text-sm">Drawer content</div>
</dialog>
```

## Variants & Modifiers
data-side="right | left | bottom | top"

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" | Initial state |
| open | data-state="open" | Trigger opened |

## `data-icon` Placement
data-icon on close button.

## Correct HTML Example
```html
<dialog class="drawer fixed inset-y-0 right-0 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="side-title">
  <h2 id="side-title" class="text-lg font-semibold mb-4">Details</h2>
</dialog>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Drawer missing data-side attribute or unconstrained overflow -->
<div class="fixed right-0 top-0 h-full w-80 bg-white">Drawer</div>
```
