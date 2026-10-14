---
name: kbd
description: Basecoat UI Kbd component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Kbd (`kbd`)

## Overview & Intent
Monospace keyboard shortcut indicator.

## Anatomy & DOM Structure
```html
<kbd class="kbd inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>
```

## Variants & Modifiers
Standard kbd, compact inline kbd.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="kbd" | Static tag |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<kbd class="kbd inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">Ctrl+S</kbd>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Unstyled text or using emoji for modifier keys -->
<span>[CTRL+S]</span>
```
