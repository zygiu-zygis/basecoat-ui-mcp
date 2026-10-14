---
name: collapsible
description: Basecoat UI Collapsible component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Collapsible (`collapsible`)

## Overview & Intent
Interactive disclosure section using native semantic HTML5 <details>.

## Anatomy & DOM Structure
```html
<details class="collapsible" data-state="closed">
  <summary class="collapsible-trigger flex items-center justify-between cursor-pointer py-2 text-sm font-medium">
    <span>Toggle details</span>
  </summary>
  <div class="collapsible-content pt-2 text-sm text-muted-foreground">Hidden content</div>
</details>
```

## Variants & Modifiers
Default collapsible, card collapsible.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" | Initial state |
| open | data-state="open" open attribute | Summary clicked |

## `data-icon` Placement
Chevron with data-icon="inline-end".

## Correct HTML Example
```html
<details class="collapsible py-2" data-state="closed">
  <summary class="flex cursor-pointer items-center justify-between text-sm font-medium">
    <span>Advanced Options</span>
  </summary>
  <div class="pt-2 text-xs text-muted-foreground">Additional fields.</div>
</details>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: JavaScript-dependent div without native summary fallback -->
<div class="cursor-pointer" onclick="toggle()">Show More</div>
<div style="display:none">Content</div>
```
