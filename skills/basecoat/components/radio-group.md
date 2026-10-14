---
name: radio-group
description: Basecoat UI Radio Group component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Radio Group (`radio-group`)

## Overview & Intent
Set of mutually exclusive radio buttons grouped under an accessible legend.

## Anatomy & DOM Structure
```html
<div class="radio-group flex flex-col gap-2" role="radiogroup" aria-label="Plan">
  <div class="flex items-center gap-2">
    <input type="radio" id="p1" name="plan" class="radio" checked />
    <label for="p1" class="label text-sm font-medium">Free Plan</label>
  </div>
</div>
```

## Variants & Modifiers
Vertical radio group, horizontal radio group.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| unchecked | checked=false | Unselected radio |
| checked | checked=true | User selection |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="radio-group flex flex-col gap-2" role="radiogroup" aria-label="Billing cycle">
  <div class="flex items-center gap-2">
    <input type="radio" id="cycle-monthly" name="cycle" class="radio" checked />
    <label for="cycle-monthly" class="label text-sm font-medium">Monthly</label>
  </div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Radio buttons missing matching name attributes or shared radiogroup role -->
<div><input type="radio" /> Monthly <input type="radio" /> Annual</div>
```
