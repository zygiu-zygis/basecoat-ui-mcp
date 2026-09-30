// Author & maintainer: Žygimantas Jasiulionis / Intellmedia.
// Bounded MCP packet helpers and opaque pagination cursors for macro tools.
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';
import { jsonResult, MAX_DETAIL_BYTES } from '../tools/budget.js';
import {
  LIMITS,
  macroCursorPayloadSchema,
  type MacroCursorPayload,
} from './schema.js';

export class MacroError extends Error {
  constructor(
    public readonly code: string,
    message = code,
  ) {
    super(message);
    this.name = 'MacroError';
  }
}

export function rawMacroResult(
  packet: unknown,
  isError = false,
): CallToolResult {
  return {
    ...jsonResult(packet),
    ...(isError ? { isError: true } : {}),
  };
}

export function resultBytes(result: CallToolResult): number {
  return Buffer.byteLength(JSON.stringify(result), 'utf8');
}

export function boundedMacroResult(
  packet: unknown,
  isError = false,
): CallToolResult {
  const result = rawMacroResult(packet, isError);
  if (resultBytes(result) > MAX_DETAIL_BYTES) {
    throw new MacroError('PACKET_TOO_LARGE');
  }
  return result;
}

export function pageRecords<T>(
  records: readonly T[],
  start: number,
  header: Record<string, unknown>,
  cursorFor: (offset: number) => string,
  options: { maxItems?: number } = {},
): CallToolResult {
  if (
    !Number.isSafeInteger(start) ||
    start < 0 ||
    start > records.length
  ) {
    throw new MacroError('INVALID_CURSOR');
  }
  const maxItems = options.maxItems ?? records.length;
  if (
    !Number.isSafeInteger(maxItems) ||
    maxItems < 0 ||
    (maxItems === 0 && start < records.length)
  ) {
    throw new MacroError('INVALID_PACKET');
  }
  const items: T[] = [];
  const endLimit = Math.min(records.length, start + maxItems);
  let best = rawMacroResult({
    ...header,
    items,
    next: start < records.length ? cursorFor(start) : null,
  });
  if (resultBytes(best) > MAX_DETAIL_BYTES) {
    throw new MacroError('HEADER_TOO_LARGE');
  }
  let end = start;
  for (; end < endLimit; end++) {
    const candidateItems = [...items, records[end]!];
    const candidate = rawMacroResult({
      ...header,
      items: candidateItems,
      next:
        end + 1 < records.length
          ? cursorFor(end + 1)
          : null,
    });
    if (resultBytes(candidate) > MAX_DETAIL_BYTES) {
      break;
    }
    items.push(records[end]!);
    best = candidate;
  }
  if (end === start && start < records.length) {
    throw new MacroError('ATOM_TOO_LARGE');
  }
  return best;
}

export interface CursorExpectation {
  fingerprint: string;
  snapshot: string;
  section?: MacroCursorPayload['section'];
  view?: MacroCursorPayload['view'];
  designRevision?: number;
  registryRevision?: string;
  /** When provided, the referenced immutable snapshot must exist. */
  snapshotExists?: boolean;
}

function assertJsonSafe(value: unknown, seen = new Set<object>()): void {
  if (value === null) return;
  const type = typeof value;
  if (type === 'string' || type === 'boolean') return;
  if (type === 'number') {
    if (!Number.isFinite(value)) throw new MacroError('INVALID_PACKET');
    return;
  }
  if (type !== 'object') throw new MacroError('INVALID_PACKET');
  const obj = value as object;
  if (seen.has(obj)) throw new MacroError('INVALID_PACKET');
  seen.add(obj);
  if (Array.isArray(value)) {
    for (const item of value) assertJsonSafe(item, seen);
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    assertJsonSafe((value as Record<string, unknown>)[key], seen);
  }
}

/** Encode an opaque, bounded cursor. Cursors are pagination state, not credentials. */
export function encodeMacroCursor(payload: MacroCursorPayload): string {
  const parsed = macroCursorPayloadSchema.parse(payload);
  assertJsonSafe(parsed);
  const encoded = Buffer.from(JSON.stringify(parsed), 'utf8').toString('base64url');
  if (Buffer.byteLength(encoded, 'utf8') > LIMITS.cursorMaxBytes) {
    throw new MacroError('CURSOR_TOO_LARGE');
  }
  return encoded;
}

export function decodeMacroCursor(cursor: string): MacroCursorPayload {
  if (typeof cursor !== 'string' || cursor.length === 0) {
    throw new MacroError('INVALID_CURSOR');
  }
  if (Buffer.byteLength(cursor, 'utf8') > LIMITS.cursorMaxBytes) {
    throw new MacroError('INVALID_CURSOR');
  }
  let raw: unknown;
  try {
    raw = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8'));
  } catch {
    throw new MacroError('INVALID_CURSOR');
  }
  const parsed = macroCursorPayloadSchema.safeParse(raw);
  if (!parsed.success) throw new MacroError('INVALID_CURSOR');
  return parsed.data;
}

/**
 * Validate a decoded cursor against the active query and pinned snapshot.
 * Returns STALE_CURSOR when revision/snapshot identity no longer matches.
 */
export function validateMacroCursor(
  cursor: string | MacroCursorPayload,
  expected: CursorExpectation,
): MacroCursorPayload {
  const payload = typeof cursor === 'string' ? decodeMacroCursor(cursor) : macroCursorPayloadSchema.parse(cursor);

  if (payload.fingerprint !== expected.fingerprint) {
    throw new MacroError('CURSOR_MISMATCH', 'Cursor fingerprint does not match query');
  }
  if (payload.snapshot !== expected.snapshot) {
    throw new MacroError('STALE_CURSOR', 'Cursor snapshot does not match pinned identity');
  }
  if (expected.section !== undefined && payload.section !== expected.section) {
    throw new MacroError('CURSOR_MISMATCH', 'Cursor section does not match request');
  }
  if (expected.view !== undefined && payload.view !== expected.view) {
    throw new MacroError('CURSOR_MISMATCH', 'Cursor view does not match request');
  }
  if (
    expected.designRevision !== undefined &&
    payload.designRevision !== expected.designRevision
  ) {
    throw new MacroError('STALE_CURSOR', 'Cursor design revision does not match');
  }
  if (
    expected.registryRevision !== undefined &&
    payload.registryRevision !== expected.registryRevision
  ) {
    throw new MacroError('STALE_CURSOR', 'Cursor registry revision does not match');
  }
  if (expected.snapshotExists === false) {
    throw new MacroError('STALE_CURSOR', 'Referenced immutable snapshot is missing');
  }
  if (!Number.isSafeInteger(payload.offset) || payload.offset < 0) {
    throw new MacroError('INVALID_CURSOR');
  }
  return payload;
}

export function createCursorFactory(
  base: Omit<MacroCursorPayload, 'offset'>,
): (offset: number) => string {
  const fixed = macroCursorPayloadSchema.omit({ offset: true }).parse(base);
  return (offset: number) => encodeMacroCursor({ ...fixed, offset });
}

export { MAX_DETAIL_BYTES };
