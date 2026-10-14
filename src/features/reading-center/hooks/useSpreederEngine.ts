import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Preferences } from "../lib/types";
import { startTimer } from "../lib/workerTimer";
import {
  buildLines,
  chunkDelays,
  highlightPages,
  serialChunks,
  type Chunk,
  type Measure,
  type Page,
  type TextModel,
} from "../lib/spreeder";

export interface SectionLayout {
  sectionIndex: number;
  chunks: Chunk[];
  /** Highlight / Scroll only: the pages, and for each chunk which page it sits on. */
  pages: Page[];
  chunkPage: number[];
  delays: number[];
}

export interface StageSize {
  width: number;
  height: number;
}

/**
 * Spreeder's play loop (base activity + serial / text-highlighter), driven by the
 * active word. Navigation always lands on the first word of a chunk.
 */
export function useSpreederEngine(args: {
  model: TextModel;
  prefs: Preferences;
  stage: StageSize;
  measure: Measure;
  initialWord: number;
  onFinish: () => void;
  onReadChunk?: (wordCount: number) => void;
}) {
  const { model, prefs, stage, measure } = args;
  const mode = prefs.reading_mode;
  const isFlow = mode === "flow";
  const isPaged = mode === "highlight" || mode === "scroll";
  // Flow forces one line (Spreeder sr_TextLine); every other mode uses the setting.
  const numberOfLines = isFlow ? 1 : prefs.number_of_lines;

  const [activeWord, setActiveWord] = useState<number>(args.initialWord);
  const [playing, setPlaying] = useState(false);
  const [seekVersion, setSeekVersion] = useState(0);

  const layoutFor = useCallback(
    (sectionIndex: number): SectionLayout => {
      const section = model.sections[sectionIndex];
      const empty: SectionLayout = { sectionIndex, chunks: [], pages: [], chunkPage: [], delays: [] };
      if (!section || stage.width <= 0 || stage.height <= 0) return empty;
      const lines = buildLines(section.words, measure, stage.width - 40, prefs.words_per_line);
      let chunks: Chunk[];
      let pages: Page[] = [];
      let chunkPage: number[] = [];
      if (isPaged) {
        pages = highlightPages(lines, stage.height, prefs.font_size, numberOfLines);
        chunks = pages.flatMap((p) => p.groups);
        chunkPage = pages.flatMap((p, pi) => p.groups.map(() => pi));
      } else {
        chunks = serialChunks(lines, numberOfLines);
      }
      const delays = chunkDelays(section, chunks, {
        wpm: prefs.wpm,
        numberOfLines,
        speedVariability: prefs.speed_variability,
        punctuationPauses: prefs.punctuation_pauses,
      });
      return { sectionIndex, chunks, pages, chunkPage, delays };
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [model, stage.width, stage.height, measure, prefs.words_per_line, prefs.font_size, prefs.wpm, prefs.speed_variability, prefs.punctuation_pauses, numberOfLines, isPaged],
  );

  const sectionIndex = model.words[activeWord]?.sectionIndex ?? 0;
  const layout = useMemo(() => layoutFor(sectionIndex), [layoutFor, sectionIndex]);
  const chunkIndex = useMemo(() => {
    const i = layout.chunks.findIndex((c) => activeWord <= c.lastWord);
    return i === -1 ? Math.max(0, layout.chunks.length - 1) : i;
  }, [layout, activeWord]);

  // Keep the active word on a chunk start after a relayout.
  useEffect(() => {
    const c = layout.chunks[chunkIndex];
    if (c && c.firstWord !== activeWord) setActiveWord(c.firstWord);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout]);

  const state = useRef({ layout, chunkIndex, activeWord });
  state.current = { layout, chunkIndex, activeWord };
  const onFinishRef = useRef(args.onFinish);
  onFinishRef.current = args.onFinish;
  const onReadChunkRef = useRef(args.onReadChunk);
  onReadChunkRef.current = args.onReadChunk;

  const forward = useCallback((read = false) => {
    const { layout: l, chunkIndex: ci } = state.current;
    const chunk = l.chunks[ci];
    if (read && chunk) onReadChunkRef.current?.(chunk.lastWord - chunk.firstWord + 1);
    if (ci + 1 < l.chunks.length) {
      setActiveWord(l.chunks[ci + 1].firstWord);
    } else if (l.sectionIndex + 1 < model.sections.length) {
      setActiveWord(model.sections[l.sectionIndex + 1].words[0].index);
    } else {
      setPlaying(false);
      onFinishRef.current();
    }
  }, [model]);

  const backward = useCallback(() => {
    const { layout: l, chunkIndex: ci } = state.current;
    if (ci > 0) {
      setActiveWord(l.chunks[ci - 1].firstWord);
    } else if (l.sectionIndex > 0) {
      const prev = layoutFor(l.sectionIndex - 1);
      const last = prev.chunks[prev.chunks.length - 1];
      if (last) setActiveWord(last.firstWord);
    }
  }, [layoutFor]);

  // The play loop: each chunk stays up for its delay, then advances.
  const timerState = useRef<{ layout: SectionLayout; chunkIndex: number; remaining: number } | null>(null);
  useEffect(() => {
    const d = layout.delays[chunkIndex];
    if (d == null) return;
    if (timerState.current?.layout !== layout || timerState.current.chunkIndex !== chunkIndex) {
      timerState.current = { layout, chunkIndex, remaining: d };
    }
    if (!playing) return;
    const timer = timerState.current;
    const startedAt = performance.now();
    const cancel = startTimer(timer.remaining, () => forward(true));
    return () => {
      cancel();
      timer.remaining = Math.max(0, timer.remaining - (performance.now() - startedAt));
    };
  }, [playing, layout, chunkIndex, forward]);

  const play = useCallback(() => setPlaying(true), []);
  const pause = useCallback(() => setPlaying(false), []);
  const toggle = useCallback(() => setPlaying((p) => !p), []);
  const next = useCallback(() => {
    setPlaying(false);
    timerState.current = null;
    setSeekVersion((v) => v + 1);
    forward();
  }, [forward]);
  const prev = useCallback(() => {
    setPlaying(false);
    timerState.current = null;
    setSeekVersion((v) => v + 1);
    backward();
  }, [backward]);
  /** Spreeder "restart" (R): back to the first word of the current section. */
  const restartSection = useCallback(() => {
    setPlaying(false);
    timerState.current = null;
    setSeekVersion((v) => v + 1);
    const s = model.sections[state.current.layout.sectionIndex];
    if (s) setActiveWord(s.words[0].index);
  }, [model]);
  const goToWord = useCallback((i: number) => {
    timerState.current = null;
    setSeekVersion((v) => v + 1);
    setActiveWord(Math.max(0, Math.min(model.words.length - 1, i)));
  }, [model]);

  // Spreeder pauses when the window loses focus.
  useEffect(() => {
    const onBlur = () => setPlaying(false);
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  return {
    activeWord,
    playing,
    layout,
    chunkIndex,
    chunk: layout.chunks[chunkIndex],
    delay: layout.delays[chunkIndex] ?? 0,
    seekVersion,
    play,
    pause,
    toggle,
    next,
    prev,
    restartSection,
    goToWord,
  };
}
