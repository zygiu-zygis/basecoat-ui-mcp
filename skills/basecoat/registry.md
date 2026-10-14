# Basecoat UI Registry Architecture & Offline Integrity

The Basecoat MCP registry is an immutable, content-addressed catalog of components and macro layout blocks designed for deterministic, zero-network code generation.

## Schema Version & Standards

- **Registry Version**: `1.0.2`
- **Component Registry**: `src/registry/components.json` (storing templates, CSS/JS dependencies, and composition rules).
- **Macro Registry**: `src/macros/registry.snapshot.json` (storing layout blocks, slot targets, and compositional recipes).
- **Semantics Registry**: `src/semantics/data/semantics.snapshot.json` (storing FSM recipes, state charts, and rhythm profiles).

## Deterministic Compilation & Hash Verification

Every macro block and recipe has a content-addressed SHA-256 hash. When a design session begins via `begin_design`, the server verifies the integrity of the registry against pinned snapshots.

## Key Registry Entities

- **Blocks**: Self-contained UI layout slices (e.g. `sidebar-01`, `dashboard-01`, `metrics-summary`).
- **Slots**: Explicit insertion points (e.g. `#sidebar-nav`, `#main-content`, `#header-actions`) allowing nested leaf composition without layout drift.
- **Ports**: Data inputs and events exposed by the block.
- **Recipes**: High-level page compositions combining a shell, navigation, header, and content sections.
