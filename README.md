# Basecoat UI MCP server for Astro and HTML

A source-first, offline Model Context Protocol server for composing [Basecoat UI](https://basecoatui.com) interfaces in Astro, static HTML, and Tailwind CSS 4 projects.

It gives AI coding tools a small, deterministic Basecoat registry instead of making every client scrape documentation. The same local stdio configuration can be used by editors and agents, with each client starting its own server process; the server makes no runtime network requests. Composition follows a fixed order: content hierarchy, layout, component selection, spacing, typography, then final review.

## Who should use it

- Agents and editors that need bounded Basecoat templates and dependency guidance.
- Astro or static HTML projects built with Tailwind CSS 4 and `basecoat-css`.
- Teams that keep project-specific design tokens and density guidance in `DESIGN.md`.

## Build and run from source

Requires Node.js **22.14.0** or newer.

```sh
npm ci
npm run build
npm start -- --project-root path/to/your/application
```

The npm package is intentionally source-only. A cloned checkout generates `dist/server/stdio.js` only when `npm run build` is run; packing the source does not build or publish generated output.

Configure an MCP client after building:

```json
{
  "mcpServers": {
    "basecoat-ui": {
      "command": "node",
      "args": [
        "path/to/basecoat-ui-mcp/dist/server/stdio.js",
        "--project-root",
        "path/to/your/application"
      ]
    }
  }
}
```

`--project-root` overrides `BASECOAT_PROJECT_ROOT`, which overrides the launch directory. It selects the host application's `DESIGN.md`; it is not the MCP installation directory. The server exposes stdio only.

## Basecoat MCP tools

- `search_components` returns up to 8 compact `{id, name, intent}` summaries and never returns markup.
- `get_component_details` returns one Astro or HTML template with dependencies and composition guidance. The complete JSON response must remain at or below **1,999 UTF-8 bytes**; oversized entries fail closed.
- `validate_composition` statically checks up to **65,536 UTF-8 bytes** of HTML or Astro source and returns at most 24 issues.

## Basecoat design resources

- `basecoat://design/rhythm` provides content hierarchy, spacing, typography, component-family, and structural composition rules.
- `basecoat://integration/astro` provides Astro, Vite, Tailwind CSS 4, selective Basecoat JavaScript, and native dialog setup.
- `basecoat://project/context` reads the configured host project's `DESIGN.md` on demand. Output is capped at **6,000 UTF-8 bytes** and truncates on a newline or sentence boundary when possible. Symlinks and non-regular files are refused.

Recommended flow:

1. Read the rhythm and project-context resources.
2. Decide content hierarchy and layout.
3. Search summaries, then request details only for selected components.
4. Read the Astro integration resource when connecting production assets.
5. Validate the final source.

## Minimal HTML example

The host application supplies its compiled Tailwind and Basecoat stylesheet:

```html
<link rel="stylesheet" href="/assets/basecoat.css">
<button type="button" class="btn" data-variant="default">Save changes</button>
```

Basecoat 1.x uses `btn` with `data-variant` and `data-size`. Interactive components list the granular JavaScript modules the host must load.

## Registry and exclusions

The checked-in Basecoat 1.0.2 registry contains **39 curated templates**:

`accordion`, `alert`, `alert-dialog`, `avatar`, `badge`, `breadcrumb`, `button`, `button-group`, `card`, `chart`, `checkbox`, `combobox`, `command`, `dialog`, `drawer`, `dropdown-menu`, `empty`, `field`, `input`, `input-group`, `item`, `kbd`, `label`, `native-select`, `popover`, `progress`, `radio-group`, `scroll-area`, `select`, `sidebar`, `skeleton`, `slider`, `switch`, `table`, `tabs`, `textarea`, `theme-switcher`, `toast`, `tooltip`

The maintenance snapshot records 41 discovered upstream components. `pagination` and `spinner` remain excluded from search and details until manually curated. Slider uses `basecoat-css/range`, not a `slider` module.

The runtime has no network client, remote documentation dependency, frontend framework runtime, remote media analysis, or bundled host assets. Generated templates may not use `basecoat-css/all`; each controller is imported explicitly. Search results do not contain markup, newly discovered components are never auto-promoted, and JSON or HTML is never sliced to fit a response budget.

## Astro and static HTML use cases

In Astro, use the integration resource for Vite, Tailwind CSS 4, CSS ordering, selective controller imports, native `<dialog>` wiring, and ClientRouter hooks. In static HTML, copy the listed built controller files from `basecoat-css` into the host application's asset directory and preserve dependency order. Chart templates require host-supplied Chart.js.

Maintainers can refresh the pinned upstream snapshot with `npm run sync`; this is the only command that uses HTTPS. It validates schema, exports, notices, response budgets, version direction, and atomic replacement before changing the registry.

## Development and verification

```sh
npm run typecheck
npm run test
npm run sync -- --check
```

Development was AI-assisted. Behavior and documentation are verified against checked-in source, contract tests, and the pinned registry rather than generated claims.

See [ARCHITECTURE.md](ARCHITECTURE.md) for runtime boundaries, packaging, byte caps, and sync policy.

## Author, license, and upstream attribution

Created and maintained by **Žygimantas Jasiulionis / Intellmedia** under the [MIT License](LICENSE).

Basecoat UI is an independent MIT-licensed project by Ronan Berder. Adapted templates and metadata retain the complete Basecoat notice in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Basecoat adapts design patterns from [shadcn/ui](https://ui.shadcn.com); the notice preserves that attribution. No Basecoat CSS or shadcn source is vendored here.
