# Changelog

Maintained by **Žygimantas Jasiulionis / Intellmedia**.

## 1.7.1 - 2026-10-14

- **Shadcn v4 Chart Ingestion Engine (`scripts/ingest-shadcn-charts.mjs`)**:
  - Ingested 56 theme-aware chart blueprints across 7 categories (`area`, `bar`, `line`, `pie`, `radar`, `radial`, `tooltip`) directly into `src/data/catalog/charts-catalog.json`.
  - Every blueprint enforces a responsive layout footprint (`w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]`), glassmorphic tooltip styling (`bg-background/95 backdrop-blur-sm border border-border shadow-md rounded-lg p-2 text-xs` with `data-chart-tooltip`), and an accessible `<table class="sr-only">` fallback with complete tabular data rows.
  - Multi-framework mount templates for all 5 frameworks (`vanilla`, `astro`, `react`, `vue`, `svelte`) with pure Basecoat CSS tokens (`var(--chart-1)` through `var(--chart-5)`).
- **Enhanced Chart Tooling Layer (`basecoat_list_charts` & `basecoat_get_chart_blueprint`)**:
  - `src/tools/list-charts.ts`: Added multi-term search filtering via `search` and `query` parameters, returning `layoutFootprint`, `requiredTokens`, `cssTokens`, and category tags.
  - `src/tools/get-chart-blueprint.ts`: Added `chartId` parameter support (with `id` fallback defaulting to `area-default`), custom `themeTokens` CSS variable replacement across HTML, mount code, and options, and unified return payload.
  - Re-exported both tools from `src/tools/charts.ts` for backward compatibility.
  - Added skill resource URI registration aliases (`basecoat://skills/files/charts/*` alongside `basecoat://skills/files/basecoat-charts/*`) in `src/server/index.ts`.
- **Macro Blocks Upgrade & Dashboard-01 Chart Integration**:
  - Upgraded `src/macros/authoring/blocks/dashboard-01.json` with dedicated slots (`topbar`, `kpi`, `chart`, `recent-sales`, `table`), responsive grid column spans (`lg:col-span-4` and `lg:col-span-3`), approved optical rhythm spacing utilities, strictly bounded Emmet fragment (1174 chars, `<= 1200`), and bound `data-chart-id="area-interactive"`.
  - Upgraded `src/macros/authoring/blocks/svg-area-chart.json` with `chart-container`, `role="img"`, and `data-chart-id="area-interactive"`.
  - Upgraded `src/macros/authoring/recipes/workspace-dashboard.json` referencing `chart-id: area-interactive`.
  - Recompiled snapshot `src/macros/registry.snapshot.json` with verified SHA256 integrity.
- **Skill Vault & Cross-Editor Mirroring**:
  - Updated `skills/basecoat-charts/SKILL.md` and audit checklist with v4 chart blueprint specifications, responsive layout footprint, accessibility table fallbacks, and multi-framework mounts.
  - Synchronized skills vault generation script `scripts/build-skills-vault.mjs`.
  - Mirrored skill vault to `~/.cursor/skills/basecoat-charts/` and `~/.gemini/config/skills/basecoat-charts/`.
- **Verification & Test Harness**:
  - Updated `scripts/verify-catalog-counts.mjs` with 23 assertions validating layout footprints, container classes, glassmorphic tooltips, and screen-reader tables.
  - Expanded `tests/charts.test.ts` to test all 56 charts, search filtering, chartId aliases, theme token overrides, and dashboard-01 embedded chart resolution.
- **Comprehensive 22-Tool Offline Protocol**:
  - Expanded the MCP protocol surface to 22 offline tools:
    - `basecoat_setup_config`: Automated configuration and boilerplate generator for 6 framework targets (`astro`, `vanilla`, `nextjs`, `sveltekit`, `vite`, `htmx`), 8 style packs (`vega`..`rhea`), OKLCH theme variables, and no-flash dark mode scripts.
    - `basecoat_page_architect`: Scaffolds full layouts across 5 dashboard page archetypes with container contracts and slot topology.
    - `basecoat_compose_stack`: Composes 41 pre-built component stacks across 7 categories into canonical shells (`sidebar-01`..`16`, `topbar-shell`, `inset-shell`, `split-shell`) with slot hydration.
    - `basecoat_rules_enforcer`: Enforces technical constraints across Tailwind CSS v4, FSM state contracts, and accessibility rules (`MET-01`, `TBL-01`, `FRM-01`, `NAV-01`, `TW4-01`, `TOK-01`, `FSM-01`, `SEM-01`).
    - `basecoat_creative_director`: Surfaces Kanso minimalism, 4px/8px optical rhythm grid, typography ladders, density profiles, and contrast pairings.
    - `basecoat_component_syntax`: Delivers copy-pasteable component markup with FSM state variants and inline SVG action icons.
    - `basecoat_list_charts` & `basecoat_get_chart_blueprint`: 56 theme-aware chart blueprints across 7 categories (`area`, `bar`, `line`, `pie`, `radar`, `radial`, `tooltip`) with pure Basecoat CSS tokens (`var(--chart-1)`..`var(--chart-5)`) and 5 framework mounts (`vanilla`, `astro`, `react`, `vue`, `svelte`).
    - `basecoat_quality_inspector`: Audits HTML/Astro markup with score (0-100), letter grade (A-F), syntax violations, accessibility omissions, and auto-fix suggestions.
    - Component tools: `search_components`, `get_component_details`, `get_component_html`, `validate_composition`, `validate_markup`.
    - Macro tools: `search_macro_blocks`, `get_macro_block`, `begin_design`, `get_design_context`, `apply_design_patch`, `validate_design`.
    - Semantic tools: `get_rhythm_rules`, `get_fsm_recipe`.
- **Complete MCP Resource Endpoints (8 Resources)**:
  - Added 3-pillar Skill Vault endpoints: `basecoat://skills/core`, `basecoat://skills/dashboard`, `basecoat://skills/charts`, and `basecoat://skills/files/*` dynamic file lookup.
  - Core architectural endpoints: `basecoat://design/rhythm`, `basecoat://design/theming`, `basecoat://integration/frameworks`, and `basecoat://project/context`.
- **Authoritative Catalog Expansion**:
  - **61 Curated Components**: All 57 `shadcn/ui` new-york-v4 primitives + Basecoat extensions with verified HTML/Astro templates, zero React runtime dependencies, and FSM state contracts.
  - **84 Macro Blocks & Aliases**: Full library covering canonical sidebars (`sidebar-01..16`), dashboards (`dashboard-01..07`), auth (`login-01..05`, `signup-01..05`, `otp-01..05`), and core application blocks (`mail`, `tasks`, `forms`, `products`, `analytics`, `billing`, `settings`).
  - **11 Page Recipes**: End-to-end multi-page layout graphs (`workspace-dashboard`, `ecommerce-overview`, `analytics-workspace`, `workspace-settings`, `workspace-detail`, `tasks-table-workspace`, `mail-workspace`, `auth-flow`, `auth-split-flow`, `data-records`, `marketing-pricing`).
  - **41 Composable Component Stacks**: Composable stacks across 7 categories (`shell-stacks`, `header-stacks`, `kpi-stacks`, `chart-stacks`, `table-stacks`, `overlay-stacks`, `form-stacks`) with slot hydration into canonical shells.
  - **56 Theme-Aware Chart Blueprints**: Visualizations across 7 categories mapped to CSS tokens (`var(--chart-1)`..`var(--chart-5)`) with mounts for 5 frameworks.
  - **95 Markdown Files across the 3-Pillar Skill Vault**: Distributed across `skills/basecoat` (core foundations and 57 component guides), `skills/basecoat-dashboard` (dashboard architecture, block patterns, and audit checklist), and `skills/basecoat-charts` (ApexCharts blueprints and token mapping).
- **Dashboard Intelligence Ingestion & 5 Core Scaffolds (`basecoat_page_architect`)**:
  - Full coverage of 5 key dashboard page archetypes with responsive container grids, explicit slot topology, and density profiles (`compact`, `comfortable`):
    - **Executive Dashboard** (`workspace-dashboard`, `executive-dashboard`) - KPI metric cards, revenue chart, and recent activity.
    - **E-commerce Overview** (`ecommerce-overview`) - Sales metrics, revenue analytics, top products card, and order summary.
    - **Analytics Workspace** (`analytics-workspace`) - Filter toolbar, time-series chart, and cohort analysis breakdown.
    - **Data Table Detail** (`workspace-detail`, `data-table-detail`) - Paginated data table with search/filters and slide-over inspection drawer.
    - **Settings Split-Screen** (`workspace-settings`, `settings-split-screen`) - Two-column responsive layout with vertical section navigation and form controls.
- **Dashboard Audit Rules & Precision Enforcement (`validate.ts` & `basecoat_rules_enforcer`)**:
  - Added `table-overflow-wrapper`: Data `<table>` requires an `overflow-x-auto` wrapper to prevent horizontal mobile viewport blowout.
  - Added `kpi-metric-tabular-nums`: Large KPI numerals (`text-2xl`..`text-5xl`) require `tabular-nums` for digit vertical alignment.
  - Added `table-numeric-alignment`: Numeric table cells with `tabular-nums` require right-alignment (`text-right` or `text-end`).
  - Added `a11y-focus-ring`: Flags `outline-none` on interactive elements unless accompanied by a visible focus ring (`focus-visible:ring-2 focus-visible:ring-ring`).
  - Added `MET-01`, `TBL-01`, `FRM-01`, and `NAV-01` rules to `basecoat_rules_enforcer` for inline code checking.
- **Composite Component Patterns & Full FSM State Variants (`basecoat_component_syntax`)**:
  - Added composite patterns for `metric-card` (KPI card with tabular-nums and trend badge), `data-table` (sticky header table in `overflow-x-auto` with right-aligned numeric cells), and `sidebar-shell` (sticky desktop navigation with responsive flyout below `md`).
  - Supported all FSM lifecycle states: `default`, `active`, `loading`, `disabled`, `open`, `closed`, and compound `open/closed`.
- **Ingestion of Translated shadcn/ui v4 Blocks & Multi-Block Recipes**:
  - Compiled and registered 84 block blueprints: `sidebar-01` through `sidebar-16`, `dashboard-01` through `dashboard-07`, `login-01` through `login-05`, `signup-01` through `signup-05`, `otp-01` through `otp-05`, `metrics-summary`, `data-table-rich`, `form-field-group`, `svg-area-chart`, `sidebar-dashboard-shell`, `authentication`, `forms`, `tasks`, `mail`, `products`, `analytics`, `billing`, `settings`.
  - Compiled and registered 11 multi-block recipes: `workspace-dashboard`, `ecommerce-overview`, `analytics-workspace`, `workspace-settings`, `workspace-detail`, `tasks-table-workspace`, `mail-workspace`, `auth-flow`, `auth-split-flow`, `data-records`, and `marketing-pricing`.
- **WCAG 2.1 & APCA Contrast & Accessibility Heuristics (`validate.ts` & `basecoat_quality_inspector`)**:
  - Added `color-contrast-wcag` rule evaluating WCAG 2.1 relative luminance contrast ratios and APCA ($L_c$) thresholds across semantic surface/text token pairings (`bg-primary`, `bg-card`, `bg-muted`, `bg-destructive`, `bg-background`), flagging low-contrast pairings and suggesting canonical foreground tokens (`text-primary-foreground`, etc.).
  - Added `a11y-dialog-focus-trap` heuristic checking that modal `<dialog>` / `role="dialog"` containers include `aria-modal="true"` (when non-native) and at least one focusable exit/action control.
  - Added `a11y-aria-controls-binding` heuristic verifying that interactive triggers with `aria-expanded` bind a valid `aria-controls` target ID or reside within a managed Basecoat disclosure container.
  - Added `arbitrary-dimension` rule rejecting arbitrary bracket sizing utilities (`w-[327px]`, `h-[412px]`) in favor of the 4px/8px optical rhythm scale.
- **Intent-Driven Tooling Layer Upgrades**:
  - `get_component_html`: Registered dedicated component markup endpoint returning the HTML template and dependencies for any Basecoat component (`environment` defaulting to `html`).
  - `basecoat_page_architect`: Added block resolution fallback when `intent` or `recipe` refers to a macro block (`resolveBlockByQuery`), returning `scaffoldHtml` and `containerContract` with progressive detail budget compliance.
  - `basecoat_rules_enforcer`: Added optional `code` parameter to inspect markup snippets inline against `TW4-01` (deprecated directives/utilities), `TOK-01` (arbitrary sizing/hex colors), `FSM-01` (missing FSM `data-state`), and `SEM-01` (div soup/redundant wrappers), returning compact `violations` and `valid` status.
  - `basecoat_creative_director`: Formalized the 4px/8px mathematical optical rhythm grid, complete typography hierarchy (`h1`..`h3`, body, data/meta, caption, `tabular-nums`), and explicit border-contrast ratios.
  - `basecoat_component_syntax`: Added `'open/closed'` compound state variant normalizing interactive open FSM attributes (`data-state="open"`) and returning `toggleStates: ['open', 'closed']`. Synchronized child `<dialog>`/`<details>` `open` attributes and `aria-expanded` trigger states when requesting `open` or `closed` state variants.
  - `basecoat_quality_inspector` & `validate.ts`: Unified Tailwind v3 (`tailwind-v3-directive`, `tailwind-v3-deprecated`), FSM contracts, and landmark div checks directly inside `validateComposition`, eliminating duplicate AST traversals and surfacing structured `ariaOmissions` alongside `accessibilityOmissions`.
- **Clean Generation Rules & Multi-Platform Plugin Manifests**:
  - Updated `templates/cursor/basecoat-designer.mdc` and `.cursor/rules/basecoat.mdc` with strict Clean Generation Standards (no redundant explanatory prose, no duplicate wrapper containers, deterministic Tailwind class ordering).
  - Added `.cursor-plugin/plugin.json` and `.claude-plugin/plugin.json` supporting stdio MCP transport across Cursor, Claude Desktop, and Claude Code.
- **Validator Precision**:
  - Restored and properly scoped `oversized-header` to `<header>`, `.page-header`, `data-role="header"`, and `role="banner"`.
  - Refined `card-double-border` to ignore `subcard` variants and `border-0`/`border-none` resets, flagging only true border utility collisions on `.card`.
  - Expanded allowed sidebar layout offsets to `60`, `64`, and `72` (`15rem`, `16rem`, `18rem`).
  - Mapped `.slider` class to the `range` JS module check.
  - Added `theme-meta-color-scheme` validator check to warn against `<meta name="color-scheme" content="light dark">` leaking dark OS controls into class-based dark mode setups.
- **Quality Inspector & Primitives**:
  - Registered `sidebar` (`expanded`, recipe `navigation`) in `INTERACTIVE_PRIMITIVES`.
  - Scoped `semantic-div-nesting` to documents or layouts (`<html>`, `<body>`, or `>= 10` elements with `>= 6` divs), eliminating false positives on small leaf component snippets.
- **Component ID & Search Ergonomics**:
  - Expanded `ID_ALIASES` in `component-id.ts` to resolve common agent queries (`sheet` -> `drawer`, `modal` -> `dialog`, `dropdown`/`menu` -> `dropdown-menu`, `range` -> `slider`, `nav`/`navigation` -> `sidebar`, `check` -> `checkbox`, `radio` -> `radio-group`, `toggle` -> `theme-switcher`).
  - Expanded search synonyms in `search.ts` (`sheet`, `dropdown`, `menu`, `nav`, `navigation`, `range`, `toggle`, `check`, `radio`, `pill`, `chip`, `popup`, `flyout`, `palette`, `notification`, `banner`, `spinner`, `loading`, `kpi`, `metric`).
- **Semantics & FSM Aliases**:
  - Added `FSM_RECIPE_ALIASES` in `handleGetFsmRecipe` to gracefully resolve `sidebar` (`navigation`), `modal`/`drawer`/`sheet` (`dialog`), `dropdown`/`accordion`/`select`/`popover` (`collapsible-navigation`), and `auth`/`login` (`auth-flow`).
- **Dark Mode Native Select & Inline Action Icons**:
  - Added native `<select>` and `<option>` dark mode CSS rules (`color-scheme: dark`) to `basecoat://design/theming` and `TOK-01` in `basecoat_rules_enforcer`.
  - Added optional `icon` parameter to `basecoat_component_syntax` (`plus`, `edit`, `trash`, `search`, `chevron-down`, `check`, `external-link`) delivering verified inline SVG icon snippets while strictly bounding responses within `MAX_DETAIL_BYTES` (`<= 1999` bytes).
- **Test Harness Portability**:
  - Replaced repo-relative `../tmp/` scratch directories in tests with `os.tmpdir()` (`mkdtempSync`), ensuring tests run reliably across read-only or containerized mounts.

## 1.7.0 - 2026-10-07

- **4-Stage Intent-Driven Tooling Layer**: Added 5 high-level, bounded (`<= 1999` UTF-8 bytes) MCP tools atop the offline registries while keeping all 11 existing tools backward-compatible:
  - `basecoat_page_architect`: Searches and retrieves complete layout scaffolds (`workspace-dashboard`, `auth-split-flow`, `workspace-detail`, `workspace-settings`, `data-records`, `auth-flow`, `marketing-pricing`) with explicit slot topology, container grid contracts, and leaf component IDs.
  - `basecoat_rules_enforcer`: Exposes an indexed technical rule set enforcing strict Tailwind CSS v4 syntax (banning v3 `bg-opacity-*`, `flex-shrink-*`, `@tailwind` directives), mandatory FSM `data-state` contracts, semantic CSS variable tokens (`--color-primary`, `--color-surface`), and semantic HTML5 landmarks.
  - `basecoat_creative_director`: Surfaces Kanso minimalism, typography ladders, optical spacing rhythm, visitor job density profiles, contrast rules, and Basecoat style packs (`vega`..`rhea`).
  - `basecoat_component_syntax`: Delivers copy-pasteable HTML/Astro component markup pre-bound with FSM state variants (`default`, `active`, `loading`, `disabled`, `open`, `closed`) and required JS imports.
  - `basecoat_quality_inspector`: Enhanced audit wrapper over `validate_composition` returning a `0-100` score, letter grade, categorized `syntaxViolations`, `accessibilityOmissions`, and `autoFixSuggestions`.
- **Agent Rules & Prompt Engineering**: Updated `templates/cursor/basecoat-designer.mdc` and added `.cursor/rules/basecoat.mdc` documenting the mandatory 4-step tool chaining workflow.
- **Deterministic Dashboard Generation**: Hardened the macro graph definitions (`dashboard-main`, `dashboard-workspace`, `workspace-dashboard.json`) for pixel-perfect Shadcn New York v4 `dashboard-01` parity.
- **Layout Neutrality**: Introduced `topbar-shell` and `topbar-nav` macros to support non-sidebar dashboard generation out-of-the-box.
- **Documentation & Agent Guidance**: Added `Macro-Driven Dashboard Generation` guide to `README.md` to instruct any connected LLM (Cursor, Claude, Windsurf) on utilizing `search_macro_blocks` for predictable, deterministic layouts.
- **Validator Enhancements**: Extended micro-spacing rhythm leniency (`isMicroChromeContext`) to apply equitably to both `<nav>` and `<header>` regions, removing legacy strictness that previously biased LLMs towards sidebars.
- **Rhythm Rules Leniency**: Synchronized `compiler.ts` and `validate.ts` rhythm assertions to allow the `8` (2rem) step, which is prevalent in modern Shadcn v4 padding and margins.
- **Card Styling Fix**: Resolved the `.card` double-border defect. Basecoat's Vega style pack natively styles `.card` with `ring-1 ring-foreground/10`. Eliminated explicit `border` classes to prevent stacking.
- **Icons & Assets Standards**: Enforced exclusive use of inline SVG (Phosphor/Lucide format with `size-4` / `size-6`, `currentColor`) and eliminated external React icon packages or emojis.
- **Dark Mode Flash Elimination**: Standardized on canonical Basecoat `themeMode` localStorage key with the inline head script to eliminate flash of unstyled theme, strictly prohibiting mixed `@media (prefers-color-scheme)` with `.dark` class strategies.


## 1.6.3 - 2026-10-05

- **Documentation & Registry Hygiene**: Removed broken/deprecated MCP Registry badge and external registry endpoint references from README and release runbooks, keeping clean authoritative npm and GitHub metadata.
- **Release Parity Evidence**: Added a local-only pre/post-release evidence routine that records package identity, capability, install, transport, ownership, approval, and external-surface verification state without performing network requests or publication.

## 1.6.2 - 2026-10-05

- **Authentic Theme Switcher SVGs**: Upgraded `theme-switcher` component markup in the registry from text placeholders ("L"/"D") to authentic Lucide Sun and Moon SVGs (`lucide-sun`, `lucide-moon`) with `size-8`, `size-4`, and `aria-hidden="true"`, strictly fitting within the MCP 1999-byte budget (1816 bytes) while matching upstream basecoatui.com.
- **Basecoat Style Packs (Presets)**: Documented all 8 official Basecoat style families (`Vega`, `Nova`, `Maia`, `Lyra`, `Mira`, `Luma`, `Sera`, `Rhea`) in `basecoat://design/theming` and `basecoat://integration/frameworks`. Added the Header Control Cluster pattern (Style Variant Select + Theme Switcher) for effortless site design and theme switching.
- **Cursor Designer Agent Update**: Updated `templates/cursor/basecoat-designer.mdc` to guide autonomous agents in selecting official style packs and placing paired header controls.
- **Test Coverage Expansion**: Added `tests/style-presets-and-composition.test.ts` covering style packs contracts, theme-switcher accessibility and byte bounds, full website compositions (headers, sidebar dashboard shells), and theme strategy conflict detection (200 tests passing).

## 1.6.1 - 2026-10-05

- **MCP Robustness**: Relaxed `get_macro_block` validation to allow `id` as an alias for `idOrRef` and default `section` to `manifest`, preventing agent errors when omitting parameters.
- **Design Contract**: Clarified in `basecoat://design/theming` that the system supports multiple shadcn/ui color palettes while keeping `neutral` as the default.

## 1.6.0 - 2026-10-05

- **Theming resource**: New `basecoat://design/theming` (token contract, class-based dark mode with one resolver via `window.basecoat.theme` / `themeMode`, no-flash head bootstrap, `--input` control borders, autofill reset, Latin Extended font check). Resolves common production pitfalls including dark-token leakage, duplicate theme resolvers, heavy control borders, and autofill tinting.
- **Validator**: `validate_composition` adds `theme-strategy-mixed` (media query + `.dark` class) and `theme-storage-key` (custom localStorage key diverging from `themeMode`) warnings.
- **Discoverability**: Server instructions now trigger on any basecoat-css / shadcn-look project and describe an existing-UI audit/restyle path, not only greenfield macro design.
- **Validator precision**: theme rules accept backtick quotes, ignore unrelated `localStorage` keys (e.g. sidebar state) and lookalike classes such as `.dark-mode`.
- **Agent template**: `templates/cursor/basecoat-designer.mdc` covers the audit/restyle path and theme rules.
- **Release hygiene**: 1.5.0 never reached npm or the MCP Registry (`server.json` stuck at 1.4.0 with a description over the registry's 100-character limit). Tests now read the version from `package.json`; release runbook fixed (broken markdown, missing `server.json`/MCP Registry steps, nonexistent `gh discussion` command).
- **Packaging**: the git-ignored local probe `tests/fixtures/offline-dashboard/` (incl. a 276 kB lockfile) no longer ships in the npm tarball (482 kB -> 412 kB); guarded by a package-contract test.
- **Repository**: README badges and `npx` quick start, `SECURITY.md`, issue/PR templates, `tmp/` ignored.

## 1.5.0 - 2026-10-04

- **Framework Flexibility**: Decoupled the MCP documentation and heuristics from Astro. Renamed `src/design/astro.ts` to `src/design/integration.ts` and replaced `basecoat://integration/astro` with a framework-agnostic `basecoat://integration/frameworks` endpoint (supporting Next.js, Express, HTML, Astro, etc.).
- **Strict UI Validation (Emojis & CDNs)**: Hardened `validate_composition` to explicitly reject emojis (`\p{Extended_Pictographic}`) and external CDN references for scripts or stylesheets, enforcing neutral UI and inline SVG usage (e.g. Phosphor Icons).
- **Template Safety**: Prevented syntax bugs in templates by wrapping client scripts in HTML comments, stopping raw `\n` pollution in `<head>` elements during generation.
- **New Macros**: Added `data-bulk-actions` (with responsive flex-wrap) and `product-detail-layout` to support complex dashboards and detail views.
- **Strict Palette Rules**: Updated design rhythm rules (`basecoat-designer.mdc`) to strictly forbid aggressive color choices in favor of a neutral zinc/slate palette, mimicking shadcn/ui.

## 1.4.0 - 2026-09-30

- Expanded macro block registry with 14 new and updated block blueprints covering core shadcn UI blocks in Basecoat UI (Astro & Tailwind CSS 4):
  - **Auth Blocks**: `auth-sign-in` (enhanced with GitHub/Google OAuth, divider, signup link, FSM binding), `auth-sign-up` (name, email, password, terms, OAuth), `auth-split-screen` (split-screen auth frame with left form slot and right branded hero media).
  - **Sidebar Variations**: `sidebar-inset-shell` (inset app shell with header and content canvas slots), `sidebar-collapsible-icon` (icon rail navigation with badge slots), `sidebar-mobile-flyout` (mobile drawer/flyout with backdrop and close trigger).
  - **Application & Workspace Blocks**: `settings-workspace` (profile/billing/notifications tabs and field cards), `detail-drawer-panel` (slide-over inspection drawer), `data-table-detail-layout` (data workspace hosting filters, table, pager, and slide-over detail drawer).
  - **Marketing & Content Blocks**: `pricing-tiers` (3-tier pricing table with Starter, Pro with badge, Enterprise), `newsletter-waitlist` (marketing waitlist/newsletter banner), `empty-state` (dashed border placeholder with CTA slot), `error-boundary` (404/500 error display with action buttons).
  - **Form Blocks**: `form-section` (multi-column form card with validation states, helper copy, grid layout, fieldsets).
- Added 4 new multi-page and multi-block macro recipes in `src/macros/authoring/recipes/`:
  - `auth-split-flow`: split-screen auth frame hosting `auth-sign-in` and `auth-sign-up`.
  - `workspace-settings`: inset app shell, sidebar navigation, header, and settings workspace tabs.
  - `workspace-detail`: data table layout with slide-over record inspection drawer.
  - `marketing-pricing`: pricing tiers with waitlist/newsletter banner.
  - Updated `auth-flow` with bidirectional routing between sign-in and sign-up.
- Expanded semantic FSM recipes in `src/semantics/fixtures.ts`:
  - Added `navigation` FSM recipe (`expanded`, `collapsed`, `mobile-open`, `mobile-closing`).
  - Added `auth-flow` FSM recipe (`idle`, `submitting`, `authenticated`, `error`, `recovery-requested`, `reset-required`).
  - Added `tabs` FSM recipe (`active`, `switching`, `inactive`).
  - Preserved `dialog` and `collapsible-navigation` recipes (5 recipes, 6 aliases).
- Enforced landmark composition invariants across all blocks: shells `main: 0, primaryHeading: 0`, headers `main: 0, primaryHeading: 1`, canvases `main: 1, primaryHeading: 0`.
- Enforced strict rhythm spacing steps (`0, 2, 4, 6, 12`, `auto`) and Emmet string length limit (`LIMITS.emmetMax = 1200`) across all blueprints.
- Resolved all 6 findings from the 2026-09-30 evaluation report:
  - **Budget & Pagination**: `search_macro_blocks` returns compact hit identifiers (`ref`, `id`, `role`, `family`) with search indexing retained across descriptions and tags, delivering 15+ results per page under the strict `MAX_DETAIL_BYTES = 1999` protocol budget. `pageRecords` gains an optional `maxBytes` budget override.
  - **Layout Rhythm Family**: Added the `layout` family to `DEFAULT_RHYTHM_PROFILE` in `src/semantics/fixtures.ts` (`container-max-w`, `container-prose-max-w`, `aspect-video-ratio`) and `layouts` alias in `src/semantics/tools.ts`, eliminating the `NOT_FOUND` error on `get_rhythm_rules({ profile: "default", family: "layout" })`.
  - **Recipe Alias Resolution**: `getBlock` now explicitly identifies recipe aliases and throws `EXPECTED_BLOCK_GOT_RECIPE` with complete recipe metadata, entryPage, and rootBlockId instead of generic `UNKNOWN_BLOCK`.
  - **Spacing Rhythm Deduplication & Compact Micro-Spacing**: Eliminated duplicate warnings for standard Tailwind spacing utilities (`gap-3`, `p-3`, `p-1`) when `semanticProfile` is active by consolidating off-scale violations into `semantic-hardcoded-spacing`. Enabled micro-spacing steps (`1`, `1.5`, `2.5`, `3`, `5`) in `densityProfile: "compact"` across both rhythm scale and semantic profile validation.
  - **Nested Cards Relaxation**: Downgraded `nested-cards` from fatal error (`valid: false`) to `warning` so complex dashboard panel layouts remain valid; added native allowance for nested subcards (`data-variant="subcard"`, `variant="subcard"`, `data-role="subcard"`, `card-compact`, `subcard`) without warnings.
  - **Semantic Token Available Noise**: Changed `semantic-token-available` issue severity from `warning` to `info` for approved utilities, preventing legal classes from obscuring real errors and ensuring `info` issues never displace errors/warnings at `ISSUE_CAP = 24`.
- Expanded test coverage across macro registry, semantics, composition validation, and end-to-end page context tests (181 tests passing).
- Updated Cursor rule `templates/cursor/basecoat-designer.mdc` and added design guide `docs/mcp-blocks-expansion.md`.

## 1.3.0 - 2026-09-30

- Documented offline dashboard MCP evaluation vs https://ui.shadcn.com/examples/dashboard in `docs/mcp-dashboard-eval.md`. Local disposable consumer probe lives at `tests/fixtures/offline-dashboard/` (gitignored; not for GitHub).
- Decision rejection messages now list allowed profile keys (`begin_design` / `set_decision`).
- `get_rhythm_rules` accepts singular family aliases `surface`->`surfaces` and `border`->`borders`.
- `get_macro_block` returns `EXPECTED_BLOCK_GOT_RECIPE` (with recipe id, steps, root block) instead of opaque `UNKNOWN_BLOCK` for recipe aliases such as `data-records`.
- Added `dashboard-workspace` canvas host (metrics / activity / records), four-KPI `dashboard-main` (`xl:grid-cols-4`), `dashboard-activity`, and updated `workspace-dashboard` recipe so KPIs + chart + table live in one design graph.
- Remapped `data-filters` off `gap-3`; compiler rejects macro Emmet spacing outside approved rhythm steps (`0/2/4/6/12`).
- Nested-cards stay banned; approved canvas markers (`data-role`/`data-macro=canvas`) allow cards in operate canvases.
- `validate_composition` gains `densityProfile: comfortable|compact` (compact adds `1/1.5/2.5/3/5`, suppresses micro-spacing noise in nav/badge/table cells), dedupes `semantic-token-available` by `approvedUtility`, and raises the shared UTF-8 input limit to **256 KiB**.
- `begin_design` / `get_design_context` receipts expose resolved `projectRoot`.
- Added macros + curated leaves: `sidebar-dashboard-shell`, `svg-area-chart` (no Chart.js), `segmented-toggle` (pill radiogroup). Documented sidebar FSM vs Basecoat `toggle()`/`aria-hidden`/`inert` in Astro integration guidance.
- Curated leaf count is **41** (includes MCP-only `svg-area-chart` / `segmented-toggle`; upstream inventory still 41 with `pagination`/`spinner` maintenance-only).

## 1.2.0 - 2026-09-30

- Added independent compiled semantic registry with rhythm profiles and FSM recipes under `src/semantics/`.
- Added two new read-only semantic tools: `get_rhythm_rules` for spacing, typography, surfaces, borders, and layout patterns; `get_fsm_recipe` for interaction states, events, transitions, guards, and actions.
- Enhanced `validate_composition` with bounded static-tree analysis, semantic rhythm validation, macro anchor checks, and FSM `data-state` diagnostics while preserving the existing API.
- Added optional project-local rhythm profile overrides at `<projectRoot>/.basecoat/rhythm.json` with effective content refs and cursor revisions, without mutating the packaged snapshot.
- Hardened macro subsystem with 21 additional tests covering cursor pagination, precedence, cross-process races, and immutable publication with directory `fsync`.
- Extended validation with bounded parser diagnostics, semantic ID and utility separation, bounded color matching, duplicate landmarks, and page-level structural ordering.
- Semantic tools use the same 1,999-byte bounded pagination as macro tools with content-addressed refs and deterministic cursors.
- Added canonical record, alias, and revision verification for the packaged semantic snapshot.
- Restored the `gap-12` major-section contract as `gap-rhythm-xl`.
- Hardened immutable publication ordering around directory fsync without reporting a failed mutation after its final link is visible.
- Fixed HTML diagnostics to retain exact opening positions and report inner elements implicitly closed by mismatched nesting.
- Bounded project rhythm overrides to 65,536 UTF-8 bytes and refuse final-path symlinks, non-regular files, and parent-directory symlink escape before reading.
- Preserve base rhythm mapping order when overrides replace matching IDs in place.
- Committed `begin_design` / `apply_design_patch` mutations always return a success acknowledgement; oversized optional payload such as validation reports is omitted with `truncated: true` instead of surfacing `PACKET_TOO_LARGE` after commit.
- Pinned macro registries verify content hashes via `validateRegistry` on load, not only schema and filename revision.
- Accelerated HTML line/column lookup with precomputed newline offsets after measured superlinear cost on large inputs with many tags.
- Expanded packed read-only offline package evidence to exercise semantic and macro calls and assert writes stay under the configured project root.
- Added a manual `benchmarks/runtime.bench.ts` harness (not part of `npm test`).
- Added `npm run check` for type-checking, both snapshot checks, tests, and branch whitespace validation.

## 1.1.0 - 2026-09-30

- Added six macro tools for curated block discovery, persistent project-scoped design sessions, context, atomic patches, and design validation.
- Added immutable registry snapshots, deterministic pagination, and bounded macro packets that fail closed when results exceed the response budget.
- Added an offline importer for reviewed local shadcn registry items with dependency and provenance checks.
- Documented the macro contracts and added registry, session, protocol, importer, and packet test coverage.

## 1.0.3 - 2026-09-27

- MCP server `version` now matches `package.json` (was hardcoded `1.0.0`).
- `validate_composition` accepts `html` as an alias for `code`; reports `errorsOmitted` / `issues-truncated` when errors are dropped at the 24-issue cap; allows common `item-*` anatomy hooks; accepts `data-variant="default"` on buttons; `valid` stays true when only warnings remain.
- `search_components` allows either `intent` or `query` alone; fixes `switch` vs `tabs` synonym collision; adds `theme-toggle` search alias for `theme-switcher`.
- `get_component_details` resolves `theme-toggle` to `theme-switcher` and adds a short did-you-mean hint for unknown ids.
- Stdio startup failures print the error message on stderr.
- Dependency: `@modelcontextprotocol/sdk` 1.30.1 (Zod unchanged at 4.3.6).

## 1.0.2 - 2026-09-25

- Publish runnable npm tarballs: `prepublishOnly` build, `bin`, and `dist/` in the package allowlist.

## 1.0.1 - 2026-09-24 (unpublished)

- Created the standalone source-first project with an explicit npm `files` allowlist.
- Removed the generated executable declaration and pack-time build hook so source archives do not include or generate `dist/`.
- Reworked public documentation for Astro, static HTML, exact runtime contracts, offline use, package boundaries, attribution, and AI-assisted development disclosure.
- Replaced named composition-method branding with neutral public wording while preserving the composition rules.
- Added focused contract assertions for exact curated and discovered counts, maintenance-only exclusions, and the slider controller dependency.
- **39** curated component templates in `index` and `details` (including `chart` and `slider`; slider JS module is `basecoat-css/range`).
- Rhythm resource sections: composition order, Component families, Measure, Visitor job, Structural clarity, Surface, plus spacing and typography guidance.
- `alert-dialog` template documents native `close()` with `returnValue`; application code must implement the confirmed action.
- `basecoat://project/context` reads host `DESIGN.md` with a 6,000 UTF-8 byte cap and newline or sentence boundary truncation.
- `get_component_details` fail-closed at 1,999 UTF-8 bytes for the complete JSON response; no sliced JSON.
- Sync resolves `basecoat-css` npm `gitHead`, refuses version downgrades, and does not auto-promote newly discovered upstream components into curated templates.
- Upstream discovered inventory records 41 components; `pagination` and `spinner` remain maintenance-only until curated.

- Verified `validateComposition` requires `basecoat-css/range` for `input[type="range"]`.

## 1.0.0 - 2026-09-23

- Established the standalone `@intellmedia/basecoat-ui-mcp` package.
- Added a deterministic offline JSON registry with separate search metadata and component details, verified against Basecoat 1.0.2.
- Added Button, Input, Dialog, Tabs and Table templates with explicit HTML/Astro dependencies and composition rules.
- Reduced the protocol surface to three progressive-disclosure tools and three focused resources.
- Added composition rhythm, production Astro/Tailwind 4 integration and bounded host-project `DESIGN.md` reading.
- Added lexical composition validation, migration feedback and explicit static-analysis limits.
- Replaced string truncation with complete response validation below 2,000 UTF-8 bytes.
- Added explicit upstream sync, provenance hashes, immutable revisions, atomic updates and drift checks.
