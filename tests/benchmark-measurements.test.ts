// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Benchmark measurements and schema discoverability tests for Phase 3.
// Measures real-world payload sizes, query counts, and schema exposure without unverified percentage assumptions.

import assert from 'node:assert/strict';
import test from 'node:test';
import { handleGetRhythmRules } from '../src/semantics/tools.js';
import { applyDesignPatchInputShape, softPatchOpSchema } from '../src/macros/tools.js';
import { validateComposition } from '../src/tools/validate.js';

test('P2 schema discoverability: apply_design_patch exposes discriminated operations in tool schema', () => {
  // Input shape must use softPatchOpSchema rather than generic record
  assert.equal(applyDesignPatchInputShape.operations.element, softPatchOpSchema);

  // Check that options in discriminated union contain all expected operations
  const options = softPatchOpSchema.options;
  const opNames = options.map(opt => (opt.shape as { op: { value: string } }).op.value);

  const expectedOps = [
    'instantiate_recipe',
    'attach_block',
    'replace_block',
    'remove_block',
    'connect_ports',
    'disconnect_ports',
    'set_decision',
    'record_written',
    'mark_plan_ready',
  ];

  for (const expected of expectedOps) {
    assert(
      opNames.includes(expected),
      `softPatchOpSchema must explicitly include "${expected}" operation for discoverability`,
    );
  }
});

test('P2 benchmark: rhythm rules query count and byte measurements', async () => {
  // 1. Grouped query by family: reading only needed group (e.g. spacing)
  const familyResult = await handleGetRhythmRules({ profile: 'default', family: 'spacing' });
  assert.equal(familyResult.isError, undefined);

  const familyText = (familyResult.content[0] as { text: string }).text;
  const familyPacket = JSON.parse(familyText) as {
    next?: string | null;
    rhythmRules: { total: number };
    items: unknown[];
  };

  assert.equal(familyPacket.rhythmRules.total, 4, 'Spacing family contains 4 rules');
  assert.equal(familyPacket.items.length, 4, 'All 4 family rules fit in 1 single query');
  assert.equal(familyPacket.next, null, 'No continuation cursor needed when querying specific family');
  assert(Buffer.byteLength(familyText, 'utf8') <= 1500, 'Single family payload stays under 1.5 KB');

  // 2. Full 16-rule retrieval across all families
  // Baseline before optimization: 16 rules required 7 queries and 11,352 bytes.
  let fullBytes = 0;
  let queryCount = 0;
  let cursor: string | undefined;

  do {
    const pageResult = await handleGetRhythmRules({ profile: 'default', cursor });
    assert.equal(pageResult.isError, undefined);
    const text = (pageResult.content[0] as { text: string }).text;
    fullBytes += Buffer.byteLength(text, 'utf8');
    queryCount++;
    const parsed = JSON.parse(text) as { next?: string | null };
    cursor = parsed.next ?? undefined;
  } while (cursor);

  // Empirical verification:
  assert(
    queryCount <= 3,
    `Full 16 rules must require at most 3 queries (measured: ${queryCount}, baseline was 7 queries)`,
  );
  assert(
    fullBytes <= 5000,
    `Full 16 rules total payload must stay <= 5000 bytes (measured: ${fullBytes} bytes, baseline was 11,352 bytes)`,
  );
});

test('Domain validation: semantic IDs remain metadata, not CSS classes, and Basecoat anatomy is checked', () => {
  // Semantic identifiers must not be injected as CSS utility classes
  const markupWithSemanticIdAsUtility = '<div class="gap-rhythm-sm bg-surface-primary text-body"></div>';
  const report = validateComposition(markupWithSemanticIdAsUtility, { semanticProfile: 'default' });
  
  // Validation flags semantic tokens used as utilities
  const rules = report.issues.map((issue: { rule: string }) => issue.rule);
  assert(
    rules.includes('semantic-token-as-utility'),
    'Semantic identities used as CSS utility classes must be flagged by validator',
  );

  // Approved Basecoat anatomy (btn with data-variant) and Tailwind utilities
  const approvedMarkup = '<div class="p-4 gap-4"><button class="btn" data-variant="default">Submit</button></div>';
  const approvedReport = validateComposition(approvedMarkup);
  const errors = approvedReport.issues.filter((issue: { severity: string }) => issue.severity === 'error');
  assert.equal(errors.length, 0, 'Approved anatomy and utilities must produce zero errors');
});
