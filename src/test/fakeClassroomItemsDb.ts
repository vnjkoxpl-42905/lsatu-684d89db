import type { ClassroomItem } from '@/hooks/useClassroomItems';

/**
 * In-memory stand-in for the parts of `supabase.from(...)` the classroom-item
 * writers use. Updates apply only to rows matching every `eq`/`neq` filter and
 * stamp a new `updated_at`, mirroring the `classroom_items_touch` trigger, so a
 * compare-and-swap on `updated_at` behaves as it does in Postgres. Local only:
 * it proves writer logic, not RLS.
 */
export function createFakeClassroomDb(initial: ClassroomItem[]) {
  const rows = new Map(initial.map((r) => [r.id, structuredClone(r)]));
  let clock = 0;
  const hooks: { beforeUpdate?: (id: string) => void } = {};
  const updates: Array<{ id: string; patch: Record<string, unknown> }> = [];

  const stamp = () => `2026-10-02T12:00:${String(++clock).padStart(2, '0')}.000000+00:00`;

  /** A write made by someone else (another tab, the teacher, a sync). */
  function externalWrite(id: string, change: (row: ClassroomItem) => void) {
    const row = rows.get(id)!;
    change(row);
    row.updated_at = stamp();
  }

  function table(name: string) {
    if (name === 'notifications') {
      const chain = { update: () => chain, like: () => chain, eq: async () => ({ error: null }) };
      return chain;
    }
    const filters: Array<(r: ClassroomItem) => boolean> = [];
    let patch: Record<string, unknown> | null = null;
    const matching = () => [...rows.values()].filter((r) => filters.every((f) => f(r)));
    const run = () => {
      if (!patch) return matching().map((r) => structuredClone(r));
      const hit = matching();
      for (const r of hit) hooks.beforeUpdate?.(r.id);
      const again = matching();
      for (const r of again) {
        Object.assign(r, structuredClone(patch));
        r.updated_at = stamp();
        updates.push({ id: r.id, patch: structuredClone(patch) });
      }
      return again.map((r) => structuredClone(r));
    };
    const builder = {
      select: () => builder,
      update: (p: Record<string, unknown>) => { patch = p; return builder; },
      eq: (col: string, val: unknown) => { filters.push((r) => (r as unknown as Record<string, unknown>)[col] === val); return builder; },
      neq: (col: string, val: unknown) => { filters.push((r) => (r as unknown as Record<string, unknown>)[col] !== val); return builder; },
      order: () => builder,
      maybeSingle: async () => ({ data: run()[0] ?? null, error: null }),
      single: async () => {
        const out = run();
        return out.length === 1 ? { data: out[0], error: null } : { data: null, error: { message: 'no rows' } };
      },
      then: (resolve: (v: { data: ClassroomItem[]; error: null }) => unknown) => resolve({ data: run(), error: null }),
    };
    return builder;
  }

  return { rows, table, externalWrite, hooks, updates };
}
