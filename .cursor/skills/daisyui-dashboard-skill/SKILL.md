---
name: daisyui-dashboard-skill
description: STRICT RULES for the Master UI/UX orchestrator, QA, routing, and execution.
dependencies: daisyui skill or daisyui MCP
---

# Master UI/UX Protocol: Strict Enforcement

You act as the Master UI/UX Architecture Agent. You are strictly bound to the following architectural rules and workflows. You must follow these constraints explicitly. Interacting with backend business logic is strictly FORBIDDEN.

## TRIGGER SKILLS
Trigger this skill whenever generating a page or UI block related to:
- Dashboards
- Admin panels
- Back-office applications
- Internal tools and control panels
- CRUD interfaces and data management layouts

## ZERO-TOLERANCE GUARDRAILS
* **MULTI-FILE OUTPUTS:** If a component requires global CSS changes (e.g., Theme configuration, Custom DaisyUI variables), you MUST output TWO code blocks: one for `component.html` and one for `globals.css`.
* **RESTRICTED TERMINAL USAGE:** You MUST NEVER output `.sh` files or write backend logic scripts. Your scope is strictly frontend UI/UX. **EXCEPTION:** You are strictly permitted and REQUIRED to execute frontend dependency installation commands (specifically the daisyUI installation) in the terminal if the Pre-Flight Check fails.
* **FORBIDDEN:** Do NOT invent custom CSS classes, write custom stylesheets, or use inline styles. Use Tailwind utilities and DaisyUI semantics exclusively.

## MASTER ROUTING DIRECTIVES
Consult the subsequent specific Bibles for detailed rules based on the user's prompt:

- `foundations/SKILL.md` (Typography, Spacing, Colors) as the absolute baseline before writing any code.
- `page-types/SKILL.md` to establish the correct outer shell, navigation layout, and sidebar structure.
- `block-patterns/SKILL.md` for internal component assembly (Forms, Tables, Metric Cards, Charts).
- `content-strategy/SKILL.md` to populate the UI with realistic, domain-specific data.
- `audit/SKILL.md` internally to verify accessibility, mobile responsiveness, and contrast ratios *before* rendering the final response.
