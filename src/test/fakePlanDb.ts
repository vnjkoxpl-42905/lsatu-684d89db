// A small in-memory stand-in for the supabase-js query builder, enough for the
// weekly-plan reads: select/eq/neq/gte/lt/in/order/range/limit, awaited as
// { data, error }. It filters and sorts for real, so tests exercise what a
// query would actually return rather than a canned answer.

type Row = Record<string, unknown>;

export interface FakePlanDb {
  tables: Record<string, Row[]>;
  /** Every query made, as "table:filters", for asserting scope. */
  log: string[];
  /** Make the next reads of a table fail. */
  failTable: Set<string>;
  /** Optional gate: a promise each read waits on before answering. */
  gate?: () => Promise<void>;
  from: (table: string) => unknown;
}

// Accepts typed rows (interfaces have no index signature) and reads them as
// plain records.
export function fakePlanDb(tables: Record<string, object[]>): FakePlanDb {
  const db: FakePlanDb = {
    tables: tables as Record<string, Row[]>,
    log: [],
    failTable: new Set(),
    from(table: string) {
      const filters: ((r: Row) => boolean)[] = [];
      const desc: string[] = [];
      const orders: { col: string; asc: boolean }[] = [];
      let range: [number, number] | null = null;
      let limit: number | null = null;
      const q: Record<string, unknown> = {
        select: () => q,
        eq: (c: string, v: unknown) => (desc.push(`${c}=${v}`), filters.push((r) => r[c] === v), q),
        neq: (c: string, v: unknown) => (desc.push(`${c}!=${v}`), filters.push((r) => r[c] !== v), q),
        gte: (c: string, v: string) => (desc.push(`${c}>=${v}`), filters.push((r) => String(r[c]) >= v), q),
        lt: (c: string, v: string) => (desc.push(`${c}<${v}`), filters.push((r) => String(r[c]) < v), q),
        in: (c: string, vs: unknown[]) => (desc.push(`${c} in`), filters.push((r) => vs.includes(r[c])), q),
        order: (col: string, o?: { ascending?: boolean }) => (orders.push({ col, asc: o?.ascending !== false }), q),
        range: (a: number, b: number) => ((range = [a, b]), q),
        // Writes are recorded, never applied: these reads must not write.
        update: () => (db.log.push(`write:${table}`), q),
        insert: () => (db.log.push(`write:${table}`), q),
        upsert: () => (db.log.push(`write:${table}`), q),
        delete: () => (db.log.push(`write:${table}`), q),
        limit: (n: number) => ((limit = n), q),
        maybeSingle: () => ({
          then: (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) =>
            (q.then as (r: (v: { data: Row[] | null; error: unknown }) => unknown, j: typeof rej) => Promise<unknown>)(
              (v) => res({ data: v.data?.[0] ?? null, error: v.error }),
              rej,
            ),
        }),
        then: async (res: (v: unknown) => unknown, rej: (e: unknown) => unknown) => {
          try {
            db.log.push(`${table}:${desc.join(',')}`);
            if (db.gate) await db.gate();
            if (db.failTable.has(table)) return res({ data: null, error: new Error(`${table} unavailable`) });
            let rows = (db.tables[table] ?? []).filter((r) => filters.every((f) => f(r)));
            rows = rows.slice().sort((x, y) => {
              for (const { col, asc } of orders) {
                const a = String(x[col] ?? '');
                const b = String(y[col] ?? '');
                if (a !== b) return (a < b ? -1 : 1) * (asc ? 1 : -1);
              }
              return 0;
            });
            if (range) rows = rows.slice(range[0], range[1] + 1);
            if (limit !== null) rows = rows.slice(0, limit);
            return res({ data: rows, error: null });
          } catch (e) {
            return rej(e);
          }
        },
      };
      return q;
    },
  };
  return db;
}
