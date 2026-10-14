// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Stage 5.3: shadcn/evals Benchmarks Adapted to Basecoat HTML
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { runRulesEnforcer } from '../src/tools/rules-enforcer.js';
import { runComponentSyntax } from '../src/tools/component-syntax.js';
import { runQualityInspector } from '../src/tools/quality-inspector.js';
import { validateComposition } from '../src/tools/validate.js';
import { MAX_DETAIL_BYTES, responseBytes } from '../src/tools/budget.js';

describe('Stage 5.3: shadcn/evals Benchmarks Adapted to Basecoat HTML', () => {
  describe('Scenario 1: Form Settings (FieldGroup + Field + FieldLabel, Switch, dual invalid contract, spacing)', () => {
    it('runRulesEnforcer surfaces field-group-hierarchy, no-space-xy, and semantic-color-tokens', () => {
      const fieldGroupRule = runRulesEnforcer({ query: 'field-group-hierarchy' });
      assert(
        fieldGroupRule.rules.some(r => r.id === 'field-group-hierarchy'),
        'field-group-hierarchy rule must be surfaced',
      );
      const fg = fieldGroupRule.rules.find(r => r.id === 'field-group-hierarchy')!;
      assert.equal(fg.category, 'dashboard-patterns');
      assert(fg.required.some(req => req.includes('data-component="field"')));
      assert(fg.forbidden.some(forb => forb.includes('space-y-*')));

      const spaceRule = runRulesEnforcer({ query: 'no-space-xy' });
      assert(
        spaceRule.rules.some(r => r.id === 'no-space-xy'),
        'no-space-xy rule must be surfaced',
      );
      const sp = spaceRule.rules.find(r => r.id === 'no-space-xy')!;
      assert.equal(sp.category, 'tailwind-v4');
      assert(sp.forbidden.some(forb => forb.includes('space-x-*')));
      assert(sp.forbidden.some(forb => forb.includes('space-y-*')));
      assert(sp.required.some(req => req.includes('flex gap-*')));

      const colorRule = runRulesEnforcer({ query: 'semantic-color-tokens' });
      assert(
        colorRule.rules.some(r => r.id === 'semantic-color-tokens'),
        'semantic-color-tokens rule must be surfaced',
      );
      const col = colorRule.rules.find(r => r.id === 'semantic-color-tokens')!;
      assert.equal(col.category, 'tokens');
      assert(col.forbidden.some(forb => forb.includes('bg-blue-500')));
      assert(col.required.some(req => req.includes('bg-primary')));
    });

    it('runComponentSyntax with state: "invalid" generates dual data-invalid and aria-invalid attributes', () => {
      const inputSyntax = runComponentSyntax({ component: 'input', state: 'invalid' });
      assert.equal(inputSyntax.state, 'invalid');
      assert(
        inputSyntax.markup.includes('data-invalid="true"'),
        'Input markup must have data-invalid="true" attribute',
      );
      assert(
        inputSyntax.markup.includes('aria-invalid="true"'),
        'Input control must have aria-invalid="true" attribute',
      );
      assert(responseBytes(inputSyntax) <= MAX_DETAIL_BYTES, 'inputSyntax must respect byte budget');

      const fieldSyntax = runComponentSyntax({ component: 'field', state: 'invalid' });
      assert.equal(fieldSyntax.state, 'invalid');
      assert(
        fieldSyntax.markup.includes('data-invalid="true"'),
        'Field markup must have data-invalid="true" on container',
      );
      assert(
        fieldSyntax.markup.includes('aria-invalid="true"'),
        'Field inner input/textarea must have aria-invalid="true"',
      );
      assert(responseBytes(fieldSyntax) <= MAX_DETAIL_BYTES, 'fieldSyntax must respect byte budget');

      const switchSyntax = runComponentSyntax({ component: 'switch', state: 'default' });
      assert(switchSyntax.markup.includes('role="switch"'), 'Switch must declare role="switch"');
      assert(switchSyntax.markup.includes('class="input"'), 'Switch must use Basecoat class="input"');
      assert(switchSyntax.markup.includes('class="field"'), 'Switch must be wrapped in a field');
    });

    it('runQualityInspector flags space-y-4 and unmirrored data-invalid, and gives 100/A to compliant FieldGroup forms', () => {
      const nonCompliantForm = [
        '<form class="space-y-4">',
        '  <div class="field" data-invalid="true">',
        '    <label class="label" for="username">Username</label>',
        '    <input class="input" id="username" type="text" />',
        '  </div>',
        '</form>',
      ].join('\n');

      const badReport = runQualityInspector(nonCompliantForm, { enforceFsm: true });
      assert.equal(badReport.valid, false, 'Non-compliant form must fail validation');
      assert(
        badReport.syntaxViolations.some(v => v.rule === 'no-space-xy'),
        'Must flag no-space-xy violation for space-y-4',
      );
      assert(
        badReport.accessibilityOmissions.some(o => o.rule === 'dual-invalid-contract'),
        'Must flag dual-invalid-contract omission when aria-invalid="true" is missing',
      );
      assert(
        badReport.autoFixSuggestions.some(f => f.rule === 'no-space-xy'),
        'Must provide auto-fix for no-space-xy suggesting flex flex-col gap-*',
      );

      const compliantForm = [
        '<form class="flex flex-col gap-4">',
        '  <fieldset class="flex flex-col gap-4" data-component="field-group">',
        '    <legend class="text-sm font-semibold text-foreground">Account Settings</legend>',
        '    <div class="field" data-component="field">',
        '      <label class="label" for="username">Username</label>',
        '      <input class="input" id="username" type="text" />',
        '    </div>',
        '    <div class="field" data-component="field" data-invalid="true">',
        '      <label class="label" for="email">Email</label>',
        '      <input class="input" id="email" type="email" aria-invalid="true" />',
        '    </div>',
        '    <div role="group" class="field flex items-center gap-2" data-orientation="horizontal">',
        '      <input type="checkbox" id="notifications" role="switch" class="input" />',
        '      <label class="label" for="notifications">Enable notifications</label>',
        '    </div>',
        '  </fieldset>',
        '</form>',
      ].join('\n');

      const goodReport = runQualityInspector(compliantForm, { enforceFsm: true });
      assert.equal(goodReport.valid, true, 'Compliant form must pass validation');
      assert.equal(goodReport.score, 100, 'Compliant form must score 100');
      assert.equal(goodReport.grade, 'A', 'Compliant form must receive an A grade');
      assert.equal(goodReport.summary.errors, 0);
      assert.equal(goodReport.summary.warnings, 0);
    });
  });

  describe('Scenario 2: Profile Dialog (DialogTitle / aria-labelledby, Avatar + fallback, data-icon without size-4)', () => {
    it('runRulesEnforcer surfaces dialog-accessible-title and icon-data-attribute-no-size', () => {
      const dialogRule = runRulesEnforcer({ query: 'dialog-accessible-title' });
      assert(
        dialogRule.rules.some(r => r.id === 'dialog-accessible-title'),
        'dialog-accessible-title rule must be surfaced',
      );
      const dlg = dialogRule.rules.find(r => r.id === 'dialog-accessible-title')!;
      assert.equal(dlg.category, 'fsm-contracts');
      assert(dlg.forbidden.some(forb => forb.includes('without aria-labelledby')));
      assert(dlg.required.some(req => req.includes('aria-labelledby="dlg-title"')));

      const iconRule = runRulesEnforcer({ query: 'icon-data-attribute-no-size' });
      assert(
        iconRule.rules.some(r => r.id === 'icon-data-attribute-no-size'),
        'icon-data-attribute-no-size rule must be surfaced',
      );
      const ic = iconRule.rules.find(r => r.id === 'icon-data-attribute-no-size')!;
      assert.equal(ic.category, 'semantic-html');
      assert(ic.forbidden.some(forb => forb.includes('data-icon="inline-start"')));
      assert(ic.forbidden.some(forb => forb.includes('size-4')));
      assert(ic.required.some(req => req.includes('data-icon="inline-start"')));
    });

    it('runComponentSyntax outputs data-icon="inline-start" without size-4 and Avatar with fallback', () => {
      const btnSyntax = runComponentSyntax({ component: 'button', icon: 'plus' });
      assert(btnSyntax.iconSvg, 'Button must output iconSvg property');
      assert(
        btnSyntax.iconSvg.includes('data-icon="inline-start"'),
        'Action icon must declare data-icon="inline-start"',
      );
      assert(
        !btnSyntax.iconSvg.includes('size-4'),
        'Action icon must NOT contain redundant size-4 class',
      );
      assert(
        !btnSyntax.iconSvg.includes('w-4') && !btnSyntax.iconSvg.includes('h-4'),
        'Action icon must NOT contain w-4 h-4 classes',
      );

      const avatarSyntax = runComponentSyntax({ component: 'avatar' });
      assert.equal(avatarSyntax.id, 'avatar');
      assert(avatarSyntax.markup.includes('class="avatar"'));
      assert(avatarSyntax.markup.includes('<img'));
      assert(avatarSyntax.markup.includes('alt='));
      assert(avatarSyntax.markup.includes('<span>CN</span>'), 'Avatar must include fallback span initials');
    });

    it('runQualityInspector flags <svg data-icon="inline-start" class="size-4"> and provides auto-fix', () => {
      const manualSizingMarkup = '<button class="btn"><svg data-icon="inline-start" class="size-4" viewBox="0 0 24 24"></svg>Save</button>';
      const report = runQualityInspector(manualSizingMarkup);
      assert(
        report.syntaxViolations.some(v => v.rule === 'icon-data-attribute-no-size'),
        'Must flag icon-data-attribute-no-size violation when size-4 is present on data-icon',
      );
      assert(
        report.autoFixSuggestions.some(f => f.rule === 'icon-data-attribute-no-size'),
        'Must provide auto-fix suggesting removal of manual size-4 on [data-icon]',
      );
    });

    it('validateComposition and runQualityInspector flag missing accessible controls and pass fully titled dialog', () => {
      const unaccessibleDialog = '<dialog class="dialog" data-state="open"><p>Edit your profile details.</p></dialog>';
      const validateResult = validateComposition(unaccessibleDialog);
      assert(
        validateResult.issues.some(i => i.rule === 'a11y-dialog-focus-trap'),
        'validateComposition must flag a11y-dialog-focus-trap for missing focusable control/heading',
      );

      const inspectorResult = runQualityInspector(unaccessibleDialog, { enforceFsm: true });
      assert(
        inspectorResult.accessibilityOmissions.some(o => o.rule === 'a11y-dialog-focus-trap'),
        'runQualityInspector must flag a11y-dialog-focus-trap in accessibility omissions',
      );

      const accessibleProfileDialog = [
        '<dialog id="profile-dialog" class="dialog" data-state="open" data-fsm-recipe="dialog" data-fsm-state="open" aria-labelledby="profile-title">',
        '  <div class="flex flex-col gap-4 p-6">',
        '    <header class="flex items-center justify-between">',
        '      <h2 id="profile-title" class="text-lg font-semibold text-foreground">Edit Profile</h2>',
        '      <span class="avatar" data-state="default"><img src="/avatar.jpg" alt="User" /><span>JD</span></span>',
        '    </header>',
        '    <div class="flex items-center justify-end gap-2">',
        '      <button type="button" class="btn" data-variant="outline">Cancel</button>',
        '      <button type="submit" class="btn" data-variant="primary">Save Changes</button>',
        '    </div>',
        '  </div>',
        '</dialog>',
      ].join('\n');

      const compliantInspector = runQualityInspector(accessibleProfileDialog, { enforceFsm: true });
      assert.equal(compliantInspector.valid, true, 'Accessible dialog must pass validation');
      assert.equal(compliantInspector.score, 100, 'Accessible dialog must score 100');
      assert.equal(compliantInspector.grade, 'A', 'Accessible dialog must receive an A grade');
      assert.equal(compliantInspector.summary.errors, 0);
      assert.equal(compliantInspector.summary.warnings, 0);
    });
  });

  describe('Scenario 3: Stats Dashboard (Card without .border, Skeleton, Badge, Empty state, semantic tokens)', () => {
    it('runRulesEnforcer surfaces enforce-size-shorthand, empty-and-skeleton-primitives, and no-manual-dark', () => {
      const sizeRule = runRulesEnforcer({ query: 'enforce-size-shorthand' });
      assert(
        sizeRule.rules.some(r => r.id === 'enforce-size-shorthand'),
        'enforce-size-shorthand rule must be surfaced',
      );
      const sz = sizeRule.rules.find(r => r.id === 'enforce-size-shorthand')!;
      assert.equal(sz.category, 'tailwind-v4');
      assert(sz.forbidden.some(forb => forb.includes('w-4 h-4')));
      assert(sz.required.some(req => req.includes('size-4')));

      const emptyRule = runRulesEnforcer({ query: 'empty-and-skeleton-primitives' });
      assert(
        emptyRule.rules.some(r => r.id === 'empty-and-skeleton-primitives'),
        'empty-and-skeleton-primitives rule must be surfaced',
      );
      const em = emptyRule.rules.find(r => r.id === 'empty-and-skeleton-primitives')!;
      assert.equal(em.category, 'dashboard-patterns');
      assert(em.forbidden.some(forb => forb.includes('animate-pulse')));
      assert(em.required.some(req => req.includes('skeleton')));

      const darkRule = runRulesEnforcer({ query: 'no-manual-dark' });
      assert(
        darkRule.rules.some(r => r.id === 'no-manual-dark'),
        'no-manual-dark rule must be surfaced',
      );
      const dk = darkRule.rules.find(r => r.id === 'no-manual-dark')!;
      assert.equal(dk.category, 'tokens');
      assert(dk.forbidden.some(forb => forb.includes('dark:bg-slate-900')));
      assert(dk.required.some(req => req.includes('bg-background')));
    });

    it('runComponentSyntax generates canonical markup for card, skeleton, badge, empty, and spinner', () => {
      const cardRes = runComponentSyntax({ component: 'card' });
      assert.equal(cardRes.id, 'card');
      assert(cardRes.markup.includes('class="card"'), 'Card must have class="card"');
      assert(!cardRes.markup.includes('border'), 'Card must not have border utility');

      const skeletonRes = runComponentSyntax({ component: 'skeleton' });
      assert.equal(skeletonRes.id, 'skeleton');
      assert(/\bclass="[^"]*\bskeleton\b/.test(skeletonRes.markup), 'Skeleton markup must contain skeleton class');

      const badgeRes = runComponentSyntax({ component: 'badge' });
      assert.equal(badgeRes.id, 'badge');
      assert(badgeRes.markup.includes('class="badge"'));

      const emptyRes = runComponentSyntax({ component: 'empty' });
      assert.equal(emptyRes.id, 'empty');
      assert(emptyRes.markup.includes('class="empty"'));

      const spinnerRes = runComponentSyntax({ component: 'spinner' });
      assert.equal(spinnerRes.id, 'spinner');
      assert(spinnerRes.markup.includes('role="status"'));
    });

    it('validateComposition flags card-double-border and passes compliant stat cards', () => {
      const doubleBorderCard = '<article class="card border border-border p-6"><strong class="text-2xl font-semibold tabular-nums">$12,345</strong></article>';
      const failResult = validateComposition(doubleBorderCard);
      assert.equal(failResult.valid, false, 'Card with border utility must fail validation');
      assert(
        failResult.issues.some(i => i.rule === 'card-double-border'),
        'Must flag card-double-border error when border or border-border is added to .card',
      );

      const compliantStatsCard = [
        '<div class="grid grid-cols-1 md:grid-cols-3 gap-6">',
        '  <article class="card flex flex-col gap-2 p-6 bg-card text-card-foreground">',
        '    <header class="flex items-center justify-between">',
        '      <span class="text-sm font-medium text-muted-foreground">Total Revenue</span>',
        '      <span class="badge" data-variant="secondary">+12.5%</span>',
        '    </header>',
        '    <strong class="text-2xl font-semibold tracking-tight tabular-nums">$45,231.89</strong>',
        '  </article>',
        '</div>',
      ].join('\n');

      const passResult = validateComposition(compliantStatsCard);
      assert.equal(passResult.valid, true, 'Compliant stats card without border must pass');
      assert.equal(passResult.issues.length, 0);
    });
  });

  describe('Scenario 4: SelectGroup, DropdownMenuGroup, CommandGroup & InputGroup + InputGroupAddon composition', () => {
    it('runRulesEnforcer surfaces select-and-menu-groups and input-group-addon', () => {
      const selectRule = runRulesEnforcer({ query: 'select-and-menu-groups' });
      assert(
        selectRule.rules.some(r => r.id === 'select-and-menu-groups'),
        'select-and-menu-groups rule must be surfaced',
      );
      const smg = selectRule.rules.find(r => r.id === 'select-and-menu-groups')!;
      assert.equal(smg.category, 'semantic-html');
      assert(smg.required.some(req => req.includes('<optgroup label="...">')));
      assert(smg.required.some(req => req.includes('data-slot="select-group"')));

      const inputGroupRule = runRulesEnforcer({ query: 'input-group-addon' });
      assert(
        inputGroupRule.rules.some(r => r.id === 'input-group-addon'),
        'input-group-addon rule must be surfaced',
      );
      const iga = inputGroupRule.rules.find(r => r.id === 'input-group-addon')!;
      assert.equal(iga.category, 'dashboard-patterns');
      assert(iga.required.some(req => req.includes('data-slot="input-group-addon"')));
      assert(iga.forbidden.some(forb => forb.includes('Unstructured inline icons')));
    });

    it('runComponentSyntax generates canonical markup for select, dropdown-menu, command, and input-group', () => {
      const selectRes = runComponentSyntax({ component: 'select' });
      assert.equal(selectRes.id, 'select');
      assert(selectRes.markup.includes('class="select"'));
      assert(selectRes.markup.includes('data-fsm-recipe="collapsible-navigation"'));

      const dropdownRes = runComponentSyntax({ component: 'dropdown-menu' });
      assert.equal(dropdownRes.id, 'dropdown-menu');
      assert(dropdownRes.markup.includes('class="dropdown-menu"'));
      assert(dropdownRes.markup.includes('data-fsm-recipe="collapsible-navigation"'));

      const commandRes = runComponentSyntax({ component: 'command' });
      assert.equal(commandRes.id, 'command');
      assert(commandRes.markup.includes('class="command"'));
      assert(commandRes.markup.includes('data-fsm-recipe="dialog"'));

      const inputGroupRes = runComponentSyntax({ component: 'input-group' });
      assert.equal(inputGroupRes.id, 'input-group');
      assert(inputGroupRes.markup.includes('class="input-group"'));
      assert(inputGroupRes.markup.includes('data-align="start"'));
      assert(inputGroupRes.markup.includes('data-align="end"'));
    });
  });
});
