---
name: carousel
description: Basecoat UI Carousel component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Carousel (`carousel`)

## Overview & Intent
Horizontal slideshow container for cycling through sequential cards or media.

## Anatomy & DOM Structure
```html
<div class="carousel relative w-full overflow-hidden" role="region" aria-roledescription="carousel" aria-label="Highlights">
  <div class="carousel-items flex -ml-4">
    <div class="carousel-item min-w-0 shrink-0 grow-0 pl-4 basis-full md:basis-1/2">Slide 1</div>
  </div>
  <button type="button" class="btn size-8 rounded-full absolute left-2 top-1/2 -translate-y-1/2" aria-label="Previous slide">‹</button>
  <button type="button" class="btn size-8 rounded-full absolute right-2 top-1/2 -translate-y-1/2" aria-label="Next slide">›</button>
</div>
```

## Variants & Modifiers
Single slide, multi-item responsive carousel.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| active | carousel-item visible | Slide index match |
| inactive | carousel-item hidden/scrolled | Non-active slide |

## `data-icon` Placement
Arrow icons inside navigation buttons.

## Correct HTML Example
```html
<div class="carousel relative w-full overflow-hidden" role="region" aria-roledescription="carousel" aria-label="Product Showcase">
  <div class="carousel-items flex -ml-4">
    <div class="carousel-item min-w-0 shrink-0 grow-0 pl-4 basis-full">Slide 1</div>
  </div>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Carousel without role="region" or aria-roledescription="carousel" -->
<div class="overflow-x-scroll flex">
  <div>Slide 1</div>
</div>
```
