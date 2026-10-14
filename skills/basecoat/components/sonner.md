---
name: sonner
description: Basecoat UI Sonner component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Sonner (`sonner`)

## Overview & Intent
Stacked notification viewport managing multiple transient toast notices.

## Anatomy & DOM Structure
```html
<div class="sonner fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
  <div class="toast flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">
    <p class="text-sm font-medium">Notification message</p>
  </div>
</div>
```

## Variants & Modifiers
Bottom-right stack, top-center stack.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| open | data-state="open" | Toast dispatched |
| closed | data-state="closed" | Toast dismissed |

## `data-icon` Placement
data-icon="inline-start" on status icon.

## Correct HTML Example
```html
<div class="sonner fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">
  <div class="toast flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">
    <span class="text-sm font-medium">Changes saved</span>
  </div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Floating notifications without an encompassing role="region" -->
<div class="fixed bottom-4 right-4 bg-white p-4 shadow">Saved</div>
```
