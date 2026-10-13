import * as React from "react";
import { formatSectionMinutes } from "@/lib/sectionDirections";
import "@/pages/section-directions.css";

interface CardProps {
  /** Section number as printed on the test: "Section 2". */
  sectionNumber: number;
  /** Minutes on the clock, or null for an untimed section. */
  minutes: number | null;
  questionCount: number;
  /** The official directions text, verbatim. */
  directions: string;
}

/**
 * LawHub's directions card: the section number, the clock, the question count
 * and the official directions on a white card. Shown before the section on
 * its own page, and again mid-section whenever the student presses Directions.
 */
export function SectionDirectionsCard({
  sectionNumber,
  minutes,
  questionCount,
  directions,
}: CardProps) {
  return (
    <div className="section-directions-card">
      <h1 className="section-directions-title">Section {sectionNumber}</h1>
      <p className="section-directions-line">
        {minutes === null
          ? "Untimed section"
          : `Total Section Time - ${formatSectionMinutes(minutes)}`}
      </p>
      <p className="section-directions-line">
        {questionCount} Question{questionCount === 1 ? "" : "s"}
      </p>
      <p className="section-directions-body">
        <strong>Directions:</strong> {directions}
      </p>
    </div>
  );
}

interface ViewProps extends CardProps {
  /** Pre-formatted clock, e.g. "29:22". Empty when the section is untimed. */
  timerLabel: string;
  /** Paint the clock as overrun. */
  timerOverBudget?: boolean;
  /** Back to the question the student left. */
  onBackToQuestions: () => void;
}

/**
 * The directions screen as LawHub shows it *during* a section: a Questions
 * button top-left where Directions used to be, the clock still counting
 * top-right, the card on the blue-grey field, and GO TO QUESTIONS underneath.
 *
 * Nothing here touches the timer. Reading the directions mid-section costs
 * exactly what it costs on test day.
 */
export function SectionDirectionsView({
  timerLabel,
  timerOverBudget,
  onBackToQuestions,
  ...card
}: ViewProps) {
  const paddedTimer = timerLabel.replace(/^(\d):/, "0$1:");
  return (
    <div className="section-directions-view" data-testid="section-directions-view">
      <div className="section-directions-bar">
        <button
          type="button"
          className="section-directions-questions"
          onClick={onBackToQuestions}
        >
          Questions
        </button>
        {timerLabel && (
          <div className="section-directions-clock">
            <span className="section-directions-clock-label">Time Remaining</span>
            <span
              role="timer"
              className={
                timerOverBudget
                  ? "section-directions-clock-time section-directions-clock-time--over"
                  : "section-directions-clock-time"
              }
            >
              {paddedTimer}
            </span>
          </div>
        )}
      </div>
      <div className="section-directions section-directions--embedded">
        <SectionDirectionsCard {...card} />
        <button
          type="button"
          className="section-directions-go"
          onClick={onBackToQuestions}
        >
          GO TO QUESTIONS
        </button>
      </div>
    </div>
  );
}
