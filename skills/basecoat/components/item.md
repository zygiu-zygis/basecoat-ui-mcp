---
name: item
description: Basecoat UI Item component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Item (`item`)

## Overview & Intent
Generic row or option tile used in lists, command palettes, and menus.

## Anatomy & DOM Structure
```html
<div class="item flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer">
  <span class="text-sm font-medium">Item Label</span>
  <span class="badge" data-variant="outline">Active</span>
</div>
```

## Variants & Modifiers
Bordered item tile, plain hover item row.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="item" | Idle row |
| hover | hover:bg-muted/50 | Pointer hover |

## `data-icon` Placement
Leading icon or avatar.

## Correct HTML Example
```html
<div class="item flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">
  <span class="text-sm font-medium">Workspace Item</span>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Non-interactive div with hardcoded hover styling -->
<div class="p-3 bg-white hover:bg-gray-100">Item</div>
```
