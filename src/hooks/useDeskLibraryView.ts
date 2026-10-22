import { useCallback, useEffect, useState } from 'react';

export type LibraryView = 'grid' | 'list' | 'columns' | 'gallery';

const STORAGE_KEY = 'deskLibrary:viewMode';
const DEFAULT: LibraryView = 'grid';

function isView(v: string | null): v is LibraryView {
  return v === 'grid' || v === 'list' || v === 'columns' || v === 'gallery';
}

function read(): LibraryView {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    return isView(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

/**
 * Finder-style view preference for the Teacher Desk Library, persisted to
 * localStorage and shared across tabs. A storage event keeps multiple mounts
 * (e.g. the switcher in the container and a surface) in sync.
 */
export function useDeskLibraryView(): [LibraryView, (v: LibraryView) => void] {
  const [view, setViewState] = useState<LibraryView>(read);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && isView(e.newValue)) setViewState(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setView = useCallback((v: LibraryView) => {
    setViewState(v);
    try {
      localStorage.setItem(STORAGE_KEY, v);
    } catch {
      // ignore quota / disabled storage
    }
  }, []);

  return [view, setView];
}

export default useDeskLibraryView;
