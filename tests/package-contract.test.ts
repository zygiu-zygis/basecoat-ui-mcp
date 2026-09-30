// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
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
