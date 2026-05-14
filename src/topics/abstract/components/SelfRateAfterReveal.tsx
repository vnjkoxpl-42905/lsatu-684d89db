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
// Rendered in the Codex idiom: italic serif stamp buttons in oxblood (Again)
// and ink-forest (Easy) with neutral ink for Good. Hover inverts to a filled
// stamp with a -1deg rotation.

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
      className="codex-card-soft p-4 md:p-5"
      aria-label="Self-rate your attempt"
    >
      <p className="codex-eyebrow">{prompt}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => onRate("again")}
          disabled={disabled}
          className="codex-stamp-btn min-h-11 min-w-11 text-state-incorrect"
          style={{ color: "hsl(var(--primary))" }}
        >
          Again
        </button>
        <button
          type="button"
          onClick={() => onRate("good")}
          disabled={disabled}
          className="codex-stamp-btn min-h-11 min-w-11"
          style={{ color: "hsl(var(--foreground))" }}
        >
          Good
        </button>
        <button
          type="button"
          onClick={() => onRate("easy")}
          disabled={disabled}
          className="codex-stamp-btn min-h-11 min-w-11"
          style={{ color: "hsl(150 36% 28%)" }}
        >
          Easy
        </button>
      </div>
    </div>
  );
}
