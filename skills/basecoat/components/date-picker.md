---
name: date-picker
description: Basecoat UI Date Picker component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Date Picker (`date-picker`)

## Overview & Intent
Input popover trigger revealing an interactive calendar grid.

## Anatomy & DOM Structure
```html
<div class="date-picker relative inline-block" data-state="closed">
  <button type="button" class="btn" data-variant="outline" aria-expanded="false">
    <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
    <span>Pick a date</span>
  </button>
  <div class="popover absolute top-full mt-1 rounded-xl bg-card p-3 shadow-lg border border-border" hidden>
    <!-- calendar -->
  </div>
</div>
```

## Variants & Modifiers
Single date picker, range picker.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | aria-expanded="false" hidden | Initial state |
| open | aria-expanded="true" visible | Button clicked |

## `data-icon` Placement
Calendar icon with data-icon="inline-start".

## Correct HTML Example
```html
<div class="date-picker relative inline-block" data-state="closed">
  <button type="button" class="btn" data-variant="outline">
    <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>
    <span>Select date</span>
  </button>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Using raw unstyled text input without format hints or calendar fallback -->
<input type="text" placeholder="DD/MM/YYYY" />
```
