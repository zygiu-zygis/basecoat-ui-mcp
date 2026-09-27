import { metadata } from '../registry/index.js';

const ID_ALIASES: Record<string, string> = Object.assign(Object.create(null), {
  'theme-toggle': 'theme-switcher',
});

const INDEX_IDS = metadata.map(component => component.id);

function editDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => Array(cols).fill(0) as number[]);
  for (let i = 0; i < rows; i++) matrix[i]![0] = i;
  for (let j = 0; j < cols; j++) matrix[0]![j] = j;
  for (let i = 1; i < rows; i++) {
    for (let j = 1; j < cols; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + cost,
      );
    }
  }
  return matrix[a.length]![b.length]!;
}

export function resolveComponentId(id: string): string {
  if (typeof id !== 'string') return String(id);
  return Object.hasOwn(ID_ALIASES, id) ? ID_ALIASES[id]! : id;
}

export function suggestComponentId(id: string): string | undefined {
  if (typeof id !== 'string' || id.length === 0) return undefined;
  const needle = id.toLowerCase();
  const head = needle.split('-')[0] ?? needle;
  let best: { id: string; score: number } | undefined;
  for (const candidate of INDEX_IDS) {
    const hay = candidate.toLowerCase();
    let score = editDistance(needle, hay);
    if (hay.includes(needle) || needle.includes(hay)) score = Math.min(score, 2);
    if (head.length >= 3 && hay.startsWith(`${head}-`)) score = Math.max(0, score - 2);
    const maxDistance = Math.max(6, Math.ceil(Math.max(needle.length, hay.length) / 2));
    if (score > maxDistance) continue;
    if (!best || score < best.score || (score === best.score && candidate < best.id)) {
      best = { id: candidate, score };
    }
  }
  return best?.id;
}
