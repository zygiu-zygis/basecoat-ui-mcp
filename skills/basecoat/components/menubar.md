---
name: menubar
description: Basecoat UI Menubar component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Menubar (`menubar`)

## Overview & Intent
Desktop application horizontal menu bar holding dropdown menu triggers.

## Anatomy & DOM Structure
```html
<div class="menubar flex h-9 items-center gap-1 rounded-md border border-border bg-background p-1" role="menubar">
  <button type="button" role="menuitem" class="item px-3 py-1 text-sm font-medium rounded-sm hover:bg-muted">File</button>
  <button type="button" role="menuitem" class="item px-3 py-1 text-sm font-medium rounded-sm hover:bg-muted">Edit</button>
</div>
```

## Variants & Modifiers
Standard menubar.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | role="menubar" | Horizontal bar |

## `data-icon` Placement
data-icon on menu item buttons.

## Correct HTML Example
```html
<div class="menubar flex h-9 items-center gap-1 rounded-md border border-border bg-background p-1" role="menubar">
  <button type="button" role="menuitem" class="px-3 py-1 text-sm rounded-sm hover:bg-muted">File</button>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Horizontal list without role="menubar" or role="menuitem" -->
<div class="flex gap-4"><div>File</div></div>
```
