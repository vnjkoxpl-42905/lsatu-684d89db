import { type CSSProperties } from "react";
import type { TranslationBucket } from "../types";

// HighlightToken: per-word/phrase color-coded inline token used inside flowing
// chapter prose to highlight translation-language categories. CSS variables
// carry bucket color. box-decoration-break:clone keeps multi-line wraps
// visually intact.

const BUCKET_LABELS: Record<TranslationBucket, string> = {
  assumption: "assumption language",
  causal: "causal language",
  comparison: "comparison language",
  evidence: "evidence / relevance language",
  evaluation: "evaluation language",
  neutral: "",
};

const BUCKET_GLYPH: Record<TranslationBucket, string> = {
  assumption: "≡",
  causal: "→",
  comparison: "↔",
  evidence: "⊢",
  evaluation: "Δ",
  neutral: "",
};

export interface HighlightTokenProps {
  text: string;
  bucket: TranslationBucket;
  mode?: "reveal" | "hover";
}

const tokenStyle: CSSProperties = {
  boxDecorationBreak: "clone",
  WebkitBoxDecorationBreak: "clone",
};

export function HighlightToken({
  text,
  bucket,
  mode = "reveal",
}: HighlightTokenProps) {
  if (bucket === "neutral") {
    return <span>{text}</span>;
  }
  const label = BUCKET_LABELS[bucket];
  const aria = label ? `${label}: ${text.trim()}` : undefined;
  const glyph = BUCKET_GLYPH[bucket];
  return (
    <span
      className={`indicator-token translation-bucket-${bucket} mode-${mode}`}
      data-bucket={bucket}
      data-mode={mode}
      aria-label={aria}
      style={tokenStyle}
    >
      {text}
      {glyph ? (
        <span aria-hidden className="ml-0.5 text-[0.6em] opacity-70">
          {glyph}
        </span>
      ) : null}
    </span>
  );
}
