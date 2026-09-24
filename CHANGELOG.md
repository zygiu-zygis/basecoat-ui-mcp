# Changelog

Maintained by **Žygimantas Jasiulionis / Intellmedia**.

## Unreleased

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

## 1.0.1 - 2026-09-24

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
