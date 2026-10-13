---
name: page-types/reading-views
description: Strict macro-layout and structural rules for documentation, articles, and text-heavy views.
---

# Reading View Layout Rules

## Guardrails
* **Reading:** NEVER stretch text. MUST use `max-w-prose` or `max-w-3xl` with `mx-auto`. Use horizontal padding (`px-4 sm:px-8`).
* **SINGLE-COLUMN (Standalone):** Perfectly centered single text container (e.g., articles, policies).
* **MULTI-COLUMN (App/Docs):** 3-pane layout for complex reading.
  * *Left Sidebar (Navigation):* Fixed width (e.g., `w-64`), hidden on mobile/tablet (`hidden lg:block`).
  * *Center (Reading Area):* Flexible (`flex-1`), centered container.
  * *Right Sidebar (TOC):* Fixed width (e.g., `w-48` or `w-64`), hidden on mobile/tablet (`hidden xl:block`).
* **Sticky Elements:** Multi-column sidebars MUST use `sticky top-0` (account for headers via top margin) and `max-h-screen overflow-y-auto`.
* **Breadcrumbs:** Place at absolute top-left of center container; keep visually distinct from body copy.
