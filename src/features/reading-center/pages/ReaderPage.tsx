import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from '@/contexts/AuthContext';
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  useAddBookmark,
  useBookmarks,
  useDeleteBookmark,
  usePassageBySlug,
  usePreferences,
  useProgressList,
  useRecordSession,
  useSavePreferences,
  useSaveProgress,
  useUpdateBookmark,
} from "../hooks/useReadingCenterData";
import { useSpreederEngine, type StageSize } from "../hooks/useSpreederEngine";
import { buildTextModel, canvasFont, clampFontSize, clampWpm, formatDuration, progressPercent, remainingMs, type Word } from "../lib/spreeder";
import { DEFAULT_PREFERENCES, FONTS } from "../lib/constants";
import { RC_LIBRARY_PATH } from "../lib/routes";
import { useReadingProfile } from "../hooks/useReadingCenterData";
import type { Bookmark, Passage, Preferences, Progress } from "../lib/types";
import { ReadingVisit, ReadingPageExposure, readingSessionOutbox } from "../lib/session";
import { Icon, MIcon } from "../components/Icon";
import { SpreederStage } from "../components/SpreederStage";
import { EReader, EReaderBar, EReaderSearch, usePageOf } from "../components/EReader";
import { Modal } from "../components/spreeder-ui";
import { ViewPanel } from "../components/ViewPanel";
import {
  BookmarkNoteDialog,
  BookmarksDialog,
  FinishAlert,
  PreferencesDialog,
  SpeedToast,
  WordActionSheet,
  WpmDialog,
  type BookmarkNoteState,
} from "../components/ReaderDialogs";

export default function ReaderPage(): React.ReactElement {
  const { user } = useAuth();
  const { slug } = useParams<{ slug: string }>();
  const passage = usePassageBySlug(slug);
  const prefs = usePreferences();
  const progress = useProgressList();
  if (!user || passage.isLoading || prefs.isLoading || progress.isLoading) return <div className="min-h-screen" style={{ background: "var(--rc-page)" }} />;
  if (passage.error || prefs.error || progress.error) return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 px-4">
      <p role="alert">Your saved reading work could not load. Check your connection and try again.</p>
      <button type="button" className="rc-green-btn" onClick={() => { void passage.refetch(); void prefs.refetch(); void progress.refetch(); }}>Try again</button>
      <Link to={RC_LIBRARY_PATH} className="underline">Back to library</Link>
    </div>
  );
  if (!passage.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg">Passage not found</p>
        <Link to={RC_LIBRARY_PATH} className="text-sm underline">Back to library</Link>
      </div>
    );
  }
  return (
    <Reader
      key={`${user.id}:${passage.data.id}`}
      userId={user.id}
      passage={passage.data}
      initialPrefs={prefs.data ?? DEFAULT_PREFERENCES}
      saved={(progress.data ?? []).find((p) => p.passage_id === passage.data!.id)}
    />
  );
}

/** Canvas text measurement in the font Spreeder draws with. */
function useMeasure(stack: string, size: number) {
  return useMemo(() => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    ctx.font = canvasFont(stack, size);
    const cache = new Map<string, number>();
    return (t: string) => {
      let w = cache.get(t);
      if (w == null) {
        w = ctx.measureText(t).width;
        cache.set(t, w);
      }
      return w;
    };
  }, [stack, size]);
}

function HeaderIcon({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }): React.ReactElement {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="flex h-10 w-8 shrink-0 items-center justify-center rounded-full sm:h-[46px] sm:w-[46px]" style={{ color: "var(--rc-hdr-icon, var(--rc-strong))" }}>
      {children}
    </button>
  );
}

function Reader({ userId, passage, initialPrefs, saved }: { userId: string; passage: Passage; initialPrefs: Preferences; saved: Progress | undefined }): React.ReactElement {
  const navigate = useNavigate();
  const savePrefs = useSavePreferences();
  const saveProgress = useSaveProgress();
  const recordSession = useRecordSession();
  const bookmarks = useBookmarks(passage.id);
  const addBookmark = useAddBookmark();
  const updateBookmark = useUpdateBookmark();
  const deleteBookmark = useDeleteBookmark();

  const model = useMemo(() => buildTextModel(passage.body), [passage.body]);
  const [prefs, setPrefs] = useState<Preferences>({ ...initialPrefs, wpm: clampWpm(initialPrefs.wpm), font_size: clampFontSize(initialPrefs.font_size) });
  const updatePrefs = useCallback(
    (p: Partial<Preferences>) => {
      setPrefs((cur) => ({ ...cur, ...p }));
      savePrefs.mutate(p);
    },
    [savePrefs],
  );
  const fontStack = FONTS.find((f) => f.label === prefs.font_family)?.stack ?? FONTS[0].stack;
  const measure = useMeasure(fontStack, prefs.font_size);
  const isEReader = prefs.reading_mode === "ereader";

  // ---- stage size (the reading card's content box)
  const stageRef = useRef<HTMLDivElement | null>(null);
  const [stage, setStage] = useState<StageSize>({ width: 0, height: 0 });
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const read = () => setStage((s) => (s.width === el.clientWidth && s.height === el.clientHeight ? s : { width: el.clientWidth, height: el.clientHeight }));
    // Measure now as well: ResizeObserver does not report while the tab is hidden.
    read();
    const ro = new ResizeObserver(read);
    ro.observe(el);
    window.addEventListener("resize", read);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", read);
    };
  }, [isEReader]);

  // ---- engine
  const [finished, setFinished] = useState(false);
  const [completionState, setCompletionState] = useState<"idle" | "saving" | "error">("idle");
  const completionSaving = useRef(false);
  const visit = useRef(new ReadingVisit());
  const pageExposure = useRef(new ReadingPageExposure());
  const outbox = useMemo(() => readingSessionOutbox(userId), [userId]);
  const mounted = useRef(true);
  const [sessionState, setSessionState] = useState<'idle' | 'saving' | 'error'>(outbox.pending.length ? 'error' : 'idle');
  const [foreground, setForeground] = useState(() => !document.hidden && document.hasFocus());
  const visitMeta = useRef({ reading_mode: prefs.reading_mode, wpm: prefs.wpm });
  const sessionContext = useRef({ prefs, recordSession });
  sessionContext.current = { prefs, recordSession };
  const retrySessions = useCallback(async () => {
    if (!outbox.pending.length) return;
    if (mounted.current) setSessionState('saving');
    try {
      await outbox.flush((session) => sessionContext.current.recordSession.mutateAsync(session));
      if (mounted.current) setSessionState('idle');
    } catch {
      if (mounted.current) setSessionState('error');
    }
  }, [outbox]);
  const capturePage = useCallback((now = Date.now()) => {
    if (visitMeta.current.reading_mode === 'ereader') visit.current.read(pageExposure.current.capture(now));
  }, []);
  const flushSession = useCallback(() => {
    capturePage();
    const session = visit.current.finish();
    if (session) outbox.enqueue({ ...session, id: crypto.randomUUID(), passage_id: passage.id, ...visitMeta.current });
    void retrySessions();
  }, [capturePage, passage.id, outbox, retrySessions]);
  useEffect(() => {
    mounted.current = true;
    void retrySessions();
    const retry = () => { void retrySessions(); };
    window.addEventListener('online', retry);
    return () => { mounted.current = false; window.removeEventListener('online', retry); };
  }, [retrySessions]);
  const complete = async () => {
    if (finished || completionSaving.current) return;
    completionSaving.current = true;
    capturePage();
    visit.current.pause();
    pageExposure.current.setActive(false);
    setCompletionState("saving");
    try {
      await saveProgress.mutateAsync({ passage_id: passage.id, word_index: Math.max(0, model.words.length - 1), completed: true });
      flushSession();
      setCompletionState("idle");
      setFinished(true);
    } catch {
      setCompletionState("error");
    } finally {
      completionSaving.current = false;
    }
  };
  const startWord = saved && !saved.completed_at ? Math.min(saved.word_index, model.words.length - 1) : 0;
  const engine = useSpreederEngine({ model, prefs, stage, measure, initialWord: startWord,
    onFinish: () => { if (!document.hidden && document.hasFocus()) void complete(); },
    onReadChunk: (words) => { if (!document.hidden && document.hasFocus()) visit.current.read(words); },
  });
  const { activeWord, playing } = engine;

  // Spreeder pauses and relays out on resize.
  useEffect(() => {
    if (visitMeta.current.reading_mode !== prefs.reading_mode) {
      flushSession();
      // A newly mounted eReader has already reported its page in a layout effect.
      // Clear the previous page only when leaving eReader mode.
      if (visitMeta.current.reading_mode === 'ereader') pageExposure.current.reset();
      visitMeta.current = { reading_mode: prefs.reading_mode, wpm: prefs.wpm };
    }
  }, [prefs.reading_mode, prefs.wpm, flushSession]);
  useEffect(() => {
    const onResize = () => engine.pause();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [engine.pause]); // eslint-disable-line react-hooks/exhaustive-deps

  // Opening a text puts it back on the Recent shelf.
  useEffect(() => {
    saveProgress.mutate({ passage_id: passage.id, word_index: startWord, hidden_from_recent: false });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- progress (Spreeder stores Text_position, debounced 200 ms)
  useEffect(() => {
    if (finished) return;
    const t = window.setTimeout(() => saveProgress.mutate({ passage_id: passage.id, word_index: activeWord }), 200);
    return () => window.clearTimeout(t);
  }, [activeWord, finished]); // eslint-disable-line react-hooks/exhaustive-deps
  const exitProgress = useRef({ activeWord, finished, completionState, saveProgress });
  exitProgress.current = { activeWord, finished, completionState, saveProgress };
  useEffect(() => () => {
    const current = exitProgress.current;
    if (!current.finished && current.completionState === "idle") current.saveProgress.mutate({ passage_id: passage.id, word_index: current.activeWord });
  }, [passage.id]);

  // ---- reading sessions (feed the Profile stats)
  useEffect(() => () => flushSession(), [flushSession]);

  // ---- dialogs
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [wpmOpen, setWpmOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [bmOpen, setBmOpen] = useState(false);
  const [kbdOpen, setKbdOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [sheetWord, setSheetWord] = useState<Word | null>(null);
  const [note, setNote] = useState<BookmarkNoteState | null>(null);
  const [toast, setToast] = useState({ text: "", nonce: 0 });
  const anyOpen = prefsOpen || wpmOpen || viewOpen || bmOpen || kbdOpen || searchOpen || !!sheetWord || !!note || finished || completionState !== "idle";
  const kbdBtn = useRef<HTMLButtonElement | null>(null);

  const changeSpeed = (wpm: number) => {
    const v = clampWpm(wpm);
    updatePrefs({ wpm: v });
    setToast((t) => ({ text: `${v} WPM`, nonce: t.nonce + 1 }));
  };

  const openWordActions = (w: Word) => {
    engine.pause();
    setSheetWord(w);
  };
  const openBookmarkFor = (w: Word) => {
    setSheetWord(null);
    const existing = (bookmarks.data ?? []).find((b) => b.word_index === w.index);
    setNote(existing ? { mode: "edit", word: w, bookmark: existing } : { mode: "create", word: w });
  };

  const goToBookmarkWord = (w: Word | undefined) => {
    if (!w) return;
    engine.goToWord(w.index);
    if (isEReader) setPage(pageOf(w.index));
  };

  // ---- e-Reader paging
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [marks, setMarks] = useState<{ start: number; length: number }[]>([]);
  const pageOf = usePageOf();
  const goPage = (p: number) => setPage(Math.max(0, Math.min(pageCount - 1, p)));
  const onPageWord = useCallback((i: number, end: number) => {
    visit.current.read(pageExposure.current.show(i, end));
    engine.goToWord(i);
  }, [engine.goToWord]);
  const onPageCount = useCallback((n: number) => setPageCount(n), []);
  useEffect(() => {
    const active = foreground && !document.hidden && document.hasFocus() && !anyOpen
      && (isEReader ? pageExposure.current.hasPage : playing && !!engine.chunk);
    pageExposure.current.setActive(active && isEReader);
    if (active) visit.current.play(); else visit.current.pause();
    if (!foreground || anyOpen) engine.pause();
  }, [foreground, anyOpen, isEReader, playing, engine.chunk, engine.seekVersion, engine.pause, prefs.reading_mode]);
  useEffect(() => {
    const updateForeground = () => {
      const active = !document.hidden && document.hasFocus();
      if (!active) {
        engine.pause();
        pageExposure.current.setActive(false);
        capturePage();
        visit.current.pause();
      }
      setForeground(active);
    };
    const onPageHide = () => {
      pageExposure.current.setActive(false);
      visit.current.pause();
      flushSession();
    };
    const protectUnsaved = (event: BeforeUnloadEvent) => {
      if (outbox.pending.length && !outbox.retainedLocally) { event.preventDefault(); event.returnValue = ''; }
    };
    document.addEventListener('visibilitychange', updateForeground);
    window.addEventListener('blur', updateForeground);
    window.addEventListener('focus', updateForeground);
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', protectUnsaved);
    return () => {
      document.removeEventListener('visibilitychange', updateForeground);
      window.removeEventListener('blur', updateForeground);
      window.removeEventListener('focus', updateForeground);
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', protectUnsaved);
    };
  }, [engine.pause, capturePage, flushSession, outbox]);

  // ---- keyboard (Spreeder shortcuts)
  const keys = useRef({ anyOpen, isEReader, page, prefs, engine });
  keys.current = { anyOpen, isEReader, page, prefs, engine };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName) || t.isContentEditable || e.ctrlKey || e.metaKey || e.altKey) return;
      const k = keys.current;
      if (k.anyOpen) return;
      switch (e.key) {
        case "ArrowUp": case "+": case "=":
          e.preventDefault(); changeSpeed(k.prefs.wpm + 10); break;
        case "ArrowDown": case "-":
          e.preventDefault(); changeSpeed(k.prefs.wpm - 10); break;
        case " ": case "p": case "P":
          e.preventDefault(); if (!k.isEReader) k.engine.toggle(); break;
        case "ArrowRight":
          e.preventDefault(); if (k.isEReader) setPage((p) => Math.min(p + 1, pageCount - 1)); else k.engine.next(); break;
        case "ArrowLeft":
          e.preventDefault(); if (k.isEReader) setPage((p) => Math.max(p - 1, 0)); else k.engine.prev(); break;
        case "r": case "R":
          k.engine.restartSection(); break;
        case "s": case "S":
          k.engine.pause(); setPrefsOpen(true); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [pageCount]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- fullscreen
  const [fullscreen, setFullscreen] = useState(!!document.fullscreenElement);
  useEffect(() => {
    const f = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", f);
    return () => document.removeEventListener("fullscreenchange", f);
  }, []);

  const remaining = remainingMs(model, activeWord, { wpm: prefs.wpm, groupSize: prefs.words_per_line, numberOfLines: prefs.number_of_lines, punctuationPauses: prefs.punctuation_pauses });
  const pct = progressPercent(model, activeWord);
  const name = useReadingProfile().data ?? "Reader";

  return (
    <div className="relative flex h-screen flex-col overflow-hidden" style={{ background: "var(--rc-page)", color: "var(--rc-text)" }}>
      <Modal open={completionState !== "idle"} onClose={() => {}} width={440} labelledBy="rc-completion-save">
        <div className="space-y-4 p-5">
          <h2 id="rc-completion-save" className="text-lg">{completionState === "saving" ? "Saving your finished text" : "Your finished text has not saved"}</h2>
          <p role="status">{completionState === "saving" ? "Please wait while Reading Center saves your progress." : "Check your connection and try again. Keep this page open to save your result."}</p>
          {completionState === "error" && <button type="button" className="rc-green-btn" onClick={() => void complete()}>Retry save</button>}
        </div>
      </Modal>
      {sessionState !== 'idle' && <div role={sessionState === 'error' ? 'alert' : 'status'} className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-4 py-2 text-sm" style={{ background: 'var(--rc-dialog)' }}>
        <span>{sessionState === 'saving' ? 'Saving your reading statistics.' : outbox.retainedLocally
          ? 'Your reading statistics have not saved yet. A retry copy is kept on this device.'
          : 'Your reading statistics have not saved yet. Keep this page open to retry.'}</span>
        {sessionState === 'error' && <button type="button" className="rc-outline-btn" onClick={() => void retrySessions()}>Retry statistics save</button>}
      </div>}
      {/* Header */}
      {!fullscreen && <header className="relative flex h-14 shrink-0 items-center gap-2 px-2 sm:px-5">
        <button type="button" aria-label="Back to library" onClick={() => navigate(RC_LIBRARY_PATH)} className="z-10 flex shrink-0 items-center gap-2.5 sm:pl-3" style={{ color: "var(--rc-text)" }}>
          <Icon name="arrowBack" size={24} />
          <span className="hidden text-sm font-medium tracking-[0.28px] sm:inline">Back</span>
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm tracking-[0.72px] sm:text-lg" style={{ color: "var(--rc-text)" }}>{passage.title}</h1>
        <div className="z-10 flex shrink-0 items-center" style={{ ["--rc-hdr-icon" as string]: "var(--rc-text)" }}>
          {isEReader && (
            <HeaderIcon label="Search" onClick={() => setSearchOpen((o) => !o)}><Icon name="search" size={26} /></HeaderIcon>
          )}
          <HeaderIcon label={fullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={() => {
            const request = document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.();
            if (!request) setToast((t) => ({ text: "Fullscreen is unavailable in this browser.", nonce: t.nonce + 1 }));
            else void request.catch(() => setToast((t) => ({ text: "Fullscreen could not open. Try again.", nonce: t.nonce + 1 })));
          }}>
            <Icon name={fullscreen ? "contract" : "expand"} size={26} />
          </HeaderIcon>
          <HeaderIcon label="Bookmarks" onClick={() => { engine.pause(); setBmOpen(true); }}><Icon name="bookmark" size={26} /></HeaderIcon>
          <HeaderIcon label="Settings" onClick={() => { engine.pause(); setPrefsOpen(true); }}><Icon name="settings" size={26} /></HeaderIcon>
        </div>
      </header>}
      {fullscreen && <button type="button" aria-label="Exit fullscreen" title="Exit fullscreen" className="absolute right-3 top-3 z-20 flex h-10 w-10 items-center justify-center rounded-full" style={{ color: "var(--rc-blue)" }} onClick={() => {
        engine.pause();
        void document.exitFullscreen().catch(() => setToast((t) => ({ text: "Fullscreen could not close. Try again.", nonce: t.nonce + 1 })));
      }}><Icon name="contract" size={26} /></button>}

      {/* Reading area */}
      <main className="relative min-h-0 flex-1">
        {isEReader ? (
          <EReader prefs={prefs} fontStack={fontStack} words={model.words} page={page} initialWord={activeWord} onResumePage={setPage} onPageCount={onPageCount} onPageWord={onPageWord} highlight={marks} onWordClick={openWordActions} />
        ) : (
          <div className="rc-reading-stage mx-auto h-[calc(100%-20px)] w-full rounded-[10px] py-5" style={{ background: "var(--rc-surface)" }}>
            <div ref={stageRef} className="relative h-full w-full">
              <SpreederStage
                prefs={prefs}
                fontStack={fontStack}
                stage={stage}
                layout={engine.layout}
                chunk={engine.chunk}
                chunkIndex={engine.chunkIndex}
                delay={engine.delay}
                playing={playing}
                seekVersion={engine.seekVersion}
                onWordClick={openWordActions}
                onStageClick={engine.toggle}
              />
              <SpeedToast text={toast.text} nonce={toast.nonce} />
            </div>
          </div>
        )}
        {!isEReader && !playing && !fullscreen && (
          <div className="pointer-events-none absolute inset-x-0 bottom-[50px] flex items-center justify-center gap-[50px]">
            <TransportButton label="Previous" onClick={engine.prev}>
              <svg viewBox="0 0 50 50" width="50" height="50" aria-hidden><path d="M33 13 L15 25 L33 37 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></svg>
            </TransportButton>
            <TransportButton label="Play" onClick={engine.play} big>
              <svg viewBox="0 0 60 60" width="60" height="60" aria-hidden><circle cx="30" cy="30" r="27" fill="none" stroke="currentColor" strokeWidth="5" /><path d="M24 18 L42 30 L24 42 Z" fill="currentColor" /></svg>
            </TransportButton>
            <TransportButton label="Next" onClick={engine.next}>
              <svg viewBox="0 0 50 50" width="50" height="50" aria-hidden><path d="M17 13 L35 25 L17 37 Z" fill="none" stroke="currentColor" strokeWidth="4" strokeLinejoin="round" /></svg>
            </TransportButton>
          </div>
        )}
      </main>

      {/* Bottom bar */}
      {isEReader ? (
        <EReaderBar page={page} pageCount={pageCount} onPage={goPage} onFinish={() => void complete()} />
      ) : (
        <footer className="rc-reader-footer flex h-10 shrink-0 items-center px-5" style={{ background: "var(--rc-bottombar)", borderTop: "0.8px solid var(--rc-bottombar-border)" }}>
          {/* Spreeder at 1180px and below: keyboard button hidden, time left, speed + View right. */}
          <div className="rc-reader-controls order-2 ml-auto mr-[5px] flex items-center gap-[19px]">
            <BarButton onClick={() => { engine.pause(); setWpmOpen(true); }} icon="speedometer">{prefs.wpm}</BarButton>
            <BarButton onClick={() => { engine.pause(); setViewOpen(true); }} icon="list">View</BarButton>
          </div>
          <div className="rc-reader-progress order-1 pl-[3px] text-sm leading-[39px]" style={{ color: "var(--rc-text)", opacity: 0.8 }}>
            {pct}% - {formatDuration(remaining)} remaining
          </div>
        </footer>
      )}
      <PreferencesDialog open={prefsOpen} onClose={() => setPrefsOpen(false)} prefs={prefs} onChange={updatePrefs} name={name} />
      <WpmDialog open={wpmOpen} onClose={() => setWpmOpen(false)} value={prefs.wpm} onSave={changeSpeed} />
      <ViewPanel
        open={viewOpen}
        onClose={() => setViewOpen(false)}
        title={passage.title}
        words={model.words}
        currentWord={activeWord}
        footer={`${formatDuration(remaining)} to go - ${prefs.wpm} WPM`}
        onJump={(w) => engine.goToWord(w.index)}
        onPlay={engine.play}
      />
      <BookmarksDialog
        open={bmOpen}
        onClose={() => setBmOpen(false)}
        title={passage.title}
        bookmarks={bookmarks.data ?? []}
        words={model.words}
        onOpenBookmark={(b: Bookmark) => setNote({ mode: "edit", word: model.words[b.word_index], bookmark: b })}
        onGoTo={(b: Bookmark) => { setBmOpen(false); goToBookmarkWord(model.words[b.word_index]); }}
        onDelete={(b: Bookmark) => deleteBookmark.mutate({ id: b.id, passage_id: passage.id })}
      />
      <WordActionSheet word={sheetWord} onClose={() => setSheetWord(null)} onBookmark={openBookmarkFor} />
      <BookmarkNoteDialog
        state={note}
        title={passage.title}
        onClose={() => setNote(null)}
        onSave={async (text, close) => {
          const current = note;
          if (!current) return;
          const done = () => setToast((t) => ({ text: "Bookmark saved.", nonce: t.nonce + 1 }));
          if (current.mode === "edit") {
            await updateBookmark.mutateAsync({ id: current.bookmark.id, note: text || null });
            done();
          } else {
            const bookmark = await addBookmark.mutateAsync({ passage_id: passage.id, word_index: current.word.index, note: text || null });
            done();
            if (!close) setNote({ mode: "edit", word: current.word, bookmark });
          }
          if (close) setNote(null);
        }}
        onGoTo={(w) => { setNote(null); setBmOpen(false); goToBookmarkWord(w); }}
      />
      {isEReader && (
        <EReaderSearch open={searchOpen} onClose={() => { setSearchOpen(false); setMarks([]); }} words={model.words} pageOf={pageOf} onSelect={(p, hits) => { setPage(p); setMarks(hits); }} />
      )}
      <FinishAlert
        open={finished && sessionState === 'idle'}
        title={passage.title}
        onOkay={() => {
          if (document.fullscreenElement) document.exitFullscreen();
          navigate(RC_LIBRARY_PATH);
        }}
      />
    </div>
  );
}

function TransportButton({ label, onClick, children, big = false }: { label: string; onClick: () => void; children: React.ReactNode; big?: boolean }): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="pointer-events-auto flex items-center justify-center rounded-full transition-colors hover:bg-[rgba(128,128,128,.18)]"
      style={{ width: big ? 64 : 54, height: big ? 64 : 54, color: "var(--rc-text)" }}
    >
      {children}
    </button>
  );
}

function BarButton({ onClick, icon, children }: { onClick: () => void; icon: "speedometer" | "list"; children: React.ReactNode }): React.ReactElement {
  return (
    <button type="button" onClick={onClick} className="flex h-[30px] w-20 items-center justify-center gap-1.5 rounded text-[13px] font-medium" style={{ color: "var(--rc-blue)", border: "0.8px solid var(--rc-bottombar-border)" }}>
      <Icon name={icon} size={20} />
      {children}
    </button>
  );
}
