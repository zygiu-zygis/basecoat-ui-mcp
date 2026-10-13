---
name: block-patterns/metrics
description: STRICT RULES for KPIs, metric cards, and data summaries. Deviation from these structural and styling standards is forbidden.
---

# METRIC CARDS & STATS

## GUARDRAILS
* **Layout & Clear Spacing:** Strictly avoid heavy, high-contrast backgrounds; use subtle surface or base colors. You MUST enforce **clean, deliberate spacing** (using at least `gap-2.5` or equivalent margins) between the title, core value, sub-text, and labels to maintain an uncluttered interface. Cluttering cards with verbose paragraphs is FORBIDDEN. Format large numbers concisely (e.g., `1.2M`, `45K`) to prevent container overflow.
* **HTML Elements:** Using `<span>` tags for text is FORBIDDEN. You MUST universally use `<p>` tags for all text elements within metrics cards.
* **Strict Typography Hierarchy:**
  * **Title (Label):** MUST use `<p class="font-medium">` at a standard, readable text size.
  * **Value (Core Number):** MUST be the visually dominant element, strictly utilizing `<p class="text-3xl font-semibold">` or `text-4xl font-semibold`.
  * **Context/Sub-text:** MUST use muted, smaller utilities (e.g., `<p class="text-xs text-base-content/60">`) for secondary context like "vs last month".
* **Trends & Deltas:** Using mathematical signs (`+` or `-`) is FORBIDDEN. You MUST use explicit directional arrows paired directly with strict semantic colors (`text-success` for positive, `text-error` for negative, `text-warning` for neutral). Always include `sr-only` text for accessibility using a paragraph tag instead of a span (e.g., `<p class="sr-only">Increased by</p>`).
* **Icons & Sparklines:** Keep icons simple and modern; they do not need to look colorful. Center them inside neutral background wrappers (e.g., `size-12 rounded-full bg-base-200`) to maintain a clean aesthetic. If using sparklines, strictly constrain their height (e.g., `h-8` or `h-10`) and position them at the absolute bottom of the card or as a background layer.
