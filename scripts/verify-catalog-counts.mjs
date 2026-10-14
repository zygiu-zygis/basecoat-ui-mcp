#!/usr/bin/env node

/**
 * Offline catalog and skills vault integrity gate (fs only; no network).
 *
 * Deterministically loads and asserts exact counts and integrity of all offline
 * catalogs and skill files in Basecoat UI MCP:
 * 1. src/registry/components.json (index length >= 57, 57 primitives, details match)
 * 2. src/macros/registry.snapshot.json & authoring blocks/recipes (>= 49 blocks, >= 11 recipes)
 * 3. src/data/catalog/component-stacks.json (totalStacks >= 28, 7 categories, shell stacks)
 * 4. src/data/catalog/charts-catalog.json (totalCharts >= 50, 7 categories, cssTokens, 5 framework mounts)
 * 5. skills/ Vault (daisyui-dashboard-skill absent, all basecoat skills present, >= 90 md files)
 *
 * Exit 0 on match; non-zero on mismatch or missing required entries.
 *
 * Usage: node scripts/verify-catalog-counts.mjs
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "..");

let passedCount = 0;

function fail(message) {
  console.error(`verify-catalog-counts: FAIL: ${message}`);
  process.exitCode = 1;
}

function ok(message) {
  console.log(`verify-catalog-counts: ok: ${message}`);
  passedCount++;
}

function loadJson(relPath) {
  const absPath = join(ROOT_DIR, relPath);
  if (!existsSync(absPath)) {
    fail(`File does not exist: ${relPath}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(absPath, "utf8"));
  } catch (err) {
    fail(`Failed to parse JSON at ${relPath}: ${err.message}`);
    return null;
  }
}

function collectMarkdownFiles(dir) {
  let results = [];
  if (!existsSync(dir)) return results;
  const list = readdirSync(dir);
  for (const item of list) {
    const full = join(dir, item);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      results = results.concat(collectMarkdownFiles(full));
    } else if (item.endsWith(".md")) {
      results.push(full);
    }
  }
  return results;
}

console.log("==> Verifying Basecoat UI MCP catalog integrity...");

// ---------------------------------------------------------------------------
// 1. src/registry/components.json
// ---------------------------------------------------------------------------
const components = loadJson("src/registry/components.json");
if (components) {
  const index = Array.isArray(components.index) ? components.index : [];
  const details = components.details || {};
  const detailsKeys = Object.keys(details);

  if (index.length < 57) {
    fail(`components.json: expected index.length >= 57, got ${index.length}`);
  } else {
    ok(`components.json index.length=${index.length} (>= 57)`);
  }

  if (detailsKeys.length !== index.length) {
    fail(`components.json: Object.keys(details).length (${detailsKeys.length}) !== index.length (${index.length})`);
  } else {
    ok(`components.json details count matches index length (${detailsKeys.length})`);
  }

  const indexIds = new Set(index.map((item) => (typeof item === "string" ? item : item.id)));
  const REQUIRED_57_PRIMITIVES = [
    "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge", "breadcrumb",
    "button", "button-group", "calendar", "card", "carousel", "chart", "checkbox", "collapsible",
    "combobox", "command", "context-menu", "data-table", "date-picker", "dialog", "drawer",
    "dropdown-menu", "empty", "field", "form", "hover-card", "input", "input-group", "input-otp",
    "item", "kbd", "label", "menubar", "navigation-menu", "pagination", "popover", "progress",
    "radio-group", "resizable", "scroll-area", "select", "separator", "sheet", "sidebar",
    "skeleton", "slider", "sonner", "spinner", "switch", "table", "tabs", "textarea", "toast",
    "toggle", "toggle-group", "tooltip",
  ];

  const missingPrimitives = REQUIRED_57_PRIMITIVES.filter((id) => !indexIds.has(id));
  if (missingPrimitives.length > 0) {
    fail(`components.json index missing required primitives: ${missingPrimitives.join(", ")}`);
  } else {
    ok(`components.json contains all 57 required primitives`);
  }
}

// ---------------------------------------------------------------------------
// 2. src/macros/registry.snapshot.json & src/macros/authoring/blocks/ / recipes/
// ---------------------------------------------------------------------------
const snapshot = loadJson("src/macros/registry.snapshot.json");
const blocksDir = join(ROOT_DIR, "src/macros/authoring/blocks");
const recipesDir = join(ROOT_DIR, "src/macros/authoring/recipes");

if (snapshot) {
  const snapshotBlocks = snapshot.blocks || {};
  const snapshotAliases = snapshot.aliases || {};
  const snapshotBlockKeys = Object.keys(snapshotBlocks);

  if (snapshotBlockKeys.length < 49) {
    fail(`registry.snapshot.json: expected blocks count >= 49, got ${snapshotBlockKeys.length}`);
  } else {
    ok(`registry.snapshot.json blocks count=${snapshotBlockKeys.length} (>= 49)`);
  }

  if (existsSync(blocksDir)) {
    const authoringBlockFiles = readdirSync(blocksDir).filter((f) => f.endsWith(".json"));
    if (authoringBlockFiles.length < 49) {
      fail(`src/macros/authoring/blocks: expected >= 49 files, got ${authoringBlockFiles.length}`);
    } else {
      ok(`src/macros/authoring/blocks file count=${authoringBlockFiles.length} (>= 49)`);
    }
  } else {
    fail(`Directory missing: src/macros/authoring/blocks`);
  }

  const REQUIRED_BLOCK_IDS = [];
  for (let i = 1; i <= 16; i++) REQUIRED_BLOCK_IDS.push(`sidebar-${String(i).padStart(2, "0")}`);
  for (let i = 1; i <= 7; i++) REQUIRED_BLOCK_IDS.push(`dashboard-${String(i).padStart(2, "0")}`);
  for (let i = 1; i <= 5; i++) REQUIRED_BLOCK_IDS.push(`login-${String(i).padStart(2, "0")}`);
  for (let i = 1; i <= 5; i++) REQUIRED_BLOCK_IDS.push(`signup-${String(i).padStart(2, "0")}`);
  for (let i = 1; i <= 5; i++) REQUIRED_BLOCK_IDS.push(`otp-${String(i).padStart(2, "0")}`);
  REQUIRED_BLOCK_IDS.push(
    "mail", "tasks", "forms", "products", "analytics", "billing", "settings"
  );

  const missingBlocks = REQUIRED_BLOCK_IDS.filter(
    (b) => !(b in snapshotBlocks) && !(b in snapshotAliases)
  );
  if (missingBlocks.length > 0) {
    fail(`registry.snapshot.json missing required blocks/aliases: ${missingBlocks.join(", ")}`);
  } else {
    ok(`registry.snapshot.json contains all ${REQUIRED_BLOCK_IDS.length} required block IDs in blocks or aliases`);
  }

  if (existsSync(recipesDir)) {
    const authoringRecipeFiles = readdirSync(recipesDir).filter((f) => f.endsWith(".json"));
    if (authoringRecipeFiles.length < 11) {
      fail(`src/macros/authoring/recipes: expected >= 11 files, got ${authoringRecipeFiles.length}`);
    } else {
      ok(`src/macros/authoring/recipes file count=${authoringRecipeFiles.length} (>= 11)`);
    }
  } else {
    fail(`Directory missing: src/macros/authoring/recipes`);
  }

  const snapshotRecipes = snapshot.recipes || {};
  const recipeKeys = Object.keys(snapshotRecipes);
  if (recipeKeys.length < 11) {
    fail(`registry.snapshot.json recipes: expected >= 11, got ${recipeKeys.length}`);
  } else {
    ok(`registry.snapshot.json recipes count=${recipeKeys.length} (>= 11)`);
  }
}

// ---------------------------------------------------------------------------
// 3. src/data/catalog/component-stacks.json
// ---------------------------------------------------------------------------
const stacksCatalog = loadJson("src/data/catalog/component-stacks.json");
if (stacksCatalog) {
  const totalStacks = stacksCatalog.totalStacks ?? (Array.isArray(stacksCatalog.stacks) ? stacksCatalog.stacks.length : 0);
  if (totalStacks < 28) {
    fail(`component-stacks.json: expected totalStacks >= 28, got ${totalStacks}`);
  } else {
    ok(`component-stacks.json totalStacks=${totalStacks} (>= 28)`);
  }

  const EXPECTED_STACK_CATEGORIES = [
    "shell-stacks",
    "header-stacks",
    "kpi-stacks",
    "chart-stacks",
    "table-stacks",
    "overlay-stacks",
    "form-stacks",
  ];

  const categories = stacksCatalog.categories || [];
  const missingCategories = EXPECTED_STACK_CATEGORIES.filter((c) => !categories.includes(c));
  if (missingCategories.length > 0) {
    fail(`component-stacks.json missing expected categories: ${missingCategories.join(", ")}`);
  } else {
    ok(`component-stacks.json contains all 7 categories`);
  }

  const stacksList = Array.isArray(stacksCatalog.stacks)
    ? stacksCatalog.stacks
    : Object.values(stacksCatalog.stacks || {});

  const shellStacks = stacksList.filter((s) => s.category === "shell-stacks");
  const shellStackIds = new Set(shellStacks.map((s) => s.id));

  const REQUIRED_SHELL_STACKS = [];
  for (let i = 1; i <= 16; i++) REQUIRED_SHELL_STACKS.push(`sidebar-${String(i).padStart(2, "0")}`);
  REQUIRED_SHELL_STACKS.push("topbar-shell", "inset-shell", "split-shell");

  const missingShell = REQUIRED_SHELL_STACKS.filter((id) => !shellStackIds.has(id));
  if (missingShell.length > 0) {
    fail(`component-stacks.json shell-stacks missing: ${missingShell.join(", ")}`);
  } else {
    ok(`component-stacks.json shell-stacks contains all 19 required shell stacks (sidebar-01..16, topbar-shell, inset-shell, split-shell)`);
  }
}

// ---------------------------------------------------------------------------
// 4. src/data/catalog/charts-catalog.json
// ---------------------------------------------------------------------------
const chartsCatalog = loadJson("src/data/catalog/charts-catalog.json");
if (chartsCatalog) {
  const totalCharts = chartsCatalog.totalCharts ?? (Array.isArray(chartsCatalog.charts) ? chartsCatalog.charts.length : 0);
  if (totalCharts < 50) {
    fail(`charts-catalog.json: expected totalCharts >= 50, got ${totalCharts}`);
  } else {
    ok(`charts-catalog.json totalCharts=${totalCharts} (>= 50)`);
  }

  const EXPECTED_CHART_CATEGORIES = [
    "area",
    "bar",
    "line",
    "pie",
    "radar",
    "radial",
    "tooltip",
  ];

  const categories = chartsCatalog.categories || [];
  const missingCategories = EXPECTED_CHART_CATEGORIES.filter((c) => !categories.includes(c));
  if (missingCategories.length > 0) {
    fail(`charts-catalog.json missing categories: ${missingCategories.join(", ")}`);
  } else {
    ok(`charts-catalog.json contains all 7 chart categories`);
  }

  const chartList = Array.isArray(chartsCatalog.charts)
    ? chartsCatalog.charts
    : Object.values(chartsCatalog.charts || {});

  const REQUIRED_TOKENS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];
  const REQUIRED_FRAMEWORKS = ["vanilla", "astro", "react", "vue", "svelte"];

  let tokenViolations = 0;
  let mountViolations = 0;

  for (const chart of chartList) {
    const tokens = chart.cssTokens || [];
    for (const t of REQUIRED_TOKENS) {
      if (!tokens.includes(t)) {
        fail(`Chart ${chart.id} missing cssToken ${t}`);
        tokenViolations++;
      }
    }

    const mounts = chart.frameworks || chart.mounts || {};
    for (const fw of REQUIRED_FRAMEWORKS) {
      if (!mounts[fw]) {
        fail(`Chart ${chart.id} missing framework mount ${fw}`);
        mountViolations++;
      }
    }
  }

  if (tokenViolations === 0) {
    ok(`charts-catalog.json all ${chartList.length} charts define required cssTokens var(--chart-1)..var(--chart-5)`);
  }
  if (mountViolations === 0) {
    ok(`charts-catalog.json all ${chartList.length} charts define all 5 framework mounts (vanilla, astro, react, vue, svelte)`);
  }
}

// ---------------------------------------------------------------------------
// 5. skills/ Vault
// ---------------------------------------------------------------------------
const prohibitedSkill = join(ROOT_DIR, ".cursor/skills/daisyui-dashboard-skill");
if (existsSync(prohibitedSkill)) {
  fail(`.cursor/skills/daisyui-dashboard-skill must NOT exist`);
} else {
  ok(`.cursor/skills/daisyui-dashboard-skill does not exist`);
}

const REQUIRED_BASECOAT_FILES = [
  "skills/basecoat/SKILL.md",
  "skills/basecoat/design-system.md",
  "skills/basecoat/customization.md",
  "skills/basecoat/install.md",
  "skills/basecoat/mcp.md",
  "skills/basecoat/registry.md",
  "skills/basecoat/rules/styling.md",
  "skills/basecoat/rules/composition.md",
  "skills/basecoat/rules/forms.md",
  "skills/basecoat/rules/icons.md",
];

for (const rel of REQUIRED_BASECOAT_FILES) {
  if (!existsSync(join(ROOT_DIR, rel))) {
    fail(`Missing basecoat skill file: ${rel}`);
  }
}
ok(`skills/basecoat core documentation and rules exist (${REQUIRED_BASECOAT_FILES.length} files)`);

const REQUIRED_57_COMPONENTS = [
  "accordion", "alert", "alert-dialog", "aspect-ratio", "avatar", "badge", "breadcrumb",
  "button", "button-group", "calendar", "card", "carousel", "chart", "checkbox", "collapsible",
  "combobox", "command", "context-menu", "data-table", "date-picker", "dialog", "drawer",
  "dropdown-menu", "empty", "field", "form", "hover-card", "input", "input-group", "input-otp",
  "item", "kbd", "label", "menubar", "navigation-menu", "pagination", "popover", "progress",
  "radio-group", "resizable", "scroll-area", "select", "separator", "sheet", "sidebar",
  "skeleton", "slider", "sonner", "spinner", "switch", "table", "tabs", "textarea", "toast",
  "toggle", "toggle-group", "tooltip",
];

let missingComponentDocs = 0;
for (const comp of REQUIRED_57_COMPONENTS) {
  const rel = `skills/basecoat/components/${comp}.md`;
  if (!existsSync(join(ROOT_DIR, rel))) {
    fail(`Missing component skill doc: ${rel}`);
    missingComponentDocs++;
  }
}
if (missingComponentDocs === 0) {
  ok(`skills/basecoat all 57 component docs exist in skills/basecoat/components/*.md`);
}

const REQUIRED_DASHBOARD_FILES = [
  "skills/basecoat-dashboard/SKILL.md",
  "skills/basecoat-dashboard/foundations/SKILL.md",
  "skills/basecoat-dashboard/foundations/theme.md",
  "skills/basecoat-dashboard/block-patterns/SKILL.md",
  "skills/basecoat-dashboard/block-patterns/sidebars.md",
  "skills/basecoat-dashboard/block-patterns/metrics.md",
  "skills/basecoat-dashboard/block-patterns/tables.md",
  "skills/basecoat-dashboard/block-patterns/forms.md",
  "skills/basecoat-dashboard/block-patterns/charts.md",
  "skills/basecoat-dashboard/block-patterns/navigation.md",
  "skills/basecoat-dashboard/content-strategy/SKILL.md",
  "skills/basecoat-dashboard/page-types/SKILL.md",
  "skills/basecoat-dashboard/page-types/dashboard.md",
  "skills/basecoat-dashboard/page-types/auth.md",
  "skills/basecoat-dashboard/page-types/settings.md",
  "skills/basecoat-dashboard/page-types/reading-views.md",
  "skills/basecoat-dashboard/audit/SKILL.md",
  "skills/basecoat-dashboard/audit/checklist.md",
];

let missingDashboardFiles = 0;
for (const rel of REQUIRED_DASHBOARD_FILES) {
  if (!existsSync(join(ROOT_DIR, rel))) {
    fail(`Missing basecoat-dashboard file: ${rel}`);
    missingDashboardFiles++;
  }
}
if (missingDashboardFiles === 0) {
  ok(`skills/basecoat-dashboard all ${REQUIRED_DASHBOARD_FILES.length} required skill files exist`);
}

const REQUIRED_CHARTS_FILES = [
  "skills/basecoat-charts/SKILL.md",
  "skills/basecoat-charts/area.md",
  "skills/basecoat-charts/bar.md",
  "skills/basecoat-charts/line.md",
  "skills/basecoat-charts/pie.md",
  "skills/basecoat-charts/radar.md",
  "skills/basecoat-charts/radial.md",
  "skills/basecoat-charts/tooltip.md",
  "skills/basecoat-charts/audit/SKILL.md",
  "skills/basecoat-charts/audit/checklist.md",
];

let missingChartsFiles = 0;
for (const rel of REQUIRED_CHARTS_FILES) {
  if (!existsSync(join(ROOT_DIR, rel))) {
    fail(`Missing basecoat-charts file: ${rel}`);
    missingChartsFiles++;
  }
}
if (missingChartsFiles === 0) {
  ok(`skills/basecoat-charts all ${REQUIRED_CHARTS_FILES.length} required skill files exist`);
}

const skillMarkdownFiles = collectMarkdownFiles(join(ROOT_DIR, "skills"));
if (skillMarkdownFiles.length < 90) {
  fail(`Total skill markdown files: expected >= 90, got ${skillMarkdownFiles.length}`);
} else {
  ok(`skills vault total markdown files=${skillMarkdownFiles.length} (>= 90)`);
}

// ---------------------------------------------------------------------------
// Exit gate
// ---------------------------------------------------------------------------
if (process.exitCode) {
  console.error("verify-catalog-counts: FAIL: catalog integrity check failed");
  process.exit(process.exitCode);
}

console.log(`verify-catalog-counts: ok: all catalog and skills thresholds satisfied (${passedCount} assertions passed)`);
