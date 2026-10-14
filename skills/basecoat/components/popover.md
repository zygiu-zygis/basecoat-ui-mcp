---
name: popover
description: Basecoat UI Popover component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Popover (`popover`)

## Overview & Intent
Non-modal floating content surface anchored to a trigger control.

## Anatomy & DOM Structure
```html
<div class="popover-wrapper relative inline-block" data-state="closed">
  <button type="button" class="btn" data-variant="outline" aria-expanded="false">Open</button>
  <div class="popover absolute top-full mt-2 w-72 rounded-md bg-popover p-4 text-popover-foreground shadow-md border border-border text-sm" hidden>
    Popover content
  </div>
</div>
```

## Variants & Modifiers
Anchored popover, alignment options (start, center, end).

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | hidden aria-expanded="false" | Default state |
| open | visible aria-expanded="true" | Trigger clicked |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="popover-wrapper relative inline-block" data-state="closed">
  <button type="button" class="btn" data-variant="outline">Info</button>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Overwriting popover background with raw white without dark mode token -->
<div class="absolute bg-white text-black p-4 border">Popover</div>
```
