# Architecture

Author and maintainer: **Žygimantas Jasiulionis / Intellmedia**.

## Runtime boundaries

```text
MCP client --stdio--> dist/server/stdio.js -> dist/server/index.js
                                                |- tools/search.js -> registry.index
                                                |- tools/details.js -> registry.details[id]
                                                |- tools/validate.js -> HTML/script lexer
                                                `- design resources -> rhythm / Astro / host DESIGN.md

Maintainer only: scripts/sync.ts --HTTPS--> Basecoat GitHub + npm registry gitHead
                              `- validate -> atomic components.json replacement
```

The build compiles `src/` into the ignored `dist/` directory. The server never imports the sync entry and has no HTTP client, remote documentation dependency, frontend framework runtime, vector store, or cache service. Production dependencies are `@modelcontextprotocol/sdk` and `zod`; TypeScript and tsx are development-only.

The runtime registers exactly three tools - `search_components`, `get_component_details`, and `validate_composition` - and exactly three resources - `basecoat://design/rhythm`, `basecoat://integration/astro`, and `basecoat://project/context`.

## Source-only package boundary

The npm `files` allowlist contains `src/`, `scripts/`, `tests/`, TypeScript configurations, and public documentation, licenses, and notices. There is no package `bin` declaration or `prepack` build hook. `dist/`, `node_modules/`, cache files, generated archives, and internal audit notes are excluded. A cloned checkout must run `npm run build` before `npm start`.

## Registry vs tools vs design resources

`src/registry/components.json` is one versioned document validated by `src/registry/schema.ts`:

| Section | Role | Exposed how |
| --- | --- | --- |
| `index` | Search metadata: `id`, `name`, `intent`, `categories`, `keywords` | `search_components` only |
| `details` | Dependencies, minimal markup, composition rules, optional native script | `get_component_details` only |
| `upstream` | Repository, pinned version, git revision, discovered inventory, CSS classes, source hashes | Maintenance and validator class lists; not returned by search |

Design resources are separate static or host-bound content:

- `basecoat://design/rhythm` - bundled composition guidance (`src/design/rhythm.ts`).
- `basecoat://integration/astro` - bundled production guide (`src/design/astro.ts`).
- `basecoat://project/context` - live read of host `DESIGN.md` (`src/design/project.ts`).

Search never returns markup. Details never participate in search scoring. Resources are opt-in reads, not attached to every tool response.

## Curated templates vs discovered inventory

The registry currently ships **39** curated index and detail pairs. Upstream sync discovers a broader set (41 components in the pinned snapshot, including `pagination` and `spinner` not present in the index).

New upstream components are **not** auto-promoted into `index` or `details`. Sync updates `upstream.components`, variants, classes, and hashes while preserving curated templates. Promotion requires:

- metadata and keywords for search,
- a complete minimal template under the byte budget,
- verified CSS/JS exports and root classes,
- tests and maintainer review.

This keeps tool output deterministic and bounded. Upstream demo pages are reference material, not drop-in MCP responses.

## Response byte caps

| Surface | Cap | On exceed |
| --- | --- | --- |
| `get_component_details` JSON (full MCP content wrapper) | 1,999 UTF-8 bytes | Tool error; no truncation |
| `search_components` | 8 summaries, schema-bounded fields | N/A |
| `validate_composition` input | 65,536 UTF-8 bytes | Error issue |
| `validate_composition` output | 24 issues max | `truncated: true` |
| `DESIGN.md` read | 6,000 UTF-8 bytes emitted | Truncate on last newline or `. ` boundary inside cap |

`assertDetailBudget` runs at server startup, on each detail request, during sync, and in tests. The bound is intentionally below 2,000 bytes without embedding a model-specific tokenizer.

## Host project context

Project root comes from `--project-root`, then `BASECOAT_PROJECT_ROOT`, then cwd. Only `DESIGN.md` in that directory is read; no parent traversal. Symlinks and non-regular files are refused. Each resource request re-reads the file so edits are visible immediately. Content is labeled untrusted design data.

## Sync policy

`npm run sync` is the only network boundary. Default ref resolution:

1. Fetch `https://registry.npmjs.org/basecoat-css/latest`.
2. Use the published package `gitHead` as the immutable Git tree SHA (GitHub releases can lag npm).

`buildSnapshot` then:

- refuses truncated Git trees and empty doc/CSS paths,
- refuses major version bumps without explicit maintainer review,
- **refuses downgrades** when incoming semver is lower than the pinned registry version,
- verifies curated component exports and root CSS classes still exist,
- validates every curated detail for both `astro` and `html` against the byte budget,
- compares upstream `LICENSE.md` to `THIRD_PARTY_NOTICES.md`,
- writes via same-directory atomic rename.

Extraction uses sorted, bounded fetches and regex over upstream MDX and CSS. There is no Cheerio dependency and no runtime scraping in the server.

`--check` compares a candidate snapshot to the checked-in file without writing.

## Validation scope

`validate_composition` lexes HTML structure and script imports. It checks nested cards, legacy class families, button variants, missing controllers, spacing tokens, centered layouts, and `basecoat-css/all`. It does not execute scripts, resolve app modules, or certify accessibility or visual design.

## Verification

Tests: `npm run test` (build plus Node test runner). Coverage includes registry invariants, search ties, complete detail budgets, host context isolation, sync failure modes, and stdio protocol smoke against a compiled child with a network tripwire.

Upstream Basecoat code and adapted examples remain MIT by Ronan Berder. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
