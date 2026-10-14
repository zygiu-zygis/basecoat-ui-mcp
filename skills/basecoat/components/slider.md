---
name: slider
description: Basecoat UI Slider component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Slider (`slider`)

## Overview & Intent
Range slider input for adjusting numeric values along a continuous scale.

## Anatomy & DOM Structure
```html
<div class="slider flex items-center gap-3">
  <input type="range" min="0" max="100" value="50" class="slider-input w-full accent-primary" aria-label="Volume" />
  <span class="text-sm tabular-nums text-muted-foreground">50%</span>
</div>
```

## Variants & Modifiers
Single value slider, range slider with minimum and maximum thumbs.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | value changed | Input change event |

## `data-icon` Placement
Volume / brightness icon prefix.

## Correct HTML Example
```html
<div class="slider flex items-center gap-3">
  <input type="range" min="0" max="100" value="70" class="w-full accent-primary" aria-label="Percentage" />
  <span class="text-sm tabular-nums">70%</span>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Slider missing aria-label or tabular number display -->
<input type="range" />
```
