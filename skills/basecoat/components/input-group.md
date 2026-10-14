---
name: input-group
description: Basecoat UI Input Group component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Input Group (`input-group`)

## Overview & Intent
Compound input control with affixed prefix/suffix text or embedded buttons.

## Anatomy & DOM Structure
```html
<div class="input-group flex items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">
  <span class="input-group-addon px-3 text-sm text-muted-foreground">https://</span>
  <input type="text" class="input-group-field flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="domain.com" />
</div>
```

## Variants & Modifiers
Prefix addon, suffix addon, button addon.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| focus-within | focus-within:ring-1 | Child input focused |

## `data-icon` Placement
Inside addon span.

## Correct HTML Example
```html
<div class="input-group flex items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">
  <span class="px-3 text-sm text-muted-foreground">@</span>
  <input type="text" class="flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="username" />
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Joining inputs with raw border-l-0 hacks causing focus ring clipping -->
<div class="flex">
  <span class="border p-2">@</span><input class="border-l-0 p-2" />
</div>
```
