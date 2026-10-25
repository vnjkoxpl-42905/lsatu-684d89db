export interface CoachRequest { contractVersion: 1; requestId: string; sourceKind: "assignment" | "preview"; sourceId: string; itemOrder: number; studentResponse: string; attemptNo: number }
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function readCoachRequest(raw: string): CoachRequest | null {
  if (new TextEncoder().encode(raw).length > 65536) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const allowed = ["contractVersion", "requestId", "sourceKind", "sourceId", "itemOrder", "studentResponse", "attemptNo"];
    if (Object.keys(value).some(key => !allowed.includes(key))) return null;
    if (value.contractVersion !== 1 || typeof value.requestId !== "string" || !uuid.test(value.requestId) || typeof value.sourceId !== "string" || !uuid.test(value.sourceId) || !["assignment", "preview"].includes(value.sourceKind) || !Number.isSafeInteger(value.itemOrder) || value.itemOrder < 1 || ![1, 2].includes(value.attemptNo) || typeof value.studentResponse !== "string" || !value.studentResponse.trim() || value.studentResponse.length > 10000) return null;
    return value as CoachRequest;
  } catch { return null; }
}

/** Bound allocation before decoding an authenticated request body. */
export async function readBoundedBody(request: Request): Promise<string | null> {
  if (Number(request.headers.get("content-length")) > 65536) return null;
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > 65536) { await reader.cancel(); return null; }
      chunks.push(value);
    }
    const bytes = new Uint8Array(length); let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch { return null; } finally { reader.releaseLock(); }
}
