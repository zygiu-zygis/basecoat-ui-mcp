---
name: aspect-ratio
description: Basecoat UI Aspect Ratio component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Aspect Ratio (`aspect-ratio`)

## Overview & Intent
Responsive media container that maintains a fixed width-to-height ratio across all viewport sizes.

## Anatomy & DOM Structure
```html
<div class="aspect-video w-full overflow-hidden rounded-xl bg-muted">
  <img class="size-full object-cover" src="/preview.jpg" alt="Preview" />
</div>
```

## Variants & Modifiers
aspect-video (16:9), aspect-square (1:1), aspect-[4/3].

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="aspect-video" | Static layout |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="aspect-video w-full overflow-hidden rounded-xl bg-muted">
  <img class="size-full object-cover" src="/dashboard-preview.png" alt="Dashboard preview" />
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Hardcoded arbitrary pixel heights causing responsive distortion -->
<div class="w-full h-[320px]">
  <img src="/preview.png" />
</div>
```
