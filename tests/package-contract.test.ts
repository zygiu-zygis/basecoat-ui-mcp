// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const execFileAsync = promisify(execFile);
const offlineFixture = fileURLToPath(new URL('./fixtures/offline.mjs', import.meta.url));

async function makeReadOnly(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      await makeReadOnly(path);
      await chmod(path, 0o555);
    } else {
      await chmod(path, 0o444);
    }
  }
  await chmod(directory, 0o555);
}

async function makeWritable(directory: string): Promise<void> {
  await chmod(directory, 0o755);
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isSymbolicLink()) continue;
    if (entry.isDirectory()) {
      await makeWritable(path);
    } else {
      await chmod(path, 0o644);
    }
  }
}

async function copyProductionDependencies(packageRoot: string): Promise<void> {
  const queue = ['@modelcontextprotocol/sdk', 'zod'];
  const copied = new Set<string>();
  while (queue.length > 0) {
    const name = queue.shift()!;
    if (copied.has(name)) continue;
    const source = join(process.cwd(), 'node_modules', ...name.split('/'));
    const destination = join(packageRoot, 'node_modules', ...name.split('/'));
    try {
      const manifest = JSON.parse(await readFile(join(source, 'package.json'), 'utf8')) as {
        dependencies?: Record<string, string>;
        optionalDependencies?: Record<string, string>;
        peerDependencies?: Record<string, string>;
      };
      await mkdir(join(destination, '..'), { recursive: true });
      await cp(source, destination, { recursive: true });
      copied.add(name);
      for (const dependency of Object.keys({
        ...manifest.dependencies,
        ...manifest.optionalDependencies,
        ...manifest.peerDependencies,
      })) {
        queue.push(dependency);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}

test('npm package contains runtime, snapshots, source contracts, and no workflow files', { timeout: 30_000 }, async () => {
  const { stdout } = await execFileAsync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], {
    cwd: process.cwd(),
    maxBuffer: 4 * 1024 * 1024,
  });
  const reports = JSON.parse(stdout) as Array<{ files: Array<{ path: string }> }>;
  assert.equal(reports.length, 1);
  const paths = new Set(reports[0]!.files.map(file => file.path));
  for (const required of [
    'dist/server/stdio.js',
    'src/registry/components.json',
    'src/macros/registry.snapshot.json',
    'src/semantics/semantics.snapshot.json',
    'templates/cursor/basecoat-designer.mdc',
    'README.md',
    'ARCHITECTURE.md',
    'LICENSE',
    'package.json',
    'server.json',
  ]) {
    assert(paths.has(required), `package is missing ${required}`);
  }
  assert([...paths].every(path => !path.startsWith('.github/workflows/')));
});

test('packed MCP bin starts offline from a read-only installed package tree', { timeout: 60_000 }, async () => {
  const temp = await mkdtemp(join(tmpdir(), 'basecoat-installed-'));
  const packageRoot = join(temp, 'package');
  const hostRoot = join(temp, 'host-project');
  let client: Client | undefined;
  try {
    const { stdout } = await execFileAsync(
      'npm',
      ['pack', '--json', '--ignore-scripts', '--pack-destination', temp],
      { cwd: process.cwd(), maxBuffer: 4 * 1024 * 1024 },
    );
    const reports = JSON.parse(stdout) as Array<{ filename: string }>;
    assert.equal(reports.length, 1);
    await execFileAsync('tar', ['-xzf', join(temp, reports[0]!.filename), '-C', temp]);
    await copyProductionDependencies(packageRoot);
    await mkdir(hostRoot);
    await makeReadOnly(packageRoot);

    const transport = new StdioClientTransport({
      command: process.execPath,
      args: [
        '--import',
        offlineFixture,
        join(packageRoot, 'dist', 'server', 'stdio.js'),
        '--project-root',
        hostRoot,
      ],
      cwd: hostRoot,
      stderr: 'pipe',
    });
    let stderr = '';
    transport.stderr?.on('data', (chunk: Buffer) => { stderr += chunk.toString(); });
    client = new Client({ name: 'packed-package-contract-test', version: '1.0.0' });
    await client.connect(transport);
    assert.equal(client.getServerVersion()?.name, 'basecoat-ui-mcp');
    assert.equal(client.getServerVersion()?.version, '1.1.0');
    const { tools } = await client.listTools();
    assert.equal(tools.length, 11);
    assert(tools.some(tool => tool.name === 'validate_composition'));
    assert.equal(stderr, '');
  } finally {
    await client?.close().catch(() => undefined);
    await makeWritable(packageRoot).catch(() => undefined);
    await rm(temp, { recursive: true, force: true });
  }
});
