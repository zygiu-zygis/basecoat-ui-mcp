---
name: context-menu
description: Basecoat UI Context Menu component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Context Menu (`context-menu`)

## Overview & Intent
Floating contextual menu opened on secondary click (right-click) or long press.

## Anatomy & DOM Structure
```html
<div class="context-menu-trigger" data-state="closed">
  <div class="popover fixed rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-border text-sm" hidden>
    <button type="button" class="item flex w-full items-center px-2 py-1.5 rounded-sm hover:bg-muted">Copy</button>
  </div>
</div>
```

## Variants & Modifiers
Standard contextual list with shortcuts.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" hidden | Initial state |
| open | data-state="open" visible | contextmenu event fired |

## `data-icon` Placement
data-icon on menu action items.

## Correct HTML Example
```html
<div class="context-menu-trigger" data-state="closed">
  <div class="p-8 border border-dashed rounded-lg text-center text-sm">Right-click here</div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: High z-index div lacking boundary constraints and outside-click dismissal -->
<div class="fixed z-[9999] bg-white border">Menu</div>
```
