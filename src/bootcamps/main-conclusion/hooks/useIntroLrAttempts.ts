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

export interface IntroLrDrillRollup {
  key: 'main-conclusion-lab' | 'conclusion-type-lab' | 'cluster-drill' | 'other';
  label: string;
  total: number;
  correct: number;
  accuracy: number;
  distinctQuestions: number;
  lastAttemptAt: string | null;
}

export interface IntroLrAttemptsSummary {
  loading: boolean;
  attempts: IntroLrAttemptRow[];
  total: number;
  correct: number;
  accuracy: number; // 0-100
  byMode: Array<{ mode: string; total: number; correct: number; accuracy: number }>;
  byDrill: IntroLrDrillRollup[];
  lastAttemptAt: string | null;
}

const EMPTY: IntroLrAttemptsSummary = {
  loading: true,
  attempts: [],
  total: 0,
  correct: 0,
  accuracy: 0,
  byMode: [],
  byDrill: [],
  lastAttemptAt: null,
};

export function classifyIntroLrAttempt(row: Pick<IntroLrAttemptRow, 'drill_id' | 'mode'>): {
  key: IntroLrDrillRollup['key'];
  label: string;
} {
  const drillId = row.drill_id ?? '';
  const mode = row.mode ?? '';
  if (drillId.startsWith('native-lab:main-conclusion') || drillId === 'MC-DRL-MCL') {
    return { key: 'main-conclusion-lab', label: 'Main Conclusion Lab' };
  }
  if (drillId.startsWith('native-lab:conclusion-type') || drillId === 'MC-DRL-CT') {
    return { key: 'conclusion-type-lab', label: 'Conclusion Type Lab' };
  }
  if (
    drillId === 'MC-DRL-HS-CLUSTER' ||
    drillId === 'MC-DRL-5.7' ||
    mode === 'cluster_decomposition' ||
    mode === 'cluster-decomposition'
  ) {
    return { key: 'cluster-drill', label: 'Hard Sentences: Cluster Drill' };
  }
  const cleanMode = mode
    .replace(/^native_lab_v1$/i, 'Drill Lab')
    .replace(/[_-]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { key: 'other', label: cleanMode || 'Drill Practice' };
}

export function decodeIntroLrSelectedAnswer(raw: string | null): string {
  if (!raw) return '';
  if (raw.startsWith('{')) {
    try {
      const parsed = JSON.parse(raw) as { answer?: unknown };
      if (typeof parsed.answer === 'string') return parsed.answer;
    } catch {
      // Fall back to raw string when not valid JSON.
    }
  }
  return raw;
}

export function summarizeIntroLrAttempts(rows: IntroLrAttemptRow[]): Omit<IntroLrAttemptsSummary, 'loading'> {
  const total = rows.length;
  const correct = rows.filter((r) => r.correct).length;
  const accuracy = total === 0 ? 0 : Math.round((correct / total) * 100);

  const labelMap = new Map<string, { total: number; correct: number }>();
  const drillMap = new Map<
    IntroLrDrillRollup['key'],
    {
      label: string;
      total: number;
      correct: number;
      questions: Set<string>;
      lastAttemptAt: string | null;
    }
  >();

  for (const r of rows) {
    const { key, label } = classifyIntroLrAttempt(r);
    const m = labelMap.get(label) ?? { total: 0, correct: 0 };
    m.total += 1;
    if (r.correct) m.correct += 1;
    labelMap.set(label, m);

    const d = drillMap.get(key) ?? {
      label,
      total: 0,
      correct: 0,
      questions: new Set<string>(),
      lastAttemptAt: null,
    };
    d.total += 1;
    if (r.correct) d.correct += 1;
    if (r.question_id) d.questions.add(r.question_id);
    if (!d.lastAttemptAt || new Date(r.created_at).getTime() > new Date(d.lastAttemptAt).getTime()) {
      d.lastAttemptAt = r.created_at;
    }
    drillMap.set(key, d);
  }

  const byMode = Array.from(labelMap.entries())
    .map(([mode, v]) => ({
      mode,
      total: v.total,
      correct: v.correct,
      accuracy: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => b.total - a.total);

  const byDrill = Array.from(drillMap.entries())
    .map(([key, v]) => ({
      key,
      label: v.label,
      total: v.total,
      correct: v.correct,
      accuracy: v.total === 0 ? 0 : Math.round((v.correct / v.total) * 100),
      distinctQuestions: v.questions.size,
      lastAttemptAt: v.lastAttemptAt,
    }))
    .sort((a, b) => b.total - a.total);

  return {
    attempts: rows,
    total,
    correct,
    accuracy,
    byMode,
    byDrill,
    lastAttemptAt: rows[0]?.created_at ?? null,
  };
}

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
      setState({
        loading: false,
        ...summarizeIntroLrAttempts(rows),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return state;
}
