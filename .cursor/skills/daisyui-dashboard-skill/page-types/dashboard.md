---
name: page-types/dashboard
description: STRICT RULES for dashboard macro-layouts, grid composition, spatial constraints, and multi-dashboard variance. Deviation from these rules is forbidden.
---

# Dashboard Layout

## GUARDRAILS
* **App Shell & Global Consistency:** The root layout MUST explicitly use `h-screen w-full overflow-hidden` (using standard Flexbox or a DaisyUI drawer). The Topbar, Sidebar, and Footer MUST remain consistent and structurally identical across all pages. The main Application Canvas must scroll independently; the sidebar must NEVER scroll.
* **Main Canvas Structure & Footer:** The main content wrapper MUST use `flex-1 overflow-y-auto` (often combined with `flex flex-col` to push the footer down) and a low-contrast background (e.g., `bg-base-100` or `bg-base-200/30`) to make widget cards visually pop. Page headers and actions belong here, NEVER in the global Topbar. A **really minimal footer** must be placed inside, at the very bottom of this scrollable content area.
* **Strict Header Alignment:** The Sidebar's top-level brand/title container MUST perfectly match the global Topbar's height (e.g., both `h-16`). Their bottom horizontal borders/dividers must seamlessly align across the viewport.
* **Responsive Grids & Sizing Constraints:** Use responsive CSS Grid (`grid-cols-1 md:grid-cols-2 xl:grid-cols-4`, aggressively stacking on mobile). **Never use full-screen-width blocks on desktop.** Always place at least two components side-by-side. To prioritize content, use asymmetrical column spans (e.g., `col-span-2` alongside a `col-span-1`) rather than a single full-width block.
* **Content Density:** When enforcing uniform row heights (`h-full`) for side-by-side blocks, balance their visual weight. Do not leave awkward, empty vertical spaces in shorter blocks—fill them with relevant content or adjust internal spacing to minimize voids.

## MULTI-DASHBOARD VARIANCE
* **FORBIDDEN:** Duplicating identical widget compositions, layouts, or chart pairings across multiple dashboards in the same application.
* **INSTEAD:** If an application contains multiple dashboards, each MUST be visually and structurally distinct from the others.
  * **Chart Variety:** If Dashboard A uses a specific set of charts (e.g., two bar charts), Dashboard B MUST utilize entirely different chart types (e.g., a pie chart, radar chart, or scatter plot) to ensure visual differentiation.
  * **Layout Differentiation:** Vary the grid allocations, metric card styles, and supplementary widgets (tables, feeds, timelines) from page to page to prevent UI repetition.
