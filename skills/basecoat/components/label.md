---
name: label
description: Basecoat UI Label component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Label (`label`)

## Overview & Intent
Accessible label bound to a form control via the for attribute.

## Anatomy & DOM Structure
```html
<label for="email" class="label text-sm font-medium leading-none">Email address</label>
```

## Variants & Modifiers
Standard label, required label with asterisk.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="label" | Form label |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<label for="user-email" class="label text-sm font-medium leading-none">Email</label>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Plain span tag acting as a label without for binding -->
<span class="font-bold">Email:</span>
```
