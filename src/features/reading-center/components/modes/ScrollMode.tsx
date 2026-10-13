import React, { useMemo, useRef, useState, useEffect } from "react";
import type { ModeProps } from "./types";
import { chunkTokens } from "../../lib/tokenize";

export function ScrollMode({
  tokens,
  chunks,
  chunk,
  prefs,
  playing,
  onWordClick,
}: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rowRefs = useRef<Map<number, HTMLDivElement>>(new Map());
  const [translateY, setTranslateY] = useState<number>(0);

  // Group tokens into lines of words_per_line tokens, never crossing a paragraph boundary
  const lines = useMemo(() => {
    return chunkTokens(tokens, prefs.words_per_line, 1);
  }, [tokens, prefs.words_per_line]);

  useEffect(() => {
    if (!currentChunk || !containerRef.current) return;
    const lineIndex = lines.findIndex(
      (l) => currentChunk.startWord >= l.startWord && currentChunk.startWord <= l.endWord,
    );
    if (lineIndex === -1) return;
    const rowEl = rowRefs.current.get(lineIndex);
    if (!rowEl) return;

    const containerHeight = containerRef.current.clientHeight;
    const targetY = containerHeight * 0.4;
    const rowOffset = rowEl.offsetTop;
    setTranslateY(targetY - rowOffset);
  }, [chunk, currentChunk, lines]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 w-full max-w-[46rem] mx-auto h-[70vh] overflow-hidden px-6"
    >
      {/* 40% horizontal guide line */}
      <div
        className="absolute left-0 right-0 border-t border-current opacity-30 pointer-events-none z-10"
        style={{ top: "40%" }}
      />

      {/* Inner column translated */}
      <div
        className="w-full will-change-transform"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: "transform 150ms linear",
        }}
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
              className={`leading-relaxed py-1 ${endsParagraph ? "mb-6" : ""}`}
            >
              {rowTokens.map((token, tokenIdx) => {
                const isCurrentWord =
                  currentChunk &&
                  token.index >= currentChunk.startWord &&
                  token.index <= currentChunk.endWord;

                return (
                  <React.Fragment key={token.index}>
                    {tokenIdx > 0 && " "}
                    <span
                      style={{ opacity: isCurrentWord ? 1 : 0.6 }}
                      className={isCurrentWord ? "font-semibold" : ""}
                    >
                      {!playing ? (
                        <button
                          type="button"
                          onClick={() => onWordClick(token.index)}
                          className="cursor-pointer hover:underline focus:outline-none bg-transparent border-0 p-0 font-inherit text-inherit"
                        >
                          {token.text}
                        </button>
                      ) : (
                        <span>{token.text}</span>
                      )}
                    </span>
                  </React.Fragment>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
