---
name: toggle
description: Basecoat UI Toggle component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Toggle (`toggle`)

## Overview & Intent
Two-state button that can be toggled on or off.

## Anatomy & DOM Structure
```html
<button type="button" class="btn" data-variant="outline" data-state="off" aria-pressed="false">
  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 12h12"/></svg>
  Mute
</button>
```

## Variants & Modifiers
Default outline toggle, ghost toggle.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| off | data-state="off" aria-pressed="false" | Inactive toggle |
| on | data-state="on" aria-pressed="true" bg-muted | Active pressed toggle |

## `data-icon` Placement
data-icon="inline-start".

## Correct HTML Example
```html
<button type="button" class="btn" data-variant="outline" data-state="on" aria-pressed="true">
  <span>Pin</span>
</button>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Missing aria-pressed or data-state="on|off" -->
<button class="border p-2">Toggle</button>
```
