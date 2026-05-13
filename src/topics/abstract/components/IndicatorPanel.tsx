import { useState } from "react";
import type { PlaygroundStimulus } from "../types";
import { HighlightToken } from "./HighlightToken";
import "./indicator-tokens.css";

export interface IndicatorPanelProps {
  stimulus: PlaygroundStimulus;
}

// IndicatorPanel: toggle-on side panel that color-codes every indicator word
// in the current playground stimulus using bucket tokens.

export function IndicatorPanel({ stimulus }: IndicatorPanelProps) {
  const [open, setOpen] = useState(true);
  const indicators = stimulus.indicator_words;

  return (
    <aside
      className="indicator-panel rounded-xl border border-border bg-card/60 p-3 text-sm"
      aria-label="Indicator words for current stimulus"
    >
      <header className="mb-2 flex items-center justify-between">
        <h3 className="font-semibold">Indicators</h3>
        <button
          type="button"
          className="text-xs underline"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          {open ? "Hide" : "Show"}
        </button>
      </header>
      {open ? (
        <ul className="space-y-1.5">
          {indicators.length === 0 ? (
            <li className="text-muted-foreground">No indicators flagged.</li>
          ) : (
            indicators.map((w, i) => (
              <li key={`${w.text}-${i}`} className="flex items-start gap-2">
                <HighlightToken
                  text={w.text}
                  bucket={w.bucket}
                  mode="reveal"
                />
                <span className="text-xs text-muted-foreground">
                  {w.bucket}
                </span>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </aside>
  );
}
