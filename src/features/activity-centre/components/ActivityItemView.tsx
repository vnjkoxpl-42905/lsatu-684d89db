import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import { useActivityCoach } from "../hooks/useActivityCoach";
import type { ActivityItem, CoachVerdict, ItemFormat, Verdict } from "../api/types";
import { MAX_ATTEMPTS } from "../api/types";
import { StatementPanel } from "./StatementPanel";
import { ItemPrompt } from "./ItemPrompt";

interface ActivityItemViewProps {
  item: ActivityItem;
  format: ItemFormat;
  isLast: boolean;
  /** Fired once, when the item is resolved (correct, revealed, or coach failure). */
  onResolved: (order: number, finalVerdict: Verdict | null) => void;
  /** Append-only attempt record; best-effort, errors are toasted not thrown. */
  onRecord: (args: {
    itemOrder: number;
    responseText: string;
    verdict: Verdict | null;
    attemptNo: number;
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
  onResolved,
  onRecord,
  onNext,
}: ActivityItemViewProps) {
  const { judge, judging } = useActivityCoach();
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
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
    const res = await judge({ item, studentResponse: value, attemptNo });
    setAttempts(attemptNo);

    if (!res.ok || !res.verdict) {
      // Coach failed: surface it, record the attempt with no verdict, and fall
      // back to revealing the credited answer so the student is never stuck.
      toast({
        title: "Coach unavailable",
        description: "Showing the credited answer so you can keep moving.",
        variant: "destructive",
      });
      void onRecord({ itemOrder: item.order, responseText: value, verdict: null, attemptNo });
      setResult({ verdict: "incorrect", feedback: "" });
      resolve(null, true);
      return;
    }

    const verdict = res.verdict.verdict;
    setResult(res.verdict);
    void onRecord({ itemOrder: item.order, responseText: value, verdict, attemptNo });

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

  const handleShowAnswer = () => {
    resolve(result?.verdict ?? null, true);
  };

  return (
    <div className="grid gap-5 md:grid-cols-2">
      <StatementPanel item={item} />
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
      />
    </div>
  );
}
