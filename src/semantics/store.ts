// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Immutable semantics registry store with content-addressed snapshots.
import {
  closeSync,
  constants,
  existsSync,
  fstatSync,
  lstatSync,
  openSync,
  readFileSync,
  readSync,
  realpathSync,
} from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { compileSemantics, contentRef } from './compiler.js';
import { compiledSemanticsRegistrySchema } from './schema.js';
import type {
  CompiledSemanticsRegistry,
  CompiledRhythmProfile,
  Ref,
  Id,
} from './types.js';
import { projectRhythmOverrideSchema } from './schema.js';

export const PROJECT_RHYTHM_OVERRIDE_MAX_BYTES = 65_536;

function isInsideRoot(rootReal: string, candidateReal: string): boolean {
  return candidateReal === rootReal || candidateReal.startsWith(rootReal + sep);
}

function readProjectRhythmOverride(projectRoot: string, path: string): string | null {
  let rootReal: string;
  try {
    rootReal = realpathSync(projectRoot);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  const overrideDir = join(projectRoot, '.basecoat');
  try {
    const dirStat = lstatSync(overrideDir);
    if (dirStat.isSymbolicLink() || !dirStat.isDirectory()) return null;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }

  let pathStat;
  try {
    pathStat = lstatSync(path);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
  if (pathStat.isSymbolicLink() || !pathStat.isFile()) return null;

  let descriptor: number | undefined;
  try {
    descriptor = openSync(
      path,
      constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
    const fileStat = fstatSync(descriptor);
    if (
      !fileStat.isFile()
      || fileStat.dev !== pathStat.dev
      || fileStat.ino !== pathStat.ino
      || fileStat.size > PROJECT_RHYTHM_OVERRIDE_MAX_BYTES
    ) {
      return null;
    }

    let fileReal: string;
    try {
      fileReal = realpathSync(path);
    } catch {
      return null;
    }
    if (!isInsideRoot(rootReal, fileReal)) return null;
    if (resolve(fileReal) !== fileReal) return null;

    const content = Buffer.alloc(PROJECT_RHYTHM_OVERRIDE_MAX_BYTES + 1);
    let length = 0;
    while (length < content.length) {
      const bytesRead = readSync(descriptor, content, length, content.length - length, null);
      if (bytesRead === 0) break;
      length += bytesRead;
    }
    if (length > PROJECT_RHYTHM_OVERRIDE_MAX_BYTES) return null;
    return content.toString('utf8', 0, length);
  } finally {
    if (descriptor !== undefined) closeSync(descriptor);
  }
}

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

  /** Get the current registry revision. */
  getRevision(): Ref;
}

/** File-based semantics store with immutable snapshots. */
export class FileSemanticsStore implements SemanticsStore {
  private snapshotPath: string;
  private cachedRegistry: CompiledSemanticsRegistry | null = null;

  constructor(baseDir: string) {
    this.snapshotPath = join(baseDir, 'semantics.snapshot.json');
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

      for (const [ref, profile] of Object.entries(validatedRegistry.rhythmProfiles)) {
        if (contentRef(profile) !== ref) {
          throw new SemanticsError('RECORD_REF_MISMATCH', `Rhythm profile record key does not match content: ${profile.id}`);
        }
      }
      for (const [ref, recipe] of Object.entries(validatedRegistry.fsmRecipes)) {
        if (contentRef(recipe) !== ref) {
          throw new SemanticsError('RECORD_REF_MISMATCH', `FSM recipe record key does not match content: ${recipe.id}`);
        }
      }
      for (const [id, ref] of Object.entries(validatedRegistry.aliases)) {
        const record = validatedRegistry.rhythmProfiles[ref] ?? validatedRegistry.fsmRecipes[ref];
        if (!record) {
          throw new SemanticsError('ALIAS_REF_INVALID', `Semantic alias does not resolve: ${id}`);
        }
        if (record.id !== id) {
          throw new SemanticsError('ALIAS_ID_MISMATCH', `Semantic alias does not match record identity: ${id}`);
        }
      }

      // Verify the revision only after every record and alias has been validated.
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

  getEffectiveRhythmProfile(profileId: Id, projectRoot?: string): CompiledRhythmProfile {
    const registry = this.getRegistry();
    const resolvedId = (profileId === 'comfortable' || profileId === 'app-default' ? 'default' : profileId) as Id;
    const profileRef = registry.aliases[resolvedId] ?? registry.aliases[profileId];

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
    try {
      const overrideContent = readProjectRhythmOverride(projectRoot, overridePath);
      if (overrideContent === null) return baseProfile;
      const overrideData = JSON.parse(overrideContent);
      const override = projectRhythmOverrideSchema.parse(overrideData);

      // Verify override targets this profile
      if (override.baseProfile !== profileId) {
        return baseProfile;
      }

      // Apply overrides: replace mappings with the same ID in place, keep base order.
      const effectiveFamilies = baseProfile.families.map(family => {
        const overrideById = new Map(
          override.overrideMappings
            .filter(mapping => family.mappings.some(baseMapping => baseMapping.id === mapping.id))
            .map(mapping => [mapping.id, mapping]),
        );

        if (overrideById.size === 0) {
          return family;
        }

        const effectiveMappings = family.mappings.map(
          mapping => overrideById.get(mapping.id) ?? mapping,
        );

        return {
          ...family,
          mappings: effectiveMappings,
        };
      });

      const compiled = compileSemantics({
        schemaVersion: 1,
        rhythmProfiles: [{
          schemaVersion: 1,
          id: baseProfile.id,
          description: baseProfile.description,
          families: effectiveFamilies,
        }],
        fsmRecipes: [],
      });
      if (compiled.diagnostics.some(diagnostic => diagnostic.severity === 'error')) {
        return baseProfile;
      }
      const effectiveRef = compiled.registry.aliases[baseProfile.id];
      return effectiveRef ? compiled.registry.rhythmProfiles[effectiveRef] ?? baseProfile : baseProfile;
    } catch {
      // Malformed project data never mutates or replaces the packaged profile.
      return baseProfile;
    }
  }
}

/** Create a semantics store instance. */
export function createSemanticsStore(baseDir: string): SemanticsStore {
  return new FileSemanticsStore(baseDir);
}