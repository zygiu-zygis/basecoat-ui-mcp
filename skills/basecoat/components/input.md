---
name: input
description: Basecoat UI Input component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Input (`input`)

## Overview & Intent
Single-line text input field styled with semantic border and focus ring tokens.

## Anatomy & DOM Structure
```html
<input type="text" class="input flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Enter text..." />
```

## Variants & Modifiers
text, email, password, search, number.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="input" | Default idle state |
| disabled | disabled opacity-50 cursor-not-allowed | Disabled input |

## `data-icon` Placement
Icons embedded via InputGroup.

## Correct HTML Example
```html
<input type="text" class="input flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Search..." />
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Hardcoded border colors and arbitrary heights -->
<input class="border border-gray-300 h-[42px] px-3 rounded" />
```
