import * as React from "react";
import { AnnotationLayer } from "@/components/journal/entry/AnnotationLayer";
import { cleanAnswerChoice, stripDataArtifacts } from "@/lib/questionText";
import type { LRQuestion } from "@/lib/questionLoader";
import type { AnnotationStroke } from "@/lib/wajNotesService";

type JournalQuestionViewProps = {
  question: LRQuestion;
  chosenAnswer: string | null;
  questionSummary: string;
  wrongReasoning: string;
  correctReasoning: string;
  annotateActive: boolean;
  annotations: AnnotationStroke[];
  onAnnotationsChange: (strokes: AnnotationStroke[]) => void;
  onChooseWrong: (key: string) => void;
};

function ReasoningCallout({
  tone,
  label,
  text,
}: {
  tone: "wrong" | "correct";
  label: string;
  text: string;
}) {
  if (!text.trim()) return null;
  return (
    <div
      className={`classroom-journal-reasoning classroom-journal-reasoning-${tone}`}
    >
      <b>{label}</b>
      <p>{text}</p>
    </div>
  );
}

export function JournalQuestionView({
  question,
  chosenAnswer,
  questionSummary,
  wrongReasoning,
  correctReasoning,
  annotateActive,
  annotations,
  onAnnotationsChange,
  onChooseWrong,
}: JournalQuestionViewProps) {
  const correctAnswer = question.correctAnswer;
  const chosenIsWrong =
    !!chosenAnswer && chosenAnswer.toUpperCase() !== correctAnswer.toUpperCase();
  const needsWrongAnswer = !!wrongReasoning.trim() && !chosenIsWrong;
  const answers = Object.entries(question.answerChoices).map(([key, text]) => [
    key,
    cleanAnswerChoice(key, String(text)),
  ]);

  return (
    <div className="classroom-journal-question-scroll">
      <div className="classroom-journal-question-content">
        <AnnotationLayer
          active={annotateActive}
          strokes={annotations}
          onChange={onAnnotationsChange}
        />

        <div className="classroom-journal-stimulus">
          {stripDataArtifacts(question.stimulus ?? "")}
        </div>

        {questionSummary.trim() ? (
          <div className="classroom-journal-summary">
            <b>Your question summary</b>
            <p>{questionSummary}</p>
          </div>
        ) : null}

        <div className="classroom-journal-stem">
          <b>{question.qnum}.</b>
          <p>{stripDataArtifacts(question.questionStem)}</p>
        </div>

        {needsWrongAnswer ? (
          <p className="classroom-journal-answer-nudge">
            Click the answer you chose below to attach your wrong reasoning to
            it.
          </p>
        ) : null}

        <ol className="classroom-journal-choices">
          {answers.map(([key, text]) => {
            const isCorrect = key === correctAnswer;
            const isChosenWrong = chosenIsWrong && key === chosenAnswer;
            return (
              <li key={key}>
                <button
                  type="button"
                  className={`classroom-journal-choice${
                    isCorrect ? " classroom-journal-choice-correct" : ""
                  }${
                    isChosenWrong
                      ? " classroom-journal-choice-wrong"
                      : ""
                  }`}
                  disabled={isCorrect}
                  aria-pressed={!isCorrect ? isChosenWrong : undefined}
                  onClick={!isCorrect ? () => onChooseWrong(key) : undefined}
                >
                  <i>{key}</i>
                  <span>{text}</span>
                  {/*
                    The correct row has always carried a word; the wrong row did
                    not, so the student's own pick was identified by crimson fill
                    alone. Correct-green and incorrect-rose sit at OKLab dE 5.7
                    under deuteranopia — below the floor of 8 — and this surface
                    renders the two adjacent, which is the worst case for it.
                    See docs/chart-palette.md §3.
                  */}
                  {isCorrect ? <em>Correct</em> : null}
                  {isChosenWrong ? <em>You chose</em> : null}
                </button>
                {isChosenWrong ? (
                  <ReasoningCallout
                    tone="wrong"
                    label="Your wrong reasoning"
                    text={wrongReasoning}
                  />
                ) : null}
                {isCorrect ? (
                  <ReasoningCallout
                    tone="correct"
                    label="Your correct reasoning"
                    text={correctReasoning}
                  />
                ) : null}
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
