---
name: audit/checklist
description: Pre-flight checklist. Must pass all constraints before delivering UI code.
---

# Quality Gate

Check the following constraints before delivering UI code. All these constraints are absolutely strict.

## GUARDRAILS
* **FOUNDATION:** `foundation/SKILL.md` is the superior and strict rule for every UI line.
* **INITIALIZATION:** `font-family` (e.g., `font-sans`) is explicitly defined on the root `<body>` or top-most wrapper.
* **LAYOUT:** Tables and charts are wrapped in `overflow-x-auto`.
* **SPACING:** Padding, margins, and gaps strictly use the Tailwind 2px, 4px, 6px, 8px... scale (NO arbitrary values like `p-[15px]`).
* **NESTED PADDING:** Reduce or remove parent container padding if a child component (e.g., `menu`) has internal padding.
* **Z-INDEX:** Absolutely positioned elements (especially icons) have an explicit `z-index`.
* **NAVIGATION:** Menu hover states span the full container width. Sidebar toggles have a smooth transition. Sidebar labels are tightly spaced (no excessive top margin).
* **DIVIDERS:** `<div class="divider">` elements have balanced vertical spacing. Use negative horizontal margins (e.g., `-mx-4`) inside padded containers for full width.
* **COMPONENTS:** `.btn-outline` elements explicitly include `border-base-300`.
* **FORMS:** Inputs are wrapped in DaisyUI `form-control` with an explicit `<label>`.
* **COLORS:** Strictly use DaisyUI semantic tokens (NO hardcoded hex codes).
* **ACCESSIBILITY:** Icon-only buttons have `aria-label` or `sr-only` text.
