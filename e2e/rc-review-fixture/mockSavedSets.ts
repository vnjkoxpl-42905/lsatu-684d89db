import type { RcSavedDefinition } from '../../src/features/rc/api/rcSavedSets';
import { decodeRcSavedSet, type RcSavedPayload } from '../../src/features/rc/lib/rcSavedSetCodec';
const rows = new Map<string, RcSavedDefinition>();
let failWrites = false;
let lastCommand = '';
export function setFixtureSavedFailure(value: boolean) { failWrites = value; }
export function savedFixtureState() { return { count: rows.size, failWrites, lastCommand }; }
/** Optional browser-only seed. Normal saved-mode acceptance still starts empty. */
export function seedFixtureSavedRows() {
  const common = { kind: 'rc-builder' as const, version: 1 as const,
    config: { reveal: 'per_passage' as const, timing: { mode: 'unlimited' as const } },
    filters: { topics: [], formats: [], frameworks: [], families: [], difficulties: [], status: 'any' as const, preptestMin: 101, preptestMax: 159 },
  };
  const examples: [string, string, RcSavedPayload][] = [
    ['synthetic-fixed', '[Synthetic] One passage practice', { ...common, mode: 'fixed', count: 1, passageIds: [7], questionIds: [1, 2] }],
    ['synthetic-recipe', '[Synthetic] Four passage practice', { ...common, mode: 'recipe', count: 4, passageIds: [], questionIds: [] }],
  ];
  for (const [id, name, payload] of examples) {
    const decoded = decodeRcSavedSet(payload);
    if (decoded.status !== 'ok') throw new Error('Invalid synthetic saved-set seed.');
    if (!rows.has(id)) rows.set(id, { id, userId: 'synthetic-owner', name, createdAt: '2026-10-19T12:00:00Z', payload: decoded.value, problem: null });
  }
}
const owner = (actor: string) => { if (actor !== 'synthetic-owner') throw new Error('Synthetic account mismatch.'); };
export async function listRcSavedSets(actor: string) { owner(actor); return [...rows.values()].map(row => structuredClone(row)); }
export async function getRcSavedSet(actor: string, id: string) { owner(actor); const row = rows.get(id); if (!row) throw new Error('Synthetic saved RC set unavailable.'); return structuredClone(row); }
export async function saveRcSet(actor: string, name: string, payload: RcSavedPayload, id: string) {
  owner(actor); lastCommand = id; await new Promise(resolve => setTimeout(resolve, 150));
  if (failWrites) throw new Error('Synthetic RC save failed. Retry the original command after allowing saves.');
  const decoded = decodeRcSavedSet(payload); if (decoded.status !== 'ok') throw new Error('Synthetic payload invalid.');
  const existing = rows.get(id);
  if (existing && (existing.name !== name || JSON.stringify(existing.payload) !== JSON.stringify(decoded.value))) throw new Error('Synthetic command mismatch.');
  const row = existing ?? { id, userId: actor, name, createdAt: '2026-10-17T12:00:00Z', payload: decoded.value, problem: null };
  rows.set(id, row); return structuredClone(row);
}
export async function renameRcSet(actor: string, id: string, name: string, expectedName: string) { owner(actor); if (failWrites) throw new Error('Synthetic rename failed.'); const row = rows.get(id); if (!row) throw new Error('Synthetic saved RC set unavailable.'); if (row.name !== expectedName && row.name !== name) throw new Error('This saved set changed on another device. Refresh saved RC sets, review its current name, then retry.'); rows.set(id, { ...row, name }); }
