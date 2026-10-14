---
name: tabs
description: Basecoat UI Tabs component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Tabs (`tabs`)

## Overview & Intent
Peer view switcher organizing related content into tabbed panels.

## Anatomy & DOM Structure
```html
<div class="tabs flex flex-col gap-4" data-state="active" data-fsm-recipe="tabs">
  <nav role="tablist" class="tabs-list inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground" aria-label="Views">
    <button type="button" role="tab" id="tab-1" aria-controls="panel-1" aria-selected="true" class="tabs-trigger inline-flex items-center rounded-md px-3 py-1 text-sm font-medium" data-state="active">Overview</button>
  </nav>
  <section role="tabpanel" id="panel-1" aria-labelledby="tab-1" class="tabs-content" data-state="active">Overview panel</section>
</div>
```

## Variants & Modifiers
Pill tabs (bg-muted), underline tabs (data-variant="line").

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| active | data-state="active" aria-selected="true" | Selected tab button & visible panel |
| inactive | data-state="inactive" aria-selected="false" hidden | Inactive tab & hidden panel |

## `data-icon` Placement
data-icon="inline-start" on tab triggers.

## Correct HTML Example
```html
<div class="tabs flex flex-col gap-4" data-state="active" data-fsm-recipe="tabs">
  <nav role="tablist" class="tabs-list inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground" aria-label="Settings">
    <button type="button" role="tab" id="t-gen" aria-controls="p-gen" aria-selected="true" class="tabs-trigger inline-flex items-center rounded-md px-3 py-1 text-sm font-medium" data-state="active">General</button>
  </nav>
  <section role="tabpanel" id="p-gen" aria-labelledby="t-gen" class="tabs-content" data-state="active">Content</section>
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Tabs missing role="tablist" or mismatched aria-controls IDs -->
<div class="flex gap-2"><span>Tab 1</span><span>Tab 2</span></div>
```
