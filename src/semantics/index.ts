// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Semantic design system: rhythm profiles, FSM recipes, and content-addressed compilation.
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { compileSemantics } from './compiler.js';
import { createSemanticsStore } from './store.js';
import { DEFAULT_SEMANTICS_INPUT } from './fixtures.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function packagedSemanticsDirectory(): string {
  const sourceDirectory = join(__dirname, '../../src/semantics');
  if (existsSync(join(sourceDirectory, 'semantics.snapshot.json'))) {
    return sourceDirectory;
  }
  return __dirname;
}

// Runtime loading is read-only. Snapshot generation belongs to compile:semantics.
const SEMANTICS_DIR = packagedSemanticsDirectory();
export const defaultSemanticsStore = createSemanticsStore(SEMANTICS_DIR);

// Compile and generate the initial snapshot
const { registry: defaultRegistry, diagnostics: defaultDiagnostics } = 
  compileSemantics(DEFAULT_SEMANTICS_INPUT);

if (defaultDiagnostics.some(d => d.severity === 'error')) {
  throw new Error(
    `Failed to compile default semantics: ${defaultDiagnostics
      .filter(d => d.severity === 'error')
      .map(d => d.message)
      .join('; ')}`
  );
}

// Export compiled registry for direct access
export { defaultRegistry };

// Export types and utilities (avoid SemanticsError conflicts)
export type * from './types.js';
export * from './schema.js';
export { 
  canonicalJson, 
  contentRef, 
  compileSemantics,
  type CompileSemanticsResult
} from './compiler.js';
export { 
  createSemanticsStore,
  type SemanticsStore
} from './store.js';
export * from './fixtures.js';

// Re-export key constants
export { DEFAULT_SEMANTICS_INPUT, DEFAULT_RHYTHM_PROFILE, DIALOG_FSM_RECIPE, COLLAPSIBLE_NAVIGATION_FSM_RECIPE } from './fixtures.js';