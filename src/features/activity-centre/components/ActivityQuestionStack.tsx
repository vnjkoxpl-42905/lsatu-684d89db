import { useEffect, useRef } from "react";
import type { ActivityItem, CoachVerdict, ItemFormat, Verdict } from "../api/types";
import { ActivityItemView } from "./ActivityItemView";

interface ActivityQuestionStackProps {
  items: ActivityItem[];
  format: ItemFormat;
  activeIndex: number;
  verdicts: Record<number, Verdict | null>;
  responses: Record<number, string>;
  onResolved: (order: number, finalVerdict: Verdict | null) => void;
  onRecord: (args: {
    itemOrder: number;
    responseText: string;
    verdict: Verdict | null;
    attemptNo: number;
  }) => Promise<void>;
  onNext: () => void;
}

/**
 * Vertical scrolling stack of question cards. The active card is fully
 * interactive; resolved cards show the locked-in response; upcoming cards
 * preview the statement at low opacity (mirrors the reference video).
 */
export function ActivityQuestionStack({
  items,
  format,
  activeIndex,
  verdicts,
  responses,
  onResolved,
  onRecord,
  onNext,
}: ActivityQuestionStackProps) {
  const refs = useRef<Array<HTMLDivElement | null>>([]);

  useEffect(() => {
    const node = refs.current[activeIndex];
    if (node) {
      node.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [activeIndex]);

  return (
    <div className="flex flex-col gap-12 px-5 py-10 md:gap-16 md:px-12 md:py-20">
      {items.map((item, i) => {
        const state: "done" | "active" | "upcoming" =
          i < activeIndex ? "done" : i === activeIndex ? "active" : "upcoming";

        return (
          <section
            key={item.order}
            ref={(el) => {
              refs.current[i] = el;
            }}
            aria-current={state === "active" ? "step" : undefined}
            className={
              "ac-question-card transition-opacity duration-500 " +
              (state === "active"
                ? "opacity-100"
                : state === "done"
                  ? "opacity-60"
                  : "pointer-events-none select-none opacity-35")
            }
          >
            <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[hsl(var(--ac-emerald-strong))]">
              Question {i + 1}
            </div>

            {state === "active" ? (
              <div className="mt-4">
                <ActivityItemView
                  key={item.order}
                  item={item}
                  format={format}
                  isLast={i === items.length - 1}
                  onResolved={onResolved}
                  onRecord={onRecord}
                  onNext={onNext}
                />
              </div>
            ) : (
              <UpcomingOrDonePreview
                item={item}
                response={responses[item.order]}
                verdict={verdicts[item.order]}
                done={state === "done"}
              />
            )}
          </section>
        );
      })}
    </div>
  );
}

function UpcomingOrDonePreview({
  item,
  response,
  verdict,
  done,
}: {
  item: ActivityItem;
  response?: string;
  verdict?: Verdict | null;
  done: boolean;
}) {
  return (
    <div className="mt-4 rounded-[20px] border border-border bg-card/60 p-6 md:p-8">
      {item.category && (
        <span className="inline-flex w-fit items-center rounded-full bg-[hsl(var(--muted))] px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {item.category}
        </span>
      )}
      <p className="ac-display mt-3 text-xl leading-snug text-foreground md:text-[26px]">
        {item.prompt}
      </p>

      {done && response && (
        <div className="mt-5 border-t border-border pt-4">
          <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Your answer
            {verdict && (
              <span
                className={
                  "ml-2 rounded-full px-2 py-0.5 text-[10px] " +
                  (verdict === "correct"
                    ? "bg-[hsl(var(--ac-emerald)/0.15)] text-[hsl(var(--ac-emerald-strong))]"
                    : verdict === "partial"
                      ? "bg-amber-100 text-amber-800"
                      : "bg-red-100 text-red-700")
                }
              >
                {verdict}
              </span>
            )}
          </div>
          <p className="mt-2 text-[15px] leading-relaxed text-foreground/80">{response}</p>
        </div>
      )}
    </div>
  );
}
