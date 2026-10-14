// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test, { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { MAX_DETAIL_BYTES, responseBytes } from '../src/tools/budget.js';
import { runComponentSyntax } from '../src/tools/component-syntax.js';
import { auditMarkup, runRulesEnforcer } from '../src/tools/rules-enforcer.js';
import { validateComposition } from '../src/tools/validate.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const componentsRegistryRaw = readFileSync(join(root, 'src', 'registry', 'components.json'), 'utf-8');
const componentsRegistry = JSON.parse(componentsRegistryRaw);
const catalogRaw = readFileSync(join(root, 'src', 'data', 'catalog', 'components-catalog.json'), 'utf-8');
const componentsCatalog = JSON.parse(catalogRaw);

describe('Stage 3: Field and FieldGroup Primitives, Catalog, and Rules Enforcer', () => {
  describe('1. Registry and Catalog Registration', () => {
    it('registers field and field-group in src/registry/components.json', () => {
      const indexIds = componentsRegistry.index.map((c: { id: string }) => c.id);
      assert(indexIds.includes('field'), 'field must be present in registry index');
      assert(indexIds.includes('field-group'), 'field-group must be present in registry index');

      // Verify alphabetical order preserved in index
      const emptyIdx = indexIds.indexOf('empty');
      const fieldIdx = indexIds.indexOf('field');
      const fieldGroupIdx = indexIds.indexOf('field-group');
      const formIdx = indexIds.indexOf('form');
      assert(emptyIdx < fieldIdx, 'empty must precede field');
      assert(fieldIdx < fieldGroupIdx, 'field must precede field-group');
      assert(fieldGroupIdx < formIdx, 'field-group must precede form');

      assert('field' in componentsRegistry.details, 'field must be present in registry details');
      assert('field-group' in componentsRegistry.details, 'field-group must be present in registry details');

      const fieldDetail = componentsRegistry.details['field'];
      assert(fieldDetail.markup_template.includes('class="field'));
      assert(fieldDetail.composition_rules.length > 0);

      const fieldGroupDetail = componentsRegistry.details['field-group'];
      assert(fieldGroupDetail.markup_template.includes('class="field-group'));
      assert(fieldGroupDetail.composition_rules.length > 0);

      const cssClasses: string[] = componentsRegistry.upstream.css_classes;
      for (const cls of ['field', 'field-group', 'field-label', 'field-description', 'field-error', 'field-legend']) {
        assert(cssClasses.includes(cls), `upstream.css_classes must include ${cls}`);
      }
    });

    it('registers field and field-group in src/data/catalog/components-catalog.json with orientations and errorState', () => {
      const fieldEntry = componentsCatalog.components.find((c: { id: string }) => c.id === 'field');
      assert(fieldEntry, 'field must be present in components catalog');
      assert.deepEqual(fieldEntry.orientations, ['vertical', 'horizontal', 'inline']);
      assert.equal(fieldEntry.defaultOrientation, 'vertical');
      assert.equal(fieldEntry.errorState.supported, true);
      assert.equal(fieldEntry.errorState.errorElement, 'FieldError');
      assert.equal(fieldEntry.errorState.containerAttribute, 'data-invalid="true"');
      assert.equal(fieldEntry.errorState.controlAttribute, 'aria-invalid="true"');

      const fieldGroupEntry = componentsCatalog.components.find((c: { id: string }) => c.id === 'field-group');
      assert(fieldGroupEntry, 'field-group must be present in components catalog');
      assert.deepEqual(fieldGroupEntry.orientations, ['vertical', 'horizontal', 'inline']);
      assert.equal(fieldGroupEntry.defaultOrientation, 'vertical');
      assert.equal(fieldGroupEntry.errorState.supported, true);
    });
  });

  describe('2. Semantic Anatomy & Composition Validation', () => {
    it('validates canonical FieldGroup -> FieldSet -> FieldLegend -> Field -> FieldLabel -> Control -> FieldDescription -> FieldError hierarchy', () => {
      const canonicalMarkup = `<div role="group" class="field-group flex flex-col gap-6" data-orientation="vertical">
  <fieldset class="fieldset space-y-4">
    <legend class="field-legend text-sm font-medium leading-none">Account Settings</legend>
    <div class="field grid gap-2" data-orientation="vertical" data-invalid="true">
      <label class="label text-sm font-medium" for="username">Username</label>
      <input class="input" id="username" type="text" placeholder="Enter username" aria-describedby="username-desc username-err" aria-invalid="true">
      <p id="username-desc" class="field-description text-sm text-muted-foreground">Your unique profile name.</p>
      <p id="username-err" class="field-error text-sm font-medium text-destructive" role="alert">Username already taken.</p>
    </div>
  </fieldset>
</div>`;

      const compResult = validateComposition(canonicalMarkup);
      assert.equal(compResult.valid, true, `Composition issues: ${JSON.stringify(compResult.issues)}`);
      const errors = compResult.issues.filter(i => i.severity === 'error');
      assert.equal(errors.length, 0, `Composition errors: ${JSON.stringify(errors)}`);

      const auditResult = auditMarkup(canonicalMarkup);
      assert.equal(auditResult.length, 0, `Audit violations: ${JSON.stringify(auditResult)}`);
    });
  });

  describe('3. runComponentSyntax Orientations & Error State Synthesis', () => {
    it('synthesizes vertical, horizontal, and inline orientations for field within byte budget', () => {
      // Default (vertical)
      const vertDefault = runComponentSyntax({ id: 'field' });
      assert.equal(vertDefault.stage, '3-component-syntax');
      assert(vertDefault.markup.includes('data-orientation="vertical"'));
      assert(vertDefault.markup.includes('class="field'));
      assert(vertDefault.markup.includes('<label'));
      assert(vertDefault.markup.includes('<input'));
      assert(vertDefault.markup.includes('class="field-description'));
      assert(responseBytes(vertDefault) <= MAX_DETAIL_BYTES, 'Default field syntax exceeds budget');

      // Explicit horizontal
      const horiz = runComponentSyntax({ id: 'field', orientation: 'horizontal' });
      assert(horiz.markup.includes('data-orientation="horizontal"'));
      assert(horiz.markup.includes('grid-cols-2'));
      assert(responseBytes(horiz) <= MAX_DETAIL_BYTES, 'Horizontal field syntax exceeds budget');

      // Explicit inline
      const inlineField = runComponentSyntax({ id: 'field', orientation: 'inline' });
      assert(inlineField.markup.includes('data-orientation="inline"'));
      assert(inlineField.markup.includes('type="checkbox"'));
      assert(responseBytes(inlineField) <= MAX_DETAIL_BYTES, 'Inline field syntax exceeds budget');
    });

    it('synthesizes invalid error state with dual data-invalid and aria-invalid attributes', () => {
      const invalidField = runComponentSyntax({ id: 'field', state: 'invalid' });
      assert(invalidField.markup.includes('data-invalid="true"'));
      assert(invalidField.markup.includes('aria-invalid="true"'));
      assert(invalidField.markup.includes('class="field-error'));
      assert(invalidField.markup.includes('role="alert"'));
      assert(invalidField.markup.includes('aria-describedby="username-description username-error"'));
      assert(responseBytes(invalidField) <= MAX_DETAIL_BYTES, 'Invalid field syntax exceeds budget');
    });

    it('synthesizes field-group variants and orientations within byte budget', () => {
      // Default field-group
      const fgDefault = runComponentSyntax({ id: 'field-group' });
      assert(fgDefault.markup.includes('class="field-group'));
      assert(fgDefault.markup.includes('<fieldset'));
      assert(fgDefault.markup.includes('<legend'));
      assert(fgDefault.markup.includes('data-orientation="vertical"'));
      assert(responseBytes(fgDefault) <= MAX_DETAIL_BYTES, 'Default field-group syntax exceeds budget');

      // Horizontal field-group
      const fgHoriz = runComponentSyntax({ id: 'field-group', orientation: 'horizontal' });
      assert(fgHoriz.markup.includes('data-orientation="horizontal"'));
      assert(responseBytes(fgHoriz) <= MAX_DETAIL_BYTES, 'Horizontal field-group syntax exceeds budget');

      // Inline field-group
      const fgInline = runComponentSyntax({ id: 'field-group', orientation: 'inline' });
      assert(fgInline.markup.includes('data-orientation="inline"'));
      assert(responseBytes(fgInline) <= MAX_DETAIL_BYTES, 'Inline field-group syntax exceeds budget');

      // Invalid field-group
      const fgInvalid = runComponentSyntax({ id: 'field-group', state: 'invalid' });
      assert(fgInvalid.markup.includes('data-invalid="true"'));
      assert(fgInvalid.markup.includes('aria-invalid="true"'));
      assert(fgInvalid.markup.includes('class="field-error'));
      assert(responseBytes(fgInvalid) <= MAX_DETAIL_BYTES, 'Invalid field-group syntax exceeds budget');
    });

    it('accepts componentId, name, and component aliases interchangeably', () => {
      const byId = runComponentSyntax({ id: 'field' });
      const byCompId = runComponentSyntax({ componentId: 'field' });
      const byName = runComponentSyntax({ name: 'field' });
      const byComponent = runComponentSyntax({ component: 'field' });

      assert.equal(byId.id, 'field');
      assert.equal(byCompId.id, 'field');
      assert.equal(byName.id, 'field');
      assert.equal(byComponent.id, 'field');
    });
  });

  describe('4. runRulesEnforcer & auditMarkup Form Constraints', () => {
    it('flags FRM-02 when form controls are orphaned without enclosing .field, .field-group, or fieldset', () => {
      const orphanedInput = '<div><input type="text" name="orphan"></div>';
      const violations = auditMarkup(orphanedInput);
      assert(violations.some(v => v.rule === 'FRM-02'), 'Must flag FRM-02 for orphaned input');
      assert(violations.some(v => v.message.includes('Orphaned <input> control')));

      const orphanedSelect = '<div><select><option>Option 1</option></select></div>';
      const selectViolations = auditMarkup(orphanedSelect);
      assert(selectViolations.some(v => v.rule === 'FRM-02'), 'Must flag FRM-02 for orphaned select');

      const orphanedTextarea = '<div><textarea></textarea></div>';
      const textareaViolations = auditMarkup(orphanedTextarea);
      assert(textareaViolations.some(v => v.rule === 'FRM-02'), 'Must flag FRM-02 for orphaned textarea');
    });

    it('flags FRM-03 for missing or mismatched label for attribute matching control id', () => {
      const mismatchedLabel = `<div class="field">
  <label for="wrong-id">Name</label>
  <input id="correct-id" type="text">
</div>`;
      const violations = auditMarkup(mismatchedLabel);
      assert(violations.some(v => v.rule === 'FRM-03'), 'Must flag FRM-03 for mismatched label for');
      assert(violations.some(v => v.message.includes('Missing or mismatched <label for="...">')));
    });

    it('flags FRM-03 when field-description or field-error is not referenced in aria-describedby', () => {
      const missingDescribedBy = `<div class="field">
  <label for="user">User</label>
  <input id="user" type="text">
  <p id="user-desc" class="field-description">Helper text</p>
</div>`;
      const violations = auditMarkup(missingDescribedBy);
      assert(violations.some(v => v.rule === 'FRM-03'), 'Must flag FRM-03 when description ID is omitted from aria-describedby');
    });

    it('flags FRM-04 when multiple radio or checkbox controls are outside a <fieldset> with <legend>', () => {
      const ungroupedRadios = `<div>
  <label><input type="radio" name="opt" value="1"> Option 1</label>
  <label><input type="radio" name="opt" value="2"> Option 2</label>
</div>`;
      const radioViolations = auditMarkup(ungroupedRadios);
      assert(radioViolations.some(v => v.rule === 'FRM-04'), 'Must flag FRM-04 for ungrouped multiple radio inputs');

      const ungroupedCheckboxes = `<div>
  <label><input type="checkbox" name="box1"> Box 1</label>
  <label><input type="checkbox" name="box2"> Box 2</label>
</div>`;
      const checkboxViolations = auditMarkup(ungroupedCheckboxes);
      assert(checkboxViolations.some(v => v.rule === 'FRM-04'), 'Must flag FRM-04 for ungrouped multiple checkboxes');

      // Grouped radios in fieldset with legend should NOT flag FRM-04
      const groupedRadios = `<fieldset class="fieldset">
  <legend class="field-legend">Options</legend>
  <div class="field"><label><input type="radio" name="opt" value="1"> 1</label></div>
  <div class="field"><label><input type="radio" name="opt" value="2"> 2</label></div>
</fieldset>`;
      const validViolations = auditMarkup(groupedRadios);
      assert(!validViolations.some(v => v.rule === 'FRM-04'), 'Must not flag FRM-04 when inside fieldset with legend');
    });

    it('runs runRulesEnforcer with category and query filters under byte budget', () => {
      const queryResult = runRulesEnforcer({ query: 'field' });
      assert(queryResult.rules.length > 0);
      assert(responseBytes(queryResult) <= MAX_DETAIL_BYTES, 'Query rules enforcer exceeds budget');

      const semanticResult = runRulesEnforcer({ category: 'semantic-html' });
      assert(semanticResult.rules.length > 0);
      assert(responseBytes(semanticResult) <= MAX_DETAIL_BYTES, 'Semantic-html rules enforcer exceeds budget');

      const auditRun = runRulesEnforcer({
        code: '<div class="field"><label for="foo">Foo</label><input id="foo" type="text" aria-describedby="foo-d"><p id="foo-d" class="field-description">D</p></div>',
      });
      assert.equal(auditRun.valid, true);
      assert.equal(auditRun.violations?.length ?? 0, 0);
      assert(responseBytes(auditRun) <= MAX_DETAIL_BYTES, 'Audit run rules enforcer exceeds budget');
    });
  });
});
