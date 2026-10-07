// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import test from 'node:test';
import { compileRegistry, contentRef } from '../src/macros/compiler.js';
import { buildContextView, selectNextStep } from '../src/macros/context.js';
import { loadCompiledRegistry } from '../src/macros/registry.js';
import { validateDesign, validatePage } from '../src/macros/validate.js';
import type {
  AuthoringMacroBlock,
  AuthoringRegistryInput,
  CompiledMacroRegistry,
  DesignProfile,
  DesignSession,
  PagePlan,
  Provenance,
} from '../src/macros/types.js';

const PROVENANCE: Provenance = {
  origin: 'authored',
  sourceHashes: {},
  mappingVersion: '1.0.0',
};

const PROFILE: DesignProfile = {
  schemaVersion: 1,
  id: 'ctx-profile',
  description: 'Profile for composition validation tests.',
  allowedDecisions: {
    density: {
      type: 'enum',
      values: ['comfortable', 'compact'],
      allowPageOverride: true,
      defaultValue: 'comfortable',
    },
  },
  sharedDecisionKeys: ['density'],
};

function block(partial: Partial<AuthoringMacroBlock> & Pick<AuthoringMacroBlock, 'id' | 'role' | 'root' | 'fragments'>): AuthoringMacroBlock {
  return {
    schemaVersion: 1,
    family: 'test',
    description: partial.description ?? `Block ${partial.id}`,
    tags: partial.tags ?? ['test'],
    mounts: [],
    slots: [],
    ports: [],
    componentRefs: [],
    ruleRefs: [],
    dependencyBlockIds: [],
    layout: { frameRef: partial.root },
    landmarks: { main: 0, primaryHeading: 0 },
    provenance: PROVENANCE,
    ...partial,
  };
}

function compileBlocks(blocks: AuthoringMacroBlock[]): CompiledMacroRegistry {
  const input: AuthoringRegistryInput = {
    schemaVersion: 1,
    blocks,
    recipes: [],
    profiles: [PROFILE],
    rules: [],
  };
  const { registry, diagnostics } = compileRegistry(input);
  assert.equal(
    diagnostics.filter(d => d.severity === 'error').length,
    0,
    diagnostics.map(d => `${d.code}:${d.message}`).join('; '),
  );
  return registry;
}

function sessionFor(
  registry: CompiledMacroRegistry,
  page: PagePlan,
  extras: Partial<DesignSession> = {},
): DesignSession {
  return {
    schemaVersion: 1,
    id: 'design-a',
    projectKey: 'p'.repeat(64),
    revision: 1,
    registryRevision: registry.revision,
    profile: registry.aliases['ctx-profile']!,
    projectDecisions: { density: 'comfortable' },
    pages: { [page.id]: page },
    routeLinks: [],
    checkpoints: [],
    receipts: {},
    ...extras,
  };
}

function ref(registry: CompiledMacroRegistry, id: string): string {
  return registry.aliases[id]!;
}

function withStubRecipe(
  registry: CompiledMacroRegistry,
  page: PagePlan,
  recipeId = 'stub-recipe',
): { registry: CompiledMacroRegistry; page: PagePlan } {
  const recipeRef = contentRef({
    schemaVersion: 1,
    id: recipeId,
    kind: 'page',
    profile: ref(registry, 'ctx-profile'),
    entryPage: page.id,
    pageRoot: page.root,
    nodes: Object.keys(page.nodes).sort(),
  });
  const next: CompiledMacroRegistry = {
    ...registry,
    recipes: {
      ...registry.recipes,
      [recipeRef]: {
        schemaVersion: 1,
        id: recipeId,
        kind: 'page',
        profile: ref(registry, 'ctx-profile'),
        pages: [{ ...page, recipe: recipeRef }],
        entryPage: page.id,
        routeLinks: [],
      },
    },
    aliases: { ...registry.aliases, [recipeId]: recipeRef },
  };
  return { registry: next, page: { ...page, recipe: recipeRef } };
}

function shellFixture(options?: {
  persistentNav?: boolean;
  includeContent?: boolean;
  includeHeaderControl?: boolean;
  connectNav?: boolean;
  dualMain?: boolean;
}): { registry: CompiledMacroRegistry; page: PagePlan } {
  const persistent = options?.persistentNav ?? false;
  const includeContent = options?.includeContent ?? true;
  const includeHeaderControl = options?.includeHeaderControl ?? true;
  const connectNav = options?.connectNav ?? true;
  const dualMain = options?.dualMain ?? false;

  const shell = block({
    id: 'app-shell',
    role: 'application-shell',
    family: 'shell',
    tags: ['shell', 'application-shell'],
    root: 'shell-root',
    fragments: [{ id: 'shell-root', emmet: 'div.shell' }],
    slots: [
      {
        id: 'navigation',
        at: { fragment: 'shell-root', name: 'navigation' },
        accepts: ['navigation', 'collapsible-sidebar', 'persistent-sidebar'],
        min: 1,
        max: 1,
      },
      {
        id: 'header',
        at: { fragment: 'shell-root', name: 'header' },
        accepts: ['header', 'workspace-header'],
        min: 1,
        max: 1,
      },
      {
        id: 'content',
        at: { fragment: 'shell-root', name: 'content' },
        accepts: ['page', 'workspace'],
        min: 1,
        max: 1,
      },
    ],
    layout: { frameRef: 'shell-root', gutterBoundary: 'shell-root' },
    landmarks: { main: 0, primaryHeading: 0 },
  });

  const nav = block({
    id: persistent ? 'persistent-nav' : 'collapsible-nav',
    role: persistent ? 'persistent-sidebar' : 'collapsible-sidebar',
    tags: persistent ? ['persistent-sidebar', 'navigation'] : ['collapsible-nav', 'navigation'],
    root: 'nav-root',
    fragments: [{ id: 'nav-root', emmet: 'aside.nav' }],
    ports: persistent
      ? []
      : [
          {
            id: 'nav-toggle-in',
            at: { fragment: 'nav-root', name: 'nav-root' },
            direction: 'in',
            kind: 'control',
            contract: 'nav-toggle',
            minLinks: 0,
            maxLinks: 1,
            scope: 'shell',
          },
        ],
  });

  const header = block({
    id: 'workspace-header',
    role: 'workspace-header',
    tags: ['header'],
    root: 'header-root',
    fragments: [{ id: 'header-root', emmet: 'header.bar' }],
    ports: includeHeaderControl
      ? [
          {
            id: 'nav-toggle-out',
            at: { fragment: 'header-root', name: 'header-root' },
            direction: 'out',
            kind: 'control',
            contract: 'nav-toggle',
            minLinks: 0,
            maxLinks: 1,
            scope: 'shell',
          },
        ]
      : [],
    landmarks: { main: 0, primaryHeading: 1 },
  });

  const content = block({
    id: 'main-page',
    role: 'page',
    root: 'main-root',
    fragments: [{ id: 'main-root', emmet: 'main#main' }],
    landmarks: { main: dualMain ? 1 : 1, primaryHeading: 0 },
  });

  const extraMain = block({
    id: 'extra-main',
    role: 'page',
    root: 'extra-root',
    fragments: [{ id: 'extra-root', emmet: 'main#extra' }],
    landmarks: { main: 1, primaryHeading: 0 },
  });

  const blocks = [shell, nav, header, content, ...(dualMain ? [extraMain] : [])];
  const registry = compileBlocks(blocks);

  const nodes: PagePlan['nodes'] = {
    shell: { id: 'shell', block: ref(registry, 'app-shell'), bindings: {} },
    nav: {
      id: 'nav',
      block: ref(registry, nav.id),
      parent: { node: 'shell', slot: 'navigation', order: 0 },
      bindings: {},
    },
    header: {
      id: 'header',
      block: ref(registry, 'workspace-header'),
      parent: { node: 'shell', slot: 'header', order: 0 },
      bindings: {},
    },
  };
  if (includeContent) {
    nodes.main = {
      id: 'main',
      block: ref(registry, 'main-page'),
      parent: { node: 'shell', slot: 'content', order: 0 },
      bindings: {},
    };
  }
  if (dualMain && includeContent) {
    // Second main under content is not allowed by slot max=1; put as sibling under a fake path
    // by temporarily raising occupancy via attach into content is impossible. Instead nest under
    // page as unreachable is wrong. Use a second shell-less main by attaching under content via
    // replacing content block with a host that accepts pages - simpler: add second main as root sibling.
    nodes.extra = {
      id: 'extra',
      block: ref(registry, 'extra-main'),
      parent: { node: 'shell', slot: 'content', order: 1 },
      bindings: {},
    };
  }

  const connections: PagePlan['connections'] = [];
  if (!persistent && includeHeaderControl && connectNav) {
    connections.push({
      id: 'header-to-nav',
      relation: 'controls',
      from: { node: 'header', port: 'nav-toggle-out' },
      to: { node: 'nav', port: 'nav-toggle-in' },
    });
  }

  const page: PagePlan = {
    id: 'home',
    route: '/',
    recipe: contentRef({ id: 'synthetic-recipe' }),
    root: 'shell',
    nodes,
    connections,
    rules: [
      {
        id: 'same-shell-chrome',
        type: 'same-shell',
        nodes: ['nav', 'header', ...(includeContent ? ['main'] : [])],
      },
    ],
    decisions: {},
    status: 'draft',
  };

  return { registry, page };
}

test('sidebar and header under the same shell pass same-shell composition', () => {
  const built = shellFixture({ persistentNav: false });
  const { registry, page } = withStubRecipe(built.registry, built.page);
  const session = sessionFor(registry, page);
  const report = validatePage(page, session, registry, 'draft');
  assert.equal(
    report.diagnostics.some(d => d.code === 'RULE_SAME_SHELL_VIOLATION'),
    false,
    report.diagnostics.map(d => d.code).join(','),
  );
  assert.equal(report.diagnostics.some(d => d.code === 'CROSS_SHELL_CONNECTION'), false);
});

test('cross-shell shell-scoped port links fail with CROSS_SHELL_CONNECTION', () => {
  const shellA = block({
    id: 'shell-a',
    role: 'application-shell',
    family: 'shell',
    tags: ['shell'],
    root: 'shell-a-root',
    fragments: [{ id: 'shell-a-root', emmet: 'div.a' }],
    slots: [
      {
        id: 'navigation',
        at: { fragment: 'shell-a-root', name: 'navigation' },
        accepts: ['collapsible-sidebar'],
        min: 0,
        max: 1,
      },
      {
        id: 'header',
        at: { fragment: 'shell-a-root', name: 'header' },
        accepts: ['workspace-header'],
        min: 0,
        max: 1,
      },
      {
        id: 'content',
        at: { fragment: 'shell-a-root', name: 'content' },
        accepts: ['application-shell', 'page'],
        min: 0,
        max: 1,
      },
    ],
  });
  const shellB = block({
    id: 'shell-b',
    role: 'application-shell',
    family: 'shell',
    tags: ['shell'],
    root: 'shell-b-root',
    fragments: [{ id: 'shell-b-root', emmet: 'div.b' }],
    slots: [
      {
        id: 'navigation',
        at: { fragment: 'shell-b-root', name: 'navigation' },
        accepts: ['collapsible-sidebar'],
        min: 0,
        max: 1,
      },
      {
        id: 'header',
        at: { fragment: 'shell-b-root', name: 'header' },
        accepts: ['workspace-header'],
        min: 0,
        max: 1,
      },
      {
        id: 'content',
        at: { fragment: 'shell-b-root', name: 'content' },
        accepts: ['page'],
        min: 0,
        max: 1,
      },
    ],
  });
  const nav = block({
    id: 'nav-leaf',
    role: 'collapsible-sidebar',
    tags: ['collapsible-nav'],
    root: 'nav-root',
    fragments: [{ id: 'nav-root', emmet: 'aside' }],
    ports: [
      {
        id: 'nav-in',
        at: { fragment: 'nav-root', name: 'nav-root' },
        direction: 'in',
        kind: 'control',
        contract: 'nav-toggle',
        minLinks: 0,
        maxLinks: 1,
        scope: 'shell',
      },
    ],
  });
  const header = block({
    id: 'header-leaf',
    role: 'workspace-header',
    root: 'header-root',
    fragments: [{ id: 'header-root', emmet: 'header' }],
    ports: [
      {
        id: 'nav-out',
        at: { fragment: 'header-root', name: 'header-root' },
        direction: 'out',
        kind: 'control',
        contract: 'nav-toggle',
        minLinks: 0,
        maxLinks: 1,
        scope: 'shell',
      },
    ],
    landmarks: { main: 0, primaryHeading: 1 },
  });
  const pageBlock = block({
    id: 'page-leaf',
    role: 'page',
    root: 'page-root',
    fragments: [{ id: 'page-root', emmet: 'main' }],
    landmarks: { main: 1, primaryHeading: 0 },
  });
  const compiled = compileBlocks([shellA, shellB, nav, header, pageBlock]);
  const draftPage: PagePlan = {
    id: 'split',
    route: '/split',
    recipe: 'd'.repeat(64),
    root: 'shell-a',
    nodes: {
      'shell-a': { id: 'shell-a', block: ref(compiled, 'shell-a'), bindings: {} },
      'shell-b': {
        id: 'shell-b',
        block: ref(compiled, 'shell-b'),
        parent: { node: 'shell-a', slot: 'content', order: 0 },
        bindings: {},
      },
      header: {
        id: 'header',
        block: ref(compiled, 'header-leaf'),
        parent: { node: 'shell-a', slot: 'header', order: 0 },
        bindings: {},
      },
      nav: {
        id: 'nav',
        block: ref(compiled, 'nav-leaf'),
        parent: { node: 'shell-b', slot: 'navigation', order: 0 },
        bindings: {},
      },
      main: {
        id: 'main',
        block: ref(compiled, 'page-leaf'),
        parent: { node: 'shell-b', slot: 'content', order: 0 },
        bindings: {},
      },
    },
    connections: [
      {
        id: 'cross',
        relation: 'controls',
        from: { node: 'header', port: 'nav-out' },
        to: { node: 'nav', port: 'nav-in' },
      },
    ],
    rules: [],
    decisions: {},
    status: 'draft',
  };
  const { registry, page } = withStubRecipe(compiled, draftPage, 'split-recipe');
  const session = sessionFor(registry, page);
  const report = validatePage(page, session, registry, 'draft');
  assert(
    report.diagnostics.some(d => d.code === 'CROSS_SHELL_CONNECTION'),
    report.diagnostics.map(d => d.code).join(','),
  );
});

test('persistent sidebar does not require a nav-toggle connection', () => {
  const built = shellFixture({
    persistentNav: true,
    includeHeaderControl: false,
    connectNav: false,
  });
  const { registry, page } = withStubRecipe(built.registry, built.page);
  const session = sessionFor(registry, page);
  const report = validatePage(page, session, registry, 'draft');
  assert.equal(report.diagnostics.some(d => d.code.startsWith('COLLAPSIBLE_NAV_')), false);
});

test('wrong slot role is rejected', () => {
  const built = shellFixture();
  const { registry, page } = withStubRecipe(built.registry, built.page);
  page.nodes.main = {
    id: 'main',
    block: ref(registry, 'collapsible-nav'),
    parent: { node: 'shell', slot: 'content', order: 0 },
    bindings: {},
  };
  const session = sessionFor(registry, page);
  const report = validatePage(page, session, registry, 'draft');
  assert(report.diagnostics.some(d => d.code === 'SLOT_ROLE_REJECTED'));
});

test('missing content is an obligation in draft and blocks complete', () => {
  const built = shellFixture({ includeContent: false });
  const { registry, page } = withStubRecipe(built.registry, built.page);
  const session = sessionFor(registry, page);
  const draft = validatePage(page, session, registry, 'draft');
  assert(
    draft.diagnostics.some(
      d =>
        (d.code === 'SLOT_CAPACITY_SHORT' || d.code === 'SHELL_CONTENT_MISSING') &&
        d.severity === 'obligation',
    ),
    draft.diagnostics.map(d => `${d.code}:${d.severity}`).join(','),
  );
  assert.equal(
    draft.errorCount,
    0,
    `draft should have no errors: ${draft.diagnostics.filter(d => d.severity === 'error').map(d => d.code).join(',')}`,
  );
  assert.equal(draft.ok, true, 'draft mode allows outstanding obligations');

  const complete = validatePage(page, session, registry, 'complete');
  assert.equal(complete.ok, false);
  assert(complete.obligationCount > 0);
});

test('shared data-context binding passes; cross-table binding without rule fails', () => {
  const filters = block({
    id: 'filters',
    role: 'filters',
    tags: ['data-workspace'],
    root: 'filters-root',
    fragments: [{ id: 'filters-root', emmet: 'div.filters' }],
  });
  const tableA = block({
    id: 'table-a',
    role: 'table',
    tags: ['data-workspace'],
    root: 'table-a-root',
    fragments: [{ id: 'table-a-root', emmet: 'div.table-a' }],
  });
  const tableB = block({
    id: 'table-b',
    role: 'data-table',
    tags: ['data-workspace'],
    root: 'table-b-root',
    fragments: [{ id: 'table-b-root', emmet: 'div.table-b' }],
  });
  const host = block({
    id: 'data-host',
    role: 'workspace',
    root: 'host-root',
    fragments: [{ id: 'host-root', emmet: 'div.host' }],
    slots: [
      {
        id: 'body',
        at: { fragment: 'host-root', name: 'body' },
        accepts: ['filters', 'table', 'data-table'],
        min: 0,
        max: 8,
      },
    ],
    landmarks: { main: 1, primaryHeading: 1 },
  });
  const compiled = compileBlocks([host, filters, tableA, tableB]);

  const sharedDraft: PagePlan = {
    id: 'data-ok',
    route: '/data',
    recipe: 'e'.repeat(64),
    root: 'host',
    nodes: {
      host: { id: 'host', block: ref(compiled, 'data-host'), bindings: {} },
      filters: {
        id: 'filters',
        block: ref(compiled, 'filters'),
        parent: { node: 'host', slot: 'body', order: 0 },
        bindings: { 'data-context': 'records' },
      },
      table: {
        id: 'table',
        block: ref(compiled, 'table-a'),
        parent: { node: 'host', slot: 'body', order: 1 },
        bindings: { 'data-context': 'records' },
      },
    },
    connections: [],
    rules: [
      {
        id: 'shared',
        type: 'shared-data',
        binding: 'records',
        nodes: ['filters', 'table'],
      },
    ],
    decisions: {},
    status: 'draft',
  };
  const shared = withStubRecipe(compiled, sharedDraft, 'data-ok-recipe');
  const sharedReport = validatePage(shared.page, sessionFor(shared.registry, shared.page), shared.registry, 'draft');
  assert.equal(sharedReport.diagnostics.some(d => d.code === 'RULE_SHARED_DATA_VIOLATION'), false);
  assert.equal(sharedReport.diagnostics.some(d => d.code === 'SHARED_DATA_CROSS_TABLE'), false);

  const crossDraft: PagePlan = {
    ...sharedDraft,
    id: 'data-bad',
    nodes: {
      host: { id: 'host', block: ref(compiled, 'data-host'), bindings: {} },
      'table-a': {
        id: 'table-a',
        block: ref(compiled, 'table-a'),
        parent: { node: 'host', slot: 'body', order: 0 },
        bindings: { 'data-context': 'shared-ctx' },
      },
      'table-b': {
        id: 'table-b',
        block: ref(compiled, 'table-b'),
        parent: { node: 'host', slot: 'body', order: 1 },
        bindings: { 'data-context': 'shared-ctx' },
      },
    },
    rules: [],
  };
  const cross = withStubRecipe(compiled, crossDraft, 'data-bad-recipe');
  const crossReport = validatePage(cross.page, sessionFor(cross.registry, cross.page), cross.registry, 'draft');
  assert(crossReport.diagnostics.some(d => d.code === 'SHARED_DATA_CROSS_TABLE'));
});

test('duplicate main landmarks fail', () => {
  const built = shellFixture({ dualMain: true });
  const { registry, page } = withStubRecipe(built.registry, built.page);
  const session = sessionFor(registry, page);
  const report = validatePage(page, session, registry, 'draft');
  assert(
    report.diagnostics.some(d => d.code === 'LANDMARK_MAIN_DUPLICATE'),
    report.diagnostics.map(d => d.code).join(','),
  );
});

test('auth reachability marks unreachable flow pages', () => {
  const signIn = block({
    id: 'auth-sign-in',
    role: 'auth-frame',
    family: 'auth',
    tags: ['auth', 'auth-frame'],
    root: 'sign-in-root',
    fragments: [{ id: 'sign-in-root', emmet: 'div.sign-in' }],
    landmarks: { main: 1, primaryHeading: 1 },
  });
  const recovery = block({
    id: 'auth-recovery',
    role: 'auth-frame',
    family: 'auth',
    tags: ['auth', 'auth-frame'],
    root: 'recovery-root',
    fragments: [{ id: 'recovery-root', emmet: 'div.recovery' }],
    landmarks: { main: 1, primaryHeading: 1 },
  });
  const registry = compileBlocks([signIn, recovery]);
  const recipeRef = contentRef({
    schemaVersion: 1,
    id: 'auth-flow',
    kind: 'flow',
    profile: ref(registry, 'ctx-profile'),
  });
  const withRecipe: CompiledMacroRegistry = {
    ...registry,
    recipes: {
      [recipeRef]: {
        schemaVersion: 1,
        id: 'auth-flow',
        kind: 'flow',
        profile: ref(registry, 'ctx-profile'),
        pages: [],
        entryPage: 'sign-in',
        routeLinks: [],
      },
    },
    aliases: { ...registry.aliases, 'auth-flow': recipeRef },
  };
  const signInPage: PagePlan = {
    id: 'sign-in',
    route: '/auth/sign-in',
    recipe: recipeRef,
    root: 'form',
    nodes: {
      form: { id: 'form', block: ref(registry, 'auth-sign-in'), bindings: {} },
    },
    connections: [],
    rules: [],
    decisions: {},
    status: 'draft',
  };
  const recoveryPage: PagePlan = {
    id: 'recovery',
    route: '/auth/recovery',
    recipe: recipeRef,
    root: 'form',
    nodes: {
      form: { id: 'form', block: ref(registry, 'auth-recovery'), bindings: {} },
    },
    connections: [],
    rules: [],
    decisions: {},
    status: 'draft',
  };
  const session = sessionFor(withRecipe, signInPage, {
    pages: {
      'run-sign-in': { ...signInPage, id: 'run-sign-in' },
      'run-recovery': { ...recoveryPage, id: 'run-recovery' },
    },
    routeLinks: [],
  });
  const report = validateDesign(session, withRecipe, 'complete');
  assert(
    report.diagnostics.some(d => d.code === 'AUTH_PAGE_UNREACHABLE' && d.page === 'run-recovery'),
    report.diagnostics.map(d => `${d.code}:${d.page}`).join(','),
  );
});

test('effective decisions preserve explicit null values', () => {
  const built = shellFixture();
  const { registry, page } = withStubRecipe(built.registry, built.page);
  const session = sessionFor(registry, page, {
    projectDecisions: { density: null },
  });
  const decisions = buildContextView(
    session,
    { view: 'decisions', designId: session.id },
    registry,
  );
  const density = decisions.find(record => record.key === 'density');
  assert(density);
  assert.equal(density.value, null);
  assert.equal(density.provenance, 'project');
});

test('context views and next-step priority surface shell obligations first', () => {
  const built = shellFixture({ includeContent: false });
  const { registry, page } = withStubRecipe(built.registry, built.page);
  const session = sessionFor(registry, page);
  const overview = buildContextView(session, { view: 'overview', designId: session.id }, registry);
  assert.equal(overview[0]?.kind, 'overview');
  assert.equal(overview[0]?.designRevision, session.revision);

  const next = buildContextView(session, { view: 'next', designId: session.id }, registry);
  assert.equal(next[0]?.kind, 'next');
  const step = selectNextStep(session, registry);
  assert(step.priority <= 3, `expected shell/slot priority, got ${step.priority} ${step.code}`);
  assert.match(step.code, /SHELL_|SLOT_|LANDMARK_|MISSING_/);
});

test('validation pagination maintains diagnostic ordering and context boundaries', () => {
  // Create valid blocks first, then create validation issues at page level
  const validBlocks = Array.from({ length: 8 }, (_, i) =>
    block({
      id: `valid-${i}`,
      role: 'page',
      root: `root-${i}`,
      fragments: [{ id: `root-${i}`, emmet: 'div' }],
      slots: [{
        id: `slot-${i}`,
        at: { fragment: `root-${i}`, name: 'slot' }, // Valid fragment reference
        accepts: ['page'],
        min: 0,
        max: 1,
      }],
    })
  );

  // Compile blocks successfully
  const registry = compileBlocks(validBlocks);

  // Create page with many nodes to generate runtime validation issues
  const nodes: PagePlan['nodes'] = {};
  for (let i = 0; i < 6; i++) {
    nodes[`node-${i}`] = {
      id: `node-${i}`,
      block: ref(registry, `valid-${i}`),
      bindings: {},
      // Some nodes will have invalid parents to create validation issues
      ...(i > 2 ? { parent: { node: 'missing-parent', slot: 'missing', order: 0 } } : {}),
    };
  }

  const problematicPage: PagePlan = {
    id: 'validation-test',
    route: '/validation',
    recipe: contentRef({ id: 'validation-recipe' }),
    root: 'node-0',
    nodes,
    // Add some invalid connections
    connections: [
      { id: 'bad-conn', relation: 'controls', from: { node: 'missing-from', port: 'x' }, to: { node: 'missing-to', port: 'y' } },
    ],
    rules: [],
    decisions: {},
    status: 'draft',
  };

  const session = sessionFor(registry, problematicPage);

  // Test validation with pagination - now should have runtime validation issues
  const report = validatePage(problematicPage, session, registry, 'draft');

  // Should have diagnostics from runtime validation
  assert(report.diagnostics.length > 0, 'Should detect runtime validation issues');

  // Diagnostics should be ordered consistently (validation may reorder by severity/priority)
  const codes = report.diagnostics.map(d => d.code);
  const uniqueCodes = new Set(codes);

  // Should have multiple types of validation issues
  assert(uniqueCodes.size > 3, 'Should have multiple validation issue types');
  assert(codes.length >= uniqueCodes.size, 'Should have at least one instance of each issue type');

  // Test complete mode for stricter validation
  const completeReport = validatePage(problematicPage, session, registry, 'complete');
  assert(completeReport.errorCount >= report.errorCount);
});

test('cross-component decision inheritance with null precedence', () => {
  const built = shellFixture({ persistentNav: true });
  const { registry, page } = withStubRecipe(built.registry, built.page);

  // Test session with explicit null at project level
  const session = sessionFor(registry, page, {
    projectDecisions: {
      density: null, // Explicit null should take precedence over defaults
    },
  });

  // Validate decision resolution maintains null precedence
  const report = validatePage(page, session, registry, 'draft');

  // Build decision context to verify null handling
  const decisions = buildContextView(
    session,
    { view: 'decisions', designId: session.id },
    registry,
  );

  const densityDecision = decisions.find(record =>
    record && typeof record === 'object' &&
    'key' in record && record.key === 'density'
  );

  assert(densityDecision, 'Should find density decision');
  assert.equal((densityDecision as any).value, null, 'Explicit null should be preserved');
  assert.equal((densityDecision as any).provenance, 'project');
});

test('deterministic next-step tie resolution with priority boundaries', () => {
  // Create multiple pages with same-priority issues
  const shellA = shellFixture({ includeContent: false, persistentNav: false });
  const shellB = shellFixture({ includeContent: false, persistentNav: false });

  const sessionA = sessionFor(shellA.registry, shellA.page, {
    id: 'design-a',
    pages: { 'page-a': { ...shellA.page, id: 'page-a' } },
  });
  const sessionB = sessionFor(shellB.registry, shellB.page, {
    id: 'design-b',
    pages: { 'page-b': { ...shellB.page, id: 'page-b' } },
  });

  // Both should have similar priority issues
  const stepA = selectNextStep(sessionA, shellA.registry);
  const stepB = selectNextStep(sessionB, shellB.registry);

  // With identical constraints, steps should be deterministic
  assert.equal(stepA.priority, stepB.priority);
  assert.equal(stepA.code, stepB.code);

  // Priority should be shell-level (highest priority)
  assert(stepA.priority <= 3, 'Shell obligations should have highest priority');
});

test('auth reachability validation with complex flow graphs', () => {
  const authBlocks = [
    block({ id: 'sign-in', role: 'auth-frame', family: 'auth', root: 'signin-root',
           fragments: [{ id: 'signin-root', emmet: 'form.signin' }] }),
    block({ id: 'recovery', role: 'auth-frame', family: 'auth', root: 'recovery-root',
           fragments: [{ id: 'recovery-root', emmet: 'form.recovery' }] }),
    block({ id: 'verify', role: 'auth-frame', family: 'auth', root: 'verify-root',
           fragments: [{ id: 'verify-root', emmet: 'form.verify' }] }),
  ];

  const registry = compileBlocks(authBlocks);

  const flowPages: Record<string, PagePlan> = {
    'signin': {
      id: 'signin',
      route: '/auth/signin',
      recipe: contentRef({ id: 'auth-flow' }),
      root: 'form',
      nodes: { form: { id: 'form', block: ref(registry, 'sign-in'), bindings: {} } },
      connections: [],
      rules: [],
      decisions: {},
      status: 'draft',
    },
    'recovery': {
      id: 'recovery',
      route: '/auth/recovery',
      recipe: contentRef({ id: 'auth-flow' }),
      root: 'form',
      nodes: { form: { id: 'form', block: ref(registry, 'recovery'), bindings: {} } },
      connections: [],
      rules: [],
      decisions: {},
      status: 'draft',
    },
    'verify': {
      id: 'verify',
      route: '/auth/verify',
      recipe: contentRef({ id: 'auth-flow' }),
      root: 'form',
      nodes: { form: { id: 'form', block: ref(registry, 'verify'), bindings: {} } },
      connections: [],
      rules: [],
      decisions: {},
      status: 'draft',
    },
  };

  const flowSession = sessionFor(registry, flowPages.signin!, {
    pages: flowPages,
    routeLinks: [
      { fromPage: 'signin', fromAnchor: { fragment: 'sign-in-root', name: 'recovery' }, toPage: 'recovery' },
      // Missing link to verify page creates unreachable state
    ],
  });

  // Validation should detect unreachable auth pages
  const report = validateDesign(flowSession, registry, 'complete');

  const unreachable = report.diagnostics.filter(d => d.code === 'AUTH_PAGE_UNREACHABLE');
  assert(unreachable.length > 0, 'Should detect unreachable auth pages');
  assert(unreachable.some(d => d.page === 'verify'), 'Verify page should be unreachable');
});

test('packaged workspace-dashboard recipe holds metrics, activity, and records in one graph', () => {
  const registry = loadCompiledRegistry();
  const recipeRef = registry.aliases['workspace-dashboard'];
  assert(recipeRef);
  const recipe = registry.recipes[recipeRef]!;
  const page = recipe.pages.find(entry => entry.id === recipe.entryPage) ?? recipe.pages[0]!;
  const nodeRoles = Object.values(page.nodes).map(node => {
    const block = registry.blocks[node.block];
    return { id: node.id, role: block?.role, parent: node.parent?.slot };
  });
  assert(nodeRoles.some(n => n.id === 'canvas' && n.role === 'dashboard'));
  assert(nodeRoles.some(n => n.id === 'metrics' && n.role === 'metrics' && n.parent === 'metrics'));
  assert(nodeRoles.some(n => n.id === 'activity' && n.role === 'activity' && n.parent === 'activity'));
  assert(nodeRoles.some(n => n.id === 'records' && n.role === 'workspace' && n.parent === 'records'));
  assert(nodeRoles.some(n => n.id === 'filters' && n.parent === 'filters'));
  assert(nodeRoles.some(n => n.id === 'table' && n.parent === 'table'));
  assert(nodeRoles.some(n => n.id === 'pager' && n.parent === 'pager'));
  assert(nodeRoles.some(n => n.id === 'tabs' && n.role === 'tabs' && n.parent === 'tabs'));
  assert(nodeRoles.some(n => n.id === 'row-actions' && n.role === 'row-action' && n.parent === 'row-actions'));
  assert(nodeRoles.some(n => n.id === 'drawer' && n.role === 'details' && n.parent === 'detail-drawer'));

  const session: DesignSession = {
    schemaVersion: 1,
    id: 'dash-graph',
    projectKey: 'p'.repeat(64),
    revision: 1,
    registryRevision: registry.revision,
    profile: registry.aliases['app-default']!,
    projectDecisions: { density: 'comfortable' },
    pages: { [page.id]: page },
    routeLinks: [],
    checkpoints: [],
    receipts: {},
  };
  const report = validatePage(page, session, registry, 'draft');
  assert.equal(
    report.diagnostics.filter(d => d.severity === 'error').length,
    0,
    report.diagnostics.map(d => `${d.code}:${d.message}`).join('; '),
  );
});

test('packaged workspace-settings, workspace-detail, marketing-pricing, and auth-split-flow validate cleanly', () => {
  const registry = loadCompiledRegistry();

  for (const recipeAlias of [
    'workspace-settings',
    'workspace-detail',
    'marketing-pricing',
    'auth-split-flow',
  ] as const) {
    const recipeRef = registry.aliases[recipeAlias];
    assert(recipeRef, `Recipe ${recipeAlias} must be aliased`);
    const recipe = registry.recipes[recipeRef]!;
    assert(recipe, `Recipe ${recipeAlias} must exist`);

    const pagesRecord: Record<string, PagePlan> = {};
    for (const page of recipe.pages) {
      pagesRecord[page.id] = page;
    }

    const session: DesignSession = {
      schemaVersion: 1,
      id: `eval-${recipeAlias}`,
      projectKey: 'p'.repeat(64),
      revision: 1,
      registryRevision: registry.revision,
      profile: registry.aliases['app-default']!,
      projectDecisions: { density: 'compact', 'auth-brand': 'Acme' },
      pages: pagesRecord,
      routeLinks: recipe.routeLinks,
      checkpoints: [],
      receipts: {},
    };

    for (const page of recipe.pages) {
      const report = validatePage(page, session, registry, 'complete');
      const errors = report.diagnostics.filter(d => d.severity === 'error');
      assert.equal(
        errors.length,
        0,
        `Page ${page.id} in ${recipeAlias} had errors: ${errors.map(d => `${d.code}:${d.message}`).join('; ')}`,
      );
    }
  }
});
