# Basecoat MCP Core Blocks Expansion

Date: 2026-09-30  
Author & maintainer: Žygimantas Jasiulionis / Intellmedia  
Status: Landed in v1.4.0  

## Overview

This release expands the offline macro registry, recipes, and semantic FSM recipes in `basecoat-ui-mcp` to cover all core shadcn UI blocks (Login, Signup, Sidebar variations, Dashboard, Settings, Pricing, Data Tables, Forms) with visually identical hierarchy, layout composition, and responsive rhythm in Basecoat UI (Astro & Tailwind CSS 4).

## 1. Curated Block Blueprints

All blocks live in `src/macros/authoring/blocks/` and compile into `src/macros/registry.snapshot.json`.

| Category | Block ID | Role | Family | Landmarks | Description & shadcn Reference |
|---|---|---|---|---|---|
| **Auth** | `auth-sign-in` | `page` | `auth` | main: 1, h1: 1 | Card login with OAuth (GitHub, Google), email/password, forgot password link, FSM bindings. Ref: https://ui.shadcn.com/blocks/login |
| **Auth** | `auth-sign-up` | `page` | `auth` | main: 1, h1: 1 | Card signup with name/email/password, terms checkbox, OAuth buttons, login redirect. Ref: https://ui.shadcn.com/blocks/signup |
| **Auth** | `auth-split-screen` | `auth-frame` | `auth` | main: 0, h1: 0 | Split-screen frame: form container pane on left, branded hero media and testimonial quote on right. |
| **Auth** | `auth-recovery` | `form` | `auth` | main: 1, h1: 1 | Password recovery request form. |
| **Auth** | `auth-reset` | `form` | `auth` | main: 1, h1: 1 | Password reset submission form. |
| **Sidebar** | `sidebar-dashboard-shell` | `navigation` | `layout` | main: 0, h1: 0 | Standard collapsible sidebar with workspace switcher, navigation sections, user footer. Ref: https://ui.shadcn.com/blocks/sidebar |
| **Sidebar** | `sidebar-inset-shell` | `application-shell` | `layout` | main: 1, h1: 0 | Inset sidebar shell with rounded canvas container, top breadcrumb header, and inner scroll. |
| **Sidebar** | `sidebar-collapsible-icon` | `navigation` | `layout` | main: 0, h1: 0 | Compact icon/rail sidebar navigation with badge indicator slots and tooltip targets. |
| **Sidebar** | `sidebar-mobile-flyout` | `navigation` | `layout` | main: 0, h1: 0 | Mobile drawer flyout sheet with backdrop overlay, close trigger, and grouped navigation. |
| **Workspace** | `dashboard-workspace` | `dashboard` | `workspace` | main: 0, h1: 0 | Canvas hosting metrics, activity chart, and records without nesting cards. Ref: https://ui.shadcn.com/examples/dashboard |
| **Workspace** | `settings-workspace` | `workspace` | `workspace` | main: 1, h1: 0 | Settings canvas with tabbed navigation (General, Profile, Notifications), field cards, switches. Ref: https://ui.shadcn.com/examples/forms |
| **Workspace** | `data-table-detail-layout` | `workspace` | `data` | main: 1, h1: 0 | Multi-column layout hosting filters, table, pager, and slide-over detail drawer panel. |
| **Data** | `data-table` | `table` | `data` | main: 0, h1: 0 | Tabular records region with overflow scroll wrapper. Ref: https://ui.shadcn.com/examples/tasks |
| **Data** | `data-filters` | `filters` | `data` | main: 0, h1: 0 | Filter toolbar with search, status select, and action button. |
| **Data** | `data-pager` | `pagination` | `data` | main: 0, h1: 0 | Pagination footer with record counter and page navigation controls. |
| **Data** | `detail-drawer-panel` | `details` | `data` | main: 0, h1: 0 | Slide-over inspection drawer for record properties, metadata badges, and actions. |
| **Forms** | `form-section` | `form` | `form` | main: 0, h1: 1 | Multi-column form card with validation states, helper copy, grid layout, and actions. |
| **Marketing** | `pricing-tiers` | `pricing` | `marketing` | main: 1, h1: 1 | Three-tier pricing table (Starter, Pro with popular badge, Enterprise) with feature lists. |
| **Marketing** | `newsletter-waitlist` | `call-to-action` | `marketing` | main: 0, h1: 1 | Marketing banner for product waitlist / newsletter signup with inline email input. |
| **Auxiliary** | `empty-state` | `empty` | `workspace` | main: 0, h1: 0 | Empty state placeholder with dashed border, guidance copy, and primary creation CTA. |
| **Auxiliary** | `error-boundary` | `error` | `feedback` | main: 0, h1: 1 | Error display card for 404 / 500 error scenarios with navigation fallback buttons. |

## 2. Page & Flow Recipes

Authored in `src/macros/authoring/recipes/` and compiled into the registry snapshot:

1. `workspace-dashboard`: Comprehensive operations dashboard with app-shell, collapsible sidebar, header breadcrumb, KPI cards, SVG area chart, segmented date range toggle, and data records table.
2. `workspace-settings`: Account settings page with app-shell, sidebar, header, and settings-workspace tabs.
3. `workspace-detail`: Data management workspace with table and slide-over detail drawer panel.
4. `auth-flow`: Full authentication flow connecting sign-in, sign-up, password recovery, and password reset with bidirectional route links.
5. `auth-split-flow`: Split-screen auth flow pairing `auth-split-screen` with `sign-in` and `sign-up`.
6. `marketing-pricing`: Marketing pricing page combining `pricing-tiers` with `newsletter-waitlist`.
7. `data-records`: Standalone records page with filters, table, and pager.

## 3. Finite State Machine (FSM) Recipes

Available via `get_fsm_recipe` and validated in `validate_composition` via `data-fsm-recipe` and `data-fsm-state`:

- `dialog`: Modal and drawer lifecycle (`closed` -> `opening` -> `open` -> `closing`).
- `collapsible-navigation`: Hierarchical disclosure navigation (`collapsed` -> `expanding` -> `expanded` -> `collapsing`).
- `navigation`: Sidebar desktop/mobile disclosure (`expanded` -> `collapsed` -> `mobile-open` -> `mobile-closing`).
- `auth-flow`: Authentication states (`idle` -> `submitting` -> `authenticated` / `error` / `recovery-requested` / `reset-required`).
- `tabs`: Peer view switching (`active` -> `switching` -> `inactive`).

## 4. Spacing Rhythm & Visual Invariants

- **Approved Spacing Steps**: Macro Emmet strings strictly enforce rhythm steps `0, 2, 4, 6, 12` (or `auto`).
- **Basecoat 1.x Vocabulary**: Uses native classes (`card`, `btn`, `input`, `badge`, `table`, `tabs`, `sidebar`, `drawer`, `empty`, `alert`) with semantic data attributes (`data-variant`, `data-size`).
- **Card Nesting Rule**: Direct card-in-card nesting is forbidden; cards are permitted inside approved canvases (`data-role=canvas`, `data-macro=canvas`).
- **Landmark Rules**: Every plan-ready page requires exactly one `main` landmark (`main: 1`) and one primary heading landmark (`primaryHeading: 1`).
