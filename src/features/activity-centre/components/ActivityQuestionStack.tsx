import type { ActivityCoach, ActivityItem, ItemFormat, JudgeSource, Verdict } from "../api/types";
import { ActivityItemView } from "./ActivityItemView";

interface ActivityQuestionStackProps {
  items: ActivityItem[];
  format: ItemFormat;
  /** This Activity's judging brief, threaded through to the Coach. */
  coach?: ActivityCoach;
  /** Authored per Activity: what this drill asks the student to write. */
  answerLabel?: string;
  answerPlaceholder?: string;
  /** True when the Activity's world already shows the prompt as written. */
  promptInWorld?: boolean;
  /** The world's local check for an answer the author already wrote down. */
  fastPath?: (item: ActivityItem, response: string) => boolean;
  /** The world's structural read of the answer, recorded as telemetry only. */
  shadowFault?: (item: ActivityItem, response: string) => string | null;
  activeIndex: number;
  /** Attempts already spent on the ACTIVE item in an earlier sitting. */
  resumeAttempts?: number;
  /** What the student had written on the active item when they left. */
  resumeValue?: string;
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
  promptInWorld = false,
  fastPath,
  shadowFault,
  activeIndex,
  resumeAttempts = 0,
  resumeValue = "",
  onResolved,
  onRecord,
  onNext,
}: ActivityQuestionStackProps) {
  const activeItem = items[activeIndex];

  if (!activeItem) return null;

  return (
    <div className="flex min-h-screen items-center px-5 py-10 md:px-12 md:py-12">
      <section
        key={activeItem.order}
        aria-current="step"
        className="ac-question-card w-full"
      >
        <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--aw-eyebrow,var(--ac-emerald-strong)))]">
          Question {activeIndex + 1}
        </div>

        <div className="mt-4">
          <ActivityItemView
            key={activeItem.order}
            item={activeItem}
            format={format}
            coach={coach}
            answerLabel={answerLabel}
            answerPlaceholder={answerPlaceholder}
            promptInWorld={promptInWorld}
            fastPath={fastPath}
            shadowFault={shadowFault}
            initialAttempts={resumeAttempts}
            initialValue={resumeValue}
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
