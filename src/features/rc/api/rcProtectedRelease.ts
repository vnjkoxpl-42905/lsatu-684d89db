import { supabase } from '@/integrations/supabase/client';
import type { RcDrillSession } from '../lib/rcTypes';

/** A finished leg does not release a still-running full practice test. */
export async function assertRcParentReleased(session: RcDrillSession, actorId: string): Promise<void> {
  if (session.userId !== actorId) throw new Error('This drill belongs to another account.');
  const parentId = session.config.practiceTestRunId;
  if (!parentId) return;
  const { data, error } = await supabase.from('practice_test_runs')
    .select('id, user_id, status').eq('id', parentId).eq('user_id', actorId).maybeSingle();
  if (error) throw new Error('The practice test release could not be verified. Return to your practice test and try again.');
  if (!data || data.id !== parentId || data.user_id !== actorId || data.status !== 'complete') {
    throw new Error('This section stays sealed until the whole practice test is complete. Return to your practice test to continue.');
  }
}
