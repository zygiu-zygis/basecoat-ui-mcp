---
name: toggle-group
description: Basecoat UI Toggle Group component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Toggle Group (`toggle-group`)

## Overview & Intent
Group of connected toggle buttons for formatting or selection.

## Anatomy & DOM Structure
```html
<div class="toggle-group inline-flex rounded-md border border-border bg-background p-1" role="group" aria-label="Text styles">
  <button type="button" class="btn size-8" data-variant="ghost" data-state="on" aria-pressed="true">B</button>
  <button type="button" class="btn size-8" data-variant="ghost" data-state="off" aria-pressed="false">I</button>
</div>
```

## Variants & Modifiers
Single-selection toggle group, multi-selection toggle group.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | role="group" | Joined toggle cluster |

## `data-icon` Placement
Icons inside buttons.

## Correct HTML Example
```html
<div class="toggle-group inline-flex rounded-md border border-border bg-background p-1" role="group" aria-label="Alignment">
  <button type="button" class="btn size-8" data-variant="ghost" data-state="on" aria-pressed="true">L</button>
  <button type="button" class="btn size-8" data-variant="ghost" data-state="off" aria-pressed="false">R</button>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Separate loose buttons without unified group border or aria role -->
<div class="flex gap-1"><button>B</button><button>I</button></div>
```
