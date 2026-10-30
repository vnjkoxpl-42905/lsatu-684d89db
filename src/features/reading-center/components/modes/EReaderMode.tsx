import React, { useMemo, useRef, useEffect, useLayoutEffect, useState } from "react";
import type { EReaderModeProps } from "./types";
import type { Token } from "../../lib/types";
import { READING_TEXT_STYLE } from "../ReaderSurface";

const COLUMN_GAP = 48;

/** Split `text` around case-insensitive matches of `query`, wrapping each match in <mark>. */
function highlight(text: string, query: string): React.ReactNode {
  const q = query.trim().toLowerCase();
  if (!q) return text;
  const lower = text.toLowerCase();
  const parts: React.ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(q);
  while (at !== -1) {
    if (at > from) parts.push(text.slice(from, at));
    parts.push(
      <mark key={at} className="rounded-sm bg-yellow-300 px-0.5 text-black">
        {text.slice(at, at + q.length)}
      </mark>,
    );
    from = at + q.length;
    at = lower.indexOf(q, from);
  }
  if (parts.length === 0) return text;
  if (from < text.length) parts.push(text.slice(from));
  return parts;
}

/**
 * e-Reader: ordinary paginated reading. The text is laid out in CSS columns
 * exactly one container wide, so each column is one page; turning a page sets
 * scrollLeft to page * (width + gap).
 */
export function EReaderMode({
  tokens,
  prefs,
  page,
  onPageCountChange,
  onPageChange,
  searchQuery,
  onWordClick,
}: EReaderModeProps): React.ReactElement {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState<number>(0);

  const paragraphs = useMemo(() => {
    const map = new Map<number, Token[]>();
    for (const token of tokens) {
      const list = map.get(token.paragraphIndex) ?? [];
      list.push(token);
      map.set(token.paragraphIndex, list);
    }
    return Array.from(map.values());
  }, [tokens]);

  // Track the container width; columns are sized from it in px (columnWidth takes no %).
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const observer = new ResizeObserver(() => setWidth(el.clientWidth));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Count pages whenever the layout can change.
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || width <= 0) return;
    const count = Math.max(1, Math.round((el.scrollWidth + COLUMN_GAP) / (width + COLUMN_GAP)));
    onPageCountChange(count);
  }, [width, paragraphs, prefs.font_family, prefs.font_size, prefs.line_spacing, onPageCountChange]);

  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || width <= 0) return;
    el.scrollLeft = page * (width + COLUMN_GAP);
  }, [page, width, prefs.font_family, prefs.font_size, prefs.line_spacing]);

  // Jump to the page holding the first match when the query changes.
  useEffect(() => {
    const el = containerRef.current;
    if (!searchQuery.trim() || !el || width <= 0) return;
    const first = el.querySelector("mark") as HTMLElement | null;
    if (first) onPageChange(Math.floor(first.offsetLeft / (width + COLUMN_GAP)));
  }, [searchQuery, width, onPageChange]);

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-word]");
    const value = target?.getAttribute("data-word");
    if (value != null) onWordClick(Number(value));
  };

  return (
    <div className="flex-1 min-h-0 w-full max-w-[46rem] mx-auto px-6 py-4">
      <div
        ref={containerRef}
        onClick={handleClick}
        className="relative w-full overflow-hidden select-text"
        style={{
          ...READING_TEXT_STYLE,
          height: "calc(100vh - 140px)",
          columnWidth: width > 0 ? `${width}px` : undefined,
          columnGap: `${COLUMN_GAP}px`,
          columnFill: "auto",
        }}
      >
        {paragraphs.map((paraTokens, pIdx) => (
          <p key={pIdx} className="mb-6">
            {paraTokens.map((token, tIdx) => (
              <React.Fragment key={token.index}>
                {tIdx > 0 && " "}
                <span data-word={token.index} className="cursor-pointer hover:underline">
                  {highlight(token.text, searchQuery)}
                </span>
              </React.Fragment>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
