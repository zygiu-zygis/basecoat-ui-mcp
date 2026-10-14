---
name: spinner
description: Basecoat UI Spinner component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Spinner (`spinner`)

## Overview & Intent
Indeterminate circular loading animation.

## Anatomy & DOM Structure
```html
<span class="spinner inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" data-icon="inline-start" aria-hidden="true"></span>
```

## Variants & Modifiers
size-4 (inline button), size-6 (section loader), size-8 (page loader).

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| active | animate-spin aria-hidden="true" | Loading process in flight |

## `data-icon` Placement
data-icon="inline-start" inside buttons.

## Correct HTML Example
```html
<span class="spinner inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" data-icon="inline-start" aria-hidden="true"></span>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Sizing classes like w-4 h-4 placed directly on spinner when inside a button with data-icon -->
<span class="animate-spin w-4 h-4 mr-2">Loading...</span>
```
