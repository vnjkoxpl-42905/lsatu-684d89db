import React, { useMemo, useRef, useEffect, useCallback } from "react";
import type { EReaderModeProps } from "./types";
import { splitParagraphs } from "../../lib/tokenize";

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

  // Group tokens by paragraph
  const paragraphs = useMemo(() => {
    const map = new Map<number, typeof tokens>();
    for (const token of tokens) {
      const list = map.get(token.paragraphIndex) ?? [];
      list.push(token);
      map.set(token.paragraphIndex, list);
    }
    return Array.from(map.values());
  }, [tokens]);

  const measurePagination = useCallback(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    if (width <= 0) return;
    const scrollWidth = containerRef.current.scrollWidth;
    const pageWidth = width + 48;
    const count = Math.max(1, Math.ceil(scrollWidth / pageWidth));
    onPageCountChange(count);
  }, [onPageCountChange]);

  // Re-measure on resize and when font, size or line spacing change
  useEffect(() => {
    measurePagination();
    const handleResize = () => measurePagination();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [measurePagination, prefs.font_family, prefs.font_size, prefs.line_spacing]);

  // Update scrollLeft when page changes
  useEffect(() => {
    if (!containerRef.current) return;
    const width = containerRef.current.clientWidth;
    const pageWidth = width + 48;
    containerRef.current.scrollLeft = page * pageWidth;
  }, [page]);

  // Handle search query jumps
  useEffect(() => {
    if (!searchQuery.trim() || !containerRef.current) return;
    const timer = setTimeout(() => {
      if (!containerRef.current) return;
      const firstMark = containerRef.current.querySelector("mark");
      if (firstMark) {
        const offsetLeft = (firstMark as HTMLElement).offsetLeft;
        const width = containerRef.current.clientWidth;
        const pageWidth = width + 48;
        const targetPage = Math.floor(offsetLeft / pageWidth);
        onPageChange(targetPage);
      }
    }, 50);
    return () => clearTimeout(timer);
  }, [searchQuery, onPageChange]);

  const handleClick = (e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest("[data-word]");
    if (target) {
      const wordAttr = target.getAttribute("data-word");
      if (wordAttr !== null) {
        onWordClick(Number(wordAttr));
      }
    }
  };

  const renderTokenText = (text: string) => {
    if (!searchQuery.trim()) {
      return text;
    }
    const escapedQuery = searchQuery.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedQuery})`, "gi");
    const parts = text.split(regex);

    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-300 text-black rounded-xs px-0.5">
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div className="flex-1 w-full max-w-[46rem] mx-auto px-6 overflow-hidden">
      <div
        ref={containerRef}
        onClick={handleClick}
        className="w-full overflow-hidden select-text"
        style={{
          height: "calc(100vh - 140px)",
          columnWidth: "calc(100% - 0px)",
          columnGap: "48px",
          columnFill: "auto",
        }}
      >
        {paragraphs.map((paraTokens, pIdx) => (
          <p key={pIdx} className="mb-6 leading-relaxed">
            {paraTokens.map((token, tIdx) => (
              <React.Fragment key={token.index}>
                {tIdx > 0 && " "}
                <span
                  data-word={token.index}
                  className="cursor-pointer hover:underline"
                >
                  {renderTokenText(token.text)}
                </span>
              </React.Fragment>
            ))}
          </p>
        ))}
      </div>
    </div>
  );
}
