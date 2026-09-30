// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Offline importer: local shadcn-style registry item + curated mapping → authoring block.
// Never performs network I/O. Synthetic fixtures under authoring/fixtures are supported.
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import {
  SAFE_ID_REGEX,
  authoringMacroBlockSchema,
  fragmentMountSchema,
  fragmentSchema,
  idSchema,
  landmarksSchema,
  layoutSchema,
  portSchema,
  slotSchema,
} from '../src/macros/schema.js';
import type {
  AuthoringMacroBlock,
  CuratedBlockMapping,
  DependencyLockEntry,
  ImportDiagnostic,
  Provenance,
} from '../src/macros/types.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const AUTHORING = join(ROOT, 'src/macros/authoring');

const localRegistryItemSchema = z
  .object({
    name: z.string().min(1).max(80),
    type: z.string().min(1).max(80).optional(),
    title: z.string().min(1).max(120).optional(),
    description: z.string().min(1).max(400).optional(),
    dependencies: z.array(z.string().min(1).max(80)).max(64).optional(),
    registryDependencies: z.array(z.string().min(1).max(80)).max(64).optional(),
    files: z
      .array(
        z
          .object({
            path: z.string().min(1).max(260),
            content: z.string().max(200_000).optional(),
            type: z.string().min(1).max(80).optional(),
          })
          .strict(),
      )
      .max(32)
      .optional(),
    meta: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const curatedMappingSchema = z
  .object({
    schemaVersion: z.literal(1),
    adaptationBoundary: z
      .object({
        source: z.literal('shadcn-registry-item'),
        target: z.literal('basecoat-macro'),
        layout: z.literal('curated'),
      })
      .strict(),
    upstreamName: z.string().min(1).max(80),
    role: z.string().min(1).max(64),
    family: idSchema,
    description: z.string().min(1).max(400),
    tags: z.array(z.string().min(1).max(40)).max(16),
    root: idSchema,
    fragments: z.array(fragmentSchema).max(64),
    mounts: z.array(fragmentMountSchema).max(128),
    slots: z.array(slotSchema).max(32),
    ports: z.array(portSchema).max(32),
    componentRefs: z.array(z.string().min(1).max(80)).max(32),
    ruleRefs: z.array(idSchema).max(64),
    dependencyBlockIds: z.array(idSchema).max(256),
    layout: layoutSchema,
    landmarks: landmarksSchema,
    adapted: z.array(z.string()).max(32),
    omitted: z.array(z.string()).max(32),
    requiresAppIntegration: z.array(z.string()).max(32),
    mappingVersion: z.string().min(1).max(40),
  })
  .strict();

const dependencyLockSchema = z
  .object({
    schemaVersion: z.literal(1),
    entries: z.array(
      z
        .object({
          upstream: z.string().min(1).max(80),
          resolution: z.discriminatedUnion('kind', [
            z.object({ kind: z.literal('component'), id: z.string().min(1).max(80) }).strict(),
            z.object({ kind: z.literal('macro-block'), id: idSchema }).strict(),
            z
              .object({ kind: z.literal('unsupported'), reason: z.string().min(1).max(240) })
              .strict(),
          ]),
        })
        .strict(),
    ),
  })
  .strict();

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

function assertLocalPath(label: string, path: string): void {
  if (/^[a-z][a-z0-9+.-]*:/i.test(path)) {
    throw new Error(
      `${label} must be a local filesystem path; network and URL sources are not supported`,
    );
  }
}

function featureDiagnostic(
  feature: string,
  message: string,
  path?: string,
): ImportDiagnostic[] {
  const diagnostics: ImportDiagnostic[] = [
    {
      code: 'FEATURE_OMITTED',
      severity: 'warning',
      path,
      feature,
      message,
    },
  ];
  if (/(oauth|sso|oidc|social login|identity provider)/i.test(feature)) {
    diagnostics.push({
      code: 'UNSUPPORTED_OAUTH',
      severity: 'warning',
      path,
      feature,
      message: `OAuth/identity-provider behavior is not supplied by this importer: ${feature}`,
    });
  }
  if (/(captcha|turnstile|recaptcha|hcaptcha)/i.test(feature)) {
    diagnostics.push({
      code: 'UNSUPPORTED_CAPTCHA',
      severity: 'warning',
      path,
      feature,
      message: `Captcha/anti-automation behavior is not supplied by this importer: ${feature}`,
    });
  }
  return diagnostics;
}

function appIntegrationDiagnostics(feature: string): ImportDiagnostic[] {
  const diagnostics: ImportDiagnostic[] = [
    {
      code: 'REQUIRES_APP_INTEGRATION',
      severity: 'warning',
      feature,
      message: `Requires host application integration: ${feature}`,
    },
  ];
  if (/(oauth|sso|oidc|identity provider|login|credential|session|token)/i.test(feature)) {
    diagnostics.push({
      code: 'APP_AUTH_INTEGRATION',
      severity: 'warning',
      feature,
      message: `Authentication behavior must be implemented by the host application: ${feature}`,
    });
  }
  if (/(captcha|turnstile|recaptcha|hcaptcha)/i.test(feature)) {
    diagnostics.push({
      code: 'APP_CAPTCHA_INTEGRATION',
      severity: 'warning',
      feature,
      message: `Captcha/anti-automation integration must be implemented by the host application: ${feature}`,
    });
  }
  return diagnostics;
}

function toBlockId(upstreamName: string): string {
  const normalized = upstreamName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  const candidate = normalized.startsWith('imported-')
    ? normalized
    : `imported-${normalized}`;
  if (!SAFE_ID_REGEX.test(candidate)) {
    throw new Error(`Cannot derive safe block id from upstream name: ${upstreamName}`);
  }
  return candidate;
}

export interface ImportBlocksResult {
  block: AuthoringMacroBlock;
  diagnostics: ImportDiagnostic[];
  outputPath: string;
}

export async function importLocalBlock(options: {
  itemPath: string;
  mappingPath: string;
  lockPath?: string;
  knownComponentIds?: ReadonlySet<string>;
  outputDir?: string;
  write?: boolean;
}): Promise<ImportBlocksResult> {
  const diagnostics: ImportDiagnostic[] = [];
  assertLocalPath('itemPath', options.itemPath);
  assertLocalPath('mappingPath', options.mappingPath);
  const itemRaw = await readFile(options.itemPath, 'utf8');
  const mappingRaw = await readFile(options.mappingPath, 'utf8');
  const item = localRegistryItemSchema.parse(JSON.parse(itemRaw));
  const mapping = curatedMappingSchema.parse(JSON.parse(mappingRaw)) as unknown as CuratedBlockMapping;

  if (mapping.upstreamName !== item.name) {
    diagnostics.push({
      code: 'UPSTREAM_NAME_MISMATCH',
      severity: 'error',
      path: options.mappingPath,
      message: `Mapping upstreamName ${mapping.upstreamName} does not match item name ${item.name}`,
    });
  }

  const meta = item.meta ?? {};
  const isSynthetic =
    meta.synthetic === true ||
    meta.label === 'synthetic-offline-fixture' ||
    String(item.description ?? '').includes('SYNTHETIC');

  if (isSynthetic) {
    diagnostics.push({
      code: 'SYNTHETIC_FIXTURE',
      severity: 'warning',
      feature: 'provenance',
      message: 'Item is labeled synthetic; provenance will record adapted+synthetic source',
    });
  }

  const lockPath = options.lockPath ?? join(AUTHORING, 'dependency-lock.json');
  assertLocalPath('lockPath', lockPath);
  let lockEntries: DependencyLockEntry[] = [];
  try {
    const lock = dependencyLockSchema.parse(JSON.parse(await readFile(lockPath, 'utf8')));
    lockEntries = lock.entries;
  } catch (error) {
    diagnostics.push({
      code: 'LOCK_UNREADABLE',
      severity: 'warning',
      path: lockPath,
      message: error instanceof Error ? error.message : 'Could not read dependency lock',
    });
  }

  const upstreamDeps = [
    ...(item.dependencies ?? []),
    ...(item.registryDependencies ?? []),
  ];
  const resolvedComponents: string[] = [];
  for (const dep of upstreamDeps) {
    const entry = lockEntries.find(e => e.upstream === dep);
    if (!entry) {
      diagnostics.push({
        code: 'UNLOCKED_DEPENDENCY',
        severity: 'warning',
        feature: dep,
        message: `Upstream dependency ${dep} is not in the lock file`,
      });
      continue;
    }
    if (entry.resolution.kind === 'unsupported') {
      diagnostics.push({
        code: 'UNSUPPORTED_DEPENDENCY',
        severity: 'warning',
        feature: dep,
        message: entry.resolution.reason,
      });
      continue;
    }
    if (entry.resolution.kind === 'component') {
      resolvedComponents.push(entry.resolution.id);
      if (options.knownComponentIds && !options.knownComponentIds.has(entry.resolution.id)) {
        diagnostics.push({
          code: 'UNKNOWN_COMPONENT',
          severity: 'error',
          feature: entry.resolution.id,
          message: `Locked component ${entry.resolution.id} is not in the local component registry`,
        });
      }
    }
    if (entry.resolution.kind === 'macro-block') {
      diagnostics.push({
        code: 'MACRO_DEP_NOTED',
        severity: 'warning',
        feature: dep,
        message: `Dependency resolves to macro-block ${entry.resolution.id}; wire dependencyBlockIds manually`,
      });
    }
  }

  for (const component of mapping.componentRefs) {
    if (options.knownComponentIds && !options.knownComponentIds.has(component)) {
      diagnostics.push({
        code: 'UNKNOWN_COMPONENT',
        severity: 'error',
        feature: component,
        message: `Mapped component ${component} is not in the local component registry`,
      });
    }
  }

  for (const feature of mapping.omitted) {
    diagnostics.push(...featureDiagnostic(feature, `Mapping omits feature: ${feature}`, options.mappingPath));
  }
  for (const feature of mapping.requiresAppIntegration) {
    diagnostics.push(...appIntegrationDiagnostics(feature));
  }

  const sourceHashes: Record<string, string> = {
    item: sha256(itemRaw),
    mapping: sha256(mappingRaw),
  };
  for (const file of item.files ?? []) {
    if (typeof file.content === 'string') {
      sourceHashes[`file:${file.path}`] = sha256(file.content);
    }
  }

  const provenance: Provenance = {
    origin: 'adapted',
    sourceKind: 'local-shadcn-registry-item',
    upstreamItem: isSynthetic
      ? `synthetic:local:${item.name}`
      : `local:${basename(options.itemPath)}`,
    repository: isSynthetic ? 'synthetic-offline-fixture' : 'local-filesystem',
    revision: sourceHashes.item!.slice(0, 12),
    license: 'MIT',
    sourceHashes,
    mappingVersion: mapping.mappingVersion,
  };

  const blockId = toBlockId(item.name);
  const componentRefs = [
    ...new Set([...mapping.componentRefs, ...resolvedComponents]),
  ].sort();

  const blockCandidate = {
    schemaVersion: 1 as const,
    id: blockId,
    role: mapping.role,
    family: mapping.family,
    description: mapping.description,
    tags: mapping.tags.includes('synthetic') || !isSynthetic
      ? mapping.tags
      : [...mapping.tags, 'synthetic'],
    root: mapping.root,
    fragments: mapping.fragments,
    mounts: mapping.mounts,
    slots: mapping.slots,
    ports: mapping.ports,
    componentRefs,
    ruleRefs: mapping.ruleRefs,
    dependencyBlockIds: mapping.dependencyBlockIds,
    layout: mapping.layout,
    landmarks: mapping.landmarks,
    provenance,
  };

  const parsed = authoringMacroBlockSchema.safeParse(blockCandidate);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      diagnostics.push({
        code: 'AUTHORING_INVALID',
        severity: 'error',
        path: issue.path.join('.'),
        message: issue.message,
      });
    }
    throw new Error(
      `Import produced invalid authoring block:\n${diagnostics
        .filter(d => d.severity === 'error')
        .map(d => `${d.code}: ${d.message}`)
        .join('\n')}`,
    );
  }

  const block = parsed.data as AuthoringMacroBlock;
  const outputDir = options.outputDir ?? join(AUTHORING, 'blocks');
  const outputPath = join(outputDir, `${block.id}.json`);

  if (options.write !== false) {
    if (diagnostics.some(d => d.severity === 'error')) {
      throw new Error('Refusing to write authoring block while import errors remain');
    }
    await mkdir(outputDir, { recursive: true });
    await writeFile(outputPath, `${JSON.stringify(block, null, 2)}\n`, 'utf8');
  }

  return { block, diagnostics, outputPath };
}

async function loadKnownComponentIds(): Promise<Set<string>> {
  const registryPath = join(ROOT, 'src/registry/components.json');
  const data = JSON.parse(await readFile(registryPath, 'utf8')) as {
    index: Array<{ id: string }>;
  };
  return new Set(data.index.map(entry => entry.id));
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const itemArg = args.find(a => a.startsWith('--item='))?.slice('--item='.length);
  const mappingArg = args
    .find(a => a.startsWith('--mapping='))
    ?.slice('--mapping='.length);
  const lockArg = args
    .find(a => a.startsWith('--lock='))
    ?.slice('--lock='.length);
  const dryRun = args.includes('--dry-run');

  const itemPath =
    itemArg ?? join(AUTHORING, 'fixtures/login-form.item.json');
  const mappingPath =
    mappingArg ?? join(AUTHORING, 'mappings/login-form.json');

  const knownComponentIds = await loadKnownComponentIds();
  const result = await importLocalBlock({
    itemPath,
    mappingPath,
    lockPath: lockArg,
    knownComponentIds,
    write: !dryRun,
  });

  console.log(
    JSON.stringify(
      {
        ok: !result.diagnostics.some(d => d.severity === 'error'),
        dryRun,
        blockId: result.block.id,
        outputPath: result.outputPath,
        provenance: result.block.provenance,
        diagnostics: result.diagnostics,
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
