---
name: textarea
description: Basecoat UI Textarea component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Textarea (`textarea`)

## Overview & Intent
Multi-line text input field styled with semantic tokens.

## Anatomy & DOM Structure
```html
<textarea class="textarea flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring" placeholder="Enter notes..."></textarea>
```

## Variants & Modifiers
Standard textarea, non-resizable textarea (resize-none).

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="textarea" | Idle state |
| disabled | disabled opacity-50 | Disabled state |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<textarea class="textarea flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring" placeholder="Write feedback..."></textarea>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Fixed non-responsive pixel widths and raw borders -->
<textarea class="w-[400px] border border-gray-400"></textarea>
```
