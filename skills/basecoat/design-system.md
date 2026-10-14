# Basecoat UI Design System & Token Contract

The Basecoat design system defines an OKLCH semantic token palette mapped onto CSS custom properties. These tokens guarantee high-contrast accessible visual hierarchy across light and dark themes.

## OKLCH Semantic Color Palette

```css
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
```

## Typography Ladder

| Level | Tailwind Classes | Semantic Usage |
|---|---|---|
| KPI Metric | `text-2xl` or `text-3xl font-semibold tracking-tight tabular-nums` | Big stat values, ARR/MRR numbers |
| Page Heading (`h1`) | `text-3xl font-semibold tracking-tight` | Singular page title |
| Section Heading (`h2`) | `text-xl font-semibold tracking-tight` | Card group or major block header |
| Card Title (`h3`) | `text-lg font-medium leading-tight` | Card header or drawer panel title |
| Body / Primary Text | `text-sm text-foreground` or `text-base` | Standard reading content, forms |
| Secondary / Metadata | `text-xs text-muted-foreground tabular-nums` | Helper text, timestamps, table cells |
| Caption / Monospace | `font-mono text-[10px] text-muted-foreground` | Keyboard shortcuts (`kbd`), hashes |

## Optical Rhythm & Spacing Scale (4px/8px Grid)

- `gap-1` (4px) / `gap-1.5` (6px): Tight badge labels, inline tags, button clusters.
- `gap-2` (8px): Form label to control relationship, icon with inline text.
- `gap-4` (16px): Distance between form fields, grid spacing in compact cards.
- `gap-6` (24px): Standard gap between page sections, card padding in comfortable mode.
- `gap-12` (48px): Major distinct regions on landing pages or expansive views.

## Shadow & Radius Scales

- Vega: `rounded-md` buttons (0.375rem), `rounded-xl` cards (0.75rem), `shadow-xs` / `shadow-sm` elevation.
- Nova: `rounded-lg` buttons (0.5rem), `rounded-xl` cards, compact vertical padding.
- Maia: `rounded-4xl` pill buttons, `rounded-2xl` cards.
- Lyra: `rounded-none` buttons and cards, crisp 1px ring borders.
- Mira: `rounded-md` text-xs buttons, `rounded-lg` cards.
