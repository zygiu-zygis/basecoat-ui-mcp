---
name: block-patterns
description: Master router for Basecoat component-level block patterns (metrics, tables, forms, charts, navigation).
---

# Block Pattern Router: Basecoat UI

You are strictly bound to this master routing directive for all component-level block patterns, data presentations, and user input layouts. You must respect macro-layout boundaries, enforce pure Basecoat CSS + Tailwind CSS v4 utilities, and guarantee FSM `data-state` contracts.

## Zero-Tolerance Guardrails
- **FORBIDDEN:** Inventing arbitrary CSS classes, writing custom inline styles, or using any DaisyUI syntax. All blocks must use Basecoat CSS components (`.card`, `.btn`, `.input`, `.table`, `.dialog`, etc.) with standard Tailwind v4 utility classes.
- **FORBIDDEN:** Generating static, unresponsive interactive controls. Interactive elements must include their corresponding FSM state attributes (`data-state="closed"`, `data-state="loading"`, etc.) and ARIA attributes (`aria-expanded`, `aria-controls`).
- **CLASS ORDERING:** Strict deterministic class ordering must be applied to every element in every block pattern.

## Strict Routing Workflows
Before generating any UI component or block, read and strictly enforce the specific guideline file corresponding to the requested pattern:

- `metrics.md` *(KPI cards, metric summaries, trend indicators, delta badges, micro-charts)*
- `tables.md` *(Data grids, filter toolbars, bulk action bars, row dropdowns, pagination, sticky headers)*
- `forms.md` *(Field wrappers, label bindings, validation feedback states, FSM loading submit buttons)*
- `charts.md` *(CSS variable token mappings, zero-runtime SVG area charts, ApexCharts slots, responsive sizing)*
- `navigation.md` *(Collapsible sidebars, tooltip modes, app topbars, breadcrumb trails, matched header heights)*
