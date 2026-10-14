---
name: field
description: Basecoat UI Field component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Field (`field`)

## Overview & Intent
Form field container associating a label, interactive control (input, textarea, select), optional description/helper text, and validation error message. Guarantees accessibility through explicit `for`/`id` association, `aria-describedby` linkage, and synchronized dual-invalid states.

## Anatomy & DOM Structure
```html
<div role="group" class="field flex flex-col gap-1.5" data-orientation="vertical" data-invalid="false">
  <label for="user-email" class="label text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">Email Address</label>
  <input id="user-email" type="email" class="input" aria-invalid="false" aria-describedby="user-email-desc" placeholder="name@example.com" />
  <p id="user-email-desc" class="text-xs text-muted-foreground">We will never share your email address.</p>
</div>
```

## Hierarchy & Sub-Components
- `Field`: Top-level wrapper container (`role="group"`, `class="field"`, `data-invalid="false|true"`, `data-orientation="vertical|horizontal|inline"`).
- `FieldLabel`: Accessible form label (`<label for="{id}" class="label">`).
- `Control`: Form input element (`<input id="{id}" class="input">`, `<textarea id="{id}" class="textarea">`, or `<select id="{id}" class="select">`).
- `FieldDescription`: Helper/guidance text (`<p id="{id}-desc" class="text-xs text-muted-foreground">`).
- `FieldError`: Validation error message (`<p id="{id}-err" class="text-xs font-medium text-destructive">`, rendered when `data-invalid="true"`).

## Variants & Orientations
- `vertical` (default): Stacked column layout (`flex flex-col gap-1.5`).
- `horizontal`: Side-by-side row layout with label aligned (`data-orientation="horizontal" class="field grid grid-cols-4 items-center gap-4"`).
- `inline`: Tight inline arrangement for checkboxes and radio switches (`data-orientation="inline" class="field flex items-center gap-2"`).

## FSM `data-*` / `aria-*` State Matrix & Dual-Invalid Contract
| State | Container Contract | Control Contract | Trigger |
|---|---|---|---|
| valid / pristine | `data-invalid="false"` | `aria-invalid="false"` `aria-describedby="{id}-desc"` | Initial state or valid input |
| invalid | `data-invalid="true"` | `aria-invalid="true"` `aria-describedby="{id}-desc {id}-err"` | Validation constraint violated |
| disabled | `data-disabled="true"` | `disabled` `aria-disabled="true"` | Field disabled |

> **Dual Invalid Contract**: When validation fails, BOTH `data-invalid="true"` must be set on `.field` AND `aria-invalid="true"` must be set on the control element. `aria-describedby` MUST reference both the description and the error ID (`aria-describedby="f-email-desc f-email-err"`).

## Correct HTML Example
```html
<div role="group" class="field flex flex-col gap-1.5" data-orientation="vertical" data-invalid="true">
  <label for="f-email" class="label text-sm font-medium">Work Email</label>
  <input
    id="f-email"
    type="email"
    class="input"
    value="not-an-email"
    aria-invalid="true"
    aria-describedby="f-email-desc f-email-err"
  />
  <p id="f-email-desc" class="text-xs text-muted-foreground">Used for workspace login.</p>
  <p id="f-email-err" class="text-xs font-medium text-destructive" role="alert">Please enter a valid work email address.</p>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Unlinked input lacking label association, missing role="group", lacking aria-invalid and aria-describedby -->
<div class="field">
  <div>Email</div>
  <input type="text" placeholder="name@example.com" class="border p-2" />
  <span class="text-red-500">Invalid email</span>
</div>
```
