---
name: resizable
description: Basecoat UI Resizable component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Resizable (`resizable`)

## Overview & Intent
Multi-pane container with draggable divider separator handles.

## Anatomy & DOM Structure
```html
<div class="resizable flex h-80 w-full rounded-xl border border-border overflow-hidden">
  <div class="panel flex-1 p-4">Panel 1</div>
  <div class="resize-handle w-px bg-border hover:bg-primary cursor-col-resize" role="separator"></div>
  <div class="panel flex-1 p-4">Panel 2</div>
</div>
```

## Variants & Modifiers
Horizontal split, vertical split.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | role="separator" | Split layout |

## `data-icon` Placement
Grip icon in handle.

## Correct HTML Example
```html
<div class="resizable flex h-64 w-full border border-border rounded-lg">
  <div class="panel flex-1 p-4">Tree</div>
  <div class="resize-handle w-px bg-border" role="separator"></div>
  <div class="panel flex-2 p-4">Editor</div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Fixed widths with overflow clipped without resize handles -->
<div class="flex"><div class="w-64">Panel 1</div><div class="w-64">Panel 2</div></div>
```
