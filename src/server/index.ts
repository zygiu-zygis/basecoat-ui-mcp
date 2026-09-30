// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { RHYTHM } from '../design/rhythm.js';
import { ASTRO_INTEGRATION } from '../design/astro.js';
import { readProjectContext } from '../design/project.js';
import { searchComponents } from '../tools/search.js';
import { getComponentDetails } from '../tools/details.js';
import { validateComposition } from '../tools/validate.js';
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
  'Macro-first workflow: begin_design (pin profile) → search_macro_blocks / get_macro_block → ' +
  'apply_design_patch (expectedRevision + unique operationId) → get_design_context → ' +
  'validate_design → implement leaves via search_components / get_component_details → ' +
  'validate_composition on generated source. Use explicit design IDs; list sessions when unknown. ' +
  'Compose leaves in this order: content hierarchy, layout, component selection, spacing, typography, final composition. ' +
  'Read basecoat://design/rhythm and basecoat://project/context. Search returns summaries; request details only for selected IDs. ' +
  'Read basecoat://integration/astro for production setup. All runtime data is offline. ' +
  'Layout contracts come from this server\'s macro registry, not from shadcn or MCP itself.';

export function createServer(projectRoot = process.cwd()) {
  // Reject oversized registry entries before advertising a healthy server.
  for (const { id } of registry.index) {
    getComponentDetails(id, 'astro');
    getComponentDetails(id, 'html');
  }
  ensureMacroRegistryLoaded();

  const server = new McpServer({ name: 'basecoat-ui-mcp', version: SERVER_VERSION }, {
    instructions: MACRO_INSTRUCTIONS,
  });

  server.registerTool('search_components', {
    description: 'Find up to 8 compact component summaries by intent and/or query (either field may be omitted). No matches returns an empty list; no markup is returned.',
    inputSchema: { intent: z.string().max(200).optional(), query: z.string().max(200).optional() },
    annotations: READ_ANNOTATIONS,
  }, input => jsonResult(searchComponents({ intent: input.intent ?? '', query: input.query ?? '' })));

  server.registerTool('get_component_details', {
    description: 'Get one minimal component template, dependencies, and composition tips for Astro or HTML. Response is bounded below 2000 UTF-8 bytes.',
    inputSchema: { id: z.string().max(80), environment: z.enum(['astro', 'html']) },
    annotations: READ_ANNOTATIONS,
  }, ({ id, environment }) => {
    try { return jsonResult(getComponentDetails(id, environment)); }
    catch (error) { return { ...jsonResult({ error: (error as Error).message }), isError: true }; }
  });

  server.registerTool('validate_composition', {
    description: 'Statically check HTML/Astro source for Basecoat migration errors, missing scripts, nested cards, spacing and hierarchy issues. Include layout imports. Pass `code` or alias `html` (not both with different values). Unknown input keys are ignored. Does not render or evaluate dynamic code.',
    inputSchema: { code: z.string().max(65_536).optional(), html: z.string().max(65_536).optional() },
    annotations: READ_ANNOTATIONS,
  }, input => {
    const { code, html } = input;
    if (code === undefined && html === undefined) {
      return { ...jsonResult({ error: 'Provide code or html (required).' }), isError: true };
    }
    if (code !== undefined && html !== undefined && code !== html) {
      return { ...jsonResult({ error: 'code and html differ; pass one field or matching values.' }), isError: true };
    }
    return jsonResult(validateComposition(code ?? html!));
  });

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
    description: 'Create a persistent design session under the host project root. Pass designId, profile (alias or ref), operationId, and optional decisions. Pins the packaged macro registry. Idempotent for the same operationId.',
    inputSchema: beginDesignInputShape,
    annotations: MUTATION_ANNOTATIONS,
  }, input => handleBeginDesign(input, projectRoot));

  server.registerTool('get_design_context', {
    description: 'Read a focused design view: sessions (no designId), overview, decisions, graph, rules, focus, or next. Pin revision on first read; continuations must match. Does not create sessions.',
    inputSchema: getDesignContextInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleGetDesignContext(input, projectRoot));

  server.registerTool('apply_design_patch', {
    description: 'Apply one atomic list of design graph operations with expectedRevision and operationId. Replay with the same operationId returns the original receipt. Does not write application source files.',
    inputSchema: applyDesignPatchInputShape,
    annotations: MUTATION_ANNOTATIONS,
  }, input => handleApplyDesignPatch(input, projectRoot));

  server.registerTool('validate_design', {
    description: 'Validate a design session (or one page) in draft or complete mode. Returns totals plus paginated diagnostics. A plan-ready graph is not proof of rendered correctness.',
    inputSchema: validateDesignInputShape,
    annotations: READ_ANNOTATIONS,
  }, input => handleValidateDesign(input, projectRoot));

  server.registerResource('design-rhythm', 'basecoat://design/rhythm', {
    description: 'Content hierarchy, spatial rhythm, density, typography, and composition constraints.', mimeType: 'text/markdown',
  }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: RHYTHM }] }));
  server.registerResource('astro-integration', 'basecoat://integration/astro', {
    description: 'Production Astro/Vite/Tailwind 4 setup, selective JS, native dialog and prototype distinction.', mimeType: 'text/markdown',
  }, uri => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: ASTRO_INTEGRATION }] }));
  server.registerResource('project-context', 'basecoat://project/context', {
    description: 'Read DESIGN.md from the explicitly configured host project root; bounded local data.', mimeType: 'application/json',
  }, async uri => ({ contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(await readProjectContext(projectRoot)) }] }));
  return server;
}
