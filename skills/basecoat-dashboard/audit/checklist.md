---
name: audit/checklist
description: Pre-flight quality checklist. Must pass all constraints before delivering Basecoat UI code.
---

# Pre-Flight Quality Gate Checklist

Verify each of the following constraints prior to delivering Basecoat UI code:

## 1. Syntax & Tailwind v4 Compliance
- [ ] **Zero DaisyUI Classes**: Verified no instances of `daisyui`, `card-body`, `menu-active`, `form-control`, `stat-value`, `btn-primary`, etc.
- [ ] **Strict Tailwind v4 Utilities**: Verified no deprecated Tailwind v3 utilities (`bg-opacity-*`, `flex-shrink-*`, `flex-grow-*`, `overflow-ellipsis`). Slash opacity (`bg-primary/80`) used instead.
- [ ] **No Arbitrary Bracket Dimensions**: Spacing and sizing conform strictly to standard scale steps (no `w-[327px]`, `p-[15px]`).
- [ ] **Deterministic Class Ordering**: Elements follow `Basecoat Component` → `Layout` → `Position` → `Align` → `Size` → `Space` → `Type` → `Surface` → `Border` → `Effects` → `Variants`.

## 2. Component Structure & Tokens
- [ ] **Card 1px Ring Rule**: Verified NO `border` or `border-border` classes applied to `.card`.
- [ ] **Universal `<p>` in Metrics**: Metric cards universally utilize `<p>` tags for labels, values, and deltas; no `<span>` tags.
- [ ] **Metric Scale**: Core KPI values use `<p class="text-3xl font-semibold tabular-nums">` (or `text-4xl`).
- [ ] **Delta Indicators**: Trends use explicit directional SVG arrows + `<p class="sr-only">`; no bare mathematical signs (`+`/`-`).
- [ ] **Tables Wrapped**: All tables enclosed in `<div class="overflow-x-auto rounded-md border border-border">`.
- [ ] **Numeric Alignment**: Numeric/currency table columns and values explicitly aligned `text-right tabular-nums`.
- [ ] **Sticky Table Headers**: Long-scrolling data tables pin headers via `thead.sticky.top-0.z-10.bg-muted/50.backdrop-blur`.

## 3. FSM State Contracts & Interactivity
- [ ] **Dialogs**: Declare `<dialog class="dialog" data-state="closed" data-fsm-recipe="dialog" data-fsm-state="closed">`.
- [ ] **Dropdown Menus**: Declare `<div class="dropdown-menu" data-state="closed">` with trigger `aria-expanded="false"` and `aria-controls`.
- [ ] **Tabs**: Declare `<div class="tabs" data-state="active" data-fsm-recipe="tabs" role="tablist">` with `role="tab"` and `aria-selected`.
- [ ] **Submit Buttons**: Declare `data-state="default"` (or `data-state="loading"` with spinner and `disabled`).
- [ ] **Active Nav Links**: Declare `data-active="true"` and `aria-current="page"`.

## 4. Semantic HTML & Accessibility
- [ ] **Single `<main>` & Single `<h1>`**: Exactly one `<main>` landmark and one top-level `<h1>` per page.
- [ ] **Explicit Form Labels**: Every `<label for="[id]">` strictly matches the `id` of its input control.
- [ ] **Validation Feedback**: Invalid fields declare `aria-invalid="true"` and pair with `<p class="text-xs text-destructive" role="alert">`.
- [ ] **Accessible Icon Buttons**: All icon-only buttons declare an explicit `aria-label` or include an internal `<span class="sr-only">`.
- [ ] **Charts Accessibility**: SVG charts declare `role="img"` with accessible `<title>` and `<desc>`.

## 5. Theming & Color Discipline
- [ ] **Zero Hardcoded Hex Codes**: No `#ffffff`, `#09090b`, or raw RGB values in classes, inline styles, or chart configs.
- [ ] **Semantic Token Pairs**: Elements pair tokens correctly (`bg-card` with `text-card-foreground`, `bg-primary` with `text-primary-foreground`).
- [ ] **Single Dark Mode Strategy**: Theme toggling strictly targets `html.dark` and `localStorage` key `"themeMode"`.
- [ ] **Danger Zone Containment**: Red/destructive backgrounds restricted strictly to small buttons and badges; large cards use red borders/text only.
