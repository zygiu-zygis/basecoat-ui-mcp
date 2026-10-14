# Basecoat UI MCP Tools & Resources Reference

The `basecoat-ui-mcp` server provides 21 deterministic tools and resources to scaffold, enforce, design, audit, and validate Basecoat interfaces completely offline.

## The 4-Stage Intent Workflow Tools

1. **`basecoat_page_architect`**
   - **Intent**: Scaffolds complete page layouts (Workspace Dashboard, Auth Split-Screen, Data Table Detail, Workspace Settings, etc.).
   - **Input**: `intent`, `recipe`, `block`, `density`.
   - **Output**: Full HTML container scaffolds, grid declarations, and slotted child components.

2. **`basecoat_rules_enforcer`**
   - **Intent**: Retrieves technical rules covering Tailwind CSS v4, FSM state contracts, semantic tokens, and HTML landmarks.
   - **Input**: `category` (`all`, `tailwind-v4`, `fsm-contracts`, `tokens`, `semantic-html`, `dashboard-patterns`), `code`, `html`.
   - **Output**: Technical rule statements, forbidden syntax, and required idioms.

3. **`basecoat_creative_director`**
   - **Intent**: Surfaces visual design intelligence: typography ladders, optical spacing rhythm, whitespace density, style packs (Vega, Nova, Maia, Lyra, Mira).
   - **Input**: `topic`, `visitorJob` (`operate`, `persuade`, `read`, `experience`), `stylePack`, `density`.
   - **Output**: Prescriptive design constraints, token maps, and layout ratios.

4. **`basecoat_component_syntax`**
   - **Intent**: Provides copy-pasteable component markup with pre-configured FSM state variants (`default`, `active`, `loading`, `disabled`, `open`, `closed`).
   - **Input**: `component`, `state`, `variant`, `icon`, `environment`.
   - **Output**: Validated Basecoat HTML markup and required CSS/JS controller dependencies.

5. **`basecoat_quality_inspector`**
   - **Intent**: Automated audit returning a quality score (0-100), syntax violations, accessibility gaps, and auto-fix suggestions.
   - **Input**: `code`, `html`, `semanticProfile`, `densityProfile`, `enforceFsm`.
   - **Output**: `{ valid, score, diagnostics, autoFixes }`.

---

## Component & Discovery Tools

6. **`search_components`**: Search compact component summaries by intent or query (returns up to 8 matches).
7. **`get_component_details`**: Get one minimal component template, dependencies, and composition tips for Astro or HTML.
8. **`get_component_html`**: Fetch HTML markup template and dependencies for a Basecoat component.
9. **`validate_composition`**: Statically check HTML/Astro source for migration errors, semantic rhythm, missing scripts, and nested cards.

---

## Macro Design & Session Tools

10. **`search_macro_blocks`**: Search approved macro layout blocks by query, role, family, or tag.
11. **`get_macro_block`**: Retrieve one section of a compiled macro block blueprint.
12. **`begin_design`**: Create an idempotent, persistent design session under the host project root.
13. **`get_design_context`**: Read a focused design session view (sessions, overview, decisions, graph).
14. **`apply_design_patch`**: Apply an atomic list of design graph operations with expected revision verification.
15. **`validate_design`**: Validate design session in draft or complete mode.
16. **`get_rhythm_rules`**: Read the effective semantic rhythm profile by family and project overrides.
17. **`get_fsm_recipe`**: Read finite FSM states, events, guards, actions, or transitions.

---

## Offline MCP Resources

18. **`basecoat://design/rhythm`**: Content hierarchy, spatial rhythm, density, typography, and composition constraints.
19. **`basecoat://design/theming`**: Token contract, class-based dark mode, single theme resolver, and form control pitfalls.
20. **`basecoat://integration/frameworks`**: Production framework integration (Astro, Next.js, Express/Node, Tailwind v4).
21. **`basecoat://project/context`**: Reads `DESIGN.md` from the host project root for local project constraints.
