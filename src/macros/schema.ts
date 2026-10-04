// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Strict Zod schemas for macro domain data. Unknown fields are rejected.
import { z } from 'zod';

/** Lowercase ASCII letters, digits, hyphens; starts with a letter. Safe for filenames. */
export const SAFE_ID_REGEX = /^[a-z][a-z0-9-]*$/;
export const SHA256_HEX_REGEX = /^[a-f0-9]{64}$/;

export const LIMITS = {
  idMax: 64,
  roleMax: 64,
  descriptionMax: 400,
  tagMax: 40,
  tagsMax: 16,
  emmetMax: 1200,
  pathMax: 260,
  routeMax: 200,
  scalarStringMax: 200,
  decisionKeyMax: 64,
  messageMax: 240,
  codeMax: 64,
  componentRefMax: 80,
  componentRefsMax: 32,
  acceptsMax: 16,
  fragmentsMax: 64,
  mountsMax: 128,
  slotsMax: 32,
  portsMax: 32,
  nodesMax: 128,
  connectionsMax: 128,
  rulesMax: 64,
  pagesMax: 32,
  routeLinksMax: 64,
  checkpointsMax: 256,
  operationsMax: 32,
  orderMax: 10_000,
  revisionMax: 1_000_000,
  cardinalityMax: 32,
  landmarkMax: 8,
  graphDepthMax: 16,
  sourceHashKeyMax: 120,
  sourceHashesMax: 32,
  mappingVersionMax: 40,
  projectKeyMax: 128,
  cursorMaxBytes: 320,
  fingerprintMax: 64,
  aliasEntriesMax: 512,
  registryBlocksMax: 256,
  registryRecipesMax: 64,
  registryProfilesMax: 32,
  registryRulesMax: 128,
} as const;

export const idSchema = z
  .string()
  .min(1)
  .max(LIMITS.idMax)
  .regex(SAFE_ID_REGEX, 'Id must be lowercase ASCII letters, digits, and hyphens');

/** Full SHA-256 hex digest of canonical compiled content. */
export const refSchema = z
  .string()
  .length(64)
  .regex(SHA256_HEX_REGEX, 'Ref must be a lowercase SHA-256 hex digest');

export const finiteIntSchema = z.number().int().finite();

export const nonNegativeIntSchema = finiteIntSchema.min(0).max(LIMITS.orderMax);

export const revisionSchema = finiteIntSchema.min(0).max(LIMITS.revisionMax);

export const cardinalitySchema = finiteIntSchema.min(0).max(LIMITS.cardinalityMax);

export const scalarSchema = z.union([
  z.string().max(LIMITS.scalarStringMax),
  z.number().finite(),
  z.boolean(),
  z.null(),
]);

export const anchorSchema = z
  .object({
    fragment: idSchema,
    name: idSchema,
  })
  .strict();

export const fragmentSchema = z
  .object({
    id: idSchema,
    emmet: z.string().min(1).max(LIMITS.emmetMax),
  })
  .strict();

export const fragmentMountSchema = z
  .object({
    parent: idSchema,
    anchor: idSchema,
    child: idSchema,
    order: nonNegativeIntSchema,
  })
  .strict();

export const slotSchema = z
  .object({
    id: idSchema,
    at: anchorSchema,
    accepts: z.array(z.string().min(1).max(LIMITS.roleMax)).max(LIMITS.acceptsMax),
    min: cardinalitySchema,
    max: cardinalitySchema,
    boundary: idSchema.optional(),
  })
  .strict()
  .superRefine((slot, ctx) => {
    if (slot.min > slot.max) {
      ctx.addIssue({ code: 'custom', message: 'Slot min must be <= max', path: ['min'] });
    }
  });

export const portSchema = z
  .object({
    id: idSchema,
    at: anchorSchema,
    direction: z.enum(['in', 'out']),
    kind: z.enum(['control', 'region', 'data']),
    contract: idSchema,
    minLinks: cardinalitySchema,
    maxLinks: cardinalitySchema,
    scope: z.enum(['shell', 'page']),
  })
  .strict()
  .superRefine((port, ctx) => {
    if (port.minLinks > port.maxLinks) {
      ctx.addIssue({ code: 'custom', message: 'Port minLinks must be <= maxLinks', path: ['minLinks'] });
    }
  });

export const provenanceSchema = z
  .object({
    origin: z.enum(['authored', 'adapted']),
    sourceKind: z.enum(['authored', 'local-shadcn-registry-item']).optional(),
    upstreamItem: z.string().min(1).max(LIMITS.pathMax).optional(),
    repository: z.string().min(1).max(LIMITS.pathMax).optional(),
    revision: z.string().min(1).max(80).optional(),
    license: z.string().min(1).max(40).optional(),
    sourceHashes: z
      .record(z.string().min(1).max(LIMITS.sourceHashKeyMax), refSchema)
      .refine(obj => Object.keys(obj).length <= LIMITS.sourceHashesMax, {
        message: `At most ${LIMITS.sourceHashesMax} sourceHashes`,
      }),
    mappingVersion: z.string().min(1).max(LIMITS.mappingVersionMax),
  })
  .strict()
  .superRefine((provenance, ctx) => {
    if (provenance.origin === 'adapted' && provenance.sourceKind !== 'local-shadcn-registry-item') {
      ctx.addIssue({
        code: 'custom',
        message: 'Adapted provenance must identify a local shadcn registry item source',
        path: ['sourceKind'],
      });
    }
  });

export const layoutSchema = z
  .object({
    frameRef: idSchema,
    gutterBoundary: idSchema.optional(),
    scrollBoundary: idSchema.optional(),
  })
  .strict();

export const landmarksSchema = z
  .object({
    main: finiteIntSchema.min(0).max(LIMITS.landmarkMax),
    primaryHeading: finiteIntSchema.min(0).max(LIMITS.landmarkMax),
  })
  .strict();

export const macroBlockSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    role: z.string().min(1).max(LIMITS.roleMax),
    family: idSchema,
    description: z.string().min(1).max(LIMITS.descriptionMax),
    tags: z.array(z.string().min(1).max(LIMITS.tagMax)).max(LIMITS.tagsMax),
    root: idSchema,
    fragments: z.array(fragmentSchema).max(LIMITS.fragmentsMax),
    mounts: z.array(fragmentMountSchema).max(LIMITS.mountsMax),
    slots: z.array(slotSchema).max(LIMITS.slotsMax),
    ports: z.array(portSchema).max(LIMITS.portsMax),
    componentRefs: z.array(z.string().min(1).max(LIMITS.componentRefMax)).max(LIMITS.componentRefsMax),
    ruleRefs: z.array(refSchema).max(LIMITS.rulesMax),
    dependencyRefs: z.array(refSchema).max(LIMITS.registryBlocksMax),
    layout: layoutSchema,
    landmarks: landmarksSchema,
    provenance: provenanceSchema,
  })
  .strict();

export const endpointSchema = z
  .object({
    node: idSchema,
    port: idSchema,
  })
  .strict();

export const connectionSchema = z
  .object({
    id: idSchema,
    relation: z.enum(['controls', 'data']),
    from: endpointSchema,
    to: endpointSchema,
  })
  .strict();

export const boundRuleSchema = z.discriminatedUnion('type', [
  z
    .object({
      id: idSchema,
      type: z.literal('same-shell'),
      nodes: z.array(idSchema).min(1).max(LIMITS.nodesMax),
    })
    .strict(),
  z
    .object({
      id: idSchema,
      type: z.literal('same-frame'),
      nodes: z.array(idSchema).min(1).max(LIMITS.nodesMax),
    })
    .strict(),
  z
    .object({
      id: idSchema,
      type: z.literal('ordered'),
      parent: idSchema,
      slot: idSchema,
      nodes: z.array(idSchema).min(1).max(LIMITS.nodesMax),
    })
    .strict(),
  z
    .object({
      id: idSchema,
      type: z.literal('single-owner'),
      boundary: idSchema,
      property: z.enum(['gutter', 'scroll']),
      nodes: z.array(idSchema).min(1).max(LIMITS.nodesMax),
    })
    .strict(),
  z
    .object({
      id: idSchema,
      type: z.literal('shared-data'),
      binding: idSchema,
      nodes: z.array(idSchema).min(1).max(LIMITS.nodesMax),
    })
    .strict(),
]);

export const nodeInstanceSchema = z
  .object({
    id: idSchema,
    block: refSchema,
    parent: z
      .object({
        node: idSchema,
        slot: idSchema,
        order: nonNegativeIntSchema,
      })
      .strict()
      .optional(),
    bindings: z.record(idSchema, idSchema),
  })
  .strict();

export const pagePlanSchema = z
  .object({
    id: idSchema,
    route: z.string().min(1).max(LIMITS.routeMax),
    recipe: refSchema,
    root: idSchema,
    nodes: z.record(idSchema, nodeInstanceSchema),
    connections: z.array(connectionSchema).max(LIMITS.connectionsMax),
    rules: z.array(boundRuleSchema).max(LIMITS.rulesMax),
    decisions: z.record(z.string().min(1).max(LIMITS.decisionKeyMax), scalarSchema),
    status: z.enum(['draft', 'plan-ready']),
  })
  .strict()
  .superRefine((page, ctx) => {
    if (Object.keys(page.nodes).length > LIMITS.nodesMax) {
      ctx.addIssue({ code: 'custom', message: `At most ${LIMITS.nodesMax} nodes`, path: ['nodes'] });
    }
    if (!Object.hasOwn(page.nodes, page.root)) {
      ctx.addIssue({ code: 'custom', message: 'Page root must exist in nodes', path: ['root'] });
    }
  });

export const routeLinkSchema = z
  .object({
    fromPage: idSchema,
    fromAnchor: anchorSchema,
    toPage: idSchema,
  })
  .strict();

export const recipeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    kind: z.enum(['page', 'flow']),
    profile: refSchema,
    pages: z.array(pagePlanSchema).min(1).max(LIMITS.pagesMax),
    entryPage: idSchema,
    routeLinks: z.array(routeLinkSchema).max(LIMITS.routeLinksMax),
  })
  .strict()
  .superRefine((recipe, ctx) => {
    if (!recipe.pages.some(page => page.id === recipe.entryPage)) {
      ctx.addIssue({ code: 'custom', message: 'entryPage must reference a page in pages', path: ['entryPage'] });
    }
  });

export const writeCheckpointSchema = z
  .object({
    page: idSchema,
    node: idSchema,
    sourcePath: z.string().min(1).max(LIMITS.pathMax),
    planDigest: refSchema,
    reportedAtRevision: revisionSchema,
  })
  .strict();

export const operationReceiptSchema = z
  .object({
    requestHash: refSchema,
    committedRevision: revisionSchema,
    response: z.record(z.string(), z.unknown()),
  })
  .strict();

export const designSessionSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    projectKey: z.string().min(1).max(LIMITS.projectKeyMax),
    revision: revisionSchema,
    registryRevision: refSchema,
    profile: refSchema,
    projectDecisions: z.record(z.string().min(1).max(LIMITS.decisionKeyMax), scalarSchema),
    pages: z.record(idSchema, pagePlanSchema),
    routeLinks: z.array(routeLinkSchema).max(LIMITS.routeLinksMax),
    checkpoints: z.array(writeCheckpointSchema).max(LIMITS.checkpointsMax),
    receipts: z.record(idSchema, operationReceiptSchema),
  })
  .strict()
  .superRefine((session, ctx) => {
    if (Object.keys(session.pages).length > LIMITS.pagesMax) {
      ctx.addIssue({ code: 'custom', message: `At most ${LIMITS.pagesMax} pages`, path: ['pages'] });
    }
  });

export const blockSectionSchema = z.enum([
  'manifest',
  'structure',
  'slots',
  'ports',
  'rules',
  'dependencies',
  'provenance',
]);

export const decisionSpecSchema = z
  .object({
    type: z.enum(['string', 'number', 'boolean', 'null', 'enum']),
    values: z.array(scalarSchema).max(32).optional(),
    allowPageOverride: z.boolean(),
    defaultValue: scalarSchema.optional(),
  })
  .strict();

export const designProfileSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    description: z.string().min(1).max(LIMITS.descriptionMax),
    allowedDecisions: z.record(z.string().min(1).max(LIMITS.decisionKeyMax), decisionSpecSchema),
    sharedDecisionKeys: z.array(z.string().min(1).max(LIMITS.decisionKeyMax)).max(64),
  })
  .strict();

export const ruleTemplateSchema = boundRuleSchema;

export const compiledMacroRegistrySchema = z
  .object({
    schemaVersion: z.literal(1),
    revision: refSchema,
    blocks: z.record(refSchema, macroBlockSchema),
    recipes: z.record(refSchema, recipeSchema),
    profiles: z.record(refSchema, designProfileSchema),
    rules: z.record(refSchema, ruleTemplateSchema),
    aliases: z.record(idSchema, refSchema),
  })
  .strict()
  .superRefine((registry, ctx) => {
    if (Object.keys(registry.blocks).length > LIMITS.registryBlocksMax) {
      ctx.addIssue({ code: 'custom', message: `At most ${LIMITS.registryBlocksMax} blocks`, path: ['blocks'] });
    }
    if (Object.keys(registry.recipes).length > LIMITS.registryRecipesMax) {
      ctx.addIssue({ code: 'custom', message: `At most ${LIMITS.registryRecipesMax} recipes`, path: ['recipes'] });
    }
    if (Object.keys(registry.profiles).length > LIMITS.registryProfilesMax) {
      ctx.addIssue({ code: 'custom', message: `At most ${LIMITS.registryProfilesMax} profiles`, path: ['profiles'] });
    }
    if (Object.keys(registry.rules).length > LIMITS.registryRulesMax) {
      ctx.addIssue({ code: 'custom', message: `At most ${LIMITS.registryRulesMax} rules`, path: ['rules'] });
    }
    if (Object.keys(registry.aliases).length > LIMITS.aliasEntriesMax) {
      ctx.addIssue({ code: 'custom', message: `At most ${LIMITS.aliasEntriesMax} aliases`, path: ['aliases'] });
    }
  });

// Authoring schemas use Id where compiled forms use Ref.
export const authoringNodeInstanceSchema = z
  .object({
    id: idSchema,
    block: idSchema,
    parent: z
      .object({
        node: idSchema,
        slot: idSchema,
        order: nonNegativeIntSchema,
      })
      .strict()
      .optional(),
    bindings: z.record(idSchema, idSchema),
  })
  .strict();

export const authoringPagePlanSchema = z
  .object({
    id: idSchema,
    route: z.string().min(1).max(LIMITS.routeMax),
    recipe: idSchema,
    root: idSchema,
    nodes: z.record(idSchema, authoringNodeInstanceSchema),
    connections: z.array(connectionSchema).max(LIMITS.connectionsMax),
    rules: z.array(boundRuleSchema).max(LIMITS.rulesMax),
    decisions: z.record(z.string().min(1).max(LIMITS.decisionKeyMax), scalarSchema),
    status: z.enum(['draft', 'plan-ready']),
  })
  .strict();

export const authoringMacroBlockSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    role: z.string().min(1).max(LIMITS.roleMax),
    family: idSchema,
    description: z.string().min(1).max(LIMITS.descriptionMax),
    tags: z.array(z.string().min(1).max(LIMITS.tagMax)).max(LIMITS.tagsMax),
    root: idSchema,
    fragments: z.array(fragmentSchema).max(LIMITS.fragmentsMax),
    mounts: z.array(fragmentMountSchema).max(LIMITS.mountsMax),
    slots: z.array(slotSchema).max(LIMITS.slotsMax),
    ports: z.array(portSchema).max(LIMITS.portsMax),
    componentRefs: z.array(z.string().min(1).max(LIMITS.componentRefMax)).max(LIMITS.componentRefsMax),
    ruleRefs: z.array(idSchema).max(LIMITS.rulesMax),
    dependencyBlockIds: z.array(idSchema).max(LIMITS.registryBlocksMax),
    layout: layoutSchema,
    landmarks: landmarksSchema,
    provenance: provenanceSchema,
  })
  .strict();

export const authoringRecipeSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: idSchema,
    kind: z.enum(['page', 'flow']),
    profile: idSchema,
    pages: z.array(authoringPagePlanSchema).min(1).max(LIMITS.pagesMax),
    entryPage: idSchema,
    routeLinks: z.array(routeLinkSchema).max(LIMITS.routeLinksMax),
  })
  .strict();

export const authoringRegistryInputSchema = z
  .object({
    schemaVersion: z.literal(1),
    blocks: z.array(authoringMacroBlockSchema).max(LIMITS.registryBlocksMax),
    recipes: z.array(authoringRecipeSchema).max(LIMITS.registryRecipesMax),
    profiles: z.array(designProfileSchema).max(LIMITS.registryProfilesMax),
    rules: z.array(ruleTemplateSchema).max(LIMITS.registryRulesMax),
  })
  .strict();

export const designPatchOpSchema = z.discriminatedUnion('op', [
  z
    .object({
      op: z.literal('instantiate_recipe'),
      recipe: refSchema,
      pagePrefix: idSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('attach_block'),
      page: idSchema,
      parent: idSchema,
      slot: idSchema,
      node: idSchema,
      block: refSchema,
      order: nonNegativeIntSchema.optional(),
      bindings: z.record(idSchema, idSchema).optional(),
    })
    .strict(),
  z
    .object({
      op: z.literal('replace_block'),
      page: idSchema,
      node: idSchema,
      block: refSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('remove_block'),
      page: idSchema,
      node: idSchema,
      removeSubtree: z.boolean(),
    })
    .strict(),
  z
    .object({
      op: z.literal('connect_ports'),
      page: idSchema,
      id: idSchema,
      relation: z.enum(['controls', 'data']),
      from: endpointSchema,
      to: endpointSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('disconnect_ports'),
      page: idSchema,
      connection: idSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('set_decision'),
      scope: z.enum(['project', 'page']),
      page: idSchema.optional(),
      key: z.string().min(1).max(LIMITS.decisionKeyMax),
      value: scalarSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('record_written'),
      page: idSchema,
      node: idSchema,
      sourcePath: z.string().min(1).max(LIMITS.pathMax),
      planDigest: refSchema,
    })
    .strict(),
  z
    .object({
      op: z.literal('mark_plan_ready'),
      page: idSchema,
    })
    .strict(),
]);

export const beginDesignInputSchema = z
  .object({
    designId: idSchema,
    profile: refSchema,
    operationId: idSchema,
    registry: compiledMacroRegistrySchema,
    decisions: z.record(z.string().min(1).max(LIMITS.decisionKeyMax), scalarSchema).optional(),
  })
  .strict();

export const applyDesignPatchInputSchema = z
  .object({
    designId: idSchema,
    expectedRevision: revisionSchema,
    operationId: idSchema,
    operations: z.array(designPatchOpSchema).min(1).max(LIMITS.operationsMax),
  })
  .strict();

export const repairSuggestionSchema = z
  .object({
    kind: z.enum(['attach_block', 'connect_ports', 'set_decision', 'replace_block', 'other']),
    message: z.string().min(1).max(LIMITS.messageMax),
    candidateRefs: z.array(refSchema).max(8).optional(),
    slot: idSchema.optional(),
    port: idSchema.optional(),
  })
  .strict();

export const diagnosticSchema = z
  .object({
    code: z.string().min(1).max(LIMITS.codeMax),
    severity: z.enum(['error', 'obligation', 'warning']),
    page: idSchema.optional(),
    node: idSchema.optional(),
    slot: idSchema.optional(),
    rule: idSchema.optional(),
    message: z.string().min(1).max(LIMITS.messageMax),
    repairs: z.array(repairSuggestionSchema).max(8),
  })
  .strict();

export const validationReportSchema = z
  .object({
    mode: z.enum(['draft', 'complete']),
    ok: z.boolean(),
    errorCount: nonNegativeIntSchema,
    obligationCount: nonNegativeIntSchema,
    warningCount: nonNegativeIntSchema,
    diagnostics: z.array(diagnosticSchema).max(512),
  })
  .strict();

export const contextViewSchema = z.enum([
  'sessions',
  'overview',
  'decisions',
  'graph',
  'rules',
  'focus',
  'next',
]);

export const contextRequestSchema = z
  .object({
    view: contextViewSchema,
    designId: idSchema.optional(),
    pageId: idSchema.optional(),
    nodeId: idSchema.optional(),
    revision: revisionSchema.optional(),
    cursor: z.string().min(1).max(LIMITS.cursorMaxBytes).optional(),
  })
  .strict();

export const macroCursorPayloadSchema = z
  .object({
    v: z.literal(1),
    fingerprint: z.string().min(1).max(LIMITS.fingerprintMax),
    snapshot: z.string().min(1).max(LIMITS.pathMax),
    offset: finiteIntSchema.min(0).max(LIMITS.orderMax),
    section: blockSectionSchema.optional(),
    view: contextViewSchema.optional(),
    designRevision: revisionSchema.optional(),
    registryRevision: refSchema.optional(),
  })
  .strict();

export type MacroCursorPayload = z.infer<typeof macroCursorPayloadSchema>;
