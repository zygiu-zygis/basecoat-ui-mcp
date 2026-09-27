#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createServer } from './index.js';

async function main() {
  const args = process.argv.slice(2);
  if (args.length && (args.length !== 2 || args[0] !== '--project-root' || !args[1])) {
    throw new Error('Usage: basecoat-ui-mcp [--project-root /absolute/host/project]');
  }
  const projectRoot = resolve(args[1] ?? process.env.BASECOAT_PROJECT_ROOT ?? process.cwd());
  if (!(await stat(projectRoot)).isDirectory()) throw new Error('Project root must be a directory.');
  const server = createServer(projectRoot);
  const transport = new StdioServerTransport();
  transport.onclose = () => { void server.close(); };
  await server.connect(transport);
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => { void server.close().then(() => process.exit(0)); });
  }
}
main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`basecoat-ui-mcp: ${message}`);
  process.exitCode = 1;
});
