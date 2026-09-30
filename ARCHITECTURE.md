# Architecture

Author and maintainer: **Žygimantas Jasiulionis / Intellmedia**.

## Runtime boundaries

```text
MCP client --stdio--> dist/server/stdio.js -> dist/server/index.js
                                                |- tools/search.js -> registry.index
                                                |- tools/details.js -> registry.details[id]
                                                |- tools/validate.js -> HTML/script lexer
                                                |- macros/* -> design sessions + block blueprints
                                                `- design resources -> rhythm / Astro / host DESIGN.md

Maintainer only: scripts/sync.ts --HTTPS--> Basecoat GitHub (explicit commit SHA)
                              `- validate -> atomic components.json replacement
Maintainer only: scripts/compile-blocks.ts -> src/macros/registry.snapshot.json
Maintainer only: scripts/import-blocks.ts --local files--> src/macros/authoring/blocks
```

The build compiles `src/` into the ignored `dist/` directory. The server never
imports the sync entry and has no HTTP client, remote documentation dependency,
frontend framework runtime, vector store, or cache service. Production
dependencies are `@modelcontextprotocol/sdk` and `zod`; TypeScript and tsx are
development-only.

The package-facing commands are:

- `npm run build` - compile `src/` to `dist/`.
- `npm run check` - type-check, verify both compiled snapshots, build and test,
  then check the complete working tree against `origin/main` for whitespace errors.
- `npm run start` - run the compiled stdio server.
- `npm run typecheck` - type-check with `tsconfig.check.json`.
- `npm run test` - build, then run `tests/*.test.ts` with Node's test runner.
- `npm run compile:semantics` and `npm run compile:semantics:check` - write or
  verify the compiled semantic snapshot.
- `npm run compile:blocks` and `npm run compile:blocks:check` - write or verify
  the compiled macro snapshot.
- `npm run import:blocks` - import local authoring inputs.
- `npm run sync` - maintainer-only pinned upstream refresh.

The runtime registers eleven tools:

- Component tools: `search_components`, `get_component_details`, and `validate_composition`.
- Macro tools: `search_macro_blocks`, `get_macro_block`, `begin_design`, `get_design_context`, `apply_design_patch`, and `validate_design`.
- Semantic tools: `get_rhythm_rules` and `get_fsm_recipe`.

It also registers exactly three resources: `basecoat://design/rhythm`,
`basecoat://integration/astro`, and `basecoat://project/context`.

Macro layout contracts are project-specific blueprints compiled into
`src/macros/registry.snapshot.json`. They are not features supplied by shadcn or
by MCP itself. Design sessions persist under
`<projectRoot>/.basecoat/designer/` with a content-addressed registry revision
(`r:<hash>`) and immutable design snapshots (`d:<designId>@<revision>`).

## Semantic boundaries and compilation

The semantic registry provides compiled rhythm profiles and FSM recipes from `src/semantics/semantics.snapshot.json`. Runtime startup reads this packaged snapshot from the source package layout, including when execution begins in `dist/`. It never creates or rewrites package files. Only the explicit `compile:semantics` authoring command writes the snapshot.

Rhythm profiles keep a semantic ID separate from its approved Tailwind utility. The ID is design metadata; the utility is executable class text. FSM recipes define states, events, transitions, guards, and metadata-only actions. They are not runtime implementations.

Both semantic tools use content-addressed refs, bounded pagination, and immutable snapshots like macro tools. The loader verifies every record key against its canonical content hash, checks alias targets and identities, then verifies the registry revision. Project-local rhythm overrides at `<projectRoot>/.basecoat/rhythm.json` produce an effective profile ref and revision without mutating the packaged snapshot. Overrides are limited to 65,536 UTF-8 bytes. The loader refuses a symlinked `.basecoat` directory, a symlinked or non-regular override file, paths that resolve outside the project root, and oversized or schema-invalid content. Matching override IDs replace base mappings in place and keep the packaged mapping order. Missing or rejected overrides leave the packaged profile unchanged. Changed valid overrides invalidate prior cursors.

## Package boundary

Git omits generated `dist/`. Published npm tarballs include prebuilt `dist/`
because `prepack` runs `npm run build`, and the `basecoat-ui-mcp` bin points at
`dist/server/stdio.js`. The `files` allowlist still ships `src/`, scripts,
tests, and documentation for source inspection. Cloned checkouts must run
`npm run build` before `npm start`.

The package contract test runs after the suite build, creates and extracts an
actual npm tarball, copies the already-installed production dependency closure,
marks the extracted package tree read-only, and starts the extracted
`dist/server/stdio.js` with a network tripwire. It completes MCP initialize,
lists all eleven tools and three resource URIs, and exercises
`get_rhythm_rules`, `get_fsm_recipe`, `begin_design`, and `validate_composition`
before asserting that designer writes land only under the configured project
root.

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

The registry currently ships **41** curated index and detail pairs. Upstream sync discovers a broader set (41 components in the pinned snapshot, including `pagination` and `spinner` not present in the index).

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
| Macro tool results (full `CallToolResult`, including `isError`) | 1,999 UTF-8 bytes | Domain error (`PACKET_TOO_LARGE` / pagination) for reads; committed mutations acknowledge with optional `truncated: true` instead of hiding the commit |
| Semantic tool results (`get_rhythm_rules`, `get_fsm_recipe`) | 1,999 UTF-8 bytes | Domain error (`PACKET_TOO_LARGE` / pagination); no truncation |
| `search_components` | 8 summaries, schema-bounded fields | N/A |
| `validate_composition` input | 256 KiB (262,144 UTF-8 bytes) | Error issue |
| `validate_composition` output | 24 issues max | `truncated: true`, `errorsOmitted` when capped errors were dropped |
| `DESIGN.md` read | 6,000 UTF-8 bytes emitted | Truncate on last newline or `. ` boundary inside cap |

`assertDetailBudget` runs at server startup, on each detail request, during sync, and in tests. Macro tools use `boundedMacroResult` / `pageRecords` and measure the final serialized `CallToolResult`. The bound is intentionally below 2,000 bytes without embedding a model-specific tokenizer.

Macro packets are deterministic JSON envelopes. Search, block sections,
context views, and validation diagnostics page with opaque cursors tied to the
current query and registry or design snapshot. A changed snapshot makes an old
cursor stale instead of returning an ambiguous continuation. Oversized content
fails closed; the server does not cut JSON or HTML to fit.

## Macro composition tools

Macro tools operate on the compiled block and recipe registry and on
project-scoped filesystem sessions:

1. `search_macro_blocks` finds blocks by query, role, family, tag, or compatible
   slot context.
2. `get_macro_block` pages a block's manifest, structure, slots, ports, rules,
   dependencies, or provenance.
3. `begin_design` creates a session and pins the selected profile and registry.
   Pinned registry files are re-validated with content-hash integrity on load.
4. `get_design_context` reads `sessions`, `overview`, `decisions`, `graph`,
   `rules`, `focus`, or `next`.
5. `apply_design_patch` applies atomic graph operations using
   `expectedRevision` and an idempotent `operationId`. After a successful
   commit, the tool always returns a success acknowledgement; oversized
   optional fields such as validation reports may be omitted with
   `truncated: true`.
6. `validate_design` validates a draft or complete graph and pages diagnostics.

One supported flow is:

```text
begin_design
  -> search_macro_blocks
  -> apply_design_patch(instantiate_recipe)
  -> get_design_context
  -> get_macro_block
  -> implement component leaves in the host project
  -> apply_design_patch(record_written)
  -> validate_design(complete)
  -> validate_composition
```

`validate_composition` is the source-level check after graph validation; it is
not one of the six macro tools.

Consumer rule template: `templates/cursor/basecoat-designer.mdc` (copy into a host project's `.cursor/rules`; the server never writes consumer app sources).

## Host project context

Project root comes from `--project-root`, then `BASECOAT_PROJECT_ROOT`, then
the launch directory. Only `DESIGN.md` in that exact directory is read; there
is no parent traversal. Symlinks and non-regular files are refused. Each
resource request re-reads the file so edits are visible immediately. Content is
labeled untrusted design data.

The server writes only its own `.basecoat/designer/` store. Immutable publication
fsyncs the temporary file and directory before linking the final name, then
fsyncs the directory after the link. Unsupported directory fsync behavior is
handled only on affected platforms. A rare post-link sync failure leaves the
already committed mutation visible and increments an inspectable process-local
durability-failure counter instead of reporting a false failed mutation.

The server does not write
Astro, HTML, CSS, JavaScript, package, route, auth, or infrastructure files.
The host application owns rendering, data fetching, session and credential
handling, OAuth, captcha, and all other runtime integration.

## Source adaptation and sync policy

The shadcn adaptation path is local-only and authoring-only:

```text
local registry-item.json + reviewed mapping + dependency-lock.json
                         |
                         v
             scripts/import-blocks.ts
                         |
                         v
       curated Basecoat macro authoring block
```

The importer rejects URL-shaped source paths, never fetches a live shadcn registry,
never installs or executes upstream code, and records source hashes plus
`sourceKind: local-shadcn-registry-item` for adapted blocks. The mapping must declare
the boundary `shadcn-registry-item -> basecoat-macro` with `layout: curated`.
Unknown, unlocked, and unsupported dependencies, omitted OAuth/captcha features,
and host application integration requirements are emitted as diagnostics. They
are not silently converted into Basecoat components.

Layout contracts in `slots`, `ports`, `rules`, `layout`, and recipes are this
project's curated macro layer. They are not supplied by shadcn or by MCP. The
importer adapts structural intent; it does not claim to import an upstream layout
contract or application behavior. OAuth, captcha, session, credential, and
runtime API behavior remains an explicit host-application obligation.

`npm run sync -- --ref <40-character-commit-sha>` is the only network boundary.
The command requires an explicit immutable commit SHA; it never resolves a moving
`latest` source:

1. Fetch the Git tree for the supplied commit SHA.
2. Read only files under that pinned tree and validate their content.

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
This Basecoat refresh command is unrelated to shadcn import mappings and does not
run during server startup or MCP requests.

## Validation scope

`validate_composition` uses a bounded HTML/Astro lexer, not an Astro AST. It returns bounded parser diagnostics with line and column, checks page-level landmark ordering without treating nested component headers or footers as page landmarks, and distinguishes color utilities from text alignment, border style or width, and background layout utilities. It does not execute scripts, inspect runtime interaction, resolve app modules, render, or certify accessibility or visual design.

## Development guidelines

Do not use emoji in tracked project files, including code, documentation, tests,
logs, templates, generated snapshots, and comments. Use ASCII text instead.

## Verification

Recommended local checks:

```sh
npm run typecheck
npm run build
npm run compile:semantics:check
npm run compile:blocks:check
npm run test
npm pack --dry-run
npm audit --omit=dev
```

`npm audit --omit=dev` is the only listed verification command that needs the
npm advisory service. It is not part of server runtime.

`npm run test` builds first and runs the Node test runner. Coverage includes
registry invariants, search ties, complete detail budgets, host context
isolation, sync failure modes, and stdio protocol smoke against a compiled
child with a network tripwire. `npm pack --dry-run` verifies the package
allowlist without creating a tarball.

Upstream Basecoat code and adapted examples remain MIT by Ronan Berder. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
