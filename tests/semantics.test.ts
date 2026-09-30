// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Tests for semantic design system compilation and registry.
import { test } from 'node:test';
import assert from 'node:assert';
import { join, dirname } from 'node:path';
import { existsSync, mkdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import {
  compileSemantics,
  createSemanticsStore,
  DEFAULT_SEMANTICS_INPUT,
  DEFAULT_RHYTHM_PROFILE,
  DIALOG_FSM_RECIPE,
  PROJECT_RHYTHM_OVERRIDE_MAX_BYTES,
  authoringFsmRecipeSchema,
  canonicalJson,
  contentRef,
} from '../src/semantics/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

test('semantic registry compilation produces stable content-addressable results', () => {
  const { registry: registry1, diagnostics: diagnostics1 } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
  const { registry: registry2, diagnostics: diagnostics2 } = compileSemantics(DEFAULT_SEMANTICS_INPUT);

  // Same input should produce identical registries
  assert.strictEqual(registry1.revision, registry2.revision);
  assert.strictEqual(JSON.stringify(registry1), JSON.stringify(registry2));
  assert.strictEqual(diagnostics1.length, diagnostics2.length);
  assert.deepEqual(diagnostics1, []);

  // Should have expected structure
  assert.strictEqual(Object.keys(registry1.rhythmProfiles).length, 1);
  assert.strictEqual(Object.keys(registry1.fsmRecipes).length, 5);
  assert.strictEqual(Object.keys(registry1.aliases).length, 6); // default, dialog, collapsible-navigation, navigation, auth-flow, tabs

  // Rhythm profile should generate text
  const rhythmProfileRef = registry1.aliases['default'];
  assert(rhythmProfileRef);
  const rhythmProfile = registry1.rhythmProfiles[rhythmProfileRef];
  assert(rhythmProfile);
  assert(rhythmProfile.rhythmText.length > 1000);
  assert(rhythmProfile.rhythmText.includes('# Basecoat composition guide'));
  assert(rhythmProfile.rhythmText.includes('gap-2'));
  assert(rhythmProfile.rhythmText.includes('gap-4'));
  const semanticIds = new Set(rhythmProfile.families.flatMap(family => family.mappings.map(mapping => mapping.id)));
  assert.deepEqual(
    [...semanticIds].sort(),
    [
      'bg-surface-primary',
      'bg-surface-secondary',
      'border-subtle',
      'gap-rhythm-lg',
      'gap-rhythm-md',
      'gap-rhythm-sm',
      'gap-rhythm-xl',
      'p-density-base',
      'p-density-compact',
      'text-body',
      'text-heading-1',
      'text-heading-2',
      'text-muted',
    ],
  );
  assert(!semanticIds.has('spacing-tight'));
});

test('FSM recipe compilation validates state machine structure', () => {
  const { registry, diagnostics } = compileSemantics(DEFAULT_SEMANTICS_INPUT);

  // Should have no errors
  assert.strictEqual(diagnostics.filter(d => d.severity === 'error').length, 0);

  // Dialog FSM should be correctly compiled
  const dialogRef = registry.aliases['dialog'];
  assert(dialogRef);
  const dialogFsm = registry.fsmRecipes[dialogRef];
  assert(dialogFsm);
  assert.strictEqual(dialogFsm.id, 'dialog');
  assert(dialogFsm.initialStates.includes('closed'));
  assert.strictEqual(dialogFsm.initialStates.length, 1);
  assert.strictEqual(dialogFsm.terminalStates.length, 0); // No terminal states in dialog

  // Should have expected structure
  assert(dialogFsm.states.length >= 4); // closed, opening, open, closing
  assert(dialogFsm.events.length >= 6);
  assert(dialogFsm.transitions.length >= 7);
});

test('navigation, auth-flow, and tabs FSM recipes compile correctly', () => {
  const { registry, diagnostics } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
  assert.strictEqual(diagnostics.filter(d => d.severity === 'error').length, 0);

  const navRef = registry.aliases['navigation'];
  assert(navRef);
  const navFsm = registry.fsmRecipes[navRef];
  assert(navFsm);
  assert.strictEqual(navFsm.id, 'navigation');
  assert.deepEqual(navFsm.initialStates, ['expanded']);
  assert(navFsm.states.some(s => s.id === 'collapsed'));
  assert(navFsm.states.some(s => s.id === 'mobile-open'));

  const authRef = registry.aliases['auth-flow'];
  assert(authRef);
  const authFsm = registry.fsmRecipes[authRef];
  assert(authFsm);
  assert.strictEqual(authFsm.id, 'auth-flow');
  assert.deepEqual(authFsm.initialStates, ['idle']);
  assert(authFsm.states.some(s => s.id === 'submitting'));
  assert(authFsm.states.some(s => s.id === 'authenticated'));

  const tabsRef = registry.aliases['tabs'];
  assert(tabsRef);
  const tabsFsm = registry.fsmRecipes[tabsRef];
  assert(tabsFsm);
  assert.strictEqual(tabsFsm.id, 'tabs');
  assert.deepEqual(tabsFsm.initialStates, ['active']);
  assert(tabsFsm.states.some(s => s.id === 'switching'));
});

test('rhythm profile content-addressable compilation', () => {
  // Create modified rhythm profile with different mappings
  const modifiedProfile = {
    ...DEFAULT_RHYTHM_PROFILE,
    description: 'Modified description',
  };

  const originalInput = DEFAULT_SEMANTICS_INPUT;
  const modifiedInput = {
    ...originalInput,
    rhythmProfiles: [modifiedProfile],
  };

  const { registry: original } = compileSemantics(originalInput);
  const { registry: modified } = compileSemantics(modifiedInput);

  // Different content should produce different refs and revisions
  assert.notStrictEqual(original.revision, modified.revision);

  const originalProfileRef = original.aliases['default'];
  const modifiedProfileRef = modified.aliases['default'];
  assert.notStrictEqual(originalProfileRef, modifiedProfileRef);

  // But aliased IDs should be the same
  assert(original.aliases['default']);
  assert(modified.aliases['default']);
});

test('semantics store provides effective rhythm profiles with project overrides', () => {
  // Create temporary test directory
  const testDir = join(__dirname, '../tmp/semantics-test');
  if (existsSync(testDir)) {
    rmSync(testDir, { recursive: true });
  }
  mkdirSync(testDir, { recursive: true });

  try {
    const { registry: snapshot } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
    writeFileSync(join(testDir, 'semantics.snapshot.json'), canonicalJson(snapshot));
    const store = createSemanticsStore(testDir);

    // Should get default profile
    const baseProfile = store.getEffectiveRhythmProfile('default');
    assert.strictEqual(baseProfile.id, 'default');
    assert(baseProfile.families.length >= 5); // spacing, typography, surfaces, borders, density

    // Should have spacing family
    const spacingFamily = baseProfile.families.find(f => f.id === 'spacing');
    assert(spacingFamily);
    assert.deepEqual(spacingFamily.mappings.map(mapping => mapping.id), [
      'gap-rhythm-sm',
      'gap-rhythm-md',
      'gap-rhythm-lg',
      'gap-rhythm-xl',
    ]);

    const overrideDir = join(testDir, '.basecoat');
    mkdirSync(overrideDir, { recursive: true });
    writeFileSync(join(overrideDir, 'rhythm.json'), JSON.stringify({
      schemaVersion: 1,
      baseProfile: 'default',
      overrideMappings: [{
        id: 'gap-rhythm-sm',
        value: 'gap-3',
        description: 'Project-specific small gap',
      }],
    }));
    const effective = store.getEffectiveRhythmProfile('default', testDir);
    assert.equal(
      effective.families.find(family => family.id === 'spacing')?.mappings.find(mapping => mapping.id === 'gap-rhythm-sm')?.value,
      'gap-3',
    );

    // Registry should be accessible
    const registry = store.getRegistry();
    assert(registry.revision);
    assert.strictEqual(Object.keys(registry.aliases).length, 6);

  } finally {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true });
    }
  }
});

test('project rhythm overrides reject unsafe or invalid files before parsing', () => {
  const testDir = join(__dirname, '../tmp/semantics-override-safety-test');
  const overrideDir = join(testDir, '.basecoat');
  const overridePath = join(overrideDir, 'rhythm.json');
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(overrideDir, { recursive: true });

  try {
    const { registry: snapshot } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
    writeFileSync(join(testDir, 'semantics.snapshot.json'), canonicalJson(snapshot));
    const store = createSemanticsStore(testDir);
    const mappingValue = () => store
      .getEffectiveRhythmProfile('default', testDir)
      .families.find(family => family.id === 'spacing')
      ?.mappings.find(mapping => mapping.id === 'gap-rhythm-sm')
      ?.value;
    const validOverride = JSON.stringify({
      schemaVersion: 1,
      baseProfile: 'default',
      overrideMappings: [{
        id: 'gap-rhythm-sm',
        value: 'gap-3',
        description: 'Project-specific small gap',
      }],
    });

    assert.equal(mappingValue(), 'gap-2', 'missing override falls back');

    writeFileSync(overridePath, 'x'.repeat(PROJECT_RHYTHM_OVERRIDE_MAX_BYTES + 1));
    assert.equal(mappingValue(), 'gap-2', 'oversized override falls back');

    writeFileSync(overridePath, '{"schemaVersion":1');
    assert.equal(mappingValue(), 'gap-2', 'malformed JSON falls back');

    writeFileSync(overridePath, JSON.stringify({
      ...JSON.parse(validOverride),
      unexpected: true,
    }));
    assert.equal(mappingValue(), 'gap-2', 'strict schema errors fall back');

    rmSync(overridePath);
    mkdirSync(overridePath);
    assert.equal(mappingValue(), 'gap-2', 'directory input is refused');

    rmSync(overridePath, { recursive: true });
    const linkedPath = join(overrideDir, 'linked-rhythm.json');
    writeFileSync(linkedPath, validOverride);
    symlinkSync(linkedPath, overridePath);
    assert.equal(mappingValue(), 'gap-2', 'symlink input is refused');

    rmSync(overridePath);
    writeFileSync(overridePath, validOverride);
    assert.equal(mappingValue(), 'gap-3', 'valid regular override is applied');
  } finally {
    rmSync(testDir, { recursive: true, force: true });
  }
});

test('invalid FSM recipes produce compilation errors', () => {
  // Create FSM with nondeterministic transitions
  const invalidFsm = {
    ...DIALOG_FSM_RECIPE,
    id: 'invalid-fsm',
    transitions: [
      ...DIALOG_FSM_RECIPE.transitions,
      {
        id: 'duplicate-transition',
        from: 'open',
        to: 'closed',
        event: 'confirm', // Same from+event as existing transition
      },
    ],
  };

  const invalidInput = {
    schemaVersion: 1 as const,
    rhythmProfiles: [DEFAULT_RHYTHM_PROFILE],
    fsmRecipes: [invalidFsm],
  };

  const { registry, diagnostics } = compileSemantics(invalidInput);

  // Should have nondeterministic transition error
  const errors = diagnostics.filter(d => d.severity === 'error');
  assert(errors.length > 0);
  assert(errors.some(e => e.code === 'NONDETERMINISTIC_TRANSITION'));
});

test('semantics store fails closed on record, alias, and revision tampering', () => {
  const testDir = join(__dirname, '../tmp/semantics-tamper-test');
  rmSync(testDir, { recursive: true, force: true });
  mkdirSync(testDir, { recursive: true });
  try {
    const { registry } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
    const expectCode = (value: unknown, code: string) => {
      writeFileSync(join(testDir, 'semantics.snapshot.json'), canonicalJson(value));
      assert.throws(
        () => createSemanticsStore(testDir).getRegistry(),
        (error: unknown) => error instanceof Error && 'code' in error && error.code === code,
      );
    };

    const profileRef = registry.aliases.default!;
    const movedProfile = structuredClone(registry);
    movedProfile.rhythmProfiles['f'.repeat(64)] = movedProfile.rhythmProfiles[profileRef]!;
    delete movedProfile.rhythmProfiles[profileRef];
    movedProfile.aliases.default = 'f'.repeat(64);
    expectCode(movedProfile, 'RECORD_REF_MISMATCH');

    const missingAlias = structuredClone(registry);
    missingAlias.aliases.default = 'f'.repeat(64);
    expectCode(missingAlias, 'ALIAS_REF_INVALID');

    const wrongIdentity = structuredClone(registry);
    wrongIdentity.aliases.dialog = profileRef;
    expectCode(wrongIdentity, 'ALIAS_ID_MISMATCH');

    const wrongRevision = structuredClone(registry);
    wrongRevision.revision = 'f'.repeat(64);
    expectCode(wrongRevision, 'REVISION_MISMATCH');
  } finally {
    rmSync(testDir, { recursive: true, force: true });
  }
});

test('FSM schema rejects duplicate identities and invalid graph references', () => {
  const cases = [
    { ...DIALOG_FSM_RECIPE, states: [...DIALOG_FSM_RECIPE.states, DIALOG_FSM_RECIPE.states[0]!] },
    { ...DIALOG_FSM_RECIPE, events: [...DIALOG_FSM_RECIPE.events, DIALOG_FSM_RECIPE.events[0]!] },
    { ...DIALOG_FSM_RECIPE, transitions: [...DIALOG_FSM_RECIPE.transitions, DIALOG_FSM_RECIPE.transitions[0]!] },
    { ...DIALOG_FSM_RECIPE, states: DIALOG_FSM_RECIPE.states.map(state => ({ ...state, initial: true })) },
    {
      ...DIALOG_FSM_RECIPE,
      transitions: DIALOG_FSM_RECIPE.transitions.map((transition, index) =>
        index === 0 ? { ...transition, to: 'missing-state' } : transition),
    },
    {
      ...DIALOG_FSM_RECIPE,
      states: [...DIALOG_FSM_RECIPE.states, { id: 'orphan', description: 'Unreachable state' }],
    },
  ];
  for (const candidate of cases) {
    assert.equal(authoringFsmRecipeSchema.safeParse(candidate).success, false);
  }
});

test('FSM terminal states cannot transition and actions remain finite metadata', () => {
  const terminalSource = {
    ...DIALOG_FSM_RECIPE,
    states: DIALOG_FSM_RECIPE.states.map(state => state.id === 'open' ? { ...state, terminal: true } : state),
  };
  assert.equal(authoringFsmRecipeSchema.safeParse(terminalSource).success, false);
  assert.equal(
    authoringFsmRecipeSchema.safeParse({
      ...DIALOG_FSM_RECIPE,
      actions: [{ id: 'run-code', description: 'Invalid executable action', execute: 'alert(1)' }],
    }).success,
    false,
  );
  assert.equal(
    authoringFsmRecipeSchema.safeParse({
      ...DIALOG_FSM_RECIPE,
      actions: [{ id: 'nested', description: 'Invalid nested metadata', metadata: { payload: { code: 'x' } } }],
    }).success,
    false,
  );
});

test('content refs are deterministic and collision-resistant', () => {
  const testValues = [
    { a: 1, b: 2 },
    { b: 2, a: 1 }, // Same content, different key order
    { a: 1, b: 3 }, // Different content
    'test string',
    ['array', 'values'],
    null,
    42,
    true,
  ];

  // Same content should produce same refs
  assert.strictEqual(contentRef(testValues[0]), contentRef(testValues[1]));

  // Different content should produce different refs
  assert.notStrictEqual(contentRef(testValues[0]), contentRef(testValues[2]));

  // All refs should be 64-character hex
  for (const value of testValues) {
    const ref = contentRef(value);
    assert.strictEqual(ref.length, 64);
    assert(/^[a-f0-9]{64}$/.test(ref));
  }
});

test('semantic rhythm text generation preserves core guidance', () => {
  const { registry } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
  const profileRef = registry.aliases['default'];
  const profile = registry.rhythmProfiles[profileRef!];

  assert(profile, 'Default rhythm profile should be defined');

  // Should contain core composition guidance
  assert(profile.rhythmText.includes('# Basecoat composition guide'));
  assert(profile.rhythmText.includes('Content Hierarchy -> Layout -> Component Selection'));
  assert(profile.rhythmText.includes('## Hard prohibitions'));
  assert(profile.rhythmText.includes('cards inside cards'));
  assert(profile.rhythmText.includes('## Component families'));

  // Should include spacing guidance derived from semantic tokens
  assert(profile.rhythmText.includes('semantic spacing'));
  assert(profile.rhythmText.includes('gap-rhythm-sm -> gap-2'));
  assert(profile.rhythmText.includes('text-heading-1 -> text-3xl'));
  assert(profile.rhythmText.includes('gap-2'));
  assert(profile.rhythmText.includes('gap-4'));

  // Should be reasonable length (not too short or too long)
  assert(profile.rhythmText.length > 2000);
  assert(profile.rhythmText.length < 10000);
});