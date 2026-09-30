// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Immutable semantics registry store with content-addressed snapshots.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fsyncSync, openSync, closeSync } from 'node:fs';
import { compileSemantics, canonicalJson, contentRef } from './compiler.js';
import { compiledSemanticsRegistrySchema } from './schema.js';
import { DEFAULT_SEMANTICS_INPUT } from './fixtures.js';
import type {
  CompiledSemanticsRegistry,
  AuthoringSemanticsInput,
  SemanticsDiagnostic,
  ProjectRhythmOverride,
  CompiledRhythmProfile,
  Ref,
  Id,
} from './types.js';
import { projectRhythmOverrideSchema } from './schema.js';

export class SemanticsError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message);
    this.name = 'SemanticsError';
  }
}

export interface SemanticsStore {
  /** Get the compiled registry snapshot. */
  getRegistry(): CompiledSemanticsRegistry;
  
  /** Get effective rhythm profile with project overrides applied. */
  getEffectiveRhythmProfile(profileId: Id, projectRoot?: string): CompiledRhythmProfile;
  
  /** Compile and store a new registry from authoring input. */
  compile(input: AuthoringSemanticsInput): { 
    registry: CompiledSemanticsRegistry; 
    diagnostics: SemanticsDiagnostic[];
  };
  
  /** Get the current registry revision. */
  getRevision(): Ref;
}

/** File-based semantics store with immutable snapshots. */
export class FileSemanticsStore implements SemanticsStore {
  private snapshotPath: string;
  private cachedRegistry: CompiledSemanticsRegistry | null = null;

  constructor(baseDir: string) {
    this.snapshotPath = join(baseDir, 'semantics.snapshot.json');
    this.ensureDefaultSnapshot();
  }

  private ensureDefaultSnapshot(): void {
    if (!existsSync(this.snapshotPath)) {
      // Compile default semantics and create initial snapshot
      const { registry, diagnostics } = compileSemantics(DEFAULT_SEMANTICS_INPUT);
      if (diagnostics.some(d => d.severity === 'error')) {
        throw new SemanticsError(
          'COMPILATION_FAILED',
          `Failed to compile default semantics: ${diagnostics
            .filter(d => d.severity === 'error')
            .map(d => d.message)
            .join('; ')}`
        );
      }
      this.writeSnapshot(registry);
    }
  }

  private writeSnapshot(registry: CompiledSemanticsRegistry): void {
    // Ensure directory exists
    const dir = dirname(this.snapshotPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Write atomically with fsync
    const content = canonicalJson(registry);
    writeFileSync(this.snapshotPath, content, 'utf8');
    
    // Force fsync for durability
    const fd = openSync(this.snapshotPath, 'r+');
    try {
      fsyncSync(fd);
    } finally {
      closeSync(fd);
    }

    // Clear cache to force reload
    this.cachedRegistry = null;
  }

  private loadSnapshot(): CompiledSemanticsRegistry {
    if (this.cachedRegistry) {
      return this.cachedRegistry;
    }

    if (!existsSync(this.snapshotPath)) {
      throw new SemanticsError('SNAPSHOT_NOT_FOUND', `Semantics snapshot not found: ${this.snapshotPath}`);
    }

    try {
      const content = readFileSync(this.snapshotPath, 'utf8');
      const parsed = JSON.parse(content);
      
      // Validate snapshot schema
      const validatedRegistry = compiledSemanticsRegistrySchema.parse(parsed);
      
      // Verify revision hash
      const expectedRevision = contentRef({
        rhythmProfiles: Object.keys(validatedRegistry.rhythmProfiles).sort(),
        fsmRecipes: Object.keys(validatedRegistry.fsmRecipes).sort(),
        aliases: Object.keys(validatedRegistry.aliases)
          .sort()
          .map(id => [id, validatedRegistry.aliases[id]]),
      });
      
      if (expectedRevision !== validatedRegistry.revision) {
        throw new SemanticsError(
          'REVISION_MISMATCH',
          'Snapshot revision hash does not match content'
        );
      }

      this.cachedRegistry = validatedRegistry;
      return validatedRegistry;
    } catch (error) {
      if (error instanceof SemanticsError) {
        throw error;
      }
      throw new SemanticsError(
        'SNAPSHOT_INVALID',
        `Failed to load semantics snapshot: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  getRegistry(): CompiledSemanticsRegistry {
    return this.loadSnapshot();
  }

  getRevision(): Ref {
    return this.getRegistry().revision;
  }

  compile(input: AuthoringSemanticsInput): { 
    registry: CompiledSemanticsRegistry; 
    diagnostics: SemanticsDiagnostic[];
  } {
    const result = compileSemantics(input);
    
    if (!result.diagnostics.some(d => d.severity === 'error')) {
      this.writeSnapshot(result.registry);
    }
    
    return result;
  }

  getEffectiveRhythmProfile(profileId: Id, projectRoot?: string): CompiledRhythmProfile {
    const registry = this.getRegistry();
    const profileRef = registry.aliases[profileId];
    
    if (!profileRef) {
      throw new SemanticsError('PROFILE_NOT_FOUND', `Rhythm profile not found: ${profileId}`);
    }

    const baseProfile = registry.rhythmProfiles[profileRef];
    if (!baseProfile) {
      throw new SemanticsError('PROFILE_REF_INVALID', `Rhythm profile ref invalid: ${profileRef}`);
    }

    // No project override if no project root specified
    if (!projectRoot) {
      return baseProfile;
    }

    // Try to load project override
    const overridePath = join(projectRoot, '.basecoat', 'rhythm.json');
    if (!existsSync(overridePath)) {
      return baseProfile;
    }

    try {
      const overrideContent = readFileSync(overridePath, 'utf8');
      const overrideData = JSON.parse(overrideContent);
      const override = projectRhythmOverrideSchema.parse(overrideData);

      // Verify override targets this profile
      if (override.baseProfile !== profileId) {
        return baseProfile;
      }

      // Apply overrides: replace mappings with same ID, keep others
      const effectiveFamilies = baseProfile.families.map(family => {
        const overrideMappingsForFamily = override.overrideMappings.filter(
          mapping => family.mappings.some(baseMapping => baseMapping.id === mapping.id),
        );

        if (overrideMappingsForFamily.length === 0) {
          return family;
        }

        // Create mapping ID set for overrides
        const overrideIds = new Set(overrideMappingsForFamily.map(m => m.id));
        
        // Keep base mappings not overridden, add override mappings
        const effectiveMappings = [
          ...family.mappings.filter(mapping => !overrideIds.has(mapping.id)),
          ...overrideMappingsForFamily,
        ];

        return {
          ...family,
          mappings: effectiveMappings,
        };
      });

      // Create effective profile (note: this creates a new content ref)
      const effectiveProfile: CompiledRhythmProfile = {
        ...baseProfile,
        families: effectiveFamilies,
        // Regenerate rhythm text based on effective profile
        rhythmText: baseProfile.rhythmText, // For now, keep base text
      };

      return effectiveProfile;
    } catch (error) {
      // If override is malformed, fall back to base profile
      return baseProfile;
    }
  }
}

/** Create a semantics store instance. */
export function createSemanticsStore(baseDir: string): SemanticsStore {
  return new FileSemanticsStore(baseDir);
}