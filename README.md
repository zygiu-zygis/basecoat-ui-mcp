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

The server exposes three component tools, six macro tools, and two semantic tools. Every macro and semantic result is a bounded MCP packet of at most **1,999 UTF-8 bytes**. Larger result sets use cursors; responses are not sliced mid-JSON.

### Component tools

- `search_components` returns up to 8 compact `{id, name, intent}` summaries and never returns markup. `intent` and `query` are optional; an empty search returns an empty list.
- `get_component_details` returns one Astro or HTML template with dependencies and composition guidance. Oversized entries fail closed. `theme-toggle` resolves to `theme-switcher`.
- `validate_composition` statically checks up to **256 KiB** (262,144 UTF-8 bytes) of HTML or Astro source and returns at most 24 issues. Pass `code` or `html`, and optional `semanticProfile` or `densityProfile` (comfortable|compact). It does not render, execute, resolve application modules, or certify accessibility.

### Macro tools

The macro layer is this project's curated, project-specific composition system for shells, auth flows, data workspaces, slots, ports, rules, and recipes. It is compiled into a pinned registry snapshot. These layout contracts are not supplied automatically by shadcn or by MCP.

1. `search_macro_blocks` - find compatible blueprint blocks by query, role, family, or tag.
2. `get_macro_block` - read a block section such as `manifest`, `structure`, `slots`, `ports`, `rules`, `dependencies`, or `provenance`.
3. `begin_design` - create a persistent design session and pin its profile and registry revision. Pinned registries are hash-verified on load.
4. `get_design_context` - read session lists or focused views such as `overview`, `graph`, `rules`, `focus`, and `next`.
5. `apply_design_patch` - apply atomic graph changes with `expectedRevision` and an idempotent `operationId`. A committed mutation always returns a success acknowledgement; oversized optional payload may be omitted with `truncated: true`.
6. `validate_design` - validate a draft or complete design graph and page its diagnostics.

Design sessions persist under `<project-root>/.basecoat/designer/`. Registry revisions are content-addressed; a session keeps using its pinned revision even after the package snapshot changes. Design snapshots use the form `d:<designId>@<revision>`.

Curated block blueprints:
- **Shells & Navigation**: `app-shell`, `sidebar-dashboard-shell`, `sidebar-inset-shell`, `sidebar-collapsible-icon`, `sidebar-mobile-flyout`, `page-header`.
- **Authentication**: `auth-recovery`, `auth-reset`, `auth-sign-in`, `auth-sign-up`, `auth-split-screen`.
- **Application & Workspace**: `dashboard-workspace`, `dashboard-main`, `dashboard-activity`, `data-workspace`, `data-table`, `data-table-detail-layout`, `detail-drawer-panel`, `product-detail-layout`, `settings-workspace`.
- **Forms & Data**: `data-bulk-actions`, `data-filters`, `data-pager`, `form-section`.
- **Navigation & Utility**: `sidebar-nav`, `empty-state`, `error-boundary`, `newsletter-waitlist`, `pricing-tiers`, `segmented-toggle`, `svg-area-chart`.

Multi-block recipes:
- `workspace-dashboard` - full analytics dashboard (KPI cards, activity chart, records table).
- `workspace-settings` - application shell with navigation, header, and settings workspace tabs.
- `workspace-detail` - data table workspace with slide-over detail inspection drawer.
- `auth-flow` - bidirectional authentication flow between sign-in and sign-up cards.
- `auth-split-flow` - split-screen auth frame pairing sign-in and sign-up with hero media.
- `data-records` - records page with filters, table, and pager.
- `marketing-pricing` - 3-tier pricing table paired with newsletter/waitlist banner.

### Semantic tools

The semantic layer provides compiled rhythm profiles and finite state machine recipes:

7. `get_rhythm_rules` - access approved spacing, typography, surfaces, borders, and layout patterns by profile and family filters.
8. `get_fsm_recipe` - read interaction states, events, transitions, guards, and actions for `dialog`, `navigation` (`collapsible-navigation`), `auth-flow`, and `tabs`.

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

## Basecoat design resources

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

## Registry and exclusions

The checked-in registry contains **41 searchable templates**: 39 curated from
the Basecoat 1.0.2 upstream inventory and two MCP-only templates
(`segmented-toggle` and `svg-area-chart`):

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `card`, `chart`, `checkbox`, `combobox`, `command`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `input`, `input-group`, `item`, `kbd`, `label`, `native-select`, `popover`, `progress`, `radio-group`, `scroll-area`, `segmented-toggle`, `select`, `sidebar`, `skeleton`, `slider`, `svg-area-chart`, `switch`, `table`, `tabs`, `textarea`, `theme-switcher`, `toast`, `tooltip`

The maintenance snapshot records 41 discovered upstream components. `pagination` and `spinner` remain excluded from search and details until manually curated. Slider uses `basecoat-css/range`, not a `slider` module.

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
