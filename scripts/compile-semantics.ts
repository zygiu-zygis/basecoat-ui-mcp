#!/usr/bin/env node
// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Compile semantic design system registry and generate snapshot.
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { compileSemantics, canonicalJson } from '../src/semantics/compiler.js';
import { DEFAULT_SEMANTICS_INPUT } from '../src/semantics/fixtures.js';

const CHECK_MODE = process.argv.includes('--check');

async function main(): Promise<void> {
  console.log('Compiling semantic design system...');
  
  const { registry, diagnostics } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
  
  // Report diagnostics
  const errors = diagnostics.filter(d => d.severity === 'error');
  const warnings = diagnostics.filter(d => d.severity === 'warning');
  
  if (warnings.length > 0) {
    console.warn('\nWarnings:');
    for (const warning of warnings) {
      console.warn(`  ${warning.code}: ${warning.message}`);
    }
  }
  
  if (errors.length > 0) {
    console.error('\nErrors:');
    for (const error of errors) {
      console.error(`  ${error.code}: ${error.message}`);
    }
    process.exit(1);
  }
  
  console.log(`OK: Compilation successful (${warnings.length} warnings)`);
  console.log(`  Registry revision: ${registry.revision}`);
  console.log(`  Rhythm profiles: ${Object.keys(registry.rhythmProfiles).length}`);
  console.log(`  FSM recipes: ${Object.keys(registry.fsmRecipes).length}`);
  console.log(`  Aliases: ${Object.keys(registry.aliases).length}`);
  
  // Write snapshot
  const snapshotPath = join(dirname(new URL(import.meta.url).pathname), '../src/semantics/semantics.snapshot.json');
  
  if (CHECK_MODE) {
    // Check if existing snapshot matches
    if (existsSync(snapshotPath)) {
      const { readFileSync } = await import('node:fs');
      const existing = readFileSync(snapshotPath, 'utf8');
      const expectedContent = canonicalJson(registry);
      
      if (existing.trim() === expectedContent.trim()) {
        console.log('OK: Existing snapshot is up to date');
        return;
      } else {
        console.error('ERROR: Snapshot is outdated, run without --check to update');
        process.exit(1);
      }
    } else {
      console.error('ERROR: Snapshot does not exist, run without --check to create');
      process.exit(1);
    }
  }
  
  // Ensure directory exists
  const dir = dirname(snapshotPath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  
  // Write snapshot
  const content = canonicalJson(registry);
  writeFileSync(snapshotPath, content, 'utf8');
  
  console.log(`OK: Snapshot written: ${snapshotPath}`);
}

main().catch(error => {
  console.error('Failed to compile semantics:', error);
  process.exit(1);
});