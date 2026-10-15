import * as React from 'react';

import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type NoteStatus = 'idle' | 'loading' | 'saving' | 'saved' | 'error';

const SAVE_DEBOUNCE_MS = 800;

/**
 * The admin's teaching note for one drill question.
 *
 * Loads on question change and autosaves while he types. Two things matter here
 * and are worth stating, because both were live bugs elsewhere in this app:
 *
 *  1. Switching questions flushes the pending save FIRST. A debounced save that
 *     fires after the qid has moved on writes the old text onto the new
 *     question. The pending body is held in a ref keyed by the qid it belongs
 *     to, so a late flush can only ever land on its own row.
 *
 *  2. `enabled` is false for every non-admin, and then this hook issues no
 *     query at all. A student must not be able to learn that notes exist by
 *     watching the network tab for a 403.
 */
export function useAdminQuestionNote(qid: string | null, enabled: boolean) {
  const { user } = useAuth();
  const userId = user?.id;

  const [body, setBody] = React.useState('');
  const [status, setStatus] = React.useState<NoteStatus>('idle');
  const [savedAt, setSavedAt] = React.useState<Date | null>(null);

  // What is waiting to be written, and for which question. Never a bare string:
  // the qid travels with it so a flush cannot cross question boundaries.
  const pendingRef = React.useRef<{ qid: string; body: string } | null>(null);
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  // Guards against a slow load resolving after the user has already moved on.
  const loadTokenRef = React.useRef(0);

  const write = React.useCallback(
    async (targetQid: string, nextBody: string) => {
      if (!userId) return;
      setStatus('saving');
      const { error } = await supabase
        .from('admin_question_notes')
        .upsert(
          { author_id: userId, qid: targetQid, body: nextBody },
          { onConflict: 'author_id,qid' },
        );
      if (error) {
        console.error('[admin-question-note] save failed:', error.message);
        setStatus('error');
        return;
      }
      setStatus('saved');
      setSavedAt(new Date());
    },
    [userId],
  );

  // Writes anything outstanding immediately. Called on question change and on
  // unmount, so closing the tab mid-sentence does not lose the sentence.
  const flush = React.useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    const pending = pendingRef.current;
    pendingRef.current = null;
    if (pending) void write(pending.qid, pending.body);
  }, [write]);

  // Load the note for the current question.
  React.useEffect(() => {
    if (!enabled || !userId || !qid) {
      setBody('');
      setStatus('idle');
      setSavedAt(null);
      return;
    }

    const token = ++loadTokenRef.current;
    setStatus('loading');
    setBody('');
    setSavedAt(null);

    void (async () => {
      const { data, error } = await supabase
        .from('admin_question_notes')
        .select('body, updated_at')
        .eq('author_id', userId)
        .eq('qid', qid)
        .maybeSingle();

      // A newer question won the race; this result is stale, drop it.
      if (token !== loadTokenRef.current) return;

      if (error) {
        console.error('[admin-question-note] load failed:', error.message);
        setStatus('error');
        return;
      }
      setBody(data?.body ?? '');
      setSavedAt(data?.updated_at ? new Date(data.updated_at) : null);
      setStatus('idle');
    })();
  }, [enabled, userId, qid]);

  // Flush when the question changes or the page goes away.
  React.useEffect(() => {
    return () => flush();
  }, [qid, flush]);

  const onChange = React.useCallback(
    (next: string) => {
      setBody(next);
      if (!enabled || !qid) return;
      pendingRef.current = { qid, body: next };
      setStatus('saving');
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) void write(pending.qid, pending.body);
      }, SAVE_DEBOUNCE_MS);
    },
    [enabled, qid, write],
  );

  return { body, onChange, status, savedAt, flush };
}
