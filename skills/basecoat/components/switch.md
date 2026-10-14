---
name: switch
description: Basecoat UI Switch component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Switch (`switch`)

## Overview & Intent
Accessible boolean toggle switch control.

## Anatomy & DOM Structure
```html
<div class="flex items-center gap-2">
  <input type="checkbox" id="airplane" role="switch" class="switch" data-state="unchecked" />
  <label for="airplane" class="label text-sm font-medium">Airplane Mode</label>
</div>
```

## Variants & Modifiers
Default switch, compact switch.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| unchecked | data-state="unchecked" checked=false | Switch off |
| checked | data-state="checked" checked=true | Switch on |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="flex items-center gap-2">
  <input type="checkbox" id="sw-notif" role="switch" class="switch" data-state="unchecked" />
  <label for="sw-notif" class="label text-sm font-medium">Notifications</label>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Checkbox without role="switch" or missing associated <label> -->
<input type="checkbox" /> Airplane mode
```
