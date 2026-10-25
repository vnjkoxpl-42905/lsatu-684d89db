import { supabase } from '@/integrations/supabase/client';
import type { Database, Json } from '@/integrations/supabase/types';
import { decodeRcSavedSet, type RcSavedPayload } from '../lib/rcSavedSetCodec';

type Row = Database['public']['Tables']['user_saved_sets']['Row'];
export type RcSavedDefinition = { id: string; userId: string; name: string; createdAt: string; payload: RcSavedPayload | null; problem: string | null };
async function actor(expected: string): Promise<void> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !expected || data.user?.id !== expected) throw new Error('The signed-in account changed. Reload your saved RC sets.');
}
function map(row: Row, owner: string): RcSavedDefinition {
  if (row.user_id !== owner) throw new Error('This saved RC set belongs to another account.');
  const decoded = decodeRcSavedSet(row.filter_state);
  return { id: row.id, userId: row.user_id, name: row.name, createdAt: row.created_at, payload: decoded.status === 'ok' ? decoded.value : null,
    problem: decoded.status === 'ok' ? null : decoded.status === 'unsupported-version' ? 'This saved RC set needs a newer version of the app.' : 'This saved RC set could not be verified. Its stored contents have been kept.' };
}
export async function listRcSavedSets(owner: string): Promise<RcSavedDefinition[]> {
  await actor(owner);
  const rows = new Map<string, RcSavedDefinition>();
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await supabase.from('user_saved_sets').select('*').eq('user_id', owner).eq('filter_state->>kind', 'rc-builder')
      .order('created_at', { ascending: false }).order('id', { ascending: false }).range(offset, offset + 999);
    if (error) throw new Error('Your saved RC sets could not be loaded. Try again.');
    await actor(owner);
    for (const row of data ?? []) { const saved = map(row, owner); if (!rows.has(saved.id)) rows.set(saved.id, saved); }
    if ((data?.length ?? 0) < 1000) break;
  }
  return [...rows.values()];
}
export async function getRcSavedSet(owner: string, id: string): Promise<RcSavedDefinition> {
  await actor(owner);
  const { data, error } = await supabase.from('user_saved_sets').select('*').eq('user_id', owner).eq('id', id).eq('filter_state->>kind', 'rc-builder').maybeSingle();
  if (error || !data) throw new Error('That saved RC set could not be loaded for this account.');
  await actor(owner); return map(data, owner);
}
export async function saveRcSet(owner: string, name: string, raw: RcSavedPayload, id: string): Promise<RcSavedDefinition> {
  await actor(owner);
  const decoded = decodeRcSavedSet(raw);
  if (decoded.status !== 'ok' || !name.trim() || name.trim().length > 100 || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) throw new Error('Enter a name and verify this RC selection before saving.');
  const payload = decoded.value;
  const { data, error } = await supabase.from('user_saved_sets').insert({ id, user_id: owner, name: name.trim(), filter_state: payload as unknown as Json, question_ids: payload.questionIds.map(q => `RC-Q${q}`) }).select('*').single();
  await actor(owner);
  let saved: RcSavedDefinition;
  if (error) {
    try { saved = await getRcSavedSet(owner, id); } catch { throw new Error('This RC set was not confirmed saved. Retry the same save.'); }
  } else if (data) saved = map(data, owner);
  else throw new Error('This RC set was not confirmed saved. Retry the same save.');
  if (saved.id !== id || saved.name !== name.trim() || JSON.stringify(saved.payload) !== JSON.stringify(payload)) throw new Error('The saved RC set did not match this request. Its stored contents have been kept.');
  return saved;
}
export async function renameRcSet(owner: string, id: string, name: string, expectedName: string): Promise<void> {
  await actor(owner);
  if (typeof expectedName !== 'string' || !expectedName.trim()) throw new Error('The previous name could not be verified. Refresh saved RC sets before renaming.');
  if (!name.trim() || name.trim().length > 100) throw new Error('Enter a name of 100 characters or fewer.');
  const { data, error } = await supabase.from('user_saved_sets').update({ name: name.trim() }).eq('name', expectedName).eq('id', id).eq('user_id', owner).eq('filter_state->>kind', 'rc-builder').select('id,name').maybeSingle();
  await actor(owner);
  if (data && !error && data.id === id && data.name === name.trim()) return;
  // A lost acknowledgement may already have committed this exact desired name.
  let current: RcSavedDefinition;
  try { current = await getRcSavedSet(owner, id); } catch { throw new Error('The new name did not reach your account. Refresh saved RC sets and retry.'); }
  if (current.name === name.trim()) return;
  if (current.name === expectedName) throw new Error('The new name did not save. Your previous name is unchanged. Retry the rename.');
  throw new Error('This saved set changed on another device. Refresh saved RC sets, review its current name, then retry.');
}
