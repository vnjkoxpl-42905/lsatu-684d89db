import { type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useDrillDarkMode } from "../hooks/useAbstractDrill";

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

// Self-contained drill chrome. Inherits dark-mode lifecycle. Footer surfaces a
// link to a reference card for the indicator/verb taxonomy if relevant.

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
  useDrillDarkMode();
  const accPct =
    attempted === 0 ? 0 : Math.round((correct / attempted) * 100);

  return (
    <div className="drill-shell mx-auto max-w-3xl space-y-5 p-4 md:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <span
            className="rounded-full bg-secondary px-3 py-1 text-xs"
            aria-label={`Question ${Math.min(questionIndex + 1, total)} of ${total}`}
          >
            {Math.min(questionIndex + 1, total)} / {total}
          </span>
          <span
            className="rounded-full bg-secondary px-3 py-1 text-xs"
            role="status"
            aria-live="polite"
            aria-atomic="true"
            aria-label={`Accuracy ${accPct} percent, ${correct} of ${attempted} correct`}
          >
            {accPct}% ({correct}/{attempted})
          </span>
        </div>
      </header>
      <main>{children}</main>
      {referenceCardId ? (
        <footer className="text-xs text-muted-foreground">
          Need a refresher?{" "}
          <Link
            className="underline"
            to={`/topics/abstract/reference/${referenceCardId}`}
          >
            Open the reference card
          </Link>
          .
        </footer>
      ) : null}
    </div>
  );
}
