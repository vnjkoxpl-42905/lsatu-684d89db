import type { ReactNode } from "react";

// CodexStamp: scholarly ink-stamp verdict for drill correct/incorrect feedback.
// Renders an italic serif label inside an oxblood (incorrect) or ink-forest
// (correct) pill outline with a slight rotation. Replaces the flat
// "Correct" / "Not quite" header on auto-graded drills.

export interface CodexStampProps {
  variant: "correct" | "incorrect";
  label?: string;
  children?: ReactNode;
}

const DEFAULT_LABEL: Record<CodexStampProps["variant"], string> = {
  correct: "Correct",
  incorrect: "Revisit",
};

export function CodexStamp({ variant, label, children }: CodexStampProps) {
  const content = children ?? label ?? DEFAULT_LABEL[variant];
  const stampClass =
    variant === "correct" ? "codex-stamp-correct" : "codex-stamp-incorrect";
  return (
    <span className={stampClass}>
      <svg viewBox="0 0 16 16" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        {variant === "correct" ? (
          <path d="M3 8.5 L7 12 L13 4" />
        ) : (
          <>
            <path d="M4 4 L12 12" />
            <path d="M12 4 L4 12" />
          </>
        )}
      </svg>
      {content}
    </span>
  );
}
