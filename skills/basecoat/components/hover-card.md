---
name: hover-card
description: Basecoat UI Hover Card component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Hover Card (`hover-card`)

## Overview & Intent
Contextual preview popup displayed when hovering or focusing an interactive anchor.

## Anatomy & DOM Structure
```html
<div class="hover-card relative inline-block" data-state="closed">
  <a href="/user/zygis" class="hover-card-trigger underline font-medium">@zygis</a>
  <div class="popover absolute bottom-full mb-2 w-72 rounded-md bg-popover p-4 text-popover-foreground shadow-md border border-border text-sm" hidden>
    <p class="font-semibold">Žygimantas Jasiulionis</p>
    <p class="text-xs text-muted-foreground">Chief AI Engineer</p>
  </div>
</div>
```

## Variants & Modifiers
Bottom preview card, top preview card.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | hidden | Default state |
| open | visible | Hover or focus entered |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="hover-card relative inline-block" data-state="closed">
  <a href="#" class="underline">View details</a>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Hover card inaccessible to keyboard focus (Tab) -->
<span onmouseover="show()">Hover me</span>
```
