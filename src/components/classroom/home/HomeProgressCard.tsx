import * as React from "react";
import { useStrengthsWeaknesses, type StrengthsResult } from "@/hooks/useStrengthsWeaknesses";
import {
  MIN_TYPE_ANSWERS,
  PRACTICE_COUNT,
  practiceTypePath,
  typeEvidencePath,
  type TypeResult,
} from "@/lib/strengthsWeaknesses";

const MAX_BARS = 5;

type Band = "strength" | "steady" | "weakness";

/**
 * Home's analytics: first-answer accuracy by LR question type, as bars she can
 * click. Each bar opens the exact questions behind it on Progress. Reads only.
 * Mounted only for students with analytics access, so a locked student never sees it.
 */
export function HomeProgressCard({ onOpen }: { onOpen: (route: string) => void }) {
  return <HomeProgressCardView result={useStrengthsWeaknesses()} onOpen={onOpen} />;
}

/** The card with its data handed in, so it can be previewed and tested without a student account. */
export function HomeProgressCardView({ result, onOpen }: { result: StrengthsResult; onOpen: (route: string) => void }) {
  const { status, summary, overall, refresh } = result;
  const { strengths, weaknesses, steady, building, recommended, withheld, totalAnswers } = summary;

  const bars = React.useMemo(() => {
    const all: Array<TypeResult & { band: Band }> = [
      ...weaknesses.map((row) => ({ ...row, band: "weakness" as const })),
      ...steady.map((row) => ({ ...row, band: "steady" as const })),
      ...strengths.map((row) => ({ ...row, band: "strength" as const })),
    ];
    return all.sort((a, b) => a.percent - b.percent || b.denominator - a.denominator).slice(0, MAX_BARS);
  }, [strengths, steady, weaknesses]);

  return (
    <section
      className="classroom-home-region classroom-home-insights"
      aria-label="Your progress"
      data-home-reveal
    >
      <header className="classroom-home-region-head">
        <h2>Your progress</h2>
        <button
          type="button"
          className="classroom-home-region-action classroom-home-link"
          onClick={() => onOpen("/review/progress")}
        >
          Details
        </button>
      </header>

      {status === "loading" ? (
        <p className="classroom-home-state" role="status">Loading your answers…</p>
      ) : status === "error" ? (
        <p className="classroom-home-state" role="alert">
          Your progress could not be loaded.{" "}
          <button type="button" className="classroom-home-link" onClick={refresh}>Try again</button>
        </p>
      ) : status === "denied" ? null : withheld ? (
        <p className="classroom-home-state">
          Some saved answers could not be checked, so no graph is shown right now.
        </p>
      ) : totalAnswers === 0 ? (
        <p className="classroom-home-state">
          Finish a drill and your graph appears here. Smart Drill starts general, then tunes to your answers.
        </p>
      ) : (
        <>
          {overall.percent !== null ? (
            <p className="classroom-home-insights-overall">
              <strong>{overall.percent}%</strong> of first answers right
              <span> · {overall.correct} of {overall.denominator}</span>
            </p>
          ) : (
            <p className="classroom-home-insights-overall">
              <strong>{totalAnswers}</strong> first {totalAnswers === 1 ? "answer" : "answers"} so far
            </p>
          )}

          {bars.length > 0 ? (
            <ul className="classroom-home-bars" aria-label="First-answer accuracy by question type">
              {bars.map((row) => (
                <li key={row.topic}>
                  <button
                    type="button"
                    className="classroom-home-bar"
                    data-band={row.band}
                    onClick={() => onOpen(typeEvidencePath(row.topic))}
                    aria-label={`${row.topic}: ${row.percent} percent, ${row.correct} of ${row.denominator} first answers right. Open the questions.`}
                  >
                    <span className="classroom-home-bar-name">{row.topic}</span>
                    <span className="classroom-home-bar-track" aria-hidden="true">
                      <span className="classroom-home-bar-fill" style={{ width: `${row.percent}%` }} />
                    </span>
                    <span className="classroom-home-bar-value">{row.percent}%</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="classroom-home-state">
              A type needs {MIN_TYPE_ANSWERS} first answers before it gets a bar.
              {building.length > 0
                ? ` So far: ${building.slice(0, 3).map((row) => `${row.topic} ${row.correct} of ${row.denominator}`).join(", ")}.`
                : ""}
            </p>
          )}

          {recommended ? (
            <button
              type="button"
              className="classroom-home-insights-next"
              onClick={() => onOpen(practiceTypePath(recommended.topic, "/classroom"))}
            >
              <span>Practise next</span>
              <strong>{recommended.topic} · {PRACTICE_COUNT} questions</strong>
            </button>
          ) : null}

          <footer className="classroom-home-region-foot">
            <button type="button" className="classroom-home-link" onClick={() => onOpen("/review/strengths")}>
              Strengths and weaknesses
            </button>
          </footer>
        </>
      )}
    </section>
  );
}

export default HomeProgressCard;
