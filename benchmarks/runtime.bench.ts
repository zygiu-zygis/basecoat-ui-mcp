// Author and maintainer: Žygimantas Jasiulionis / Intellmedia.
// Manual runtime benchmark harness. Not part of npm test; no wall-clock assertions.
// Run: node --import tsx benchmarks/runtime.bench.ts
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { fileURLToPath } from 'node:url';
import { contentHash } from '../src/macros/store.js';
import { getCompiledRegistry } from '../src/macros/registry.js';
import { contentRef, createSemanticsStore, DEFAULT_SEMANTICS_INPUT, compileSemantics, canonicalJson } from '../src/semantics/index.js';
import { parseHtmlWithDiagnostics } from '../src/tools/html.js';
import { validateComposition } from '../src/tools/validate.js';

interface Stats {
  name: string;
  iterations: number;
  medianMs: number;
  p95Ms: number;
  worstMs: number;
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[index]!;
}

function summarize(name: string, samples: number[]): Stats {
  const sorted = [...samples].sort((a, b) => a - b);
  return {
    name,
    iterations: samples.length,
    medianMs: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    worstMs: sorted[sorted.length - 1]!,
  };
}

function measure(name: string, iterations: number, warmup: number, fn: () => void): Stats {
  for (let i = 0; i < warmup; i++) fn();
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    samples.push(performance.now() - start);
  }
  return summarize(name, samples);
}

async function measureAsync(name: string, iterations: number, warmup: number, fn: () => Promise<void>): Promise<Stats> {
  for (let i = 0; i < warmup; i++) await fn();
  const samples: number[] = [];
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    await fn();
    samples.push(performance.now() - start);
  }
  return summarize(name, samples);
}

function nestedDivs(count: number): string {
  return `${'<div>'.repeat(count)}${'</div>'.repeat(count)}`;
}

function padToBytes(prefix: string, targetBytes: number): string {
  const prefixBytes = Buffer.byteLength(prefix, 'utf8');
  if (prefixBytes >= targetBytes) return prefix.slice(0, targetBytes);
  return prefix + 'a'.repeat(targetBytes - prefixBytes);
}

function printStats(stats: Stats[]): void {
  for (const row of stats) {
    console.log(
      JSON.stringify({
        name: row.name,
        iterations: row.iterations,
        medianMs: Number(row.medianMs.toFixed(4)),
        p95Ms: Number(row.p95Ms.toFixed(4)),
        worstMs: Number(row.worstMs.toFixed(4)),
      }),
    );
  }
}

async function startupOnce(): Promise<number> {
  const serverPath = fileURLToPath(new URL('../dist/server/stdio.js', import.meta.url));
  const projectRoot = await mkdtemp(join(tmpdir(), 'basecoat-bench-start-'));
  const transport = new StdioClientTransport({
    command: process.execPath,
    args: [serverPath, '--project-root', projectRoot],
    cwd: projectRoot,
    stderr: 'pipe',
  });
  const client = new Client({ name: 'runtime-bench', version: '0.0.0' });
  const start = performance.now();
  try {
    await client.connect(transport);
    await client.listTools();
    return performance.now() - start;
  } finally {
    await client.close().catch(() => undefined);
    await rm(projectRoot, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  const results: Stats[] = [];
  const small = '<main class="p-4"><h1 class="text-lg">Hello</h1><p class="text-muted">Copy</p></main>';
  const typical = nestedDivs(40) + '<main class="gap-4">' + '<section class="card p-4"><h2>Title</h2><p>Body</p></section>'.repeat(20) + '</main>';
  const exact = padToBytes(nestedDivs(200) + '<main class="p-4">', 65_536);
  const malformed = `${nestedDivs(50)}<div><span>${'x'.repeat(1000)}`;
  const deep = nestedDivs(500);

  results.push(measure('parse.small', 80, 10, () => { parseHtmlWithDiagnostics(small); }));
  results.push(measure('parse.typical', 40, 5, () => { parseHtmlWithDiagnostics(typical); }));
  results.push(measure('parse.65536', 12, 2, () => { parseHtmlWithDiagnostics(exact); }));
  results.push(measure('parse.deep500', 20, 3, () => { parseHtmlWithDiagnostics(deep); }));
  results.push(measure('parse.malformed', 30, 5, () => { parseHtmlWithDiagnostics(malformed); }));

  results.push(measure('validate.small', 40, 5, () => { validateComposition(small); }));
  results.push(measure('validate.typical', 20, 3, () => { validateComposition(typical); }));
  results.push(measure('validate.65536', 8, 1, () => { validateComposition(exact); }));
  results.push(measure('validate.semantic.typical', 20, 3, () => {
    validateComposition(typical, { semanticProfile: 'default' });
  }));
  results.push(measure('validate.malformed', 20, 3, () => { validateComposition(malformed); }));

  // Scaling probe for line/column cost: many tags near end of large input.
  const tagCounts = [50, 100, 200, 400];
  for (const count of tagCounts) {
    const body = `${'a'.repeat(40_000)}${nestedDivs(count)}`;
    results.push(measure(`parse.tags${count}_after40k`, 10, 2, () => {
      parseHtmlWithDiagnostics(body);
    }));
  }

  const { registry } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
  results.push(measure('hash.semanticsRevision', 40, 5, () => {
    contentRef({
      rhythmProfiles: Object.keys(registry.rhythmProfiles).sort(),
      fsmRecipes: Object.keys(registry.fsmRecipes).sort(),
      aliases: Object.keys(registry.aliases).sort().map(id => [id, registry.aliases[id]]),
    });
  }));
  const macro = getCompiledRegistry();
  results.push(measure('hash.macroRegistry', 20, 3, () => {
    contentHash({
      blocks: Object.keys(macro.blocks).sort(),
      recipes: Object.keys(macro.recipes).sort(),
      profiles: Object.keys(macro.profiles).sort(),
      revision: macro.revision,
    });
  }));
  results.push(measure('hash.sha256.64kib', 40, 5, () => {
    createHash('sha256').update(exact, 'utf8').digest('hex');
  }));

  const overrideRoot = await mkdtemp(join(tmpdir(), 'basecoat-bench-override-'));
  try {
    await writeFile(join(overrideRoot, 'semantics.snapshot.json'), canonicalJson(registry));
    await mkdir(join(overrideRoot, '.basecoat'));
    const store = createSemanticsStore(overrideRoot);
    results.push(measure('semantics.defaultProfile', 40, 5, () => {
      store.getEffectiveRhythmProfile('default');
    }));
    results.push(measure('semantics.missingOverride', 40, 5, () => {
      store.getEffectiveRhythmProfile('default', overrideRoot);
    }));
    await writeFile(join(overrideRoot, '.basecoat', 'rhythm.json'), JSON.stringify({
      schemaVersion: 1,
      baseProfile: 'default',
      overrideMappings: [{
        id: 'gap-rhythm-sm',
        value: 'gap-3',
        description: 'Bench override',
      }],
    }));
    results.push(measure('semantics.validOverride', 30, 5, () => {
      store.getEffectiveRhythmProfile('default', overrideRoot);
    }));
    await writeFile(join(overrideRoot, '.basecoat', 'rhythm.json'), '{not-json');
    results.push(measure('semantics.malformedOverride', 30, 5, () => {
      store.getEffectiveRhythmProfile('default', overrideRoot);
    }));
  } finally {
    await rm(overrideRoot, { recursive: true, force: true });
  }

  const startupSamples: number[] = [];
  for (let i = 0; i < 5; i++) {
    startupSamples.push(await startupOnce());
  }
  results.push(summarize('startup.stdio.listTools', startupSamples));

  // Keep an async path exercised for future expansion.
  results.push(await measureAsync('async.noop', 5, 1, async () => undefined));

  console.log('# runtime.bench results');
  printStats(results.filter(row => row.name !== 'async.noop'));
}

await main();
