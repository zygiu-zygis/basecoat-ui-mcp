# Basecoat MCP dashboard evaluation

Date: 2026-09-30 (updated after gap-close pass)  
Consumer fixture (local only, gitignored, deletable): `tests/fixtures/offline-dashboard`  
Reference: https://ui.shadcn.com/examples/dashboard  
Design session: `offline-dash-eval@4`  
Macro registry: `ee5fa8d56415d6db8c92c8c63fc46735f2658bfd21808aae39b8cad5ffaf72dd`  
Rhythm effective: `e66453629962a7717a06a3be3022c63b8fb9c1908e504792ee538e5361196c03`  
Profiles: design `app-default`, semantic `default`, density `compact`

**Gate:** Registry / macro / validator work is landed in this pass (operator-approved). Ergonomics from the first pass remain (decision allowlist; rhythm family aliases `surface`/`border`).

**Do not push the fixture to GitHub.** It lives under `tests/fixtures/offline-dashboard/` (gitignored) for local probe and deletion. Canonical findings stay in this doc + `CHANGELOG` Unreleased.

Companion notes from the first pass also live in `tests/fixtures/offline-dashboard/MCP-EVALUATION.md` (local only).

---

## Intent vs result

### What was asked

- Offline consumer dashboard inspired by the shadcn Documents dashboard (hierarchy + interaction model, not verbatim source).
- Macro-first Basecoat MCP workflow with no invented semantic IDs, spacing tokens, component APIs, macro IDs, or FSM transitions.
- Validate composition, build, and evaluate MCP gaps with evidence.

### What shipped (local fixture only)

| Region | Reference (shadcn) | Local result (`tests/fixtures/offline-dashboard`) | Match |
|---|---|---|---|
| App shell | Sidebar + inset header + main | Same skeleton via `app-shell` / `sidebar-dashboard-shell` / `page-header` | Stronger |
| Sidebar | Brand, Home/Documents groups, icons, user footer, denser chrome | Workspace switcher, grouped nav, user footer via `sidebar-dashboard-shell`; still text-first (no lucide icons required) | Partial→Stronger |
| Header | Title Documents + Quick Create; quiet chrome | Menu toggle + breadcrumb + Quick Create | Partial |
| KPI row | Four metric cards, responsive 1→2→4 | Four KPIs; macro emits `md:grid-cols-2 xl:grid-cols-4` | Strong |
| Chart | Total Visitors, dual series, date range | SVG area chart (no Chart.js) + pill `segmented-toggle` radiogroup | Stronger |
| Table | Tabs, toolbar, outline table, pagination | Tabs + status filter + table + pager under canvas `records` | Partial |
| Mobile nav | Reference hides live shell below `md` | Basecoat sidebar collapses (`aria-hidden` + `inert`) with Menu toggle | Different (acceptable) |

### Verdict (after gap-close)

**Information hierarchy remains recognizable** and is now expressible as a **single design graph** (`dashboard-workspace` metrics + activity + records).  
**Visual/interaction fidelity improved** vs the 2026-09-30 baseline (4-up KPIs, canvas card policy, compact density, SVG chart + segmented toggle) without inventing MCP contracts.

Remaining human judgment: iconography polish, table interaction density (row menus/drag), and pixel parity with shadcn chrome.

---

## Before / after registry evidence

| Gap (baseline) | After |
|---|---|
| `get_macro_block(data-records)` → opaque `UNKNOWN_BLOCK` | `EXPECTED_BLOCK_GOT_RECIPE` with recipe id, steps, root block |
| `app-shell` content `max:1` forced KPI **or** table | `dashboard-workspace` holds metrics + activity + records |
| `dashboard-main` three cards / `xl:grid-cols-3` | Four cards / `xl:grid-cols-4` |
| `data-filters` `gap-3` outside rhythm | Remapped to `gap-2`; compiler rejects unapproved Emmet spacing |
| Nested cards forced invented wrappers | Canvas markers allow cards in approved canvas; true card-in-card still errors |
| Spacing warnings flooded dense chrome | `densityProfile: "compact"` + micro-chrome suppression |
| `semantic-token-available` spam | Deduped by `approvedUtility` |
| Wrong DESIGN.md / silent project root | `projectRoot` on begin/session receipts |
| Missing sidebar/chart/toggle macros | `sidebar-dashboard-shell`, `svg-area-chart`, `segmented-toggle` |
| `validate_composition` 64 KiB | Shared **256 KiB** UTF-8 limit |

---

## Validation snapshot (after)

| Check | Result |
|---|---|
| `validate_design` on packaged `workspace-dashboard` | draft ok (graph tests) |
| `validate_composition` on fixture HTML (`semanticProfile: default`, `densityProfile: compact`) | `valid:true`; **0** spacing-rhythm; **0** nested-cards; advisory semantic warnings capped/deduped |
| Consumer typecheck / build | pass |
| MCP `npm test` | pass (**171**) |
| `compile:blocks:check` / `compile:semantics:check` / `typecheck` | pass |
| Fixture stays gitignored | verified (`git check-ignore`) |
| Browser local preview | hierarchy: shell → 4 KPIs → visitors (SVG + segmented) → documents table |

---

## Live compare notes

### Baseline (2026-09-30)

1. Sidebar chrome thinner than reference.
2. KPI grid wrapped at wide desktop (`xl:grid-cols-3`).
3. Chart range controls cramped; Chart.js required.
4. Table interaction thinner than reference.
5. Density felt sparse vs shadcn demo.

### After gap-close

1. KPI row lands four-across at `xl` via macro contract.
2. Chart is zero-runtime SVG; date range uses pill radiogroup.
3. Operate canvas hosts KPI/chart/table cards without invented Tailwind chrome.
4. Compact validation no longer floods micro-spacing warnings on nav/badge/table cells.
5. Still not pixel-perfect vs shadcn (icons, row menus, polish).

---

## Top gaps status

1. **Single graph for KPI + chart + table** — fixed (`dashboard-workspace` + recipe).
2. **Four KPI slots** — fixed.
3. **Project-root receipts** — fixed (`projectRoot` surfaced); still document per-host `--project-root` for Cursor.
4. **Decision allowlist** — fixed earlier in tree.
5. **Rhythm family aliases** — fixed earlier; compile check now guards macro Emmet spacing.
6. **Recipe-as-block UNKNOWN_BLOCK** — fixed (`EXPECTED_BLOCK_GOT_RECIPE`).
7. **Compact density / nested canvas / primitives** — fixed per plan Phases C–D.

---

## Already applied (this pass + prior ergonomics)

1. Decision allowlist hint (`src/macros/store.ts`).
2. Rhythm family aliases (`src/semantics/tools.ts`).
3. Recipe/block diagnostic, dashboard graph, compact validation, 256 KiB limit, projectRoot receipts, sidebar/SVG/segmented macros + leaves, Astro FSM vs controller docs.
4. Tests green at **171**. Fixture updated locally; remains gitignored.

---

## Next-session prompt (copy)

Use only if further polish is needed beyond this gap-close:

```text
Repo: <project-root>/basecoat-ui-mcp
Read docs/mcp-dashboard-eval.md (after gap-close).
Keep tests/fixtures/offline-dashboard gitignored.

Optional polish: nav icons, table row interactions, pixel density vs
https://ui.shadcn.com/examples/dashboard — without inventing MCP contracts
or renaming public tools.
```
