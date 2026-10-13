---
name: block-patterns/navigation
description: STRICT RULES for dashboard navigation systems (sidebars).
---

# Navigation Components

## GUARDRAILS
* **FORBIDDEN:** Never alter design-related classes on `<a>` elements inside `<li>` menu components; keep them strictly as default DaisyUI. Do not manually apply padding, text-size, color, or sizing utility classes.
* **REQUIRED:** Menu items MUST be block-level (`w-full`) to guarantee full-row hover touch targets.
* **Dropdowns:** Trigger and content MUST share the exact same immediate parent scope. Triggers need `tabindex="0"`.
* **Active States:** You MUST programmatically add or remove *only* the `menu-active` class on the specific navigation node (`<a>` tag) matching the current location/route using JavaScript. Do not change or add any other design classes for active states.
* **Width Constraints:** Sidebar wrappers MUST use fixed width utilities exactly between `w-60` and `w-64`.
* **Grouping:** You MUST use the `menu-title` class to create logical, un-clickable category headers within navigation lists.
* **Badge Alignment:** Badges rendered inside navigation items MUST be pushed to the right edge using the `ms-auto` class.
