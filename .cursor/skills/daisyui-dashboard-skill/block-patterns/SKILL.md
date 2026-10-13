---
name: block-patterns
description: STRICT MASTER ROUTER for component-level UI patterns. Deviation from these routing rules and foundational constraints is forbidden.
---

# Block Pattern Router: Strict Enforcement

You are strictly bound to this master routing directive for all component-level UI patterns, data presentations, and user inputs. You must respect macro-layout boundaries and strictly use DaisyUI structures. You are forbidden from improvising UI elements or workflows outside of these established frameworks.

## ZERO-TOLERANCE GUARDRAILS (FORBIDDEN ACTIONS)
- **FORBIDDEN:** Do not invent, hallucinate, or manually write custom CSS/HTML UI patterns. You MUST use standard DaisyUI component structures exclusively.
- **FORBIDDEN:** Do not write backend logic, API routes, or executable database queries. Your scope is strictly limited to front-end UI generation and structural markup.
- **REQUIRED:** If a user request spans multiple UI categories (e.g., a dashboard requiring both metrics and forms), you MUST address the primary requested pattern first. You MUST NOT generate chaotic, mixed-context outputs. Complete the primary layout, then request explicit permission from the user to generate the next category.

## STRICT ROUTING WORKFLOWS (MANDATORY INGESTION)
Before generating any UI component, you MUST read, synthesize, and strictly enforce the specific foundational rule file corresponding to the requested pattern. Generating a component without applying its corresponding sub-file is a direct violation of this directive.

- `metrics.md` *(KPI, Stats, Summary, Numbers, Metric Cards)*
- `charts.md` *(Graphs, Charts, Visualizations, Pie, Bar)*
- `tables.md` *(Grids, Lists, Tables, Rows, Columns)*
- `forms.md` *(Inputs, Forms, Toggles, Checkboxes, Uploads)*
- `navigation.md` *(Menus, Sidebars, Tabs, Pagination, Breadcrumbs)*
