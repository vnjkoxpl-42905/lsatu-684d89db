import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Bookmark as BookmarkIcon,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Loader2,
  Maximize,
  Minimize,
  Pause,
  Play,
  Search,
  Settings,
  SkipBack,
  SkipForward,
} from "lucide-react";
import { toast } from "sonner";
import { Slider } from "@/components/ui/slider";
import { ReaderSurface } from "../components/ReaderSurface";
import { ModeRenderer } from "../components/modes";
import { WpmDialog } from "../components/WpmDialog";
import { PreferencesDialog } from "../components/PreferencesDialog";
import { ViewPanel } from "../components/ViewPanel";
import { BookmarksDialog } from "../components/BookmarksDialog";
import { ShortcutsPopover } from "../components/ShortcutsPopover";
import { CompletionCard } from "../components/CompletionCard";
import { ResumePrompt } from "../components/ResumePrompt";
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
} from "../hooks/useReadingCenterData";
import { useReadingClock } from "../hooks/useReadingClock";
import { chunkIndexForWord, chunkTokens, tokenize } from "../lib/tokenize";
import { chunkDurations, formatRemaining, percentRead, remainingMs } from "../lib/timing";
import { DEFAULT_PREFERENCES, WPM_MAX, WPM_MIN } from "../lib/constants";
import { RC_LIBRARY_PATH } from "../lib/routes";
import type { Passage, Preferences, Progress } from "../lib/types";

const MIN_SESSION_MS = 5000;

function IconButton({
  label,
  onClick,
  children,
  className = "",
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-md opacity-75 transition hover:opacity-100 focus-visible:outline focus-visible:outline-2 ${className}`}
    >
      {children}
    </button>
  );
}

export default function ReaderPage(): React.ReactElement {
  const { slug } = useParams<{ slug: string }>();
  const passageQuery = usePassageBySlug(slug);
  const prefsQuery = usePreferences();
  const progressQuery = useProgressList();

  if (passageQuery.isLoading || prefsQuery.isLoading || progressQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin" aria-label="Loading" />
      </div>
    );
  }
  if (!passageQuery.data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3">
        <p className="text-lg font-semibold">Passage not found</p>
        <Link to={RC_LIBRARY_PATH} className="text-sm underline">Back to library</Link>
      </div>
    );
  }
  return (
    <Reader
      key={passageQuery.data.id}
      passage={passageQuery.data}
      initialPrefs={prefsQuery.data ?? DEFAULT_PREFERENCES}
      savedProgress={(progressQuery.data ?? []).find((p) => p.passage_id === passageQuery.data!.id)}
    />
  );
}

function Reader({
  passage,
  initialPrefs,
  savedProgress,
}: {
  passage: Passage;
  initialPrefs: Preferences;
  savedProgress: Progress | undefined;
}): React.ReactElement {
  const navigate = useNavigate();
  const bookmarksQuery = useBookmarks(passage.id);
  const addBookmark = useAddBookmark();
  const deleteBookmark = useDeleteBookmark();
  const savePrefs = useSavePreferences();
  const saveProgress = useSaveProgress();
  const recordSession = useRecordSession();

  const tokens = useMemo(() => tokenize(passage.body), [passage.body]);

  // ---- preferences: live locally, saved debounced -------------------------
  const [prefs, setPrefs] = useState<Preferences>(initialPrefs);
  const pendingPrefs = useRef<Partial<Preferences>>({});
  const prefsTimer = useRef<number | null>(null);
  const flushPrefs = useCallback(() => {
    if (prefsTimer.current) window.clearTimeout(prefsTimer.current);
    prefsTimer.current = null;
    if (Object.keys(pendingPrefs.current).length === 0) return;
    savePrefs.mutate(pendingPrefs.current);
    pendingPrefs.current = {};
  }, [savePrefs]);
  const updatePrefs = useCallback(
    (partial: Partial<Preferences>) => {
      setPrefs((p) => ({ ...p, ...partial }));
      pendingPrefs.current = { ...pendingPrefs.current, ...partial };
      if (prefsTimer.current) window.clearTimeout(prefsTimer.current);
      prefsTimer.current = window.setTimeout(flushPrefs, 500);
    },
    [flushPrefs],
  );

  // ---- position -----------------------------------------------------------
  const [wordIndex, setWordIndex] = useState<number>(0);
  const wordIndexRef = useRef<number>(0);
  const setWord = useCallback((i: number) => {
    wordIndexRef.current = i;
    setWordIndex(i);
  }, []);

  const isEReader = prefs.reading_mode === "ereader";
  const chunks = useMemo(
    () =>
      chunkTokens(
        tokens,
        prefs.words_per_line,
        prefs.reading_mode === "serial" || prefs.reading_mode === "highlight" ? prefs.number_of_lines : 1,
      ),
    [tokens, prefs.words_per_line, prefs.number_of_lines, prefs.reading_mode],
  );
  const chunksRef = useRef(chunks);
  chunksRef.current = chunks;
  const durations = useMemo(
    () => chunkDurations(chunks, prefs),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chunks, prefs.wpm, prefs.punctuation_pauses, prefs.speed_variability],
  );

  // ---- session stretch (words read while playing) -------------------------
  const wordsReadRef = useRef(0);
  const stretchActiveStart = useRef(0);
  const stretchPausedStart = useRef(0);
  const stretchStartedAt = useRef<string>(new Date().toISOString());
  const lastChunkRef = useRef(0);

  const [finished, setFinished] = useState<{ words: number; activeMs: number } | null>(null);
  const finishRef = useRef<() => void>(() => {});
  const clock = useReadingClock({
    durations,
    chunkCount: chunks.length,
    initialChunk: 0,
    onChunkChange: (c) => {
      const all = chunksRef.current;
      const prev = lastChunkRef.current;
      // Count a chunk as read only when playback advanced past it on its own.
      if (playingRef.current && c === prev + 1 && all[prev]) {
        wordsReadRef.current += all[prev].endWord - all[prev].startWord + 1;
      }
      lastChunkRef.current = c;
      if (all[c]) setWord(all[c].startWord);
    },
    onFinish: () => finishRef.current(),
  });
  const playingRef = useRef(false);
  playingRef.current = clock.playing;

  const jumpToWord = useCallback(
    (i: number) => {
      setWord(i);
      const c = chunkIndexForWord(chunksRef.current, i);
      lastChunkRef.current = c;
      clock.goTo(c);
    },
    [clock, setWord],
  );

  // Settings changes rebuild the chunks; keep the reader on the same word.
  useEffect(() => {
    const c = chunkIndexForWord(chunks, wordIndexRef.current);
    lastChunkRef.current = c;
    clock.goTo(c);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chunks]);

  // ---- resume -------------------------------------------------------------
  const canResume = !!savedProgress && savedProgress.word_index > 0 && !savedProgress.completed_at;
  const [resumeOpen, setResumeOpen] = useState<boolean>(canResume);
  // Progress is not written until the resume choice is made, so opening a
  // passage can never overwrite saved progress with word 0.
  const progressArmed = useRef<boolean>(!canResume);
  const lastSavedWord = useRef<number>(savedProgress?.word_index ?? -1);

  const saveNow = useCallback(
    (completed = false) => {
      if (!progressArmed.current) return;
      const w = wordIndexRef.current;
      if (!completed && w === lastSavedWord.current) return;
      lastSavedWord.current = w;
      saveProgress.mutate({ passage_id: passage.id, word_index: w, ...(completed ? { completed: true } : {}) });
    },
    [passage.id, saveProgress],
  );

  useEffect(() => {
    const t = window.setTimeout(() => saveNow(), 2000);
    return () => window.clearTimeout(t);
  }, [wordIndex, saveNow]);

  const record = useCallback(
    (force: boolean) => {
      const active = clock.activeMs() - stretchActiveStart.current;
      if (active <= 0 || (!force && active < MIN_SESSION_MS) || wordsReadRef.current <= 0) return;
      recordSession.mutate({
        passage_id: passage.id,
        reading_mode: prefs.reading_mode,
        wpm: prefs.wpm,
        words_read: wordsReadRef.current,
        active_ms: active,
        paused_ms: Math.max(0, clock.pausedMs() - stretchPausedStart.current),
        started_at: stretchStartedAt.current,
        ended_at: new Date().toISOString(),
      });
      wordsReadRef.current = 0;
      stretchActiveStart.current = clock.activeMs();
      stretchPausedStart.current = clock.pausedMs();
      stretchStartedAt.current = new Date().toISOString();
    },
    [clock, passage.id, prefs.reading_mode, prefs.wpm, recordSession],
  );

  const play = useCallback(() => {
    if (finished) return;
    if (wordsReadRef.current === 0) stretchStartedAt.current = new Date().toISOString();
    clock.play();
  }, [clock, finished]);

  const pause = useCallback(() => {
    if (!clock.playing) return;
    clock.pause();
    saveNow();
    record(false);
  }, [clock, saveNow, record]);

  const toggle = useCallback(() => (clock.playing ? pause() : play()), [clock.playing, pause, play]);

  finishRef.current = () => {
    const all = chunksRef.current;
    const last = all[all.length - 1];
    if (last) wordsReadRef.current += last.endWord - last.startWord + 1;
    const totalActive = clock.activeMs() - stretchActiveStart.current;
    const totalWords = wordsReadRef.current;
    saveNow(true);
    record(true);
    setFinished({ words: totalWords, activeMs: totalActive });
  };

  // Save and record on leave. Refs hold the latest versions.
  const leaveRef = useRef<() => void>(() => {});
  leaveRef.current = () => {
    flushPrefs();
    saveNow();
    record(false);
  };
  useEffect(() => () => leaveRef.current(), []);

  // ---- e-Reader paging ----------------------------------------------------
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const onPageCountChange = useCallback((n: number) => {
    setPageCount(n);
    setPage((p) => Math.min(p, n - 1));
  }, []);
  const goPage = useCallback((p: number) => setPage(Math.max(0, Math.min(pageCount - 1, p))), [pageCount]);

  // ---- dialogs ------------------------------------------------------------
  const [wpmOpen, setWpmOpen] = useState(false);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [viewOpen, setViewOpen] = useState(false);
  const [bookmarksOpen, setBookmarksOpen] = useState(false);
  const anyDialogOpen = wpmOpen || prefsOpen || viewOpen || bookmarksOpen || resumeOpen;

  const openDialog = (setter: (v: boolean) => void) => {
    pause();
    setter(true);
  };

  // ---- bookmarks ----------------------------------------------------------
  const onWordClick = useCallback(
    (i: number) => {
      if (clock.playing && !isEReader) {
        if (prefs.reading_mode === "highlight" || prefs.reading_mode === "scroll") jumpToWord(i);
        return;
      }
      addBookmark.mutate(
        { passage_id: passage.id, word_index: i },
        {
          onSuccess: () => toast.success("Bookmark added"),
          onError: (e) => toast.error(e.message || "Could not add bookmark"),
        },
      );
    },
    [addBookmark, clock.playing, isEReader, jumpToWord, passage.id, prefs.reading_mode],
  );

  // ---- fullscreen ---------------------------------------------------------
  const [isFullscreen, setIsFullscreen] = useState<boolean>(!!document.fullscreenElement);
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);
  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.();
  };

  // ---- keyboard -----------------------------------------------------------
  const keyState = useRef({ anyDialogOpen, isEReader, page, finished });
  keyState.current = { anyDialogOpen, isEReader, page, finished };
  const keyActions = useRef({ toggle, pause, goPage, updatePrefs, prefs, clock, setPrefsOpen });
  keyActions.current = { toggle, pause, goPage, updatePrefs, prefs, clock, setPrefsOpen };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable)) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const s = keyState.current;
      const a = keyActions.current;
      if (s.anyDialogOpen || s.finished) return;
      const setWpm = (delta: number) =>
        a.updatePrefs({ wpm: Math.max(WPM_MIN, Math.min(WPM_MAX, a.prefs.wpm + delta)) });
      switch (e.key) {
        case "ArrowUp":
        case "+":
        case "=":
          e.preventDefault();
          setWpm(10);
          break;
        case "ArrowDown":
        case "-":
          e.preventDefault();
          setWpm(-10);
          break;
        case " ":
        case "p":
        case "P":
          e.preventDefault();
          if (!s.isEReader) a.toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (s.isEReader) a.goPage(s.page + 1);
          else a.clock.next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (s.isEReader) a.goPage(s.page - 1);
          else a.clock.prev();
          break;
        case "r":
        case "R":
          a.clock.restart();
          break;
        case "s":
        case "S":
          a.pause();
          a.setPrefsOpen(true);
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const remainingText = formatRemaining(remainingMs(durations, clock.chunk));
  const percent = percentRead(wordIndex, tokens.length);

  return (
    <ReaderSurface prefs={prefs} className="relative flex h-screen flex-col overflow-hidden">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center gap-2 px-4">
        <button
          type="button"
          onClick={() => navigate(RC_LIBRARY_PATH)}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm opacity-75 hover:opacity-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold">{passage.title}</h1>
        <div className="flex items-center gap-1">
          {isEReader && searchOpen && (
            <input
              autoFocus
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search"
              aria-label="Search the passage"
              className="h-8 w-40 rounded-md border border-[color-mix(in_srgb,currentColor_30%,transparent)] bg-transparent px-2 text-sm"
            />
          )}
          {isEReader && (
            <IconButton
              label="Search"
              onClick={() => {
                setSearchOpen((o) => !o);
                if (searchOpen) setSearchQuery("");
              }}
            >
              <Search className="h-4 w-4" />
            </IconButton>
          )}
          <IconButton label={isFullscreen ? "Exit fullscreen" : "Fullscreen"} onClick={toggleFullscreen}>
            {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
          </IconButton>
          <IconButton label="Bookmarks" onClick={() => openDialog(setBookmarksOpen)}>
            <BookmarkIcon className="h-4 w-4" />
          </IconButton>
          <IconButton label="Settings" onClick={() => openDialog(setPrefsOpen)}>
            <Settings className="h-4 w-4" />
          </IconButton>
        </div>
      </header>

      {/* Stage */}
      <main className="flex min-h-0 flex-1 flex-col">
        <ModeRenderer
          tokens={tokens}
          chunks={chunks}
          chunk={clock.chunk}
          prefs={prefs}
          playing={clock.playing}
          onWordClick={onWordClick}
          page={page}
          onPageCountChange={onPageCountChange}
          onPageChange={goPage}
          searchQuery={searchQuery}
        />
      </main>

      {/* Transport */}
      {!isEReader && (
        <div className="flex shrink-0 items-center justify-center gap-6 py-3">
          <IconButton label="Previous" onClick={() => clock.prev()}>
            <SkipBack className="h-5 w-5" />
          </IconButton>
          <button
            type="button"
            aria-label={clock.playing ? "Pause" : "Play"}
            onClick={toggle}
            className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-current transition hover:opacity-80"
          >
            {clock.playing ? <Pause className="h-6 w-6" /> : <Play className="ml-0.5 h-6 w-6" />}
          </button>
          <IconButton label="Next" onClick={() => clock.next()}>
            <SkipForward className="h-5 w-5" />
          </IconButton>
        </div>
      )}

      {/* Bottom bar */}
      {isEReader ? (
        <footer className="flex h-12 shrink-0 items-center gap-4 border-t border-[color-mix(in_srgb,currentColor_15%,transparent)] px-4 text-sm">
          <IconButton label="Previous page" onClick={() => goPage(page - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </IconButton>
          <Slider
            className="flex-1"
            value={[page]}
            min={0}
            max={Math.max(0, pageCount - 1)}
            step={1}
            onValueChange={([v]) => goPage(v)}
            aria-label="Page"
          />
          <span className="tabular-nums">
            {page + 1} / {pageCount}
          </span>
          <IconButton label="Next page" onClick={() => goPage(page + 1)}>
            <ChevronRight className="h-4 w-4" />
          </IconButton>
        </footer>
      ) : (
        <footer className="grid h-12 shrink-0 grid-cols-[1fr_auto_1fr] items-center border-t border-[color-mix(in_srgb,currentColor_15%,transparent)] px-4 text-sm">
          <div>
            <ShortcutsPopover />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => openDialog(setWpmOpen)}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 opacity-80 hover:opacity-100"
            >
              <Gauge className="h-4 w-4" />
              <span className="tabular-nums">{prefs.wpm}</span>
            </button>
            <button
              type="button"
              onClick={() => openDialog(setViewOpen)}
              className="rounded-md px-2 py-1 opacity-80 hover:opacity-100"
            >
              View
            </button>
          </div>
          <div className="justify-self-end truncate text-xs opacity-70">
            {percent}% - {remainingText}
          </div>
        </footer>
      )}

      {finished && (
        <CompletionCard
          wordsRead={finished.words}
          activeMs={finished.activeMs}
          onReadAgain={() => {
            setFinished(null);
            jumpToWord(0);
          }}
          onBack={() => navigate(RC_LIBRARY_PATH)}
        />
      )}

      <ResumePrompt
        open={resumeOpen}
        onResume={() => {
          progressArmed.current = true;
          setResumeOpen(false);
          jumpToWord(savedProgress?.word_index ?? 0);
        }}
        onStartOver={() => {
          progressArmed.current = true;
          setResumeOpen(false);
          jumpToWord(0);
        }}
      />
      <WpmDialog open={wpmOpen} onOpenChange={setWpmOpen} value={prefs.wpm} onSave={(v) => updatePrefs({ wpm: v })} />
      <PreferencesDialog open={prefsOpen} onOpenChange={setPrefsOpen} prefs={prefs} onChange={updatePrefs} />
      <ViewPanel
        open={viewOpen}
        onOpenChange={setViewOpen}
        title={passage.title}
        tokens={tokens}
        prefs={prefs}
        currentWord={wordIndex}
        wpm={prefs.wpm}
        remainingText={remainingText}
        onJump={jumpToWord}
        onPlay={play}
      />
      <BookmarksDialog
        open={bookmarksOpen}
        onOpenChange={setBookmarksOpen}
        bookmarks={bookmarksQuery.data ?? []}
        tokens={tokens}
        onJump={jumpToWord}
        onDelete={(id) => deleteBookmark.mutate({ id, passage_id: passage.id })}
      />
    </ReaderSurface>
  );
}
