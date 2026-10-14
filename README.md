<p align="center">
  <img src="assets/logo.svg" alt="Basecoat UI MCP" width="64" height="64" />
</p>

<h1 align="center">Basecoat UI MCP</h1>

<p align="center">
  <strong>Offline Model Context Protocol server for Basecoat UI (shadcn/ui look without bundling or requiring React).</strong><br>
  Curated templates, macro layouts, rhythm tokens, and static validation for Astro, Next.js, HTML, and Tailwind CSS 4.
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@intellmedia/basecoat-ui-mcp"><img src="https://img.shields.io/npm/v/@intellmedia/basecoat-ui-mcp?style=flat&color=3b82f6&logo=npm&label=npm" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@intellmedia/basecoat-ui-mcp"><img src="https://img.shields.io/npm/dm/@intellmedia/basecoat-ui-mcp?style=flat&color=10b981" alt="npm downloads" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-amber?style=flat" alt="MIT License" /></a>
  <img src="https://img.shields.io/badge/node-%3E%3D22.14-emerald?style=flat&logo=node.js&logoColor=white" alt="Node.js version" />
  <img src="https://img.shields.io/badge/TypeScript-5.9-3178c6?style=flat&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Network-0KB_Offline-09090b?style=flat&logo=shield&logoColor=emerald" alt="Offline Safe" />
</p>

The server exposes a deterministic, offline registry for AI coding agents instead of requiring clients to scrape documentation. It runs over local stdio with **zero runtime network requests**, bounded **&lt; 2 KB** responses, and bounded lexical/heuristic static source validation. The host application remains responsible for rendering, data access, authentication, sessions, credentials, OAuth, captcha, and other runtime behavior.

## Install

Requires Node.js **22.14.0** or newer.

### Quick Start by Client

#### Cursor (`.cursor/mcp.json`)

```json
{
  "mcpServers": {
    "basecoat-ui": {
      "command": "npx",
      "args": ["-y", "@intellmedia/basecoat-ui-mcp", "--project-root", "${workspaceFolder}"]
    }
  }
}
```

#### Claude Desktop (`claude_desktop_config.json`)

```json
{
  "mcpServers": {
    "basecoat-ui": {
      "command": "npx",
      "args": ["-y", "@intellmedia/basecoat-ui-mcp", "--project-root", "/absolute/path/to/your/application"]
    }
  }
}
```

#### Claude Code (CLI)

```sh
claude mcp add basecoat-ui -- npx -y @intellmedia/basecoat-ui-mcp --project-root $(pwd)
```

#### Generic npx (no install)

```json
{
  "mcpServers": {
    "basecoat-ui": {
      "command": "npx",
      "args": ["-y", "@intellmedia/basecoat-ui-mcp", "--project-root", "/absolute/path/to/your/application"]
    }
  }
}
```

### npm

```sh
npm install --global @intellmedia/basecoat-ui-mcp
```

Add the server to an MCP client. Use an absolute path for the host application so design context and persistent sessions belong to the intended project:

```json
{
  "mcpServers": {
    "basecoat-ui": {
      "command": "basecoat-ui-mcp",
      "args": ["--project-root", "/absolute/path/to/your/application"]
    }
  }
}
```

The compiled entry can also be invoked directly:

```json
{
  "mcpServers": {
    "basecoat-ui": {
      "command": "node",
      "args": [
        "/absolute/path/to/node_modules/@intellmedia/basecoat-ui-mcp/dist/server/stdio.js",
        "--project-root",
        "/absolute/path/to/your/application"
      ]
    }
  }
}
```

Published packages include prebuilt `dist/` and the immutable semantic snapshot
under `src/semantics/`. Server startup reads that snapshot and does not write
inside the installed package. The package contract test builds first, creates
and extracts an actual npm tarball, marks the extracted package tree read-only,
starts its `dist/server/stdio.js` under a network tripwire, completes MCP
initialize and tool-list requests, and closes the connection. A source checkout
does not include `dist/`.

### From source

```sh
git clone https://github.com/zygiu-zygis/basecoat-ui-mcp.git
cd basecoat-ui-mcp
npm ci
npm run build
npm start -- --project-root /absolute/path/to/your/application
```

`--project-root` takes precedence over `BASECOAT_PROJECT_ROOT`, which takes precedence over the launch directory. The selected directory is the host project, not the MCP installation directory. The server exposes stdio only.

## Project-root configuration

The configured root controls two things:

- `DESIGN.md` is read from that directory by `basecoat://project/context`.
- Persistent macro sessions are stored under `<project-root>/.basecoat/designer/`.
- `.basecoat/rhythm.json` is an optional strict override. It must live under a
  real `.basecoat` directory inside the project root, be a regular non-symlink
  file no larger than 65,536 UTF-8 bytes, and resolve inside that root; missing
  or rejected files leave the packaged profile unchanged. Matching mapping IDs
  replace in place and keep packaged order.

Only that exact directory is used. The server does not walk parent directories. Keep `.basecoat/` in the host project and back it up if design sessions are part of your workflow. The MCP server never writes host application source files.

## Basecoat MCP tools

The server exposes **22 offline MCP tools** organized across six architectural layers: project setup and configuration, intent-driven layout orchestration, theme-aware charts, component retrieval, macro design graphs, and semantic state contracts. Every tool result is a bounded MCP packet of at most **1,999 UTF-8 bytes**. Larger result sets use cursors; responses are not sliced mid-JSON.

### Complete MCP Tool Table

| Tool Name | Layer | Description | Mode |
| --- | --- | --- | --- |
| `basecoat_setup_config` | Setup & Config | Generates framework boilerplates, Tailwind CSS 4 imports, OKLCH variables, and no-flash dark mode scripts | Read-only |
| `basecoat_page_architect` | Intent Fast Path | Plans complete layout scaffolds with container grid contracts and explicit slot topology | Read-only |
| `basecoat_compose_stack` | Intent Fast Path | Assembles composable component stacks into canonical shells (sidebar-01..16, topbar, inset, split) with slot hydration | Read-only |
| `basecoat_rules_enforcer` | Intent Fast Path | Enforces technical constraints across Tailwind v4, FSM state contracts, semantic tokens, and dashboard rules | Read-only |
| `basecoat_creative_director` | Intent Fast Path | Surfaces Kanso minimalism, 4px/8px optical rhythm, density profiles, typography ladders, and contrast pairings | Read-only |
| `basecoat_component_syntax` | Intent Fast Path | Delivers copy-pasteable HTML/Astro component markup with pre-configured FSM state variants and inline SVG icons | Read-only |
| `basecoat_list_charts` | Charts & Data Viz | Lists and filters 56 theme-aware chart blueprints across 7 categories with keyword search | Read-only |
| `basecoat_get_chart_blueprint` | Charts & Data Viz | Retrieves chart HTML using semantic CSS tokens (--chart-1..5) and mount scripts for 5 frameworks | Read-only |
| `basecoat_quality_inspector` | Quality & Audit | Audits HTML/Astro markup with Score (0-100), letter grade, syntax violations, a11y omissions, and auto-fix suggestions | Read-only |
| `search_components` | Components | Searches up to 8 compact component summaries by intent and/or query across 61 curated components | Read-only |
| `get_component_details` | Components | Retrieves minimal component template, dependencies, and composition guidance for Astro or HTML | Read-only |
| `get_component_html` | Components | Retrieves HTML markup template and dependencies for any curated component | Read-only |
| `validate_composition` | Static Analysis | Statically checks up to 256 KiB of markup for migration errors, rhythm, FSM bindings, and accessibility | Read-only |
| `validate_markup` | Static Analysis | Validates HTML/Astro markup syntax, structure, landmark ordering, and semantic constraints | Read-only |
| `search_macro_blocks` | Macro Graph | Searches approved macro layout blocks by query, role, family, or tag across 84 blocks and aliases | Read-only |
| `get_macro_block` | Macro Graph | Retrieves a section of a compiled macro block blueprint (manifest, structure, slots, ports, rules, etc.) | Read-only |
| `begin_design` | Macro Graph | Creates a persistent, hash-verified design session under .basecoat/designer/ pinning profile and registry revision | Mutation (idempotent) |
| `get_design_context` | Macro Graph | Reads focused design session views (sessions, overview, decisions, graph, rules, focus, next) | Read-only |
| `apply_design_patch` | Macro Graph | Applies atomic graph mutations with expectedRevision and idempotent operationId | Mutation (idempotent) |
| `validate_design` | Macro Graph | Validates draft or complete design graphs, returning diagnostic totals and paginated issues | Read-only |
| `get_rhythm_rules` | Semantics & Tokens | Reads effective semantic rhythm profiles and approved utilities by family, supporting project-local overrides | Read-only |
| `get_fsm_recipe` | Semantics & State | Reads finite state machine interaction states, events, transitions, guards, and actions | Read-only |

### Intent-Driven Design Layer (Fast Path)

1. `basecoat_setup_config` - Framework and styling configuration generator. Outputs ready-to-use boilerplate for 6 targets (`astro`, `vanilla`, `nextjs`, `sveltekit`, `vite`, `htmx`), 8 aesthetic style packs (`vega`, `nova`, `maia`, `lyra`, `mira`, `luma`, `sera`, `rhea`), complete OKLCH `@theme inline` blocks, and synchronous `<head>` inline dark mode scripts.
2. `basecoat_page_architect` - Query recipes (`src/macros/authoring/recipes/*.json`) and macro blocks (`src/macros/authoring/blocks/*.json`) by `intent`, `recipe`, or `block`. Delivers full layout scaffolds with explicit `data-slot` markers, semantic HTML skeletons, grid structures, and responsive containers. Fully covers 5 dashboard page archetypes:
   - **Executive Dashboard** (`workspace-dashboard`, `executive-dashboard`) - KPI stat cards, revenue chart, and recent activity.
   - **E-commerce Overview** (`ecommerce-overview`) - Sales metrics, revenue analytics, top products card, and order summary.
   - **Analytics Workspace** (`analytics-workspace`) - Filter toolbar, time-series interactive chart, and cohort analysis breakdown.
   - **Data Table Detail** (`workspace-detail`, `data-table-detail`) - Paginated data table with search/filters and slide-over inspection drawer.
   - **Settings Split-Screen** (`workspace-settings`, `settings-split-screen`) - Two-column responsive layout with vertical section navigation and form controls.
   Supports density controls (`compact` for high-density enterprise tools, `comfortable` for standard interfaces).
3. `basecoat_compose_stack` - Dynamically composes 41 pre-built component stacks across 7 categories (`shell-stacks`, `header-stacks`, `kpi-stacks`, `chart-stacks`, `table-stacks`, `overlay-stacks`, `form-stacks`) into canonical shells (`sidebar-01`..`sidebar-16`, `topbar-shell`, `inset-shell`, `split-shell`) with automated slot hydration.
4. `basecoat_rules_enforcer` - Enforces strict technical constraints across `tailwind-v4`, `fsm-contracts`, `tokens`, `semantic-html`, and `dashboard-patterns`:
   - `MET-01`: KPI numerals require `text-2xl`/`text-3xl` with `tabular-nums` and semantic trend indicators.
   - `TBL-01`: Data tables require `<div class="overflow-x-auto">` wrapper, sticky blurred `<thead class="sticky top-0 bg-background/90 backdrop-blur">`, and right-aligned numeric cells.
   - `FRM-01`: Input controls require `<div class="field">` wrappers with associated `<label class="label" for="id">`.
   - `NAV-01`: Headers must use compact `h-12` or `h-14` (forbidding oversized `h-16`).
   - `TW4-01`: Rejects deprecated Tailwind v3 utilities (`bg-opacity-*`, `flex-shrink-*`, `@tailwind` directives).
   - `TOK-01`: Rejects arbitrary bracket dimensions (`w-[327px]`) and hardcoded hex colors (`#ff0000`, `bg-[#123456]`).
   - `FSM-01`: Enforces finite state machine contracts on interactive primitives (`dialog`, `dropdown-menu`, `accordion`, `tabs`).
5. `basecoat_creative_director` - Surfaces Kanso minimalism and Basecoat design intelligence:
   - Density profiles: `compact` (p-4 gap-4, header h-12, table py-2), `standard` (p-6 gap-4/gap-6, header h-14, table py-3), and `comfortable` (p-6 md:p-8, header h-14).
   - Mathematical 4px/8px optical rhythm grid and typography ladders (`tabular-nums` on all metrics and numeric table cells).
   - Subtle 1px card ring elevation without conflicting `border` utilities.
   - WCAG 2.1 AA (contrast >= 4.5:1) and APCA ($L_c \ge 60$) token pairings.
6. `basecoat_component_syntax` - Delivers copy-pasteable HTML or Astro component markup from `src/registry/components.json` with pre-configured FSM state variants (`default`, `active`, `loading`, `disabled`, `open`, `closed`, `open/closed`), verified inline SVG action icons (`plus`, `edit`, `trash`, `search`, `chevron-down`, `check`, `external-link`), and composite component patterns:
   - `metric-card` (`metrics-summary`, `kpi-card`) - Stat card with tabular-nums numeral and trend badge.
   - `data-table` (`datatable`) - Sticky header table wrapped in `overflow-x-auto` with right-aligned numeric cells.
   - `sidebar-shell` (`sidebar-dashboard-shell`) - Desktop sticky navigation with responsive flyout below `md`.
7. `basecoat_quality_inspector` - Audits HTML/Astro compositions against dashboard audit rules: `table-overflow-wrapper`, `kpi-metric-tabular-nums`, `table-numeric-alignment`, `a11y-focus-ring` (flagging `outline-none` without focus visible ring), arbitrary color/dimension violations, and WCAG/APCA contrast pairings. Returns `score` (`0-100`), letter `grade` (`A-F`), structured issues, and actionable `autoFixSuggestions`.

### Theme-Aware Charts and Data Visualization

8. `basecoat_list_charts` - Discovers and filters 56 theme-aware chart blueprints across 7 categories (`area`, `bar`, `line`, `pie`, `radar`, `radial`, `tooltip`) with keyword `search` / `query`, layout footprint (`layoutFootprint`), `requiredTokens`, and variant summaries.
9. `basecoat_get_chart_blueprint` - Retrieves chart container HTML (`chart-container`, `role="img"`, accessible `<table class="sr-only">` fallback, and glassmorphic tooltip markup with `bg-background/95 backdrop-blur-sm`), CSS tokens (`var(--chart-1)` through `var(--chart-5)`, `var(--color-border)`, `var(--color-muted-foreground)`), client `options`, `layoutFootprint`, and framework mount code for 5 frameworks (`vanilla`, `astro`, `react`, `vue`, `svelte`) with optional `themeTokens` overrides. Accepts `chartId` or alias `id` (defaults to `area-default`). Integrated directly into `dashboard-01` and `svg-area-chart` (`data-chart-id="area-interactive"`). Generated deterministically via `node scripts/ingest-shadcn-charts.mjs`.

### Component tools

- `search_components` returns up to 8 compact `{id, name, intent}` summaries across the 61 curated components and never returns markup. `intent` and `query` are optional; an empty search returns an empty list.
- `get_component_details` returns one Astro or HTML template with dependencies and composition guidance. Oversized entries fail closed. `theme-toggle` resolves to `theme-switcher`.
- `get_component_html` returns the HTML markup template and dependencies for any curated component (`environment` defaults to `html`).
- `validate_composition` statically checks up to **256 KiB** (262,144 UTF-8 bytes) of HTML or Astro source and returns at most 24 issues (including WCAG 2.1 / APCA token contrast, arbitrary dimensions, dialog focus traps, and `aria-controls` bindings). Pass `code` or `html`, and optional `semanticProfile` or `densityProfile` (comfortable|compact). It does not render, execute, resolve application modules, or certify runtime browser accessibility.
- `validate_markup` statically validates HTML/Astro source syntax, container tags, landmark ordering, and semantic constraints against Basecoat guidelines.

### Macro tools

The macro layer is this project's curated, project-specific composition system for shells, auth flows, data workspaces, slots, ports, rules, and recipes. It is compiled into a pinned registry snapshot. These layout contracts are not supplied automatically by shadcn or by MCP.

1. `search_macro_blocks` - find compatible blueprint blocks by query, role, family, or tag across 84 blocks and aliases.
2. `get_macro_block` - read a block section such as `manifest`, `structure`, `slots`, `ports`, `rules`, `dependencies`, or `provenance`.
3. `begin_design` - create a persistent design session and pin its profile and registry revision. Pinned registries are hash-verified on load.
4. `get_design_context` - read session lists or focused views such as `overview`, `graph`, `rules`, `focus`, and `next`.
5. `apply_design_patch` - apply atomic graph changes with `expectedRevision` and an idempotent `operationId`. A committed mutation always returns a success acknowledgement; oversized optional payload may be omitted with `truncated: true`.
6. `validate_design` - validate a draft or complete design graph and page its diagnostics.

Design sessions persist under `<project-root>/.basecoat/designer/`. Registry revisions are content-addressed; a session keeps using its pinned revision even after the package snapshot changes. Design snapshots use the form `d:<designId>@<revision>`.

Curated block blueprints (84 blocks and aliases including translated shadcn/ui v4 blocks):
- **Canonical Shells & Sidebars**: `sidebar-01` through `sidebar-16`, `sidebar-dashboard-shell`, `sidebar-inset-shell`, `sidebar-collapsible-icon`, `sidebar-mobile-flyout`, `sidebar-nav`, `topbar-shell`, `topbar-nav`, `app-shell`, `page-header`.
- **Dashboards & Workspaces**: `dashboard-01` through `dashboard-07`, `dashboard-workspace`, `dashboard-main`, `dashboard-activity`, `analytics`, `analytics-workspace`, `ecommerce-overview`, `tasks`, `tasks-table-workspace`, `mail`, `mail-workspace`.
- **Metrics & Data Tables**: `metrics-summary`, `data-table-rich`, `data-table`, `data-table-detail-layout`, `data-workspace`, `data-bulk-actions`, `data-filters`, `data-pager`, `products`, `billing`, `settings`.
- **Forms & Authentication**: `login-01` through `login-05`, `signup-01` through `signup-05`, `otp-01` through `otp-05`, `form-field-group`, `forms`, `form-section`, `authentication`, `auth-sign-in`, `auth-sign-up`, `auth-split-screen`, `auth-recovery`, `auth-reset`.
- **Charts & Feedback**: `svg-area-chart`, `empty-state`, `error-boundary`, `newsletter-waitlist`, `pricing-tiers`, `segmented-toggle`, `detail-drawer-panel`, `product-detail-layout`, `settings-workspace`.

Multi-block recipes (11 page recipes):
- `workspace-dashboard` - full analytics dashboard (KPI cards, activity chart, records table).
- `ecommerce-overview` - e-commerce operational dashboard with order metrics and product highlights.
- `analytics-workspace` - analytics dashboard with time-series charts and cohort views.
- `workspace-settings` - application shell with navigation, header, and settings workspace tabs.
- `workspace-detail` / `tasks-table-workspace` - data table workspace with slide-over detail inspection drawer.
- `mail-workspace` - multi-pane email client layout with inbox list and detail view.
- `auth-flow` - bidirectional authentication flow between sign-in and sign-up cards.
- `auth-split-flow` - split-screen auth frame pairing sign-in and sign-up with hero media.
- `data-records` - records page with filters, table, and pager.
- `marketing-pricing` - 3-tier pricing table paired with newsletter/waitlist banner.

### Semantic tools

The semantic layer provides compiled rhythm profiles and finite state machine recipes:

1. `get_rhythm_rules` - access approved spacing, typography, surfaces, borders, and layout patterns by profile and family filters.
2. `get_fsm_recipe` - read interaction states, events, transitions, guards, and actions for `dialog`, `navigation` (`collapsible-navigation`), `auth-flow`, and `tabs`.

Semantic tools use the same bounded pagination as macro tools. Each rhythm record keeps the semantic token ID separate from its approved Tailwind utility. Put the utility in `class`; keep the semantic ID in design metadata and agent reasoning. Project overrides from `<project-root>/.basecoat/rhythm.json` are reflected in an effective content ref and revision. FSM recipes are structural metadata, not runtime implementations.

### End-to-end example

A dashboard page can follow this sequence:

```text
get_design_context(view="sessions")
begin_design(designId="admin", profile="app-default", operationId="begin-admin")
get_rhythm_rules(profile="default", family="density")
search_macro_blocks(q="shell", limit=8)
apply_design_patch(
  designId="admin",
  expectedRevision=0,
  operationId="add-dashboard",
  operations=[{ op: "instantiate_recipe",
               recipe: "workspace-dashboard",
               pagePrefix: "admin" }]
)
get_design_context(view="overview", designId="admin")
get_macro_block(idOrRef="app-shell", section="structure", designId="admin")
get_fsm_recipe(recipe="dialog", section="transitions")
```

Implement the selected component leaves in the host project, then record completed regions with `apply_design_patch(record_written)`. Finish with `validate_design(mode="complete")` and `validate_composition` on the generated Astro or HTML source. After a conflict or restart, reread the session and use the returned revision and cursors.

Copy `templates/cursor/basecoat-designer.mdc` into a host project's `.cursor/rules` for agent guidance. The MCP server does not write consumer application source files.

### Auditing or restyling an existing UI

No design session is needed. Read `basecoat://design/theming` and `basecoat://design/rhythm`, call `get_component_details` for each control you change, then run `validate_composition` on the rendered layout source including `<head>` scripts and `<style>`. Theme rules:

- `theme-strategy-mixed` - `@media (prefers-color-scheme: dark)` combined with the `.dark` class strategy (dark tokens leak into light mode).
- `theme-storage-key` - a theme script persists under a key other than Basecoat's `themeMode`, creating a second resolver that drifts from `window.basecoat.theme`.

Check light and dark screenshots with an OS dark preference and empty `localStorage` before deploying.

### Source adaptation and offline import

The macro importer is intentionally local-first. It accepts a checked-out or otherwise
locally saved shadcn-style `registry-item.json`, a reviewed mapping, and a local
dependency lock:

```sh
npm run import:blocks -- \
  --item=/path/to/registry-item.json \
  --mapping=/path/to/mapping.json \
  --lock=/path/to/dependency-lock.json \
  --dry-run
```

This command does not fetch live shadcn registry items, install packages, execute
upstream code, or make runtime network requests. Unknown, unlocked, or explicitly
unsupported dependencies produce diagnostics instead of guesses. Omitted OAuth,
captcha, session, credential, and other application features are reported as
obligations. The importer emits only the curated structural block; the host
application must implement the runtime behavior.

The mapping and resulting provenance make the boundary explicit: shadcn-style source
is an input reference, while layout contracts, slots, ports, rules, and recipes are
curated adaptations owned by this project's macro layer. They are not features
provided by shadcn or by MCP. Upstream refreshes are separate maintainer authoring
operations and never occur from the MCP server.

## Basecoat MCP resources

The server exposes **8 authoritative MCP resources** spanning the 3-pillar Skill Vault, core design system contracts, multi-framework integration guides, and live host project context:

### Complete MCP Resource Table

| Resource URI | Category | Description | MIME Type |
| --- | --- | --- | --- |
| `basecoat://skills/core` | Skill Vault | Core Basecoat UI design philosophy, Kanso minimalism, and foundational component usage | `text/markdown` |
| `basecoat://skills/dashboard` | Skill Vault | Comprehensive dashboard architecture, layout patterns, page types, sidebar configurations, and audit checklists | `text/markdown` |
| `basecoat://skills/charts` | Skill Vault | Theme-aware chart blueprints, CSS token mapping (--chart-1..5), ApexCharts configuration, and multi-framework integration | `text/markdown` |
| `basecoat://skills/files/*` | Skill Vault | Dynamic file access resource to read individual documentation and reference markdown files across the 95-file Skill Vault | `text/markdown` |
| `basecoat://design/rhythm` | Design System | Content hierarchy, 4px/8px optical spacing rhythm, typography ladders, density profiles, and structural composition rules | `text/markdown` |
| `basecoat://design/theming` | Theming & Dark Mode | Basecoat OKLCH token contract, 8 official style packs (Vega..Rhea), class-based dark mode (themeMode resolver), and no-flash bootstrap | `text/markdown` |
| `basecoat://integration/frameworks` | Integration Guide | Production integration guide covering Astro, Next.js, Express, Vite, Tailwind CSS 4 setup, and framework-agnostic HTML | `text/markdown` |
| `basecoat://project/context` | Project Context | Live on-demand read of the host project's DESIGN.md (bounded to 6,000 UTF-8 bytes) | `application/json` |

- `basecoat://skills/core` provides foundational guidelines for building clean, minimal interfaces using Basecoat CSS, including design philosophy, atomic styling principles, and component construction.
- `basecoat://skills/dashboard` provides enterprise dashboard architecture, navigation patterns, data display conventions, form layouts, and accessibility checklists.
- `basecoat://skills/charts` provides complete guidance on theme-aware ApexCharts and SVG data visualization using pure Basecoat CSS color tokens (`var(--chart-1)` through `var(--chart-5)`) across 5 frameworks.
- `basecoat://skills/files/*` enables dynamic lookup and retrieval of any specific markdown file within the 95-file Skill Vault (`skills/basecoat`, `skills/basecoat-dashboard`, `skills/basecoat-charts`).
- `basecoat://design/rhythm` provides content hierarchy, spacing, typography, component-family, and structural composition rules.
- `basecoat://design/theming` provides the Basecoat token contract, all 8 official style packs (Vega, Nova, Maia, Lyra, Mira, Luma, Sera, Rhea), class-based dark mode via `window.basecoat.theme` (`themeMode` key), no-flash bootstrap, and form-control/autofill pitfalls. Read it before restyling or auditing an existing UI.
- `basecoat://integration/frameworks` provides Astro, Next.js, Express, Vite, Tailwind CSS 4 (including style pack imports like `@import "basecoat-css/vega";`), selective Basecoat JavaScript, and native dialog setup.
- `basecoat://project/context` reads the configured host project's `DESIGN.md` on demand. Output is capped at **6,000 UTF-8 bytes** and truncates on a newline or sentence boundary when possible. Symlinks and non-regular files are refused.

Recommended flow:

1. Read the rhythm and project-context resources.
2. Decide content hierarchy and layout.
3. Search summaries, then request details only for selected components.
4. Read the integration resource when connecting production assets.
5. Validate the final source.

## Minimal HTML example

The host application supplies its compiled Tailwind and Basecoat stylesheet:

```html
<link rel="stylesheet" href="/assets/basecoat.css">
<button type="button" class="btn" data-variant="default">Save changes</button>
```

### Header Control Cluster (Style Preset Selector + Theme Switcher)

```html
<div class="flex items-center gap-2">
  <select id="style-variant-select" class="select h-8 w-28 text-sm leading-none" aria-label="Style pack">
    <option value="vega">Vega</option>
    <option value="nova">Nova</option>
    <option value="maia">Maia</option>
    <option value="lyra">Lyra</option>
    <option value="mira">Mira</option>
    <option value="luma">Luma</option>
    <option value="sera">Sera</option>
    <option value="rhea">Rhea</option>
  </select>
  <button type="button" aria-label="Toggle dark mode" data-tooltip="Toggle dark mode" data-side="bottom" onclick="window.basecoat.theme.toggle()" class="btn size-8" data-variant="outline" data-size="icon">
    <span class="hidden dark:block" aria-hidden="true"><svg class="lucide lucide-sun size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2m-2.93 7.07-1.41-1.41M6.34 6.34 4.93 4.93"/></svg></span>
    <span class="block dark:hidden" aria-hidden="true"><svg class="lucide lucide-moon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg></span>
  </button>
</div>
```

Basecoat 1.x uses `btn` with `data-variant` and `data-size`. Interactive components list the granular JavaScript modules the host must load.

## Macro-Driven Dashboard Generation

The MCP server provides a robust set of macro layouts (`search_macro_blocks`) that enable connected LLMs to predictably assemble complex layouts (like Shadcn dashboards) out-of-the-box.

- **Layout Neutrality**: Supports both sidebar (`sidebar-dashboard-shell`, `sidebar-inset-shell`) and top-bar architectures (`topbar-shell`, `topbar-nav`).
- **Strict Validation**: The `validate_composition` tool ensures that generated layouts adhere to the Basecoat CSS theming contracts, strict spacing rhythm scales (0, 2, 4, 6, 8, 12), and proper landmark accessibility.
- **Agent Guidance**: LLMs are encouraged to use `search_macro_blocks` to find a `shell` (layout wrapper), and `dashboard-main` or `dashboard-workspace` to populate the `main` container, guaranteeing deterministic, pixel-perfect Shadcn/ui parody without React runtime artifacts.

## Registry and exclusions

The checked-in registry contains **61 curated components**: all 57 `shadcn/ui` New York v4 primitives adapted for pure Basecoat CSS without React, plus Basecoat extensions (`theme-switcher`, `segmented-toggle`, `svg-area-chart`, `native-select`) with explicit FSM state contracts:

`accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `combobox`, `command`, `context-menu`, `data-table`, `date-picker`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `form`, `hover-card`, `input`, `input-group`, `input-otp`, `item`, `kbd`, `label`, `menubar`, `native-select`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `segmented-toggle`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `spinner`, `svg-area-chart`, `switch`, `table`, `tabs`, `textarea`, `theme-switcher`, `toast`, `toggle`, `toggle-group`, `tooltip`

### Comprehensive Catalog Counts

- **61 Curated Components**: All 57 `shadcn/ui` new-york-v4 primitives plus Basecoat extensions with verified HTML/Astro markup templates, zero React bundling requirements, and finite state machine (FSM) contracts.
- **84 Macro Blocks & Aliases**: Layout blueprints covering `sidebar-01..16`, `dashboard-01..07`, `login-01..05`, `signup-01..05`, `otp-01..05`, `mail`, `tasks`, `forms`, `products`, `analytics`, `billing`, and `settings`.
- **11 Page Recipes**: End-to-end multi-page layout graphs (`workspace-dashboard`, `ecommerce-overview`, `analytics-workspace`, `workspace-settings`, `workspace-detail`, `tasks-table-workspace`, `mail-workspace`, `auth-flow`, `auth-split-flow`, `data-records`, `marketing-pricing`).
- **41 Composable Component Stacks**: Composable stacks across 7 categories (`shell-stacks`, `header-stacks`, `kpi-stacks`, `chart-stacks`, `table-stacks`, `overlay-stacks`, `form-stacks`) with slot hydration into canonical shells.
- **56 Theme-Aware Chart Blueprints**: Visualizations across 7 categories (`area`, `bar`, `line`, `pie`, `radar`, `radial`, `tooltip`) mapped to CSS tokens (`var(--chart-1)` through `var(--chart-5)`) with mounts for 5 frameworks (`vanilla`, `astro`, `react`, `vue`, `svelte`).
- **95 Markdown Files across the 3-Pillar Skill Vault**: Distributed across `skills/basecoat` (core foundations and 57 component guides), `skills/basecoat-dashboard` (dashboard architecture, block patterns, and audit checklist), and `skills/basecoat-charts` (ApexCharts blueprints and token mapping).

The maintenance snapshot records 41 discovered upstream components. All 57 shadcn/ui primitives are now curated with templates, dependencies, and state contracts. Slider uses `basecoat-css/range`, not a `slider` module.

The runtime has no network client, remote documentation dependency, frontend framework runtime, remote media analysis, or bundled host assets. Generated templates may not use `basecoat-css/all`; each controller is imported explicitly. Search results do not contain markup, newly discovered components are never auto-promoted, and JSON or HTML is never sliced to fit a response budget.

## Astro and static HTML use cases

In Astro, use the integration resource for Vite, Tailwind CSS 4, CSS ordering, selective controller imports, native `<dialog>` wiring, and ClientRouter hooks. In static HTML, copy the listed built controller files from `basecoat-css` into the host application's asset directory and preserve dependency order. Chart templates require host-supplied Chart.js.

Maintainers can refresh the pinned Basecoat snapshot only with an explicit immutable
commit source, for example `npm run sync -- --ref <40-character-commit-sha>`.
This is the only command that uses HTTPS. It validates schema, exports, notices,
response budgets, version direction, and atomic replacement before changing the
registry. It does not refresh shadcn mappings or macro blocks.

## Development and verification

Install dependencies with `npm ci`, then run the focused checks:

```sh
npm run check
npm pack --dry-run
npm audit --omit=dev
```

`npm run check` type-checks, verifies both compiled snapshots, builds and runs
the Node test suite, and checks the branch diff for whitespace errors. The test
suite also exercises the packed read-only MCP bin offline. `npm pack --dry-run`
checks the package file allowlist without retaining a tarball.
`npm audit --omit=dev` checks production dependencies against the npm advisory
database and therefore requires network access. Maintainers can
verify the pinned Basecoat source with:

For release parity evidence, run the local-only routine before and after any
approved publication:

```sh
npm run release:check -- --phase=pre-release --write=tmp/release-pre.json
npm run release:check -- --phase=post-release --write=tmp/release-post.json
```

The routine discovers surfaces from current repository metadata, compares local
authoritative values, and records `current`, `expected`, `correction`, `status`,
and `verification`. It checks package identity, server manifest parity, stdio
transport, advertised capabilities, install metadata, and restrained
discoverability copy. It never performs network requests or external writes;
GitHub, npm, the MCP Registry, and directory/catalog corrections remain
explicitly approved manual actions. Do not treat badges, download counts,
upstream references, or search-result snippets as release authority.

```sh
npm run sync -- --ref <40-character-commit-sha> --check
```

The sync command is the only network boundary. Macro authoring changes require
`npm run compile:blocks`; review the generated
`src/macros/registry.snapshot.json` and then run
`npm run compile:blocks:check`.

## Contributing

1. Create a focused branch from the default branch.
2. Keep component templates, macro contracts, and documentation aligned with
   checked-in source.
3. Run `npm run typecheck`, `npm run compile:semantics:check`,
   `npm run compile:blocks:check`, and `npm run test`.
4. Run `npm pack --dry-run` when package contents or metadata change.
5. Describe behavior changes, bounded-output effects, and any required host
   application work in the pull request.

Do not add GitHub Actions workflows. Upstream registry refreshes and macro
authoring are maintainer-reviewed changes, not server startup tasks.

## Troubleshooting

- **The server starts but reads the wrong project:** set an absolute
  `--project-root` or `BASECOAT_PROJECT_ROOT`. The fallback is the process
  launch directory.
- **`DESIGN.md` is not available:** place a regular file at the configured
  root. Parent directories and symlinks are not followed.
- **A source checkout cannot start:** run `npm run build` before `npm start`.
- **A macro result has a cursor:** request the next page with that cursor;
  do not concatenate or parse partial JSON. Changed registry, design, or
  effective rhythm revisions make prior cursors stale.
- **An apply acknowledgement includes `truncated: true`:** the mutation
  committed; reread context or validation tools for the omitted detail.
- **An importer diagnostic mentions OAuth, captcha, or an unsupported
  dependency:** implement or resolve it in the host application or reviewed
  mapping. The importer does not guess runtime behavior.
- **A design patch conflicts:** reread `get_design_context`, use its current
  revision, and send a new unique `operationId`.

See [ARCHITECTURE.md](ARCHITECTURE.md) for runtime boundaries, persistence,
packet limits, and sync policy. Report reproducible defects in the
[issue tracker](https://github.com/zygiu-zygis/basecoat-ui-mcp/issues).

## Author, license, and upstream attribution

Created and maintained by [Žygimantas Jasiulionis](https://zygimantas.jasiulionis.eu/) / Intellmedia under the [MIT License](LICENSE).

Basecoat UI is an independent MIT-licensed project by Ronan Berder. Adapted templates and metadata retain the complete Basecoat notice in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Basecoat adapts design patterns from [shadcn/ui](https://ui.shadcn.com); the notice preserves that attribution. No Basecoat CSS or shadcn source is vendored here.
