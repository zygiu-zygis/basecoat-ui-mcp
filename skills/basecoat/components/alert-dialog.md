---
name: alert-dialog
description: Basecoat UI Alert Dialog component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Alert Dialog (`alert-dialog`)

## Overview & Intent
Modal confirmation overlay using native <dialog> that interrupts the user and requires explicit confirmation or cancellation.

## Anatomy & DOM Structure
```html
<dialog id="alert-dialog" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-lg border border-border backdrop:bg-black/50" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-desc">
  <div class="flex flex-col gap-4 max-w-md">
    <header class="flex flex-col gap-1.5">
      <h2 id="dialog-title" class="text-lg font-semibold">Are you absolutely sure?</h2>
      <p id="dialog-desc" class="text-sm text-muted-foreground">This action cannot be undone.</p>
    </header>
    <footer class="flex justify-end gap-2 pt-2">
      <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close('cancel')">Cancel</button>
      <button type="button" class="btn" data-variant="destructive" onclick="this.closest('dialog').close('confirm')">Continue</button>
    </footer>
  </div>
</dialog>
```

## Variants & Modifiers
Destructive confirmation, default primary confirmation.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| closed | data-state="closed" data-fsm-state="closed" | Initial state |
| open | data-state="open" data-fsm-state="open" | dialog.showModal() invoked |
| confirmed | close event with returnValue === 'confirm' | User clicks Confirm |

## `data-icon` Placement
data-icon="inline-start" on buttons if icons are used.

## Correct HTML Example
```html
<dialog id="delete-confirm" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-lg border border-border backdrop:bg-black/50 max-w-md w-full" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="del-title" aria-describedby="del-desc">
  <div class="flex flex-col gap-4">
    <h2 id="del-title" class="text-lg font-semibold">Delete repository?</h2>
    <p id="del-desc" class="text-sm text-muted-foreground">This will permanently delete the repository and all issues.</p>
    <div class="flex justify-end gap-2 pt-2">
      <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close()">Cancel</button>
      <button type="button" class="btn bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</button>
    </div>
  </div>
</dialog>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Div overlay with manual high z-index and missing accessible aria-labelledby -->
<div class="fixed inset-0 z-[9999] bg-black/50">
  <div class="p-6 bg-white">
    <h3>Heading</h3>
  </div>
</div>
```
