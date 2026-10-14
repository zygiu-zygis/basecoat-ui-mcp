# Basecoat UI Styling Rules & Guardrails

## 1. Semantic Tokens Only (No Raw Colors)
- **Forbidden**: `bg-blue-500`, `text-[#09090b]`, `border-gray-200`, `bg-white`, `bg-black`.
- **Required**: `bg-primary`, `text-primary-foreground`, `bg-card`, `text-card-foreground`, `bg-background`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`.

## 2. No `space-x/y-*` (Use `flex gap-*`)
- **Forbidden**: `space-x-4`, `space-y-2` (causes margin-collapse bugs in nested flex/grid).
- **Required**: `flex items-center gap-4`, `flex flex-col gap-2`.

## 3. Use `size-*` for Symmetrical Elements
- **Forbidden**: `w-4 h-4`, `w-8 h-8`, `w-10 h-10`.
- **Required**: `size-4`, `size-8`, `size-10`.

## 4. No Manual `dark:` Utility Sprawl
- **Forbidden**: Writing `bg-white dark:bg-zinc-900 text-black dark:text-white` on every element.
- **Required**: Use semantic tokens: `bg-card text-card-foreground`. The token automatically changes in `.dark`.

## 5. No Manual `z-index` on Overlays
- **Forbidden**: Arbitrary high z-indices: `z-[9999]`, `z-50` on basic dropdowns.
- **Required**: Native `<dialog>` surfaces use the browser top-layer (`showModal()`), completely eliminating z-index stacking issues.

## 6. Never Add `border` to `.card`
- **Forbidden**: `<div class="card border border-border">` (creates a 2px double border).
- **Required**: `<article class="card">` (Basecoat CSS automatically includes a 1px ring and shadow).
