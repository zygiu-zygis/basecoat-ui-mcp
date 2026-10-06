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
  assert(evidence.excludedSurfaces.some(surface =>
    surface.status === 'unrelated search noise'));
  assert.deepEqual(Object.keys(evidence.records[0] ?? {}).sort(), [
    'authority',
    'correction',
    'current',
    'expected',
    'status',
    'surface',
    'verification',
  ]);
});

test('release evidence supports the post-release parity phase', async () => {
  const evidence = await buildReleaseEvidence('post-release');
  assert.equal(evidence.phase, 'post-release');
  assert.equal(evidence.parity, 'pass');
  assert(evidence.approvalsRequired.includes('npm publish'));
});
