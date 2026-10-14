// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RHYTHM } from '../design/rhythm.js';
import { THEMING } from '../design/theming.js';
import { FRAMEWORK_INTEGRATION } from '../design/integration.js';
import { readProjectContext } from '../design/project.js';
import { searchComponents } from '../tools/search.js';
import { getComponentDetails } from '../tools/details.js';
import { validateComposition, VALIDATE_COMPOSITION_MAX_BYTES } from '../tools/validate.js';
import { setupConfigInputShape, runSetupConfig } from '../tools/setup-config.js';
import { pageArchitectInputShape, runPageArchitect } from '../tools/page-architect.js';
import { composeStackInputShape, runComposeStack } from '../tools/compose-stack.js';
import { rulesEnforcerInputShape, runRulesEnforcer } from '../tools/rules-enforcer.js';
import { creativeDirectorInputShape, runCreativeDirector } from '../tools/creative-director.js';
import { componentSyntaxInputShape, runComponentSyntax } from '../tools/component-syntax.js';
import {
  listChartsInputShape,
  runListCharts,
  getChartBlueprintInputShape,
  runGetChartBlueprint,
} from '../tools/charts.js';
import { qualityInspectorInputShape, runQualityInspector } from '../tools/quality-inspector.js';
import { jsonResult } from '../tools/budget.js';
import { registry } from '../registry/index.js';
import { SERVER_VERSION } from './version.js';
import {
  applyDesignPatchInputShape,
  beginDesignInputShape,
  ensureMacroRegistryLoaded,
  getDesignContextInputShape,
  getMacroBlockInputShape,
  handleApplyDesignPatch,
  handleBeginDesign,
  handleGetDesignContext,
  handleGetMacroBlock,
  handleSearchMacroBlocks,
  handleValidateDesign,
  searchMacroBlocksInputShape,
  validateDesignInputShape,
} from '../macros/tools.js';
import {
  getFsmRecipeInputShape,
  getRhythmRulesInputShape,
  handleGetFsmRecipe,
  handleGetRhythmRules,
} from '../semantics/tools.js';

const READ_ANNOTATIONS = {
  readOnlyHint: true,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

/** Mutations are idempotent when the same operationId and request are replayed. */
const MUTATION_ANNOTATIONS = {
  readOnlyHint: false,
  destructiveHint: false,
  idempotentHint: true,
  openWorldHint: false,
} as const;

const MACRO_INSTRUCTIONS =
  'Use this server first whenever a project depends on basecoat-css or targets a shadcn/ui look, ' +
  'before grepping node_modules CSS or hand-writing tokens. ' +
  '4-Stage Intent Workflow (fast path): (1) basecoat_setup_config & basecoat_page_architect → ' +
  '(2) basecoat_rules_enforcer & basecoat_creative_director → ' +
  '(3) basecoat_compose_stack, basecoat_component_syntax, basecoat_list_charts & basecoat_get_chart_blueprint → ' +
  '(4) basecoat_quality_inspector / validate_markup. ' +
  'New UI (stateful macro graph): begin_design (pin profile) → search_macro_blocks / get_macro_block → ' +
  'apply_design_patch (expectedRevision + unique operationId) → get_design_context → ' +
  'validate_design → implement leaves via search_components / get_component_details → ' +
  'get_rhythm_rules / get_fsm_recipe → validate_composition on generated source. ' +
  'Existing UI audit/restyle: read basecoat://design/theming and basecoat://design/rhythm, ' +
  'get_component_details for each control you touch, then validate_composition on rendered page/layout source ' +
  '(include <head> theme scripts and <style>). ' +
  'Follow pagination cursors and pass the chosen semanticProfile to source validation. ' +
  'Use explicit design IDs; list sessions when unknown. ' +
  'Compose leaves in this order: content hierarchy, layout, component selection, spacing, typography, final composition. ' +
  'Read basecoat://project/context. Search returns summaries; request details only for selected IDs. ' +
  'Read basecoat://integration/frameworks for production setup. All runtime data is offline. ' +
  'Layout contracts come from this server\'s macro registry, not from shadcn or MCP itself. ' +
  'CRITICAL: Act as an expert UI designer (Shadcn aesthetic). Use 1px borders (never add border to .card), compact h-12 headers, gap-4/gap-6 spacing, text-sm/text-muted-foreground for data, and maintain precise visual hierarchy.';

function registerSkillsResources(server: McpServer, skillsDir: string): void {
  if (!existsSync(skillsDir)) return;

  const corePath = join(skillsDir, 'basecoat', 'SKILL.md');
  if (existsSync(corePath)) {
    server.registerResource('skills-core', 'basecoat://skills/core', {
      description: 'Master UI/UX protocol and 57-component reference for Basecoat UI (pure Basecoat CSS, headless Tailwind CSS v4, Kanso minimalism, and mandatory FSM data-state contracts).',
      mimeType: 'text/markdown',
    }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readFileSync(corePath, 'utf-8') }] }));
  }

  const dashboardPath = join(skillsDir, 'basecoat-dashboard', 'SKILL.md');
  if (existsSync(dashboardPath)) {
    server.registerResource('skills-dashboard', 'basecoat://skills/dashboard', {
      description: 'Master UI/UX architecture and generation protocol for Basecoat UI dashboard layouts, shell architectures, and block patterns.',
      mimeType: 'text/markdown',
    }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readFileSync(dashboardPath, 'utf-8') }] }));
  }

  const chartsPath = join(skillsDir, 'basecoat-charts', 'SKILL.md');
  if (existsSync(chartsPath)) {
    server.registerResource('skills-charts', 'basecoat://skills/charts', {
      description: 'Basecoat Charts skill for ApexCharts and SVG data visualization mapped to CSS tokens (--chart-1..5).',
      mimeType: 'text/markdown',
    }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: readFileSync(chartsPath, 'utf-8') }] }));
  }

  function walk(currentDir: string): void {
    const entries = readdirSync(currentDir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      const fullPath = join(currentDir, entry.name);
      if (entry.isDirectory()) {
        walk(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const relPath = relative(skillsDir, fullPath).replace(/\\/g, '/');
        const uri = `basecoat://skills/files/${relPath}`;
        const name = `skills-file-${relPath.replace(/[^a-zA-Z0-9_-]/g, '-')}`;
        server.registerResource(name, uri, {
          description: `Basecoat skill reference file: ${relPath}`,
          mimeType: 'text/markdown',
        }, u => ({ contents: [{ uri: u.href, mimeType: 'text/markdown', text: readFileSync(fullPath, 'utf-8') }] }));
      }
    }
  }

  walk(skillsDir);
}

export function createServer(projectRoot = process.cwd()) {
  // Reject oversized registry entries before advertising a healthy server.
  for (const { id } of registry.index) {
    getComponentDetails(id, 'astro');
    getComponentDetails(id, 'html');
    runComponentSyntax({ component: id, state: 'default', environment: 'html' });
  }
  ensureMacroRegistryLoaded();

  const server = new McpServer({ name: 'basecoat-ui-mcp', version: SERVER_VERSION }, {
    instructions: MACRO_INSTRUCTIONS,
  });

  server.registerTool('search_components', {
    description: 'Find up to 8 compact component summaries by intent and/or query (either field may be omitted). Valid component IDs include: button, card, dialog, dropdown-menu, table, tabs, badge, avatar, input, select, etc. Next step: Call get_component_details or basecoat_component_syntax with the selected component id.',
    inputSchema: {
      intent: z.string().max(200).optional().describe('Semantic intent or use case (e.g., "modal dialog", "user menu", "data table", "form field").'),
      query: z.string().max(200).optional().describe('Direct component ID or name keyword to filter (e.g., "dialog", "button", "table").'),
    },
    annotations: READ_ANNOTATIONS,
  }, input => jsonResult(searchComponents({ intent: input.intent ?? '', query: input.query ?? '' })));

  server.registerTool('get_component_details', {
    description: 'Get one minimal component template, dependencies, and composition tips for Astro or HTML. Valid IDs: any of the 57 Basecoat components (button, card, dialog, dropdown-menu, table, tabs, badge, etc.). Next step: Call validate_composition or basecoat_quality_inspector after integrating markup.',
    inputSchema: {
      id: z.string().max(80).describe('Basecoat component ID from search_components (e.g., "button", "dialog", "card", "dropdown-menu", "table", "tabs").'),
      environment: z.enum(['astro', 'html']).describe('Target framework/environment template to output ("astro" or "html").'),
    },
    annotations: READ_ANNOTATIONS,
  }, ({ id, environment }) => {
    try { return jsonResult(getComponentDetails(id, environment)); }
    catch (error) { return { ...jsonResult({ error: (error as Error).message }), isError: true }; }
  });

  server.registerTool('get_component_html', {
    description: 'Fetch HTML markup template and dependencies for a Basecoat component. Valid IDs: any of 57 Basecoat components. Next step: Call validate_composition or basecoat_quality_inspector to audit.',
    inputSchema: {
      id: z.string().max(80).describe('Basecoat component ID (e.g., "button", "dialog", "card", "dropdown-menu", "table", "tabs").'),
      environment: z.enum(['astro', 'html']).optional().describe('Target environment ("astro" or "html"). Defaults to "html".'),
    },
    annotations: READ_ANNOTATIONS,
  }, ({ id, environment }) => {
    try { return jsonResult(getComponentDetails(id, environment ?? 'html')); }
    catch (error) { return { ...jsonResult({ error: (error as Error).message }), isError: true }; }
  });

  const validateCompositionSchema = {
    code: z.string().max(VALIDATE_COMPOSITION_MAX_BYTES).optional().describe('HTML or Astro source code to validate statically against Basecoat rules and tokens.'),
    html: z.string().max(VALIDATE_COMPOSITION_MAX_BYTES).optional().describe('Alias for code parameter. Pass either code or html.'),
    semanticProfile: z.string().max(64).optional().describe('Semantic rhythm profile ID (e.g., "default", "dashboard"). Defaults to "default".'),
    densityProfile: z.enum(['comfortable', 'compact']).optional().describe('Optical spacing density profile ("comfortable" or "compact").'),
  };

  const handleValidateComposition = (input: {
    code?: string;
    html?: string;
    semanticProfile?: string;
    densityProfile?: 'comfortable' | 'compact';
  }) => {
    const { code, html } = input;
    if (code === undefined && html === undefined) {
      return { ...jsonResult({ error: 'Provide code or html (required).' }), isError: true };
    }
    if (code !== undefined && html !== undefined && code !== html) {
      return { ...jsonResult({ error: 'code and html differ; pass one field or matching values.' }), isError: true };
    }
    return jsonResult(validateComposition(code ?? html!, {
      semanticProfile: input.semanticProfile,
      densityProfile: input.densityProfile,
      projectRoot,
    }));
  };

  server.registerTool('validate_composition', {
    description: '[STAGE 4: QUALITY AUDIT] Statically check HTML/Astro source for Basecoat migration errors, semantic rhythm, FSM bindings, missing scripts, nested cards, spacing and hierarchy issues. Pass code or alias html and optionally a semanticProfile and densityProfile. Does not render or evaluate dynamic code. Next step: Fix any errors/warnings reported in the diagnostic output.',
    inputSchema: validateCompositionSchema,
    annotations: READ_ANNOTATIONS,
  }, handleValidateComposition);

  server.registerTool('validate_markup', {
    description: '[STAGE 4: QUALITY AUDIT] Alias of validate_composition. Statically check HTML/Astro source for Basecoat migration errors, semantic rhythm, FSM bindings, missing scripts, nested cards, spacing and hierarchy issues. Next step: Fix any errors/warnings reported in the diagnostic output.',
    inputSchema: validateCompositionSchema,
    annotations: READ_ANNOTATIONS,
  }, handleValidateComposition);

  server.registerTool('search_macro_blocks', {
    description: 'Search approved macro layout blocks by query, role, family, or tag. Optional design/page/slot context filters to slot-compatible roles. Returns summaries and immutable refs only; use cursors for more.',
    inputSchema: searchMacroBlocksInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleSearchMacroBlocks(input, projectRoot));

  server.registerTool('get_macro_block', {
    description: 'Retrieve one section of a compiled macro block blueprint (manifest, structure, slots, ports, rules, dependencies, provenance). Follow next cursors until complete. Optional designId pins aliases to that session registry.',
    inputSchema: getMacroBlockInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleGetMacroBlock(input, projectRoot));

  server.registerTool('begin_design', {
    description: 'Create a persistent design session under the host project root. Pass designId, profile (alias or ref), operationId, and optional decisions. Pins and hash-verifies the packaged macro registry. Idempotent for the same operationId. Oversized optional receipt fields may be omitted with truncated:true after commit.',
    inputSchema: beginDesignInputShape,
    annotations: MUTATION_ANNOTATIONS,
  }, input => handleBeginDesign(input, projectRoot));

  server.registerTool('get_design_context', {
    description: 'Read a focused design view: sessions (no designId), overview, decisions, graph, rules, focus, or next. Pin revision on first read; continuations must match. Does not create sessions.',
    inputSchema: getDesignContextInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleGetDesignContext(input, projectRoot));

  server.registerTool('apply_design_patch', {
    description: 'Apply one atomic list of design graph operations with expectedRevision and operationId. Replay with the same operationId returns the original receipt. A committed mutation always acknowledges success; oversized optional fields may be omitted with truncated:true. Does not write application source files.',
    inputSchema: applyDesignPatchInputShape,
    annotations: MUTATION_ANNOTATIONS,
  }, input => handleApplyDesignPatch(input, projectRoot));

  server.registerTool('validate_design', {
    description: 'Validate a design session (or one page) in draft or complete mode. Returns totals plus paginated diagnostics. A plan-ready graph is not proof of rendered correctness.',
    inputSchema: validateDesignInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleValidateDesign(input, projectRoot));

  server.registerTool('get_rhythm_rules', {
    description: 'Read the effective semantic rhythm profile by family, including project-local overrides under a contained .basecoat/rhythm.json. Semantic IDs and approved implementation utilities are returned separately. Results are content-addressed and cursor-paginated; changed effective revisions invalidate prior cursors.',
    inputSchema: getRhythmRulesInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleGetRhythmRules(input, projectRoot));

  server.registerTool('get_fsm_recipe', {
    description: 'Read finite FSM states, events, guards, actions, or transitions. Recipes are structural metadata, not executable runtime code.',
    inputSchema: getFsmRecipeInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleGetFsmRecipe(input));

  server.registerTool('basecoat_setup_config', {
    description: '[STAGE 1: ARCHITECT] Generate production Tailwind CSS v4 @import statements, OKLCH design tokens, @theme inline blocks, and theme bootstrap scripts for a selected framework (astro, vanilla, nextjs, sveltekit, vite, htmx) and style pack (vega, nova, maia, lyra, mira, luma, sera, rhea). Next step: Call basecoat_compose_stack or basecoat_page_architect.',
    inputSchema: setupConfigInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => jsonResult(runSetupConfig(input)));

  server.registerTool('basecoat_page_architect', {
    description: '[STAGE 1: ARCHITECT] Search and retrieve complete layout scaffolds (Workspace Dashboard, Auth Split-Screen, Data Table Detail, Workspace Settings, Pricing, etc.) with explicit slot markers, grid structures, and responsive containers. Next step: Call basecoat_rules_enforcer and basecoat_creative_director, then basecoat_compose_stack or basecoat_component_syntax.',
    inputSchema: pageArchitectInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => jsonResult(runPageArchitect(input)));

  server.registerTool('basecoat_rules_enforcer', {
    description: '[STAGE 2: RULES & RHYTHM] Retrieve indexed technical implementation constraints covering strict Tailwind CSS v4 syntax, mandatory FSM data-state contracts, semantic CSS variable tokens, and semantic HTML landmarks. Next step: Call basecoat_creative_director or basecoat_component_syntax.',
    inputSchema: rulesEnforcerInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => jsonResult(runRulesEnforcer(input)));

  server.registerTool('basecoat_creative_director', {
    description: '[STAGE 2: RULES & RHYTHM] Surface Kanso minimalism and Basecoat design intelligence: typography ladders, optical spacing rhythm, whitespace density, contrast ratios, style packs, and subtle elevation strategies. Next step: Call basecoat_compose_stack or basecoat_component_syntax.',
    inputSchema: creativeDirectorInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => jsonResult(runCreativeDirector(input, projectRoot)));

  server.registerTool('basecoat_compose_stack', {
    description: '[STAGE 3: SYNTAX & STACKS] Assemble full shell architectures (sidebar-01..16, topbar-shell, inset-shell, split-shell) and hydrate pre-configured component stacks (kpi-4-col-delta, area-revenue-stack, data-table-full-crud, detail-inspector-drawer, field-group-settings) into slots with optical density control. Next step: Call basecoat_quality_inspector to verify markup compliance.',
    inputSchema: composeStackInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => {
    try {
      return jsonResult(runComposeStack(input));
    } catch (error) {
      return { ...jsonResult({ error: (error as Error).message }), isError: true };
    }
  });

  server.registerTool('basecoat_component_syntax', {
    description: '[STAGE 3: SYNTAX & STACKS] Retrieve copy-pasteable Basecoat component markup with pre-configured FSM state variants (default, active, loading, disabled, open, closed) and dependencies for any of the 57 Basecoat components. Next step: Call basecoat_quality_inspector to audit assembled markup.',
    inputSchema: componentSyntaxInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => {
    try {
      return jsonResult(runComponentSyntax(input));
    } catch (error) {
      return { ...jsonResult({ error: (error as Error).message }), isError: true };
    }
  });

  server.registerTool('basecoat_list_charts', {
    description: '[STAGE 3: SYNTAX & STACKS] List and filter 50+ Basecoat ApexCharts and SVG data visualization blueprints by category (area, bar, line, pie, radar, radial, tooltip) or keyword query. Next step: Call basecoat_get_chart_blueprint with the selected chart ID.',
    inputSchema: listChartsInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => jsonResult(runListCharts(input)));

  server.registerTool('basecoat_get_chart_blueprint', {
    description: '[STAGE 3: SYNTAX & STACKS] Retrieve complete chart markup, CSS theme tokens (--chart-1..5), and framework mount code (vanilla, astro, react, vue, svelte) for a specific chart blueprint ID or category. Next step: Call basecoat_quality_inspector to audit the assembled page.',
    inputSchema: getChartBlueprintInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => {
    try {
      return jsonResult(runGetChartBlueprint(input));
    } catch (error) {
      return { ...jsonResult({ error: (error as Error).message }), isError: true };
    }
  });

  server.registerTool('basecoat_quality_inspector', {
    description: '[STAGE 4: QUALITY AUDIT] Audit HTML/Astro markup and return a structured quality report with Score (0-100), Syntax Violations, Accessibility/ARIA omissions, and Auto-Fix suggestions. Final quality gate for all generated Basecoat UI code.',
    inputSchema: qualityInspectorInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => {
    const source = input.code ?? input.html ?? input.markup;
    if (source === undefined) {
      return { ...jsonResult({ error: 'Provide code, html, or markup (required).' }), isError: true };
    }
    return jsonResult(runQualityInspector(source, {
      semanticProfile: input.semanticProfile,
      densityProfile: input.densityProfile,
      enforceFsm: input.enforceFsm,
      projectRoot,
    }));
  });

  server.registerResource('design-rhythm', 'basecoat://design/rhythm', {
    description: 'Content hierarchy, spatial rhythm, density, typography, and composition constraints.', mimeType: 'text/markdown',
  }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: RHYTHM }] }));
  server.registerResource('design-theming', 'basecoat://design/theming', {
    description: 'Basecoat token contract, class-based dark mode with one resolver (basecoat.theme / themeMode), no-flash bootstrap, form control and autofill pitfalls.', mimeType: 'text/markdown',
  }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: THEMING }] }));
  server.registerResource('framework-integration', 'basecoat://integration/frameworks', {
    description: 'Production integration (Astro, Next.js, Express/Node), Tailwind 4 setup, and framework-agnostic usage.', mimeType: 'text/markdown',
  }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: FRAMEWORK_INTEGRATION }] }));
  server.registerResource('project-context', 'basecoat://project/context', {
    description: 'Read DESIGN.md from the explicitly configured host project root; bounded local data.', mimeType: 'application/json',
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(await readProjectContext(projectRoot)) }] }));

  let skillsDir = fileURLToPath(new URL('../../skills', import.meta.url));
  if (!existsSync(skillsDir)) {
    const altDir = fileURLToPath(new URL('../skills', import.meta.url));
    if (existsSync(altDir)) {
      skillsDir = altDir;
    }
  }
  registerSkillsResources(server, skillsDir);

  return server;
}
