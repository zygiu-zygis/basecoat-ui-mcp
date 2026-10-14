---
name: badge
description: Basecoat UI Badge component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Badge (`badge`)

## Overview & Intent
Compact status tag or counter pill used to classify items or display numeric counts.

## Anatomy & DOM Structure
```html
<span class="badge" data-variant="secondary">Active</span>
```

## Variants & Modifiers
data-variant="default | secondary | outline | destructive"

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | data-variant="default" | Active primary badge |
| secondary | data-variant="secondary" | Subtle secondary badge |
| outline | data-variant="outline" | Bordered neutral badge |

## `data-icon` Placement
data-icon="inline-start" or data-icon="inline-end".

## Correct HTML Example
```html
<span class="badge" data-variant="outline">
  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>
  Verified
</span>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Custom div pill with arbitrary paddings and hardcoded hex colors -->
<div class="inline-block px-2 py-0.5 rounded-full bg-[#10b981] text-white text-xs">Active</div>
```
