// Dedicated local fixture only. Never imported by the production Vite configuration.
export let failSaves = false;
export function setFailSaves(value: boolean) { failSaves = value; }
type Row = { user_id: string; table_name: string; record_id: string; data: unknown; updated_at: string };
export const supabase = { from: () => {
  let operation = 'read'; let payload: Partial<Row> = {}; const filters: Record<string, string> = {};
  const builder = {
    select: () => builder,
    eq: (key: string, value: string) => { filters[key] = value; return builder; },
    abortSignal: () => builder,
    insert: (value: Row) => { operation = 'insert'; payload = value; return builder; },
    update: (value: Partial<Row>) => { operation = 'update'; payload = value; return builder; },
    maybeSingle: async () => {
      const user = payload.user_id ?? filters.user_id;
      const key = `fixture-cloud:${user}`;
      const raw = localStorage.getItem(key);
      const existing: Row | null = raw ? JSON.parse(raw) : null;
      if (operation === 'read') return { data: existing, error: null };
      if (failSaves) return { data: null, error: new Error('Fixture cloud is unavailable. Your draft remains on this device.') };
      if (operation === 'insert' && existing) return { data: null, error: { code: '23505' } };
      if (operation === 'update' && existing?.updated_at !== filters.updated_at) return { data: null, error: null };
      const row = { ...existing, ...payload, updated_at: new Date().toISOString() } as Row;
      localStorage.setItem(key, JSON.stringify(row));
      return { data: row, error: null };
    },
  }; return builder;
} };
