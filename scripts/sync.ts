// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// The only network boundary in this package. Never imported by the MCP server.
import { createHash, randomUUID } from 'node:crypto';
import { readFile, rename, writeFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { z } from 'zod';
import { registrySchema, type Registry } from '../src/registry/schema.js';
import { getComponentDetails } from '../src/tools/details.js';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO = 'https://api.github.com/repos/hunvreus/basecoat';
const treeSchema = z.object({ sha: z.string().regex(/^[a-f0-9]{40}$/), truncated: z.boolean(),
  tree: z.array(z.object({ path: z.string(), type: z.string() })) });
type Tree = z.infer<typeof treeSchema>;
const sorted = (values: Iterable<string>) => [...new Set(values)].sort();

export function scrapeComponent(id: string, doc: string) {
  const name = /^#\s+(.+)$/m.exec(doc)?.[1]?.trim();
  if (!name) throw new Error(`Upstream ${id} has no title; review the source format.`);
  return {
    id, name,
    variants: sorted([...doc.matchAll(/data-variant=["']([^"']+)["']/g)]
      .flatMap(match => match[1]!.split('|')).filter(value => /^[a-z][a-z-]*$/.test(value))),
    classes: sorted([...doc.matchAll(/\bclass=["']([^"']+)["']/g)].flatMap(match => match[1]!.split(/\s+/)).filter(Boolean)),
    source_sha256: createHash('sha256').update(doc).digest('hex'),
  };
}

export async function buildSnapshot(current: Registry, treeInput: unknown, readSource: (path: string) => Promise<string>): Promise<Registry> {
  const tree: Tree = treeSchema.parse(treeInput);
  if (tree.truncated) throw new Error('Upstream tree is truncated; registry was not updated.');
  const pkg = z.object({ version: z.string(), exports: z.record(z.string(), z.unknown()) }).parse(JSON.parse(await readSource('package.json')));
  if (pkg.version.split('.')[0] !== current.upstream.version.split('.')[0]) {
    throw new Error('Upstream major version changed; review curated templates and integration guidance before syncing.');
  }
  const versionParts = (version: string) => {
    if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Only stable upstream versions are supported.');
    return version.split('.').map(Number);
  };
  const previous = versionParts(current.upstream.version);
  const incoming = versionParts(pkg.version);
  const different = incoming.findIndex((part, index) => part !== previous[index]);
  if (different >= 0 && incoming[different]! < previous[different]!) throw new Error('Upstream version would downgrade the registry; refusing update.');
  const docs = tree.tree.filter(item => item.type === 'blob' && /^site\/src\/docs\/components\/[a-z0-9-]+\.mdx$/.test(item.path));
  const styles = tree.tree.filter(item => item.type === 'blob' && /^src\/css\/(?:components|styles)\/[a-z0-9-]+\.css$/.test(item.path));
  if (!docs.length || !styles.length) throw new Error('Upstream component paths changed; refusing an empty snapshot.');
  // Sequential bounded reads avoid rate spikes and have a fixed traversal order.
  const components = [];
  for (const item of docs.sort((a, b) => a.path < b.path ? -1 : 1)) {
    const id = item.path.split('/').at(-1)!.replace(/\.mdx$/, '');
    components.push(scrapeComponent(id, await readSource(item.path)));
  }
  const classes = new Set<string>();
  for (const item of styles.sort((a, b) => a.path < b.path ? -1 : 1)) {
    const css = (await readSource(item.path)).replace(/\/\*[\s\S]*?\*\//g, '');
    for (const match of css.matchAll(/\.([a-z][a-z0-9-]*)\b/g)) classes.add(match[1]!);
  }
  for (const component of current.index) {
    const upstream = components.find(item => item.id === component.id);
    if (!upstream) throw new Error(`Curated component disappeared upstream: ${component.id}`);
    const details = current.details[component.id]!;
    for (const dependency of [...details.dependencies.css, ...details.dependencies.js]) {
      const key = dependency === 'basecoat-css' ? '.' : dependency.replace('basecoat-css/', './');
      if (!Object.hasOwn(pkg.exports, key)) throw new Error(`Upstream export disappeared: ${dependency}`);
    }
    const rootClass = component.id === 'button' ? 'btn' : component.id;
    // Some 1.0.2 docs use a semantic/native root (for example chart's canvas
    // and checkbox's fieldset), so only enforce root classes in the pinned
    // snapshot that actually declares them as a component contract.
    const pinned = current.upstream.components.find(item => item.id === component.id);
    if (pinned?.classes.includes(rootClass) && (!classes.has(rootClass) || !upstream.classes.includes(rootClass))) {
      throw new Error(`Root class changed: ${rootClass}`);
    }
    if (component.id === 'tabs' && !upstream.classes.includes('tabs')) throw new Error('Tabs contract changed.');
  }
  const candidate = registrySchema.parse({ ...current, upstream: {
    ...current.upstream, version: pkg.version, revision: tree.sha, components, css_classes: sorted(classes),
  } });
  for (const { id } of candidate.index) for (const environment of ['astro', 'html'] as const) getComponentDetails(id, environment, candidate);
  return candidate;
}

async function fetchText(url: string): Promise<string> {
  const response = await fetch(url, { signal: AbortSignal.timeout(20_000), redirect: 'error', headers: { 'User-Agent': 'Intellmedia-Basecoat-MCP-Sync' } });
  if (!response.ok) throw new Error(`Upstream returned HTTP ${response.status}: ${url}`);
  // Size bound applies even when the server omits Content-Length.
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Empty upstream response.');
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      bytes += value.byteLength;
      if (bytes > 4_000_000) throw new Error('Upstream response exceeded 4 MB.');
      chunks.push(value);
    }
  } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = process.argv.slice(2);
  let ref: string | undefined;
  let check = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') check = true;
    else if (args[i] === '--ref' && args[i + 1]) ref = args[++i];
    else throw new Error('Usage: npm run sync -- [--ref release-tag-or-commit] [--check]');
  }
  if (!ref) {
    // GitHub releases can lag npm. Resolve the published version's immutable commit.
    const release = z.object({ version: z.string(), gitHead: z.string().regex(/^[a-f0-9]{40}$/) })
      .parse(JSON.parse(await fetchText('https://registry.npmjs.org/basecoat-css/latest')));
    ref = release.gitHead;
  }
  if (!/^[a-zA-Z0-9._-]+$/.test(ref)) throw new Error('Invalid upstream ref.');
  const tree = treeSchema.parse(JSON.parse(await fetchText(`${REPO}/git/trees/${encodeURIComponent(ref)}?recursive=1`)));
  const readSource = (path: string) => fetchText(`https://raw.githubusercontent.com/hunvreus/basecoat/${tree.sha}/${path}`);
  const filename = resolve(ROOT, 'src/registry/components.json');
  const before = await readFile(filename, 'utf8');
  const current = registrySchema.parse(JSON.parse(before));
  const next = await buildSnapshot(current, tree, readSource);
  const license = await readSource('LICENSE.md');
  const notices = await readFile(resolve(ROOT, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  if (!notices.includes(license.trim())) throw new Error('Upstream license changed; update THIRD_PARTY_NOTICES.md before sync.');
  const after = `${JSON.stringify(next, null, 2)}\n`;
  if (check) {
    if (before !== after) throw new Error('Registry differs from upstream. Run sync, review the diff, and test.');
    console.error(`Registry matches ${tree.sha}.`);
    return;
  }
  const temporary = `${filename}.${randomUUID()}.tmp`;
  try {
    await writeFile(temporary, after, { flag: 'wx' });
    await rename(temporary, filename);
  } finally { await unlink(temporary).catch(() => {}); }
  console.error(`Synced Basecoat ${next.upstream.version}: ${next.upstream.components.length} discovered, ${next.index.length} curated; ${tree.sha}. Review templates when source hashes change.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => { console.error((error as Error).message); process.exitCode = 1; });
}
