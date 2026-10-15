import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  getSectionGrade,
  requestSectionGrading,
  startSectionFocusAttempt,
} from "../api/activitiesClient";
import type { SectionGrade } from "../api/types";
import { SectionReportCard } from "./SectionReportCard";

/**
 * The wait between finishing a section and seeing the Report Card.
 *
 * Grading is a post-section job: one transcription of ~25 minutes of audio plus
 * one judgement call per stimulus, run server-side after she stops. It does not
 * finish inside the request that ends the section, and it must not be tied to
 * this tab staying open.
 *
 * So this polls for the grade rather than waiting on a response. The ABSENCE of
 * a row is the pending signal (ADR 0019): there is no status column to trust,
 * and none she could set herself. If it never arrives, the honest thing to show
 * is that it is still being marked, not an error and certainly not a zero. The
 * sweeper picks up anything this tab missed.
 */

const POLL_MS = 4000;
/** After this, stop asking and tell her it is still being marked. */
const GIVE_UP_MS = 3 * 60 * 1000;
/**
 * How long to wait before asking for the grade a second time.
 *
 * The runner already asked once, fire and forget, and that ask can be lost: the
 * tab closed before it left, the network dropped, the function was cold. One
 * repeat after a decent wait recovers all three.
 *
 * The wait has to be longer than a grading actually takes. At 20 seconds the
 * repeat arrived while the first grading was still transcribing, nothing was on
 * record yet, and both ran to the end: two transcriptions, two sets of verdicts
 * on the same audio, and a card that showed the first while the database kept
 * the second. A real section grades in one to three minutes. The grader now
 * also refuses to start while another grading of the same Attempt is running,
 * so a repeat that does land early costs one request rather than a second
 * grading; this wait is what keeps that from being the ordinary path.
 */
const RETRY_ASK_MS = 120000;

interface SectionReportProps {
  assignmentId: string;
  onDone?: () => void;
}

export function SectionReport({ assignmentId, onDone }: SectionReportProps) {
  const navigate = useNavigate();
  const [grade, setGrade] = useState<SectionGrade | null>(null);
  const [stillWaiting, setStillWaiting] = useState(false);
  /**
   * Bumped by "Check again", which restarts the effect and so starts a fresh
   * give-up window. Before this, giving up was terminal: the screen stopped
   * asking for ever and the only way to find out was to leave and come back,
   * which is a thing she had to guess at.
   */
  const [round, setRound] = useState(0);
  const startedAt = useRef(Date.now());
  /** Minutes since she finished, for a wait that says how long it has been. */
  const [waitedMs, setWaitedMs] = useState(0);

  useEffect(() => {
    if (grade) return;
    const tick = setInterval(() => setWaitedMs(Date.now() - startedAt.current), 10000);
    return () => clearInterval(tick);
  }, [grade]);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let askedAgain = false;
    /*
     * Measured per round, not from the first paint, so a "Check again" gets a
     * full window rather than giving up on its first tick.
     */
    const roundStartedAt = Date.now();

    const poll = async () => {
      try {
        const found = await getSectionGrade(assignmentId);
        if (cancelled) return;
        if (found) {
          setGrade(found);
          return;
        }
      } catch {
        // A failed read is not a failed run. Keep waiting; the row either
        // arrives or the give-up copy takes over.
      }
      if (cancelled) return;

      const waited = Date.now() - roundStartedAt;
      if (!askedAgain && waited > RETRY_ASK_MS) {
        // Ask once more. Losing the first ask is the likeliest way a finished
        // run ends up with no Report Card, and it is the one failure this
        // screen is in a position to repair by itself.
        askedAgain = true;
        void requestSectionGrading(assignmentId);
      }
      if (waited > GIVE_UP_MS) {
        setStillWaiting(true);
        return;
      }
      timer = setTimeout(poll, POLL_MS);
    };

    void poll();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [assignmentId, round]);

  if (grade)
    return (
      <SectionReportCard
        grade={grade}
        onDone={onDone}
        onStartFocusSet={async (slugs) => {
          // A fresh Attempt built server-side from this run's weakest stimuli,
          // entered straight into the runner the way the library enters it.
          const id = await startSectionFocusAttempt(assignmentId, slugs);
          navigate(`/activities/${id}`, { state: { startSection: true } });
        }}
      />
    );

  /** Whole minutes, for a sentence rather than a counter she watches. */
  const minutesWaited = Math.floor(waitedMs / 60000);

  /*
   * The wait is the card's first page, not the shell's last one.
   *
   * It used to be an Activity Centre panel: the Centre's cream surface, the
   * Centre's border and its muted ink, sitting on the violet ground the report
   * phase paints for the Report Card. So the ten seconds after twenty-five
   * unbroken minutes crossed three grounds -- the runner's indigo, a warm
   * cream panel, then the card -- and the last thing she saw before being told
   * how it went was a colour that belonged to neither surface. Inside `.rc` it
   * is the same violet-cast white the card is, on the same ground, and the
   * card replacing it is a change of content rather than a change of place.
   *
   * `.rc` is what paints `--rc-page`, so the rounding and the border sit on
   * that same element: a square page-coloured box behind a rounded border
   * would show its corners over the violet ground.
   */
  return (
    <div className="rc mx-auto max-w-2xl overflow-hidden rounded-[28px] border border-[var(--rc-hairline)] shadow-[0_2px_24px_rgba(30,24,16,0.06)]">
      <div className="p-8 text-center md:p-12">
        <p className="rc__label">Section finished</p>
        {/*
          * One live region over both states.
          *
          * The heading and the sentence both change without a page load, and
          * neither was announced: a screen reader user was left on "Marking
          * your run" with no way to know it had become "Still being marked",
          * or that the card had arrived. `aria-live` sits on the wrapper so the
          * pair is read as one update rather than two.
          */}
        <div role="status" aria-live="polite">
          <p className="rc__display mt-3 text-[34px] text-[var(--rc-ink)]">
            {stillWaiting ? "Still being marked" : "Marking your run"}
          </p>
          <p className="mt-4 text-sm leading-relaxed text-[var(--rc-ink-muted)]">
            {stillWaiting
              ? `This one has been marking for ${minutesWaited} minutes, which is longer than it should take. The marking carries on whether or not you stay on this page, and your Report Card will be on this section in the Activity Centre when it lands.`
              : "Your recording is being read back against every detail. That usually takes one to three minutes."}
          </p>
        </div>
        {/*
          * Past the give-up, two real actions.
          *
          * There used to be one button, "Done", and giving up was terminal:
          * the screen stopped asking, said her card would be there "when you
          * come back to it", and gave her nothing to come back with. "Check
          * again" restarts the polling and the ask; the other button says
          * where it goes.
          */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {stillWaiting && (
            <Button
              onClick={() => {
                setStillWaiting(false);
                setRound((n) => n + 1);
              }}
            >
              Check again
            </Button>
          )}
          {onDone && (
            <Button variant="outline" onClick={onDone}>
              Back to the Activity Centre
            </Button>
          )}
        </div>
        {/*
          * What to do if it never lands, and the one thing she cannot supply.
          *
          * Said as a sentence rather than a "Tell Joshua" button on purpose. A
          * button has to be gated on `has_chat_access`, or it hands a student
          * without Messages a second dead end; reading that flag means mounting
          * `useUserPermissions`, which redirects on a lost session, into the
          * one screen whose whole job is to stay put while a grade lands. The
          * run id is the part she could not produce herself, and it costs
          * nothing to give her.
          */}
        {stillWaiting && (
          <p className="mt-4 text-xs text-[var(--rc-ink-faint)]">
            If it is still here tomorrow, tell Joshua and quote this run:{" "}
            <code>{assignmentId}</code>.
          </p>
        )}
      </div>
    </div>
  );
}
