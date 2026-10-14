# Basecoat Dashboard Quality Inspection Checklist

## 1. Syntax & Forbidden Class Audit
- [ ] ZERO DaisyUI classes (`daisyui`, `card-body`, `btn-primary`, `form-control`, `table-pin-rows`).
- [ ] ZERO deprecated Tailwind v3 utilities (`bg-opacity-*`, `flex-shrink-*`, `overflow-ellipsis`).
- [ ] ZERO `border` or `border-border` on `.card` elements.

## 2. FSM & Accessibility Audit
- [ ] Explicit `data-state` declared on interactive controls.
- [ ] Dialogs have `<dialog>` + `aria-labelledby` linking to visible title.
- [ ] Tabs have `[role="tablist"]`, `[role="tab"]`, and `[role="tabpanel"]`.

## 3. Typography & Spacing Audit
- [ ] All numeric metrics use `tabular-nums`.
- [ ] Headers adhere to `h-12` or `h-14` proportions.
- [ ] Card spacing follows 4px/8px optical rhythm.
