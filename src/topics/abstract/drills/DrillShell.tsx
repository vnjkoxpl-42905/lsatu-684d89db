import { type ReactNode } from "react";
import { Link } from "react-router-dom";

export interface DrillShellProps {
  title: string;
  subtitle?: string;
  questionIndex: number;
  total: number;
  correct: number;
  attempted: number;
  referenceCardId?: string;
  children: ReactNode;
}

// Self-contained drill chrome rendered in the Codex idiom: eyebrow + serif
// display title, mono identifier chips on the right, hairline rule beneath,
// staggered reveal on load. Theme is inherited from `.topic-abstract` via
// `topic-styles.css`; no per-component dark-mode hook.

export function DrillShell({
  title,
  subtitle,
  questionIndex,
  total,
  correct,
  attempted,
  referenceCardId,
  children,
}: DrillShellProps) {
  const accPct =
    attempted === 0 ? 0 : Math.round((correct / attempted) * 100);

  // Pull the drill identifier ("D1", "D2", etc.) off the title prefix for
  // the eyebrow chip; fall back to "Drill" if the title shape changes.
  const eyebrowId = title.match(/^([DT]\d+)/)?.[1] ?? "Drill";
  const eyebrowName = title.replace(/^[DT]\d+\s*·\s*/, "");

  return (
    <div className="drill-shell mx-auto max-w-3xl px-5 py-10 md:px-12 md:py-16">
      <header className="codex-reveal-stack flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="codex-eyebrow">{eyebrowId} · Codex drill</p>
          <h1 className="codex-display mt-2 text-3xl md:text-4xl leading-tight">
            {eyebrowName}
          </h1>
          {subtitle ? (
            <p
              className="codex-marginalia mt-2 max-w-xl"
              style={{ fontStyle: "normal" }}
            >
              {subtitle}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span className="codex-chip">
            {Math.min(questionIndex + 1, total)} / {total}
          </span>
          <span
            className="codex-chip"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Accuracy ${accPct} percent, ${correct} of ${attempted} correct`}
          >
            {accPct}% · {correct}/{attempted}
          </span>
        </div>
      </header>

      <hr className="codex-rule" />

      <main className="codex-reveal-stack">{children}</main>

      {referenceCardId ? (
        <footer className="mt-10 border-t border-border/50 pt-4">
          <p className="codex-marginalia" style={{ fontStyle: "normal" }}>
            Need a refresher?{" "}
            <Link
              className="underline decoration-primary/40 underline-offset-4 hover:decoration-primary"
              to={`/topics/abstract/reference/${referenceCardId}`}
            >
              Open the reference card
            </Link>
            .
          </p>
        </footer>
      ) : null}
    </div>
  );
}
