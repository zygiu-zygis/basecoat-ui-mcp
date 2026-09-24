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

export function createServer(projectRoot = process.cwd()) {
  // Reject oversized registry entries before advertising a healthy server.
  for (const { id } of registry.index) {
    getComponentDetails(id, 'astro');
    getComponentDetails(id, 'html');
  }
  const server = new McpServer({ name: 'basecoat-ui-mcp', version: '1.0.0' }, {
    instructions: 'Compose in this order: content hierarchy, layout, component selection, spacing, typography, final composition. Read basecoat://design/rhythm and basecoat://project/context. Search returns summaries; request details only for selected IDs. Read basecoat://integration/astro for production setup. Validate the final composition. All runtime data is offline.',
  });
  const annotations = { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false };
  server.registerTool('search_components', {
    description: 'Find up to 8 compact component summaries by intent and query. No matches returns an empty list; no markup is returned.',
    inputSchema: { intent: z.string().max(200), query: z.string().max(200) }, annotations,
  }, input => jsonResult(searchComponents(input)));
  server.registerTool('get_component_details', {
    description: 'Get one minimal component template, dependencies, and composition tips for Astro or HTML. Response is bounded below 2000 UTF-8 bytes.',
    inputSchema: { id: z.string().max(80), environment: z.enum(['astro', 'html']) }, annotations,
  }, ({ id, environment }) => {
    try { return jsonResult(getComponentDetails(id, environment)); }
    catch (error) { return { ...jsonResult({ error: (error as Error).message }), isError: true }; }
  });
  server.registerTool('validate_composition', {
    description: 'Statically check HTML/Astro source for Basecoat migration errors, missing scripts, nested cards, spacing and hierarchy issues. Include layout imports. Does not render or evaluate dynamic code.',
    inputSchema: { code: z.string().max(65_536) }, annotations,
  }, ({ code }) => jsonResult(validateComposition(code)));

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
