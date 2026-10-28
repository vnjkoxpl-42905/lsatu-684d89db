import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProgressWindow } from '@/lib/firstAnswerProgress';

export function parseProgressWindow(value: string | null): ProgressWindow | null {
  if (value === 'all') return 'all';
  if (value === '7' || value === '14' || value === '21' || value === '30') return Number(value) as ProgressWindow;
  return null;
}

/** Each surface's URL is authoritative. Old browser preferences remain untouched. */
export function useProgressWindow(): [ProgressWindow, (value: ProgressWindow) => void] {
  const [params, setParams] = useSearchParams();
  const window = parseProgressWindow(params.get('window')) ?? 30;
  const setWindow = useCallback((value: ProgressWindow) => {
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('window', String(value));
      next.delete('progressAnswer');
      next.delete('historySelected');
      next.delete('progressEvidence');
      return next;
    }, { replace: true });
  }, [setParams]);
  return [window, setWindow];
}
