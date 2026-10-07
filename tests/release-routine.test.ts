import assert from 'node:assert/strict';
import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { buildReleaseEvidence } from '../scripts/release-check.js';

async function makeReleaseFixture(): Promise<string> {
  const fixture = await mkdtemp(join(tmpdir(), 'basecoat-release-'));
  await cp('package.json', join(fixture, 'package.json'));
  await cp('package-lock.json', join(fixture, 'package-lock.json'));
  await cp('server.json', join(fixture, 'server.json'));
  await cp('README.md', join(fixture, 'README.md'));
  await cp('src/server', join(fixture, 'src/server'), { recursive: true });
  return fixture;
}

async function updateFixtureLockfile(
  fixture: string,
  update: (lockfile: Record<string, unknown>) => void,
): Promise<void> {
  const path = join(fixture, 'package-lock.json');
  const lockfile = JSON.parse(await readFile(path, 'utf8')) as Record<string, unknown>;
  update(lockfile);
  await writeFile(path, `${JSON.stringify(lockfile, null, 2)}\n`);
}

test('release evidence enforces local parity without probing external surfaces', async () => {
  const evidence = await buildReleaseEvidence('pre-release');

  assert.equal(evidence.parity, 'pass');
  assert.equal(evidence.phase, 'pre-release');
  assert.equal(evidence.package.version, '1.6.4');
  assert(evidence.records.some(record =>
    record.surface === 'server.json version' && record.status === 'match'));
  assert(evidence.records.some(record =>
    record.surface === 'MCP capabilities' && record.status === 'match'));
  assert(evidence.records.some(record =>
    record.surface === 'npm package page' && record.status === 'inaccessible'));
  const packageContract = evidence.records.find(record =>
    record.surface === 'package install contract');
  assert.equal(packageContract?.claims.transport, 'stdio');
  assert.equal(packageContract?.expectedIdentity.packageName, '@intellmedia/basecoat-ui-mcp');
  assert.equal(packageContract?.approvalState, 'not-required');
  assert.match(packageContract?.checkedAt ?? '', /^\d{4}-\d{2}-\d{2}T/);
  assert(packageContract?.evidence.length);
  assert.equal(packageContract?.nextAction, 'No action required.');
  const npmSurface = evidence.records.find(record =>
    record.surface === 'npm package page');
  assert.equal(npmSurface?.platform, 'npm package page');
  assert.equal(npmSurface?.approvalState, 'required');
  assert.equal(npmSurface?.expectedIdentity.version, '1.6.4');
  assert(npmSurface?.nextAction.includes('Manually verify'));
  assert(evidence.excludedSurfaces.some(surface =>
    surface.status === 'unrelated search noise'));
  assert.deepEqual(Object.keys(evidence.records[0] ?? {}).sort(), [
    'approvalState',
    'authority',
    'checkedAt',
    'claims',
    'correction',
    'current',
    'evidence',
    'expected',
    'expectedIdentity',
    'nextAction',
    'observedIdentity',
    'owner',
    'platform',
    'status',
    'surface',
    'url',
    'verification',
  ]);
});

test('release evidence supports the post-release parity phase', async () => {
  const evidence = await buildReleaseEvidence('post-release');
  assert.equal(evidence.phase, 'post-release');
  assert.equal(evidence.parity, 'pass');
  assert(evidence.approvalsRequired.includes('npm publish'));
});

test('release evidence fails when authoritative lockfile identity drifts', async (t) => {
  const cases = [
    ['top-level name', (lockfile: Record<string, unknown>) => { lockfile.name = 'wrong-name'; }],
    ['top-level version', (lockfile: Record<string, unknown>) => { lockfile.version = '0.0.0'; }],
    ['root package name', (lockfile: Record<string, unknown>) => {
      (lockfile.packages as Record<string, Record<string, unknown>>)['']!.name = 'wrong-name';
    }],
    ['root package version', (lockfile: Record<string, unknown>) => {
      (lockfile.packages as Record<string, Record<string, unknown>>)['']!.version = '0.0.0';
    }],
  ] as const;

  for (const [label, update] of cases) {
    await t.test(label, async () => {
      const fixture = await makeReleaseFixture();
      try {
        await updateFixtureLockfile(fixture, update);
        const evidence = await buildReleaseEvidence('pre-release', fixture);
        assert.equal(evidence.parity, 'fail');
        assert(evidence.records.some(record =>
          record.surface.startsWith('package-lock') && record.status === 'stale'));
      } finally {
        await rm(fixture, { recursive: true, force: true });
      }
    });
  }
});
