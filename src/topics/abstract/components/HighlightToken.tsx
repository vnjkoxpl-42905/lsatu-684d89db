import { type CSSProperties } from "react";
import type { IndicatorBucket } from "../types";

// HighlightToken: per-word/phrase color-coded token. CSS variables for bucket
// color. box-decoration-break:clone per architecture rule (zero layout shift).

const BUCKET_LABELS: Record<IndicatorBucket, string> = {
  conclusion: "conclusion indicator",
  pivot: "pivot indicator",
  support: "support indicator (FABS)",
  "opposing-view": "opposing-view indicator",
  concession: "concession indicator",
  neutral: "",
};

const BUCKET_GLYPH: Record<IndicatorBucket, string> = {
  conclusion: "▸",
  pivot: "↺",
  support: "↩",
  "opposing-view": "✕",
  concession: "≈",
  neutral: "",
};

export interface HighlightTokenProps {
  text: string;
  bucket: IndicatorBucket;
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
      className={`indicator-token indicator-bucket-${bucket} mode-${mode}`}
      data-bucket={bucket}
      data-mode={mode}
      title={label}
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
