// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
export const THEMING = `# Basecoat 1.0.2 theming contract (light/dark, tokens, controls)

Use this before restyling, auditing, or "making it look like shadcn". Do not
grep minified basecoat CSS in node_modules; the facts below are the contract.

## Tokens
- basecoat-css ships the shadcn/ui neutral oklch palette on :root and .dark:
  --background --foreground --card --popover --primary --secondary --muted
  --accent --destructive --border --input --ring --chart-1..5 --sidebar-*,
  plus --radius. .dark also sets color-scheme: dark.
- The default color palette used is "neutral" (zinc/neutral). However, there must be a possibility to work with other shadcn/ui color palettes (e.g., slate, stone, gray, red, blue, etc.). By default, neutral should be chosen.
- Override tokens in theme.css AFTER basecoat, for BOTH :root and .dark, when applying a non-neutral shadcn/ui palette or customizing.
  Never invent a parallel palette (--bg-canvas, --border-strong) that bypasses
  these tokens; components will not follow it and light/dark drift apart.
- Keep semantic status colors (success/warning/danger) as extra tokens defined
  in both scopes.

## Dark mode: one strategy, one resolver
- Strategy is class-based: html.dark. Do not also ship
  @media (prefers-color-scheme: dark) token blocks; mixing both leaks dark
  values into light mode for users with a dark OS.
- Runtime API: window.basecoat.theme.get() / set('light'|'dark') / toggle().
  set() persists localStorage key "themeMode" and dispatches
  "basecoat:themechange". Use it for toggles; do not write a second getTheme()
  with its own key or default. Toggle markup: get_component_details
  id "theme-switcher".
- No-flash bootstrap: one tiny inline script in <head>, before CSS paints,
  reading the SAME key and the SAME default as the runtime:
    <script>try{var m=localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark',m==='dark');}catch(e){}</script>
  Add a matchMedia system fallback only if the product wants "system" as the
  default, and then apply the same fallback everywhere theme is resolved.
- Every server-rendered page (including login/error pages outside the app
  shell) must include the bootstrap, or it renders in the wrong mode.

## Form controls
- Use Basecoat control classes/elements (input, select, textarea,
  input[type=checkbox|radio], switch). Borders use --input, focus uses --ring.
  Do not hand-roll checkbox visuals with --foreground/--border-strong borders;
  they look too heavy in light mode.
- Browser autofill paints its own background. If needed, neutralize it with
  input:-webkit-autofill { -webkit-text-fill-color: var(--foreground);
  box-shadow: 0 0 0 1000px var(--background) inset;
  transition: background-color 9999s; } in theme.css.

## Typography
- Keep one sans family with full Latin Extended coverage (e.g. Lithuanian
  ąčęėįšųūž) when replacing fonts; verify glyphs before shipping. Use
  tabular-nums for numeric table/KPI values.

## Verify
- validate_composition flags mixed media+class strategies and custom theme
  storage keys in the source you pass. Then screenshot light AND dark, with an
  OS dark preference and an empty localStorage, before deploying.
`;
