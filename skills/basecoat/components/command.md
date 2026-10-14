---
name: command
description: Basecoat UI Command component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Command (`command`)

## Overview & Intent
Fast keyboard-driven command palette dialog with search filter and item groups.

## Anatomy & DOM Structure
```html
<dialog class="dialog command-dialog max-w-lg w-full rounded-xl bg-popover p-0 shadow-2xl border border-border" data-state="closed" data-fsm-recipe="dialog">
  <div class="flex flex-col">
    <div class="flex items-center border-b border-border px-3">
      <svg data-icon="inline-start" class="text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input class="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Type a command or search..." />
    </div>
    <div class="max-h-80 overflow-y-auto p-2 space-y-1">
      <div class="command-group">
        <span class="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Navigation</span>
        <div class="item flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">Dashboard</div>
      </div>
    </div>
  </div>
</dialog>
```

## Variants & Modifiers
Command dialog, inline embedded command list.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" | Initial state |
| open | data-state="open" | Cmd+K shortcut invoked |

## `data-icon` Placement
Search icon with data-icon="inline-start".

## Correct HTML Example
```html
<dialog class="dialog command-dialog max-w-lg w-full rounded-xl bg-popover p-0 shadow-2xl border border-border" data-state="closed" data-fsm-recipe="dialog">
  <div class="flex items-center border-b border-border px-3">
    <input class="w-full bg-transparent py-3 text-sm outline-none" placeholder="Search..." />
  </div>
</dialog>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Non-modal overlay lacking keyboard trap and escape dismiss -->
<div class="fixed top-20 left-1/2 -translate-x-1/2 bg-white p-4 shadow z-50">Search</div>
```
