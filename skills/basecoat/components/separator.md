---
name: separator
description: Basecoat UI Separator component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Separator (`separator`)

## Overview & Intent
Subtle horizontal or vertical divider separating distinct visual groups.

## Anatomy & DOM Structure
```html
<hr class="separator shrink-0 bg-border h-[1px] w-full border-none my-4" role="separator" />
```

## Variants & Modifiers
Horizontal (default), vertical (w-[1px] h-full).

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | role="separator" | Content division |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<hr class="separator shrink-0 bg-border h-[1px] w-full border-none my-4" role="separator" />
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Thick default <hr> with inset shadows and border margins -->
<hr class="border-t-2 border-gray-400" />
```
