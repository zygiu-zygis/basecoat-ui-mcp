---
name: combobox
description: Basecoat UI Combobox component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Combobox (`combobox`)

## Overview & Intent
Accessible autocomplete input with filtered dropdown suggestions list.

## Anatomy & DOM Structure
```html
<div class="combobox relative" data-state="closed">
  <input type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" class="input" placeholder="Search framework..." />
  <div class="popover absolute top-full mt-1 w-full rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-border" hidden>
    <ul role="listbox">
      <li role="option" class="item px-2 py-1.5 text-sm rounded-sm hover:bg-muted cursor-pointer">Astro</li>
    </ul>
  </div>
</div>
```

## Variants & Modifiers
Single select combobox, multi-tag combobox.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | aria-expanded="false" popover hidden | Initial state |
| open | aria-expanded="true" popover visible | Input focused / typing |

## `data-icon` Placement
data-icon="inline-end" on chevron or clear button.

## Correct HTML Example
```html
<div class="combobox relative" data-state="closed">
  <input type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" class="input" placeholder="Search..." />
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Text input without role="combobox" or aria-expanded -->
<input type="text" placeholder="Search..." />
<div class="absolute bg-white border">Results</div>
```
