// @vitest-environment jsdom
import React, { act, useLayoutEffect } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from '../lib/constants';
import type { ReadingSession } from '../lib/types';
import ReaderPage from './ReaderPage';

const mocks = vi.hoisted(() => ({
  user: 'reader-test', mode: 'ereader', hidden: false, focused: true,
  record: vi.fn(), saveProgress: vi.fn(), pause: vi.fn(), goToWord: vi.fn(),
  callbacks: {} as { onFinish?: () => void; onReadChunk?: (words: number) => void },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: mocks.user } }) }));
vi.mock('../hooks/useReadingCenterData', () => {
  const mutation = { mutate: vi.fn(), mutateAsync: vi.fn().mockResolvedValue({}) };
  return {
    usePassageBySlug: () => ({ data: { id: 'test-passage', slug: 'text', title: 'Test text', body: 'one two three four five six seven eight nine ten', word_count: 10 } }),
    usePreferences: () => ({ data: { ...DEFAULT_PREFERENCES, reading_mode: mocks.mode } }),
    useProgressList: () => ({ data: [] }), useBookmarks: () => ({ data: [] }),
    useReadingProfile: () => ({ data: 'Reader' }), useSavePreferences: () => mutation,
    useSaveProgress: () => ({ mutate: vi.fn(), mutateAsync: mocks.saveProgress }),
    useRecordSession: () => ({ mutateAsync: mocks.record }),
    useAddBookmark: () => mutation, useDeleteBookmark: () => mutation, useUpdateBookmark: () => mutation,
  };
});
vi.mock('../hooks/useSpreederEngine', () => ({ useSpreederEngine: (input: typeof mocks.callbacks) => {
  mocks.callbacks = input;
  return { activeWord: 0, playing: mocks.mode !== 'ereader', chunk: {}, seekVersion: 0,
    pause: mocks.pause, goToWord: mocks.goToWord, play: vi.fn(), toggle: vi.fn(), next: vi.fn(), prev: vi.fn(), restartSection: vi.fn() };
} }));
vi.mock('../components/EReader', () => ({
  EReader: ({ onPageWord }: { onPageWord: (start: number, end: number) => void }) => {
    useLayoutEffect(() => onPageWord(0, 10), [onPageWord]);
    return <div>Visible page</div>;
  },
  EReaderBar: ({ onFinish }: { onFinish: () => void }) => <button onClick={onFinish}>Mark finished</button>,
  EReaderSearch: () => null, usePageOf: () => () => 0,
}));
vi.mock('../components/SpreederStage', () => ({ SpreederStage: () => <div>Playback page</div> }));
vi.mock('../components/ViewPanel', () => ({ ViewPanel: () => null }));
vi.mock('../components/spreeder-ui', () => ({ Modal: ({ open, children }: { open: boolean; children: React.ReactNode }) => open ? <div>{children}</div> : null }));
vi.mock('../components/ReaderDialogs', () => ({
  BookmarkNoteDialog: () => null, BookmarksDialog: () => null,
  PreferencesDialog: ({ open, onChange, onClose }: { open: boolean; onChange: (input: { reading_mode: string }) => void; onClose: () => void }) => open
    ? <button onClick={() => { mocks.mode = 'ereader'; onChange({ reading_mode: 'ereader' }); onClose(); }}>Use eReader</button> : null,
  ShortcutsPopover: () => null, SpeedToast: () => null, WordActionSheet: () => null, WpmDialog: () => null,
  FinishAlert: ({ open }: { open: boolean }) => open ? <div>Finished confirmed</div> : null,
}));

let root: Root;
let node: HTMLDivElement;
let sequence = 0;
(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-14T10:00:00Z'));
  mocks.user = `reader-test-${++sequence}`; mocks.mode = 'ereader'; mocks.hidden = false; mocks.focused = true;
  mocks.record.mockReset().mockResolvedValue(undefined);
  mocks.saveProgress.mockReset().mockResolvedValue(undefined);
  mocks.pause.mockReset(); mocks.goToWord.mockReset();
  Object.defineProperty(document, 'hidden', { configurable: true, get: () => mocks.hidden });
  vi.spyOn(document, 'hasFocus').mockImplementation(() => mocks.focused);
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({ measureText: () => ({ width: 20 }) } as unknown as CanvasRenderingContext2D);
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
  node = document.createElement('div'); document.body.append(node); root = createRoot(node);
});
afterEach(async () => { await act(async () => root.unmount()); node.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.useRealTimers(); });
async function open() {
  await act(async () => root.render(<MemoryRouter initialEntries={['/read/text']}><Routes><Route path="/read/:slug" element={<ReaderPage />} /></Routes></MemoryRouter>));
}
async function finish() {
  await act(async () => [...node.querySelectorAll('button')].find((button) => button.textContent === 'Mark finished')!.click());
}

describe('Reader session acknowledgement and foreground timing', () => {
  it('keeps a failed final-page session visible and retries the exact UUID without recounting', async () => {
    mocks.record.mockRejectedValueOnce(new Error('offline'));
    await open();
    await act(async () => vi.advanceTimersByTime(6000));
    await finish();
    expect(node.textContent).toContain('A retry copy is kept on this device');
    expect(node.textContent).not.toContain('Finished confirmed');
    const record = mocks.record.mock.calls[0][0] as ReadingSession;
    expect(record).toMatchObject({ words_read: 10, active_ms: 6000, reading_mode: 'ereader' });
    expect(record.id).toBeTruthy();
    await act(async () => [...node.querySelectorAll('button')].find((button) => button.textContent === 'Retry statistics save')!.click());
    expect(mocks.record.mock.calls[1][0]).toEqual(record);
    expect(node.textContent).toContain('Finished confirmed');
    expect(node.textContent).not.toContain('have not saved');
  });
  it('pauses hidden playback immediately and excludes background time and chunks', async () => {
    mocks.mode = 'serial';
    await open();
    await act(async () => vi.advanceTimersByTime(6000));
    act(() => mocks.callbacks.onReadChunk?.(3));
    act(() => { mocks.hidden = true; document.dispatchEvent(new Event('visibilitychange')); });
    expect(mocks.pause).toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTime(60000));
    act(() => mocks.callbacks.onReadChunk?.(10));
    await act(async () => root.unmount());
    expect(mocks.record.mock.calls[0][0]).toMatchObject({ words_read: 3, active_ms: 6000, paused_ms: 60000 });
    root = createRoot(node);
  });
  it('does not count an instantly finished eReader page', async () => {
    await open();
    await finish();
    expect(mocks.record).not.toHaveBeenCalled();
    expect(node.textContent).toContain('Finished confirmed');
  });
  it('captures the final qualified eReader page on leaving without marking the text finished', async () => {
    await open();
    await act(async () => vi.advanceTimersByTime(6000));
    await act(async () => root.unmount());
    expect(mocks.record.mock.calls[0][0]).toMatchObject({ words_read: 10, active_ms: 6000 });
    expect(mocks.saveProgress).not.toHaveBeenCalled();
    root = createRoot(node);
  });
  it('retains the initial visible page when switching from playback into eReader', async () => {
    mocks.mode = 'serial';
    await open();
    act(() => node.querySelector<HTMLButtonElement>('[aria-label="Settings"]')!.click());
    act(() => [...node.querySelectorAll('button')].find((button) => button.textContent === 'Use eReader')!.click());
    await act(async () => vi.advanceTimersByTime(6000));
    await finish();
    expect(mocks.record.mock.calls[0][0]).toMatchObject({ reading_mode: 'ereader', words_read: 10, active_ms: 6000 });
  });
});
