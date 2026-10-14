---
name: scroll-area
description: Basecoat UI Scroll Area component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Scroll Area (`scroll-area`)

## Overview & Intent
Custom styled scrolling container preserving cross-browser scrollbar aesthetics.

## Anatomy & DOM Structure
```html
<div class="scroll-area relative overflow-hidden rounded-md border border-border h-72">
  <div class="scroll-area-viewport size-full overflow-y-auto p-4">
    <!-- content -->
  </div>
</div>
```

## Variants & Modifiers
Vertical scroll area, horizontal scroll area.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | overflow-y-auto | Content overflow |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="scroll-area relative overflow-hidden rounded-md border border-border h-64">
  <div class="size-full overflow-y-auto p-4">List items...</div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Default raw scrollbars causing layout shifts on Windows/Linux -->
<div class="overflow-scroll h-64">Content</div>
```
