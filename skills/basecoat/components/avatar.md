---
name: avatar
description: Basecoat UI Avatar component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Avatar (`avatar`)

## Overview & Intent
Visual representation of a user or organization with automatic accessible fallback initials.

## Anatomy & DOM Structure
```html
<span class="avatar size-10 rounded-full" data-state="loaded">
  <img src="/avatar.jpg" alt="Jane Doe" class="size-full rounded-full object-cover" />
  <span class="avatar-fallback flex size-full items-center justify-center bg-muted text-sm font-medium">JD</span>
</span>
```

## Variants & Modifiers
size-8 (sm), size-10 (md), size-14 (lg), rounded-full vs rounded-md.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| loaded | data-state="loaded" | Image successfully loaded |
| fallback | data-state="fallback" | Image fails or is omitted |

## `data-icon` Placement
data-icon="inline-start" if placing icon in fallback.

## Correct HTML Example
```html
<span class="avatar size-10 rounded-full" data-state="fallback">
  <span class="avatar-fallback flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">JD</span>
</span>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Bare img tag without fallback container or alt attribute -->
<img src="/avatar.jpg" class="rounded-full w-10 h-10" />
```
