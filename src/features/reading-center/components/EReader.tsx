import React, { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { Preferences } from "../lib/types";
import type { Word } from "../lib/spreeder";
import { findMatches } from "./ViewPanel";
import { Icon, MIcon } from "./Icon";

const GAP = 48;

/**
 * Spreeder e-Reader: the passage as one stream in a ~734px column, paged with
 * CSS columns. Words turn #3e92d7 on hover and open word actions on click.
 */
export function EReader({
  prefs,
  fontStack,
  words,
  page,
  initialWord = 0,
  onResumePage,
  onPageCount,
  onPageWord,
  highlight,
  onWordClick,
}: {
  prefs: Preferences;
  fontStack: string;
  words: Word[];
  page: number;
  initialWord?: number;
  onResumePage?: (page: number) => void;
  onPageCount: (n: number) => void;
  /** First word index on the visible page (reading position). */
  onPageWord: (i: number, endExclusive: number) => void;
  highlight: { start: number; length: number }[];
  onWordClick: (w: Word) => void;
}): React.ReactElement {
  const box = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  const resumePending = useRef(true);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el || width <= 0) return;
    onPageCount(Math.max(1, Math.round((el.scrollWidth + GAP) / (width + GAP))));
  }, [width, words, prefs.font_family, prefs.font_size, prefs.line_spacing, onPageCount]);

  useLayoutEffect(() => {
    const el = box.current;
    if (!el || width <= 0) return;
    if (resumePending.current) {
      resumePending.current = false;
      const savedWord = el.querySelector<HTMLElement>(`[data-word="${initialWord}"]`);
      const resumedPage = savedWord ? Math.max(0, Math.floor(savedWord.offsetLeft / (width + GAP))) : 0;
      if (onResumePage && resumedPage !== page) { onResumePage(resumedPage); return; }
    }
    el.scrollLeft = page * (width + GAP);
    const spans = [...el.querySelectorAll<HTMLElement>("[data-word]")];
    const first = spans.find((s) => s.offsetLeft >= page * (width + GAP) - 1);
    const after = spans.find((s) => s.offsetLeft >= (page + 1) * (width + GAP) - 1);
    if (first) onPageWord(Number(first.dataset.word), after ? Number(after.dataset.word) : words.length);
  }, [page, width, prefs.font_family, prefs.font_size, prefs.line_spacing, onPageWord]);

  const marked = useMemo(() => {
    const set = new Set<number>();
    for (const h of highlight) for (let k = 0; k < h.length; k++) set.add(h.start + k);
    return set;
  }, [highlight]);

  return (
    <div className="mx-auto h-full w-full max-w-[750px] px-2 pt-7">
      <div
        ref={box}
        id="onePage"
        className="relative overflow-hidden"
        onClick={(e) => {
          const t = (e.target as HTMLElement).closest<HTMLElement>("[data-word]");
          if (t) onWordClick(words[Number(t.dataset.word)]);
        }}
        style={{
          height: "calc(100vh - 119px)",
          columnWidth: width > 0 ? `${width}px` : undefined,
          columnGap: GAP,
          columnFill: "auto",
          fontFamily: fontStack,
          fontSize: prefs.font_size,
          lineHeight: `${prefs.font_size * prefs.line_spacing}px`,
          color: "var(--rc-read)",
        }}
      >
        {words.map((w) => (
          <React.Fragment key={w.index}>
            <span data-word={w.index} className="cursor-pointer hover:text-[#3e92d7]" style={marked.has(w.index) ? { background: "#ffff00", color: "#000" } : undefined}>
              {w.text}
            </span>{" "}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/** Page of a word, measured from the rendered column layout. */
export function usePageOf(): (wordIndex: number) => number {
  return useCallback((wordIndex: number) => {
    const el = document.getElementById("onePage");
    const span = el?.querySelector<HTMLElement>(`[data-word="${wordIndex}"]`);
    if (!el || !span) return 0;
    return Math.floor(span.offsetLeft / (el.clientWidth + GAP));
  }, []);
}

export function EReaderBar({ page, pageCount, onPage, onFinish }: { page: number; pageCount: number; onPage: (p: number) => void; onFinish: () => void }): React.ReactElement {
  const pct = pageCount > 1 ? (page / (pageCount - 1)) * 100 : 0;
  const track = useRef<HTMLDivElement | null>(null);
  const fromX = (x: number) => {
    const r = track.current!.getBoundingClientRect();
    onPage(Math.round(Math.min(1, Math.max(0, (x - r.left) / r.width)) * (pageCount - 1)));
  };
  return (
    <div className="flex h-10 items-center" style={{ background: "var(--rc-bottombar)", borderTop: "0.8px solid var(--rc-bottombar-border)" }}>
      <div
        ref={track}
        role="slider"
        aria-label="Page"
        aria-valuemin={1}
        aria-valuemax={pageCount}
        aria-valuenow={page + 1}
        tabIndex={0}
        className="relative ml-7 h-10 flex-1 cursor-pointer"
        onPointerDown={(e) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); fromX(e.clientX); }}
        onPointerMove={(e) => e.buttons === 1 && fromX(e.clientX)}
      >
        <div className="absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 rounded" style={{ background: "rgba(100,100,100,.4)" }} />
        <div className="absolute left-0 top-1/2 h-1 -translate-y-1/2 rounded" style={{ width: `${pct}%`, background: "var(--rc-slider)" }} />
        <span className="absolute top-1/2 h-[25px] w-[25px] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ left: `${pct}%`, background: "var(--rc-slider)" }} />
      </div>
      <span className="ml-11 w-[60px] text-center text-sm" style={{ color: "var(--rc-text)", opacity: 0.8 }}>{page + 1} / {pageCount}</span>
      <button type="button" aria-label="Previous page" disabled={page <= 0} onClick={() => onPage(page - 1)} className="ml-3" style={{ color: page <= 0 ? "#bdbdbd" : "var(--rc-strong)" }}>
        <MIcon name="keyboard_arrow_left" size={30} />
      </button>
      <button type="button" aria-label="Next page" disabled={page >= pageCount - 1} onClick={() => onPage(page + 1)} className="ml-3 mr-5" style={{ color: page >= pageCount - 1 ? "#bdbdbd" : "var(--rc-strong)" }}>
        <MIcon name="keyboard_arrow_right" size={30} />
      </button>
      {page === pageCount - 1 && <button type="button" className="rc-green-btn mr-5 shrink-0" onClick={onFinish}>Mark finished</button>}
    </div>
  );
}

/** "Search in this book": results grouped by page, match in bold. */
export function EReaderSearch({
  open,
  onClose,
  words,
  pageOf,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  words: Word[];
  pageOf: (i: number) => number;
  onSelect: (page: number, hits: { start: number; length: number }[]) => void;
}): React.ReactElement | null {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const qLen = submitted.trim().split(/\s+/).filter(Boolean).length;
  const groups = useMemo(() => {
    const m = findMatches(words, submitted);
    const byPage = new Map<number, number[]>();
    for (const i of m) byPage.set(pageOf(i), [...(byPage.get(pageOf(i)) ?? []), i]);
    return [...byPage.entries()].sort((a, b) => a[0] - b[0]);
  }, [words, submitted, pageOf]);
  const total = groups.reduce((n, g) => n + g[1].length, 0);
  if (!open) return null;
  const pick = (page: number, starts: number[]) => {
    setSelected(page);
    onSelect(page, starts.map((s) => ({ start: s, length: qLen })));
  };
  return (
    <div className="fixed bottom-5 right-[30px] top-[50px] z-40 flex w-[350px] flex-col rounded-xl p-[34px] pt-5" style={{ background: "var(--rc-dialog)", color: "var(--rc-text)", boxShadow: "0 4px 18px rgba(0,0,0,.25)" }}>
      <div className="flex items-center justify-between">
        <h3 className="text-2xl">Search</h3>
        <button type="button" aria-label="Close search" onClick={onClose} style={{ color: "var(--rc-strong)" }}><MIcon name="close" /></button>
      </div>
      <form
        className="relative mt-7"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(query);
          setSelected(null);
        }}
      >
        <label className="block text-[11px]" style={{ color: "#1a62f2" }}>Search in this book</label>
        <input value={query} onChange={(e) => setQuery(e.target.value)} aria-label="Search in this book" autoFocus className="w-full bg-transparent pb-1 pr-6 text-sm outline-none" style={{ borderBottom: "2px solid #1a62f2", color: "var(--rc-strong)" }} />
        {query && (
          <button type="button" aria-label="Clear" onClick={() => { setQuery(""); setSubmitted(""); }} className="absolute bottom-1.5 right-0" style={{ color: "#757575" }}>
            <MIcon name="close" size={16} />
          </button>
        )}
      </form>
      {submitted && <p className="mt-4 text-sm" style={{ color: "#757575" }}>{total} results in book</p>}
      <div className="mt-7 min-h-0 flex-1 space-y-2 overflow-y-auto">
        {groups.map(([page, starts]) => {
          const s = starts[0];
          return (
            <button key={page} type="button" onClick={() => pick(page, starts)} className="flex w-full gap-2 rounded-xl px-2.5 py-3 text-left" style={{ background: selected === page ? "#d5e7fb" : "transparent" }}>
              <Icon name="search" size={20} style={{ color: selected === page ? "#1a62f2" : "#757575" }} />
              <span>
                <span className="block text-sm" style={{ color: "#757575" }}>Page {page + 1} ({starts.length} results)</span>
                <span className="block text-sm" style={{ color: selected === page ? "#212121" : "var(--rc-strong)" }}>
                  {words[s - 1]?.text} <strong>{words.slice(s, s + qLen).map((w) => w.text).join(" ")}</strong> {words.slice(s + qLen, s + qLen + 2).map((w) => w.text).join(" ")}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
