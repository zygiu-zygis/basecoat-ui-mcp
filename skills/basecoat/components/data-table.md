---
name: data-table
description: Basecoat UI Data Table component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Data Table (`data-table`)

## Overview & Intent
Dense records table with sticky header, sorting, and tabular numerals.

## Anatomy & DOM Structure
```html
<div class="overflow-x-auto rounded-md border border-border">
  <table class="table w-full text-sm">
    <thead class="sticky top-0 bg-background/90 backdrop-blur">
      <tr class="border-b border-border text-xs font-medium text-muted-foreground">
        <th class="h-10 px-4 py-2 text-left">Invoice</th>
        <th class="h-10 px-4 py-2 text-right">Amount</th>
      </tr>
    </thead>
    <tbody>
      <tr class="border-b border-border/50 hover:bg-muted/50 transition-colors">
        <td class="px-4 py-3 font-medium">INV-001</td>
        <td class="px-4 py-3 text-right tabular-nums font-semibold">$250.00</td>
      </tr>
    </tbody>
  </table>
</div>
```

## Variants & Modifiers
Bordered table, compact table (px-2 py-1.5), striped table.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | Basecoat .table | Normal rows |
| selected | tr class="bg-muted/60" aria-selected="true" | Row selected |
| empty | tbody with single cell | Zero records matched |

## `data-icon` Placement
Sort icons inside th use data-icon="inline-end".

## Correct HTML Example
```html
<div class="overflow-x-auto rounded-md border border-border">
  <table class="table w-full text-sm">
    <thead><tr class="border-b border-border text-xs font-medium text-muted-foreground"><th class="h-10 px-4 text-left">ID</th></tr></thead>
    <tbody><tr class="border-b border-border/50"><td class="px-4 py-3 font-medium">#1024</td></tr></tbody>
  </table>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Wrapping each row in a separate card or omitting tabular numbers -->
<div class="space-y-2">
  <div class="card p-4">Row 1: $100.00</div>
</div>
```
