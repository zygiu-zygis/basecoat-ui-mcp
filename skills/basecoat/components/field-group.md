---
name: field-group
description: Basecoat UI FieldGroup and FieldSet component reference, DOM anatomy, hierarchy, orientations, and FSM states.
---

# Field Group (`field-group`)

## Overview & Intent
Compound container for grouping related form fields, fieldsets, or controls (e.g. shipping address, personal details, notification preferences). Establishes semantic hierarchy from compound forms down to individual controls, coordinating layout orientation, rhythm, and validation.

## Semantic Hierarchy
```
FieldGroup (role="group" or <form>)
└── FieldSet (<fieldset class="fieldset">)
    ├── FieldLegend (<legend class="legend">)
    └── Field (role="group" class="field")
        ├── FieldLabel (<label for="{id}" class="label">)
        ├── Control (<input id="{id}" class="input"> | <textarea> | <select>)
        ├── FieldDescription (<p id="{id}-desc" class="text-xs text-muted-foreground">)
        └── FieldError (<p id="{id}-err" class="text-xs font-medium text-destructive">)
```

## Anatomy & DOM Structure
```html
<div class="field-group flex flex-col gap-6" data-orientation="vertical">
  <fieldset class="fieldset flex flex-col gap-4 border-0 p-0 m-0">
    <legend class="legend text-base font-semibold leading-none mb-1">Billing Details</legend>
    <p class="text-xs text-muted-foreground -mt-1 mb-2">Enter your primary invoicing information.</p>

    <!-- First Name & Last Name (Horizontal row of vertical fields) -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div role="group" class="field flex flex-col gap-1.5" data-orientation="vertical" data-invalid="false">
        <label for="fg-first-name" class="label text-sm font-medium">First name</label>
        <input id="fg-first-name" type="text" class="input" aria-invalid="false" required />
      </div>
      <div role="group" class="field flex flex-col gap-1.5" data-orientation="vertical" data-invalid="false">
        <label for="fg-last-name" class="label text-sm font-medium">Last name</label>
        <input id="fg-last-name" type="text" class="input" aria-invalid="false" required />
      </div>
    </div>

    <!-- Company (Full width) -->
    <div role="group" class="field flex flex-col gap-1.5" data-orientation="vertical" data-invalid="false">
      <label for="fg-company" class="label text-sm font-medium">Company (optional)</label>
      <input id="fg-company" type="text" class="input" aria-invalid="false" />
    </div>
  </fieldset>
</div>
```

## Variants & Orientations
- `vertical` (default): Fields stack with 16px (`gap-4`) or 24px (`gap-6`) rhythm between fieldsets.
- `horizontal`: Two-column layout with labels or field sets arranged along horizontal rows (`data-orientation="horizontal" class="grid grid-cols-1 md:grid-cols-3 gap-6"`).
- `inline`: Compact inline groups for filter bars, search controls, and segmented toggles (`data-orientation="inline" class="flex items-center gap-3"`).

## FSM State Matrix & Dual-Invalid Contract
| Level | State | Contract | Trigger |
|---|---|---|---|
| FieldGroup | pristine | `data-state="pristine"` | No user interaction yet |
| FieldGroup | invalid | `data-invalid="true"` | At least one child field fails validation |
| FieldSet | disabled | `disabled` | Entire field set disabled |
| Field | invalid | `data-invalid="true"` + control `aria-invalid="true"` | Validation constraint violated |

> **Dual Invalid Contract**: Any invalid child `field` within the group MUST set `data-invalid="true"` on the `.field` container AND `aria-invalid="true"` on the control element. `aria-describedby` MUST connect the control to both description and error IDs.

## Correct HTML Example
```html
<form class="field-group flex flex-col gap-6" data-orientation="vertical" novalidate>
  <fieldset class="fieldset flex flex-col gap-4 border-0 p-0 m-0">
    <legend class="legend text-base font-semibold">Account Security</legend>

    <div role="group" class="field flex flex-col gap-1.5" data-orientation="vertical" data-invalid="true">
      <label for="sec-password" class="label text-sm font-medium">New Password</label>
      <input
        id="sec-password"
        type="password"
        class="input"
        aria-invalid="true"
        aria-describedby="sec-password-desc sec-password-err"
      />
      <p id="sec-password-desc" class="text-xs text-muted-foreground">Must be at least 8 characters long.</p>
      <p id="sec-password-err" class="text-xs font-medium text-destructive" role="alert">Password is too short (minimum 8 characters).</p>
    </div>
  </fieldset>
</form>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Missing fieldset/legend semantics, loose unassociated inputs, hardcoded red spans without aria-describedby -->
<div class="my-form">
  <h3>Account Security</h3>
  <div class="mt-4">
    <label>New Password</label>
    <input type="password" class="border" />
    <span class="text-red-600">Password too short</span>
  </div>
</div>
```
