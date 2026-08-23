import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useActivityCoach } from "../hooks/useActivityCoach";
import type { ActivityCoach, ActivityItem, CoachVerdict, ItemFormat, JudgeSource, Verdict } from "../api/types";
import { MAX_ATTEMPTS } from "../api/types";
import { StatementPanel } from "./StatementPanel";
import { ItemPrompt } from "./ItemPrompt";

interface ActivityItemViewProps {
  item: ActivityItem;
  format: ItemFormat;
  isLast: boolean;
  /** This Activity's judging brief, threaded through to the Coach. */
  coach?: ActivityCoach;
  /** Authored per Activity: what this drill asks the student to write. */
  answerLabel?: string;
  answerPlaceholder?: string;
  /** True when the Activity's world already shows the prompt as written. */
  promptInWorld?: boolean;
  /**
   * The world's local check for an answer the author already wrote down. When
   * it returns true the item is correct, decided here, with no model call and
   * no spinner. Absent for Activities whose answers have no authored structure,
   * which then judge exactly as they did before.
   */
  fastPath?: (item: ActivityItem, response: string) => boolean;
  /** The world's structural read of the answer, recorded as telemetry only. */
  shadowFault?: (item: ActivityItem, response: string) => string | null;
  /**
   * Attempts already spent on this item in an earlier sitting, replayed from
   * the attempt log. Zero for an item being met for the first time. The next
   * submit continues the numbering rather than restarting it, so the student
   * neither gets a spent attempt back nor writes a duplicate `attempt_no`.
   */
  initialAttempts?: number;
  /** What they had written when they left, so a half-typed answer survives. */
  initialValue?: string;
  /** Fired once, when the item is resolved (correct, revealed, or coach failure). */
  onResolved: (order: number, finalVerdict: Verdict | null) => void;
  /** Append-only attempt record; best-effort, errors are toasted not thrown. */
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

/**
 * Per-item state machine: submit -> coach verdict -> (retry up to cap) ->
 * reveal credited answer -> next. Owns its own state; the runner remounts it
 * per item via a key so state resets cleanly.
 */
export function ActivityItemView({
  item,
  format,
  isLast,
  coach,
  answerLabel,
  answerPlaceholder,
  promptInWorld = false,
  fastPath,
  shadowFault,
  initialAttempts = 0,
  initialValue = "",
  onResolved,
  onRecord,
  onNext,
}: ActivityItemViewProps) {
  const { judge, judging } = useActivityCoach();
  const [value, setValue] = useState(initialValue);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [result, setResult] = useState<CoachVerdict | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [resolved, setResolved] = useState(false);

  const resolve = (finalVerdict: Verdict | null, reveal: boolean) => {
    setRevealed(reveal);
    setResolved(true);
    onResolved(item.order, finalVerdict);
  };

  const handleSubmit = async () => {
    const attemptNo = attempts + 1;
    const startedAt = performance.now();
    const since = () => Math.round(performance.now() - startedAt);

    // The author already wrote this answer down, so recognising it needs no
    // model. Only an exact structural match against a credited answer takes
    // this path, which is why it can be trusted: it confirms the answer key
    // rather than reasoning about it. Everything else falls through and is
    // judged exactly as before.
    if (fastPath?.(item, value)) {
      setAttempts(attemptNo);
      setResult({ verdict: "correct", feedback: "" });
      void onRecord({
        itemOrder: item.order,
        responseText: value,
        verdict: "correct",
        attemptNo,
        judgeSource: "fast-path",
        shadowFault: shadowFault?.(item, value) ?? null,
        latencyMs: since(),
      });
      resolve("correct", false);
      return;
    }

    const res = await judge({ item, studentResponse: value, attemptNo, coach });
    setAttempts(attemptNo);

    if (!res.ok || !res.verdict) {
      // Coach failed: surface it, record the attempt with no verdict, and fall
      // back to revealing the credited answer so the student is never stuck.
      toast({
        title: "Coach unavailable",
        description: "Showing the credited answer so you can keep moving.",
        variant: "destructive",
      });
      void onRecord({
        itemOrder: item.order,
        responseText: value,
        verdict: null,
        attemptNo,
        judgeSource: "fallback",
        shadowFault: shadowFault?.(item, value) ?? null,
        latencyMs: since(),
      });
      setResult({ verdict: "incorrect", feedback: "" });
      resolve(null, true);
      return;
    }

    const verdict = res.verdict.verdict;
    setResult(res.verdict);
    void onRecord({
      itemOrder: item.order,
      responseText: value,
      verdict,
      attemptNo,
      judgeSource: "coach",
      shadowFault: shadowFault?.(item, value) ?? null,
      latencyMs: since(),
    });

    if (verdict === "correct") {
      resolve("correct", false);
    } else if (attemptNo >= MAX_ATTEMPTS) {
      resolve(verdict, true);
    }
    // else: leave unresolved so the Try again / Show answer affordances show.
  };

  const handleRetry = () => {
    setResult(null);
    setValue("");
  };

  /**
   * Bailing out to the credited answer ends the item, so the log has to say so.
   * It used to write nothing: the replay then saw one sub-cap attempt, called
   * the item unresolved, and served it again on the next sitting as though the
   * student had never reached it. The row is written at the attempt cap, which
   * is what "I am done with this one" means to the replay, and carries the
   * verdict they actually earned so the score is unchanged.
   */
  const handleShowAnswer = () => {
    const verdict = result?.verdict ?? null;
    void onRecord({
      itemOrder: item.order,
      responseText: value,
      verdict,
      attemptNo: Math.max(attempts + 1, MAX_ATTEMPTS),
    });
    resolve(verdict, true);
  };

  return (
    <div className="space-y-5">
      <StatementPanel
        item={item}
        showQuestionType={attempts > 0}
        showPrompt={!promptInWorld}
      />
      <ItemPrompt
        format={format}
        item={item}
        value={value}
        onChange={setValue}
        onSubmit={handleSubmit}
        onRetry={handleRetry}
        onShowAnswer={handleShowAnswer}
        onNext={onNext}
        judging={judging}
        attempts={attempts}
        result={result}
        revealed={revealed}
        resolved={resolved}
        isLast={isLast}
        answerLabel={answerLabel}
        answerPlaceholder={answerPlaceholder}
      />
    </div>
  );
}
