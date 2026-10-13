---
name: foundations
description: Sub-router for visual identity, spatial rules, typography, and baseline framework configurations.
---

# Foundations Protocol

**CORE DIRECTIVE:**
This document is the absolute source of truth for all visual, structural, and foundational decisions. You MUST follow these rules strictly in every design and coding task. Bypassing them is FORBIDDEN.

## TAILWINDCSS v4
* **FORBIDDEN:** NO `tailwind.config.js` file. NO legacy `@tailwind` directives. NO `dark:` utilities.
* **INSTEAD:** Place `@import "tailwindcss";` at the top of the main CSS file. Define tokens strictly inside the `@theme` block. DaisyUI handles theming entirely via semantic variables (e.g., `bg-base-100`, `text-primary`).

## daisyUI
* **Component Mastery:** You MUST reference the `daisyui` skill file whenever implementing DaisyUI components. It is the definitive source for deep component knowledge and correct implementation structures. Do not guess or invent component markup.

## Theme
* **Core Theme Setup:** You MUST reference the `theme.md` skill file for implementing the core-theme setup.

## SPACING
* **FORBIDDEN:** NEVER use arbitrary values (e.g., `p-[15px]`) or physical margins (`ml-*`, `mr-*`).
* **INSTEAD:** Map ALL spacing strictly to the 2px, 4px, 6px, 8px scale. Use logical properties (`ms-*`, `me-*`, `pe-*`) for RTL support.
* **Hierarchy:** `gap-6`/`gap-8` (Page level), `p-4`/`p-6` (Widget level), `gap-2` (Component level).
* **FORBIDDEN:** NEVER use `mb-*` or `me-*`. Use `gap` natively, or fallback to `mt-*` and `ms-*` only.

## AESTHETICS
* **Borders:** Use `border-base-300` strictly for borders by default.
* **Radii:** Standard containers: `rounded-box`. Circles (avatars, dots): `rounded-full`.
* **Shadows & Outlines:** Prefer `shadow-xs`, `shadow-sm` for most components. Reserve larger shadows (`shadow`, `shadow-md`, `shadow-lg`) strictly for necessary Z-axis elevation (e.g., prominent modals).
* **FORBIDDEN:** NEVER use borders (e.g., `border border-base-200` or `border-base-300`) alongside a shadow. Never use border and shadow at the same element. It creates excessive outlining. If an element has a shadow, you must remove the border.
* **Semantic Tokens:** `primary` and `secondary` strictly for primary CTAs. `success`, `warning`, `error`, and `info` strictly for feedback states.

## TYPOGRAPHY
* **Initialization & CSS Setup:** You MUST inject the Google Fonts CDN for 'DM Sans'. If importing the CDN directly within the CSS file, the `@import` statement MUST be the absolute first line of the CSS file to ensure it works correctly.
* **Global Application:** Create a CSS theme variable for the font family (e.g., `--font-sans: 'DM Sans', sans-serif;`) and apply this variable directly to the `body` tag. Never build the UI without properly initializing the font.
* **Strict Weight Limits:** The `font-bold` utility is strictly FORBIDDEN everywhere. Never use it. Use `font-semibold` extremely sparingly strictly really reserved for rare, major headers.
* **Micro-typography:** Avoid heavy weights for multi-line small text.

## ICONOGRAPHY (@iconify/tailwind4)
* **FORBIDDEN:** No raw `<svg>`. No split width/height utilities (e.g., `w-5 h-5`).
* **INSTEAD:** Use `<span class="icon-[lucide--name] size-*"></span>`.
* **Sizing:** `size-4` (Micro), `size-5` (Standard), `size-8` (Empty state). Icons MUST inherit text color.
* **Centering & Sizing Parent Elements:** When placing an icon inside any parent element, you MUST perfectly center it using `flex items-center justify-center`. The parent element MUST use explicit size utilities (e.g., `size-8`, `size-10`) for strict width and height. **FORBIDDEN:** Never use padding on the parent element to size it around an icon.
* **Positioning:** When placing an icon within a `relative` position, you MUST apply a `z-index` (e.g., `z-10`) to ensure it remains visible above the surrounding content.

## COMPONENTS
* **Avatars:** Text, initials, or icons inside avatars MUST be perfectly centered using `flex items-center justify-center`. The parent avatar element MUST use explicit dimensions (e.g., `size-10` or `size-12`) for width and height. **FORBIDDEN:** Never use padding to size an avatar. No exceptions.
* **Badges (Sizing & Positioning):** Badges attached to other elements MUST be proportionately smaller (e.g., `badge-xs` or `badge-sm`). When attaching a badge using absolute positioning on a relative parent, use negative position values (e.g., `-top-1.5 -right-1.5`) to push the badge slightly outside the main item's bounding box, ensuring it remains clearly visible.
* **Cards:** Card headers, content areas, and footers should generally flow naturally. Do not use borders or dividers to separate them under normal circumstances.
* **Dividers:** Dividers MUST be subtle and low-contrast (e.g., `border-base-300`); heavy, high-contrast borders are FORBIDDEN. To span a divider completely across a padded container, use negative horizontal margins (e.g., `-mx-4`) to exactly offset the parent's padding.
* **Menus:** The `menu` wrapper MUST ONLY be used for direct `menu-item` elements—never for arbitrary content like forms or text blocks. Additionally, any destructive menu actions (e.g., Delete) MUST use danger-themed utilities (e.g., `text-error`, `hover:bg-error/10`).
* **Loading UI:** Replace loading content with standard skeletons (`.skeleton` or `animate-pulse`). You MUST include explicit dimensions (e.g., `h-4 w-1/2` or `size-12 rounded-full`) on skeletons to completely prevent Cumulative Layout Shifts (CLS).

## COLORS
* **Neutral, Minimalist Foundation:** Dashboards are serious, data-driven tools. Build the vast majority of your UI (backgrounds, cards, text, borders, and smaller UI components) using desaturated `base-*` neutral variables. **For very large content areas, strictly use `bg-base-200/10`** to maintain an ultra-minimal background. Strictly avoid gradients and "rainbow" UIs.
* **Backgrounds:** `bg-base-100` (main), `bg-base-200` (secondary), `bg-base-300` (tertiary).
* **Text Contrast:** Ensure readability by maintaining high contrast. Never drop text opacity below 60%. `text-base-content/60` is the absolute minimum allowed text color variant.
* **Strictly Limit Solid Colors:** Treat brand colors as highly scarce resources used only to direct the user's eye. Reserve solid `primary` *strictly* for key calls to action (CTAs) and active navigation states.
* **Default to Soft Variants:** Keep solid `primary` and `secondary` fills to an absolute minimum. Instead, default to the **soft variant** of components (like status badges, tags, or secondary actions) to maintain a refined, professional look without overwhelming the interface.

## ACCESSIBILITY (a11y)
* **FORBIDDEN:** No `<div>` buttons. No `outline-none` without alternative focus states.
* **INSTEAD:** Enforce semantic tags (`<button>`, `<main>`, `<nav>`). Use `focus-visible:ring`. Apply `aria-expanded`, `aria-hidden`, and `sr-only` where visual context is missing for screen readers.

## JAVASCRIPT & BEST PRACTICES
* **Architecture & Externalized Logic:** If the project is in standard HTML, it is FORBIDDEN to write long, complex JavaScript functions directly inside HTML `<script>` tags; you MUST extract core functionality and business logic into dedicated `.js` files. If the project uses React, Vue, or any meta-framework, strictly follow their framework-specific architectural patterns.
* **Inline Script Limits:** For standard HTML setups, short, page-specific initialization scripts or minimal DOM event wiring inside HTML are permissible, but heavy lifting must always be externalized.
* **The DRY Principle (Shared Utilities):** Do not duplicate identical JavaScript code across multiple files. If logic, state management, or UI behavior is repeated across different pages, you MUST create a centralized shared file (e.g., `common.js`, `utils.js`, or `global.js`) and import it wherever needed.
* **Package Management:** Never write or modify `package.json` manually. Reading the file is allowed. To install any new packages or dependencies, you must execute the appropriate command (e.g., `npm i <package>`).

## MULTI-PAGE ECOSYSTEMS
* **Smart Activation & Proactive Generation:** This skill MUST ONLY activate for empty (or nearly empty) projects where the user is starting fresh. If the project is already well-established, or if the user explicitly requests a single page/view, you MUST respect that constraint and do exactly what the user asks without generating additional pages. However, if the project is new/empty and the user makes a generic request (e.g., "build an app" or "create a dashboard"), you MUST activate this multi-page skill. When activated, you MUST anticipate the broader context and automatically generate a complete project comprising at least 8 to 10 highly useful, interconnected pages.
* **High-Utility & Contextual Content:** Always build context-relevant supporting views rather than generic placeholders (e.g., an "e-commerce dashboard" MUST include detailed pages for Products, Orders, Customers, CRUD operations, Settings, Analytics, etc.). Every page must look like a fully realized, professional layout.
* **Strict Vertical Data Density:** Every single page MUST be aggressively data-dense. Maximize screen real estate and eliminate awkward white space. If a page relies primarily on a data table or list, you MUST populate it with a massive, realistic mock dataset to fill the vertical viewport and entirely eliminate empty space at the bottom of the screen.
* **One-Prompt Completeness:** Your ultimate goal is to deliver a fully fleshed-out, practical application foundation from a single prompt, completely eliminating the need for the user to request standard related pages one by one.
