---
name: form
description: Basecoat UI Form component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Form (`form`)

## Overview & Intent
Semantic form container structured into fieldsets, legends, and action buttons.

## Anatomy & DOM Structure
```html
<form class="form flex flex-col gap-6" novalidate>
  <fieldset class="fieldset flex flex-col gap-4">
    <legend class="legend text-base font-semibold">Profile</legend>
    <!-- fields -->
  </fieldset>
  <div class="flex justify-end gap-2">
    <button type="submit" class="btn" data-variant="default" data-state="default">Save</button>
  </div>
</form>
```

## Variants & Modifiers
Sectioned form, single-card form.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| idle | data-state="default" | Form rendered |
| submitting | button data-state="loading" disabled | Submit triggered |

## `data-icon` Placement
data-icon on submit button.

## Correct HTML Example
```html
<form class="flex flex-col gap-6">
  <fieldset class="flex flex-col gap-4">
    <legend class="text-sm font-semibold">General</legend>
  </fieldset>
  <button type="submit" class="btn" data-variant="default">Submit</button>
</form>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Unstructured form without fieldset or legend -->
<form>
  <div>Input</div><button>Submit</button>
</form>
```
