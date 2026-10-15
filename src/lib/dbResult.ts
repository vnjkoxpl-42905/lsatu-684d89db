/**
 * dbResult — the one place that turns a Supabase result into a throw.
 *
 * supabase-js v2 never throws on a DB error: every builder resolves with
 * `{ data, error }`. Awaiting a builder and discarding the result silently
 * eats RLS rejections, constraint violations, and outages. This violates the
 * repo rule "DB mutations never swallow errors". `must()` is the shared fix:
 * await the query, throw on `error`, return `data`. Callers surface the throw
 * as a toast at the UI boundary.
 *
 * Reference implementations that already do this by hand and should keep doing
 * so: journalService.ts, questionExposure.ts.
 *
 * Usage:
 *   const rows = await must(supabase.from('attempts').insert(payload).select());
 *   await mustVoid(supabase.from('profiles').update(patch).eq('class_id', id));
 */

/** The shape every supabase-js builder resolves to. */
export interface DbResult<T> {
  data: T;
  error: unknown;
}

function messageOf(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return String(error);
}

/**
 * Await a Supabase query, throw on error, return its data.
 * Use when the caller needs the returned rows (e.g. `.select()` after insert).
 */
export async function must<T>(query: PromiseLike<DbResult<T>>): Promise<T> {
  const { data, error } = await query;
  if (error) throw new Error(messageOf(error));
  return data;
}

/**
 * Await a mutation that returns no meaningful data (bare insert/update/delete).
 * Throws on error; resolves void on success.
 */
export async function mustVoid(
  query: PromiseLike<{ error: unknown }>,
): Promise<void> {
  const { error } = await query;
  if (error) throw new Error(messageOf(error));
}
