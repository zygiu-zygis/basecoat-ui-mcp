# Basecoat UI Installation & Framework Integration

Basecoat UI is framework-agnostic. It compiles to zero runtime overhead for plain HTML, Astro, Next.js, SvelteKit, Vite, and HTMX.

## Core Packages

```bash
npm install basecoat-css@1.0.2 tailwindcss@4 @tailwindcss/vite@4
```

## Global Stylesheet Setup

In `src/styles/global.css` (or `src/app/globals.css`):
```css
@import "tailwindcss";
@import "basecoat-css/vega";

/* Custom project theme overrides (optional) */
@import "./theme.css";
```

---

## 1. Astro Integration

```javascript
// astro.config.mjs
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  vite: {
    plugins: [tailwindcss()],
  },
});
```

Layout inclusion:
```astro
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
```

---

## 2. Vanilla HTML & Vite Integration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
});
```

```html
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
```

---

## 3. Next.js App Router (Tailwind v4)

```css
/* src/app/globals.css */
@import "tailwindcss";
@import "basecoat-css/vega";
```

```tsx
// src/app/layout.tsx
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var m=localStorage.getItem('themeMode');document.documentElement.classList.toggle('dark',m==='dark');}catch(e){}`,
          }}
        />
      </head>
      <body class="bg-background text-foreground min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
```

---

## 4. SvelteKit Integration

```javascript
// vite.config.ts
import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit(), tailwindcss()],
});
```

---

## 5. HTMX / Go / Python / Rails Integration

Link compiled CSS from your static assets directory. Include the `<head>` dark mode bootstrap script, and return standard Basecoat semantic HTML fragments from your server endpoints.
