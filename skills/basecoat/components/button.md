---
name: button
description: Basecoat UI Button component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Button (`button`)

## Overview & Intent
Interactive button triggering actions, submissions, or modal dialogs.

## Anatomy & DOM Structure
```html
<button type="button" class="btn" data-variant="default" data-size="default" data-state="default">
  Click me
</button>
```

## Variants & Modifiers
data-variant="default | secondary | outline | ghost | destructive | link", data-size="default | sm | lg | icon"

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | data-state="default" | Initial interactive state |
| active | data-state="active" | Pointer down / pressed |
| loading | data-state="loading" disabled | Async action in flight |
| disabled | data-state="disabled" disabled aria-disabled="true" | Disabled condition |

## `data-icon` Placement
data-icon="inline-start" or data-icon="inline-end". Never put size-4 on data-icon SVG.

## Correct HTML Example
```html
<button type="submit" class="btn" data-variant="default" data-state="default">
  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
  Continue
</button>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Hardcoded sizing w-4 h-4 mr-2 on icon instead of data-icon -->
<button class="bg-blue-600 text-white px-4 py-2 rounded">
  <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24">...</svg>
  Submit
</button>
```
