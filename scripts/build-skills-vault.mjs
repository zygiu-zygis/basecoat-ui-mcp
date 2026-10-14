// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
/**
 * scripts/build-skills-vault.mjs
 * Deterministically generates the 3-pillar Skill Vault for Basecoat UI:
 *   - Pillar 1: skills/basecoat/ (Master protocol, design tokens, install, MCP tools, registry, rules, 57 components)
 *   - Pillar 2: skills/basecoat-dashboard/ (Foundations, macro patterns, sidebars 01-16, dashboards 01-07, auth, audit)
 *   - Pillar 3: skills/basecoat-charts/ (ApexCharts + Basecoat CSS, tokens --chart-1..5, 5-framework mounts, audit)
 *
 * Then mirrors the vault to ~/.cursor/skills/ and ~/.gemini/config/skills/
 * and enforces strict 0-symlink, chmod 755 (dirs), and chmod 644 (files) hygiene.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');
const SKILLS_DIR = path.join(REPO_ROOT, 'skills');

const CURSOR_SKILLS_DIR = path.join(process.env.HOME || '/var/home/zygis', '.cursor', 'skills');
const GEMINI_SKILLS_DIR = path.join(process.env.HOME || '/var/home/zygis', '.gemini', 'config', 'skills');

// --- Helper Functions ---
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true, mode: 0o755 });
  } else {
    fs.chmodSync(dirPath, 0o755);
  }
}

function writeFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content.trim() + '\n', { encoding: 'utf8', mode: 0o644 });
  fs.chmodSync(filePath, 0o644);
}

// ==========================================
// PILLAR 1: skills/basecoat/
// ==========================================

const ALL_57_COMPONENTS = [
  'accordion', 'alert', 'alert-dialog', 'aspect-ratio', 'avatar', 'badge', 'breadcrumb', 'button', 'button-group',
  'calendar', 'card', 'carousel', 'chart', 'checkbox', 'collapsible', 'combobox', 'command', 'context-menu',
  'data-table', 'date-picker', 'dialog', 'drawer', 'dropdown-menu', 'empty', 'field', 'form', 'hover-card',
  'input', 'input-group', 'input-otp', 'item', 'kbd', 'label', 'menubar', 'navigation-menu', 'pagination',
  'popover', 'progress', 'radio-group', 'resizable', 'scroll-area', 'select', 'separator', 'sheet', 'sidebar',
  'skeleton', 'slider', 'sonner', 'spinner', 'switch', 'table', 'tabs', 'textarea', 'toast', 'toggle',
  'toggle-group', 'tooltip'
];

function buildPillar1Basecoat() {
  const baseDir = path.join(SKILLS_DIR, 'basecoat');

  // 1. SKILL.md
  const componentIndexRows = ALL_57_COMPONENTS.map(c => `| [${c}](./components/${c}.md) | Basecoat \`${c}\` component reference, anatomy, FSM states, and anti-patterns. |`).join('\n');

  writeFile(path.join(baseDir, 'SKILL.md'), `---
name: basecoat
description: Master UI/UX protocol and 57-component reference for Basecoat UI (pure Basecoat CSS, headless Tailwind CSS v4, Kanso minimalism, and mandatory FSM data-state contracts).
dependencies: basecoat-ui-mcp
---

# Basecoat UI Master Protocol

Basecoat UI is a lightweight, headless component library built on pure Basecoat CSS and Tailwind CSS v4. It delivers the refined aesthetic of shadcn/ui with ZERO React runtime dependencies, ZERO client-side JavaScript framework bloat, and strict semantic HTML5.

## When to Use This Skill

- Use this skill whenever building, refactoring, or reviewing web interfaces with Basecoat UI.
- Use this skill for pure HTML, Astro, Next.js, SvelteKit, Vite, or HTMX applications targeting the Basecoat / shadcn design language.
- Trigger on keywords: \`basecoat\`, \`basecoat-ui\`, \`basecoat-css\`, \`tailwind v4\`, \`kanso\`, \`shadcn aesthetic\`.

## Zero-Tolerance Guardrails

1. **Zero DaisyUI Classes**: DaisyUI class names (\`daisyui\`, \`card-body\`, \`form-control\`, \`stat-value\`, \`btn-primary\`, \`table-pin-rows\`) are STRICTLY FORBIDDEN. All classes must follow Basecoat CSS (\`.card\`, \`.btn\`, \`.input\`, \`.select\`, \`.dialog\`, \`.badge\`) + Tailwind CSS v4 utilities.
2. **Zero React Runtime in HTML**: Markup examples must be pure semantic HTML5. Do NOT include React JSX, React hooks (\`useState\`), or client component pragmas (\`'use client'\`) in Basecoat HTML templates.
3. **Card 1px Ring Contract**: The \`.card\` class intrinsically provides a 1px ring shadow. Adding \`border\` or \`border-border\` to \`.card\` is FORBIDDEN as it causes double-border rendering.
4. **Mandatory FSM State Contracts**: All interactive components must declare explicit Finite State Machine attributes (\`data-state\`, \`data-fsm-recipe\`, \`aria-*\`).
5. **Deterministic Class Ordering**: Elements must order utilities: Basecoat Class -> Layout -> Position -> Alignment -> Sizing -> Spacing -> Typography -> Background -> Border/Ring -> Effects -> States.

## 4-Stage Intent-Driven Tooling Sequence

Before authoring custom markup, execute the 4-stage \`basecoat-ui-mcp\` workflow:
1. **Stage 1: Layout Scaffold (\`basecoat_page_architect\`)**: Search and retrieve structural scaffolds (e.g. \`workspace-dashboard\`, \`auth-split-flow\`, \`workspace-detail\`, \`workspace-settings\`).
2. **Stage 2a: Technical Rules (\`basecoat_rules_enforcer\`)**: Retrieve Tailwind v4 constraints, FSM contracts, semantic token pairings, and HTML landmark requirements.
3. **Stage 2b: Creative Direction (\`basecoat_creative_director\`)**: Apply typography ladders, optical spacing rhythm (4px/8px), style packs (Vega, Nova, Maia, Lyra, Mira), and Kanso minimalism.
4. **Stage 3: Component Syntax (\`basecoat_component_syntax\`)**: Retrieve copy-pasteable component markup pre-configured with FSM state variants.
5. **Stage 4: Quality Inspection (\`basecoat_quality_inspector\`)**: Audit markup for accessibility, syntax compliance, and token integrity (target score: 90+).

## Master Directives & Guides

| Topic | Document | Focus |
|---|---|---|
| Design System & Tokens | [design-system.md](./design-system.md) | OKLCH tokens, color pairings, typography ladder, 4px/8px rhythm |
| Customization & Style Packs | [customization.md](./customization.md) | @theme inline, single dark mode resolver, Vega/Nova/Maia/Lyra/Mira |
| Installation & Setup | [install.md](./install.md) | Tailwind v4 @import, Astro, Next.js, SvelteKit, Vite, HTMX |
| MCP Tools Reference | [mcp.md](./mcp.md) | Comprehensive reference to all 21 MCP tools and resources |
| Registry Architecture | [registry.md](./registry.md) | Offline component and macro block schemas and integrity |
| Styling Rules | [rules/styling.md](./rules/styling.md) | Semantic tokens, zero raw colors, zero space-x/y, size-* utility |
| Composition Rules | [rules/composition.md](./rules/composition.md) | Group wrappers, semantic primitives, modal headers, spinner icons |
| Form Controls | [rules/forms.md](./rules/forms.md) | FieldGroup, Field, InputGroup, ToggleGroup, dual validation |
| Icon Guidelines | [rules/icons.md](./rules/icons.md) | data-icon placement, zero sizing classes on icons, aria-hidden |

## Full 57-Component Index

| Component | Description & Link |
|---|---|
${componentIndexRows}
`);

  // 2. design-system.md
  writeFile(path.join(baseDir, 'design-system.md'), `# Basecoat UI Design System & Token Contract

The Basecoat design system defines an OKLCH semantic token palette mapped onto CSS custom properties. These tokens guarantee high-contrast accessible visual hierarchy across light and dark themes.

## OKLCH Semantic Color Palette

\`\`\`css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.145 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --secondary: oklch(0.97 0 0);
  --secondary-foreground: oklch(0.205 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.556 0 0);
  --accent: oklch(0.97 0 0);
  --accent-foreground: oklch(0.205 0 0);
  --destructive: oklch(0.577 0.245 27.325);
  --destructive-foreground: oklch(0.577 0.245 27.325);
  --border: oklch(0.922 0 0);
  --input: oklch(0.922 0 0);
  --ring: oklch(0.708 0 0);
  --radius: 0.625rem;

  /* Sidebar Tokens */
  --sidebar-background: oklch(0.985 0 0);
  --sidebar-foreground: oklch(0.145 0 0);
  --sidebar-primary: oklch(0.205 0 0);
  --sidebar-primary-foreground: oklch(0.985 0 0);
  --sidebar-accent: oklch(0.97 0 0);
  --sidebar-accent-foreground: oklch(0.205 0 0);
  --sidebar-border: oklch(0.922 0 0);
  --sidebar-ring: oklch(0.708 0 0);

  /* Chart Tokens */
  --chart-1: oklch(0.646 0.222 41.116);
  --chart-2: oklch(0.6 0.118 184.704);
  --chart-3: oklch(0.398 0.07 227.392);
  --chart-4: oklch(0.828 0.189 84.429);
  --chart-5: oklch(0.769 0.188 70.08);
}

.dark {
  --background: oklch(0.145 0 0);
  --foreground: oklch(0.985 0 0);
  --card: oklch(0.145 0 0);
  --card-foreground: oklch(0.985 0 0);
  --popover: oklch(0.145 0 0);
  --popover-foreground: oklch(0.985 0 0);
  --primary: oklch(0.985 0 0);
  --primary-foreground: oklch(0.205 0 0);
  --secondary: oklch(0.269 0 0);
  --secondary-foreground: oklch(0.985 0 0);
  --muted: oklch(0.269 0 0);
  --muted-foreground: oklch(0.708 0 0);
  --accent: oklch(0.269 0 0);
  --accent-foreground: oklch(0.985 0 0);
  --destructive: oklch(0.396 0.141 25.723);
  --destructive-foreground: oklch(0.637 0.237 25.331);
  --border: oklch(0.269 0 0);
  --input: oklch(0.269 0 0);
  --ring: oklch(0.439 0 0);

  /* Sidebar Tokens */
  --sidebar-background: oklch(0.145 0 0);
  --sidebar-foreground: oklch(0.985 0 0);
  --sidebar-primary: oklch(0.985 0 0);
  --sidebar-primary-foreground: oklch(0.205 0 0);
  --sidebar-accent: oklch(0.269 0 0);
  --sidebar-accent-foreground: oklch(0.985 0 0);
  --sidebar-border: oklch(0.269 0 0);
  --sidebar-ring: oklch(0.439 0 0);

  /* Chart Tokens */
  --chart-1: oklch(0.488 0.243 264.376);
  --chart-2: oklch(0.696 0.17 162.48);
  --chart-3: oklch(0.769 0.188 70.08);
  --chart-4: oklch(0.627 0.265 303.9);
  --chart-5: oklch(0.645 0.246 16.439);
}
\`\`\`

## Typography Ladder

| Level | Tailwind Classes | Semantic Usage |
|---|---|---|
| KPI Metric | \`text-2xl\` or \`text-3xl font-semibold tracking-tight tabular-nums\` | Big stat values, ARR/MRR numbers |
| Page Heading (\`h1\`) | \`text-3xl font-semibold tracking-tight\` | Singular page title |
| Section Heading (\`h2\`) | \`text-xl font-semibold tracking-tight\` | Card group or major block header |
| Card Title (\`h3\`) | \`text-lg font-medium leading-tight\` | Card header or drawer panel title |
| Body / Primary Text | \`text-sm text-foreground\` or \`text-base\` | Standard reading content, forms |
| Secondary / Metadata | \`text-xs text-muted-foreground tabular-nums\` | Helper text, timestamps, table cells |
| Caption / Monospace | \`font-mono text-[10px] text-muted-foreground\` | Keyboard shortcuts (\`kbd\`), hashes |

## Optical Rhythm & Spacing Scale (4px/8px Grid)

- \`gap-1\` (4px) / \`gap-1.5\` (6px): Tight badge labels, inline tags, button clusters.
- \`gap-2\` (8px): Form label to control relationship, icon with inline text.
- \`gap-4\` (16px): Distance between form fields, grid spacing in compact cards.
- \`gap-6\` (24px): Standard gap between page sections, card padding in comfortable mode.
- \`gap-12\` (48px): Major distinct regions on landing pages or expansive views.

## Shadow & Radius Scales

- Vega: \`rounded-md\` buttons (0.375rem), \`rounded-xl\` cards (0.75rem), \`shadow-xs\` / \`shadow-sm\` elevation.
- Nova: \`rounded-lg\` buttons (0.5rem), \`rounded-xl\` cards, compact vertical padding.
- Maia: \`rounded-4xl\` pill buttons, \`rounded-2xl\` cards.
- Lyra: \`rounded-none\` buttons and cards, crisp 1px ring borders.
- Mira: \`rounded-md\` text-xs buttons, \`rounded-lg\` cards.
`);

  // 3. customization.md
  writeFile(path.join(baseDir, 'customization.md'), `# Basecoat UI Customization & Style Packs

Tailwind CSS v4 introduces \`@theme inline\` to bind design tokens directly into your CSS build. Basecoat UI pairs this with 8 curated style packs.

## Tailwind CSS v4 @theme inline

\`\`\`css
@import "tailwindcss";
@import "basecoat-css/vega";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}
\`\`\`

## Dark Mode Class Strategy & Single Resolver

Basecoat UI relies on a single class-based dark mode resolver (\`html.dark\`). Do NOT mix with \`@media (prefers-color-scheme: dark)\`.

### 1. No-Flash Head Bootstrap Script
Insert this tiny inline script in the \`<head>\` of every server-rendered page before styles paint:
\`\`\`html
<script>
  try {
    var m = localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (e) {}
</script>
\`\`\`

### 2. Runtime Controller
\`\`\`javascript
window.basecoat = window.basecoat || {};
window.basecoat.theme = {
  get: () => localStorage.getItem('themeMode') || 'system',
  set: (mode) => {
    localStorage.setItem('themeMode', mode);
    const isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', isDark);
    window.dispatchEvent(new CustomEvent('basecoat:themechange', { detail: { mode, isDark } }));
  },
  toggle: () => {
    const isDark = document.documentElement.classList.contains('dark');
    window.basecoat.theme.set(isDark ? 'light' : 'dark');
  }
};
\`\`\`

### 3. Native Select Dark Mode Rule
\`\`\`css
:root { color-scheme: light; }
.dark { color-scheme: dark; }
.dark select, .dark select option {
  background-color: var(--card);
  color: var(--foreground);
  color-scheme: dark;
}
\`\`\`

## The 8 Style Packs

| Pack | Import | Aesthetic |
|---|---|---|
| **Vega** (default) | \`@import "basecoat-css/vega";\` | Standard shadcn/ui New York v4: \`rounded-md\` buttons, \`rounded-xl\` cards, balanced spacing |
| **Nova** | \`@import "basecoat-css/nova";\` | Modern SaaS: \`rounded-lg\` buttons, \`rounded-xl\` ring cards, compact vertical rhythm |
| **Maia** | \`@import "basecoat-css/maia";\` | Organic modern: \`rounded-4xl\` pill buttons, \`rounded-2xl\` cards |
| **Lyra** | \`@import "basecoat-css/lyra";\` | High-density brutalist/technical: \`rounded-none\` buttons/cards, text-xs typography |
| **Mira** | \`@import "basecoat-css/mira";\` | Editorial compact: \`rounded-md\` text-xs/relaxed controls, \`rounded-lg\` cards |
| **Luma** | \`@import "basecoat-css/luma";\` | Soft modern: \`rounded-4xl\` controls, soft \`ring-foreground/5\` elevation |
| **Sera** | \`@import "basecoat-css/sera";\` | Architectural flat: \`rounded-none\` uppercase font-semibold buttons |
| **Rhea** | \`@import "basecoat-css/rhea";\` | Modern curved: \`rounded-2xl\` buttons and cards |
`);

  // 4. install.md
  writeFile(path.join(baseDir, 'install.md'), `# Basecoat UI Installation & Framework Integration

Basecoat UI is framework-agnostic. It compiles to zero runtime overhead for plain HTML, Astro, Next.js, SvelteKit, Vite, and HTMX.

## Core Packages

\`\`\`bash
npm install basecoat-css@1.0.2 tailwindcss@4 @tailwindcss/vite@4
\`\`\`

## Global Stylesheet Setup

In \`src/styles/global.css\` (or \`src/app/globals.css\`):
\`\`\`css
@import "tailwindcss";
@import "basecoat-css/vega";

/* Custom project theme overrides (optional) */
@import "./theme.css";
\`\`\`

---

## 1. Astro Integration

\`\`\`javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
\`\`\`

Layout inclusion:
\`\`\`astro
---
import '../styles/global.css';
---
<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <script is:inline>
      try {
        var m = localStorage.getItem('themeMode');
        document.documentElement.classList.toggle('dark', m === 'dark');
      } catch (e) {}
    </script>
  </head>
  <body class="bg-background text-foreground antialiased min-h-screen">
    <slot />
  </body>
</html>
\`\`\`

---

## 2. Vanilla HTML & Vite Integration

\`\`\`javascript
// vite.config.js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
\`\`\`

\`\`\`html
<!-- index.html -->
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="stylesheet" href="/src/styles/global.css" />
  </head>
  <body class="bg-background text-foreground">
    <main class="container mx-auto p-6">
      <article class="card p-6">
        <h2 class="text-xl font-semibold">Hello Basecoat</h2>
      </article>
    </main>
  </body>
</html>
\`\`\`

---

## 3. Next.js App Router (Tailwind v4)

\`\`\`css
/* src/app/globals.css */
@import "tailwindcss";
@import "basecoat-css/vega";
\`\`\`

\`\`\`tsx
// src/app/layout.tsx
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: \`try{var m=localStorage.getItem('themeMode');document.documentElement.classList.toggle('dark',m==='dark');}catch(e){}\`,
          }}
        />
      </head>
      <body class="bg-background text-foreground min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
\`\`\`

---

## 4. SvelteKit Integration

\`\`\`javascript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
});
\`\`\`

---

## 5. HTMX / Go / Python / Rails Integration

Link compiled CSS from your static assets directory. Include the \`<head>\` dark mode bootstrap script, and return standard Basecoat semantic HTML fragments from your server endpoints.
`);

  // 5. mcp.md
  writeFile(path.join(baseDir, 'mcp.md'), `# Basecoat UI MCP Tools & Resources Reference

The \`basecoat-ui-mcp\` server provides 21 deterministic tools and resources to scaffold, enforce, design, audit, and validate Basecoat interfaces completely offline.

## The 4-Stage Intent Workflow Tools

1. **\`basecoat_page_architect\`**
   - **Intent**: Scaffolds complete page layouts (Workspace Dashboard, Auth Split-Screen, Data Table Detail, Workspace Settings, etc.).
   - **Input**: \`intent\`, \`recipe\`, \`block\`, \`density\`.
   - **Output**: Full HTML container scaffolds, grid declarations, and slotted child components.

2. **\`basecoat_rules_enforcer\`**
   - **Intent**: Retrieves technical rules covering Tailwind CSS v4, FSM state contracts, semantic tokens, and HTML landmarks.
   - **Input**: \`category\` (\`all\`, \`tailwind-v4\`, \`fsm-contracts\`, \`tokens\`, \`semantic-html\`, \`dashboard-patterns\`), \`code\`, \`html\`.
   - **Output**: Technical rule statements, forbidden syntax, and required idioms.

3. **\`basecoat_creative_director\`**
   - **Intent**: Surfaces visual design intelligence: typography ladders, optical spacing rhythm, whitespace density, style packs (Vega, Nova, Maia, Lyra, Mira).
   - **Input**: \`topic\`, \`visitorJob\` (\`operate\`, \`persuade\`, \`read\`, \`experience\`), \`stylePack\`, \`density\`.
   - **Output**: Prescriptive design constraints, token maps, and layout ratios.

4. **\`basecoat_component_syntax\`**
   - **Intent**: Provides copy-pasteable component markup with pre-configured FSM state variants (\`default\`, \`active\`, \`loading\`, \`disabled\`, \`open\`, \`closed\`).
   - **Input**: \`component\`, \`state\`, \`variant\`, \`icon\`, \`environment\`.
   - **Output**: Validated Basecoat HTML markup and required CSS/JS controller dependencies.

5. **\`basecoat_quality_inspector\`**
   - **Intent**: Automated audit returning a quality score (0-100), syntax violations, accessibility gaps, and auto-fix suggestions.
   - **Input**: \`code\`, \`html\`, \`semanticProfile\`, \`densityProfile\`, \`enforceFsm\`.
   - **Output**: \`{ valid, score, diagnostics, autoFixes }\`.

---

## Component & Discovery Tools

6. **\`search_components\`**: Search compact component summaries by intent or query (returns up to 8 matches).
7. **\`get_component_details\`**: Get one minimal component template, dependencies, and composition tips for Astro or HTML.
8. **\`get_component_html\`**: Fetch HTML markup template and dependencies for a Basecoat component.
9. **\`validate_composition\`**: Statically check HTML/Astro source for migration errors, semantic rhythm, missing scripts, and nested cards.

---

## Macro Design & Session Tools

10. **\`search_macro_blocks\`**: Search approved macro layout blocks by query, role, family, or tag.
11. **\`get_macro_block\`**: Retrieve one section of a compiled macro block blueprint.
12. **\`begin_design\`**: Create an idempotent, persistent design session under the host project root.
13. **\`get_design_context\`**: Read a focused design session view (sessions, overview, decisions, graph).
14. **\`apply_design_patch\`**: Apply an atomic list of design graph operations with expected revision verification.
15. **\`validate_design\`**: Validate design session in draft or complete mode.
16. **\`get_rhythm_rules\`**: Read the effective semantic rhythm profile by family and project overrides.
17. **\`get_fsm_recipe\`**: Read finite FSM states, events, guards, actions, or transitions.

---

## Offline MCP Resources

18. **\`basecoat://design/rhythm\`**: Content hierarchy, spatial rhythm, density, typography, and composition constraints.
19. **\`basecoat://design/theming\`**: Token contract, class-based dark mode, single theme resolver, and form control pitfalls.
20. **\`basecoat://integration/frameworks\`**: Production framework integration (Astro, Next.js, Express/Node, Tailwind v4).
21. **\`basecoat://project/context\`**: Reads \`DESIGN.md\` from the host project root for local project constraints.
`);

  // 6. registry.md
  writeFile(path.join(baseDir, 'registry.md'), `# Basecoat UI Registry Architecture & Offline Integrity

The Basecoat MCP registry is an immutable, content-addressed catalog of components and macro layout blocks designed for deterministic, zero-network code generation.

## Schema Version & Standards

- **Registry Version**: \`1.0.2\`
- **Component Registry**: \`src/registry/components.json\` (storing templates, CSS/JS dependencies, and composition rules).
- **Macro Registry**: \`src/macros/registry.snapshot.json\` (storing layout blocks, slot targets, and compositional recipes).
- **Semantics Registry**: \`src/semantics/data/semantics.snapshot.json\` (storing FSM recipes, state charts, and rhythm profiles).

## Deterministic Compilation & Hash Verification

Every macro block and recipe has a content-addressed SHA-256 hash. When a design session begins via \`begin_design\`, the server verifies the integrity of the registry against pinned snapshots.

## Key Registry Entities

- **Blocks**: Self-contained UI layout slices (e.g. \`sidebar-01\`, \`dashboard-01\`, \`metrics-summary\`).
- **Slots**: Explicit insertion points (e.g. \`#sidebar-nav\`, \`#main-content\`, \`#header-actions\`) allowing nested leaf composition without layout drift.
- **Ports**: Data inputs and events exposed by the block.
- **Recipes**: High-level page compositions combining a shell, navigation, header, and content sections.
`);

  // 7. rules/styling.md
  writeFile(path.join(baseDir, 'rules', 'styling.md'), `# Basecoat UI Styling Rules & Guardrails

## 1. Semantic Tokens Only (No Raw Colors)
- **Forbidden**: \`bg-blue-500\`, \`text-[#09090b]\`, \`border-gray-200\`, \`bg-white\`, \`bg-black\`.
- **Required**: \`bg-primary\`, \`text-primary-foreground\`, \`bg-card\`, \`text-card-foreground\`, \`bg-background\`, \`text-foreground\`, \`border-border\`, \`bg-muted\`, \`text-muted-foreground\`.

## 2. No \`space-x/y-*\` (Use \`flex gap-*\`)
- **Forbidden**: \`space-x-4\`, \`space-y-2\` (causes margin-collapse bugs in nested flex/grid).
- **Required**: \`flex items-center gap-4\`, \`flex flex-col gap-2\`.

## 3. Use \`size-*\` for Symmetrical Elements
- **Forbidden**: \`w-4 h-4\`, \`w-8 h-8\`, \`w-10 h-10\`.
- **Required**: \`size-4\`, \`size-8\`, \`size-10\`.

## 4. No Manual \`dark:\` Utility Sprawl
- **Forbidden**: Writing \`bg-white dark:bg-zinc-900 text-black dark:text-white\` on every element.
- **Required**: Use semantic tokens: \`bg-card text-card-foreground\`. The token automatically changes in \`.dark\`.

## 5. No Manual \`z-index\` on Overlays
- **Forbidden**: Arbitrary high z-indices: \`z-[9999]\`, \`z-50\` on basic dropdowns.
- **Required**: Native \`<dialog>\` surfaces use the browser top-layer (\`showModal()\`), completely eliminating z-index stacking issues.

## 6. Never Add \`border\` to \`.card\`
- **Forbidden**: \`<div class="card border border-border">\` (creates a 2px double border).
- **Required**: \`<article class="card">\` (Basecoat CSS automatically includes a 1px ring and shadow).
`);

  // 8. rules/composition.md
  writeFile(path.join(baseDir, 'rules', 'composition.md'), `# Basecoat UI Composition Rules

## 1. Group Wrapping
Always wrap grouped controls inside semantic group wrappers:
- \`SelectGroup\` for option clusters with \`<div class="select-group">\`.
- \`DropdownMenuGroup\` with \`<div class="dropdown-menu-group" role="group">\`.
- \`CommandGroup\` with \`<div class="command-group">\`.

## 2. Primitives Over Custom Divs
Do NOT invent custom div structures for common feedback or layout idioms:
- Use \`<div role="alert" class="alert">\` instead of custom notice divs.
- Use \`<div class="empty">\` for zero-data states.
- Use \`<hr class="separator" />\` instead of custom bordered divider divs.
- Use \`<div class="skeleton">\` instead of raw gray loading boxes.
- Use \`<span class="badge">\` instead of custom rounded pill tags.

## 3. Required Modal Titles
Every modal dialog, sheet, or drawer MUST include an accessible title:
- \`DialogTitle\` with \`<h2 id="dialog-title" class="text-lg font-semibold">\` linked via \`aria-labelledby="dialog-title"\`.
- \`SheetTitle\` and \`DrawerTitle\` following the same pattern.

## 4. Button Loading State
When a button is loading, pair \`data-state="loading"\` and \`disabled\` with an inline spinner:
\`\`\`html
<button type="submit" class="btn" data-variant="default" data-state="loading" disabled>
  <span class="spinner" data-icon="inline-start" aria-hidden="true"></span>
  Saving...
</button>
\`\`\`

## 5. Avatar Fallback
Always provide an accessible fallback inside \`<span class="avatar">\`:
\`\`\`html
<span class="avatar size-10 rounded-full" data-state="fallback">
  <span class="avatar-fallback flex size-full items-center justify-center bg-muted text-sm font-medium">JD</span>
</span>
\`\`\`

## 6. TabsTrigger Inside TabsList
Always place \`[role="tab"]\` triggers directly inside a \`[role="tablist"]\` container.
`);

  // 9. rules/forms.md
  writeFile(path.join(baseDir, 'rules', 'forms.md'), `# Basecoat UI Form Hierarchy & Validation Rules

## 1. Hierarchy: FieldGroup -> Field -> FieldLabel
Structure all forms using the explicit hierarchy:
\`\`\`html
<div class="field-group flex flex-col gap-4">
  <div role="group" class="field flex flex-col gap-2" data-invalid="false">
    <label for="email" class="label text-sm font-medium">Email Address</label>
    <input id="email" type="email" class="input" aria-invalid="false" aria-describedby="email-desc" />
    <p id="email-desc" class="text-xs text-muted-foreground">We will never share your email.</p>
  </div>
</div>
\`\`\`

## 2. InputGroup + InputGroupAddon
For compound input fields with prefixes, suffixes, or embedded action buttons:
\`\`\`html
<div class="input-group flex items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">
  <span class="input-group-addon px-3 text-sm text-muted-foreground">https://</span>
  <input type="text" class="input-group-field flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="domain.com" />
</div>
\`\`\`

## 3. ToggleGroup for 2-7 Choices
When offering 2 to 7 mutually exclusive options, prefer a \`ToggleGroup\` or \`SegmentedToggle\` over a dropdown:
\`\`\`html
<div class="segmented-toggle inline-flex rounded-md border border-border p-1" role="radiogroup">
  <button type="button" class="btn" data-variant="ghost" data-state="active" aria-checked="true">Monthly</button>
  <button type="button" class="btn" data-variant="ghost" data-state="default" aria-checked="false">Annual</button>
</div>
\`\`\`

## 4. FieldSet + FieldLegend
Group related sets of checkboxes or radio inputs inside a semantic \`<fieldset>\` with a \`<legend>\`:
\`\`\`html
<fieldset class="fieldset flex flex-col gap-3">
  <legend class="legend text-sm font-semibold">Notification Channels</legend>
  <div class="flex items-center gap-2">
    <input type="checkbox" id="email-notif" class="checkbox" />
    <label for="email-notif" class="label text-sm">Email</label>
  </div>
</fieldset>
\`\`\`

## 5. Dual Validation States
When displaying validation errors, apply BOTH state indicators:
1. \`data-invalid="true"\` on the enclosing \`.field\` container.
2. \`aria-invalid="true"\` on the input control.
3. Link the error message with \`aria-describedby="field-id-error"\`.
\`\`\`html
<div role="group" class="field flex flex-col gap-2" data-invalid="true">
  <label for="username" class="label text-sm font-medium">Username</label>
  <input id="username" class="input" aria-invalid="true" aria-describedby="username-error" />
  <p id="username-error" class="text-xs font-medium text-destructive">Username is already taken.</p>
</div>
\`\`\`
`);

  // 10. rules/icons.md
  writeFile(path.join(baseDir, 'rules', 'icons.md'), `# Basecoat UI Icon Placement & Rules

## 1. \`data-icon\` Placement Attributes
- Use \`data-icon="inline-start"\` for icons placed before text or label content.
- Use \`data-icon="inline-end"\` for icons placed after text or label content (e.g. chevrons, external link icons).

## 2. Zero Sizing Classes on \`data-icon\` SVGs
Basecoat CSS automatically handles icon sizing and alignment when the \`data-icon\` attribute is present.
- **Forbidden**: \`<svg data-icon="inline-start" class="size-4 w-4 h-4 mr-2 ...">\`
- **Required**: \`<svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">...</svg>\`

## 3. Accessibility (\`aria-hidden="true"\`)
- Decorative icons placed beside visible text labels MUST have \`aria-hidden="true"\`.
- Standalone icon buttons without visible text MUST declare an \`aria-label\` on the parent \`<button>\`:
\`\`\`html
<button type="button" class="btn size-8" data-variant="ghost" data-size="icon" aria-label="Settings">
  <svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <circle cx="12" cy="12" r="3"/>
  </svg>
</button>
\`\`\`
`);

  // 11. All 57 Component Reference Files in skills/basecoat/components/*.md
  const componentSpecs = getComponentSpecs();
  for (const comp of ALL_57_COMPONENTS) {
    const spec = componentSpecs[comp] || generateDefaultComponentSpec(comp);
    writeFile(path.join(baseDir, 'components', `${comp}.md`), buildComponentMarkdown(comp, spec));
  }
}

function generateDefaultComponentSpec(comp) {
  const title = comp.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join(' ');
  return {
    title,
    intent: `Provides accessible, lightweight ${title} interface for Basecoat UI applications.`,
    anatomy: `<div class="${comp}" data-state="default">\n  <!-- ${title} content -->\n</div>`,
    variants: `data-variant="default | secondary | outline"`,
    fsmStates: `default, active, disabled`,
    iconPlacement: `data-icon="inline-start" or data-icon="inline-end"`,
    correctHtml: `<div class="${comp}" data-state="default">\n  <span class="text-sm font-medium">${title} item</span>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Missing FSM attributes, raw hex colors, and double borders -->\n<div class="border border-gray-200 bg-white p-4">\n  <span>${title}</span>\n</div>`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | data-state="default" | Initial mount |\n| active | data-state="active" | User interaction |\n| disabled | data-state="disabled" aria-disabled="true" | Disabled condition |`
  };
}

function buildComponentMarkdown(name, spec) {
  return `---
name: ${name}
description: Basecoat UI ${spec.title} component reference, DOM anatomy, FSM states, and anti-patterns.
---

# ${spec.title} (\`${name}\`)

## Overview & Intent
${spec.intent}

## Anatomy & DOM Structure
\`\`\`html
${spec.anatomy}
\`\`\`

## Variants & Modifiers
${spec.variants}

## FSM \`data-*\` / \`aria-*\` State Matrix
${spec.fsmTable}

## \`data-icon\` Placement
${spec.iconPlacement}

## Correct HTML Example
\`\`\`html
${spec.correctHtml}
\`\`\`

## Incorrect Anti-Pattern HTML Example
\`\`\`html
${spec.antiPatternHtml}
\`\`\`
`;
}

function getComponentSpecs() {
  const specs = {};

  specs['accordion'] = {
    title: 'Accordion',
    intent: 'Vertically stacked list of interactive disclosure headings built with native <details> and <summary>.',
    anatomy: `<section class="accordion flex flex-col divide-y divide-border" data-state="closed">\n  <details class="accordion-item group py-3" data-state="closed">\n    <summary class="accordion-trigger flex cursor-pointer list-none items-center justify-between text-sm font-medium hover:underline">\n      <span>Section Title</span>\n      <svg data-icon="inline-end" class="transition-transform duration-200 group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>\n    </summary>\n    <div class="accordion-content pt-2 text-sm text-muted-foreground">\n      Section content.\n    </div>\n  </details>\n</section>`,
    variants: `Line-divided accordion, bordered card accordion.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" | Initial state without open attribute |\n| open | data-state="open" open attribute | User clicks summary header |\n| disabled | data-state="disabled" opacity-50 pointer-events-none | Disabled item |`,
    iconPlacement: `data-icon="inline-end" on chevron icon inside summary. Zero manual sizing classes on SVG.`,
    correctHtml: `<section class="accordion flex flex-col divide-y divide-border">\n  <details class="accordion-item group py-3" data-state="closed">\n    <summary class="accordion-trigger flex cursor-pointer list-none items-center justify-between text-sm font-medium hover:underline">\n      <span>Can I use Basecoat without React?</span>\n      <svg data-icon="inline-end" class="transition-transform group-open:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>\n    </summary>\n    <div class="accordion-content pt-2 text-sm text-muted-foreground">\n      Yes, Basecoat UI is purely semantic HTML and Tailwind CSS v4.\n    </div>\n  </details>\n</section>`,
    antiPatternHtml: `<!-- Anti-Pattern: Non-semantic div soup with hardcoded colors and missing summary semantics -->\n<div class="border border-gray-200 bg-white p-4">\n  <div class="text-blue-600 font-bold">Heading</div>\n</div>`
  };

  specs['alert'] = {
    title: 'Alert',
    intent: 'Prominent banner message communicating system status, warnings, or errors without blocking user navigation.',
    anatomy: `<div role="alert" class="alert flex items-start gap-4 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-sm" data-variant="default">\n  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>\n  <div class="flex flex-col gap-1">\n    <h5 class="text-sm font-semibold leading-none tracking-tight">Notice</h5>\n    <p class="text-xs text-muted-foreground">Status description.</p>\n  </div>\n</div>`,
    variants: `data-variant="default | destructive | warning | info"`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | data-variant="default" | Standard informative message |\n| destructive | data-variant="destructive" border-destructive/50 text-destructive | Critical error notice |\n| dismissed | hidden or removed from DOM | User dismiss action |`,
    iconPlacement: `data-icon="inline-start" on alert icon. Zero manual sizing classes on SVG.`,
    correctHtml: `<div role="alert" class="alert flex items-start gap-4 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-destructive shadow-sm" data-variant="destructive">\n  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>\n  <div class="flex flex-col gap-1">\n    <h5 class="text-sm font-semibold leading-none tracking-tight">Payment Failed</h5>\n    <p class="text-xs text-destructive/80">Please update your payment method to avoid suspension.</p>\n  </div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Raw hardcoded red hex codes and missing role="alert" -->\n<div class="bg-red-500 text-white p-4 rounded">\n  <span>Error message</span>\n</div>`
  };

  specs['alert-dialog'] = {
    title: 'Alert Dialog',
    intent: 'Modal confirmation overlay using native <dialog> that interrupts the user and requires explicit confirmation or cancellation.',
    anatomy: `<dialog id="alert-dialog" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-lg border border-border backdrop:bg-black/50" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="dialog-title" aria-describedby="dialog-desc">\n  <div class="flex flex-col gap-4 max-w-md">\n    <header class="flex flex-col gap-1.5">\n      <h2 id="dialog-title" class="text-lg font-semibold">Are you absolutely sure?</h2>\n      <p id="dialog-desc" class="text-sm text-muted-foreground">This action cannot be undone.</p>\n    </header>\n    <footer class="flex justify-end gap-2 pt-2">\n      <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close('cancel')">Cancel</button>\n      <button type="button" class="btn" data-variant="destructive" onclick="this.closest('dialog').close('confirm')">Continue</button>\n    </footer>\n  </div>\n</dialog>`,
    variants: `Destructive confirmation, default primary confirmation.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" data-fsm-state="closed" | Initial state |\n| open | data-state="open" data-fsm-state="open" | dialog.showModal() invoked |\n| confirmed | close event with returnValue === 'confirm' | User clicks Confirm |`,
    iconPlacement: `data-icon="inline-start" on buttons if icons are used.`,
    correctHtml: `<dialog id="delete-confirm" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-lg border border-border backdrop:bg-black/50 max-w-md w-full" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="del-title" aria-describedby="del-desc">\n  <div class="flex flex-col gap-4">\n    <h2 id="del-title" class="text-lg font-semibold">Delete repository?</h2>\n    <p id="del-desc" class="text-sm text-muted-foreground">This will permanently delete the repository and all issues.</p>\n    <div class="flex justify-end gap-2 pt-2">\n      <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close()">Cancel</button>\n      <button type="button" class="btn bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</button>\n    </div>\n  </div>\n</dialog>`,
    antiPatternHtml: `<!-- Anti-Pattern: Div overlay with manual high z-index and missing accessible aria-labelledby -->\n<div class="fixed inset-0 z-[9999] bg-black/50">\n  <div class="p-6 bg-white">\n    <h3>Heading</h3>\n  </div>\n</div>`
  };

  specs['aspect-ratio'] = {
    title: 'Aspect Ratio',
    intent: 'Responsive media container that maintains a fixed width-to-height ratio across all viewport sizes.',
    anatomy: `<div class="aspect-video w-full overflow-hidden rounded-xl bg-muted">\n  <img class="size-full object-cover" src="/preview.jpg" alt="Preview" />\n</div>`,
    variants: `aspect-video (16:9), aspect-square (1:1), aspect-[4/3].`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="aspect-video" | Static layout |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="aspect-video w-full overflow-hidden rounded-xl bg-muted">\n  <img class="size-full object-cover" src="/dashboard-preview.png" alt="Dashboard preview" />\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Hardcoded arbitrary pixel heights causing responsive distortion -->\n<div class="w-full h-[320px]">\n  <img src="/preview.png" />\n</div>`
  };

  specs['avatar'] = {
    title: 'Avatar',
    intent: 'Visual representation of a user or organization with automatic accessible fallback initials.',
    anatomy: `<span class="avatar size-10 rounded-full" data-state="loaded">\n  <img src="/avatar.jpg" alt="Jane Doe" class="size-full rounded-full object-cover" />\n  <span class="avatar-fallback flex size-full items-center justify-center bg-muted text-sm font-medium">JD</span>\n</span>`,
    variants: `size-8 (sm), size-10 (md), size-14 (lg), rounded-full vs rounded-md.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| loaded | data-state="loaded" | Image successfully loaded |\n| fallback | data-state="fallback" | Image fails or is omitted |`,
    iconPlacement: `data-icon="inline-start" if placing icon in fallback.`,
    correctHtml: `<span class="avatar size-10 rounded-full" data-state="fallback">\n  <span class="avatar-fallback flex size-full items-center justify-center rounded-full bg-muted text-sm font-medium text-foreground">JD</span>\n</span>`,
    antiPatternHtml: `<!-- Anti-Pattern: Bare img tag without fallback container or alt attribute -->\n<img src="/avatar.jpg" class="rounded-full w-10 h-10" />`
  };

  specs['badge'] = {
    title: 'Badge',
    intent: 'Compact status tag or counter pill used to classify items or display numeric counts.',
    anatomy: `<span class="badge" data-variant="secondary">Active</span>`,
    variants: `data-variant="default | secondary | outline | destructive"`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | data-variant="default" | Active primary badge |\n| secondary | data-variant="secondary" | Subtle secondary badge |\n| outline | data-variant="outline" | Bordered neutral badge |`,
    iconPlacement: `data-icon="inline-start" or data-icon="inline-end".`,
    correctHtml: `<span class="badge" data-variant="outline">\n  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>\n  Verified\n</span>`,
    antiPatternHtml: `<!-- Anti-Pattern: Custom div pill with arbitrary paddings and hardcoded hex colors -->\n<div class="inline-block px-2 py-0.5 rounded-full bg-[#10b981] text-white text-xs">Active</div>`
  };

  specs['breadcrumb'] = {
    title: 'Breadcrumb',
    intent: 'Hierarchical navigation trail indicating current page location within application structure.',
    anatomy: `<nav aria-label="Breadcrumb" class="breadcrumb">\n  <ol class="flex items-center gap-1.5 text-sm text-muted-foreground">\n    <li><a href="/" class="hover:text-foreground">Home</a></li>\n    <li role="presentation" aria-hidden="true">/</li>\n    <li><span aria-current="page" class="font-medium text-foreground">Settings</span></li>\n  </ol>\n</nav>`,
    variants: `Default slash separator, chevron separator.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | a class="hover:text-foreground" | Ancestor link |\n| current | span aria-current="page" | Current leaf location |`,
    iconPlacement: `data-icon="inline-start" on home icon.`,
    correctHtml: `<nav aria-label="Breadcrumb" class="breadcrumb">\n  <ol class="flex items-center gap-1.5 text-sm text-muted-foreground">\n    <li><a href="/workspace" class="hover:text-foreground">Workspace</a></li>\n    <li role="presentation" aria-hidden="true">›</li>\n    <li><span aria-current="page" class="font-medium text-foreground">Billing</span></li>\n  </ol>\n</nav>`,
    antiPatternHtml: `<!-- Anti-Pattern: Flat div links without <nav>, <ol>, or aria-current="page" -->\n<div class="flex gap-2 text-sm text-gray-500">\n  <a href="/">Home</a> / <span>Settings</span>\n</div>`
  };

  specs['button'] = {
    title: 'Button',
    intent: 'Interactive button triggering actions, submissions, or modal dialogs.',
    anatomy: `<button type="button" class="btn" data-variant="default" data-size="default" data-state="default">\n  Click me\n</button>`,
    variants: `data-variant="default | secondary | outline | ghost | destructive | link", data-size="default | sm | lg | icon"`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | data-state="default" | Initial interactive state |\n| active | data-state="active" | Pointer down / pressed |\n| loading | data-state="loading" disabled | Async action in flight |\n| disabled | data-state="disabled" disabled aria-disabled="true" | Disabled condition |`,
    iconPlacement: `data-icon="inline-start" or data-icon="inline-end". Never put size-4 on data-icon SVG.`,
    correctHtml: `<button type="submit" class="btn" data-variant="default" data-state="default">\n  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>\n  Continue\n</button>`,
    antiPatternHtml: `<!-- Anti-Pattern: Hardcoded sizing w-4 h-4 mr-2 on icon instead of data-icon -->\n<button class="bg-blue-600 text-white px-4 py-2 rounded">\n  <svg class="w-4 h-4 mr-2" viewBox="0 0 24 24">...</svg>\n  Submit\n</button>`
  };

  specs['button-group'] = {
    title: 'Button Group',
    intent: 'Cohesive cluster of related action buttons joined with unified borders.',
    anatomy: `<div class="button-group flex items-center -space-x-px" role="group" aria-label="View mode">\n  <button type="button" class="btn rounded-r-none" data-variant="outline">Day</button>\n  <button type="button" class="btn rounded-none" data-variant="outline">Week</button>\n  <button type="button" class="btn rounded-l-none" data-variant="outline">Month</button>\n</div>`,
    variants: `Horizontal group, segmented outline buttons.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | role="group" | Static button cluster |`,
    iconPlacement: `data-icon on individual buttons.`,
    correctHtml: `<div class="button-group flex items-center -space-x-px" role="group" aria-label="Zoom controls">\n  <button type="button" class="btn rounded-r-none" data-variant="outline" aria-label="Zoom out">-</button>\n  <button type="button" class="btn rounded-l-none" data-variant="outline" aria-label="Zoom in">+</button>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Spaced buttons with gap-2 instead of connected borders -->\n<div class="flex gap-2">\n  <button class="border p-2">Day</button>\n  <button class="border p-2">Week</button>\n</div>`
  };

  specs['calendar'] = {
    title: 'Calendar',
    intent: 'Date grid selector for single date or date range picking.',
    anatomy: `<div class="calendar p-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm max-w-xs">\n  <header class="flex items-center justify-between pb-3">\n    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Previous month">\n      <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m15 18-6-6 6-6"/></svg>\n    </button>\n    <span class="text-sm font-medium">October 2026</span>\n    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Next month">\n      <svg data-icon="inline-end" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 18 6-6-6-6"/></svg>\n    </button>\n  </header>\n  <table class="w-full border-collapse text-center text-xs">\n    <thead><tr class="text-muted-foreground"><th class="h-8">Su</th><th class="h-8">Mo</th><th class="h-8">Tu</th><th class="h-8">We</th><th class="h-8">Th</th><th class="h-8">Fr</th><th class="h-8">Sa</th></tr></thead>\n    <tbody><tr><td class="p-1"><button type="button" class="btn size-8 rounded-md" data-variant="ghost">1</button></td></tr></tbody>\n  </table>\n</div>`,
    variants: `Single date selection, date range selection.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | data-variant="ghost" | Unselected date cell |\n| selected | data-variant="default" bg-primary text-primary-foreground | Selected date cell |\n| disabled | opacity-50 pointer-events-none | Out-of-bounds date cell |`,
    iconPlacement: `data-icon on month navigation buttons.`,
    correctHtml: `<div class="calendar p-3 rounded-xl border border-border bg-card text-card-foreground shadow-sm max-w-xs">\n  <header class="flex items-center justify-between pb-2">\n    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Previous month">‹</button>\n    <span class="text-sm font-semibold">May 2026</span>\n    <button type="button" class="btn size-7" data-variant="ghost" aria-label="Next month">›</button>\n  </header>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Non-table div grid missing accessible date navigation labels -->\n<div class="grid grid-cols-7 gap-1">\n  <div>1</div><div>2</div>\n</div>`
  };

  specs['card'] = {
    title: 'Card',
    intent: 'Content container with subtle 1px ring shadow and background surface token.',
    anatomy: `<article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">\n  <header class="flex flex-col gap-1.5">\n    <h3 class="text-lg font-semibold leading-none">Title</h3>\n    <p class="text-sm text-muted-foreground">Description</p>\n  </header>\n  <div class="flex-1 text-sm">Content</div>\n  <footer class="flex items-center justify-end gap-2">Actions</footer>\n</article>`,
    variants: `Vega standard card, compact p-4 card, comfortable p-8 card.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | Basecoat .card | Static display |\n| interactive | hover:bg-muted/50 cursor-pointer | Clickable card |`,
    iconPlacement: `size-5 in header or data-icon="inline-start".`,
    correctHtml: `<article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">\n  <header class="flex items-center justify-between">\n    <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>\n    <span class="badge" data-variant="outline">+12.5%</span>\n  </header>\n  <div class="flex flex-col gap-1">\n    <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>\n    <p class="text-xs text-muted-foreground">+20.1% from last month</p>\n  </div>\n</article>`,
    antiPatternHtml: `<!-- FORBIDDEN: Adding border class to card creates ugly double border -->\n<div class="card border border-border bg-white">\n  <div class="p-6">Content</div>\n</div>`
  };

  specs['carousel'] = {
    title: 'Carousel',
    intent: 'Horizontal slideshow container for cycling through sequential cards or media.',
    anatomy: `<div class="carousel relative w-full overflow-hidden" role="region" aria-roledescription="carousel" aria-label="Highlights">\n  <div class="carousel-items flex -ml-4">\n    <div class="carousel-item min-w-0 shrink-0 grow-0 pl-4 basis-full md:basis-1/2">Slide 1</div>\n  </div>\n  <button type="button" class="btn size-8 rounded-full absolute left-2 top-1/2 -translate-y-1/2" aria-label="Previous slide">‹</button>\n  <button type="button" class="btn size-8 rounded-full absolute right-2 top-1/2 -translate-y-1/2" aria-label="Next slide">›</button>\n</div>`,
    variants: `Single slide, multi-item responsive carousel.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| active | carousel-item visible | Slide index match |\n| inactive | carousel-item hidden/scrolled | Non-active slide |`,
    iconPlacement: `Arrow icons inside navigation buttons.`,
    correctHtml: `<div class="carousel relative w-full overflow-hidden" role="region" aria-roledescription="carousel" aria-label="Product Showcase">\n  <div class="carousel-items flex -ml-4">\n    <div class="carousel-item min-w-0 shrink-0 grow-0 pl-4 basis-full">Slide 1</div>\n  </div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Carousel without role="region" or aria-roledescription="carousel" -->\n<div class="overflow-x-scroll flex">\n  <div>Slide 1</div>\n</div>`
  };

  specs['chart'] = {
    title: 'Chart',
    intent: 'Responsive container for ApexCharts or Basecoat SVG area charts bound to --chart-1..5 tokens.',
    anatomy: `<div class="card p-6">\n  <header class="flex items-center justify-between pb-4">\n    <h3 class="text-base font-semibold">Revenue Trend</h3>\n  </header>\n  <div id="chart" class="w-full h-80"></div>\n</div>`,
    variants: `Area, bar, line, pie, radial, radar.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| rendered | SVG chart element in DOM | Client initialization |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="card flex flex-col gap-4 rounded-xl bg-card p-6 shadow-sm">\n  <h3 class="text-base font-semibold">Overview</h3>\n  <div id="revenue-chart" class="w-full h-80"></div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Hardcoded hex colors in chart options bypassing --chart-1..5 -->\n<div class="w-[500px] h-[300px] bg-white">\n  <canvas id="myChart"></canvas>\n</div>`
  };

  specs['checkbox'] = {
    title: 'Checkbox',
    intent: 'Two-state or indeterminate control allowing users to toggle binary options.',
    anatomy: `<div class="flex items-center gap-2">\n  <input type="checkbox" id="terms" class="checkbox" data-state="unchecked" />\n  <label for="terms" class="label text-sm font-medium">Accept terms</label>\n</div>`,
    variants: `Default checkbox, disabled checkbox, indeterminate state.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| unchecked | data-state="unchecked" checked=false | Default state |\n| checked | data-state="checked" checked=true | User clicks checkbox |\n| disabled | data-state="disabled" disabled | Disabled option |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="flex items-center gap-2">\n  <input type="checkbox" id="marketing" class="checkbox" data-state="unchecked" />\n  <label for="marketing" class="label text-sm font-medium">Receive updates</label>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Custom non-input toggle div without keyboard focus or accessibility attributes -->\n<div class="w-4 h-4 border border-gray-400 cursor-pointer"></div>`
  };

  specs['collapsible'] = {
    title: 'Collapsible',
    intent: 'Interactive disclosure section using native semantic HTML5 <details>.',
    anatomy: `<details class="collapsible" data-state="closed">\n  <summary class="collapsible-trigger flex items-center justify-between cursor-pointer py-2 text-sm font-medium">\n    <span>Toggle details</span>\n  </summary>\n  <div class="collapsible-content pt-2 text-sm text-muted-foreground">Hidden content</div>\n</details>`,
    variants: `Default collapsible, card collapsible.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" | Initial state |\n| open | data-state="open" open attribute | Summary clicked |`,
    iconPlacement: `Chevron with data-icon="inline-end".`,
    correctHtml: `<details class="collapsible py-2" data-state="closed">\n  <summary class="flex cursor-pointer items-center justify-between text-sm font-medium">\n    <span>Advanced Options</span>\n  </summary>\n  <div class="pt-2 text-xs text-muted-foreground">Additional fields.</div>\n</details>`,
    antiPatternHtml: `<!-- Anti-Pattern: JavaScript-dependent div without native summary fallback -->\n<div class="cursor-pointer" onclick="toggle()">Show More</div>\n<div style="display:none">Content</div>`
  };

  specs['combobox'] = {
    title: 'Combobox',
    intent: 'Accessible autocomplete input with filtered dropdown suggestions list.',
    anatomy: `<div class="combobox relative" data-state="closed">\n  <input type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" class="input" placeholder="Search framework..." />\n  <div class="popover absolute top-full mt-1 w-full rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-border" hidden>\n    <ul role="listbox">\n      <li role="option" class="item px-2 py-1.5 text-sm rounded-sm hover:bg-muted cursor-pointer">Astro</li>\n    </ul>\n  </div>\n</div>`,
    variants: `Single select combobox, multi-tag combobox.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | aria-expanded="false" popover hidden | Initial state |\n| open | aria-expanded="true" popover visible | Input focused / typing |`,
    iconPlacement: `data-icon="inline-end" on chevron or clear button.`,
    correctHtml: `<div class="combobox relative" data-state="closed">\n  <input type="text" role="combobox" aria-expanded="false" aria-autocomplete="list" class="input" placeholder="Search..." />\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Text input without role="combobox" or aria-expanded -->\n<input type="text" placeholder="Search..." />\n<div class="absolute bg-white border">Results</div>`
  };

  specs['command'] = {
    title: 'Command',
    intent: 'Fast keyboard-driven command palette dialog with search filter and item groups.',
    anatomy: `<dialog class="dialog command-dialog max-w-lg w-full rounded-xl bg-popover p-0 shadow-2xl border border-border" data-state="closed" data-fsm-recipe="dialog">\n  <div class="flex flex-col">\n    <div class="flex items-center border-b border-border px-3">\n      <svg data-icon="inline-start" class="text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>\n      <input class="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground" placeholder="Type a command or search..." />\n    </div>\n    <div class="max-h-80 overflow-y-auto p-2 space-y-1">\n      <div class="command-group">\n        <span class="px-2 py-1.5 text-xs font-semibold text-muted-foreground">Navigation</span>\n        <div class="item flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm cursor-pointer hover:bg-muted">Dashboard</div>\n      </div>\n    </div>\n  </div>\n</dialog>`,
    variants: `Command dialog, inline embedded command list.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" | Initial state |\n| open | data-state="open" | Cmd+K shortcut invoked |`,
    iconPlacement: `Search icon with data-icon="inline-start".`,
    correctHtml: `<dialog class="dialog command-dialog max-w-lg w-full rounded-xl bg-popover p-0 shadow-2xl border border-border" data-state="closed" data-fsm-recipe="dialog">\n  <div class="flex items-center border-b border-border px-3">\n    <input class="w-full bg-transparent py-3 text-sm outline-none" placeholder="Search..." />\n  </div>\n</dialog>`,
    antiPatternHtml: `<!-- Anti-Pattern: Non-modal overlay lacking keyboard trap and escape dismiss -->\n<div class="fixed top-20 left-1/2 -translate-x-1/2 bg-white p-4 shadow z-50">Search</div>`
  };

  specs['context-menu'] = {
    title: 'Context Menu',
    intent: 'Floating contextual menu opened on secondary click (right-click) or long press.',
    anatomy: `<div class="context-menu-trigger" data-state="closed">\n  <div class="popover fixed rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-border text-sm" hidden>\n    <button type="button" class="item flex w-full items-center px-2 py-1.5 rounded-sm hover:bg-muted">Copy</button>\n  </div>\n</div>`,
    variants: `Standard contextual list with shortcuts.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" hidden | Initial state |\n| open | data-state="open" visible | contextmenu event fired |`,
    iconPlacement: `data-icon on menu action items.`,
    correctHtml: `<div class="context-menu-trigger" data-state="closed">\n  <div class="p-8 border border-dashed rounded-lg text-center text-sm">Right-click here</div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: High z-index div lacking boundary constraints and outside-click dismissal -->\n<div class="fixed z-[9999] bg-white border">Menu</div>`
  };

  specs['data-table'] = {
    title: 'Data Table',
    intent: 'Dense records table with sticky header, sorting, and tabular numerals.',
    anatomy: `<div class="overflow-x-auto rounded-md border border-border">\n  <table class="table w-full text-sm">\n    <thead class="sticky top-0 bg-background/90 backdrop-blur">\n      <tr class="border-b border-border text-xs font-medium text-muted-foreground">\n        <th class="h-10 px-4 py-2 text-left">Invoice</th>\n        <th class="h-10 px-4 py-2 text-right">Amount</th>\n      </tr>\n    </thead>\n    <tbody>\n      <tr class="border-b border-border/50 hover:bg-muted/50 transition-colors">\n        <td class="px-4 py-3 font-medium">INV-001</td>\n        <td class="px-4 py-3 text-right tabular-nums font-semibold">$250.00</td>\n      </tr>\n    </tbody>\n  </table>\n</div>`,
    variants: `Bordered table, compact table (px-2 py-1.5), striped table.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | Basecoat .table | Normal rows |\n| selected | tr class="bg-muted/60" aria-selected="true" | Row selected |\n| empty | tbody with single cell | Zero records matched |`,
    iconPlacement: `Sort icons inside th use data-icon="inline-end".`,
    correctHtml: `<div class="overflow-x-auto rounded-md border border-border">\n  <table class="table w-full text-sm">\n    <thead><tr class="border-b border-border text-xs font-medium text-muted-foreground"><th class="h-10 px-4 text-left">ID</th></tr></thead>\n    <tbody><tr class="border-b border-border/50"><td class="px-4 py-3 font-medium">#1024</td></tr></tbody>\n  </table>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Wrapping each row in a separate card or omitting tabular numbers -->\n<div class="space-y-2">\n  <div class="card p-4">Row 1: $100.00</div>\n</div>`
  };

  specs['date-picker'] = {
    title: 'Date Picker',
    intent: 'Input popover trigger revealing an interactive calendar grid.',
    anatomy: `<div class="date-picker relative inline-block" data-state="closed">\n  <button type="button" class="btn" data-variant="outline" aria-expanded="false">\n    <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>\n    <span>Pick a date</span>\n  </button>\n  <div class="popover absolute top-full mt-1 rounded-xl bg-card p-3 shadow-lg border border-border" hidden>\n    <!-- calendar -->\n  </div>\n</div>`,
    variants: `Single date picker, range picker.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | aria-expanded="false" hidden | Initial state |\n| open | aria-expanded="true" visible | Button clicked |`,
    iconPlacement: `Calendar icon with data-icon="inline-start".`,
    correctHtml: `<div class="date-picker relative inline-block" data-state="closed">\n  <button type="button" class="btn" data-variant="outline">\n    <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/></svg>\n    <span>Select date</span>\n  </button>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Using raw unstyled text input without format hints or calendar fallback -->\n<input type="text" placeholder="DD/MM/YYYY" />`
  };

  specs['dialog'] = {
    title: 'Dialog',
    intent: 'Native HTML5 modal overlay with backdrop blur and escape dismissal.',
    anatomy: `<dialog id="modal-1" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-xl border border-border backdrop:bg-black/50" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="dlg-title">\n  <header class="mb-4">\n    <h2 id="dlg-title" class="text-lg font-semibold">Dialog Title</h2>\n  </header>\n  <div class="mb-6 text-sm">Dialog body content.</div>\n  <footer class="flex justify-end gap-2">\n    <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close()">Close</button>\n  </footer>\n</dialog>`,
    variants: `Standard modal, max-w-2xl wide modal, fullscreen modal.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" data-fsm-state="closed" | Initial state |\n| open | data-state="open" data-fsm-state="open" | dialog.showModal() called |`,
    iconPlacement: `data-icon on action buttons.`,
    correctHtml: `<dialog id="terms-dlg" class="dialog rounded-xl bg-card p-6 text-card-foreground shadow-xl border border-border backdrop:bg-black/50 max-w-md w-full" data-state="closed" data-fsm-recipe="dialog" aria-labelledby="t-title">\n  <h2 id="t-title" class="text-lg font-semibold mb-2">Terms</h2>\n  <p class="text-sm text-muted-foreground mb-4">Please read carefully.</p>\n  <button type="button" class="btn" data-variant="outline" onclick="this.closest('dialog').close()">Close</button>\n</dialog>`,
    antiPatternHtml: `<!-- Anti-Pattern: Fixed div overlay competing with z-index instead of <dialog> -->\n<div class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">\n  <div class="bg-white p-6">Modal</div>\n</div>`
  };

  specs['drawer'] = {
    title: 'Drawer',
    intent: 'Slide-out panel anchored to the bottom (mobile) or right (desktop) edge of the viewport.',
    anatomy: `<dialog class="drawer fixed inset-y-0 right-0 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="drw-title">\n  <header class="mb-4">\n    <h2 id="drw-title" class="text-lg font-semibold">Drawer Title</h2>\n  </header>\n  <div class="text-sm">Drawer content</div>\n</dialog>`,
    variants: `data-side="right | left | bottom | top"`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" | Initial state |\n| open | data-state="open" | Trigger opened |`,
    iconPlacement: `data-icon on close button.`,
    correctHtml: `<dialog class="drawer fixed inset-y-0 right-0 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="side-title">\n  <h2 id="side-title" class="text-lg font-semibold mb-4">Details</h2>\n</dialog>`,
    antiPatternHtml: `<!-- Anti-Pattern: Drawer missing data-side attribute or unconstrained overflow -->\n<div class="fixed right-0 top-0 h-full w-80 bg-white">Drawer</div>`
  };

  specs['dropdown-menu'] = {
    title: 'Dropdown Menu',
    intent: 'Action menu anchored to a trigger button with keyboard navigation.',
    anatomy: `<div class="dropdown-menu relative inline-block" data-state="closed">\n  <button type="button" class="btn" data-variant="outline" aria-expanded="false" aria-controls="menu-actions">\n    Actions <svg data-icon="inline-end" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>\n  </button>\n  <div id="menu-actions" role="menu" class="popover absolute right-0 mt-1 w-48 rounded-md bg-popover p-1 text-popover-foreground shadow-md border border-border" hidden>\n    <button type="button" role="menuitem" class="item flex w-full items-center px-2 py-1.5 text-sm rounded-sm hover:bg-muted">Edit</button>\n  </div>\n</div>`,
    variants: `Standard action menu, menu with separators and item badges.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | aria-expanded="false" hidden | Initial state |\n| open | aria-expanded="true" visible | Button clicked |`,
    iconPlacement: `data-icon="inline-end" on button chevron.`,
    correctHtml: `<div class="dropdown-menu relative inline-block" data-state="closed">\n  <button type="button" class="btn" data-variant="outline" aria-expanded="false" aria-controls="user-menu">Profile</button>\n  <div id="user-menu" role="menu" class="popover absolute right-0 mt-1 w-48 rounded-md bg-popover p-1 shadow-md border border-border" hidden>\n    <button type="button" role="menuitem" class="item flex w-full items-center px-2 py-1.5 text-sm hover:bg-muted">Settings</button>\n  </div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Missing aria-expanded on trigger and missing role="menu" on popover -->\n<div><button>Open</button><div class="absolute">Menu</div></div>`
  };

  specs['empty'] = {
    title: 'Empty State',
    intent: 'Zero-data placeholder guiding users to create their first record or adjust filters.',
    anatomy: `<div class="empty flex flex-col items-center justify-center gap-3 p-8 text-center rounded-xl border border-dashed border-border bg-muted/20">\n  <div class="flex size-12 items-center justify-center rounded-full bg-muted">\n    <svg data-icon="inline-start" class="text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>\n  </div>\n  <h4 class="text-base font-semibold">No records found</h4>\n  <p class="text-sm text-muted-foreground max-w-sm">Get started by creating your first entry.</p>\n  <button type="button" class="btn mt-2" data-variant="default">Create Entry</button>\n</div>`,
    variants: `Compact empty box, full-page empty state.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="empty" | Zero items in dataset |`,
    iconPlacement: `Illustration or status icon inside centered circle.`,
    correctHtml: `<div class="empty flex flex-col items-center justify-center gap-3 p-8 text-center rounded-xl border border-dashed border-border bg-muted/20">\n  <h4 class="text-base font-semibold">No active projects</h4>\n  <p class="text-sm text-muted-foreground">Create a project to start collaborating.</p>\n  <button type="button" class="btn mt-2" data-variant="default">New Project</button>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Completely blank space without helpful message or call to action -->\n<div class="p-4 text-center">Empty</div>`
  };

  specs['field'] = {
    title: 'Field',
    intent: 'Form field wrapper associating label, control, and validation message.',
    anatomy: `<div role="group" class="field flex flex-col gap-2" data-invalid="false">\n  <label for="username" class="label text-sm font-medium">Username</label>\n  <input id="username" class="input" aria-invalid="false" aria-describedby="username-desc" />\n  <p id="username-desc" class="text-xs text-muted-foreground">Public display name.</p>\n</div>`,
    variants: `Vertical field (default), horizontal field (data-orientation="horizontal").`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| valid | data-invalid="false" aria-invalid="false" | Value matches criteria |\n| invalid | data-invalid="true" aria-invalid="true" | Validation fails |`,
    iconPlacement: `Icons inside input group or trailing helper.`,
    correctHtml: `<div role="group" class="field flex flex-col gap-2" data-invalid="false">\n  <label for="f-email" class="label text-sm font-medium">Email</label>\n  <input id="f-email" type="email" class="input" aria-invalid="false" />\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Stacking input without label or separating error message from aria-describedby -->\n<div>\n  <input type="text" placeholder="Email" />\n  <span class="text-red-500">Error</span>\n</div>`
  };

  specs['form'] = {
    title: 'Form',
    intent: 'Semantic form container structured into fieldsets, legends, and action buttons.',
    anatomy: `<form class="form flex flex-col gap-6" novalidate>\n  <fieldset class="fieldset flex flex-col gap-4">\n    <legend class="legend text-base font-semibold">Profile</legend>\n    <!-- fields -->\n  </fieldset>\n  <div class="flex justify-end gap-2">\n    <button type="submit" class="btn" data-variant="default" data-state="default">Save</button>\n  </div>\n</form>`,
    variants: `Sectioned form, single-card form.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| idle | data-state="default" | Form rendered |\n| submitting | button data-state="loading" disabled | Submit triggered |`,
    iconPlacement: `data-icon on submit button.`,
    correctHtml: `<form class="flex flex-col gap-6">\n  <fieldset class="flex flex-col gap-4">\n    <legend class="text-sm font-semibold">General</legend>\n  </fieldset>\n  <button type="submit" class="btn" data-variant="default">Submit</button>\n</form>`,
    antiPatternHtml: `<!-- Anti-Pattern: Unstructured form without fieldset or legend -->\n<form>\n  <div>Input</div><button>Submit</button>\n</form>`
  };

  specs['hover-card'] = {
    title: 'Hover Card',
    intent: 'Contextual preview popup displayed when hovering or focusing an interactive anchor.',
    anatomy: `<div class="hover-card relative inline-block" data-state="closed">\n  <a href="/user/zygis" class="hover-card-trigger underline font-medium">@zygis</a>\n  <div class="popover absolute bottom-full mb-2 w-72 rounded-md bg-popover p-4 text-popover-foreground shadow-md border border-border text-sm" hidden>\n    <p class="font-semibold">Žygimantas Jasiulionis</p>\n    <p class="text-xs text-muted-foreground">Chief AI Engineer</p>\n  </div>\n</div>`,
    variants: `Bottom preview card, top preview card.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | hidden | Default state |\n| open | visible | Hover or focus entered |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="hover-card relative inline-block" data-state="closed">\n  <a href="#" class="underline">View details</a>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Hover card inaccessible to keyboard focus (Tab) -->\n<span onmouseover="show()">Hover me</span>`
  };

  specs['input'] = {
    title: 'Input',
    intent: 'Single-line text input field styled with semantic border and focus ring tokens.',
    anatomy: `<input type="text" class="input flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Enter text..." />`,
    variants: `text, email, password, search, number.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="input" | Default idle state |\n| disabled | disabled opacity-50 cursor-not-allowed | Disabled input |`,
    iconPlacement: `Icons embedded via InputGroup.`,
    correctHtml: `<input type="text" class="input flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring" placeholder="Search..." />`,
    antiPatternHtml: `<!-- Anti-Pattern: Hardcoded border colors and arbitrary heights -->\n<input class="border border-gray-300 h-[42px] px-3 rounded" />`
  };

  specs['input-group'] = {
    title: 'Input Group',
    intent: 'Compound input control with affixed prefix/suffix text or embedded buttons.',
    anatomy: `<div class="input-group flex items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">\n  <span class="input-group-addon px-3 text-sm text-muted-foreground">https://</span>\n  <input type="text" class="input-group-field flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="domain.com" />\n</div>`,
    variants: `Prefix addon, suffix addon, button addon.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| focus-within | focus-within:ring-1 | Child input focused |`,
    iconPlacement: `Inside addon span.`,
    correctHtml: `<div class="input-group flex items-center rounded-md border border-input bg-background shadow-xs focus-within:ring-1 focus-within:ring-ring">\n  <span class="px-3 text-sm text-muted-foreground">@</span>\n  <input type="text" class="flex-1 border-0 bg-transparent px-2 py-1.5 text-sm outline-none" placeholder="username" />\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Joining inputs with raw border-l-0 hacks causing focus ring clipping -->\n<div class="flex">\n  <span class="border p-2">@</span><input class="border-l-0 p-2" />\n</div>`
  };

  specs['input-otp'] = {
    title: 'Input OTP',
    intent: 'Segmented character cells for entering one-time passwords and verification codes.',
    anatomy: `<div class="input-otp flex items-center gap-2" role="group" aria-label="One-time password">\n  <input type="text" maxlength="1" class="input size-10 text-center text-lg font-semibold tabular-nums" />\n  <input type="text" maxlength="1" class="input size-10 text-center text-lg font-semibold tabular-nums" />\n  <input type="text" maxlength="1" class="input size-10 text-center text-lg font-semibold tabular-nums" />\n</div>`,
    variants: `4-digit, 6-digit OTP clusters.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | data-state="default" | Empty cell |\n| active | data-state="active" | Current focused cell |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="input-otp flex items-center gap-2" role="group" aria-label="Verification code">\n  <input type="text" maxlength="1" class="input size-10 text-center text-base font-semibold tabular-nums" />\n  <input type="text" maxlength="1" class="input size-10 text-center text-base font-semibold tabular-nums" />\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Single monolithic input without monospace or tabular alignment -->\n<input type="text" placeholder="123456" />`
  };

  specs['item'] = {
    title: 'Item',
    intent: 'Generic row or option tile used in lists, command palettes, and menus.',
    anatomy: `<div class="item flex items-center justify-between gap-3 rounded-lg border border-border p-3 hover:bg-muted/50 cursor-pointer">\n  <span class="text-sm font-medium">Item Label</span>\n  <span class="badge" data-variant="outline">Active</span>\n</div>`,
    variants: `Bordered item tile, plain hover item row.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="item" | Idle row |\n| hover | hover:bg-muted/50 | Pointer hover |`,
    iconPlacement: `Leading icon or avatar.`,
    correctHtml: `<div class="item flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 cursor-pointer">\n  <span class="text-sm font-medium">Workspace Item</span>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Non-interactive div with hardcoded hover styling -->\n<div class="p-3 bg-white hover:bg-gray-100">Item</div>`
  };

  specs['kbd'] = {
    title: 'Kbd',
    intent: 'Monospace keyboard shortcut indicator.',
    anatomy: `<kbd class="kbd inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">⌘K</kbd>`,
    variants: `Standard kbd, compact inline kbd.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="kbd" | Static tag |`,
    iconPlacement: `None.`,
    correctHtml: `<kbd class="kbd inline-flex h-5 items-center gap-1 rounded border border-border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">Ctrl+S</kbd>`,
    antiPatternHtml: `<!-- Anti-Pattern: Unstyled text or using emoji for modifier keys -->\n<span>[CTRL+S]</span>`
  };

  specs['label'] = {
    title: 'Label',
    intent: 'Accessible label bound to a form control via the for attribute.',
    anatomy: `<label for="email" class="label text-sm font-medium leading-none">Email address</label>`,
    variants: `Standard label, required label with asterisk.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="label" | Form label |`,
    iconPlacement: `None.`,
    correctHtml: `<label for="user-email" class="label text-sm font-medium leading-none">Email</label>`,
    antiPatternHtml: `<!-- Anti-Pattern: Plain span tag acting as a label without for binding -->\n<span class="font-bold">Email:</span>`
  };

  specs['menubar'] = {
    title: 'Menubar',
    intent: 'Desktop application horizontal menu bar holding dropdown menu triggers.',
    anatomy: `<div class="menubar flex h-9 items-center gap-1 rounded-md border border-border bg-background p-1" role="menubar">\n  <button type="button" role="menuitem" class="item px-3 py-1 text-sm font-medium rounded-sm hover:bg-muted">File</button>\n  <button type="button" role="menuitem" class="item px-3 py-1 text-sm font-medium rounded-sm hover:bg-muted">Edit</button>\n</div>`,
    variants: `Standard menubar.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | role="menubar" | Horizontal bar |`,
    iconPlacement: `data-icon on menu item buttons.`,
    correctHtml: `<div class="menubar flex h-9 items-center gap-1 rounded-md border border-border bg-background p-1" role="menubar">\n  <button type="button" role="menuitem" class="px-3 py-1 text-sm rounded-sm hover:bg-muted">File</button>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Horizontal list without role="menubar" or role="menuitem" -->\n<div class="flex gap-4"><div>File</div></div>`
  };

  specs['navigation-menu'] = {
    title: 'Navigation Menu',
    intent: 'Top-level responsive website navigation with flyout submenus.',
    anatomy: `<nav class="navigation-menu relative flex items-center" aria-label="Main">\n  <ul class="flex items-center gap-1">\n    <li><a href="/features" class="btn" data-variant="ghost">Features</a></li>\n  </ul>\n</nav>`,
    variants: `Top navigation, flyout nav menu.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | aria-label="Main" | Main nav |`,
    iconPlacement: `Chevron with data-icon="inline-end".`,
    correctHtml: `<nav class="navigation-menu relative flex items-center" aria-label="Main navigation">\n  <ul class="flex items-center gap-1">\n    <li><a href="/" class="btn" data-variant="ghost">Home</a></li>\n  </ul>\n</nav>`,
    antiPatternHtml: `<!-- Anti-Pattern: Generic div links missing nav landmark or list markup -->\n<div class="flex gap-4"><a href="/">Home</a></div>`
  };

  specs['pagination'] = {
    title: 'Pagination',
    intent: 'Multi-page navigation controls with previous, numbered page buttons, ellipsis, and next.',
    anatomy: `<nav role="navigation" aria-label="Pagination" class="pagination flex items-center justify-center gap-1">\n  <button type="button" class="btn h-9 px-3 text-sm" data-variant="outline" aria-label="Previous page">Previous</button>\n  <button type="button" class="btn size-9 text-sm" data-variant="outline" aria-current="page">1</button>\n  <button type="button" class="btn size-9 text-sm" data-variant="ghost">2</button>\n  <button type="button" class="btn h-9 px-3 text-sm" data-variant="outline" aria-label="Next page">Next</button>\n</nav>`,
    variants: `Numbered pagination, compact previous/next pagination.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| current | aria-current="page" | Active page |\n| default | data-variant="ghost" | Inactive page |`,
    iconPlacement: `Chevron arrows with data-icon="inline-start" / data-icon="inline-end".`,
    correctHtml: `<nav role="navigation" aria-label="Pagination" class="pagination flex items-center gap-1">\n  <button type="button" class="btn size-9" data-variant="outline" aria-current="page">1</button>\n  <button type="button" class="btn size-9" data-variant="ghost">2</button>\n</nav>`,
    antiPatternHtml: `<!-- Anti-Pattern: Links without aria-current="page" on active page -->\n<div class="flex gap-2"><span>1</span><a href="#">2</a></div>`
  };

  specs['popover'] = {
    title: 'Popover',
    intent: 'Non-modal floating content surface anchored to a trigger control.',
    anatomy: `<div class="popover-wrapper relative inline-block" data-state="closed">\n  <button type="button" class="btn" data-variant="outline" aria-expanded="false">Open</button>\n  <div class="popover absolute top-full mt-2 w-72 rounded-md bg-popover p-4 text-popover-foreground shadow-md border border-border text-sm" hidden>\n    Popover content\n  </div>\n</div>`,
    variants: `Anchored popover, alignment options (start, center, end).`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | hidden aria-expanded="false" | Default state |\n| open | visible aria-expanded="true" | Trigger clicked |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="popover-wrapper relative inline-block" data-state="closed">\n  <button type="button" class="btn" data-variant="outline">Info</button>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Overwriting popover background with raw white without dark mode token -->\n<div class="absolute bg-white text-black p-4 border">Popover</div>`
  };

  specs['progress'] = {
    title: 'Progress',
    intent: 'Visual progress bar communicating task completion percentage.',
    anatomy: `<div class="progress relative h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow="60" aria-valuemin="0" aria-valuemax="100">\n  <div class="progress-bar size-full bg-primary transition-all" style="width: 60%"></div>\n</div>`,
    variants: `Linear progress, thin progress (h-1), thick progress (h-3).`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| value | aria-valuenow="60" | Progress update |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="progress relative h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">\n  <div class="size-full bg-primary" style="width: 75%"></div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Missing role="progressbar", aria-valuenow, or aria-valuemax -->\n<div class="w-full bg-gray-200 h-2"><div class="bg-blue-600 w-1/2 h-full"></div></div>`
  };

  specs['radio-group'] = {
    title: 'Radio Group',
    intent: 'Set of mutually exclusive radio buttons grouped under an accessible legend.',
    anatomy: `<div class="radio-group flex flex-col gap-2" role="radiogroup" aria-label="Plan">\n  <div class="flex items-center gap-2">\n    <input type="radio" id="p1" name="plan" class="radio" checked />\n    <label for="p1" class="label text-sm font-medium">Free Plan</label>\n  </div>\n</div>`,
    variants: `Vertical radio group, horizontal radio group.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| unchecked | checked=false | Unselected radio |\n| checked | checked=true | User selection |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="radio-group flex flex-col gap-2" role="radiogroup" aria-label="Billing cycle">\n  <div class="flex items-center gap-2">\n    <input type="radio" id="cycle-monthly" name="cycle" class="radio" checked />\n    <label for="cycle-monthly" class="label text-sm font-medium">Monthly</label>\n  </div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Radio buttons missing matching name attributes or shared radiogroup role -->\n<div><input type="radio" /> Monthly <input type="radio" /> Annual</div>`
  };

  specs['resizable'] = {
    title: 'Resizable',
    intent: 'Multi-pane container with draggable divider separator handles.',
    anatomy: `<div class="resizable flex h-80 w-full rounded-xl border border-border overflow-hidden">\n  <div class="panel flex-1 p-4">Panel 1</div>\n  <div class="resize-handle w-px bg-border hover:bg-primary cursor-col-resize" role="separator"></div>\n  <div class="panel flex-1 p-4">Panel 2</div>\n</div>`,
    variants: `Horizontal split, vertical split.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | role="separator" | Split layout |`,
    iconPlacement: `Grip icon in handle.`,
    correctHtml: `<div class="resizable flex h-64 w-full border border-border rounded-lg">\n  <div class="panel flex-1 p-4">Tree</div>\n  <div class="resize-handle w-px bg-border" role="separator"></div>\n  <div class="panel flex-2 p-4">Editor</div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Fixed widths with overflow clipped without resize handles -->\n<div class="flex"><div class="w-64">Panel 1</div><div class="w-64">Panel 2</div></div>`
  };

  specs['scroll-area'] = {
    title: 'Scroll Area',
    intent: 'Custom styled scrolling container preserving cross-browser scrollbar aesthetics.',
    anatomy: `<div class="scroll-area relative overflow-hidden rounded-md border border-border h-72">\n  <div class="scroll-area-viewport size-full overflow-y-auto p-4">\n    <!-- content -->\n  </div>\n</div>`,
    variants: `Vertical scroll area, horizontal scroll area.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | overflow-y-auto | Content overflow |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="scroll-area relative overflow-hidden rounded-md border border-border h-64">\n  <div class="size-full overflow-y-auto p-4">List items...</div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Default raw scrollbars causing layout shifts on Windows/Linux -->\n<div class="overflow-scroll h-64">Content</div>`
  };

  specs['select'] = {
    title: 'Select',
    intent: 'Form select dropdown utilizing native HTML <select> with dark mode tokens.',
    anatomy: `<div class="field flex flex-col gap-2">\n  <label for="role" class="label text-sm font-medium">Role</label>\n  <select id="role" class="select flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring">\n    <option value="admin">Administrator</option>\n    <option value="member">Team Member</option>\n  </select>\n</div>`,
    variants: `Standard native select, custom popover select.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="select" | Default selection |\n| disabled | disabled opacity-50 | Disabled select |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="field flex flex-col gap-2">\n  <label for="country" class="label text-sm font-medium">Country</label>\n  <select id="country" class="select flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm">\n    <option value="lt">Lithuania</option>\n  </select>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Missing dark mode CSS contract causing white-on-white text in dark mode -->\n<select class="border p-2 bg-white text-black"><option>Admin</option></select>`
  };

  specs['separator'] = {
    title: 'Separator',
    intent: 'Subtle horizontal or vertical divider separating distinct visual groups.',
    anatomy: `<hr class="separator shrink-0 bg-border h-[1px] w-full border-none my-4" role="separator" />`,
    variants: `Horizontal (default), vertical (w-[1px] h-full).`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | role="separator" | Content division |`,
    iconPlacement: `None.`,
    correctHtml: `<hr class="separator shrink-0 bg-border h-[1px] w-full border-none my-4" role="separator" />`,
    antiPatternHtml: `<!-- Anti-Pattern: Thick default <hr> with inset shadows and border margins -->\n<hr class="border-t-2 border-gray-400" />`
  };

  specs['sheet'] = {
    title: 'Sheet',
    intent: 'Slide-out overlay drawer anchored to the viewport edge for inspections and side forms.',
    anatomy: `<dialog class="sheet fixed inset-y-0 right-0 z-50 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="sheet-title">\n  <header class="mb-4">\n    <h2 id="sheet-title" class="text-lg font-semibold">Sheet Title</h2>\n  </header>\n  <div class="text-sm">Sheet content</div>\n</dialog>`,
    variants: `data-side="right | left | bottom | top"`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | data-state="closed" | Initial state |\n| open | data-state="open" | Open action |`,
    iconPlacement: `data-icon on close button.`,
    correctHtml: `<dialog class="sheet fixed inset-y-0 right-0 z-50 h-full w-96 bg-card p-6 text-card-foreground shadow-2xl border-l border-border" data-state="closed" data-side="right" aria-labelledby="sh-title">\n  <h2 id="sh-title" class="text-lg font-semibold">User Details</h2>\n</dialog>`,
    antiPatternHtml: `<!-- Anti-Pattern: Sheet missing close button or accessible heading binding -->\n<div class="fixed right-0 top-0 h-full w-96 bg-white shadow-xl">Sheet</div>`
  };

  specs['sidebar'] = {
    title: 'Sidebar',
    intent: 'Master navigation sidebar containing brand switcher, nav items, and profile footer.',
    anatomy: `<aside class="sidebar flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">\n  <header class="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold">Brand</header>\n  <nav class="flex-1 p-3 space-y-1"><a href="#" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium" data-state="active">Home</a></nav>\n  <footer class="border-t border-sidebar-border p-3">User</footer>\n</aside>`,
    variants: `Full sidebar (w-64), compact icon rail (w-16), dual rail.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| expanded | data-state="expanded" | Default open sidebar |\n| collapsed | data-state="collapsed" | Toggle icon rail mode |`,
    iconPlacement: `data-icon="inline-start" on navigation items.`,
    correctHtml: `<aside class="sidebar flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">\n  <header class="flex h-14 items-center px-4 font-semibold">Console</header>\n</aside>`,
    antiPatternHtml: `<!-- Anti-Pattern: Sidebar lacking --sidebar-* semantic token bindings -->\n<div class="w-64 bg-gray-100 text-black border-r">Nav</div>`
  };

  specs['skeleton'] = {
    title: 'Skeleton',
    intent: 'Pulsing placeholder indicating content is actively loading.',
    anatomy: `<div class="skeleton animate-pulse rounded-md bg-muted h-4 w-3/4" aria-hidden="true"></div>`,
    variants: `Text line skeleton, circular avatar skeleton (rounded-full size-10), card block skeleton.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| loading | class="skeleton animate-pulse" aria-hidden="true" | Loading state |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="skeleton animate-pulse rounded-md bg-muted h-4 w-1/2" aria-hidden="true"></div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Missing aria-hidden="true" or using solid static gray boxes -->\n<div class="bg-gray-300 h-4 w-32"></div>`
  };

  specs['slider'] = {
    title: 'Slider',
    intent: 'Range slider input for adjusting numeric values along a continuous scale.',
    anatomy: `<div class="slider flex items-center gap-3">\n  <input type="range" min="0" max="100" value="50" class="slider-input w-full accent-primary" aria-label="Volume" />\n  <span class="text-sm tabular-nums text-muted-foreground">50%</span>\n</div>`,
    variants: `Single value slider, range slider with minimum and maximum thumbs.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | value changed | Input change event |`,
    iconPlacement: `Volume / brightness icon prefix.`,
    correctHtml: `<div class="slider flex items-center gap-3">\n  <input type="range" min="0" max="100" value="70" class="w-full accent-primary" aria-label="Percentage" />\n  <span class="text-sm tabular-nums">70%</span>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Slider missing aria-label or tabular number display -->\n<input type="range" />`
  };

  specs['sonner'] = {
    title: 'Sonner',
    intent: 'Stacked notification viewport managing multiple transient toast notices.',
    anatomy: `<div class="sonner fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">\n  <div class="toast flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">\n    <p class="text-sm font-medium">Notification message</p>\n  </div>\n</div>`,
    variants: `Bottom-right stack, top-center stack.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| open | data-state="open" | Toast dispatched |\n| closed | data-state="closed" | Toast dismissed |`,
    iconPlacement: `data-icon="inline-start" on status icon.`,
    correctHtml: `<div class="sonner fixed bottom-4 right-4 z-50 flex flex-col gap-2" role="region" aria-label="Notifications">\n  <div class="toast flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">\n    <span class="text-sm font-medium">Changes saved</span>\n  </div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Floating notifications without an encompassing role="region" -->\n<div class="fixed bottom-4 right-4 bg-white p-4 shadow">Saved</div>`
  };

  specs['spinner'] = {
    title: 'Spinner',
    intent: 'Indeterminate circular loading animation.',
    anatomy: `<span class="spinner inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" data-icon="inline-start" aria-hidden="true"></span>`,
    variants: `size-4 (inline button), size-6 (section loader), size-8 (page loader).`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| active | animate-spin aria-hidden="true" | Loading process in flight |`,
    iconPlacement: `data-icon="inline-start" inside buttons.`,
    correctHtml: `<span class="spinner inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent text-muted-foreground" data-icon="inline-start" aria-hidden="true"></span>`,
    antiPatternHtml: `<!-- Anti-Pattern: Sizing classes like w-4 h-4 placed directly on spinner when inside a button with data-icon -->\n<span class="animate-spin w-4 h-4 mr-2">Loading...</span>`
  };

  specs['switch'] = {
    title: 'Switch',
    intent: 'Accessible boolean toggle switch control.',
    anatomy: `<div class="flex items-center gap-2">\n  <input type="checkbox" id="airplane" role="switch" class="switch" data-state="unchecked" />\n  <label for="airplane" class="label text-sm font-medium">Airplane Mode</label>\n</div>`,
    variants: `Default switch, compact switch.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| unchecked | data-state="unchecked" checked=false | Switch off |\n| checked | data-state="checked" checked=true | Switch on |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="flex items-center gap-2">\n  <input type="checkbox" id="sw-notif" role="switch" class="switch" data-state="unchecked" />\n  <label for="sw-notif" class="label text-sm font-medium">Notifications</label>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Checkbox without role="switch" or missing associated <label> -->\n<input type="checkbox" /> Airplane mode`
  };

  specs['table'] = {
    title: 'Table',
    intent: 'Tabular data grid for rendering comparable rows and columns.',
    anatomy: `<div class="table-container overflow-x-auto rounded-md border border-border">\n  <table class="table w-full text-sm">\n    <thead><tr class="border-b border-border bg-muted/40"><th class="h-10 px-4 text-left font-medium">Name</th></tr></thead>\n    <tbody><tr class="border-b border-border/50"><td class="px-4 py-3">Item 1</td></tr></tbody>\n  </table>\n</div>`,
    variants: `Bordered table, striped table, compact table.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | Basecoat .table | Normal rows |\n| hover | hover:bg-muted/50 | Row hover |`,
    iconPlacement: `Sort icons in th with data-icon="inline-end".`,
    correctHtml: `<div class="table-container overflow-x-auto rounded-md border border-border">\n  <table class="table w-full text-sm">\n    <thead><tr class="border-b border-border text-xs font-medium text-muted-foreground"><th class="h-10 px-4 text-left">User</th></tr></thead>\n    <tbody><tr class="border-b border-border/50"><td class="px-4 py-3 font-medium">Alex</td></tr></tbody>\n  </table>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Unwrapped table overflowing viewport without horizontal scroll container -->\n<table class="w-full"><tr><td>Item</td></tr></table>`
  };

  specs['tabs'] = {
    title: 'Tabs',
    intent: 'Peer view switcher organizing related content into tabbed panels.',
    anatomy: `<div class="tabs flex flex-col gap-4" data-state="active" data-fsm-recipe="tabs">\n  <nav role="tablist" class="tabs-list inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground" aria-label="Views">\n    <button type="button" role="tab" id="tab-1" aria-controls="panel-1" aria-selected="true" class="tabs-trigger inline-flex items-center rounded-md px-3 py-1 text-sm font-medium" data-state="active">Overview</button>\n  </nav>\n  <section role="tabpanel" id="panel-1" aria-labelledby="tab-1" class="tabs-content" data-state="active">Overview panel</section>\n</div>`,
    variants: `Pill tabs (bg-muted), underline tabs (data-variant="line").`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| active | data-state="active" aria-selected="true" | Selected tab button & visible panel |\n| inactive | data-state="inactive" aria-selected="false" hidden | Inactive tab & hidden panel |`,
    iconPlacement: `data-icon="inline-start" on tab triggers.`,
    correctHtml: `<div class="tabs flex flex-col gap-4" data-state="active" data-fsm-recipe="tabs">\n  <nav role="tablist" class="tabs-list inline-flex h-9 items-center rounded-lg bg-muted p-1 text-muted-foreground" aria-label="Settings">\n    <button type="button" role="tab" id="t-gen" aria-controls="p-gen" aria-selected="true" class="tabs-trigger inline-flex items-center rounded-md px-3 py-1 text-sm font-medium" data-state="active">General</button>\n  </nav>\n  <section role="tabpanel" id="p-gen" aria-labelledby="t-gen" class="tabs-content" data-state="active">Content</section>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Tabs missing role="tablist" or mismatched aria-controls IDs -->\n<div class="flex gap-2"><span>Tab 1</span><span>Tab 2</span></div>`
  };

  specs['textarea'] = {
    title: 'Textarea',
    intent: 'Multi-line text input field styled with semantic tokens.',
    anatomy: `<textarea class="textarea flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring" placeholder="Enter notes..."></textarea>`,
    variants: `Standard textarea, non-resizable textarea (resize-none).`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | class="textarea" | Idle state |\n| disabled | disabled opacity-50 | Disabled state |`,
    iconPlacement: `None.`,
    correctHtml: `<textarea class="textarea flex min-h-[80px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus-visible:ring-1 focus-visible:ring-ring" placeholder="Write feedback..."></textarea>`,
    antiPatternHtml: `<!-- Anti-Pattern: Fixed non-responsive pixel widths and raw borders -->\n<textarea class="w-[400px] border border-gray-400"></textarea>`
  };

  specs['toast'] = {
    title: 'Toast',
    intent: 'Ephemeral feedback message communicating action success or failure.',
    anatomy: `<div role="status" class="toast fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">\n  <div class="text-sm font-medium">Saved successfully!</div>\n</div>`,
    variants: `Success toast, error toast, informative toast.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| open | data-state="open" | Toast triggered |\n| closed | data-state="closed" | Toast timeout / dismissed |`,
    iconPlacement: `Status icon with data-icon="inline-start".`,
    correctHtml: `<div role="status" class="toast fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-card-foreground shadow-lg" data-state="open">\n  <span class="text-sm font-medium">Record updated.</span>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Toast without role="status" or missing dark mode card surface tokens -->\n<div class="fixed bottom-4 right-4 bg-green-500 text-white p-3">Done</div>`
  };

  specs['toggle'] = {
    title: 'Toggle',
    intent: 'Two-state button that can be toggled on or off.',
    anatomy: `<button type="button" class="btn" data-variant="outline" data-state="off" aria-pressed="false">\n  <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M6 12h12"/></svg>\n  Mute\n</button>`,
    variants: `Default outline toggle, ghost toggle.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| off | data-state="off" aria-pressed="false" | Inactive toggle |\n| on | data-state="on" aria-pressed="true" bg-muted | Active pressed toggle |`,
    iconPlacement: `data-icon="inline-start".`,
    correctHtml: `<button type="button" class="btn" data-variant="outline" data-state="on" aria-pressed="true">\n  <span>Pin</span>\n</button>`,
    antiPatternHtml: `<!-- Anti-Pattern: Missing aria-pressed or data-state="on|off" -->\n<button class="border p-2">Toggle</button>`
  };

  specs['toggle-group'] = {
    title: 'Toggle Group',
    intent: 'Group of connected toggle buttons for formatting or selection.',
    anatomy: `<div class="toggle-group inline-flex rounded-md border border-border bg-background p-1" role="group" aria-label="Text styles">\n  <button type="button" class="btn size-8" data-variant="ghost" data-state="on" aria-pressed="true">B</button>\n  <button type="button" class="btn size-8" data-variant="ghost" data-state="off" aria-pressed="false">I</button>\n</div>`,
    variants: `Single-selection toggle group, multi-selection toggle group.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| default | role="group" | Joined toggle cluster |`,
    iconPlacement: `Icons inside buttons.`,
    correctHtml: `<div class="toggle-group inline-flex rounded-md border border-border bg-background p-1" role="group" aria-label="Alignment">\n  <button type="button" class="btn size-8" data-variant="ghost" data-state="on" aria-pressed="true">L</button>\n  <button type="button" class="btn size-8" data-variant="ghost" data-state="off" aria-pressed="false">R</button>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Separate loose buttons without unified group border or aria role -->\n<div class="flex gap-1"><button>B</button><button>I</button></div>`
  };

  specs['tooltip'] = {
    title: 'Tooltip',
    intent: 'Small contextual popup hint displayed on hover or keyboard focus.',
    anatomy: `<div class="tooltip-wrapper relative inline-block">\n  <button type="button" class="btn size-8" data-variant="ghost" aria-describedby="tooltip-hint">\n    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="size-4" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>\n  </button>\n  <div id="tooltip-hint" role="tooltip" class="popover absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded-md bg-primary px-2.5 py-1 text-xs text-primary-foreground shadow-sm" hidden>\n    Helpful info\n  </div>\n</div>`,
    variants: `Top tooltip (default), bottom, left, right tooltip.`,
    fsmTable: `| State | Contract | Trigger |\n|---|---|---|\n| closed | hidden | Default state |\n| open | visible | Hover or focus entered |`,
    iconPlacement: `None.`,
    correctHtml: `<div class="tooltip-wrapper relative inline-block">\n  <button type="button" class="btn size-8" data-variant="ghost" aria-describedby="tip-add">+</button>\n  <div id="tip-add" role="tooltip" class="popover absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground shadow-sm" hidden>Add item</div>\n</div>`,
    antiPatternHtml: `<!-- Anti-Pattern: Tooltip triggered only on mouse hover that cannot be reached via keyboard Tab -->\n<span title="Tooltip">Info</span>`
  };

  return specs;
}

// ==========================================
// PILLAR 2: skills/basecoat-dashboard/
// ==========================================

function buildPillar2Dashboard() {
  const baseDir = path.join(SKILLS_DIR, 'basecoat-dashboard');

  // 1. SKILL.md
  writeFile(path.join(baseDir, 'SKILL.md'), `---
name: basecoat-dashboard
description: Master UI/UX architecture and generation protocol for Basecoat UI (headless Tailwind CSS v4, pure Basecoat CSS, Kanso minimalism, and mandatory FSM data-state contracts).
dependencies: basecoat-ui-mcp
---

# Master UI/UX Protocol: Basecoat Architecture & Generation

You act as the Master UI/UX Architecture Agent for Basecoat UI. You are strictly bound to the following architectural rules, design standards, and generation workflows. Backend business logic is strictly out of scope.

## Trigger Scope
Trigger this skill whenever designing, scaffolding, or generating UI code for:
- Dashboards and analytics consoles
- Admin panels and management workspaces
- Back-office enterprise applications
- Internal tools, CRUD layouts, and data record grids
- Settings panels, authentication split-screens, and profile views

## Zero-Tolerance Guardrails

1. **Zero DaisyUI Classes**: DaisyUI class names (\`daisyui\`, \`card-body\`, \`menu-active\`, \`form-control\`, \`stat-value\`, \`btn-primary\`, \`table-pin-rows\`) are STRICTLY FORBIDDEN. All styling MUST be pure Basecoat CSS (\`.card\`, \`.btn\`, \`.input\`, \`.select\`, \`.textarea\`, \`.table\`, \`.dialog\`, \`.tabs\`, \`.badge\`, \`.dropdown-menu\`) combined with Tailwind CSS v4 utilities.
2. **Strict Tailwind CSS v4 Syntax**:
   - MUST use modern v4 slash opacity (e.g. \`bg-primary/80\`, \`text-muted-foreground/60\`). Deprecated Tailwind v3 utilities (\`bg-opacity-*\`, \`flex-shrink-*\`, \`flex-grow-*\`, \`overflow-ellipsis\`) are FORBIDDEN.
   - Forbid \`@tailwind base/components/utilities\` directives. Base stylesheet must use \`@import "tailwindcss"; @import "basecoat-css/vega";\`.
   - Forbid arbitrary bracket dimensions (\`w-[327px]\`, \`h-[412px]\`) and arbitrary color values (\`bg-[#...]\`). Use standard scale steps (0, 1, 2, 4, 6, 8, 12, 16, 20, 24, 32, 48, 64).
3. **Mandatory FSM \`data-state\` Contracts**:
   - All interactive components MUST declare explicit Finite State Machine attributes:
     - \`dialog\`: \`<dialog class="dialog" data-state="closed" data-fsm-recipe="dialog" data-fsm-state="closed">\`
     - \`dropdown-menu\`: \`<div class="dropdown-menu" data-state="closed">\` with trigger \`aria-expanded="false"\` and \`aria-controls="menu-id"\`.
     - \`tabs\`: \`<div class="tabs" data-state="active" data-fsm-recipe="tabs" data-fsm-state="active">\`
     - \`accordion\`: \`<section class="accordion" data-state="closed">\` using \`<details>\` and \`<summary>\`.
     - \`button\` (submit): \`<button type="submit" class="btn" data-variant="default" data-state="default">\` transitioning to \`data-state="loading"\` with disabled state during submission.
4. **Token-First Theming & Contrast**:
   - Use semantic CSS tokens exclusively: \`var(--primary)\`, \`var(--secondary)\`, \`var(--background)\`, \`var(--foreground)\`, \`var(--card)\`, \`var(--card-foreground)\`, \`var(--muted)\`, \`var(--muted-foreground)\`, \`var(--border)\`, \`var(--destructive)\`.
   - Hardcoded hex codes (\`#09090b\`, \`#ffffff\`) or low-contrast pairings are FORBIDDEN.
   - Theme resolver: Single dark mode strategy using \`html.dark\` class and \`localStorage\` key \`"themeMode"\` via \`window.basecoat.theme\`.
5. **Card 1px Ring Contract**:
   - The Basecoat \`.card\` component includes its own subtle 1px ring and shadow. Adding \`border\` or \`border-border\` to \`.card\` is strictly FORBIDDEN.
6. **Deterministic Class Ordering**:
   Order all utility classes deterministically on every element:
   \`Basecoat Class (.card/.btn/.input)\` -> \`Layout (block/flex/grid/hidden)\` -> \`Positioning (relative/sticky/fixed)\` -> \`Alignment (items-center/justify-between/col-span)\` -> \`Sizing (w/h/size/max-w)\` -> \`Spacing (p/m/gap)\` -> \`Typography (text/font/tracking/leading/tabular-nums)\` -> \`Surface/Background (bg-*)\` -> \`Borders/Rings (border-*/ring-*)\` -> \`Effects (shadow/opacity/transition)\` -> \`Interactive Variants (hover:/focus-visible:/dark:)\`.
7. **Clean Generation (Zero Muda)**:
   - Deliver clean, executable markup directly without preambles, chat filler, or redundant commentary.
   - Forbid duplicate wrapper containers (\`<div>\` soup). Apply layout utilities directly to semantic HTML5 elements (\`<header>\`, \`<main>\`, \`<nav>\`, \`<aside>\`, \`<section>\`, \`<footer>\`).
   - Forbid emojis. Use clean inline SVG icons (e.g. Lucide / Phosphor SVG paths).

## 4-Stage Intent-Driven Tooling Sequence

Before authoring custom markup, execute the 4-stage MCP pipeline:
1. **Step 1: Layout Scaffold (\`basecoat_page_architect\`)**: Query the layout scaffold (\`workspace-dashboard\`, \`auth-split-flow\`, \`workspace-detail\`, \`workspace-settings\`, \`data-records\`, \`marketing-pricing\`) to retrieve slot markers, container structures, and leaf component IDs.
2. **Step 2: Rules & Direction (\`basecoat_rules_enforcer\` & \`basecoat_creative_director\`)**: Enforce Tailwind v4 rules, FSM state contracts, semantic tokens, 4px/8px optical rhythm, and the typography ladder.
3. **Step 3: Component Syntax (\`basecoat_component_syntax\`)**: Fetch copy-pasteable Basecoat markup with state variants (\`default\`, \`active\`, \`loading\`, \`disabled\`, \`open\`, \`closed\`).
4. **Step 4: Quality Inspection (\`basecoat_quality_inspector\`)**: Audit the generated markup for syntax violations, missing ARIA attributes, WCAG 2.1 / APCA contrast compliance, and keyboard accessibility. Target a score of \`90+\` (\`valid: true\`).

## Master Routing Directives

Consult the specialized dashboard guides before generating markup:
- [foundations/theme.md](./foundations/theme.md) - Design foundations, theming, and dark mode resolver
- [block-patterns/sidebars.md](./block-patterns/sidebars.md) - Sidebars 01-16 architectures and slot targets
- [block-patterns/metrics.md](./block-patterns/metrics.md) - Metric cards, KPI grids, delta badges
- [block-patterns/tables.md](./block-patterns/tables.md) - Data tables, sticky headers, row actions
- [block-patterns/forms.md](./block-patterns/forms.md) - Form hierarchy, input groups, validation
- [block-patterns/charts.md](./block-patterns/charts.md) - Dashboard chart containers and responsive layouts
- [block-patterns/navigation.md](./block-patterns/navigation.md) - App shells, breadcrumbs, command menus
- [page-types/dashboard.md](./page-types/dashboard.md) - Dashboards 01-07 complete blueprints
- [page-types/auth.md](./page-types/auth.md) - Auth split-screens (login 01-05, signup 01-05, otp 01-05)
- [page-types/settings.md](./page-types/settings.md) - Workspace settings and preferences
- [page-types/reading-views.md](./page-types/reading-views.md) - Document viewers, detail slide-overs
- [audit/checklist.md](./audit/checklist.md) - Quality inspection checklist and audit protocol
`);

  // 2. foundations/SKILL.md & foundations/theme.md
  writeFile(path.join(baseDir, 'foundations', 'SKILL.md'), `---
name: basecoat-foundations
description: Design system foundations, tokens, typography, and optical rhythm for Basecoat dashboards.
---

# Dashboard Foundations

Foundations govern the spacing, typography, colors, and layout rhythm across all Basecoat dashboards.
`);

  writeFile(path.join(baseDir, 'foundations', 'theme.md'), `# Dashboard Theming & Dark Mode Protocol

## Theme Tokens & Resolver

Basecoat dashboards rely on class-based theming (\`html.dark\`). All surfaces must reference semantic tokens:
- \`bg-background\` -> Primary ground
- \`bg-card text-card-foreground\` -> Surface panels and metric cards
- \`bg-popover text-popover-foreground\` -> Elevated overlays, menus, dialogs
- \`border-border\` -> 1px subtle divider strokes

## Head Bootstrap Script
\`\`\`html
<script>
  try {
    var m = localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (e) {}
</script>
\`\`\`
`);

  // 3. block-patterns/SKILL.md & subfiles
  writeFile(path.join(baseDir, 'block-patterns', 'SKILL.md'), `---
name: basecoat-block-patterns
description: Macro layout block patterns for Basecoat dashboards.
---

# Macro Block Patterns

Routing for dashboard structural patterns:
- [sidebars.md](./sidebars.md) - Sidebars 01-16 architectures
- [metrics.md](./metrics.md) - KPI metrics and stats
- [tables.md](./tables.md) - Record tables and grids
- [forms.md](./forms.md) - Sectioned form layouts
- [charts.md](./charts.md) - Chart containers
- [navigation.md](./navigation.md) - Topbars and command palettes
`);

  // block-patterns/sidebars.md (All 16 sidebars)
  writeFile(path.join(baseDir, 'block-patterns', 'sidebars.md'), `# Sidebar Architectures: Complete 01-16 Catalog

Basecoat UI defines 16 distinct sidebar architectures catering to diverse enterprise workspace patterns.

## Summary of All 16 Sidebar Architectures

| ID | Name | Architecture | Slot Targets |
|---|---|---|---|
| \`sidebar-01\` | Standard Workspace | Header workspace switcher, collapsible nav sections, user footer profile | \`#sidebar-header\`, \`#sidebar-nav\`, \`#sidebar-footer\` |
| \`sidebar-02\` | Floating Card Sidebar | Inset floating card with rounded-xl border, search input trigger | \`#sidebar-search\`, \`#sidebar-nav\`, \`#sidebar-footer\` |
| \`sidebar-03\` | Inset Dashboard Layout | Persistent breadcrumb header, badge counters, status ring | \`#sidebar-header\`, \`#sidebar-nav\`, \`#header-breadcrumb\` |
| \`sidebar-04\` | Multi-Level Tree | Collapsible nested child items with tree line indicators | \`#sidebar-tree\`, \`#sidebar-footer\` |
| \`sidebar-05\` | Compact Icon Rail | 64px width (w-16) icon-only bar with hover tooltips and flyout | \`#sidebar-rail\`, \`#sidebar-flyout\` |
| \`sidebar-06\` | Dual-Rail Workspace | Fixed primary icon bar paired with contextual secondary tree panel | \`#primary-rail\`, \`#secondary-panel\`, \`#main-content\` |
| \`sidebar-07\` | Minimalist Flat Nav | Quiet typography, section dividers, footer system health indicator | \`#sidebar-nav\`, \`#sidebar-status\` |
| \`sidebar-08\` | Team Project Workspace | Team switcher dropdown, project list, quick action modal button | \`#team-switcher\`, \`#project-list\`, \`#quick-action\` |
| \`sidebar-09\` | Document Outline | Scroll-spy heading navigation with active anchor indicators | \`#doc-outline\`, \`#doc-content\` |
| \`sidebar-10\` | Faceted Filter Sidebar | Facet checkboxes, price range sliders, active filter tag pills | \`#filter-facets\`, \`#filter-actions\` |
| \`sidebar-11\` | Account Settings Nav | Categorized preference tabs paired with billing quota meter | \`#settings-nav\`, \`#quota-meter\` |
| \`sidebar-12\` | Mobile Slide-Out Drawer | Slide-over backdrop with touch gesture dismiss and full-width links | \`#drawer-header\`, \`#drawer-nav\`, \`#drawer-backdrop\` |
| \`sidebar-13\` | Collapsible Inset Rail | Toggle button switching \`data-state="expanded"\` to \`"collapsed"\` | \`#sidebar-toggle\`, \`#sidebar-nav\` |
| \`sidebar-14\` | Brand / Upgrade Callout | Prominent logo header, navigation items, plan upgrade callout card | \`#sidebar-logo\`, \`#upgrade-card\` |
| \`sidebar-15\` | Help & Resource Center | Search bar, FAQ category links, documentation pills, live chat trigger | \`#help-search\`, \`#resource-links\` |
| \`sidebar-16\` | E-commerce Taxonomy | Deep hierarchical category navigation with item counts | \`#category-tree\`, \`#price-filter\` |

---

## Canonical Blueprint: \`sidebar-01\` (Standard Workspace)

\`\`\`html
<aside class="sidebar flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground" data-state="expanded">
  <!-- Slot: #sidebar-header -->
  <header class="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
    <div class="flex items-center gap-2">
      <div class="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground font-semibold">A</div>
      <div class="flex flex-col">
        <span class="text-sm font-semibold leading-none">Acme Corp</span>
        <span class="text-xs text-muted-foreground">Enterprise Plan</span>
      </div>
    </div>
  </header>

  <!-- Slot: #sidebar-nav -->
  <nav class="flex-1 overflow-y-auto p-3 space-y-1" aria-label="Main Navigation">
    <a href="/dashboard" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" data-state="active">
      <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect width="7" height="9" x="3" y="3" rx="1"/><rect width="7" height="5" x="14" y="3" rx="1"/><rect width="7" height="9" x="14" y="12" rx="1"/><rect width="7" height="5" x="3" y="16" rx="1"/></svg>
      Dashboard
    </a>
    <a href="/analytics" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" data-state="default">
      <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
      Analytics
    </a>
    <a href="/orders" class="sidebar-item flex items-center justify-between rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent hover:text-sidebar-accent-foreground" data-state="default">
      <div class="flex items-center gap-3">
        <svg data-icon="inline-start" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
        Orders
      </div>
      <span class="badge" data-variant="secondary">24</span>
    </a>
  </nav>

  <!-- Slot: #sidebar-footer -->
  <footer class="border-t border-sidebar-border p-3">
    <div class="flex items-center gap-3 rounded-md p-2 hover:bg-sidebar-accent cursor-pointer">
      <span class="avatar size-8 rounded-full" data-state="loaded">
        <span class="avatar-fallback flex size-full items-center justify-center bg-muted text-xs font-medium">JD</span>
      </span>
      <div class="flex flex-col overflow-hidden">
        <span class="truncate text-sm font-medium">Jane Doe</span>
        <span class="truncate text-xs text-muted-foreground">jane@acme.com</span>
      </div>
    </div>
  </footer>
</aside>
\`\`\`
`);

  // block-patterns/metrics.md
  writeFile(path.join(baseDir, 'block-patterns', 'metrics.md'), `# KPI Metric Cards & Stat Grids

## Anatomy of a High-Impact KPI Card

\`\`\`html
<article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
  <header class="flex items-center justify-between">
    <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>
    <span class="badge" data-variant="outline">+12.5%</span>
  </header>
  <div class="flex flex-col gap-1">
    <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>
    <p class="text-xs text-muted-foreground">+20.1% from last month</p>
  </div>
</article>
\`\`\`

## 4-Card Responsive Metric Grid
\`\`\`html
<section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-label="Performance Metrics">
  <!-- 4 KPI Cards -->
</section>
\`\`\`
`);

  // block-patterns/tables.md
  writeFile(path.join(baseDir, 'block-patterns', 'tables.md'), `# Data Tables & Record Grids

## Table Container Guidelines
- Always wrap \`<table class="table w-full text-sm">\` in \`<div class="overflow-x-auto rounded-md border border-border">\`.
- Headers: \`<thead class="sticky top-0 bg-background/90 backdrop-blur">\`.
- Alignment: Text and IDs start-aligned; numbers, dates, and currency end-aligned (\`text-right tabular-nums\`).
`);

  // block-patterns/forms.md
  writeFile(path.join(baseDir, 'block-patterns', 'forms.md'), `# Form Patterns & Layouts

Sectioned form layouts divide complex settings into scannable cards. Every field pairs \`<label class="label">\` with \`<input class="input">\` and dual validation indicators.
`);

  // block-patterns/charts.md
  writeFile(path.join(baseDir, 'block-patterns', 'charts.md'), `# Dashboard Chart Containers

Wrap charts in \`.card\` surfaces with explicit header titles, time-range selectors, and responsive containers.
`);

  // block-patterns/navigation.md
  writeFile(path.join(baseDir, 'block-patterns', 'navigation.md'), `# Navigation Patterns & Topbars

Topbars provide workspace breadcrumbs, global search triggers, style pack selectors, and user avatar dropdowns in a compact \`h-12\` or \`h-14\` bar.
`);

  // 4. content-strategy/SKILL.md
  writeFile(path.join(baseDir, 'content-strategy', 'SKILL.md'), `---
name: basecoat-content-strategy
description: Information architecture, cognitive budget, and realistic content strategy for Basecoat interfaces.
---

# Content Strategy & Information Architecture

## The 25-Fragment Budget
In the first viewport (above the fold), limit information to:
- Max 3 distinct visual regions
- Max 5 user action buttons
- Approximately 25 scannable text fragments

## Zero Lorem Ipsum
Always use domain-authentic data: \`INV-2024-001\`, realistic currencies, proper personal names, and active verbs (\`Export CSV\`, \`Invite Member\`).
`);

  // 5. page-types/SKILL.md & subfiles
  writeFile(path.join(baseDir, 'page-types', 'SKILL.md'), `---
name: basecoat-page-types
description: Master blueprints for Dashboards 01-07, Auth Split-Screens, Settings, and Reading Views.
---

# Page Type Blueprints

- [dashboard.md](./dashboard.md) - Dashboards 01-07
- [auth.md](./auth.md) - Auth split-screens (login 01-05, signup 01-05, otp 01-05)
- [settings.md](./settings.md) - Settings panels
- [reading-views.md](./reading-views.md) - Document and detail slide-overs
`);

  // page-types/dashboard.md (Dashboards 01-07)
  writeFile(path.join(baseDir, 'page-types', 'dashboard.md'), `# Dashboard Blueprints: Complete 01-07 Catalog

## Summary of All 7 Dashboard Archetypes

| ID | Archetype | Core Components & Slots |
|---|---|---|
| \`dashboard-01\` | Executive KPI Overview | 4 Metric Cards -> Revenue Area Chart -> Recent Orders Table |
| \`dashboard-02\` | Analytics Workspace | Time-Series Line Comparison -> Funnel Bar Chart -> Geography Table |
| \`dashboard-03\` | E-Commerce Storefront Manager | Sales Trend Area -> Fulfillment Alert Cards -> Low Stock Grid |
| \`dashboard-04\` | SaaS Subscription Console | MRR / ARR Metrics -> Churn Bar Chart -> Active Seat Management Table |
| \`dashboard-05\` | Project & Task Management | Sprint Progress Gauges -> Burn-down Line Chart -> Kanban Task Cards |
| \`dashboard-06\` | CRM & Customer Pipeline | Deal Stage Funnel -> Activity Timeline -> Contact Directory Ledger |
| \`dashboard-07\` | DevOps & Infrastructure Health | System Status Badges -> CPU/RAM Area Charts -> Incident Log Table |

---

## Blueprint: \`dashboard-01\` (Executive KPI Overview)

\`\`\`html
<div class="flex min-h-screen bg-background text-foreground">
  <!-- Sidebar -->
  <aside class="sidebar hidden md:flex h-screen w-64 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
    <header class="flex h-14 items-center border-b border-sidebar-border px-4 font-semibold">Executive Console</header>
    <nav class="flex-1 p-3 space-y-1">
      <a href="#" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent" data-state="active">Overview</a>
      <a href="#" class="sidebar-item flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-sidebar-accent">Reports</a>
    </nav>
  </aside>

  <!-- Main View -->
  <div class="flex flex-1 flex-col overflow-hidden">
    <!-- Topbar -->
    <header class="flex h-14 items-center justify-between border-b border-border px-6">
      <h1 class="text-lg font-semibold tracking-tight">Executive Overview</h1>
      <div class="flex items-center gap-2">
        <button type="button" class="btn" data-variant="outline" data-size="sm">Export Report</button>
      </div>
    </header>

    <!-- Main Content Grid -->
    <main class="flex-1 overflow-y-auto p-6 space-y-6">
      <!-- 4 Metric Cards -->
      <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <article class="card flex flex-col gap-4 rounded-xl bg-card p-6 text-card-foreground shadow-sm">
          <header class="flex items-center justify-between">
            <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>
            <span class="badge" data-variant="outline">+20.1%</span>
          </header>
          <div class="flex flex-col gap-1">
            <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>
            <p class="text-xs text-muted-foreground">+20.1% from last month</p>
          </div>
        </article>
      </section>

      <!-- Charts & Tables -->
      <section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <article class="card col-span-2 flex flex-col gap-4 rounded-xl bg-card p-6 shadow-sm">
          <header class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Revenue Overview</h3>
          </header>
          <div class="h-80 w-full" id="revenue-chart"></div>
        </article>
        <article class="card flex flex-col gap-4 rounded-xl bg-card p-6 shadow-sm">
          <header class="flex items-center justify-between">
            <h3 class="text-base font-semibold">Recent Sales</h3>
          </header>
          <div class="space-y-4">
            <!-- Recent sales items -->
          </div>
        </article>
      </section>
    </main>
  </div>
</div>
\`\`\`
`);

  // page-types/auth.md (login 01-05, signup 01-05, otp 01-05)
  writeFile(path.join(baseDir, 'page-types', 'auth.md'), `# Authentication Blueprints: Complete Catalog

## 1. Login Archetypes (\`login-01..05\`)
- \`login-01\`: Clean centered card with email/password and OAuth buttons.
- \`login-02\`: Split-screen branded hero (left promotional testimonial, right login form).
- \`login-03\`: Minimal single-column auth with floating labels and magic link toggle.
- \`login-04\`: Enterprise SSO login with auto-domain detection and SAML redirect.
- \`login-05\`: Modal dialog login overlay with smooth backdrop blur.

## 2. Signup Archetypes (\`signup-01..05\`)
- \`signup-01\`: Standard onboarding signup card with terms checkbox and password strength bar.
- \`signup-02\`: Split-screen signup with customer testimonial and product showcase.
- \`signup-03\`: Multi-step wizard signup (Account -> Workspace -> Plan selection).
- \`signup-04\`: Team invite-accept signup with pre-filled email and workspace badge.
- \`signup-05\`: Minimal waitlist early-access signup with email and referral code.

## 3. OTP Verification Archetypes (\`otp-01..05\`)
- \`otp-01\`: 6-digit segmented input-otp card with auto-focus and resend countdown timer.
- \`otp-02\`: Split-screen two-factor authentication (2FA) verification.
- \`otp-03\`: Recovery backup code entry with switch to SMS/authenticator app.
- \`otp-04\`: In-app step-up security verification modal for sensitive operations.
- \`otp-05\`: Email verification confirmation screen with 6-digit PIN input.

---

## Canonical Blueprint: \`login-02\` (Split-Screen Branded Auth)

\`\`\`html
<div class="grid min-h-screen grid-cols-1 lg:grid-cols-2">
  <!-- Left Column: Branded Hero Showcase -->
  <div class="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
    <div class="flex items-center gap-2 font-semibold">
      <div class="flex size-8 items-center justify-center rounded-lg bg-primary-foreground text-primary font-bold">A</div>
      <span>Acme Platform</span>
    </div>
    <div class="space-y-2">
      <blockquote class="text-lg font-medium leading-relaxed">
        &ldquo;Basecoat UI enabled us to deliver high-performance enterprise dashboards with zero JavaScript runtime overhead.&rdquo;
      </blockquote>
      <footer class="text-sm opacity-80">&mdash; Sofia Davis, VP of Engineering</footer>
    </div>
  </div>

  <!-- Right Column: Login Form -->
  <div class="flex items-center justify-center p-8">
    <div class="w-full max-w-sm space-y-6">
      <header class="flex flex-col space-y-2 text-center">
        <h1 class="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p class="text-sm text-muted-foreground">Enter your credentials to access your workspace</p>
      </header>

      <form class="space-y-4" novalidate>
        <div class="field flex flex-col gap-2" data-invalid="false">
          <label for="email" class="label text-sm font-medium">Email</label>
          <input id="email" type="email" class="input" placeholder="name@company.com" required />
        </div>
        <div class="field flex flex-col gap-2" data-invalid="false">
          <div class="flex items-center justify-between">
            <label for="password" class="label text-sm font-medium">Password</label>
            <a href="/forgot-password" class="text-xs text-muted-foreground hover:underline">Forgot password?</a>
          </div>
          <input id="password" type="password" class="input" required />
        </div>
        <button type="submit" class="btn w-full" data-variant="default" data-state="default">
          Sign In
        </button>
      </form>
    </div>
  </div>
</div>
\`\`\`
`);

  // page-types/settings.md
  writeFile(path.join(baseDir, 'page-types', 'settings.md'), `# Workspace Settings Blueprints

Settings screens feature categorized navigation tabs (General, Members, Billing, API Keys) with sectioned form cards and danger zones.
`);

  // page-types/reading-views.md
  writeFile(path.join(baseDir, 'page-types', 'reading-views.md'), `# Reading Views & Master-Detail Inspection

Optimized reading layouts constrain text measure to \`60-75ch\` (\`max-w-prose\`), with master-detail slide-over inspection drawers.
`);

  // 6. audit/SKILL.md & audit/checklist.md
  writeFile(path.join(baseDir, 'audit', 'SKILL.md'), `---
name: basecoat-dashboard-audit
description: Quality inspection and audit protocol for Basecoat dashboards.
---

# Dashboard Quality Audit

Automated quality gate verifying that generated dashboards meet the 90+ score threshold.
`);

  writeFile(path.join(baseDir, 'audit', 'checklist.md'), `# Basecoat Dashboard Quality Inspection Checklist

## 1. Syntax & Forbidden Class Audit
- [ ] ZERO DaisyUI classes (\`daisyui\`, \`card-body\`, \`btn-primary\`, \`form-control\`, \`table-pin-rows\`).
- [ ] ZERO deprecated Tailwind v3 utilities (\`bg-opacity-*\`, \`flex-shrink-*\`, \`overflow-ellipsis\`).
- [ ] ZERO \`border\` or \`border-border\` on \`.card\` elements.

## 2. FSM & Accessibility Audit
- [ ] Explicit \`data-state\` declared on interactive controls.
- [ ] Dialogs have \`<dialog>\` + \`aria-labelledby\` linking to visible title.
- [ ] Tabs have \`[role="tablist"]\`, \`[role="tab"]\`, and \`[role="tabpanel"]\`.

## 3. Typography & Spacing Audit
- [ ] All numeric metrics use \`tabular-nums\`.
- [ ] Headers adhere to \`h-12\` or \`h-14\` proportions.
- [ ] Card spacing follows 4px/8px optical rhythm.
`);
}

// ==========================================
// PILLAR 3: skills/basecoat-charts/
// ==========================================

function buildPillar3Charts() {
  const baseDir = path.join(SKILLS_DIR, 'basecoat-charts');

  // 1. SKILL.md
  writeFile(path.join(baseDir, 'SKILL.md'), `---
name: basecoat-charts
description: Basecoat Charts skill for ApexCharts and SVG data visualization. Maps colors to CSS tokens (--chart-1..5) with zero React dependencies and 5-framework mounts.
---

# Basecoat Charts: Master Visualization Protocol

Basecoat Charts provides robust, theme-aware chart blueprints designed to integrate seamlessly with Basecoat CSS and Tailwind CSS v4.

## Core Directives

1. **Theme-Token Color Mapping**: All series colors must bind directly to CSS variables (`var(--chart-1)` through `var(--chart-5)`) or surface tokens (`var(--foreground)`, `var(--muted-foreground)`, `var(--border)`).
2. **Container Sizing & Responsive Footprint**: Chart viewport wrappers must specify the standard responsive layout footprint: `w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]`. Outer containers specify `chart-container card p-6 flex flex-col gap-4 w-full` with `role="img"` and descriptive `aria-label`.
3. **Glassmorphic Tooltip Markup**: Interactive chart tooltips must feature Basecoat glassmorphic styling: `<div class="rounded-lg border border-border bg-background/95 p-2.5 text-xs shadow-xl backdrop-blur-sm" data-chart-tooltip>...</div>` with indicator dot/line/dashed/badge and numeric value formatting with `tabular-nums`.
4. **Screen-Reader Data Fallback**: Every chart blueprint embeds an accessible table fallback for assistive technology: `<table class="sr-only"><caption>${title}</caption><thead>...</thead><tbody>...</tbody></table>`.
5. **Zero Framework Wrappers**: Do not require heavy framework wrappers like `react-apexcharts`. Initialize charts directly with client-side vanilla ApexCharts mounts across all 5 supported frameworks (`vanilla`, `astro`, `react`, `vue`, `svelte`).
6. **SVG Fallback & Macro Dashboard Binding**: For offline dashboards without third-party dependencies, declarative Basecoat SVG area charts (`svg-area-chart`) and layout blocks like `dashboard-01` bind directly to `data-chart-id="area-interactive"`.

## Chart Categories

| Type | Guide | Best For |
|---|---|---|
| Area | [area.md](./area.md) | Magnitude, cumulative volume, filled trends |
| Bar | [bar.md](./bar.md) | Leaderboards, discrete rank comparison |
| Line | [line.md](./line.md) | Continuous time-series trends |
| Pie / Donut | [pie.md](./pie.md) | Part-to-whole proportions and shares |
| Radar | [radar.md](./radar.md) | Multi-axis assessment and skill matrices |
| Radial | [radial.md](./radial.md) | Progress percentage dials and gauges |
| Tooltip | [tooltip.md](./tooltip.md) | Custom Basecoat popover tooltip styling |
| Audit | [audit/checklist.md](./audit/checklist.md) | Quality inspection and validation gate |
`);

  // 2. Chart category guides
  const chartTypes = [
    { id: 'area', name: 'Area', desc: 'Render ApexCharts area charts to emphasize magnitude, cumulative totals, and filled volume.' },
    { id: 'bar', name: 'Bar', desc: 'Render horizontal bar charts for categorical comparison, leaderboards, and rankings.' },
    { id: 'line', name: 'Line', desc: 'Render continuous time-series line charts with smoothed or stepped curves.' },
    { id: 'pie', name: 'Pie / Donut', desc: 'Render proportion charts displaying percentage distributions of a single whole.' },
    { id: 'radar', name: 'Radar', desc: 'Render multi-axis spider charts for multi-dimensional performance assessment.' },
    { id: 'radial', name: 'Radial Bar', desc: 'Render circular progress gauges and percentage completion dials.' }
  ];

  for (const c of chartTypes) {
    writeFile(path.join(baseDir, `${c.id}.md`), buildChartTypeMarkdown(c));
  }

  // 3. tooltip.md
  writeFile(path.join(baseDir, 'tooltip.md'), `# Custom Basecoat Chart Tooltips

## Custom HTML Tooltip Blueprint
ApexCharts allows rendering custom HTML tooltips. Basecoat styles tooltips using semantic popover tokens:

\`\`\`javascript
const options = {
  tooltip: {
    custom: function({ series, seriesIndex, dataPointIndex, w }) {
      const value = series[seriesIndex][dataPointIndex];
      const label = w.globals.labels[dataPointIndex];
      return \`
        <div class="popover rounded-md bg-popover p-2 text-popover-foreground shadow-md border border-border text-xs">
          <span class="font-medium">\${label}</span>:
          <strong class="tabular-nums font-semibold ml-1">\${value}</strong>
        </div>
      \`;
    }
  }
};
\`\`\`
`);

  // 4. audit/SKILL.md & audit/checklist.md
  writeFile(path.join(baseDir, 'audit', 'SKILL.md'), `---
name: basecoat-charts-audit
description: Quality inspection gate for chart visualizations.
---

# Chart Quality Audit
`);

  writeFile(path.join(baseDir, 'audit', 'checklist.md'), `# Basecoat Chart Quality Inspection Checklist

- [ ] Series colors use \`var(--chart-1)\` through \`var(--chart-5)\`.
- [ ] No hardcoded hex color codes in series options.
- [ ] Responsive chart viewport wrapper specifies \`w-full aspect-[4/3] md:aspect-[16/9] lg:aspect-[2/1] min-h-[240px]\`.
- [ ] Outer container specifies \`chart-container card p-6 flex flex-col gap-4 w-full\` with \`role="img"\` and \`aria-label\`.
- [ ] Glassmorphic tooltip markup includes \`data-chart-tooltip\`, \`bg-background/95\`, \`backdrop-blur-sm\`, and \`border-border\`.
- [ ] Screen-reader accessible data table fallback (\`<table class="sr-only">\`) is present inside the chart container.
- [ ] Grid border colors use \`var(--border)\` or \`var(--color-border)\`.
- [ ] All numeric tooltips and axis labels use \`tabular-nums\`.
- [ ] Macro integration: \`dashboard-01\` and \`svg-area-chart\` bind to \`data-chart-id="area-interactive"\`.
`);
}

function buildChartTypeMarkdown(c) {
  return `---
name: ${c.id}
description: ${c.desc}
---

# ${c.name} Charts

## Overview & Guardrails
- **Appearance**: Theme-aware ${c.name.toLowerCase()} visualization bound to Basecoat OKLCH CSS tokens.
- **Tokens**: Uses \`var(--chart-1)\` through \`var(--chart-5)\`.
- **Container**: Parent element must be \`w-full h-80\` or explicit responsive height.

## Canonical ApexCharts Configuration

\`\`\`javascript
const options = {
  chart: {
    type: "${c.id === 'pie' ? 'donut' : c.id}",
    height: "100%",
    fontFamily: "inherit",
    toolbar: { show: false },
    zoom: { enabled: false }
  },
  colors: ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)"],
  series: [
    { name: "Metric A", data: [30, 40, 35, 50, 49, 60] },
    { name: "Metric B", data: [20, 32, 28, 42, 38, 52] }
  ],
  grid: {
    borderColor: "var(--border)",
    strokeDashArray: 4
  },
  dataLabels: { enabled: false }
};
\`\`\`

## 5-Framework Mount Snippets

### 1. Vanilla HTML / JS
\`\`\`html
<div class="card p-6">
  <div id="chart" class="w-full h-80"></div>
</div>
<script type="module">
  import ApexCharts from 'apexcharts';
  const chart = new ApexCharts(document.getElementById('chart'), options);
  chart.render();
</script>
\`\`\`

### 2. Astro
\`\`\`astro
<div class="card p-6">
  <div id="astro-chart" class="w-full h-80"></div>
</div>
<script>
  import ApexCharts from 'apexcharts';
  const el = document.getElementById('astro-chart');
  if (el) {
    const chart = new ApexCharts(el, options);
    chart.render();
  }
</script>
\`\`\`

### 3. Next.js Client Component
\`\`\`tsx
'use client';
import { useEffect, useRef } from 'react';
import ApexCharts from 'apexcharts';

export function ChartWidget() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ref.current) return;
    const chart = new ApexCharts(ref.current, options);
    chart.render();
    return () => chart.destroy();
  }, []);
  return <div ref={ref} className="w-full h-80" />;
}
\`\`\`

### 4. Svelte
\`\`\`svelte
<script>
  import { onMount } from 'svelte';
  import ApexCharts from 'apexcharts';
  let chartEl;
  onMount(() => {
    const chart = new ApexCharts(chartEl, options);
    chart.render();
    return () => chart.destroy();
  });
</script>
<div bind:this={chartEl} class="w-full h-80"></div>
\`\`\`

### 5. Vue
\`\`\`vue
<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import ApexCharts from 'apexcharts';
const chartRef = ref(null);
let chartInstance = null;
onMounted(() => {
  chartInstance = new ApexCharts(chartRef.value, options);
  chartInstance.render();
});
onUnmounted(() => chartInstance?.destroy());
</script>
<template>
  <div ref="chartRef" class="w-full h-80"></div>
</template>
\`\`\`
`;
}

// ==========================================
// SYNC & PERMISSIONS (Stage 4.3)
// ==========================================

function copyDirRecursive(src, dest) {
  if (fs.existsSync(dest)) {
    const stat = fs.lstatSync(dest);
    if (stat.isSymbolicLink()) {
      fs.unlinkSync(dest);
    } else {
      fs.rmSync(dest, { recursive: true, force: true });
    }
  }
  ensureDir(dest);

  const entries = fs.readdirSync(src, { withFileTypes: true });
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDirRecursive(srcPath, destPath);
    } else if (entry.isFile()) {
      const content = fs.readFileSync(srcPath);
      fs.writeFileSync(destPath, content, { mode: 0o644 });
      fs.chmodSync(destPath, 0o644);
    }
  }
  fs.chmodSync(dest, 0o755);
}

function enforcePermissionsAndSymlinks(targetDir) {
  if (!fs.existsSync(targetDir)) return;
  const entries = fs.readdirSync(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(targetDir, entry.name);
    if (entry.isSymbolicLink()) {
      throw new Error(`Forbidden symlink detected at: ${fullPath}`);
    }
    if (entry.isDirectory()) {
      fs.chmodSync(fullPath, 0o755);
      enforcePermissionsAndSymlinks(fullPath);
    } else if (entry.isFile()) {
      fs.chmodSync(fullPath, 0o644);
    }
  }
}

function verifyNoForbiddenTokens(targetDir) {
  const forbiddenPatterns = [
    /\bdaisyui\b/i,
    /\bcard-body\b/,
    /\bbtn-primary\b/,
    /\bbtn-secondary\b/,
    /\bform-control\b/,
    /\bstat-value\b/,
    /\btable-pin-rows\b/,
    /\bmenu-active\b/
  ];

  let violations = [];
  function scan(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (entry.isFile() && (entry.name.endsWith('.md') || entry.name.endsWith('.json'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        for (const pattern of forbiddenPatterns) {
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            // Skip explanatory text explicitly forbidding DaisyUI
            if (/WRONG:|FORBIDDEN:|Zero DaisyUI|DaisyUI class names/i.test(line)) {
              continue;
            }
            if (pattern.test(line)) {
              violations.push(`${fullPath}:${i + 1}: matches forbidden pattern ${pattern}`);
            }
          }
        }
      }
    }
  }

  scan(targetDir);
  if (violations.length > 0) {
    console.error('Violations found in generated vault:');
    for (const v of violations.slice(0, 10)) console.error('  ', v);
    throw new Error(`Forbidden patterns found: ${violations.length} violations`);
  }
}

// ==========================================
// MAIN EXECUTION
// ==========================================

export async function main() {
  console.log('=== Stage 4.1: Building 3-Pillar Basecoat Skill Vault ===');
  console.log('Generating Pillar 1: skills/basecoat/...');
  buildPillar1Basecoat();

  console.log('Generating Pillar 2: skills/basecoat-dashboard/...');
  buildPillar2Dashboard();

  console.log('Generating Pillar 3: skills/basecoat-charts/...');
  buildPillar3Charts();

  console.log('Verifying generated repo skills directory...');
  enforcePermissionsAndSymlinks(SKILLS_DIR);
  verifyNoForbiddenTokens(SKILLS_DIR);

  console.log('=== Stage 4.3: Mirroring Vault to IDE Skill Directories ===');
  const pillars = ['basecoat', 'basecoat-dashboard', 'basecoat-charts'];

  for (const pillar of pillars) {
    const src = path.join(SKILLS_DIR, pillar);
    const cursorDest = path.join(CURSOR_SKILLS_DIR, pillar);
    const geminiDest = path.join(GEMINI_SKILLS_DIR, pillar);

    console.log(`Mirroring ${pillar} -> ~/.cursor/skills/${pillar}`);
    copyDirRecursive(src, cursorDest);

    console.log(`Mirroring ${pillar} -> ~/.gemini/config/skills/${pillar}`);
    copyDirRecursive(src, geminiDest);
  }

  console.log('Enforcing permissions & checking for symlinks in mirrored targets...');
  for (const pillar of pillars) {
    enforcePermissionsAndSymlinks(path.join(CURSOR_SKILLS_DIR, pillar));
    enforcePermissionsAndSymlinks(path.join(GEMINI_SKILLS_DIR, pillar));
  }

  console.log('=== Stage 4.1 & 4.3 Successfully Completed! ===');
  console.log(`Pillars created: ${pillars.join(', ')}`);
  console.log(`57 component reference files generated in skills/basecoat/components/`);
  console.log(`Permissions strictly enforced: 0 symlinks, chmod 755 (dirs), chmod 644 (files).`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(err => {
    console.error('Build failed:', err);
    process.exit(1);
  });
}
