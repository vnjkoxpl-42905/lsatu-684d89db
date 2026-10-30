import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { questionBank } from "@/lib/questionLoader";
import { isReleasedAnswer } from "@/lib/firstAnswerProgress";
import type { HistoryAnswer } from "@/lib/firstAnswerDetails";
import type { PrototypeModel } from "./model";
import { questionLabel } from "./model";
type Dimension = "reasoning" | "features" | "difficulty";
/** Tags supplement the same first-answer ledger, without querying or mixing retries. */
export default function ProgressDeeperAnalysis({
  model,
  openQuestion,
}: {
  model: PrototypeModel;
  openQuestion: (answer: HistoryAnswer) => void;
}) {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(questionBank.isReady());
  const [failed, setFailed] = useState(false);
  const [dimension, setDimension] = useState<Dimension>("reasoning");
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    if (!open || ready) return;
    let active = true;
    void questionBank
      .load()
      .then(() => {
        if (active) {
          setReady(true);
          setFailed(false);
        }
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [open, ready]);
  const first = model.history.filter(
    (row) => row.area === "LR" && row.isFirst && isReleasedAnswer(row),
  );
  const { rows, unmatched } = useMemo(() => {
    const groups = new Map<string, HistoryAnswer[]>();
    let unmatched = 0;
    if (ready)
      for (const answer of first) {
        const question = questionBank.getQuestion(
          answer.questionKey.replace(/^LR:/, ""),
        );
        const labels = question
          ? dimension === "reasoning"
            ? (question.reasoningType ?? [])
            : dimension === "features"
              ? (question.questionFeatures ?? [])
              : typeof question.difficulty === "number" &&
                  question.difficulty > 0
                ? [`Level ${question.difficulty}`]
                : []
          : [];
        if (!labels.length) {
          unmatched++;
          continue;
        }
        for (const label of new Set(labels))
          groups.set(label, [...(groups.get(label) ?? []), answer]);
      }
    return {
      rows: [...groups]
        .map(([label, answers]) => ({
          label,
          answers,
          correct: answers.filter((row) => row.correct === true).length,
        }))
        .sort(
          (a, b) =>
            b.answers.length - b.correct - (a.answers.length - a.correct) ||
            b.answers.length - a.answers.length ||
            a.label.localeCompare(b.label),
        ),
      unmatched,
    };
  }, [model.history, dimension, ready]);
  const current = rows.find((row) => row.label === selected);
  return (
    <details
      className="pp-deeper pp-panel"
      open={open}
      onToggle={(event) => setOpen(event.currentTarget.open)}
    >
      <summary>
        <span>
          <strong>Look closer at Logical Reasoning</strong>
          <small>Reasoning, features and difficulty</small>
        </span>
        <ChevronDown size={18} aria-hidden="true" />
      </summary>
      {open && (
        <div className="pp-deeper-content">
          <p className="pp-footnote">
            Released first answers only, in this period. Question-bank tags
            describe the question, not a diagnosis of your skills. A question
            can have several tags, so rows overlap.
          </p>
          <label className="pp-select-label">
            Group by
            <select
              aria-label="Deeper analysis dimension"
              value={dimension}
              onChange={(event) => {
                setDimension(event.target.value as Dimension);
                setSelected(null);
              }}
            >
              <option value="reasoning">Reasoning</option>
              <option value="features">Question features</option>
              <option value="difficulty">Difficulty</option>
            </select>
          </label>
          {model.areaPartial.LR || model.areaUnavailable.LR ? (
            <p className="pp-empty">
              Complete LR sources are needed for this analysis.
            </p>
          ) : failed ? (
            <p role="alert" className="pp-empty">
              Question tags could not be loaded. Your answer history is still
              available.
            </p>
          ) : !ready ? (
            <p role="status" className="pp-empty">
              Loading question tags…
            </p>
          ) : (
            <>
              <p className="pp-footnote">
                {first.length} released first answers.{" "}
                {unmatched > 0
                  ? `${unmatched} have no matching saved question or tag in this dimension.`
                  : "All have matching tags."}
              </p>
              <ul className="pp-deeper-rows">
                {rows.map((row) => (
                  <li key={row.label}>
                    <button
                      type="button"
                      aria-pressed={selected === row.label}
                      onClick={() =>
                        setSelected(selected === row.label ? null : row.label)
                      }
                    >
                      <span>
                        {row.label}
                        <small>
                          {row.correct} correct of {row.answers.length} first
                          answers
                        </small>
                      </span>
                      <span className="pp-deeper-value">
                        {row.answers.length < 3
                          ? "Small sample"
                          : `${Math.round((100 * row.correct) / row.answers.length)}%`}
                        <i aria-hidden="true">
                          <b
                            style={{
                              width: `${(100 * row.correct) / row.answers.length}%`,
                            }}
                          />
                        </i>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              {!rows.length && (
                <p className="pp-empty">
                  No tagged first answers in this period.
                </p>
              )}
              {current && (
                <section
                  className="pp-bucket-detail"
                  aria-label="Deeper analysis evidence"
                >
                  <h3>{current.label}</h3>
                  <ul className="pp-evidence-list">
                    {current.answers.map((answer) => (
                      <li key={answer.attemptId}>
                        <button
                          type="button"
                          className="pp-evidence-row"
                          onClick={() => openQuestion(answer)}
                        >
                          <span>
                            <strong>{questionLabel(answer.questionKey)}</strong>
                            <small>
                              {answer.correct ? "Correct" : "Missed"} first
                              answer
                            </small>
                          </span>
                          <span>Inspect</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </>
          )}
        </div>
      )}
    </details>
  );
}
