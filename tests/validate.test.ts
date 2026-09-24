// Copyright Žygimantas Jasiulionis / Intellmedia.
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { parseHtml, scriptImports } from '../src/tools/html.js';
import { validateComposition } from '../src/tools/validate.js';

const rules = (code: string) => validateComposition(code).issues.map(issue => issue.rule);

describe('HTML lexer', () => {
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
    assert(rules('<button class="btn" data-variant="default"></button>').includes('button-variant'));
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
    assert(result.issues.every(issue => issue.severity === 'warning'));
    assert.equal(result.truncated, true);
    assert.equal(result.valid, false);
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
