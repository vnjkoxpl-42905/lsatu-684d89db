import React from "react";
import type { ModeProps } from "./types";

export function SerialMode({
  chunks,
  chunk,
  prefs,
  playing,
  onWordClick,
}: ModeProps): React.ReactElement {
  const currentChunk = chunks[chunk];
  if (!currentChunk) {
    return <div className="flex-1" />;
  }

  const containerClasses = prefs.center_text
    ? "flex-1 flex flex-col justify-center items-center text-center w-full px-6"
    : "flex-1 flex flex-col justify-center items-start text-left w-full pl-[15%] pr-6";

  return (
    <div className={containerClasses}>
      {currentChunk.rows.map((row, rowIdx) => (
        <div key={rowIdx} className="leading-tight py-1">
          {row.map((token, tokenIdx) => (
            <React.Fragment key={token.index}>
              {tokenIdx > 0 && " "}
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
            </React.Fragment>
          ))}
        </div>
      ))}
    </div>
  );
}
