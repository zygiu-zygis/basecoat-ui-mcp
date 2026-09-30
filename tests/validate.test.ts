// Copyright Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseHtml, parseHtmlWithDiagnostics, scriptImports } from '../src/tools/html.js';
import { validateComposition } from '../src/tools/validate.js';

const rules = (code: string) => validateComposition(code).issues.map(issue => issue.rule);
const semanticRules = (code: string) => validateComposition(code, { semanticProfile: 'default' }).issues.map(issue => issue.rule);

describe('HTML lexer', () => {
  it('parses ASCII, non-emoji Unicode, quotes, and escaped dynamic expressions', () => {
    const nodes = parseHtml('<div title="ASCII" data-label="Žodis"><span title={condition ? "a \\"quote\\"" : \'b\'}>Tekstas</span></div>');
    assert.equal(nodes[0]!.attrs.title, 'ASCII');
    assert.equal(nodes[0]!.attrs['data-label'], 'Žodis');
    assert.equal(nodes[1]!.dynamic, true);
    assert.equal(nodes[0]!.line, 1);
    assert.equal(nodes[0]!.column, 1);
  });

  it('ignores comments, frontmatter, and script/style markup strings', () => {
    const code = `---
const example = '<div class="card">';
---
<!-- <article class="card"> -->
<script>const example = '<section class="card">';</script>
<style>.example::before { content: '<div>'; }</style>
<main title="a > b"><p>Text</p></main>`;
    const nodes = parseHtml(code);
    assert.deepEqual(nodes.map(node => node.tag), ['script', 'style', 'main', 'p']);
    assert.equal(nodes[2]!.attrs.title, 'a > b');
    assert.equal(nodes[3]!.parent, 2);
    assert.equal(nodes[2]!.line, 7);
  });

  it('keeps void elements out of the ancestor stack', () => {
    const nodes = parseHtml('<main><input class="input"><br><p>Text</p></main>');
    assert.equal(nodes[3]!.parent, 0);
  });

  it('flags dynamic attributes without interpreting quoted expression markup', () => {
    const nodes = parseHtml('<div class:list={[active && "card", { hidden: false }]}><p title={"a > b"}>Text</p></div>');
    assert.deepEqual(nodes.map(node => node.tag), ['div', 'p']);
    assert(nodes.every(node => node.dynamic));
    assert(rules('<div class:list={["card"]}></div>').includes('dynamic-attributes'));
  });

  it('extracts literal imports but ignores documentation strings and comments', () => {
    const source = `
const docs = 'import "basecoat-css/all"';
const template = \`import "basecoat-css/all"\`;
// import "basecoat-css/all";
/* import "basecoat-css/all"; */
import "basecoat-css/basecoat";
import { value as name } from "basecoat-css/tabs";
await import("basecoat-css/popover");`;
    assert.deepEqual(scriptImports(source), ['basecoat-css/basecoat', 'basecoat-css/tabs', 'basecoat-css/popover']);
  });
});

describe('composition validation', () => {
  it('detects cards nested through intermediate containers', () => {
    const result = validateComposition('<div class="card"><section><div class="card"></div></section></div>');
    assert.equal(result.valid, false);
    assert(result.issues.some(issue => issue.rule === 'nested-cards'));
  });

  it('detects legacy ui-card nesting and legacy class vocabulary', () => {
    const found = rules('<div class="ui-card"><div class="ui-card"><button class="btn-primary">Save</button></div></div>');
    assert(found.includes('nested-cards'));
    assert(found.includes('invalid-basecoat-class'));
  });

  it('accepts sibling cards and custom project classes', () => {
    assert.deepEqual(rules('<div class="card site-custom"></div><div class="card"></div>'), []);
  });

  it('rejects unrecognized Basecoat family classes against upstream vocabulary', () => {
    for (const name of ['btn-nonsense', 'ui-card-body', 'dialog-content']) {
      assert(rules(`<div class="${name}"></div>`).includes('invalid-basecoat-class'), name);
    }
    assert.deepEqual(rules('<div class="card-title card-description card-action table-container project-widget ui-custom"></div>'), []);
  });

  it('does not confuse Tailwind utilities with Basecoat component namespaces', () => {
    assert.deepEqual(rules('<div class="table-fixed table-cell md:table-row select-none field-sizing-content"></div>'), []);
  });

  it('recognizes runtime and selective tabs imports in processed scripts', () => {
    assert.deepEqual(rules('<div class="tabs"></div><script>import "basecoat-css/basecoat"; import "basecoat-css/tabs";</script>'), []);
  });

  it('reports missing runtime and module independently', () => {
    assert(rules('<div class="tabs"></div><script>import "basecoat-css/tabs";</script>').includes('missing-js-runtime'));
    assert(rules('<div class="tabs"></div><script>import "basecoat-css/basecoat";</script>').includes('missing-js-module'));
  });

  it('does not accept quoted or commented fake imports', () => {
    const found = rules('<div class="tabs"></div><script>const docs = `import "basecoat-css/all"`; // import "basecoat-css/all"\n</script>');
    assert(found.includes('missing-js-runtime'));
    assert(found.includes('missing-js-module'));
  });

  it('does not count Astro server frontmatter imports as browser runtime', () => {
    assert(rules('---\nimport "basecoat-css/all";\n---\n<div class="tabs"></div>').includes('missing-js-runtime'));
  });

  it('reports component modules loaded before their runtime', () => {
    assert(rules('<div class="tabs"></div><script>import "basecoat-css/tabs"; import "basecoat-css/basecoat";</script>').includes('js-import-order'));
  });

  it('requires the range controller for native range inputs only', () => {
    const missing = validateComposition('<input type="RANGE">');
    assert(missing.issues.some(issue => issue.rule === 'missing-js-module'));
    assert(missing.issues.some(issue => issue.message.includes('basecoat-css/range')));
    assert(!rules('<input type="text">').includes('missing-js-module'));
    assert.deepEqual(rules('<input type="range"><script>import "basecoat-css/basecoat"; import "basecoat-css/range";</script>'), []);
  });

  it('recognizes actual local script sources including the all bundle', () => {
    assert.deepEqual(rules('<div class="tabs"></div><script src="/vendor/all.min.js"></script>'), []);
    assert.deepEqual(rules('<div class="tabs"></div><script src="/vendor/basecoat.min.js"></script><script src="/vendor/tabs.min.js"></script>'), []);
  });

  it('recognizes exported minified package import paths', () => {
    assert.deepEqual(rules('<div class="tabs"></div><script>import "basecoat-css/basecoat.min"; import "basecoat-css/tabs.min";</script>'), []);
    assert(rules('<div class="tabs"></div><script>import "basecoat-css/tabs.min"; import "basecoat-css/basecoat.min";</script>').includes('js-import-order'));
  });

  it('rejects all bundle imports as errors', () => {
    for (const path of ['basecoat-css/all', 'basecoat-css/all.min']) {
      const result = validateComposition(`<script>import "${path}";</script>`);
      assert.equal(result.valid, false);
      assert(result.issues.some(issue => issue.rule === 'all-js-bundle' && issue.severity === 'error'));
    }
    assert.deepEqual(rules('<script>const docs = \'import "basecoat-css/all"\'; // import "basecoat-css/all"\n</script>'), []);
  });

  it('ignores non-executable script data blocks', () => {
    for (const type of ['application/json', 'application/ld+json', 'text/plain']) {
      const found = rules(`<div class="tabs"></div><script type="${type}">import "basecoat-css/all";</script>`);
      assert(found.includes('missing-js-module'), type);
      assert(found.includes('missing-js-runtime'), type);
    }
  });

  it('warns that Astro inline or explicit module scripts bypass bare import bundling', () => {
    for (const attrs of ['is:inline', 'type="module"']) {
      assert(rules(`<div class="tabs"></div><script ${attrs}>import "basecoat-css/all";</script>`).includes('unbundled-bare-import'));
    }
    assert(!rules('<script is:inline>console.log("hello");</script>').includes('unbundled-bare-import'));
  });

  it('checks responsive, arbitrary, negative and important spacing utilities', () => {
    const found = rules('<div class="md:gap-3 gap-[17px] !px-5 -mt-2 [&:hover]:space-y-3"></div>');
    assert.equal(found.filter(rule => rule === 'spacing-rhythm').length, 5);
  });

  it('accepts the rhythm scale and auto margins', () => {
    assert.deepEqual(rules('<div class="gap-2 md:gap-4 mx-auto p-0 space-y-6 py-12"></div>'), []);
  });

  it('warns against decorative gradients', () => {
    assert(rules('<main class="bg-linear-to-r from-pink-500 to-violet-500"></main>').includes('random-gradient'));
  });

  it('checks multiple primary actions in one local group', () => {
    assert(rules('<div><button class="btn">A</button><button class="btn">B</button></div>').includes('primary-hierarchy'));
  });

  it('does not combine primary actions across independent groups', () => {
    assert(!rules('<div><button class="btn">A</button></div><div><button class="btn">B</button></div>').includes('primary-hierarchy'));
    assert(!rules('<div><button class="btn">Save</button><button class="btn" data-variant="ghost">Cancel</button></div>').includes('primary-hierarchy'));
  });

  it('detects inherited centering and respects explicit left alignment', () => {
    assert(rules('<main class="text-center"><h1>A</h1><p>B</p></main>').includes('everything-centered'));
    assert(!rules('<main class="text-center"><h1>A</h1><p class="text-left">B</p></main>').includes('everything-centered'));
  });

  it('validates Basecoat v1 button data attributes', () => {
    assert.deepEqual(rules('<button class="btn" data-variant="default"></button>'), []);
    assert(rules('<button class="btn" data-size="huge"></button>').includes('button-size'));
    assert.deepEqual(rules('<button class="btn" data-variant="primary" data-size="icon-xs"></button>'), []);
    assert.deepEqual(rules('<button class="btn" data-variant="secondary" data-size="xs"></button>'), []);
  });

  it('reports the source line for violations', () => {
    const result = validateComposition('<main>\n  <div class="gap-3"></div>\n</main>');
    assert.equal(result.issues[0]!.line, 2);
  });

  it('caps feedback at 24 issues with an explicit truncation flag', () => {
    const result = validateComposition('<div class="gap-3"></div>'.repeat(40));
    assert.equal(result.issues.length, 24);
    assert.equal(result.truncated, true);
    assert(result.issues.every(issue => issue.message.length <= 240));
  });

  it('keeps an invalid verdict when errors follow 24 truncated warnings', () => {
    const result = validateComposition('<div class="gap-3"></div>'.repeat(24) + '<button class="btn-nonsense"></button>');
    assert.equal(result.issues.length, 24);
    assert.equal(result.truncated, true);
    assert.equal(result.valid, false);
    assert.equal(result.errorsOmitted, true);
    assert(result.issues.some(issue => issue.rule === 'issues-truncated'));
  });

  it('returns valid true when only warnings are reported', () => {
    const result = validateComposition('<div class="gap-3"></div>');
    assert.equal(result.valid, true);
    assert(result.issues.some(issue => issue.rule === 'spacing-rhythm' && issue.severity === 'warning'));
  });

  it('allows common item anatomy hook classes used in project markup', () => {
    assert.deepEqual(
      rules('<div class="item"><h3 class="item-title">T</h3><p class="item-description">D</p><div class="item-media"></div><div class="item-content"></div><div class="item-actions"></div><header class="item-header"></header></div>'),
      [],
    );
    assert(rules('<div class="item-fake-hook"></div>').includes('invalid-basecoat-class'));
  });

  it('rejects oversized UTF-8 input before parsing', () => {
    const result = validateComposition('é'.repeat(32_769));
    assert.equal(result.valid, false);
    assert.equal(result.truncated, true);
    assert.deepEqual(result.issues.map(issue => issue.rule), ['input-size']);
  });

  it('accepts empty input and states the static analysis limits', () => {
    const result = validateComposition('');
    assert.equal(result.valid, true);
    assert.deepEqual(result.issues, []);
    assert.equal(result.truncated, false);
    assert.match(result.limitations, /dynamic classes/);
    assert.match(result.limitations, /parent layout/);
  });
});

describe('semantic validation', () => {
  it('suggests semantic tokens for hardcoded spacing utilities', () => {
    assert(semanticRules('<div class="gap-2"></div>').includes('semantic-token-available'));
    assert(semanticRules('<div class="gap-4"></div>').includes('semantic-token-available'));
    assert(semanticRules('<div class="p-2"></div>').includes('semantic-token-available'));
    const result = validateComposition('<div class="gap-2"></div>', { semanticProfile: 'default' });
    const issue = result.issues.find(candidate => candidate.rule === 'semantic-token-available');
    assert.equal(issue?.semanticToken, 'gap-rhythm-sm');
    assert.equal(issue?.approvedUtility, 'gap-2');
    assert.match(issue?.repair ?? '', /Keep 'gap-2' as the executable class/);
  });

  it('suggests semantic tokens for hardcoded background utilities', () => {
    assert(semanticRules('<div class="bg-background"></div>').includes('semantic-token-available'));
    assert(semanticRules('<div class="bg-card"></div>').includes('semantic-token-available'));
    assert(semanticRules('<div class="border-border"></div>').includes('semantic-token-available'));
  });

  it('reports profile-aware unsupported spacing, colors, and typography', () => {
    assert(!semanticRules('<div class="gap-8"></div>').includes('semantic-token-available'));
    const found = semanticRules('<div class="gap-8 bg-red-500 text-lg"></div>');
    assert(found.includes('semantic-hardcoded-spacing'));
    assert(found.includes('semantic-hardcoded-color'));
    assert(found.includes('semantic-hardcoded-typography'));
  });

  it('separates semantic identities from executable utility classes', () => {
    const found = semanticRules('<div class="gap-rhythm-sm p-density-base bg-surface-primary text-body border-subtle m-0 mx-auto bg-transparent"></div>');
    assert.equal(found.filter(rule => rule === 'semantic-token-as-utility').length, 5);
    assert(!found.includes('semantic-hardcoded-spacing'));
    assert(!found.includes('semantic-hardcoded-color'));
  });

  it('does not classify non-color text, border, or background utilities as colors', () => {
    const found = semanticRules('<div class="text-center text-lg border-2 border-dashed bg-cover bg-center bg-no-repeat"></div>');
    assert(!found.includes('semantic-hardcoded-color'));
    assert(found.includes('semantic-hardcoded-typography'));
    assert(semanticRules('<div class="text-red-500 border-blue-500 bg-amber-100"></div>').filter(rule => rule === 'semantic-hardcoded-color').length === 3);
  });

  it('rejects invalid semantic identities and arbitrary colors', () => {
    const found = semanticRules('<div class="gap-rhythm-xxl bg-[#123456] text-[oklch(50%_0.2_20)]"></div>');
    assert(found.includes('semantic-token-invalid'));
    assert.equal(found.filter(rule => rule === 'arbitrary-color').length, 2);
  });

  it('preserves existing validation when semantic profile is not specified', () => {
    const regular = rules('<div class="gap-3"></div>');
    const withoutProfile = validateComposition('<div class="gap-3"></div>').issues.map(i => i.rule);
    assert.deepEqual(regular, withoutProfile);
  });

  it('works with invalid semantic profile gracefully', () => {
    const result = validateComposition('<div class="gap-2"></div>', { semanticProfile: 'nonexistent' });
    assert.equal(result.valid, false);
    assert(result.issues.some(issue => issue.rule === 'semantic-profile-invalid'));
  });
});

describe('semantic structure bindings', () => {
  it('rejects duplicate landmarks and invalid structural order', () => {
    const found = rules('<main><h1>A</h1></main><header>Late</header><main><h1>B</h1></main><footer>End</footer>');
    assert(found.includes('duplicate-main-landmark'));
    assert(found.includes('duplicate-primary-heading'));
    assert(found.includes('structural-order'));
  });

  it('ignores nested component headers and footers for page ordering', () => {
    const found = rules('<header>Page</header><main><article><footer>Card footer</footer><header>Card header</header></article></main><footer>Page footer</footer>');
    assert(!found.includes('structural-order'));
  });

  it('validates unique safe macro anchors', () => {
    const found = rules('<div data-macro-anchor="Bad Anchor"></div><div data-macro-anchor="content"></div><div data-macro-anchor="content"></div>');
    assert(found.includes('macro-anchor-invalid'));
    assert(found.includes('macro-anchor-duplicate'));
  });

  it('validates explicitly bound FSM recipes and states only', () => {
    assert.deepEqual(rules('<dialog data-state="open"></dialog>'), []);
    assert(rules('<dialog data-fsm-state="open"></dialog>').includes('fsm-binding-missing'));
    assert(rules('<dialog data-fsm-recipe="missing" data-fsm-state="open"></dialog>').includes('fsm-recipe-invalid'));
    assert(rules('<dialog data-fsm-recipe="dialog"></dialog>').includes('fsm-state-missing'));
    assert(rules('<dialog data-fsm-recipe="dialog" data-fsm-state="unknown"></dialog>').includes('fsm-state-invalid'));
    assert(!rules('<dialog data-fsm-recipe="dialog" data-fsm-state="open"></dialog>').some(rule => rule.startsWith('fsm-')));
  });
});

describe('HTML parsing diagnostics', () => {
  it('reports unclosed tags with position information', () => {
    const result = parseHtmlWithDiagnostics('<div><p>Text');
    assert.equal(result.nodes.length, 2);
    assert(result.diagnostics.some(d => d.code === 'unclosed-tag' && d.message.includes('<p>')));
  });

  it('reports unmatched closing tags', () => {
    const result = parseHtmlWithDiagnostics('<div></span>');
    assert(result.diagnostics.some(d => d.code === 'unmatched-closing-tag' && d.message.includes('span')));
  });

  it('reports invalid tag names', () => {
    const result = parseHtmlWithDiagnostics('<123invalid>');
    assert(result.diagnostics.some(d => d.code === 'invalid-tag-name'));
  });

  it('includes line and column information in diagnostics', () => {
    const result = parseHtmlWithDiagnostics('line 1\n  </span>');
    const diagnostic = result.diagnostics.find(d => d.code === 'unmatched-closing-tag');
    assert.equal(diagnostic?.line, 2);
    assert.equal(diagnostic?.column, 3);
  });

  it('reports malformed quoted input at its source location', () => {
    const result = parseHtmlWithDiagnostics('first\n<div title="unterminated>');
    assert.equal(result.diagnostics[0]?.code, 'unclosed-tag');
    assert.equal(result.diagnostics[0]?.line, 2);
    assert.equal(result.diagnostics[0]?.column, 1);
  });

  it('handles well-formed HTML without diagnostics', () => {
    const result = parseHtmlWithDiagnostics('<div><p>Text</p></div>');
    assert.equal(result.diagnostics.length, 0);
  });

  it('returns bounded parser diagnostics with line and column', () => {
    const result = validateComposition('<main>\n  </span>');
    const diagnostic = result.issues.find(issue => issue.rule === 'html-parser-unmatched-closing-tag');
    assert.equal(diagnostic?.line, 2);
    assert.equal(diagnostic?.column, 3);
    assert(result.issues.length <= 24);
  });
});
