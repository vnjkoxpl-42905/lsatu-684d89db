/**
 * Loads the current user's saved Intro to LR per-question attempts from
 * `public.intro_lr_attempts` and derives lightweight rollups for the
 * Diagnostics surface.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface IntroLrAttemptRow {
  id: string;
  drill_id: string;
  question_id: string;
  mode: string;
  selected_answer: string | null;
  correct: boolean;
  time_ms: number | null;
  created_at: string;
}

export interface IntroLrAttemptsSummary {
  loading: boolean;
  attempts: IntroLrAttemptRow[];
  total: number;
  correct: number;
  accuracy: number; // 0-100
  byMode: Array<{ mode: string; total: number; correct: number; accuracy: number }>;
  lastAttemptAt: string | null;
}

const EMPTY: IntroLrAttemptsSummary = {
  loading: true,
  attempts: [],
  total: 0,
  correct: 0,
  accuracy: 0,
  byMode: [],
  lastAttemptAt: null,
};

export function useIntroLrAttempts(): IntroLrAttemptsSummary {
  const { user } = useAuth();
  const [state, setState] = useState<IntroLrAttemptsSummary>(EMPTY);

  useEffect(() => {
    if (!user) {
      setState({ ...EMPTY, loading: false });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase
        .from('intro_lr_attempts')
        .select('id, drill_id, question_id, mode, selected_answer, correct, time_ms, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1000);
      if (cancelled) return;
      if (error) {
        console.warn('[useIntroLrAttempts] load failed', error.message);
        setState({ ...EMPTY, loading: false });
        return;
      }
      const rows = (data ?? []) as IntroLrAttemptRow[];
      const total = rows.length;
      const correct = rows.filter((r) => r.correct).length;
      const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);
      const modeMap = new Map<string, { total: number; correct: number }>();
      for (const r of rows) {
        const m = modeMap.get(r.mode) ?? { total: 0, correct: 0 };
        m.total += 1;
        if (r.correct) m.correct += 1;
        modeMap.set(r.mode, m);
      }
      const byMode = Array.from(modeMap.entries())
        .map(([mode, v]) => ({
          mode,
          total: v.total,
          correct: v.correct,
          accuracy: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100),
        }))
        .sort((a, b) => b.total - a.total);
      setState({
        loading: false,
        attempts: rows,
        total,
        correct,
        accuracy,
        byMode,
        lastAttemptAt: rows[0]?.created_at ?? null,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
