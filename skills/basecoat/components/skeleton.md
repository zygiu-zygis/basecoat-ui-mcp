---
name: skeleton
description: Basecoat UI Skeleton component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Skeleton (`skeleton`)

## Overview & Intent
Pulsing placeholder indicating content is actively loading.

## Anatomy & DOM Structure
```html
<div class="skeleton animate-pulse rounded-md bg-muted h-4 w-3/4" aria-hidden="true"></div>
```

## Variants & Modifiers
Text line skeleton, circular avatar skeleton (rounded-full size-10), card block skeleton.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| loading | class="skeleton animate-pulse" aria-hidden="true" | Loading state |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="skeleton animate-pulse rounded-md bg-muted h-4 w-1/2" aria-hidden="true"></div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Missing aria-hidden="true" or using solid static gray boxes -->
<div class="bg-gray-300 h-4 w-32"></div>
```
