---
name: select
description: Basecoat UI Select component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Select (`select`)

## Overview & Intent
Form select dropdown utilizing native HTML <select> with dark mode tokens.

## Anatomy & DOM Structure
```html
<div class="field flex flex-col gap-2">
  <label for="role" class="label text-sm font-medium">Role</label>
  <select id="role" class="select flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring">
    <option value="admin">Administrator</option>
    <option value="member">Team Member</option>
  </select>
</div>
```

## Variants & Modifiers
Standard native select, custom popover select.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="select" | Default selection |
| disabled | disabled opacity-50 | Disabled select |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="field flex flex-col gap-2">
  <label for="country" class="label text-sm font-medium">Country</label>
  <select id="country" class="select flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">
    <option value="lt">Lithuania</option>
  </select>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Missing dark mode CSS contract causing white-on-white text in dark mode -->
<select class="border p-2 bg-white text-black"><option>Admin</option></select>
```
