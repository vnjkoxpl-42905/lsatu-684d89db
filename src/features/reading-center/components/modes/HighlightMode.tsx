import React, { useMemo, useRef, useEffect } from "react";
import type { ModeProps } from "./types";
import { chunkTokens } from "../../lib/tokenize";

export function HighlightMode({
  tokens,
  chunks,
  chunk,
  prefs,
  playing,
  onWordClick,
}: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];
  const activeWordRef = useRef<HTMLSpanElement | null>(null);

  // Group tokens into lines of words_per_line tokens, never crossing a paragraph boundary
  const lines = useMemo(() => {
    return chunkTokens(tokens, prefs.words_per_line, 1);
  }, [tokens, prefs.words_per_line]);

  useEffect(() => {
    if (activeWordRef.current) {
      activeWordRef.current.scrollIntoView({
        block: "center",
        behavior: prefs.wpm > 600 ? "auto" : "smooth",
      });
    }
  }, [chunk, prefs.wpm]);

  return (
    <div className="flex-1 w-full overflow-y-auto px-6 py-12 flex justify-center">
      <div className="max-w-[46rem] w-full">
        {lines.map((line, lineIdx) => {
          const rowTokens = line.rows[0] ?? [];
          const endsParagraph = rowTokens[rowTokens.length - 1]?.endsParagraph;

          return (
            <div
              key={lineIdx}
              className={`leading-relaxed py-1 ${endsParagraph ? "mb-6" : ""}`}
            >
              {rowTokens.map((token, tokenIdx) => {
                const isCurrentWord =
                  currentChunk &&
                  token.index >= currentChunk.startWord &&
                  token.index <= currentChunk.endWord;
                const isFirstOfCurrent =
                  currentChunk && token.index === currentChunk.startWord;

                return (
                  <React.Fragment key={token.index}>
                    {tokenIdx > 0 && " "}
                    <span
                      ref={isFirstOfCurrent ? activeWordRef : null}
                      style={{ opacity: isCurrentWord ? 1 : 0.35 }}
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
