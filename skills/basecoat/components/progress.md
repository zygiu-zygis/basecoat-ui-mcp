---
name: progress
description: Basecoat UI Progress component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Progress (`progress`)

## Overview & Intent
Visual progress bar communicating task completion percentage.

## Anatomy & DOM Structure
```html
<div class="progress relative h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">
  <div class="progress-bar size-full bg-primary transition-all" style="width: 60%"></div>
</div>
```

## Variants & Modifiers
Linear progress, thin progress (h-1), thick progress (h-3).

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| value | aria-valuenow="60" | Progress update |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="progress relative h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
  <div class="size-full bg-primary" style="width: 75%"></div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Missing role="progressbar", aria-valuenow, or aria-valuemax -->
<div class="w-full bg-gray-200 h-2"><div class="bg-blue-600 w-1/2 h-full"></div></div>
```
