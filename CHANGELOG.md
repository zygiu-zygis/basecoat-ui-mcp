# Changelog

Maintained by **Žygimantas Jasiulionis / Intellmedia**.

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
- **Packaging**: the git-ignored local probe `tests/fixtures/offline-dashboard/` (incl. a 276 kB lockfile) no longer ships in the npm tarball (482 kB → 412 kB); guarded by a package-contract test.
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
- `get_rhythm_rules` accepts singular family aliases `surface`→`surfaces` and `border`→`borders`.
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
