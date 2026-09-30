// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Strict Zod schemas for semantic design system data. Unknown fields are rejected.
import { z } from 'zod';

// Reuse existing ID and ref patterns from macros
export const SAFE_ID_REGEX = /^[a-z][a-z0-9-]*$/;
export const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;

export const SEMANTICS_LIMITS = {
  idMax: 64,
  descriptionMax: 400,
  familiesMax: 16,
  mappingsMax: 128,
  statesMax: 32,
  eventsMax: 32,
  guardsMax: 16,
  actionsMax: 32,
  transitionsMax: 128,
  rhythmProfilesMax: 16,
  fsmRecipesMax: 32,
  aliasEntriesMax: 128,
  tailwindValueMax: 200,
  rhythmTextMax: 8000,
  metadataKeysMax: 16,
  metadataValueMax: 200,
  overrideMappingsMax: 64,
} as const;

export const semanticsIdSchema = z
  .string()
  .min(1)
  .max(SEMANTICS_LIMITS.idMax)
  .regex(SAFE_ID_REGEX, 'Id must be lowercase ASCII letters, digits, and hyphens');

export const semanticsRefSchema = z
  .string()
  .length(64)
  .regex(SHA256_HEX_REGEX, 'Ref must be a lowercase SHA-256 hex digest');

export const semanticsScalarSchema = z.union([
  z.string().max(SEMANTICS_LIMITS.metadataValueMax),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

// --- Semantic Mapping Schemas ---

export const semanticMappingSchema = z
  .object({
    id: semanticsIdSchema,
    value: z.string().min(1).max(SEMANTICS_LIMITS.tailwindValueMax),
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
  })
  .strict();

export const rhythmFamilySchema = z
  .object({
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
    mappings: z.array(semanticMappingSchema).max(SEMANTICS_LIMITS.mappingsMax),
  })
  .strict()
  .superRefine((family, ctx) => {
    // Ensure unique mapping IDs within family
    const ids = new Set<string>();
    for (const [index, mapping] of family.mappings.entries()) {
      if (ids.has(mapping.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate mapping ID: ${mapping.id}`,
          path: ['mappings', index, 'id'],
        });
      }
      ids.add(mapping.id);
    }
  });

// --- Rhythm Profile Schemas ---

export const authoringRhythmProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
    families: z.array(rhythmFamilySchema).max(SEMANTICS_LIMITS.familiesMax),
  })
  .strict()
  .superRefine((profile, ctx) => {
    // Ensure unique family IDs
    const familyIds = new Set<string>();
    for (const [index, family] of profile.families.entries()) {
      if (familyIds.has(family.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate family ID: ${family.id}`,
          path: ['families', index, 'id'],
        });
      }
      familyIds.add(family.id);
    }
  });

export const compiledRhythmProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
    families: z.array(rhythmFamilySchema).max(SEMANTICS_LIMITS.familiesMax),
    rhythmText: z.string().min(1).max(SEMANTICS_LIMITS.rhythmTextMax),
  })
  .strict();

// --- FSM Recipe Schemas ---

export const fsmStateSchema = z
  .object({
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
    initial: z.boolean().optional(),
    terminal: z.boolean().optional(),
  })
  .strict();

export const fsmEventSchema = z
  .object({
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
  })
  .strict();

export const fsmGuardSchema = z
  .object({
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
  })
  .strict();

export const fsmActionSchema = z
  .object({
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
    metadata: z
      .record(z.string().min(1).max(SEMANTICS_LIMITS.idMax), semanticsScalarSchema)
      .refine(obj => Object.keys(obj).length <= SEMANTICS_LIMITS.metadataKeysMax, {
        message: `At most ${SEMANTICS_LIMITS.metadataKeysMax} metadata keys`,
      })
      .optional(),
  })
  .strict();

export const fsmTransitionSchema = z
  .object({
    id: semanticsIdSchema,
    from: semanticsIdSchema,
    to: semanticsIdSchema,
    event: semanticsIdSchema,
    guard: semanticsIdSchema.optional(),
    action: semanticsIdSchema.optional(),
  })
  .strict();

export const authoringFsmRecipeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
    states: z.array(fsmStateSchema).min(1).max(SEMANTICS_LIMITS.statesMax),
    events: z.array(fsmEventSchema).max(SEMANTICS_LIMITS.eventsMax),
    guards: z.array(fsmGuardSchema).max(SEMANTICS_LIMITS.guardsMax),
    actions: z.array(fsmActionSchema).max(SEMANTICS_LIMITS.actionsMax),
    transitions: z.array(fsmTransitionSchema).max(SEMANTICS_LIMITS.transitionsMax),
  })
  .strict()
  .superRefine((recipe, ctx) => {
    // Collect all IDs for uniqueness checks
    const stateIds = new Set(recipe.states.map(s => s.id));
    const eventIds = new Set(recipe.events.map(e => e.id));
    const guardIds = new Set(recipe.guards.map(g => g.id));
    const actionIds = new Set(recipe.actions.map(a => a.id));

    // Check for duplicate state IDs
    const seenStateIds = new Set<string>();
    for (const [index, state] of recipe.states.entries()) {
      if (seenStateIds.has(state.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate state ID: ${state.id}`,
          path: ['states', index, 'id'],
        });
      }
      seenStateIds.add(state.id);
    }

    // Check for duplicate event IDs
    const seenEventIds = new Set<string>();
    for (const [index, event] of recipe.events.entries()) {
      if (seenEventIds.has(event.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate event ID: ${event.id}`,
          path: ['events', index, 'id'],
        });
      }
      seenEventIds.add(event.id);
    }

    // Check for duplicate guard IDs
    const seenGuardIds = new Set<string>();
    for (const [index, guard] of recipe.guards.entries()) {
      if (seenGuardIds.has(guard.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate guard ID: ${guard.id}`,
          path: ['guards', index, 'id'],
        });
      }
      seenGuardIds.add(guard.id);
    }

    // Check for duplicate action IDs
    const seenActionIds = new Set<string>();
    for (const [index, action] of recipe.actions.entries()) {
      if (seenActionIds.has(action.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate action ID: ${action.id}`,
          path: ['actions', index, 'id'],
        });
      }
      seenActionIds.add(action.id);
    }

    // Validate transitions reference existing elements
    for (const [index, transition] of recipe.transitions.entries()) {
      if (!stateIds.has(transition.from)) {
        ctx.addIssue({
          code: 'custom',
          message: `Transition from unknown state: ${transition.from}`,
          path: ['transitions', index, 'from'],
        });
      }
      if (!stateIds.has(transition.to)) {
        ctx.addIssue({
          code: 'custom',
          message: `Transition to unknown state: ${transition.to}`,
          path: ['transitions', index, 'to'],
        });
      }
      if (!eventIds.has(transition.event)) {
        ctx.addIssue({
          code: 'custom',
          message: `Transition references unknown event: ${transition.event}`,
          path: ['transitions', index, 'event'],
        });
      }
      if (transition.guard && !guardIds.has(transition.guard)) {
        ctx.addIssue({
          code: 'custom',
          message: `Transition references unknown guard: ${transition.guard}`,
          path: ['transitions', index, 'guard'],
        });
      }
      if (transition.action && !actionIds.has(transition.action)) {
        ctx.addIssue({
          code: 'custom',
          message: `Transition references unknown action: ${transition.action}`,
          path: ['transitions', index, 'action'],
        });
      }
    }

    // Check for at least one initial state
    const initialStates = recipe.states.filter(s => s.initial);
    if (initialStates.length !== 1) {
      ctx.addIssue({
        code: 'custom',
        message: 'FSM must have exactly one initial state',
        path: ['states'],
      });
    }

    // Check for duplicate transition IDs
    const seenTransitionIds = new Set<string>();
    for (const [index, transition] of recipe.transitions.entries()) {
      if (seenTransitionIds.has(transition.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate transition ID: ${transition.id}`,
          path: ['transitions', index, 'id'],
        });
      }
      seenTransitionIds.add(transition.id);
    }

    const terminalIds = new Set(recipe.states.filter(state => state.terminal).map(state => state.id));
    for (const [index, transition] of recipe.transitions.entries()) {
      if (terminalIds.has(transition.from)) {
        ctx.addIssue({
          code: 'custom',
          message: `Terminal state must not have outgoing transitions: ${transition.from}`,
          path: ['transitions', index, 'from'],
        });
      }
    }

    if (initialStates.length === 1) {
      const reachable = new Set<string>([initialStates[0]!.id]);
      let changed = true;
      while (changed) {
        changed = false;
        for (const transition of recipe.transitions) {
          if (reachable.has(transition.from) && stateIds.has(transition.to) && !reachable.has(transition.to)) {
            reachable.add(transition.to);
            changed = true;
          }
        }
      }
      for (const [index, state] of recipe.states.entries()) {
        if (!reachable.has(state.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `State is unreachable from the initial state: ${state.id}`,
            path: ['states', index, 'id'],
          });
        }
      }
    }
  });

export const compiledFsmRecipeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: semanticsIdSchema,
    description: z.string().min(1).max(SEMANTICS_LIMITS.descriptionMax),
    states: z.array(fsmStateSchema).min(1).max(SEMANTICS_LIMITS.statesMax),
    events: z.array(fsmEventSchema).max(SEMANTICS_LIMITS.eventsMax),
    guards: z.array(fsmGuardSchema).max(SEMANTICS_LIMITS.guardsMax),
    actions: z.array(fsmActionSchema).max(SEMANTICS_LIMITS.actionsMax),
    transitions: z.array(fsmTransitionSchema).max(SEMANTICS_LIMITS.transitionsMax),
    initialStates: z.array(semanticsIdSchema).min(1),
    terminalStates: z.array(semanticsIdSchema),
  })
  .strict();

// --- Registry Schemas ---

export const authoringSemanticsInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    rhythmProfiles: z.array(authoringRhythmProfileSchema).max(SEMANTICS_LIMITS.rhythmProfilesMax),
    fsmRecipes: z.array(authoringFsmRecipeSchema).max(SEMANTICS_LIMITS.fsmRecipesMax),
  })
  .strict();

export const compiledSemanticsRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: semanticsRefSchema,
    rhythmProfiles: z.record(semanticsRefSchema, compiledRhythmProfileSchema),
    fsmRecipes: z.record(semanticsRefSchema, compiledFsmRecipeSchema),
    aliases: z.record(semanticsIdSchema, semanticsRefSchema),
  })
  .strict()
  .superRefine((registry, ctx) => {
    if (Object.keys(registry.rhythmProfiles).length > SEMANTICS_LIMITS.rhythmProfilesMax) {
      ctx.addIssue({
        code: 'custom',
        message: `At most ${SEMANTICS_LIMITS.rhythmProfilesMax} rhythm profiles`,
        path: ['rhythmProfiles'],
      });
    }
    if (Object.keys(registry.fsmRecipes).length > SEMANTICS_LIMITS.fsmRecipesMax) {
      ctx.addIssue({
        code: 'custom',
        message: `At most ${SEMANTICS_LIMITS.fsmRecipesMax} FSM recipes`,
        path: ['fsmRecipes'],
      });
    }
    if (Object.keys(registry.aliases).length > SEMANTICS_LIMITS.aliasEntriesMax) {
      ctx.addIssue({
        code: 'custom',
        message: `At most ${SEMANTICS_LIMITS.aliasEntriesMax} aliases`,
        path: ['aliases'],
      });
    }
  });

// --- Project Override Schema ---

export const projectRhythmOverrideSchema = z
  .object({
    schemaVersion: z.literal(1),
    baseProfile: semanticsIdSchema,
    overrideMappings: z.array(semanticMappingSchema).max(SEMANTICS_LIMITS.overrideMappingsMax),
  })
  .strict()
  .superRefine((override, ctx) => {
    // Ensure unique override mapping IDs
    const ids = new Set<string>();
    for (const [index, mapping] of override.overrideMappings.entries()) {
      if (ids.has(mapping.id)) {
        ctx.addIssue({
          code: 'custom',
          message: `Duplicate override mapping ID: ${mapping.id}`,
          path: ['overrideMappings', index, 'id'],
        });
      }
      ids.add(mapping.id);
    }
  });