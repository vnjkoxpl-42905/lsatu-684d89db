import type { ActivityCoach, ActivityItem, CoachVerdict, ItemFormat, JudgeSource, Verdict } from "../api/types";
import type { PaperDiagramChoice } from "../worlds/switchyard/diagramChoices";
import { ActivityItemView } from "./ActivityItemView";

interface ActivityQuestionStackProps {
  items: ActivityItem[];
  format: ItemFormat;
  /** This Activity's judging brief, threaded through to the Coach. */
  coach?: ActivityCoach;
  /** Authored per Activity: what this drill asks the student to write. */
  answerLabel?: string;
  answerPlaceholder?: string;
  /** Authored per Activity: what the credited answers after the first are called. */
  creditedSecondaryLabel?: string;
  /** True when the Activity's world already shows the prompt as written. */
  promptInWorld?: boolean;
  /** The world's local check for an answer the author already wrote down. */
  fastPath?: (item: ActivityItem, response: string) => boolean;
  /** A world's authoritative deterministic judge. */
  localJudge?: (item: ActivityItem, response: string) => CoachVerdict;
  /** Builds the five paper-diagram choices for the active item. */
  paperChoices?: (item: ActivityItem) => PaperDiagramChoice[];
  diagramSeconds?: number;
  paperDeadline?: string;
  phaseLabel?: string;
  paperReady?: boolean;
  onPaperReady?: () => void;
  /** The world's structural read of the answer, recorded as telemetry only. */
  shadowFault?: (item: ActivityItem, response: string) => string | null;
  activeIndex: number;
  showQuestionNumber?: boolean;
  /** Attempts already spent on the ACTIVE item in an earlier sitting. */
  resumeAttempts?: number;
  /** What the student had written on the active item when they left. */
  resumeValue?: string;
  /** Where to cache what they are typing before it is submitted. */
  draftKeyFor?: (itemOrder: number) => string;
  onResolved: (order: number, finalVerdict: Verdict | null) => void;
  onRecord: (args: {
    itemOrder: number;
    responseText: string;
    verdict: Verdict | null;
    attemptNo: number;
    judgeSource?: JudgeSource;
    shadowFault?: string | null;
    latencyMs?: number;
  }) => Promise<void>;
  onNext: () => void;
}

/** Single-question page. Advancing swaps the active item instead of showing a preview stack. */
export function ActivityQuestionStack({
  items,
  format,
  coach,
  answerLabel,
  answerPlaceholder,
  creditedSecondaryLabel,
  promptInWorld = false,
  fastPath,
  localJudge,
  paperChoices,
  diagramSeconds,
  paperDeadline,
  phaseLabel,
  paperReady,
  onPaperReady,
  shadowFault,
  activeIndex,
  showQuestionNumber = true,
  resumeAttempts = 0,
  resumeValue = "",
  draftKeyFor,
  onResolved,
  onRecord,
  onNext,
}: ActivityQuestionStackProps) {
  const activeItem = items[activeIndex];

  if (!activeItem) return null;

  return (
    /* Centring the card in a full-screen flex box is right beside the world on
       a wide screen and wrong beneath it on a phone, where it added ~700px of
       empty space above the question. Below md the card starts where the band
       ends. */
    <div className="flex items-start px-5 py-6 md:min-h-screen md:items-center md:px-12 md:py-12">
      <section
        key={activeItem.order}
        aria-current="step"
        className="ac-question-card w-full"
      >
        {showQuestionNumber && <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--aw-eyebrow,var(--ac-emerald-strong)))]">
          Question {activeIndex + 1}
        </div>}

        <div className="mt-4">
          <ActivityItemView
            key={activeItem.order}
            item={activeItem}
            format={format}
            coach={coach}
            answerLabel={answerLabel}
            answerPlaceholder={answerPlaceholder}
            creditedSecondaryLabel={creditedSecondaryLabel}
            promptInWorld={promptInWorld}
            fastPath={fastPath}
            localJudge={localJudge}
            paperChoices={paperChoices?.(activeItem)}
            diagramSeconds={diagramSeconds}
            paperDeadline={paperDeadline}
            phaseLabel={phaseLabel}
            paperReady={paperReady}
            onPaperReady={onPaperReady}
            shadowFault={shadowFault}
            initialAttempts={resumeAttempts}
            initialValue={resumeValue}
            draftKey={draftKeyFor?.(activeItem.order)}
            isLast={activeIndex === items.length - 1}
            onResolved={onResolved}
            onRecord={onRecord}
            onNext={onNext}
          />
        </div>
      </section>
    </div>
  );
}
