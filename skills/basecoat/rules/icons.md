# Basecoat UI Icon Placement & Rules

## 1. `data-icon` Placement Attributes
- Use `data-icon="inline-start"` for icons placed before text or label content.
- Use `data-icon="inline-end"` for icons placed after text or label content (e.g. chevrons, external link icons).

## 2. Zero Sizing Classes on `data-icon` SVGs
Basecoat CSS automatically handles icon sizing and alignment when the `data-icon` attribute is present.
- **Forbidden**: `<svg data-icon="inline-start" class="size-4 w-4 h-4 mr-2 ...">`
- **Required**: `<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">...</svg>`

## 3. Accessibility (`aria-hidden="true"`)
- Decorative icons placed beside visible text labels MUST have `aria-hidden="true"`.
- Standalone icon buttons without visible text MUST declare an `aria-label` on the parent `<button>`:
```html
<button type="button" class="btn size-8" data-variant="ghost" data-size="icon" aria-label="Settings">
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
  </svg>
</button>
```
