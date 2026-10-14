---
name: button-group
description: Basecoat UI Button Group component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Button Group (`button-group`)

## Overview & Intent
Cohesive cluster of related action buttons joined with unified borders.

## Anatomy & DOM Structure
```html
<div class="button-group flex items-center -space-x-px" role="group" aria-label="View mode">
  <button type="button" class="btn rounded-r-none" data-variant="outline">Day</button>
  <button type="button" class="btn rounded-none" data-variant="outline">Week</button>
  <button type="button" class="btn rounded-l-none" data-variant="outline">Month</button>
</div>
```

## Variants & Modifiers
Horizontal group, segmented outline buttons.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | role="group" | Static button cluster |

## `data-icon` Placement
data-icon on individual buttons.

## Correct HTML Example
```html
<div class="button-group flex items-center -space-x-px" role="group" aria-label="Zoom controls">
  <button type="button" class="btn rounded-r-none" data-variant="outline" aria-label="Zoom out">-</button>
  <button type="button" class="btn rounded-l-none" data-variant="outline" aria-label="Zoom in">+</button>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Spaced buttons with gap-2 instead of connected borders -->
<div class="flex gap-2">
  <button class="border p-2">Day</button>
  <button class="border p-2">Week</button>
</div>
```
