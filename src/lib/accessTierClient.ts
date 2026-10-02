import { supabase } from '@/integrations/supabase/client';
import { CONFIGURABLE_FLAG_KEYS, tierFlags, type AccessTier, type ManagedUser } from '@/lib/adminUsers';

/**
 * Tier reads and writes that work whether or not the new admin-manage-users
 * function is deployed. The frontend can ship ahead of the function (edge
 * functions deploy through Lovable, separately from a publish), and an older
 * function neither returns access_tier nor knows set_tier or the practice-test
 * actions. Admins can read and write profiles directly under RLS, so each path
 * falls back to the table when the function cannot do the job.
 *
 * Without the read fallback the People page would show every student as
 * "No tier", and the signup queue would offer to put all of them on Tier 3.
 */

/** Fill access_tier from profiles when the list came from an older function. */
export async function withAccessTiers(users: ManagedUser[]): Promise<ManagedUser[]> {
  if (users.length === 0 || users.some((u) => 'access_tier' in u)) return users;
  const { data, error } = await supabase
    .from('profiles')
    .select('class_id, access_tier' as never);
  if (error) throw error;
  const tiers = new Map(
    ((data ?? []) as unknown as Array<{ class_id: string; access_tier: AccessTier | null }>).map((row) => [
      row.class_id,
      row.access_tier,
    ]),
  );
  return users.map((u) => ({ ...u, access_tier: tiers.get(u.class_id) ?? null }));
}

/** The whole list, tiers included, from either function version. */
export async function listManagedUsers(): Promise<ManagedUser[]> {
  const res = await supabase.functions.invoke('admin-manage-users', { method: 'GET' });
  if (res.error) throw res.error;
  return withAccessTiers(((res.data as ManagedUser[]) ?? []) as ManagedUser[]);
}

/**
 * Apply and verify every preset flag. An older function can acknowledge a tier
 * while applying obsolete defaults, so its tier label alone is not proof.
 */
export async function setStudentTier(classId: string, tier: AccessTier): Promise<void> {
  const expected = tierFlags(tier);
  const res = await supabase.functions.invoke('admin-manage-users', {
    method: 'POST',
    body: { action: 'set_tier', class_id: classId, tier },
  });
  const written = (res.data as { profile?: Record<string, unknown> } | null)?.profile;
  const matches = (row: Record<string, unknown> | undefined) => row?.access_tier === tier &&
    Object.entries(expected).every(([key, value]) => row[key] === value);
  if (!res.error && matches(written)) return;

  const updates: Record<string, unknown> = { access_tier: tier, ...expected };
  const { data, error } = await supabase
    .from('profiles')
    .update(updates as never)
    .eq('class_id', classId)
    .select('*');
  if (error) throw error;
  const row = (data ?? [])[0] as unknown as Record<string, unknown> | undefined;
  if (!matches(row)) throw new Error('Tier defaults were not saved. The access policy migration must be applied.');
}

/** Write only the selected door; the database derives review atomically. */
export async function setStudentAccess(person: ManagedUser, field: string, value: boolean): Promise<void> {
  if (!(CONFIGURABLE_FLAG_KEYS as readonly string[]).includes(field)) throw new Error('Unknown access control');
  const updates = { [field]: value };
  const { data, error } = await supabase.from('profiles').update(updates as never)
    .eq('class_id', person.class_id).select('*');
  if (error) throw error;
  const row = (data ?? [])[0] as unknown as Record<string, unknown> | undefined;
  const practice = Boolean(row?.has_drill_access || row?.has_practice_access);
  if (!row || row[field] !== value ||
    ['has_journal_access', 'has_flagged_access', 'has_analytics_access'].some((key) => row[key] !== practice)) {
    throw new Error('Access override was not saved');
  }
}

/** Assign or unassign one PrepTest sitting, from either function version. */
export async function setPracticeTestAssignment(
  classId: string,
  pt: number,
  assign: boolean,
  adminId: string | undefined,
): Promise<void> {
  const res = await supabase.functions.invoke('admin-manage-users', {
    method: 'POST',
    body: { action: assign ? 'assign_practice_test' : 'unassign_practice_test', class_id: classId, pt },
  });
  if (!res.error && (res.data as { success?: boolean } | null)?.success) return;

  const sourceId = `practice_test:${pt}`;
  if (assign) {
    const { error } = await supabase.from('practice_test_assignments' as never).upsert(
      {
        student_id: classId,
        pt,
        assigned_by: adminId ?? null,
        assigned_at: new Date().toISOString(),
        status: 'assigned',
      } as never,
      { onConflict: 'student_id,pt' },
    );
    if (error) throw error;
    const { data: existing } = await supabase
      .from('classroom_items')
      .select('id')
      .eq('student_id', classId)
      .eq('type', 'practice_test' as never)
      .eq('source_id', sourceId)
      .maybeSingle();
    if (existing) {
      const { error: updateError } = await supabase
        .from('classroom_items')
        .update({ status: 'assigned', visible_to_student: true } as never)
        .eq('id', (existing as { id: string }).id);
      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase.from('classroom_items').insert({
        student_id: classId,
        created_by: adminId ?? null,
        type: 'practice_test',
        title: `PrepTest ${pt}`,
        description: 'A full practice test: three scored sections, in order, with a break.',
        source_table: 'practice_test_assignments',
        source_id: sourceId,
        status: 'assigned',
        visible_to_student: true,
        metadata_json: { pt, href: '/testing' },
      } as never);
      if (insertError) throw insertError;
    }
  } else {
    const { error } = await supabase
      .from('practice_test_assignments' as never)
      .update({ status: 'archived' } as never)
      .eq('student_id', classId)
      .eq('pt', pt);
    if (error) throw error;
    await supabase
      .from('classroom_items')
      .update({ status: 'archived' } as never)
      .eq('student_id', classId)
      .eq('type', 'practice_test' as never)
      .eq('source_id', sourceId);
  }
}
