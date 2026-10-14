---
name: input-otp
description: Basecoat UI Input OTP component reference, DOM anatomy, FSM states, and anti-patterns.
---

# Input OTP (`input-otp`)

## Overview & Intent
Segmented character cells for entering one-time passwords and verification codes.

## Anatomy & DOM Structure
```html
<div class="input-otp flex items-center gap-2" role="group" aria-label="One-time password">
  <input type="text" maxlength="1" class="input size-10 text-center text-lg font-semibold tabular-nums" />
  <input type="text" maxlength="1" class="input size-10 text-center text-lg font-semibold tabular-nums" />
  <input type="text" maxlength="1" class="input size-10 text-center text-lg font-semibold tabular-nums" />
</div>
```

## Variants & Modifiers
4-digit, 6-digit OTP clusters.

## FSM `data-*` / `aria-*` State Matrix
| State | Contract | Trigger |
|---|---|---|
| default | data-state="default" | Empty cell |
| active | data-state="active" | Current focused cell |

## `data-icon` Placement
None.

## Correct HTML Example
```html
<div class="input-otp flex items-center gap-2" role="group" aria-label="Verification code">
  <input type="text" maxlength="1" class="input size-10 text-center text-base font-semibold tabular-nums" />
  <input type="text" maxlength="1" class="input size-10 text-center text-base font-semibold tabular-nums" />
</div>
```

## Incorrect Anti-Pattern HTML Example
```html
<!-- Anti-Pattern: Single monolithic input without monospace or tabular alignment -->
<input type="text" placeholder="123456" />
```
