# Basecoat UI Form Hierarchy & Validation Rules

## 1. Hierarchy: FieldGroup -> Field -> FieldLabel
Structure all forms using the explicit hierarchy:
```html
<div class="field-group flex flex-col gap-4">
  <div role="group" class="field flex flex-col gap-2" data-invalid="false">
    <label for="email" class="label text-sm font-medium">Email Address</label>
    <input id="email" type="email" class="input" aria-invalid="false" aria-describedby="email-desc" />
    <p id="email-desc" class="text-xs text-muted-foreground">We will never share your email.</p>
  </div>
</div>
```

## 2. InputGroup + InputGroupAddon
For compound input fields with prefixes, suffixes, or embedded action buttons:
```html
<div class="input-group flex items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">
  <span class="input-group-addon px-3 text-sm text-muted-foreground">https://</span>
  <input type="text" class="input-group-field flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="domain.com" />
</div>
```

## 3. ToggleGroup for 2-7 Choices
When offering 2 to 7 mutually exclusive options, prefer a `ToggleGroup` or `SegmentedToggle` over a dropdown:
```html
<div class="segmented-toggle inline-flex rounded-md border border-border p-1" role="radiogroup">
  <button type="button" class="btn" data-variant="ghost" data-state="active" aria-checked="true">Monthly</button>
  <button type="button" class="btn" data-variant="ghost" data-state="default" aria-checked="false">Annual</button>
</div>
```

## 4. FieldSet + FieldLegend
Group related sets of checkboxes or radio inputs inside a semantic `<fieldset>` with a `<legend>`:
```html
<fieldset class="fieldset flex flex-col gap-3">
  <legend class="legend text-sm font-semibold">Notification Channels</legend>
  <div class="flex items-center gap-2">
    <input type="checkbox" id="email-notif" class="checkbox" />
    <label for="email-notif" class="label text-sm">Email</label>
  </div>
</fieldset>
```

## 5. Dual Validation States
When displaying validation errors, apply BOTH state indicators:
1. `data-invalid="true"` on the enclosing `.field` container.
2. `aria-invalid="true"` on the input control.
3. Link the error message with `aria-describedby="field-id-error"`.
```html
<div role="group" class="field flex flex-col gap-2" data-invalid="true">
  <label for="username" class="label text-sm font-medium">Username</label>
  <input id="username" class="input" aria-invalid="true" aria-describedby="username-error" />
  <p id="username-error" class="text-xs font-medium text-destructive">Username is already taken.</p>
</div>
```
