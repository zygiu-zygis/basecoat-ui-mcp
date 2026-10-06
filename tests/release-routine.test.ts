import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReleaseEvidence } from '../scripts/release-check.js';

test('release evidence enforces local parity without probing external surfaces', async () => {
  const evidence = await buildReleaseEvidence('pre-release');

  assert.equal(evidence.parity, 'pass');
  assert.equal(evidence.phase, 'pre-release');
  assert.equal(evidence.package.version, '1.6.3');
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
  assert.equal(npmSurface?.expectedIdentity.version, '1.6.3');
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
