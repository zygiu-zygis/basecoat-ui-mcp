---
name: accordion
description: Basecoat UI Accordion component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Accordion (`accordion`)

## Overview & Intent
Vertically stacked list of interactive disclosure headings built with native <details> and <summary>.

## Anatomy & DOM Structure
```html
<section class="accordion flex flex-col divide-y divide-border" data-state="closed">
  <details class="accordion-item group py-3" data-state="closed">
    <summary class="accordion-trigger flex cursor-pointer list-none items-center justify-between text-sm font-medium hover:underline">
      <span>Section Title</span>
      <svg data-icon="inline-end" class="transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="accordion-content pt-2 text-sm text-muted-foreground">
      Section content.
    </div>
  </details>
</section>
```

## Variants & Modifiers
Line-divided accordion, bordered card accordion.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" | Initial state without open attribute |
| open | data-state="open" open attribute | User clicks summary header |
| disabled | data-state="disabled" opacity-50 pointer-events-none | Disabled item |

## `data-icon` Placement
data-icon="inline-end" on chevron icon inside summary. Zero manual sizing classes on SVG.

## Correct HTML Example
```html
<section class="accordion flex flex-col divide-y divide-border">
  <details class="accordion-item group py-3" data-state="closed">
    <summary class="accordion-trigger flex cursor-pointer list-none items-center justify-between text-sm font-medium hover:underline">
      <span>Can I use Basecoat without React?</span>
      <svg data-icon="inline-end" class="transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
    </summary>
    <div class="accordion-content pt-2 text-sm text-muted-foreground">
      Yes, Basecoat UI is purely semantic HTML and Tailwind CSS v4.
    </div>
  </details>
</section>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Non-semantic div soup with hardcoded colors and missing summary semantics -->
<div class="border border-gray-200 bg-white p-4">
  <div class="text-blue-600 font-bold">Heading</div>
</div>
```
