---
name: basecoat
description: Master UI/UX protocol and 57-component reference for Basecoat UI (pure Basecoat CSS, headless Tailwind CSS v4, Kanso minimalism, and mandatory FSM data-state contracts).
dependencies: basecoat-ui-mcp
---

# Basecoat UI Master Protocol

Basecoat UI is a lightweight, headless component library built on pure Basecoat CSS and Tailwind CSS v4. It delivers the refined aesthetic of shadcn/ui with ZERO React runtime dependencies, ZERO client-side JavaScript framework bloat, and strict semantic HTML5.

## When to Use This Skill

- Use this skill whenever building, refactoring, or reviewing web interfaces with Basecoat UI.
- Use this skill for pure HTML, Astro, Next.js, SvelteKit, Vite, or HTMX applications targeting the Basecoat / shadcn design language.
- Trigger on keywords: `basecoat`, `basecoat-ui`, `basecoat-css`, `tailwind v4`, `kanso`, `shadcn aesthetic`.

## Zero-Tolerance Guardrails

1. **Zero DaisyUI Classes**: DaisyUI class names (`daisyui`, `card-body`, `form-control`, `stat-value`, `btn-primary`, `table-pin-rows`) are STRICTLY FORBIDDEN. All classes must follow Basecoat CSS (`.card`, `.btn`, `.input`, `.select`, `.dialog`, `.badge`) + Tailwind CSS v4 utilities.
2. **Zero React Runtime in HTML**: Markup examples must be pure semantic HTML5. Do NOT include React JSX, React hooks (`useState`), or client component pragmas (`'use client'`) in Basecoat HTML templates.
3. **Card 1px Ring Contract**: The `.card` class intrinsically provides a 1px ring shadow. Adding `border` or `border-border` to `.card` is FORBIDDEN as it causes double-border rendering.
4. **Mandatory FSM State Contracts**: All interactive components must declare explicit Finite State Machine attributes (`data-state`, `data-fsm-recipe`, `aria-*`).
5. **Deterministic Class Ordering**: Elements must order utilities: Basecoat Class -> Layout -> Position -> Alignment -> Sizing -> Spacing -> Typography -> Background -> Border/Ring -> Effects -> States.

## 4-Stage Intent-Driven Tooling Sequence

Before authoring custom markup, execute the 4-stage `basecoat-ui-mcp` workflow:
1. **Stage 1: Layout Scaffold (`basecoat_page_architect`)**: Search and retrieve structural scaffolds (e.g. `workspace-dashboard`, `auth-split-flow`, `workspace-detail`, `workspace-settings`).
2. **Stage 2a: Technical Rules (`basecoat_rules_enforcer`)**: Retrieve Tailwind v4 constraints, FSM contracts, semantic token pairings, and HTML landmark requirements.
3. **Stage 2b: Creative Direction (`basecoat_creative_director`)**: Apply typography ladders, optical spacing rhythm (4px/8px), style packs (Vega, Nova, Maia, Lyra, Mira), and Kanso minimalism.
4. **Stage 3: Component Syntax (`basecoat_component_syntax`)**: Retrieve copy-pasteable component markup pre-configured with FSM state variants.
5. **Stage 4: Quality Inspection (`basecoat_quality_inspector`)**: Audit markup for accessibility, syntax compliance, and token integrity (target score: 90+).

## Master Directives & Guides

| Topic | Document | Focus |
|---|---|---|
| Design System & Tokens | [design-system.md](./design-system.md) | OKLCH tokens, color pairings, typography ladder, 4px/8px rhythm |
| Customization & Style Packs | [customization.md](./customization.md) | @theme inline, single dark mode resolver, Vega/Nova/Maia/Lyra/Mira |
| Installation & Setup | [install.md](./install.md) | Tailwind v4 @import, Astro, Next.js, SvelteKit, Vite, HTMX |
| MCP Tools Reference | [mcp.md](./mcp.md) | Comprehensive reference to all 21 MCP tools and resources |
| Registry Architecture | [registry.md](./registry.md) | Offline component and macro block schemas and integrity |
| Styling Rules | [rules/styling.md](./rules/styling.md) | Semantic tokens, zero raw colors, zero space-x/y, size-* utility |
| Composition Rules | [rules/composition.md](./rules/composition.md) | Group wrappers, semantic primitives, modal headers, spinner icons |
| Form Controls | [rules/forms.md](./rules/forms.md) | FieldGroup, Field, InputGroup, ToggleGroup, dual validation |
| Icon Guidelines | [rules/icons.md](./rules/icons.md) | data-icon placement, zero sizing classes on icons, aria-hidden |

## Full 57-Component Index

| Component | Description & Link |
|---|---|
| [accordion](./components/accordion.md) | Basecoat `accordion` component reference, anatomy, FSM states, and anti-patterns. |
| [alert](./components/alert.md) | Basecoat `alert` component reference, anatomy, FSM states, and anti-patterns. |
| [alert-dialog](./components/alert-dialog.md) | Basecoat `alert-dialog` component reference, anatomy, FSM states, and anti-patterns. |
| [aspect-ratio](./components/aspect-ratio.md) | Basecoat `aspect-ratio` component reference, anatomy, FSM states, and anti-patterns. |
| [avatar](./components/avatar.md) | Basecoat `avatar` component reference, anatomy, FSM states, and anti-patterns. |
| [badge](./components/badge.md) | Basecoat `badge` component reference, anatomy, FSM states, and anti-patterns. |
| [breadcrumb](./components/breadcrumb.md) | Basecoat `breadcrumb` component reference, anatomy, FSM states, and anti-patterns. |
| [button](./components/button.md) | Basecoat `button` component reference, anatomy, FSM states, and anti-patterns. |
| [button-group](./components/button-group.md) | Basecoat `button-group` component reference, anatomy, FSM states, and anti-patterns. |
| [calendar](./components/calendar.md) | Basecoat `calendar` component reference, anatomy, FSM states, and anti-patterns. |
| [card](./components/card.md) | Basecoat `card` component reference, anatomy, FSM states, and anti-patterns. |
| [carousel](./components/carousel.md) | Basecoat `carousel` component reference, anatomy, FSM states, and anti-patterns. |
| [chart](./components/chart.md) | Basecoat `chart` component reference, anatomy, FSM states, and anti-patterns. |
| [checkbox](./components/checkbox.md) | Basecoat `checkbox` component reference, anatomy, FSM states, and anti-patterns. |
| [collapsible](./components/collapsible.md) | Basecoat `collapsible` component reference, anatomy, FSM states, and anti-patterns. |
| [combobox](./components/combobox.md) | Basecoat `combobox` component reference, anatomy, FSM states, and anti-patterns. |
| [command](./components/command.md) | Basecoat `command` component reference, anatomy, FSM states, and anti-patterns. |
| [context-menu](./components/context-menu.md) | Basecoat `context-menu` component reference, anatomy, FSM states, and anti-patterns. |
| [data-table](./components/data-table.md) | Basecoat `data-table` component reference, anatomy, FSM states, and anti-patterns. |
| [date-picker](./components/date-picker.md) | Basecoat `date-picker` component reference, anatomy, FSM states, and anti-patterns. |
| [dialog](./components/dialog.md) | Basecoat `dialog` component reference, anatomy, FSM states, and anti-patterns. |
| [drawer](./components/drawer.md) | Basecoat `drawer` component reference, anatomy, FSM states, and anti-patterns. |
| [dropdown-menu](./components/dropdown-menu.md) | Basecoat `dropdown-menu` component reference, anatomy, FSM states, and anti-patterns. |
| [empty](./components/empty.md) | Basecoat `empty` component reference, anatomy, FSM states, and anti-patterns. |
| [field](./components/field.md) | Basecoat `field` component reference, anatomy, FSM states, and anti-patterns. |
| [form](./components/form.md) | Basecoat `form` component reference, anatomy, FSM states, and anti-patterns. |
| [hover-card](./components/hover-card.md) | Basecoat `hover-card` component reference, anatomy, FSM states, and anti-patterns. |
| [input](./components/input.md) | Basecoat `input` component reference, anatomy, FSM states, and anti-patterns. |
| [input-group](./components/input-group.md) | Basecoat `input-group` component reference, anatomy, FSM states, and anti-patterns. |
| [input-otp](./components/input-otp.md) | Basecoat `input-otp` component reference, anatomy, FSM states, and anti-patterns. |
| [item](./components/item.md) | Basecoat `item` component reference, anatomy, FSM states, and anti-patterns. |
| [kbd](./components/kbd.md) | Basecoat `kbd` component reference, anatomy, FSM states, and anti-patterns. |
| [label](./components/label.md) | Basecoat `label` component reference, anatomy, FSM states, and anti-patterns. |
| [menubar](./components/menubar.md) | Basecoat `menubar` component reference, anatomy, FSM states, and anti-patterns. |
| [navigation-menu](./components/navigation-menu.md) | Basecoat `navigation-menu` component reference, anatomy, FSM states, and anti-patterns. |
| [pagination](./components/pagination.md) | Basecoat `pagination` component reference, anatomy, FSM states, and anti-patterns. |
| [popover](./components/popover.md) | Basecoat `popover` component reference, anatomy, FSM states, and anti-patterns. |
| [progress](./components/progress.md) | Basecoat `progress` component reference, anatomy, FSM states, and anti-patterns. |
| [radio-group](./components/radio-group.md) | Basecoat `radio-group` component reference, anatomy, FSM states, and anti-patterns. |
| [resizable](./components/resizable.md) | Basecoat `resizable` component reference, anatomy, FSM states, and anti-patterns. |
| [scroll-area](./components/scroll-area.md) | Basecoat `scroll-area` component reference, anatomy, FSM states, and anti-patterns. |
| [select](./components/select.md) | Basecoat `select` component reference, anatomy, FSM states, and anti-patterns. |
| [separator](./components/separator.md) | Basecoat `separator` component reference, anatomy, FSM states, and anti-patterns. |
| [sheet](./components/sheet.md) | Basecoat `sheet` component reference, anatomy, FSM states, and anti-patterns. |
| [sidebar](./components/sidebar.md) | Basecoat `sidebar` component reference, anatomy, FSM states, and anti-patterns. |
| [skeleton](./components/skeleton.md) | Basecoat `skeleton` component reference, anatomy, FSM states, and anti-patterns. |
| [slider](./components/slider.md) | Basecoat `slider` component reference, anatomy, FSM states, and anti-patterns. |
| [sonner](./components/sonner.md) | Basecoat `sonner` component reference, anatomy, FSM states, and anti-patterns. |
| [spinner](./components/spinner.md) | Basecoat `spinner` component reference, anatomy, FSM states, and anti-patterns. |
| [switch](./components/switch.md) | Basecoat `switch` component reference, anatomy, FSM states, and anti-patterns. |
| [table](./components/table.md) | Basecoat `table` component reference, anatomy, FSM states, and anti-patterns. |
| [tabs](./components/tabs.md) | Basecoat `tabs` component reference, anatomy, FSM states, and anti-patterns. |
| [textarea](./components/textarea.md) | Basecoat `textarea` component reference, anatomy, FSM states, and anti-patterns. |
| [toast](./components/toast.md) | Basecoat `toast` component reference, anatomy, FSM states, and anti-patterns. |
| [toggle](./components/toggle.md) | Basecoat `toggle` component reference, anatomy, FSM states, and anti-patterns. |
| [toggle-group](./components/toggle-group.md) | Basecoat `toggle-group` component reference, anatomy, FSM states, and anti-patterns. |
| [tooltip](./components/tooltip.md) | Basecoat `tooltip` component reference, anatomy, FSM states, and anti-patterns. |
