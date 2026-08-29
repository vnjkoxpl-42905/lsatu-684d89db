import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { ActivityCoach } from "../api/types";
import { RecallStage } from "./RecallStage";
import { useRecallCoach } from "./useRecallCoach";
import { useRecallSpeech } from "./useRecallSpeech";
import { PROMPTS } from "./speech";
import type { OrbMood } from "./orb";
import {
  advance,
  buildSession,
  scoreRecall,
  startSession,
  type RecallScore,
  type RecallSession,
  type SessionEvent,
  type SessionState,
} from "./session";
import "./recall.css";

/**
 * A Read, Recall, Colour run.
 *
 * RRC is a runner rather than a world
 * (`docs/adr/0009-read-recall-colour-is-a-runner-not-a-world.md`): it replaces
 * the whole running screen instead of one column of it, because there is no
 * typed answer to sit beside and the unit she answers is a chunk rather than an
 * item.
 *
 * This component is the wiring. The session decides what she is asked and what
 * it is worth (`session.ts`); the gate decides when the microphone may run
 * (`speech.ts`); both are tested without a browser. What is here is the order
 * they are called in and what gets written down.
 */

export interface RecallRunnerProps {
  assignmentId: string;
  studentId: string;
  item: unknown;
  itemOrder: number;
  coach?: ActivityCoach;
  onComplete?: () => void;
}

interface Capture {
  score?: RecallScore;
  transcript?: string;
}

export function RecallRunner({
  assignmentId,
  studentId,
  item,
  itemOrder,
  coach,
  onComplete,
}: RecallRunnerProps) {
  const session = useMemo(() => buildSession(item), [item]);
  if (!session) return <RecallUnavailable reason="This activity's content could not be read." />;
  return (
    <RunnerBody
      session={session}
      assignmentId={assignmentId}
      studentId={studentId}
      itemOrder={itemOrder}
      coach={coach}
      onComplete={onComplete}
    />
  );
}

function RunnerBody({
  session,
  assignmentId,
  studentId,
  itemOrder,
  coach,
  onComplete,
}: {
  session: RecallSession;
} & Omit<RecallRunnerProps, "item">) {
  const [state, dispatch] = useReducer(
    (s: SessionState, e: SessionEvent) => advance(session, s, e),
    session,
    startSession,
  );
  const [capture, setCapture] = useState<Capture>({});
  const speech = useRecallSpeech();
  const { judgeRecall, judging } = useRecallCoach();
  const step = session.steps[state.step];
  const startedAt = useRef<number>(Date.now());
  const spokenFor = useRef<string>("");
  // Held in a ref so a parent that re-creates this callback every render does
  // not re-fire the completion effect.
  const onDone = useRef(onComplete);
  onDone.current = onComplete;

  const persist = useCallback(
    async (stage: string, transcript: string, score?: RecallScore) => {
      // Append-only, one row per capture, exactly like the typed path. `verdict`
      // stays null: a recall is not correct or incorrect, it is a set of
      // details that did or did not survive.
      const { error } = await supabase.from("activity_item_responses").insert({
        assignment_id: assignmentId,
        student_id: studentId,
        item_order: itemOrder,
        response_text: transcript,
        attempt_no: 1,
        rrc: {
          chunk_n: step.through,
          stage,
          covers: step.covers,
          transcript,
          // Absent stays absent. Writing an empty array here would record
          // "nothing survived" for an answer nobody judged.
          covered: score?.judged
            ? step.details.filter((d) => !score.missed.some((m) => m.n === d.n)).map((d) => d.n)
            : null,
          total_details: step.details.length,
          longest_run: score?.longestRun ?? null,
          overlap: score?.overlap ?? null,
          elapsed_ms: Date.now() - startedAt.current,
        },
      });
      if (error) console.error("[rrc] could not record a capture", error);
    },
    [assignmentId, studentId, itemOrder, step],
  );

  /**
   * Everything the capture effect needs, read at the moment it fires.
   *
   * That effect keys on the transcript alone, because it must run exactly once
   * per capture and no more. Listing `step`, `state.phase` and the callbacks as
   * dependencies would re-run it on renders where nothing was captured;
   * omitting them without this would let it act on a step it has already left.
   * The ref is the honest way to have both.
   */
  const live = useRef({ state, step, coach, persist, judgeRecall });
  live.current = { state, step, coach, persist, judgeRecall };

  const say = speech.say;

  // Speak the prompt for whatever she is being asked now, once per phase, and
  // start listening the moment the utterance ends. The gate is what guarantees
  // the microphone is not already running while the orb talks.
  useEffect(() => {
    if (state.phase !== "recall" && state.phase !== "colour") return;
    const key = `${state.step}:${state.phase}`;
    if (spokenFor.current === key) return;
    spokenFor.current = key;
    startedAt.current = Date.now();
    const line =
      state.phase === "colour"
        ? PROMPTS.colour
        : step.kind === "cumulative"
          ? PROMPTS.cumulative
          : step.kind === "the-read"
            ? PROMPTS.theRead
            : PROMPTS.recall;
    say(line, true);
  }, [state.step, state.phase, step.kind, say]);

  // A capture landed. Which stage it belongs to decides what happens to it, and
  // the colour is the one that is stored and never judged.
  useEffect(() => {
    const transcript = speech.transcript;
    if (!transcript) return;
    const { state: now, step: current, coach: brief, persist: write, judgeRecall: judge } = live.current;

    if (now.phase === "colour") {
      void write("colour", transcript);
      dispatch({ type: "colour-captured", transcript });
      return;
    }
    if (now.phase !== "recall") return;

    if (current.kind === "the-read") {
      void write("the-read", transcript);
      dispatch({ type: "recall-captured", transcript });
      return;
    }

    let cancelled = false;
    void (async () => {
      const judgement = await judge(current, transcript, brief);
      if (cancelled) return;
      const score = scoreRecall(current, transcript, judgement.covered);
      setCapture({ score, transcript });
      await write(current.kind === "cumulative" ? "cumulative" : "recall", transcript, score);
      dispatch({ type: "recall-captured", transcript });
    })();
    return () => {
      // She left the step, or the component went away, before the Coach
      // answered. The capture is already written down; what is dropped is only
      // the feedback for a screen nobody is looking at.
      cancelled = true;
    };
  }, [speech.transcript]);

  const stopSpeech = speech.stop;
  const finished = state.phase === "complete";
  useEffect(() => {
    if (!finished) return;
    stopSpeech();
    onDone.current?.();
  }, [finished, stopSpeech]);

  // Leaving mid-run must release the microphone and silence the orb, whether she
  // exited, navigated away, or the tab closed the component.
  useEffect(() => () => stopSpeech(), [stopSpeech]);

  /**
   * What the orb is doing. It is never replaced by a spinner: the wait between
   * her finishing and the feedback arriving happens dozens of times a session,
   * and a loading state appearing on that beat would be a small ugly thing
   * arriving in rhythm. The same object just does something different.
   */
  const mood: OrbMood =
    speech.phase === "speaking"
      ? "speaking"
      : speech.phase === "listening"
        ? "listening"
        : judging || speech.phase === "settling"
          ? "working"
          : "idle";

  if (state.phase === "complete") {
    return <RecallComplete onDone={onDone.current} />;
  }

  return (
    <RecallStage
      step={step}
      phase={state.phase}
      stepNumber={state.step + 1}
      totalSteps={session.steps.length}
      mood={mood}
      level={speech.level}
      score={state.phase === "feedback" ? capture.score : undefined}
      transcript={state.phase === "feedback" ? capture.transcript : undefined}
      spoken={speech.supported}
      error={speech.error}
      onExit={onDone.current}
      onReadDone={() => dispatch({ type: "read-done" })}
      onHold={speech.hold}
      onRelease={speech.release}
      onFeedbackDone={() => {
        setCapture({});
        dispatch({ type: "feedback-done" });
      }}
    />
  );
}

function RecallComplete({ onDone }: { onDone?: () => void }) {
  return (
    <section className="ac-recall" data-phase="complete">
      <h2>That is the set.</h2>
      <p>Your recalls are saved. Joshua can see how they went.</p>
      {/* Only when there is somewhere to go. `handleBackToIntro` is undefined
          when the runner is embedded rather than routed, and a Done button that
          does nothing is worse than no button. */}
      {onDone && (
        <button type="button" className="ac-recall-primary" onClick={onDone}>
          Done
        </button>
      )}
    </section>
  );
}

function RecallUnavailable({ reason }: { reason: string }) {
  return (
    <section className="ac-recall" data-phase="unavailable">
      <p>{reason}</p>
    </section>
  );
}

export default RecallRunner;
