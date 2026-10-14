---
name: page-types/settings
description: Strict rules for Basecoat settings interfaces, split-screen layouts, panel grouping, and Danger Zone isolation.
---

# Settings & Configuration Archetype

## Guardrails

* **Layout Archetypes**:
  * **Complex (Split-Screen Settings)**: 2-column layout featuring a dedicated side navigation panel (`w-48` or `w-64`) on the left, paired with a spacious content panel on the right (`flex-1 max-w-4xl`).
  * **Simple (Linear Settings)**: Single-column layout centered on the screen and strictly constrained to `max-w-3xl mx-auto`.
* **Bounded Panel Grouping**:
  * Chunk related configuration controls into distinct `.card` panels (`gap-6 p-6 bg-card text-card-foreground`).
  * Each card must feature a clear header with title (`h2.text-lg.font-semibold`) and contextual description (`p.text-sm.text-muted-foreground`).
* **Accessible Tabs & Categorization**:
  * For multi-category settings, use Basecoat tabs with FSM contract:
    `<div class="tabs flex border-b border-border gap-4" data-state="active" data-fsm-recipe="tabs" role="tablist">`.
  * Individual tabs must include `role="tab"` and `aria-selected="true|false"`.
* **Action Placement**:
  * Form group actions (Save, Cancel) belong at the bottom-right of each settings card, OR in a sticky bottom action bar for page-level multi-section changes.
* **Danger Zone Isolation**:
  * Destructive actions (e.g., Delete Workspace, Revoke API Keys, Transfer Ownership) MUST be segregated into a dedicated "Danger Zone" card positioned at the absolute bottom of the page.
  * **Color Styling Restrictions**: You are strictly **FORBIDDEN** from applying red/destructive background colors to large containers or whole card bodies.
  * Express destructive warnings using high-contrast borders and text only: `border border-destructive/50 bg-card`. Restrict red backgrounds exclusively to small action buttons (`.btn .btn-destructive`) or status badges.

## Reference Basecoat Settings Layout (Split-Screen)

```html
<main class="max-w-6xl mx-auto p-6 space-y-6">
  <!-- Page Header -->
  <header class="border-b border-border pb-4">
    <h1 class="text-2xl font-semibold tracking-tight text-foreground">Workspace Settings</h1>
    <p class="text-sm text-muted-foreground">Manage your workspace configuration, team members, and billing details.</p>
  </header>

  <!-- 2-Column Split-Screen Layout -->
  <div class="grid grid-cols-1 md:grid-cols-12 gap-8">
    <!-- Secondary Settings Nav (w-48 / 3 cols) -->
    <aside class="md:col-span-3 space-y-1" aria-label="Settings navigation">
      <a href="#general" class="btn btn-ghost w-full justify-start text-sm bg-muted font-medium" aria-current="page">General</a>
      <a href="#members" class="btn btn-ghost w-full justify-start text-sm text-muted-foreground hover:text-foreground">Members & Roles</a>
      <a href="#billing" class="btn btn-ghost w-full justify-start text-sm text-muted-foreground hover:text-foreground">Billing & Plans</a>
      <a href="#api" class="btn btn-ghost w-full justify-start text-sm text-muted-foreground hover:text-foreground">API Keys</a>
      <a href="#danger" class="btn btn-ghost w-full justify-start text-sm text-destructive hover:bg-destructive/10">Danger Zone</a>
    </aside>

    <!-- Main Settings Form Canvas (9 cols) -->
    <div class="md:col-span-9 space-y-6">
      <!-- General Settings Card -->
      <article class="card p-6 bg-card text-card-foreground flex flex-col gap-6" id="general">
        <header>
          <h2 class="text-lg font-semibold text-foreground">Workspace Profile</h2>
          <p class="text-sm text-muted-foreground">This is your workspace's public presence within the team directory.</p>
        </header>

        <form class="space-y-4">
          <div class="flex flex-col gap-1.5 max-w-md">
            <label for="workspace-name" class="text-sm font-medium text-foreground">Workspace Name</label>
            <input id="workspace-name" type="text" class="input w-full text-sm" value="Acme Corporation" />
          </div>

          <div class="flex flex-col gap-1.5 max-w-md">
            <label for="workspace-url" class="text-sm font-medium text-foreground">Custom Domain</label>
            <div class="flex rounded-md shadow-sm">
              <span class="inline-flex items-center px-3 rounded-l-md border border-r-0 border-input bg-muted text-xs text-muted-foreground">https://</span>
              <input id="workspace-url" type="text" class="input w-full rounded-l-none text-sm" value="acme.company.com" />
            </div>
          </div>

          <footer class="flex items-center justify-end gap-3 pt-4 border-t border-border">
            <button type="button" class="btn btn-ghost text-sm">Cancel</button>
            <button type="submit" class="btn btn-primary text-sm" data-state="default">Save Preferences</button>
          </footer>
        </form>
      </article>

      <!-- Danger Zone Card (Isolated at Bottom) -->
      <article class="card p-6 bg-card border border-destructive/50 text-card-foreground flex flex-col gap-4" id="danger">
        <header>
          <h2 class="text-lg font-semibold text-destructive">Danger Zone</h2>
          <p class="text-sm text-muted-foreground">Irreversible actions that permanently delete data and revoke member credentials.</p>
        </header>

        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-destructive/5 border border-destructive/20">
          <div>
            <h3 class="text-sm font-medium text-foreground">Delete Workspace</h3>
            <p class="text-xs text-muted-foreground">Once deleted, all projects, repositories, and invoices are unrecoverable.</p>
          </div>
          <button type="button" class="btn btn-destructive text-sm shrink-0">Delete Workspace</button>
        </div>
      </article>
    </div>
  </div>
</main>
```
