import type { CoachSource } from "../hooks/activityCoachRequest";
import { useEffect, useRef, useState } from "react";
import { useActivityCoach } from "../hooks/useActivityCoach";
import type { ActivityCoach, ActivityItem, CoachVerdict, FeedbackState, ItemFormat, JudgeSource, Verdict } from "../api/types";
import { MAX_ATTEMPTS } from "../api/types";
import { clearDraft, saveDraft } from "../drafts";
import type { PaperDiagramChoice } from "../worlds/switchyard/diagramChoices";
import { StatementPanel } from "./StatementPanel";
import { ItemPrompt } from "./ItemPrompt";

interface ActivityItemViewProps {
  item: ActivityItem;
  activitySlug?: string;
  format: ItemFormat;
  isLast: boolean;
  /** This Activity's judging brief, threaded through to the Coach. */
  coach?: ActivityCoach;
  coachSource?: CoachSource;
  /** Authored per Activity: what this drill asks the student to write. */
  answerLabel?: string;
  answerPlaceholder?: string;
  /** Authored per Activity: what the credited answers after the first are called. */
  creditedSecondaryLabel?: string;
  /** True when the Activity's world already shows the prompt as written. */
  promptInWorld?: boolean;
  /**
   * The world's local check for an answer the author already wrote down. When
   * it returns true the item is correct, decided here, with no model call and
   * no spinner. Absent for Activities whose answers have no authored structure,
   * which then judge exactly as they did before.
   */
  fastPath?: (item: ActivityItem, response: string) => boolean;
  /** A world's authoritative local judge. When present, the Coach is never called. */
  localJudge?: (item: ActivityItem, response: string) => CoachVerdict;
  /** Paper-first, deterministic choices supplied by the Conditional Rephrase world. */
  paperChoices?: PaperDiagramChoice[];
  diagramSeconds?: number;
  paperDeadline?: string;
  phaseLabel?: string;
  paperReady?: boolean;
  onPaperReady?: () => void;
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
  /**
   * Where to cache what they are typing, before it is ever submitted. Until
   * now text only reached storage as part of a submitted attempt, so closing
   * the tab mid-sentence on question 24 lost the sentence.
   */
  draftKey?: string;
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
  activitySlug,
  format,
  isLast,
  coachSource,
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
  initialAttempts = 0,
  initialValue = "",
  draftKey,
  onResolved,
  onRecord,
  onNext,
}: ActivityItemViewProps) {
  const { judge, judging } = useActivityCoach();
  // A saved free-text draft from the former version is not one of the five
  // diagrams. Ignore it instead of enabling Check with no option selected.
  const [value, setValue] = useState(() =>
    paperChoices?.length && !paperChoices.some((choice) => choice.id === initialValue)
      ? ""
      : initialValue,
  );
  const answerRef = useRef<HTMLTextAreaElement | null>(null);

  // Debounced rather than per-keystroke: a draft is not durable state and does
  // not deserve a write on every character.
  useEffect(() => {
    if (!draftKey || paperChoices?.length) return;
    const t = setTimeout(() => saveDraft(draftKey, value), 400);
    return () => clearTimeout(t);
  }, [draftKey, paperChoices, value]);
  const [attempts, setAttempts] = useState(initialAttempts);
  const [result, setResult] = useState<{ verdict: FeedbackState; feedback: string; covered?: number[] } | null>(null);
  const [retrying, setRetrying] = useState(false);
  const isRelationship = !!item.answer_key || /^Rung\s+\d/i.test(item.category ?? "");
  const [coachError, setCoachError] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [resolved, setResolved] = useState(false);

  const record = (args: Parameters<ActivityItemViewProps["onRecord"]>[0]) => {
    // The attempt is the durable record now; the draft has done its job.
    if (draftKey) clearDraft(draftKey);
    void onRecord(args);
  };

  const resolve = (finalVerdict: Verdict | null, reveal: boolean) => {
    setRevealed(reveal);
    setResolved(true);
    onResolved(item.order, finalVerdict);
  };

  const handleSubmit = async () => {
    setCoachError(null);
    const attemptNo = attempts + 1;
    const startedAt = performance.now();
    const since = () => Math.round(performance.now() - startedAt);

    // Conditional Rephrase records the diagram the student says is on their
    // paper. The option already carries its formal verdict, so there is no
    // prose interpretation and no possible Coach call.
    if (paperChoices?.length) {
      const choice = paperChoices.find((candidate) => candidate.id === value);
      if (!choice) return;
      const verdict = { verdict: choice.verdict, feedback: choice.feedback };
      setAttempts(attemptNo);
      setRetrying(false);
      setResult(verdict);
      record({
        itemOrder: item.order,
        responseText: choice.responseText,
        verdict: choice.verdict,
        attemptNo,
        judgeSource: "fast-path",
        shadowFault: shadowFault?.(item, choice.responseText) ?? null,
        latencyMs: since(),
      });
      if (choice.verdict === "correct") {
        resolve("correct", false);
      } else if (attemptNo >= MAX_ATTEMPTS) {
        resolve(choice.verdict, true);
      }
      return;
    }

    // Some Activities describe a closed formal system that can be judged
    // locally. Conditional Rephrase is one: direction, polarity, clause
    // coverage and the contrapositive are all checkable against the authored
    // routing. A local judge is authoritative, including when it says partial
    // or incorrect, so this branch never spends an AI call.
    if (localJudge) {
      const verdict = localJudge(item, value);
      setAttempts(attemptNo);
      setRetrying(false);
      setResult(verdict);
      record({
        itemOrder: item.order,
        responseText: value,
        verdict: verdict.verdict,
        attemptNo,
        judgeSource: "fast-path",
        shadowFault: shadowFault?.(item, value) ?? null,
        latencyMs: since(),
      });
      if (verdict.verdict === "correct") {
        resolve("correct", false);
      } else if (attemptNo >= MAX_ATTEMPTS) {
        resolve(verdict.verdict, true);
      }
      return;
    }

    // The author already wrote this answer down, so recognising it needs no
    // model. Only an exact structural match against a credited answer takes
    // this path, which is why it can be trusted: it confirms the answer key
    // rather than reasoning about it. Everything else falls through and is
    // judged exactly as before.
    if (fastPath?.(item, value)) {
      setAttempts(attemptNo);
      setRetrying(false);
      setResult({ verdict: "correct", feedback: "" });
      record({
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

    const res = await judge({ item, studentResponse: value, attemptNo, source: coachSource });
    if (res.discarded) return;
    if (!res.ok || !res.verdict) {
      setCoachError("Coach has not confirmed a judgment. Submit again to retry your response, or continue without a judgment.");
      return;
    }
    setAttempts(attemptNo);

    const verdict = res.verdict.verdict;
    setRetrying(false);
    setResult(res.verdict);
    record({
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

  /** Keep the last hint beside a Spot revision without selecting the response. */
  const handleRetry = () => {
    if (isRelationship) setRetrying(true);
    else setResult(null);
    requestAnimationFrame(() => {
      const box = answerRef.current;
      if (!box) return;
      box.focus();
      if (!isRelationship) box.select();
    });
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
    // "unchecked" is not a verdict and must not be written to the log as one.
    const shown = result?.verdict;
    const verdict = shown && shown !== "unchecked" ? shown : null;
    record({
      itemOrder: item.order,
      responseText: paperChoices?.find((choice) => choice.id === value)?.responseText ?? value,
      verdict,
      attemptNo: Math.max(attempts + 1, MAX_ATTEMPTS),
    });
    resolve(verdict, true);
  };

  const continueUnjudged = () => {
    if (!coachError || judging || resolved) return;
    record({ itemOrder: item.order, responseText: value, verdict: null, attemptNo: attempts + 1, judgeSource: "fallback" });
    setAttempts(attempts + 1);
    setCoachError(null);
    setResult({ verdict: "unchecked", feedback: "" });
    resolve(null, true);
  };

  return (
    <div className="space-y-5">
      <StatementPanel
        item={item}
        showQuestionType={attempts > 0}
        showPrompt={!promptInWorld && !(paperChoices?.length && diagramSeconds && diagramSeconds > 0)}
      />
      {coachError && !resolved && <div role="alert" className="rounded-xl border border-border bg-card p-4 text-card-foreground">
        <p>{coachError}</p>
        <button type="button" disabled={judging} className="mt-3 min-h-11 underline" onClick={continueUnjudged}>Continue unjudged and show answer</button>
      </div>}
      <ItemPrompt
        activitySlug={activitySlug}
        format={format}
        item={item}
        value={value}
        onChange={(next) => { setCoachError(null); setValue(next); }}
        onSubmit={handleSubmit}
        answerRef={answerRef}
        onRetry={handleRetry}
        onShowAnswer={handleShowAnswer}
        onNext={onNext}
        judging={judging}
        retrying={retrying}
        attempts={attempts}
        result={result}
        revealed={revealed}
        resolved={resolved}
        isLast={isLast}
        answerLabel={answerLabel}
        answerPlaceholder={answerPlaceholder}
        creditedSecondaryLabel={creditedSecondaryLabel}
        paperChoices={paperChoices}
        diagramSeconds={diagramSeconds}
        paperDeadline={paperDeadline}
        phaseLabel={phaseLabel}
        paperReady={paperReady}
        onPaperReady={onPaperReady}
      />
    </div>
  );
}
