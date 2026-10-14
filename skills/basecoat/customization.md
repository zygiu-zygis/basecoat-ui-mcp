# Basecoat UI Customization & Style Packs

Tailwind CSS v4 introduces `@theme inline` to bind design tokens directly into your CSS build. Basecoat UI pairs this with 8 curated style packs.

## Tailwind CSS v4 @theme inline

```css
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
```

## Dark Mode Class Strategy & Single Resolver

Basecoat UI relies on a single class-based dark mode resolver (`html.dark`). Do NOT mix with `@media (prefers-color-scheme: dark)`.

### 1. No-Flash Head Bootstrap Script
Insert this tiny inline script in the `<head>` of every server-rendered page before styles paint:
```html
<script>
  try {
    var m = localStorage.getItem('themeMode');
    document.documentElement.classList.toggle('dark', m === 'dark' || (!m && window.matchMedia('(prefers-color-scheme: dark)').matches));
  } catch (e) {}
</script>
```

### 2. Runtime Controller
```javascript
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
```

### 3. Native Select Dark Mode Rule
```css
:root { color-scheme: light; }
.dark { color-scheme: dark; }
.dark select, .dark select option {
  background-color: var(--card);
  color: var(--foreground);
  color-scheme: dark;
}
```

## The 8 Style Packs

| Pack | Import | Aesthetic |
|---|---|---|
| **Vega** (default) | `@import "basecoat-css/vega";` | Standard shadcn/ui New York v4: `rounded-md` buttons, `rounded-xl` cards, balanced spacing |
| **Nova** | `@import "basecoat-css/nova";` | Modern SaaS: `rounded-lg` buttons, `rounded-xl` ring cards, compact vertical rhythm |
| **Maia** | `@import "basecoat-css/maia";` | Organic modern: `rounded-4xl` pill buttons, `rounded-2xl` cards |
| **Lyra** | `@import "basecoat-css/lyra";` | High-density brutalist/technical: `rounded-none` buttons/cards, text-xs typography |
| **Mira** | `@import "basecoat-css/mira";` | Editorial compact: `rounded-md` text-xs/relaxed controls, `rounded-lg` cards |
| **Luma** | `@import "basecoat-css/luma";` | Soft modern: `rounded-4xl` controls, soft `ring-foreground/5` elevation |
| **Sera** | `@import "basecoat-css/sera";` | Architectural flat: `rounded-none` uppercase font-semibold buttons |
| **Rhea** | `@import "basecoat-css/rhea";` | Modern curved: `rounded-2xl` buttons and cards |
