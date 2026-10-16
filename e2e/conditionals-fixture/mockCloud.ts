// Dedicated local fixture only. Never imported by the production Vite configuration.
export let failSaves = false;
export function setFailSaves(value: boolean) { failSaves = value; }
type Row = { user_id: string; table_name: string; record_id: string; data: unknown; updated_at: string };
export const supabase = { from: (table: string) => {
  let operation = 'read'; let payload: Partial<Row> = {}; const filters: Record<string, unknown> = {};
  const builder = {
    select: () => builder,
    eq: (key: string, value: unknown) => { filters[key] = value; return builder; },
    in: () => builder,
    order: () => builder,
    then: (resolve: (value: unknown) => unknown) => {
      const user = filters.student_id;
      const targets: Record<string, unknown> = {
        'fixture-a': { scope: 'course', mode: 'learn', difficulty: 'beginner' },
        'fixture-b': { scope: 'skill', mode: 'learn', difficulty: 'beginner', unitId: 'group-2' },
        'fixture-c': { scope: 'skill', mode: 'practice', difficulty: 'advanced', unitId: 'group-3' },
      };
      return Promise.resolve({ data: table === 'classroom_items' && typeof user === 'string' && targets[user] ? [{ id: `assigned-${user}`, student_id: user, type: 'bootcamp_module', title: 'Conditional Logic', source_id: '/bootcamp/conditionals', metadata_json: { conditional_target: targets[user] }, status: 'assigned', visible_to_student: true, unlock_at: null }] : [], error: null }).then(resolve);
    },
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
