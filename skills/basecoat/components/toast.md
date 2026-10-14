---
name: toast
description: Basecoat UI Toast component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Toast (`toast`)

## Overview & Intent
Ephemeral feedback message communicating action success or failure.

## Anatomy & DOM Structure
```html
<div role="status" class="toast fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">
  <div class="text-sm font-medium">Saved successfully!</div>
</div>
```

## Variants & Modifiers
Success toast, error toast, informative toast.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| open | data-state="open" | Toast triggered |
| closed | data-state="closed" | Toast timeout / dismissed |

## `data-icon` Placement
Status icon with data-icon="inline-start".

## Correct HTML Example
```html
<div role="status" class="toast fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">
  <span class="text-sm font-medium">Record updated.</span>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Toast without role="status" or missing dark mode card surface tokens -->
<div class="fixed bottom-4 right-4 bg-green-500 text-white p-3">Done</div>
```
