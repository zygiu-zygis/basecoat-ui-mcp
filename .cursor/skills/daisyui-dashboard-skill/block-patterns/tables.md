---
name: block-patterns/tables
description: Rules for high-density data visualization, responsive tabular layouts, and interaction states.
---

# Data Grids & Tables

## Guardrails
* **Tables:** Wrap all `<table>` elements in `overflow-x-auto`. Use `tabular-nums text-right` for numbers. Build actionable empty states with an icon, message, and CTA spanning `colspan="100%"`.
* **Data Population:** For full-page tables, always generate at least 10 mock records to ensure a realistic display of content and layout.
* **Metrics:** Strictly 3 tiers: Title (`font-medium`), Value (`text-3xl font-semibold tabular-nums`), Context (`text-xs muted`). Use explicit directional icons (up/down arrows), not math signs (+/-). Format large numbers (`1.2M`).
* **Pinning:** Use `table-pin-rows` for headers in long-scrolling data.
* **Numbers:** Align right (`text-right`) using `tabular-nums` for vertical alignment.
* **Hover:** Interactive rows require distinct hover states (e.g., `bg-base-200`).
* **Loading:** Replace active rows with `skeleton` loaders to maintain footprint.
* **Pagination:** Use normal size of buttons for pagination (Never do `btn-xs`, `btn-sm`, or `btn-lg`).
