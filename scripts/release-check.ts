import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

type ReleaseStatus =
  | 'match'
  | 'stale'
  | 'missing'
  | 'manual correction needed'
  | 'inaccessible'
  | 'unrelated search noise';

export type ReleasePhase = 'pre-release' | 'post-release';

export interface ReleaseRecord {
  surface: string;
  authority: string;
  current: string;
  expected: string;
  correction: string;
  status: ReleaseStatus;
  verification: string;
}

export interface ReleaseEvidence {
  generatedAt: string;
  phase: ReleasePhase;
  package: { name: string; version: string; mcpName: string };
  parity: 'pass' | 'fail';
  records: ReleaseRecord[];
  excludedSurfaces: Array<{ value: string; reason: string; status: 'unrelated search noise' }>;
  approvalsRequired: string[];
}

interface PackageManifest {
  name: string;
  version: string;
  description: string;
  homepage?: string;
  repository?: { url?: string };
  mcpName?: string;
  bin?: Record<string, string>;
  files?: string[];
  keywords?: string[];
  scripts?: Record<string, string>;
}

interface ServerManifest {
  name: string;
  version: string;
  websiteUrl?: string;
  packages?: Array<{
    identifier: string;
    version: string;
    transport?: { type?: string };
  }>;
}

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const requiredKeywords = ['mcp', 'mcp-server', 'basecoat-ui', 'shadcn-ui', 'ai-agents'];
const requiredCapabilities = [
  'search_components',
  'get_component_details',
  'validate_composition',
  'search_macro_blocks',
  'get_macro_block',
  'begin_design',
  'get_design_context',
  'apply_design_patch',
  'validate_design',
  'get_rhythm_rules',
  'get_fsm_recipe',
];

function record(
  surface: string,
  authority: string,
  current: string,
  expected: string,
  correction: string,
  status: ReleaseStatus,
  verification: string,
): ReleaseRecord {
  return { surface, authority, current, expected, correction, status, verification };
}

function parityRecord(
  surface: string,
  authority: string,
  current: string,
  expected: string,
  verification: string,
): ReleaseRecord {
  const matches = current === expected;
  return record(
    surface,
    authority,
    current,
    expected,
    matches ? 'No correction required.' : 'Correct the local authoritative metadata before publication.',
    matches ? 'match' : 'stale',
    verification,
  );
}

export async function buildReleaseEvidence(
  phase: ReleasePhase = 'pre-release',
  repositoryRoot = root,
): Promise<ReleaseEvidence> {
  const [packageText, serverText, readme] = await Promise.all([
    readFile(resolve(repositoryRoot, 'package.json'), 'utf8'),
    readFile(resolve(repositoryRoot, 'server.json'), 'utf8'),
    readFile(resolve(repositoryRoot, 'README.md'), 'utf8'),
  ]);
  const packageJson = JSON.parse(packageText) as PackageManifest;
  const serverJson = JSON.parse(serverText) as ServerManifest;
  const serverPackage = serverJson.packages?.[0];
  const packageName = packageJson.name;
  const version = packageJson.version;
  const mcpName = packageJson.mcpName ?? '';
  const packageFiles = packageJson.files ?? [];
  const records: ReleaseRecord[] = [
    parityRecord('server.json version', 'package.json.version', serverJson.version, version, 'JSON parity check'),
    parityRecord(
      'server.json package version',
      'package.json.version',
      serverPackage?.version ?? '(missing)',
      version,
      'JSON parity check',
    ),
    parityRecord(
      'server.json package identifier',
      'package.json.name',
      serverPackage?.identifier ?? '(missing)',
      packageName,
      'JSON/package identity check',
    ),
    parityRecord(
      'server.json MCP name',
      'package.json.mcpName',
      serverJson.name,
      mcpName,
      'JSON/package identity check',
    ),
    parityRecord(
      'server.json transport',
      'server implementation and server.json',
      serverPackage?.transport?.type ?? '(missing)',
      'stdio',
      'Manifest transport check',
    ),
  ];

  const bin = packageJson.bin?.['basecoat-ui-mcp'];
  records.push(record(
    'package install contract',
    'package.json',
    `${bin ?? '(missing)'}; files=${packageFiles.join(', ') || '(missing)'}`,
    'bin points to dist/server/stdio.js and files allowlist includes runtime/docs/server.json',
    bin === 'dist/server/stdio.js' && packageFiles.includes('dist') && packageFiles.includes('server.json')
      ? 'No correction required.'
      : 'Correct package.json bin/files before publication.',
    bin === 'dist/server/stdio.js' && packageFiles.includes('dist') && packageFiles.includes('server.json')
      ? 'match'
      : 'stale',
    'package.json contract check',
  ));

  const scripts = Object.keys(packageJson.scripts ?? {}).sort();
  records.push(record(
    'local verification scripts',
    'package.json.scripts',
    scripts.join(', '),
    'check, test, and pack verification are available',
    scripts.includes('check') && scripts.includes('test')
      ? 'No correction required.'
      : 'Add or repair the local verification scripts.',
    scripts.includes('check') && scripts.includes('test') ? 'match' : 'missing',
    'script inventory check',
  ));

  const capabilityText = await readFile(resolve(repositoryRoot, 'src/server/index.ts'), 'utf8');
  const missingCapabilities = requiredCapabilities.filter(capability => !capabilityText.includes(`'${capability}'`));
  records.push(record(
    'MCP capabilities',
    'src/server/index.ts and package contract tests',
    missingCapabilities.length === 0 ? requiredCapabilities.join(', ') : `missing: ${missingCapabilities.join(', ')}`,
    requiredCapabilities.join(', '),
    missingCapabilities.length === 0 ? 'No correction required.' : 'Restore missing local capability registration/tests.',
    missingCapabilities.length === 0 ? 'match' : 'missing',
    'static registration check; runtime exercise remains npm run test',
  ));

  const missingKeywords = requiredKeywords.filter(keyword => !(packageJson.keywords ?? []).includes(keyword));
  const stuffing = (packageJson.keywords ?? []).filter((keyword, index, keywords) => keywords.indexOf(keyword) !== index);
  const seoCurrent = `keywords=${packageJson.keywords?.join(', ') ?? '(missing)'}; README bytes=${Buffer.byteLength(readme, 'utf8')}`;
  records.push(record(
    'SEO/discoverability copy',
    'package.json keywords and README.md',
    seoCurrent,
    `useful MCP/Basecoat/shadcn/agent terms; no duplicates or misleading claims; required=${requiredKeywords.join(', ')}`,
    missingKeywords.length === 0 && stuffing.length === 0
      ? 'No correction required; review copy for clarity, not keyword stuffing.'
      : 'Improve useful terms and remove duplicates; do not add repetitive keywords.',
    missingKeywords.length === 0 && stuffing.length === 0 ? 'match' : 'manual correction needed',
    'keyword presence/duplicate check; human copy review required',
  ));

  const externalSurfaces = [
    ['GitHub repository', packageJson.repository?.url ?? packageJson.homepage ?? '(missing)', packageJson.homepage ?? '(missing)'],
    ['npm package page', `https://www.npmjs.com/package/${packageName}`, `published ${packageName}@${version}`],
    ['official MCP Registry', `https://registry.modelcontextprotocol.io/?q=${encodeURIComponent(mcpName)}`, `${mcpName} -> ${packageName}@${version}`],
  ] as const;
  for (const [surface, current, expected] of externalSurfaces) {
    records.push(record(
      surface,
      'external public surface',
      current,
      expected,
      'Requires explicit approval and a maintainer-controlled platform action.',
      'inaccessible',
      'Not probed: this routine performs no network requests or external writes.',
    ));
  }

  const localParityFailed = records.some(item => ['stale', 'missing'].includes(item.status));
  return {
    generatedAt: new Date().toISOString(),
    phase,
    package: { name: packageName, version, mcpName },
    parity: localParityFailed ? 'fail' : 'pass',
    records,
    excludedSurfaces: [
      {
        value: 'README badges, download counts, upstream Basecoat/shadcn references, and search-result snippets',
        reason: 'Presentation/reference or search noise; not authoritative release identity.',
        status: 'unrelated search noise',
      },
    ],
    approvalsRequired: [
      'git push, immutable tag, or GitHub release',
      'npm publish',
      'MCP Registry publication',
      'manual directory/catalog corrections',
    ],
  };
}

async function main(): Promise<void> {
  const phaseArg = process.argv.find(argument => argument.startsWith('--phase='))?.slice('--phase='.length);
  const output = process.argv.find(argument => argument.startsWith('--write='))?.slice('--write='.length);
  if (phaseArg !== undefined && phaseArg !== 'pre-release' && phaseArg !== 'post-release') {
    throw new Error('--phase must be pre-release or post-release');
  }
  const evidence = await buildReleaseEvidence(phaseArg as ReleasePhase | undefined);
  const json = `${JSON.stringify(evidence, null, 2)}\n`;
  if (output) {
    const destination = resolve(root, output);
    await mkdir(dirname(destination), { recursive: true });
    await writeFile(destination, json, 'utf8');
  }
  process.stdout.write(json);
  if (evidence.parity === 'fail') process.exitCode = 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
