---
name: field
description: Basecoat UI Field component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Field (`field`)

## Overview & Intent
Form field wrapper associating label, control, and validation message.

## Anatomy & DOM Structure
```html
<div role="group" class="field flex flex-col gap-2" data-invalid="false">
  <label for="username" class="label text-sm font-medium">Username</label>
  <input id="username" class="input" aria-invalid="false" aria-describedby="username-desc" />
  <p id="username-desc" class="text-xs text-muted-foreground">Public display name.</p>
</div>
```

## Variants & Modifiers
Vertical field (default), horizontal field (data-orientation="horizontal").

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| valid | data-invalid="false" aria-invalid="false" | Value matches criteria |
| invalid | data-invalid="true" aria-invalid="true" | Validation fails |

## `data-icon` Placement
Icons inside input group or trailing helper.

## Correct HTML Example
```html
<div role="group" class="field flex flex-col gap-2" data-invalid="false">
  <label for="f-email" class="label text-sm font-medium">Email</label>
  <input id="f-email" type="email" class="input" aria-invalid="false" />
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Stacking input without label or separating error message from aria-describedby -->
<div>
  <input type="text" placeholder="Email" />
  <span class="text-red-500">Error</span>
</div>
```
