---
name: card
description: Basecoat UI Card component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Card (`card`)

## Overview & Intent
Content container with subtle 1px ring shadow and background surface token.

## Anatomy & DOM Structure
```html
<article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
  <header class="flex flex-col gap-1.5">
    <h3 class="text-lg font-semibold leading-none">Title</h3>
    <p class="text-sm text-muted-foreground">Description</p>
  </header>
  <div class="flex-1 text-sm">Content</div>
  <footer class="flex items-center justify-end gap-2">Actions</footer>
</article>
```

## Variants & Modifiers
Vega standard card, compact p-4 card, comfortable p-8 card.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | Basecoat .card | Static display |
| interactive | hover:bg-muted/50 cursor-pointer | Clickable card |

## `data-icon` Placement
size-5 in header or data-icon="inline-start".

## Correct HTML Example
```html
<article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
  <header class="flex items-center justify-between">
    <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>
    <span class="badge" data-variant="outline">+12.5%</span>
  </header>
  <div class="flex flex-col gap-1">
    <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>
    <p class="text-xs text-muted-foreground">+20.1% from last month</p>
  </div>
</article>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- FORBIDDEN: Adding border class to card creates ugly double border -->
<div class="card border border-border bg-white">
  <div class="p-6">Content</div>
</div>
```
