---
name: navigation-menu
description: Basecoat UI Navigation Menu component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Navigation Menu (`navigation-menu`)

## Overview & Intent
Top-level responsive website navigation with flyout submenus.

## Anatomy & DOM Structure
```html
<nav class="navigation-menu relative flex items-center" aria-label="Main">
  <ul class="flex items-center gap-1">
    <li><a href="/features" class="btn" data-variant="ghost">Features</a></li>
  </ul>
</nav>
```

## Variants & Modifiers
Top navigation, flyout nav menu.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | aria-label="Main" | Main nav |

## `data-icon` Placement
Chevron with data-icon="inline-end".

## Correct HTML Example
```html
<nav class="navigation-menu relative flex items-center" aria-label="Main navigation">
  <ul class="flex items-center gap-1">
    <li><a href="/" class="btn" data-variant="ghost">Home</a></li>
  </ul>
</nav>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Generic div links missing nav landmark or list markup -->
<div class="flex gap-4"><a href="/">Home</a></div>
```
