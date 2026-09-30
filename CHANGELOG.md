# Changelog

Maintained by **Žygimantas Jasiulionis / Intellmedia**.

## Unreleased

### Recommended 1.2.0 - Semantic protocol hardening

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
- Verified read-only installed-package startup with an offline network tripwire.
- The package remains at version 1.1.0. Release these changes as 1.2.0 after maintainer review.

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
- Added strict TypeScript compilation, offline stdio protocol tests, deterministic search and response-budget coverage.
- Removed the old catalog, generated documentation, site-specific layout recipes, implicit monorepo configuration, source-time launcher and cached TypeScript build state from the replacement distribution.
- Preserved Intellmedia ownership and added the complete upstream Basecoat MIT notice.
