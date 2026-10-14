---
name: pagination
description: Basecoat UI Pagination component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Pagination (`pagination`)

## Overview & Intent
Multi-page navigation controls with previous, numbered page buttons, ellipsis, and next.

## Anatomy & DOM Structure
```html
<nav role="navigation" aria-label="Pagination" class="pagination flex items-center justify-center gap-1">
  <button type="button" class="btn h-9 px-3 text-sm" data-variant="outline" aria-label="Previous page">Previous</button>
  <button type="button" class="btn size-9 text-sm" data-variant="outline" aria-current="page">1</button>
  <button type="button" class="btn size-9 text-sm" data-variant="ghost">2</button>
  <button type="button" class="btn h-9 px-3 text-sm" data-variant="outline" aria-label="Next page">Next</button>
</nav>
```

## Variants & Modifiers
Numbered pagination, compact previous/next pagination.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| current | aria-current="page" | Active page |
| default | data-variant="ghost" | Inactive page |

## `data-icon` Placement
Chevron arrows with data-icon="inline-start" / data-icon="inline-end".

## Correct HTML Example
```html
<nav role="navigation" aria-label="Pagination" class="pagination flex items-center gap-1">
  <button type="button" class="btn size-9" data-variant="outline" aria-current="page">1</button>
  <button type="button" class="btn size-9" data-variant="ghost">2</button>
</nav>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Links without aria-current="page" on active page -->
<div class="flex gap-2"><span>1</span><a href="#">2</a></div>
```
