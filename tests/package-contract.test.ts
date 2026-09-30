// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { chmod, cp, mkdir, mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { promisify } from 'node:util';
import test from 'node:test';

const execFileAsync = promisify(execFile);

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

test('compiled semantics starts offline from a read-only installed package tree', async () => {
  const temp = await mkdtemp(join(tmpdir(), 'basecoat-installed-'));
  const packageRoot = join(temp, 'package');
  const makeReadOnly = async (directory: string): Promise<void> => {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await makeReadOnly(path);
        await chmod(path, 0o555);
      } else {
        await chmod(path, 0o444);
      }
    }
    await chmod(directory, 0o555);
  };
  const makeWritable = async (directory: string): Promise<void> => {
    await chmod(directory, 0o755);
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) {
        await makeWritable(path);
      } else {
        await chmod(path, 0o644);
      }
    }
  };
  try {
    await mkdir(join(packageRoot, 'src', 'semantics'), { recursive: true });
    await cp(join(process.cwd(), 'dist'), join(packageRoot, 'dist'), { recursive: true });
    await cp(
      join(process.cwd(), 'src', 'semantics', 'semantics.snapshot.json'),
      join(packageRoot, 'src', 'semantics', 'semantics.snapshot.json'),
    );
    await mkdir(join(packageRoot, 'node_modules'), { recursive: true });
    await cp(
      join(process.cwd(), 'node_modules', 'zod'),
      join(packageRoot, 'node_modules', 'zod'),
      { recursive: true },
    );
    await writeFile(join(packageRoot, 'package.json'), '{"type":"module"}\n');
    await makeReadOnly(packageRoot);

    const moduleUrl = pathToFileURL(join(packageRoot, 'dist', 'semantics', 'index.js')).href;
    const offlineFixture = join(process.cwd(), 'tests', 'fixtures', 'offline.mjs');
    const { stdout, stderr } = await execFileAsync(process.execPath, [
      '--import',
      offlineFixture,
      '--input-type=module',
      '--eval',
      `const mod = await import(${JSON.stringify(moduleUrl)}); console.log(mod.defaultSemanticsStore.getRevision());`,
    ], { cwd: packageRoot });
    assert.match(stdout.trim(), /^[a-f0-9]{64}$/);
    assert.equal(stderr, '');
  } finally {
    await makeWritable(packageRoot).catch(() => undefined);
    await rm(temp, { recursive: true, force: true });
  }
});
