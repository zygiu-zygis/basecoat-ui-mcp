// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Semantic tools: rhythm rules and FSM recipes with bounded pagination.
import { createHash } from 'node:crypto';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { z } from 'zod';
import { contentRef, defaultSemanticsStore } from './index.js';
import {
  MacroError,
  boundedMacroResult,
  createCursorFactory,
  pageRecords,
  validateMacroCursor,
} from '../macros/packets.js';
import { LIMITS, idSchema } from '../macros/schema.js';
import type {
  CompiledRhythmProfile,
  CompiledFsmRecipe,
  RhythmFamily,
  SemanticMapping,
} from './types.js';

// --- Input Schemas ---

export const getRhythmRulesInputShape = {
  profile: idSchema.optional(),
  family: idSchema.optional(),
  limit: z.number().int().min(1).max(32).optional(),
  cursor: z.string().min(1).max(LIMITS.cursorMaxBytes).optional(),
};

export const getFsmRecipeInputShape = {
  recipe: idSchema.optional(),
  section: z.enum(['states', 'events', 'guards', 'actions', 'transitions']).optional(),
  limit: z.number().int().min(1).max(32).optional(),
  cursor: z.string().min(1).max(LIMITS.cursorMaxBytes).optional(),
};

// --- Helper Types ---

interface RhythmRuleEntry {
  profileId: string;
  profileDescription: string;
  profileRef: string;
  familyId: string;
  familyDescription: string;
  mapping: SemanticMapping;
}

interface FsmRecipeEntry {
  recipeId: string;
  recipeDescription: string;
  recipeRef: string;
  section: string;
  item: unknown;
}

// --- Utilities ---

function compactFingerprint(parts: string[]): string {
  return createHash('sha256').update(parts.join('\0'), 'utf8').digest('hex').slice(0, 32);
}

function macroErrorResult(
  error: unknown,
  extras: Record<string, unknown> = {},
): CallToolResult {
  let code = 'INTERNAL_ERROR';
  let message: string | undefined;
  const details: Record<string, unknown> = { ...extras };

  if (error instanceof MacroError) {
    code = error.code;
    if (error.message && error.message !== error.code) {
      message = error.message.length <= LIMITS.messageMax ? error.message : error.message.slice(0, LIMITS.messageMax);
    }
  } else if (error instanceof z.ZodError) {
    code = 'INVALID_INPUT';
    message = error.issues[0]?.message ?? 'Invalid input';
    message = message.length <= LIMITS.messageMax ? message : message.slice(0, LIMITS.messageMax);
  } else if (error instanceof Error && error.message) {
    message = error.message.length <= LIMITS.messageMax ? error.message : error.message.slice(0, LIMITS.messageMax);
  }

  const packet = {
    v: 1 as const,
    error: {
      code,
      ...(message ? { message } : {}),
      ...details,
    },
  };

  try {
    return boundedMacroResult(packet, true);
  } catch {
    return boundedMacroResult({ v: 1, error: { code } }, true);
  }
}

// --- Rhythm Rules Handler ---

export async function handleGetRhythmRules(
  input: z.infer<z.ZodObject<typeof getRhythmRulesInputShape>>,
  projectRoot?: string,
): Promise<CallToolResult> {
  try {
    const registry = defaultSemanticsStore.getRegistry();
    let { profile: profileFilter, family: familyFilter, limit, cursor } = input;
    const FAMILY_ALIASES: Record<string, string> = {
      surface: 'surfaces',
      border: 'borders',
      layouts: 'layout',
    };
    if (familyFilter && FAMILY_ALIASES[familyFilter]) {
      familyFilter = FAMILY_ALIASES[familyFilter];
    }
    if (profileFilter && !Object.values(registry.rhythmProfiles).some(profile => profile.id === profileFilter)) {
      throw new MacroError('NOT_FOUND', `Unknown rhythm profile: ${profileFilter}`);
    }
    if (
      familyFilter &&
      !Object.values(registry.rhythmProfiles).some(
        profile => (!profileFilter || profile.id === profileFilter) && profile.families.some(family => family.id === familyFilter),
      )
    ) {
      throw new MacroError('NOT_FOUND', `Unknown rhythm family: ${familyFilter}`);
    }

    // Collect all rhythm rule entries
    const allEntries: RhythmRuleEntry[] = [];

    const effectiveProfiles = Object.values(registry.rhythmProfiles)
      .map(profile => {
        const effective = defaultSemanticsStore.getEffectiveRhythmProfile(profile.id, projectRoot);
        return { profile: effective, ref: contentRef(effective) };
      })
      .sort((a, b) => a.profile.id.localeCompare(b.profile.id));
    const effectiveRevision = contentRef(effectiveProfiles.map(({ profile, ref }) => [profile.id, ref]));

    for (const { ref, profile } of effectiveProfiles) {
      if (profileFilter && profile.id !== profileFilter) continue;

      for (const family of profile.families) {
        if (familyFilter && family.id !== familyFilter) continue;

        for (const mapping of family.mappings) {
          allEntries.push({
            profileId: profile.id,
            profileDescription: profile.description,
            profileRef: ref,
            familyId: family.id,
            familyDescription: family.description,
            mapping,
          });
        }
      }
    }

    // Sort by profile ID, then family ID, then mapping ID for stable pagination
    allEntries.sort((a, b) => {
      const profileCmp = a.profileId.localeCompare(b.profileId);
      if (profileCmp !== 0) return profileCmp;

      const familyCmp = a.familyId.localeCompare(b.familyId);
      if (familyCmp !== 0) return familyCmp;

      return a.mapping.id.localeCompare(b.mapping.id);
    });

    // Handle cursor validation and pagination
    const fingerprint = compactFingerprint([
      'get_rhythm_rules',
      profileFilter ?? '',
      familyFilter ?? '',
      registry.revision,
    ]);

    let start = 0;
    if (cursor) {
      const payload = validateMacroCursor(cursor, {
        fingerprint,
        snapshot: effectiveRevision,
        registryRevision: registry.revision,
      });
      start = payload.offset;
    }

    const cursorFactory = createCursorFactory({
      v: 1,
      fingerprint,
      snapshot: effectiveRevision,
      registryRevision: registry.revision,
    });

    const header = {
      v: 1 as const,
      rhythmRules: {
        total: allEntries.length,
        registryRevision: registry.revision,
        effectiveRevision,
        ...(profileFilter ? { profileFilter } : {}),
        ...(familyFilter ? { familyFilter } : {}),
      },
    };

    return pageRecords(allEntries, start, header, cursorFactory, { maxItems: limit });

  } catch (error) {
    return macroErrorResult(error);
  }
}

// --- FSM Recipe Handler ---

export async function handleGetFsmRecipe(
  input: z.infer<z.ZodObject<typeof getFsmRecipeInputShape>>,
): Promise<CallToolResult> {
  try {
    const registry = defaultSemanticsStore.getRegistry();
    const { recipe: recipeFilter, section: sectionFilter, limit, cursor } = input;
    if (recipeFilter && !Object.values(registry.fsmRecipes).some(recipe => recipe.id === recipeFilter)) {
      throw new MacroError('NOT_FOUND', `Unknown FSM recipe: ${recipeFilter}`);
    }

    // Collect all FSM recipe entries
    const allEntries: FsmRecipeEntry[] = [];

    for (const [ref, recipe] of Object.entries(registry.fsmRecipes)) {
      if (recipeFilter && recipe.id !== recipeFilter) continue;

      const sections = [
        { name: 'states', items: recipe.states },
        { name: 'events', items: recipe.events },
        { name: 'guards', items: recipe.guards },
        { name: 'actions', items: recipe.actions },
        { name: 'transitions', items: recipe.transitions },
      ];

      for (const section of sections) {
        if (sectionFilter && section.name !== sectionFilter) continue;

        for (const item of section.items) {
          allEntries.push({
            recipeId: recipe.id,
            recipeDescription: recipe.description,
            recipeRef: ref,
            section: section.name,
            item,
          });
        }
      }
    }

    // Sort by recipe ID, then section, then item ID for stable pagination
    allEntries.sort((a, b) => {
      const recipeCmp = a.recipeId.localeCompare(b.recipeId);
      if (recipeCmp !== 0) return recipeCmp;

      const sectionCmp = a.section.localeCompare(b.section);
      if (sectionCmp !== 0) return sectionCmp;

      const aId = typeof a.item === 'object' && a.item !== null && 'id' in a.item
        ? String(a.item.id)
        : '';
      const bId = typeof b.item === 'object' && b.item !== null && 'id' in b.item
        ? String(b.item.id)
        : '';
      return aId.localeCompare(bId);
    });

    // Handle cursor validation and pagination
    const fingerprint = compactFingerprint([
      'get_fsm_recipe',
      recipeFilter ?? '',
      sectionFilter ?? '',
      registry.revision,
    ]);

    let start = 0;
    if (cursor) {
      const payload = validateMacroCursor(cursor, {
        fingerprint,
        snapshot: registry.revision,
        registryRevision: registry.revision,
      });
      start = payload.offset;
    }

    const cursorFactory = createCursorFactory({
      v: 1,
      fingerprint,
      snapshot: registry.revision,
      registryRevision: registry.revision,
    });

    const header = {
      v: 1 as const,
      fsmRecipe: {
        total: allEntries.length,
        registryRevision: registry.revision,
        ...(recipeFilter ? { recipeFilter } : {}),
        ...(sectionFilter ? { sectionFilter } : {}),
      },
    };

    return pageRecords(allEntries, start, header, cursorFactory, { maxItems: limit });

  } catch (error) {
    return macroErrorResult(error);
  }
}