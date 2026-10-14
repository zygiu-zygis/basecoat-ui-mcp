---
name: empty
description: Basecoat UI Empty State component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Empty State (`empty`)

## Overview & Intent
Zero-data placeholder guiding users to create their first record or adjust filters.

## Anatomy & DOM Structure
```html
<div class="empty flex flex-col items-center justify-center gap-3 p-8 text-center rounded-xl border border-dashed border-border bg-muted/20">
  <div class="flex size-12 items-center justify-center rounded-full bg-muted">
    <svg data-icon="inline-start" class="text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>
  </div>
  <h4 class="text-base font-semibold">No records found</h4>
  <p class="text-sm text-muted-foreground max-w-sm">Get started by creating your first entry.</p>
  <button type="button" class="btn mt-2" data-variant="default">Create Entry</button>
</div>
```

## Variants & Modifiers
Compact empty box, full-page empty state.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | class="empty" | Zero items in dataset |

## `data-icon` Placement
Illustration or status icon inside centered circle.

## Correct HTML Example
```html
<div class="empty flex flex-col items-center justify-center gap-3 p-8 text-center rounded-xl border border-dashed border-border bg-muted/20">
  <h4 class="text-base font-semibold">No active projects</h4>
  <p class="text-sm text-muted-foreground">Create a project to start collaborating.</p>
  <button type="button" class="btn mt-2" data-variant="default">New Project</button>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Completely blank space without helpful message or call to action -->
<div class="p-4 text-center">Empty</div>
```
