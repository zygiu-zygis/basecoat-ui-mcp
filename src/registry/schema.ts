// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
import { z } from 'zod';

export const componentMetadataSchema = z.object({
  id: z.string().regex(/^[a-z][a-z0-9-]*$/),
  name: z.string().min(1).max(80),
  intent: z.string().min(1).max(180),
  categories: z.array(z.string().max(40)).max(8),
  keywords: z.array(z.string().max(40)).max(24),
}).strict();

export const componentDetailsSchema = z.object({
  dependencies: z.object({ css: z.array(z.string()), js: z.array(z.string()) }).strict(),
  markup_template: z.string().min(1).max(4000),
  composition_rules: z.string().min(1).max(400),
  native_script: z.string().max(1200).optional(),
}).strict();

export const registrySchema = z.object({
  schema_version: z.literal(1),
  upstream: z.object({
    repository: z.literal('https://github.com/hunvreus/basecoat'),
    version: z.string(),
    revision: z.string().regex(/^[a-f0-9]{40}$/),
    license: z.literal('MIT'),
    // Discovered upstream inventory is intentionally absent from tool search results.
    components: z.array(z.object({
      id: z.string(), name: z.string(),
      variants: z.array(z.string()), classes: z.array(z.string()),
      source_sha256: z.string().regex(/^[a-f0-9]{64}$/),
    }).strict()),
    css_classes: z.array(z.string()),
  }).strict(),
  // Search metadata and heavy templates are physically separate sections.
  index: z.array(componentMetadataSchema).min(5),
  details: z.record(z.string(), componentDetailsSchema),
}).strict().superRefine((registry, ctx) => {
  const ids = registry.index.map(component => component.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Duplicate component IDs' });
  if (JSON.stringify([...ids].sort()) !== JSON.stringify(ids)) ctx.addIssue({ code: 'custom', message: 'Index must be sorted by ID' });
  for (const id of new Set([...ids, ...Object.keys(registry.details)])) {
    if (!ids.includes(id) || !registry.details[id]) ctx.addIssue({ code: 'custom', message: `Index/details mismatch: ${id}` });
  }
});

export type Registry = z.infer<typeof registrySchema>;
export type ComponentMetadata = z.infer<typeof componentMetadataSchema>;
