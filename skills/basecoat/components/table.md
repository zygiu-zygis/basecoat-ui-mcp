---
name: table
description: Basecoat UI Table component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Table (`table`)

## Overview & Intent
Tabular data grid for rendering comparable rows and columns.

## Anatomy & DOM Structure
```html
<div class="table-container overflow-x-auto rounded-md border border-border">
  <table class="table w-full text-sm">
    <thead><tr class="border-b border-border bg-muted/40"><th class="h-10 px-4 text-left font-medium">Name</th></tr></thead>
    <tbody><tr class="border-b border-border/50"><td class="px-4 py-3">Item 1</td></tr></tbody>
  </table>
</div>
```

## Variants & Modifiers
Bordered table, striped table, compact table.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | Basecoat .table | Normal rows |
| hover | hover:bg-muted/50 | Row hover |

## `data-icon` Placement
Sort icons in th with data-icon="inline-end".

## Correct HTML Example
```html
<div class="table-container overflow-x-auto rounded-md border border-border">
  <table class="table w-full text-sm">
    <thead><tr class="border-b border-border text-xs font-medium text-muted-foreground"><th class="h-10 px-4 text-left">User</th></tr></thead>
    <tbody><tr class="border-b border-border/50"><td class="px-4 py-3 font-medium">Alex</td></tr></tbody>
  </table>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Unwrapped table overflowing viewport without horizontal scroll container -->
<table class="w-full"><tr><td>Item</td></tr></table>
```
