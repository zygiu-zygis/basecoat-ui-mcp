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

## Style Packs (Presets: Vega, Nova, Maia, Lyra, Mira, Luma, Sera, Rhea)
Basecoat ships 8 distinct style packs matching shadcn/ui design families:
- **Vega** (default): Standard shadcn/ui aesthetic (rounded-md buttons, rounded-xl shadow-sm cards, balanced padding).
- **Nova**: Modern SaaS aesthetic (rounded-lg buttons, rounded-xl ring cards, compact vertical padding).
- **Maia**: Playful, organic modern aesthetic (rounded-4xl pill buttons, rounded-2xl cards, open:bg-muted/50).
- **Lyra**: High-density brutalist/technical aesthetic (rounded-none buttons/cards, text-xs typography, 1px rings).
- **Mira**: Editorial compact typography (rounded-md text-xs/relaxed buttons, rounded-lg cards).
- **Luma**: Soft modern aesthetic (rounded-4xl buttons, soft ring-foreground/5 cards).
- **Sera**: Clean architectural/flat aesthetic (rounded-none uppercase font-semibold buttons, shadow-sm cards).
- **Rhea**: Modern curved aesthetic (rounded-2xl buttons and cards).

### CSS Selection (Static)
Load one style pack directly in your application CSS after Tailwind:
    @import "tailwindcss";
    @import "basecoat-css/vega"; /* or basecoat-css/nova, basecoat-css/maia, basecoat-css/lyra, basecoat-css/mira, basecoat-css/luma, basecoat-css/sera, basecoat-css/rhea */

### Header Control Cluster (Style Preset Select + Theme Toggle)
Standard header action cluster (as seen on basecoatui.com):
    <div class="flex items-center gap-2">
      <select id="style-variant-select" class="select h-8 w-28 text-sm leading-none" aria-label="Style pack">
        <option value="vega">Vega</option>
        <option value="nova">Nova</option>
        <option value="maia">Maia</option>
        <option value="lyra">Lyra</option>
        <option value="mira">Mira</option>
        <option value="luma">Luma</option>
        <option value="sera">Sera</option>
        <option value="rhea">Rhea</option>
      </select>
      <button type="button" aria-label="Toggle dark mode" data-tooltip="Toggle dark mode" data-side="bottom" onclick="window.basecoat.theme.toggle()" class="btn size-8" data-variant="outline" data-size="icon">
        <span class="hidden dark:block"><svg class="lucide lucide-sun size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2m-7.07-2.93 1.41-1.41m11.32-11.32 1.41-1.41M2 12h2m16 0h2m-2.93 7.07-1.41-1.41M6.34 6.34 4.93 4.93"/></svg></span>
        <span class="block dark:hidden"><svg class="lucide lucide-moon size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401"/></svg></span>
      </button>
    </div>

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
