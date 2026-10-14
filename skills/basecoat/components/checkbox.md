---
name: checkbox
description: Basecoat UI Checkbox component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Checkbox (`checkbox`)

## Overview & Intent
Two-state or indeterminate control allowing users to toggle binary options.

## Anatomy & DOM Structure
```html
<div class="flex items-center gap-2">
  <input type="checkbox" id="terms" class="checkbox" data-state="unchecked" />
  <label for="terms" class="label text-sm font-medium">Accept terms</label>
</div>
```

## Variants & Modifiers
Default checkbox, disabled checkbox, indeterminate state.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| unchecked | data-state="unchecked" checked=false | Default state |
| checked | data-state="checked" checked=true | User clicks checkbox |
| disabled | data-state="disabled" disabled | Disabled option |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="flex items-center gap-2">
  <input type="checkbox" id="marketing" class="checkbox" data-state="unchecked" />
  <label for="marketing" class="label text-sm font-medium">Receive updates</label>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Custom non-input toggle div without keyboard focus or accessibility attributes -->
<div class="w-4 h-4 border border-gray-400 cursor-pointer"></div>
```
