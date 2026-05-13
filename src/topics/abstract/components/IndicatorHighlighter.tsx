import { useMemo } from "react";
import taggedStimuli from "../content/stimuli/tagged-stimuli.json";
import type { TaggedStimulus } from "../types";
import { HighlightToken } from "./HighlightToken";
import "./indicator-tokens.css";

export interface IndicatorHighlighterProps {
  stimulusId: string;
  mode?: "reveal" | "hover";
  fallbackText?: string;
}

const STIMULI = taggedStimuli as { stimuli: TaggedStimulus[] };

export function IndicatorHighlighter({
  stimulusId,
  mode = "reveal",
  fallbackText,
}: IndicatorHighlighterProps) {
  const stim = useMemo(
    () => STIMULI.stimuli.find((s) => s.id === stimulusId),
    [stimulusId],
  );

  if (!stim) {
    if (typeof console !== "undefined" && import.meta.env?.DEV) {
      console.warn(
        `[IndicatorHighlighter] no tagged stimulus for id="${stimulusId}", rendering raw text`,
      );
    }
    return (
      <em className="block py-2 text-muted-foreground">
        {fallbackText ?? "(stimulus unavailable)"}
      </em>
    );
  }

  return (
    <blockquote
      className="indicator-highlighter italic border-l-2 border-border pl-4 my-3 leading-relaxed"
      data-mode={mode}
    >
      {stim.tokens.map((t, i) => (
        <HighlightToken
          key={`${stim.id}-${i}`}
          text={t.text}
          bucket={t.bucket}
          mode={mode}
        />
      ))}
    </blockquote>
  );
}
