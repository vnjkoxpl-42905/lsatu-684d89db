import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import {
  bookmarkHref,
  clearQuestionMarks,
  eliminationsFor,
  emptyStudyTools,
  highlightsFor,
  isBookmarked,
  listBookmarks,
  loadStudyTools,
  mutateStudyTools,
  removeBookmark,
  studyToolsQuarantineKey,
  saveStudyTools,
  setEliminations,
  setHighlights,
  studyToolsStorageKey,
  toggleBookmark,
  type StudyStorage,
} from './questionStudyTools';
import { useQuestionStudyTools } from '@/hooks/useQuestionStudyTools';
import type { Highlight } from './highlightUtils';

function memoryStorage(initial: Record<string, string> = {}): StudyStorage & { data: Record<string, string> } {
  const data = { ...initial };
  return {
    data,
    getItem: (k) => (k in data ? data[k] : null),
    setItem: (k, v) => {
      data[k] = v;
    },
  };
}

const LR = { family: 'lr' as const, id: 'PT156-S2-Q1' };
const LR2 = { family: 'lr' as const, id: 'PT156-S2-Q2' };
const RC = { family: 'rc' as const, id: '4012' };
const hl: Highlight = { id: 'h1', start: 0, end: 5, text: 'Some ', color: 'yellow', section: 'stimulus' };

describe('identity and isolation', () => {
  it('files each actor under its own key and never reads another actor', () => {
    const storage = memoryStorage();
    const a = toggleBookmark(emptyStudyTools(), { ...LR, label: 'PT156 · S2 · Q1' });
    expect(saveStudyTools('student-a', a, storage)).toBe(true);

    expect(isBookmarked(loadStudyTools('student-a', storage).state, LR)).toBe(true);
    expect(isBookmarked(loadStudyTools('teacher', storage).state, LR)).toBe(false);
    expect(Object.keys(storage.data)).toEqual([studyToolsStorageKey('student-a')]);
  });

  it('has no anonymous bucket: no actor reads nothing and saves nothing', () => {
    const storage = memoryStorage();
    expect(saveStudyTools(null, toggleBookmark(emptyStudyTools(), { ...LR, label: 'x' }), storage)).toBe(false);
    expect(saveStudyTools('', emptyStudyTools(), storage)).toBe(false);
    expect(storage.data).toEqual({});
    expect(loadStudyTools(undefined, storage).status).toBe('unavailable');
  });

  it('keeps LR and RC questions with the same id apart', () => {
    let s = setEliminations(emptyStudyTools(), { family: 'lr', id: '4012' }, ['A']);
    s = setEliminations(s, RC, ['C']);
    expect(eliminationsFor(s, { family: 'lr', id: '4012' })).toEqual(['A']);
    expect(eliminationsFor(s, RC)).toEqual(['C']);
  });

  it('scopes RC cross-outs by session, apart from the question\'s bookmark', () => {
    const storage = memoryStorage();
    let s = toggleBookmark(emptyStudyTools(), { ...RC, passageId: 9, label: 'x' });
    s = setEliminations(s, { family: 'rc', id: 'session-1:4012' }, ['B']);
    saveStudyTools('u1', s, storage);
    const back = loadStudyTools('u1', storage);
    expect(back.status).toBe('ok');
    expect(eliminationsFor(back.state, { family: 'rc', id: 'session-1:4012' })).toEqual(['B']);
    expect(eliminationsFor(back.state, { family: 'rc', id: 'session-2:4012' })).toEqual([]);
    expect(eliminationsFor(back.state, RC)).toEqual([]);
    expect(isBookmarked(back.state, RC)).toBe(true);
  });

  it('keeps one question\'s aids off another', () => {
    let s = setEliminations(emptyStudyTools(), LR, ['B', 'D']);
    s = setHighlights(s, LR, [hl]);
    expect(eliminationsFor(s, LR2)).toEqual([]);
    expect(highlightsFor(s, LR2)).toEqual([]);
  });
});

describe('restore across navigation and reload', () => {
  it('round-trips bookmarks, cross-outs and highlights through storage', () => {
    const storage = memoryStorage();
    let s = toggleBookmark(emptyStudyTools(), { ...RC, passageId: 77, label: 'PT90 · S1 · P2 · Q3' });
    s = setEliminations(s, LR, ['E', 'A', 'A']);
    s = setHighlights(s, LR, [hl]);
    saveStudyTools('u1', s, storage);

    const reloaded = loadStudyTools('u1', storage);
    expect(reloaded.status).toBe('ok');
    expect(eliminationsFor(reloaded.state, LR)).toEqual(['A', 'E']);
    expect(highlightsFor(reloaded.state, LR)).toEqual([hl]);
    expect(listBookmarks(reloaded.state, 'rc')[0]).toMatchObject({ id: '4012', passageId: 77 });
  });

  it('opens bookmarks through existing routes', () => {
    const s = toggleBookmark(emptyStudyTools(), { ...RC, passageId: 77, label: 'x' });
    expect(bookmarkHref(listBookmarks(s)[0], () => '')).toBe('/rc/drill?passage=77&q=4012');
    const lr = toggleBookmark(emptyStudyTools(), { ...LR, label: 'x' });
    expect(bookmarkHref(listBookmarks(lr)[0], (qid) => `/drill?q=${qid}`)).toBe('/drill?q=PT156-S2-Q1');
    const noPassage = toggleBookmark(emptyStudyTools(), { ...RC, label: 'x' });
    expect(bookmarkHref(listBookmarks(noPassage)[0], () => '')).toBeNull();
  });

  it('the hook restores after a remount and drops state when the actor changes', () => {
    const storage = memoryStorage();
    const first = renderHook(() => useQuestionStudyTools('u1', storage));
    act(() => first.result.current.update((s) => setEliminations(s, LR, ['C'])));
    first.unmount();

    const { result, rerender } = renderHook(({ actor }) => useQuestionStudyTools(actor, storage), {
      initialProps: { actor: 'u1' as string | null },
    });
    expect(eliminationsFor(result.current.state, LR)).toEqual(['C']);
    expect(result.current.deviceSaved).toBe(true);

    rerender({ actor: 'u2' });
    expect(eliminationsFor(result.current.state, LR)).toEqual([]);
    rerender({ actor: null });
    expect(result.current.hasActor).toBe(false);
    expect(eliminationsFor(result.current.state, LR)).toEqual([]);
  });

  it('logout while mounted saves nothing, and returning to the first actor restores only their marks', () => {
    const storage = memoryStorage();
    const { result, rerender } = renderHook(({ actor }) => useQuestionStudyTools(actor, storage), {
      initialProps: { actor: 'u1' as string | null },
    });
    act(() => result.current.update((s) => setEliminations(s, LR, ['C'])));

    rerender({ actor: null });
    expect(eliminationsFor(result.current.state, LR)).toEqual([]);
    act(() => result.current.update((s) => setEliminations(s, LR, ['D'])));
    expect(result.current.deviceSaved).toBe(false);

    rerender({ actor: 'u2' });
    expect(eliminationsFor(result.current.state, LR)).toEqual([]);
    act(() => result.current.update((s) => setEliminations(s, LR2, ['B'])));
    expect(eliminationsFor(loadStudyTools('u2', storage).state, LR)).toEqual([]);

    rerender({ actor: 'u1' });
    expect(eliminationsFor(result.current.state, LR)).toEqual(['C']);
    expect(eliminationsFor(result.current.state, LR2)).toEqual([]);
    expect(eliminationsFor(loadStudyTools('u1', storage).state, LR2)).toEqual([]);
  });
});

describe('two tabs on one account', () => {
  it('a stale tab writing one question keeps the other tab\'s marks', () => {
    const storage = memoryStorage();
    const tabA = renderHook(() => useQuestionStudyTools('u1', storage));
    const tabB = renderHook(() => useQuestionStudyTools('u1', storage));

    act(() => tabA.result.current.update((s) => toggleBookmark(s, { ...LR, label: 'a' })));
    act(() => tabA.result.current.update((s) => setHighlights(s, LR, [hl])));
    // Tab B still holds its empty snapshot from mount.
    act(() => tabB.result.current.update((s) => setEliminations(s, LR2, ['C'])));

    const stored = loadStudyTools('u1', storage).state;
    expect(isBookmarked(stored, LR)).toBe(true);
    expect(highlightsFor(stored, LR)).toEqual([hl]);
    expect(eliminationsFor(stored, LR2)).toEqual(['C']);
    expect(isBookmarked(tabB.result.current.state, LR)).toBe(true);
  });

  it('a storage event from another tab refreshes this one', () => {
    window.localStorage.clear();
    const { result } = renderHook(() => useQuestionStudyTools('u-evt'));
    const other = toggleBookmark(emptyStudyTools(), { ...RC, passageId: 1, label: 'x' });
    saveStudyTools('u-evt', other, window.localStorage);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: studyToolsStorageKey('u-evt') }));
    });
    expect(isBookmarked(result.current.state, RC)).toBe(true);
    // Another account's key is ignored.
    saveStudyTools('u-other', toggleBookmark(emptyStudyTools(), { ...LR, label: 'y' }), window.localStorage);
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: studyToolsStorageKey('u-other') }));
    });
    expect(isBookmarked(result.current.state, LR)).toBe(false);
    window.localStorage.clear();
  });
});

describe('invalid storage and save failure', () => {
  it('treats unparseable JSON as recovered-empty, not a crash', () => {
    const storage = memoryStorage({ [studyToolsStorageKey('u1')]: '{not json' });
    const r = loadStudyTools('u1', storage);
    expect(r.status).toBe('recovered');
    expect(r.state).toEqual(emptyStudyTools());
  });

  it('drops only malformed entries and never re-keys a record under another question', () => {
    const raw = {
      v: 1,
      bookmarks: {
        'lr:PT156-S2-Q1': { family: 'lr', id: 'PT156-S2-Q1', label: 'ok', addedAt: '2026-10-01T00:00:00Z' },
        // Key and body disagree: a record that could land on the wrong question.
        'lr:PT1-S1-Q1': { family: 'lr', id: 'PT999-S9-Q9', label: 'bad', addedAt: '2026-10-01T00:00:00Z' },
        'rc:5': null,
      },
      eliminations: { 'lr:PT156-S2-Q1': ['A', 'Z'], 'lr:PT156-S2-Q2': ['B'], nope: ['A'] },
      highlights: { 'lr:PT156-S2-Q1': [hl, { id: 'x', start: 5, end: 2 }], 'rc:5': [hl] },
    };
    const storage = memoryStorage({ [studyToolsStorageKey('u1')]: JSON.stringify(raw) });
    const r = loadStudyTools('u1', storage);
    expect(r.status).toBe('recovered');
    expect(Object.keys(r.state.bookmarks)).toEqual(['lr:PT156-S2-Q1']);
    expect(r.state.eliminations).toEqual({ 'lr:PT156-S2-Q2': ['B'] });
    expect(r.state.highlights).toEqual({ 'lr:PT156-S2-Q1': [hl] });
  });

  it('reads a newer version as incompatible and never overwrites it', () => {
    const raw = JSON.stringify({ v: 2, bookmarks: { future: true } });
    const storage = memoryStorage({ [studyToolsStorageKey('u1')]: raw });
    expect(loadStudyTools('u1', storage).status).toBe('incompatible');

    const r = mutateStudyTools('u1', (s) => setEliminations(s, LR, ['A']), emptyStudyTools(), storage);
    expect(r.saved).toBe(false);
    expect(r.status).toBe('incompatible');
    expect(eliminationsFor(r.state, LR)).toEqual(['A']);
    expect(storage.data[studyToolsStorageKey('u1')]).toBe(raw);

    const { result } = renderHook(() => useQuestionStudyTools('u1', storage));
    act(() => result.current.update((s) => toggleBookmark(s, { ...LR, label: 'x' })));
    expect(result.current.deviceSaved).toBe(false);
    expect(result.current.notice).toMatch(/newer version/);
    expect(storage.data[studyToolsStorageKey('u1')]).toBe(raw);
  });

  it('sets an unreadable store aside, unchanged, before writing over it, and says so', () => {
    const storage = memoryStorage({ [studyToolsStorageKey('u1')]: '{not json' });
    const { result } = renderHook(() => useQuestionStudyTools('u1', storage));
    expect(result.current.notice).toMatch(/could not be read/);
    act(() => result.current.update((s) => setEliminations(s, LR, ['B'])));
    expect(storage.data[studyToolsQuarantineKey('u1')]).toBe('{not json');
    expect(loadStudyTools('u1', storage).status).toBe('ok');
    expect(result.current.deviceSaved).toBe(true);
    // Still disclosed for the rest of this page.
    expect(result.current.notice).toMatch(/set aside/);
  });

  it('a second unreadable copy never replaces the first set-aside copy', () => {
    const storage = memoryStorage({
      [studyToolsStorageKey('u1')]: 'second',
      [studyToolsQuarantineKey('u1')]: 'first',
    });
    mutateStudyTools('u1', (s) => s, emptyStudyTools(), storage);
    expect(storage.data[studyToolsQuarantineKey('u1')]).toBe('first');
    expect(Object.values(storage.data)).toContain('second');
  });

  it('writes nothing when the unreadable copy cannot be set aside', () => {
    const data: Record<string, string> = { [studyToolsStorageKey('u1')]: '{bad' };
    const storage: StudyStorage = {
      getItem: (k) => data[k] ?? null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const r = mutateStudyTools('u1', (s) => setEliminations(s, LR, ['A']), emptyStudyTools(), storage);
    expect(r.saved).toBe(false);
    expect(data[studyToolsStorageKey('u1')]).toBe('{bad');
  });

  it('reports unavailable when storage throws on read', () => {
    const storage: StudyStorage = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
    };
    expect(loadStudyTools('u1', storage).status).toBe('unavailable');
  });

  it('keeps every page-only mark across repeated failed saves, then saves them all once storage recovers', () => {
    const data: Record<string, string> = {};
    let writable = false;
    const storage: StudyStorage = {
      getItem: (k) => data[k] ?? null,
      setItem: (k, v) => {
        if (!writable) throw new Error('QuotaExceededError');
        data[k] = v;
      },
    };
    const { result } = renderHook(() => useQuestionStudyTools('u1', storage));
    act(() => result.current.update((s) => toggleBookmark(s, { ...LR, label: 'q1' })));
    act(() => result.current.update((s) => toggleBookmark(s, { ...LR2, label: 'q2' })));
    expect(isBookmarked(result.current.state, LR)).toBe(true);
    expect(isBookmarked(result.current.state, LR2)).toBe(true);
    expect(result.current.deviceSaved).toBe(false);
    expect(data).toEqual({});

    // Meanwhile another tab saves a different question.
    writable = true;
    saveStudyTools('u1', setEliminations(emptyStudyTools(), RC, ['D']), storage);

    act(() => result.current.update((s) => setEliminations(s, LR, ['A'])));
    expect(result.current.deviceSaved).toBe(true);
    const stored = loadStudyTools('u1', storage).state;
    expect(isBookmarked(stored, LR)).toBe(true);
    expect(isBookmarked(stored, LR2)).toBe(true);
    expect(eliminationsFor(stored, LR)).toEqual(['A']);
    expect(eliminationsFor(stored, RC)).toEqual(['D']);
  });

  it('a failed write keeps the aid in memory and says it was not saved', () => {
    const storage: StudyStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const { result } = renderHook(() => useQuestionStudyTools('u1', storage));
    act(() => result.current.update((s) => toggleBookmark(s, { ...LR, label: 'x' })));
    expect(isBookmarked(result.current.state, LR)).toBe(true);
    expect(result.current.deviceSaved).toBe(false);
  });
});

describe('separate from answers, flags and Review', () => {
  it('stores nothing but bookmarks, cross-outs and highlights', () => {
    const storage = memoryStorage();
    let s = toggleBookmark(emptyStudyTools(), { ...LR, label: 'x' });
    s = setEliminations(s, LR, ['B']);
    saveStudyTools('u1', s, storage);
    const stored = JSON.parse(storage.data[studyToolsStorageKey('u1')]);
    expect(Object.keys(stored).sort()).toEqual(['bookmarks', 'eliminations', 'highlights', 'v']);
    expect(JSON.stringify(stored)).not.toMatch(/selected|answer|flag|correct|review|attempt/i);
  });

  it('touches no other localStorage key', () => {
    const storage = memoryStorage({ 'drill-notes:PT156-S2-Q1': 'mine', 'rc-highlights': '[]' });
    saveStudyTools('u1', setEliminations(emptyStudyTools(), LR, ['A']), storage);
    expect(storage.data['drill-notes:PT156-S2-Q1']).toBe('mine');
    expect(storage.data['rc-highlights']).toBe('[]');
  });

  it('clearing one question keeps its bookmark and every other question', () => {
    let s = toggleBookmark(emptyStudyTools(), { ...LR, label: 'x' });
    s = setEliminations(s, LR, ['A']);
    s = setHighlights(s, LR, [hl]);
    s = setEliminations(s, LR2, ['C']);
    s = clearQuestionMarks(s, LR);
    expect(isBookmarked(s, LR)).toBe(true);
    expect(eliminationsFor(s, LR)).toEqual([]);
    expect(highlightsFor(s, LR)).toEqual([]);
    expect(eliminationsFor(s, LR2)).toEqual(['C']);
  });

  it('removing one bookmark leaves the rest', () => {
    let s = toggleBookmark(emptyStudyTools(), { ...LR, label: 'a' });
    s = toggleBookmark(s, { ...LR2, label: 'b' });
    s = removeBookmark(s, LR);
    expect(listBookmarks(s).map((b) => b.id)).toEqual([LR2.id]);
  });

  it('does not mutate the state it was given', () => {
    const base = setEliminations(emptyStudyTools(), LR, ['A']);
    const snapshot = JSON.stringify(base);
    setEliminations(base, LR, ['A', 'B']);
    toggleBookmark(base, { ...LR, label: 'x' });
    clearQuestionMarks(base, LR);
    expect(JSON.stringify(base)).toBe(snapshot);
  });
});
