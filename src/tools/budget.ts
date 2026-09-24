// Byte bound is deliberately stricter than a chars/4 token estimate.
// For byte-level BPE tokenizers, each token consumes at least one UTF-8 byte.
// The complete MCP CallToolResult JSON, not only its text, must fit this budget.
export const MAX_DETAIL_BYTES = 1999;
export function jsonResult(value: unknown) {
  return { content: [{ type: 'text' as const, text: JSON.stringify(value) }] };
}
export function responseBytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(jsonResult(value)), 'utf8');
}
export function assertDetailBudget(value: unknown): void {
  if (responseBytes(value) > MAX_DETAIL_BYTES) {
    throw new Error('Component response exceeds 1999 UTF-8 bytes; shorten the registry template before serving it.');
  }
}
