---
name: alert
description: Basecoat UI Alert component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Alert (`alert`)

## Overview & Intent
Prominent banner message communicating system status, warnings, or errors without blocking user navigation.

## Anatomy & DOM Structure
```html
<div role="alert" class="alert flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm" data-variant="default">
  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
  <div class="flex flex-col gap-1">
    <h5 class="text-sm font-semibold leading-none tracking-tight">Notice</h5>
    <p class="text-xs text-muted-foreground">Status description.</p>
  </div>
</div>
```

## Variants & Modifiers
data-variant="default | destructive | warning | info"

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | data-variant="default" | Standard informative message |
| destructive | data-variant="destructive" border-destructive/50 text-destructive | Critical error notice |
| dismissed | hidden or removed from DOM | User dismiss action |

## `data-icon` Placement
data-icon="inline-start" on alert icon. Zero manual sizing classes on SVG.

## Correct HTML Example
```html
<div role="alert" class="alert flex items-start gap-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive shadow-sm" data-variant="destructive">
  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
  <div class="flex flex-col gap-1">
    <h5 class="text-sm font-semibold leading-none tracking-tight">Payment Failed</h5>
    <p class="text-xs text-destructive/80">Please update your payment method to avoid suspension.</p>
  </div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Raw hardcoded red hex codes and missing role="alert" -->
<div class="bg-red-500 text-white p-4 rounded">
  <span>Error message</span>
</div>
```
