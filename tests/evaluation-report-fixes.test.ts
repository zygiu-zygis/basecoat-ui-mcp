// Copyright Žygimantas Jasiulionis / Intellmedia.
// Dedicated regression tests for Basecoat UI MCP evaluation report findings (2026-09-30).
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { validateComposition } from '../src/tools/validate.js';
import { getCompiledRegistry, getBlock, searchMacroBlocks } from '../src/macros/registry.js';
import { handleGetRhythmRules } from '../src/semantics/tools.js';
import { resultBytes, MacroError } from '../src/macros/packets.js';
import { MAX_DETAIL_BYTES } from '../src/tools/budget.js';

describe('Evaluation Report Findings (2026-09-30)', () => {
  const registry = getCompiledRegistry();

  it('Finding 1: search_macro_blocks returns 10+ items under 1999 byte budget with limit: 20', () => {
    const result = searchMacroBlocks(registry, { limit: 20 });
    const bytes = resultBytes(result);
    assert(bytes <= MAX_DETAIL_BYTES, `Search result must be <= ${MAX_DETAIL_BYTES} bytes, got ${bytes}`);

    const packet = JSON.parse((result.content[0] as { text: string }).text) as {
      items: Array<{ id: string; role: string; family: string; ref: string }>;
      total: number;
    };

    // Previously capped at 5 items due to ~350 byte descriptions
    assert(packet.items.length >= 10, `Expected at least 10 items in page, got ${packet.items.length}`);
    for (const item of packet.items) {
      assert(item.id, 'Item must have an id');
      assert(item.role, 'Item must have a role');
      assert(item.family, 'Item must have a family');
      assert(item.ref, 'Item must have a ref');
    }
  });

  it('Finding 2: get_rhythm_rules successfully retrieves layout family and layouts alias', async () => {
    const directResult = await handleGetRhythmRules({ profile: 'default', family: 'layout' });
    assert.equal(directResult.isError, undefined);
    const directPacket = JSON.parse((directResult.content[0] as { text: string }).text) as {
      items: Array<{ familyId: string; mapping: { id: string; value: string } }>;
    };
    assert(directPacket.items.length > 0);
    assert(directPacket.items.every(item => item.familyId === 'layout'));
    const mappingIds = directPacket.items.map(item => item.mapping.id);
    assert(mappingIds.includes('container-max-w'));
    assert(mappingIds.includes('container-prose-max-w'));
    assert(mappingIds.includes('aspect-video-ratio'));

    // Alias 'layouts' -> 'layout'
    const aliasResult = await handleGetRhythmRules({ profile: 'default', family: 'layouts' });
    assert.equal(aliasResult.isError, undefined);
  });

  it('Finding 3: getBlock identifies recipe aliases and throws EXPECTED_BLOCK_GOT_RECIPE with details', () => {
    assert.throws(
      () => getBlock(registry, 'workspace-dashboard'),
      (error: unknown) => {
        assert(error instanceof MacroError);
        assert.equal(error.code, 'EXPECTED_BLOCK_GOT_RECIPE');
        assert.match(error.message, /Resolved 'workspace-dashboard' to recipe 'workspace-dashboard'/);
        assert.equal(error.details.recipeId, 'workspace-dashboard');
        assert.equal(error.details.rootBlockId, 'app-shell');
        return true;
      },
    );
  });

  it('Finding 4: validate_composition avoids duplicate spacing warnings and accepts compact micro-spacing', () => {
    // Single warning when semanticProfile is active (no duplicate spacing-rhythm + semantic-hardcoded-spacing)
    const singleIssue = validateComposition('<div class="gap-3"></div>', {
      semanticProfile: 'default',
    });
    const spacingIssues = singleIssue.issues.filter(
      issue => issue.rule === 'spacing-rhythm' || issue.rule === 'semantic-hardcoded-spacing',
    );
    assert.equal(
      spacingIssues.length,
      1,
      `Expected exactly 1 spacing issue, got: ${spacingIssues.map(i => i.rule).join(', ')}`,
    );
    assert.equal(spacingIssues[0]?.rule, 'semantic-hardcoded-spacing');

    // Compact mode accepts micro-spacing steps (1, 3) without warnings
    const compactResult = validateComposition('<div class="p-3 gap-1 space-y-1.5 m-2.5"></div>', {
      densityProfile: 'compact',
      semanticProfile: 'default',
    });
    const compactViolations = compactResult.issues.filter(
      issue => issue.rule === 'spacing-rhythm' || issue.rule === 'semantic-hardcoded-spacing',
    );
    assert.equal(compactViolations.length, 0, `Expected 0 violations in compact mode, got: ${compactViolations.map(i => i.rule).join(', ')}`);
  });

  it('Finding 5: nested-cards is relaxed to warning and subcards are permitted', () => {
    // Unflagged nested cards produce warning, NOT fatal error
    const nested = validateComposition('<div class="card"><div class="card"></div></div>');
    assert.equal(nested.valid, true, 'Validation must remain valid (warning only)');
    const warning = nested.issues.find(issue => issue.rule === 'nested-cards');
    assert(warning, 'nested-cards warning must be reported');
    assert.equal(warning?.severity, 'warning');

    // Subcards with data-variant="subcard" or card-compact produce zero nested-cards issues
    const subcardVariant = validateComposition('<div class="card"><div class="card" data-variant="subcard"></div></div>');
    assert(!subcardVariant.issues.some(issue => issue.rule === 'nested-cards'));

    const subcardCompact = validateComposition('<div class="card"><div class="card card-compact"></div></div>');
    assert(!subcardCompact.issues.some(issue => issue.rule === 'nested-cards'));
    assert(!subcardCompact.issues.some(issue => issue.rule === 'invalid-basecoat-class'));
  });

  it('Finding 6: semantic-token-available emits severity info for legal approved classes', () => {
    const result = validateComposition('<div class="p-4 gap-4"></div>', {
      semanticProfile: 'default',
    });
    const advisories = result.issues.filter(issue => issue.rule === 'semantic-token-available');
    assert(advisories.length > 0, 'Should suggest available semantic tokens');
    for (const advisory of advisories) {
      assert.equal(advisory.severity, 'info', `Advisory severity must be 'info', got ${advisory.severity}`);
    }
    assert.equal(result.valid, true);
  });
});
