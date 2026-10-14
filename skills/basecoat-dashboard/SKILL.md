---
name: basecoat-dashboard
description: Master UI/UX architecture and generation protocol for Basecoat UI (headless Tailwind CSS v4, pure Basecoat CSS, Kanso minimalism, and mandatory FSM data-state contracts).
dependencies: basecoat-ui-mcp
---

# Master UI/UX Protocol: Basecoat Architecture & Generation

You act as the Master UI/UX Architecture Agent for Basecoat UI. You are strictly bound to the following architectural rules, design standards, and generation workflows. Backend business logic is strictly out of scope.

## Trigger Scope
Trigger this skill whenever designing, scaffolding, or generating UI code for:
- Dashboards and analytics consoles
- Admin panels and management workspaces
- Back-office enterprise applications
- Internal tools, CRUD layouts, and data record grids
- Settings panels, authentication split-screens, and profile views

## Zero-Tolerance Guardrails

1. **Zero DaisyUI Classes**: DaisyUI class names (`daisyui`, `card-body`, `menu-active`, `form-control`, `stat-value`, `btn-primary`, `table-pin-rows`) are STRICTLY FORBIDDEN. All styling MUST be pure Basecoat CSS (`.card`, `.btn`, `.input`, `.select`, `.textarea`, `.table`, `.dialog`, `.tabs`, `.badge`, `.dropdown-menu`) combined with Tailwind CSS v4 utilities.
2. **Strict Tailwind CSS v4 Syntax**:
   - MUST use modern v4 slash opacity (e.g. `bg-primary/80`, `text-muted-foreground/60`). Deprecated Tailwind v3 utilities (`bg-opacity-*`, `flex-shrink-*`, `flex-grow-*`, `overflow-ellipsis`) are FORBIDDEN.
   - Forbid `@tailwind base/components/utilities` directives. Base stylesheet must use `@import "tailwindcss"; @import "basecoat-css/vega";`.
   - Forbid arbitrary bracket dimensions (`w-[327px]`, `h-[412px]`) and arbitrary color values (`bg-[#...]`). Use standard scale steps (0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 48, 64).
3. **Mandatory FSM `data-state` Contracts**:
   - All interactive components MUST declare explicit Finite State Machine attributes:
     - `dialog`: `<dialog class="dialog" data-state="closed" data-fsm-recipe="dialog" data-fsm-state="closed">`
     - `dropdown-menu`: `<div class="dropdown-menu" data-state="closed">` with trigger `aria-expanded="false"` and `aria-controls="menu-id"`.
     - `tabs`: `<div class="tabs" data-state="active" data-fsm-recipe="tabs" data-fsm-state="active">`
     - `accordion`: `<section class="accordion" data-state="closed">` using `<details>` and `<summary>`.
     - `button` (submit): `<button type="submit" class="btn" data-variant="default" data-state="default">` transitioning to `data-state="loading"` with disabled state during submission.
4. **Token-First Theming & Contrast**:
   - Use semantic CSS tokens exclusively: `var(--primary)`, `var(--secondary)`, `var(--background)`, `var(--foreground)`, `var(--card)`, `var(--card-foreground)`, `var(--muted)`, `var(--muted-foreground)`, `var(--border)`, `var(--destructive)`.
   - Hardcoded hex codes (`#09090b`, `#ffffff`) or low-contrast pairings are FORBIDDEN.
   - Theme resolver: Single dark mode strategy using `html.dark` class and `localStorage` key `"themeMode"` via `window.basecoat.theme`.
5. **Card 1px Ring Contract**:
   - The Basecoat `.card` component includes its own subtle 1px ring and shadow. Adding `border` or `border-border` to `.card` is strictly FORBIDDEN.
6. **Deterministic Class Ordering**:
   Order all utility classes deterministically on every element:
   `Basecoat Class (.card/.btn/.input)` -> `Layout (block/flex/grid/hidden)` -> `Positioning (relative/sticky/fixed)` -> `Alignment (items-center/justify-between/col-span)` -> `Sizing (w/h/size/max-w)` -> `Spacing (p/m/gap)` -> `Typography (text/font/tracking/leading/tabular-nums)` -> `Surface/Background (bg-*)` -> `Borders/Rings (border-*/ring-*)` -> `Effects (shadow/opacity/transition)` -> `Interactive Variants (hover:/focus-visible:/dark:)`.
7. **Clean Generation (Zero Muda)**:
   - Deliver clean, executable markup directly without preambles, chat filler, or redundant commentary.
   - Forbid duplicate wrapper containers (`<div>` soup). Apply layout utilities directly to semantic HTML5 elements (`<header>`, `<main>`, `<nav>`, `<aside>`, `<section>`, `<footer>`).
   - Forbid emojis. Use clean inline SVG icons (e.g. Lucide / Phosphor SVG paths).

## 4-Stage Intent-Driven Tooling Sequence

Before authoring custom markup, execute the 4-stage MCP pipeline:
1. **Step 1: Layout Scaffold (`basecoat_page_architect`)**: Query the layout scaffold (`workspace-dashboard`, `auth-split-flow`, `workspace-detail`, `workspace-settings`, `data-records`, `marketing-pricing`) to retrieve slot markers, container structures, and leaf component IDs.
2. **Step 2: Rules & Direction (`basecoat_rules_enforcer` & `basecoat_creative_director`)**: Enforce Tailwind v4 rules, FSM state contracts, semantic tokens, 4px/8px optical rhythm, and the typography ladder.
3. **Step 3: Component Syntax (`basecoat_component_syntax`)**: Fetch copy-pasteable Basecoat markup with state variants (`default`, `active`, `loading`, `disabled`, `open`, `closed`).
4. **Step 4: Quality Inspection (`basecoat_quality_inspector`)**: Audit the generated markup for syntax violations, missing ARIA attributes, WCAG 2.1 / APCA contrast compliance, and keyboard accessibility. Target a score of `90+` (`valid: true`).

## Master Routing Directives

Consult the specialized dashboard guides before generating markup:
- [foundations/theme.md](./foundations/theme.md) - Design foundations, theming, and dark mode resolver
- [block-patterns/sidebars.md](./block-patterns/sidebars.md) - Sidebars 01-16 architectures and slot targets
- [block-patterns/metrics.md](./block-patterns/metrics.md) - Metric cards, KPI grids, delta badges
- [block-patterns/tables.md](./block-patterns/tables.md) - Data tables, sticky headers, row actions
- [block-patterns/forms.md](./block-patterns/forms.md) - Form hierarchy, input groups, validation
- [block-patterns/charts.md](./block-patterns/charts.md) - Dashboard chart containers and responsive layouts
- [block-patterns/navigation.md](./block-patterns/navigation.md) - App shells, breadcrumbs, command menus
- [page-types/dashboard.md](./page-types/dashboard.md) - Dashboards 01-07 complete blueprints
- [page-types/auth.md](./page-types/auth.md) - Auth split-screens (login 01-05, signup 01-05, otp 01-05)
- [page-types/settings.md](./page-types/settings.md) - Workspace settings and preferences
- [page-types/reading-views.md](./page-types/reading-views.md) - Document viewers, detail slide-overs
- [audit/checklist.md](./audit/checklist.md) - Quality inspection checklist and audit protocol
