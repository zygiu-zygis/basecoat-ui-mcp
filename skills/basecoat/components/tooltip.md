---
name: tooltip
description: Basecoat UI Tooltip component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Tooltip (`tooltip`)

## Overview & Intent
Small contextual popup hint displayed on hover or keyboard focus.

## Anatomy & DOM Structure
```html
<div class="tooltip-wrapper relative inline-block">
  <button type="button" class="btn size-8" data-variant="ghost" aria-describedby="tooltip-hint">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  </button>
  <div id="tooltip-hint" role="tooltip" class="popover absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground shadow-sm" hidden>
    Helpful info
  </div>
</div>
```

## Variants & Modifiers
Top tooltip (default), bottom, left, right tooltip.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | hidden | Default state |
| open | visible | Hover or focus entered |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="tooltip-wrapper relative inline-block">
  <button type="button" class="btn size-8" data-variant="ghost" aria-describedby="tip-add">+</button>
  <div id="tip-add" role="tooltip" class="popover absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-sm" hidden>Add item</div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Tooltip triggered only on mouse hover that cannot be reached via keyboard Tab -->
<span title="Tooltip">Info</span>
```
