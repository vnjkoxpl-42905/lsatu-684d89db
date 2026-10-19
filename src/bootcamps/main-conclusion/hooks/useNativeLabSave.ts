import { useEffect, useRef, useState } from 'react';
import { saveNativeLabSubmission, type NativeLabKind, type NativeLabSubmission } from '@/bootcamps/main-conclusion/lib/nativeLabAttempt';

export function useNativeLabSave(kind?: NativeLabKind, userId?: string) {
  const run = useRef(crypto.randomUUID());
  const currentOwner = useRef(userId); currentOwner.current = userId;
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  const runOwner = useRef(userId);
  const ordinals = useRef(new Map<string, number>());
  const pending = useRef<NativeLabSubmission | null>(null);
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function save(questionId: string, answer: string, correct: boolean): Promise<boolean> {
    if (!kind) return true;
    if (busy.current) return false;
    busy.current = true; setSaving(true); setError(null);
    try {
      if (!userId) throw new Error('Sign in to save this lab answer.');
      if (runOwner.current !== userId) {
        if (pending.current) throw new Error('A different account has an unconfirmed answer.');
        runOwner.current = userId; run.current = crypto.randomUUID(); ordinals.current.clear();
      }
      if (!pending.current) pending.current = {
        id: crypto.randomUUID(), user_id: userId, drill_id: `native-lab:${kind}:${run.current}`,
        question_id: questionId, mode: 'native_lab_v1', correct,
        selected_answer: JSON.stringify({ answer, ordinal: (ordinals.current.get(questionId) ?? 0) + 1, run_id: run.current }),
      };
      if (pending.current.user_id !== userId || pending.current.question_id !== questionId) throw new Error('Your pending answer belongs to a different account or question.');
      const savedAnswer = JSON.parse(pending.current.selected_answer) as { answer: string };
      if (savedAnswer.answer !== answer || pending.current.correct !== correct) throw new Error('Retry the original pending answer before changing it.');
      await saveNativeLabSubmission(pending.current);
      if (!mounted.current || currentOwner.current !== userId) return false;
      ordinals.current.set(questionId, (ordinals.current.get(questionId) ?? 0) + 1);
      pending.current = null;
      return true;
    } catch {
      if (mounted.current) setError('Your answer has not been confirmed in your account. Keep this page open and try saving again.');
      return false;
    } finally { busy.current = false; if (mounted.current) setSaving(false); }
  }
  function restart() {
    if (busy.current || pending.current) return false;
    run.current = crypto.randomUUID(); ordinals.current.clear(); setError(null); return true;
  }
  return { save, restart, saving, error, blocked: saving || !!error, isCurrent: () => mounted.current && currentOwner.current === userId };
}
