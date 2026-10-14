---
name: dropdown-menu
description: Basecoat UI Dropdown Menu component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Dropdown Menu (`dropdown-menu`)

## Overview & Intent
Action menu anchored to a trigger button with keyboard navigation.

## Anatomy & DOM Structure
```html
<div class="dropdown-menu relative inline-block" data-state="closed">
  <button type="button" class="btn" data-variant="outline" aria-expanded="false" aria-controls="menu-actions">
    Actions <svg data-icon="inline-end" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
  </button>
  <div id="menu-actions" role="menu" class="popover absolute right-0 mt-1 w-48 rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-border" hidden>
    <button type="button" role="menuitem" class="item flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-muted">Edit</button>
  </div>
</div>
```

## Variants & Modifiers
Standard action menu, menu with separators and item badges.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | aria-expanded="false" hidden | Initial state |
| open | aria-expanded="true" visible | Button clicked |

## `data-icon` Placement
data-icon="inline-end" on button chevron.

## Correct HTML Example
```html
<div class="dropdown-menu relative inline-block" data-state="closed">
  <button type="button" class="btn" data-variant="outline" aria-expanded="false" aria-controls="user-menu">Profile</button>
  <div id="user-menu" role="menu" class="popover absolute right-0 mt-1 w-48 rounded-md bg-popover p-1 shadow-md border border-border" hidden>
    <button type="button" role="menuitem" class="item flex w-full items-center px-2 py-1.5 text-sm hover:bg-muted">Settings</button>
  </div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Missing aria-expanded on trigger and missing role="menu" on popover -->
<div><button>Open</button><div class="absolute">Menu</div></div>
```
