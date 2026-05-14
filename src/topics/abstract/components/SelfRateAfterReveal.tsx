// SelfRateAfterReveal: the canonical "rate your own translation" primitive
// for any reveal-after drill (D4 reverse-engineer, D5 definition, D7 free-text,
// D8 stem translation). Free-form drills have no objective correctness, so
// the drill grades nothing automatically. The student rates their own attempt
// after seeing the walkthrough, and that rating drives the persisted result.
//
// Mapping to drill.recordAttempt:
//   - "again" → correct: false (self-report: I missed this)
//   - "good"  → correct: true  (self-report: I got it)
//   - "easy"  → correct: true  (self-report: I got it cleanly)
//
// Rating buttons use --state-again / --state-easy so they read as a
// self-report, not a wrong-vs-right verdict. Matches the FlashcardDeck
// rating semantics.

export type SelfRateChoice = "again" | "good" | "easy";

export interface SelfRateAfterRevealProps {
  onRate: (rating: SelfRateChoice) => void;
  disabled?: boolean;
  prompt?: string;
}

export function SelfRateAfterReveal({
  onRate,
  disabled = false,
  prompt = "How did your translation go?",
}: SelfRateAfterRevealProps) {
  return (
    <div
      className="rounded-md border border-border bg-card/40 p-3"
      aria-label="Self-rate your attempt"
    >
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {prompt}
      </p>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onRate("again")}
          disabled={disabled}
          className="min-h-11 min-w-11 rounded-md border border-state-again/60 px-3 py-1 text-sm text-state-again disabled:opacity-40"
        >
          Again
        </button>
        <button
          type="button"
          onClick={() => onRate("good")}
          disabled={disabled}
          className="min-h-11 min-w-11 rounded-md border border-border px-3 py-1 text-sm disabled:opacity-40"
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => onRate("easy")}
          disabled={disabled}
          className="min-h-11 min-w-11 rounded-md border border-state-easy/60 px-3 py-1 text-sm text-state-easy disabled:opacity-40"
        >
          Easy
        </button>
      </div>
    </div>
  );
}
