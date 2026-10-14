// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';

export const setupConfigInputShape = {
  framework: z
    .enum(['astro', 'vanilla', 'nextjs', 'sveltekit', 'vite', 'htmx'])
    .optional()
    .describe(
      'Target framework or environment for setup instructions and boilerplate (astro, vanilla, nextjs, sveltekit, vite, htmx). Defaults to astro.',
    ),
  stylePack: z
    .enum(['vega', 'nova', 'maia', 'lyra', 'mira', 'luma', 'sera', 'rhea'])
    .optional()
    .describe(
      'Aesthetic style pack preset (vega: standard shadcn New York v4, nova: modern SaaS, maia: playful organic, lyra: brutalist technical, mira: compact editorial, luma: soft modern, sera: architectural flat, rhea: curved modern). Defaults to vega.',
    ),
  includeDarkThemeScript: z
    .boolean()
    .optional()
    .describe(
      'Whether to include the synchronous inline <head> dark mode bootstrap script to prevent theme flashing. Defaults to true.',
    ),
};

export type SetupConfigInput = z.infer<z.ZodObject<typeof setupConfigInputShape>>;

export interface SetupConfigOutput {
  framework: 'astro' | 'vanilla' | 'nextjs' | 'sveltekit' | 'vite' | 'htmx';
  stylePack: 'vega' | 'nova' | 'maia' | 'lyra' | 'mira' | 'luma' | 'sera' | 'rhea';
  cssImports: string;
  themeInline: string;
  oklchVariables: string;
  themeBootstrapScript: string;
  frameworkSetup: string;
  nextStep: string;
}

const THEME_INLINE_BLOCK = `@theme inline {
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
  --color-sidebar: var(--sidebar-background, var(--sidebar));
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-chart-1: var(--chart-1);
  --color-chart-2: var(--chart-2);
  --color-chart-3: var(--chart-3);
  --color-chart-4: var(--chart-4);
  --color-chart-5: var(--chart-5);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: calc(var(--radius) - 2px);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) + 4px);
}`;

const OKLCH_VARIABLES_BLOCK = `:root {
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
  --sidebar: oklch(0.985 0 0);
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

  color-scheme: light;
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
  --sidebar: oklch(0.145 0 0);
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

  color-scheme: dark;
}

/* Native select popup theming contract */
.dark select,
.dark select option {
  background-color: var(--card);
  color: var(--foreground);
  color-scheme: dark;
}`;

const THEME_BOOTSTRAP_SCRIPT = `<script>
  try {
    var m = localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (e) {}
</script>
<script>
  window.basecoat = window.basecoat || {};
  window.basecoat.theme = {
    get: function() {
      return localStorage.getItem('themeMode') || 'system';
    },
    set: function(mode) {
      localStorage.setItem('themeMode', mode);
      var isDark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', isDark);
      window.dispatchEvent(new CustomEvent('basecoat:themechange', { detail: { mode: mode, isDark: isDark } }));
    },
    toggle: function() {
      var isDark = document.documentElement.classList.contains('dark');
      window.basecoat.theme.set(isDark ? 'light' : 'dark');
    }
  };
</script>`;

function getFrameworkSetup(
  framework: 'astro' | 'vanilla' | 'nextjs' | 'sveltekit' | 'vite' | 'htmx',
  stylePack: string,
): string {
  switch (framework) {
    case 'astro':
      return `### Astro Integration Setup

1. **Install Dependencies**:
\`\`\`bash
npm install basecoat-css tailwindcss@4 @tailwindcss/vite@4
\`\`\`

2. **Configure Vite in \`astro.config.mjs\`**:
\`\`\`javascript
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
\`\`\`

3. **Create \`src/styles/global.css\`**:
\`\`\`css
@import "tailwindcss";
@import "basecoat-css";
@import "basecoat-css/${stylePack}";

/* Optional @theme inline & custom OKLCH tokens */
\`\`\`

4. **Incorporate in \`src/layouts/Layout.astro\`**:
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
        document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
      } catch (e) {}
    </script>
  </head>
  <body class="bg-background text-foreground min-h-screen antialiased">
    <slot />
  </body>
</html>
\`\`\``;

    case 'nextjs':
      return `### Next.js App Router (Tailwind CSS v4) Setup

1. **Install Dependencies**:
\`\`\`bash
npm install basecoat-css tailwindcss@4 @tailwindcss/postcss@4
\`\`\`

2. **Configure \`src/app/globals.css\`**:
\`\`\`css
@import "tailwindcss";
@import "basecoat-css";
@import "basecoat-css/${stylePack}";
\`\`\`

3. **Inject Theme Bootstrap in \`src/app/layout.tsx\`**:
\`\`\`tsx
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: \`try{var m=localStorage.getItem('themeMode');document.documentElement.classList.toggle('dark',m==='dark'||(!m&&window.matchMedia('(prefers-color-scheme: dark)').matches));}catch(e){}\`,
          }}
        />
      </head>
      <body class="bg-background text-foreground min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
\`\`\``;

    case 'sveltekit':
      return `### SvelteKit Setup

1. **Install Dependencies**:
\`\`\`bash
npm install basecoat-css tailwindcss@4 @tailwindcss/vite@4
\`\`\`

2. **Configure \`vite.config.ts\`**:
\`\`\`typescript
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
});
\`\`\`

3. **In \`src/app.html\` <head>**:
\`\`\`html
<script>
  try {
    var m = localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (e) {}
</script>
\`\`\`

4. **Import in \`src/routes/+layout.svelte\`**:
\`\`\`svelte
<script>
  import '../app.css';
  let { children } = $props();
</script>

{@render children()}
\`\`\``;

    case 'vite':
      return `### Vite Setup

1. **Install Dependencies**:
\`\`\`bash
npm install basecoat-css tailwindcss@4 @tailwindcss/vite@4
\`\`\`

2. **Configure \`vite.config.ts\`**:
\`\`\`typescript
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
\`\`\`

3. **Include in \`index.html\`**:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/src/styles/global.css" />
    <script>
      try {
        var m = localStorage.getItem('themeMode');
        document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
      } catch (e) {}
    </script>
  </head>
  <body class="bg-background text-foreground min-h-screen antialiased">
    <div id="app"></div>
  </body>
</html>
\`\`\``;

    case 'htmx':
      return `### HTMX Server-Rendered Setup

1. **Static Stylesheet Compilation**:
Compile Tailwind CSS v4 and Basecoat into your server's static assets directory:
\`\`\`bash
npx @tailwindcss/cli -i src/input.css -o public/assets/basecoat.css --minify
\`\`\`

2. **Include in Base HTML Layout Template**:
\`\`\`html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="stylesheet" href="/assets/basecoat.css" />
    <script>
      try {
        var m = localStorage.getItem('themeMode');
        document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
      } catch (e) {}
    </script>
    <script src="https://unpkg.com/htmx.org@2.0.4" defer></script>
  </head>
  <body class="bg-background text-foreground min-h-screen antialiased">
    <!-- Server endpoints return pure Basecoat HTML fragments -->
  </body>
</html>
\`\`\``;

    case 'vanilla':
    default:
      return `### Vanilla HTML Setup

1. **Option A: Pinned CDN (Fast Prototyping)**:
\`\`\`html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/basecoat-css@1.0.2/dist/basecoat.cdn.min.css">
\`\`\`

2. **Option B: Production Vite Build**:
\`\`\`bash
npm install basecoat-css tailwindcss@4 @tailwindcss/vite@4
\`\`\`

3. **Theme Bootstrap in <head>**:
\`\`\`html
<script>
  try {
    var m = localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (e) {}
</script>
\`\`\``;
  }
}

export function runSetupConfig(input: SetupConfigInput): SetupConfigOutput {
  const framework = input.framework ?? 'astro';
  const stylePack = input.stylePack ?? 'vega';
  const includeDarkThemeScript = input.includeDarkThemeScript ?? true;

  const cssImports = `@import "tailwindcss";\n@import "basecoat-css";\n@import "basecoat-css/${stylePack}";`;
  const frameworkSetup = getFrameworkSetup(framework, stylePack);
  const themeBootstrapScript = includeDarkThemeScript ? THEME_BOOTSTRAP_SCRIPT : '';

  return {
    framework,
    stylePack,
    cssImports,
    themeInline: THEME_INLINE_BLOCK,
    oklchVariables: OKLCH_VARIABLES_BLOCK,
    themeBootstrapScript,
    frameworkSetup,
    nextStep:
      "Call 'basecoat_compose_stack' to hydrate a full shell architecture (e.g. sidebar-07) with pre-built component stacks, or 'basecoat_page_architect' to plan custom layout scaffolds.",
  };
}
