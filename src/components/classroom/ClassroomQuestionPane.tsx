/**
 * ClassroomQuestionPane — a read-only question embedded in the Classroom's
 * reading column.
 *
 * Deliberately not JournalQuestionPane: that one always paints the correct
 * choice green and is `h-full` with its own internal scroll, both of which are
 * wrong here. A flagged question is something the student may still want to
 * re-attempt, so the answer stays hidden until they ask for it.
 *
 * No question state is written from this pane. It renders and nothing else.
 */
import * as React from "react";
import type { LRQuestion } from "@/lib/questionLoader";
import { cleanAnswerChoice, stripDataArtifacts } from "@/lib/questionText";

const CHOICE_KEYS = ["A", "B", "C", "D", "E"] as const;

export function ClassroomQuestionPane({ question }: { question: LRQuestion }) {
  const [revealed, setRevealed] = React.useState(false);

  // A different question means a fresh, unrevealed read.
  React.useEffect(() => {
    setRevealed(false);
  }, [question.qid]);

  const stimulus = question.stimulus
    ? stripDataArtifacts(question.stimulus)
    : "";
  const stem = stripDataArtifacts(question.questionStem ?? "");

  return (
    <section className="classroom-question">
      {stimulus ? <p className="classroom-question-stimulus">{stimulus}</p> : null}
      {stem ? <p className="classroom-question-stem">{stem}</p> : null}

      <ol className="classroom-choices">
        {CHOICE_KEYS.map((key) => {
          const raw = question.answerChoices?.[key];
          if (!raw) return null;
          const isCorrect = revealed && question.correctAnswer === key;
          return (
            <li
              key={key}
              className={`classroom-choice${isCorrect ? " classroom-choice-correct" : ""}`}
            >
              <i aria-hidden="true">{key}</i>
              <span>{cleanAnswerChoice(key, raw)}</span>
            </li>
          );
        })}
      </ol>

      {revealed ? (
        <p className="classroom-question-answer">
          Correct answer: {question.correctAnswer}
        </p>
      ) : (
        <button
          type="button"
          className="classroom-button"
          onClick={() => setRevealed(true)}
        >
          Show the answer
        </button>
      )}
    </section>
  );
}
