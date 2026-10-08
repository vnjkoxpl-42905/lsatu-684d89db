import { useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { ProgressWindow } from '@/lib/firstAnswerProgress';

const STORAGE_KEY = 'lsatu:progress-window';

export function parseProgressWindow(value: string | null): ProgressWindow | null {
  if (value === 'all') return 'all';
  if (value === '7' || value === '14' || value === '21' || value === '30') return Number(value) as ProgressWindow;
  return null;
}

function storedWindow(): ProgressWindow | null {
  try { return parseProgressWindow(window.localStorage.getItem(STORAGE_KEY)); }
  catch { return null; }
}

/** URL wins when present; the account's last choice follows destination tabs. */
export function useProgressWindow(persist = true): [ProgressWindow, (value: ProgressWindow) => void] {
  const [params, setParams] = useSearchParams();
  const window = parseProgressWindow(params.get('window')) ?? (persist ? storedWindow() : null) ?? 30;
  const setWindow = useCallback((value: ProgressWindow) => {
    if (persist) try { globalThis.window.localStorage.setItem(STORAGE_KEY, String(value)); } catch { /* URL remains authoritative. */ }
    setParams((current) => {
      const next = new URLSearchParams(current);
      next.set('window', String(value));
      return next;
    }, { replace: true });
  }, [setParams, persist]);
  return [window, setWindow];
}
