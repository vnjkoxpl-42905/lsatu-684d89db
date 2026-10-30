import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const TOPIC = 'unless-drill';
export type UnlessMilestone = 'cleared-10s' | 'cleared-5s';
const valid = (value: unknown): value is UnlessMilestone => value === 'cleared-10s' || value === 'cleared-5s';
export const unlessMilestoneKey = (userId?: string, edition = 'legacy') => `lsatu.unless-drill.milestones.v2:${userId ?? 'anonymous'}:${edition}`;
function readLocal(key: string): UnlessMilestone[] {
  try { const value = JSON.parse(localStorage.getItem(key) ?? '[]'); return Array.isArray(value) ? value.filter(valid) : []; } catch { return []; }
}

/** Signed-in unlocks are acknowledged account records. Old unscoped cache bytes remain untouched. */
export function useUnlessMilestones(edition = 'legacy') {
  const { user } = useAuth();
  const userId = user?.id;
  const actor = `${userId ?? 'anonymous'}:${edition}`;
  const key = unlessMilestoneKey(userId, edition);
  const [state, setState] = useState<{ actor: string; values: Set<UnlessMilestone> }>({ actor: '', values: new Set() });
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [retryTarget, setRetryTarget] = useState<UnlessMilestone | null>(null);
  const generation = useRef(0);
  const load = useCallback(async () => {
    const request = ++generation.current;
    setState({ actor, values: new Set() }); setLoading(true); setError(''); setRetryTarget(null); setPending(false);
    try {
      if (!userId) { setState({ actor, values: new Set(readLocal(key)) }); return; }
      const { data, error: failure } = await supabase.from('chapter_progress').select('section_id').eq('user_id', userId).eq('topic_tag', TOPIC);
      if (failure) throw failure;
      if (request !== generation.current) return;
      const values = new Set<UnlessMilestone>((data ?? []).map(row => row.section_id).filter(valid));
      setState({ actor, values });
      try { localStorage.setItem(key, JSON.stringify([...values])); } catch { /* Account acknowledgement is authoritative. */ }
    } catch { if (request === generation.current) setError('Your saved unlocks could not be loaded. Retry before using the faster pace.'); }
    finally { if (request === generation.current) setLoading(false); }
  }, [actor, key, userId]);
  useEffect(() => { void load(); return () => { generation.current++; }; }, [load]);
  const record = useCallback(async (milestone: UnlessMilestone): Promise<boolean> => {
    const request = generation.current;
    setPending(true); setError(''); setRetryTarget(milestone);
    try {
      if (userId) {
        const now = new Date().toISOString();
        const { error: failure } = await supabase.from('chapter_progress').insert({ user_id: userId, topic_tag: TOPIC, section_id: milestone, first_viewed_at: now, last_viewed_at: now, view_count: 1 });
        if (failure && failure.code !== '23505') throw failure;
      }
      if (request !== generation.current) return false;
      setState(previous => {
        const values = new Set(previous.actor === actor ? previous.values : []); values.add(milestone);
        try { localStorage.setItem(key, JSON.stringify([...values])); } catch { /* Cloud success still counts. */ }
        return { actor, values };
      });
      setRetryTarget(null); return true;
    } catch { if (request === generation.current) setError('Your round is complete, but its unlock was not saved. Retry saving.'); return false; }
    finally { if (request === generation.current) setPending(false); }
  }, [actor, key, userId]);
  return { milestones: state.actor === actor ? state.values : new Set<UnlessMilestone>(), loading: loading || state.actor !== actor, pending, error, record, retry: () => retryTarget ? record(retryTarget) : load() };
}
