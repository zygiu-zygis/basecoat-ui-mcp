// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
export const FRAMEWORK_INTEGRATION = `# Basecoat 1.0.2 + Modern Frameworks (Astro / Next.js / Express) + Tailwind CSS 4

This registry targets Basecoat 1.0.2. Basecoat is HTML, CSS, and small vanilla
JavaScript controllers; no frontend framework runtime or client hydration
directive is required. Install these dependencies in the consuming application,
not in this offline MCP server. Basecoat works seamlessly with Astro, Next.js, Express templates, or pure HTML.

## Production: Vite/Tailwind 4 build

Install: npm install basecoat-css@1.0.2 tailwindcss@4 @tailwindcss/vite@4
Use your framework's supported Tailwind version. Tailwind 4 uses the Vite plugin;
do not add the old integrations if migrating to v4.

astro.config.mjs:
    import { defineConfig } from "astro/config";
    import tailwindcss from "@tailwindcss/vite";
    export default defineConfig({ vite: { plugins: [tailwindcss()] } });

src/styles/global.css, in this order:
    @import "tailwindcss";
    @import "basecoat-css/base";
    /* Optional project tokens and overrides after Basecoat: */
    @import "./theme.css";

Create theme.css or omit that last import. Basecoat must come after any stylesheet
that emits Tailwind preflight. Do not load another full Tailwind reset afterward.
Use "basecoat-css/base" for app CSS; keep project tokens and overrides in theme.css.

Import global CSS in the shared Astro layout frontmatter:
    ---
    import "../styles/global.css";
    ---

Only load the browser controllers the page uses, in a plain Astro script:
    <script>
      import "basecoat-css/basecoat";
      import "basecoat-css/tabs";
    </script>

The runtime must precede individual controller imports. Other controller exports
include accordion, combobox, command, drawer, dropdown-menu, popover, range,
select, sidebar, and toast. Do not import "basecoat-css/all";
load the runtime followed by only the granular controllers the page uses.
Chart uses "basecoat-css/chart" with Chart.js supplied separately by the app.
For offline dashboards that cannot ship Chart.js, prefer the curated
"svg-area-chart" leaf and macro: declarative SVG with role="img", title/desc,
and no window.Chart requirement. Keep the existing chart leaf unchanged for
hosts that already initialize basecoat.chart().

## Sidebar FSM vs Basecoat sidebar controller

Semantic recipe "collapsible-navigation" models interaction states, events,
guards, and transitions for agent planning. It does not drive the DOM.

Basecoat's sidebar controller owns runtime behavior: call element.toggle(),
and keep aria-hidden plus inert in sync with the open/closed visual state.
Wire header Menu buttons with aria-controls pointing at the sidebar id.
Do not invent a parallel JS FSM that fights toggle()/aria-hidden/inert.
Use get_fsm_recipe("collapsible-navigation") for planning vocabulary, then
implement with the Basecoat sidebar controller and sidebar-dashboard-shell
(or sidebar-nav) macros.

Basecoat JS controllers should be bundled by your framework (e.g. Astro scripts, Next.js client components).
Ensure scripts that initialize Basecoat are executed only on the client side.

Badge, Button, Card, Empty, Input, Item, and Table need no Basecoat JavaScript. Dialog uses the native
<dialog class="dialog"> with showModal() and close(); there is no
"basecoat-css/dialog" controller. Give the dialog an inner <div> surface and
connect its heading through aria-labelledby. Wire native events in a browser
script, or use ordinary HTML inline event handlers when the application's CSP
permits them. Do not assume a data attribute alone opens a dialog.

Tabs requires both the runtime and tabs controller. Use .tabs, a role="tablist"
container, role="tab" buttons with aria-controls/aria-selected and roving
tabindex, and labelled role="tabpanel" panels; mark inactive panels hidden.
Use unique IDs when rendering multiple instances.

## Navigation and DOM updates

Basecoat initializes on page load and observes inserted DOM. After manual HTML
insertion, window.basecoat.initAll() initializes missing instances without
duplicating existing ones. Normal full-page Astro navigation needs no router hook.

If the application enables Astro ClientRouter, bundled modules execute once.
Register an astro:page-load listener in the same processed script after imports:
    const initBasecoat = () => {
      const browser = window as Window & {
        basecoat?: { initAll(options?: { force?: boolean }): void };
      };
      browser.basecoat?.initAll();
    };
    document.addEventListener("astro:page-load", initBasecoat);

That event covers initial and subsequent ClientRouter navigation. Keep shared
runtime imports and this listener in one layout script. Bind application-owned
dialog triggers after navigation as well, using idempotent binding or event
delegation. For cached DOM that was already initialized, initAll({ force: true })
destroys and recreates instances; use deliberately because it resets transient
interaction state. Do not force-reset persistent components on every navigation.

## Prototype: standalone HTML with CDN

For a disposable prototype, the pinned standalone stylesheet works without a
Tailwind build:
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/basecoat-css@1.0.2/dist/basecoat.cdn.min.css">

For tabs, load the runtime before the controller:
    <script src="https://cdn.jsdelivr.net/npm/basecoat-css@1.0.2/dist/js/basecoat.min.js" defer></script>
    <script src="https://cdn.jsdelivr.net/npm/basecoat-css@1.0.2/dist/js/tabs.min.js" defer></script>

CDN files need network access in the consuming page. The MCP server itself never
fetches them. For offline HTML, copy these distribution files into local assets
and use local URLs. Arbitrary Tailwind utilities added to a prototype still need
a Tailwind build if they are absent from the shipped stylesheet. Do not combine
the standalone CDN setup with the production CSS build or leave @latest URLs.

## Migration and sources

Basecoat 1.x uses .btn with data-variant/data-size and semantic component roots
such as .card, .dialog, and .tabs. The optional "basecoat-css/compat" stylesheet
belongs after Basecoat only while migrating pre-1.0 aliases; new markup should
use the current API. Icons are not bundled. Preserve upstream MIT attribution.

Verified references:
https://basecoatui.com/installation/
https://basecoatui.com/components/dialog/
https://basecoatui.com/components/tabs/
https://tailwindcss.com/docs/installation/framework-guides/astro
https://docs.astro.build/en/guides/client-side-scripts/
https://docs.astro.build/en/guides/view-transitions/
`;
