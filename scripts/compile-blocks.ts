// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Compile authoring macros into the immutable registry snapshot (offline).
import { readdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileRegistry } from '../src/macros/compiler.js';
import { authoringRegistryInputSchema } from '../src/macros/schema.js';
import type {
  AuthoringMacroBlock,
  AuthoringRecipe,
  AuthoringRegistryInput,
  DesignProfile,
  RuleTemplate,
} from '../src/macros/types.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AUTHORING = join(ROOT, 'src/macros/authoring');
const SNAPSHOT = join(ROOT, 'src/macros/registry.snapshot.json');

async function readJsonFiles<T>(dir: string): Promise<T[]> {
  let names: string[];
  try {
    names = await readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }
  const out: T[] = [];
  for (const name of names.sort()) {
    if (!name.endsWith('.json')) continue;
    const raw = JSON.parse(await readFile(join(dir, name), 'utf8')) as T;
    out.push(raw);
  }
  return out;
}

export async function loadAuthoringInput(
  authoringRoot = AUTHORING,
): Promise<AuthoringRegistryInput> {
  const [blocks, recipes, profiles, rules] = await Promise.all([
    readJsonFiles<AuthoringMacroBlock>(join(authoringRoot, 'blocks')),
    readJsonFiles<AuthoringRecipe>(join(authoringRoot, 'recipes')),
    readJsonFiles<DesignProfile>(join(authoringRoot, 'profiles')),
    readJsonFiles<RuleTemplate>(join(authoringRoot, 'rules')),
  ]);
  return authoringRegistryInputSchema.parse({
    schemaVersion: 1,
    blocks,
    recipes,
    profiles,
    rules,
  });
}

async function atomicWrite(path: string, contents: string): Promise<void> {
  const temp = `${path}.${process.pid}.${Date.now()}.tmp`;
  await writeFile(temp, contents, 'utf8');
  await rename(temp, path);
}

export async function compileBlocksToSnapshot(options?: {
  authoringRoot?: string;
  snapshotPath?: string;
  checkOnly?: boolean;
}): Promise<{
  revision: string;
  diagnostics: ReturnType<typeof compileRegistry>['diagnostics'];
  aliasCount: number;
  wrote: boolean;
}> {
  const input = await loadAuthoringInput(options?.authoringRoot ?? AUTHORING);
  const { registry, diagnostics } = compileRegistry(input);
  const errors = diagnostics.filter(d => d.severity === 'error');
  if (errors.length > 0) {
    const summary = errors.map(d => `${d.code}: ${d.message}`).join('\n');
    throw new Error(`Macro registry compilation failed:\n${summary}`);
  }

  const encoded = `${JSON.stringify(registry, null, 2)}\n`;
  const snapshotPath = options?.snapshotPath ?? SNAPSHOT;
  let wrote = false;
  if (!options?.checkOnly) {
    await atomicWrite(snapshotPath, encoded);
    wrote = true;
  } else {
    try {
      const existing = await readFile(snapshotPath, 'utf8');
      if (existing !== encoded) {
        throw new Error('registry.snapshot.json is out of date; run compile-blocks without --check');
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new Error('registry.snapshot.json is missing; run compile-blocks');
      }
      throw error;
    }
  }

  return {
    revision: registry.revision,
    diagnostics,
    aliasCount: Object.keys(registry.aliases).length,
    wrote,
  };
}

async function main(): Promise<void> {
  const checkOnly = process.argv.includes('--check');
  const result = await compileBlocksToSnapshot({ checkOnly });
  const warnings = result.diagnostics.filter(d => d.severity === 'warning');
  console.log(
    JSON.stringify(
      {
        ok: true,
        wrote: result.wrote,
        checkOnly,
        revision: result.revision,
        aliasCount: result.aliasCount,
        warnings: warnings.map(w => ({ code: w.code, message: w.message })),
      },
      null,
      2,
    ),
  );
}

const isDirect =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isDirect) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  });
}
