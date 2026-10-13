import React, { useMemo, useRef, useState, useLayoutEffect } from "react";
import type { ModeProps } from "./types";
import { chunkTokens } from "../../lib/tokenize";
import { READING_TEXT_STYLE } from "../ReaderSurface";
import { Word } from "./Word";

export function ScrollMode({ tokens, chunks, chunk, prefs, playing, onWordClick }: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [translateY, setTranslateY] = useState<number>(0);

  const lines = useMemo(() => chunkTokens(tokens, prefs.words_per_line, 1), [tokens, prefs.words_per_line]);

  const currentLineIndex = useMemo(() => {
    if (!currentChunk) return -1;
    return lines.findIndex((l) => currentChunk.startWord >= l.startWord && currentChunk.startWord <= l.endWord);
  }, [lines, currentChunk]);

  // Put the current row on the guide line. Re-measure when the text reflows.
  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const rowEl = rowRefs.current.get(currentLineIndex);
      if (!container || !rowEl) return;
      setTranslateY(container.clientHeight * 0.4 - rowEl.offsetTop);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [currentLineIndex, prefs.font_size, prefs.line_spacing, prefs.font_family]);

  return (
    <div className="flex-1 min-h-0 w-full flex items-center">
      <div ref={containerRef} className="relative w-full max-w-[46rem] mx-auto h-[70vh] overflow-hidden px-6">
        <div
          aria-hidden
          className="absolute left-0 right-0 border-t border-current opacity-30 pointer-events-none z-10"
          style={{ top: "40%" }}
        />
        <div
          className="w-full will-change-transform"
          style={{ ...READING_TEXT_STYLE, transform: `translateY(${translateY}px)`, transition: "transform 150ms linear" }}
        >
          {lines.map((line, lineIdx) => {
            const rowTokens = line.rows[0] ?? [];
            const endsParagraph = rowTokens[rowTokens.length - 1]?.endsParagraph;
            return (
              <div
                key={lineIdx}
                ref={(el) => {
                  if (el) rowRefs.current.set(lineIdx, el);
                  else rowRefs.current.delete(lineIdx);
                }}
                className={endsParagraph ? "mb-6" : ""}
              >
                {rowTokens.map((token, tokenIdx) => {
                  const current =
                    !!currentChunk && token.index >= currentChunk.startWord && token.index <= currentChunk.endWord;
                  return (
                    <React.Fragment key={token.index}>
                      {tokenIdx > 0 && " "}
                      <span style={{ opacity: current ? 1 : 0.6 }} className={current ? "font-semibold" : ""}>
                        <Word token={token} clickable={!playing} onWordClick={onWordClick} />
                      </span>
                    </React.Fragment>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
