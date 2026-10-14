---
name: dialog
description: Basecoat UI Dialog component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Dialog (`dialog`)

## Overview & Intent
Native HTML5 modal overlay with backdrop blur and escape dismissal.

## Anatomy & DOM Structure
```html
<dialog id="modal-1" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-xl border border-border backdrop:bg-black/50" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="dlg-title">
  <header class="mb-4">
    <h2 id="dlg-title" class="text-lg font-semibold">Dialog Title</h2>
  </header>
  <div class="mb-6 text-sm">Dialog body content.</div>
  <footer class="flex justify-end gap-2">
    <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close()">Close</button>
  </footer>
</dialog>
```

## Variants & Modifiers
Standard modal, max-w-2xl wide modal, fullscreen modal.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" data-fsm-state="closed" | Initial state |
| open | data-state="open" data-fsm-state="open" | dialog.showModal() called |

## `data-icon` Placement
data-icon on action buttons.

## Correct HTML Example
```html
<dialog id="terms-dlg" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-xl border border-border backdrop:bg-black/50 max-w-md w-full" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="t-title">
  <h2 id="t-title" class="text-lg font-semibold mb-2">Terms</h2>
  <p class="text-sm text-muted-foreground mb-4">Please read carefully.</p>
  <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close()">Close</button>
</dialog>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Fixed div overlay competing with z-index instead of <dialog> -->
<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
  <div class="bg-white p-6">Modal</div>
</div>
```
