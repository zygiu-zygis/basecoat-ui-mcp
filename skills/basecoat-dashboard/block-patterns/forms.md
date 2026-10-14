---
name: block-patterns/forms
description: Strict rules for Basecoat form controls, field wrappers, semantic validation, and FSM loading buttons.
---

# Form Controls & Inputs

## Guardrails

* **No Naked Inputs**: Inputs, selects, and textareas must never appear without a complete field wrapper (`div.flex.flex-col.gap-1.5` or `div.space-y-2`).
* **Explicit Label Binding**: Every `<label>` MUST include an explicit `for` attribute strictly matching the `id` of its corresponding input element:
  ```html
  <label for="user-email" class="text-sm font-medium text-foreground">Email Address</label>
  <input id="user-email" type="email" class="input w-full text-sm" />
  ```
* **Unified Field Aesthetics**: All form controls (inputs, selects, textareas) MUST share identical visual geometry:
  * Border radius: `rounded-md`
  * Sizing: standard height `h-9` or `h-10` (textareas use min height `min-h-[80px]`)
  * Padding: horizontal `px-3`, vertical `py-1` to `py-2`
  * Typography: `text-sm text-foreground placeholder:text-muted-foreground`
  * Borders & Rings: `border border-input bg-background ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1`
* **Semantic Validation States**:
  * **Default State**: `data-state="default"`
  * **Error State**: Add `aria-invalid="true"`, `data-state="error"`, and `border-destructive focus-visible:ring-destructive` to the input element.
  * **Error Feedback Text**: Immediately beneath the invalid field, render an actionable error message using `<p class="text-xs text-destructive" id="[id]-error" role="alert">`. Connect it via `aria-describedby="[id]-error"`.
  * **Success State**: Optional `data-state="valid"` with `border-emerald-500`.
* **FSM Submit Button & Loading State**:
  * Submit buttons must reflect their interactive state via the `data-state` attribute:
    * Default: `<button type="submit" class="btn btn-primary" data-state="default">`
    * Loading: `<button type="submit" class="btn btn-primary" data-state="loading" disabled>`
  * In the loading state, show an animated SVG spinner (`animate-spin size-4`) while disabling user interaction to prevent duplicate submissions.
* **Inline Input Icons**:
  * Icons embedded inside inputs must be centered vertically (`absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none`) with corresponding input padding (`pl-9`).

## Reference Basecoat Form Pattern

```html
<form class="flex flex-col gap-6 max-w-lg" novalidate>
  <!-- Standard Text Field -->
  <div class="flex flex-col gap-1.5">
    <label for="project-name" class="text-sm font-medium text-foreground">Project Name</label>
    <input
      id="project-name"
      name="projectName"
      type="text"
      class="input w-full text-sm"
      placeholder="e.g. Acme Redesign"
      data-state="default"
      required
    />
    <p class="text-xs text-muted-foreground">Give your project a descriptive name.</p>
  </div>

  <!-- Validated Field with Error State -->
  <div class="flex flex-col gap-1.5">
    <label for="billing-email" class="text-sm font-medium text-foreground">Billing Email</label>
    <div class="relative">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <rect width="20" height="16" x="2" y="4" rx="2" />
        <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
      </svg>
      <input
        id="billing-email"
        name="billingEmail"
        type="email"
        class="input w-full pl-9 text-sm border-destructive focus-visible:ring-destructive"
        value="invalid-email"
        aria-invalid="true"
        aria-describedby="billing-email-error"
        data-state="error"
      />
    </div>
    <p id="billing-email-error" class="text-xs text-destructive" role="alert">
      Please enter a valid business email address.
    </p>
  </div>

  <!-- Select Dropdown Field -->
  <div class="flex flex-col gap-1.5">
    <label for="workspace-tier" class="text-sm font-medium text-foreground">Workspace Tier</label>
    <select id="workspace-tier" name="workspaceTier" class="select w-full text-sm">
      <option value="starter">Starter — Up to 5 team members</option>
      <option value="pro" selected>Professional — Up to 25 team members</option>
      <option value="enterprise">Enterprise — Unlimited team members</option>
    </select>
  </div>

  <!-- Textarea Field -->
  <div class="flex flex-col gap-1.5">
    <label for="project-desc" class="text-sm font-medium text-foreground">Project Scope</label>
    <textarea id="project-desc" name="projectDesc" rows="3" class="textarea w-full text-sm" placeholder="Provide background on this initiative..."></textarea>
  </div>

  <!-- Form Actions with FSM Loading State -->
  <div class="flex items-center justify-end gap-3 pt-2">
    <button type="button" class="btn btn-ghost text-sm">Cancel</button>
    <button type="submit" class="btn btn-primary text-sm flex items-center gap-2" data-state="default">
      <!-- Loading spinner shown when data-state="loading" -->
      <svg class="hidden animate-spin size-4 text-current" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"></path>
      </svg>
      <span>Save Changes</span>
    </button>
  </div>
</form>
```
