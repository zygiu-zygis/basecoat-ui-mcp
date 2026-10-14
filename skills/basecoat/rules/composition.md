# Basecoat UI Composition Rules

## 1. Group Wrapping
Always wrap grouped controls inside semantic group wrappers:
- `SelectGroup` for option clusters with `<div class="select-group">`.
- `DropdownMenuGroup` with `<div class="dropdown-menu-group" role="group">`.
- `CommandGroup` with `<div class="command-group">`.

## 2. Primitives Over Custom Divs
Do NOT invent custom div structures for common feedback or layout idioms:
- Use `<div role="alert" class="alert">` instead of custom notice divs.
- Use `<div class="empty">` for zero-data states.
- Use `<hr class="separator" />` instead of custom bordered divider divs.
- Use `<div class="skeleton">` instead of raw gray loading boxes.
- Use `<span class="badge">` instead of custom rounded pill tags.

## 3. Required Modal Titles
Every modal dialog, sheet, or drawer MUST include an accessible title:
- `DialogTitle` with `<h2 id="dialog-title" class="text-lg font-semibold">` linked via `aria-labelledby="dialog-title"`.
- `SheetTitle` and `DrawerTitle` following the same pattern.

## 4. Button Loading State
When a button is loading, pair `data-state="loading"` and `disabled` with an inline spinner:
```html
<button type="submit" class="btn" data-variant="default" data-state="loading" disabled>
  <span class="spinner" data-icon="inline-start" aria-hidden="true"></span>
  Saving...
</button>
```

## 5. Avatar Fallback
Always provide an accessible fallback inside `<span class="avatar">`:
```html
<span class="avatar size-10 rounded-full" data-state="fallback">
  <span class="avatar-fallback flex size-full items-center justify-center bg-muted text-sm font-medium">JD</span>
</span>
```

## 6. TabsTrigger Inside TabsList
Always place `[role="tab"]` triggers directly inside a `[role="tablist"]` container.
