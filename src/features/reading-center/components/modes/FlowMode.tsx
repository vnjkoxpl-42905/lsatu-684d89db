import React, { useMemo } from "react";
import type { ModeProps } from "./types";
import { chunkTokens } from "../../lib/tokenize";

export function FlowMode({
  tokens,
  chunks,
  chunk,
  prefs,
  playing,
  onWordClick,
}: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];

  // Group tokens into lines of words_per_line tokens, never crossing paragraph
  const lines = useMemo(() => {
    return chunkTokens(tokens, prefs.words_per_line, 1);
  }, [tokens, prefs.words_per_line]);

  if (!currentChunk) {
    return <div className="flex-1" />;
  }

  // Find the line containing the current chunk's start word
  const currentLine = lines.find(
    (l) => currentChunk.startWord >= l.startWord && currentChunk.startWord <= l.endWord,
  ) ?? lines[0];

  const lineTokens = currentLine?.rows[0] ?? [];

  return (
    <div className="flex-1 flex flex-col justify-center items-start text-left w-full pl-[15%] pr-6">
      <div className="leading-tight py-1">
        {lineTokens.map((token, tokenIdx) => {
          const isCurrentWord =
            token.index >= currentChunk.startWord && token.index <= currentChunk.endWord;

          return (
            <React.Fragment key={token.index}>
              {tokenIdx > 0 && " "}
              <span className={isCurrentWord ? "opacity-100" : "opacity-0 select-none pointer-events-none"}>
                {!playing && isCurrentWord ? (
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
    </div>
  );
}
