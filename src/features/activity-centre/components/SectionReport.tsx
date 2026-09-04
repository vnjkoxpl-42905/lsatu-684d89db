import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { getSectionGrade, requestSectionGrading } from "../api/activitiesClient";
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
  const [grade, setGrade] = useState<SectionGrade | null>(null);
  const [stillWaiting, setStillWaiting] = useState(false);
  const startedAt = useRef(Date.now());

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let askedAgain = false;

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

      const waited = Date.now() - startedAt.current;
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
  }, [assignmentId]);

  if (grade) return <SectionReportCard grade={grade} onDone={onDone} />;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="rounded-[28px] border border-border bg-[hsl(var(--ac-surface))] p-8 text-center shadow-[0_2px_24px_rgba(30,24,16,0.06)] md:p-12">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
          Section finished
        </p>
        <p className="ac-display mt-3 text-4xl text-foreground">
          {stillWaiting ? "Still being marked" : "Marking your run"}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          {stillWaiting
            ? "This one is taking longer than usual. Your run is saved and your Report Card will be here when you come back to it."
            : "Your recording is being read back against every detail. This takes a minute."}
        </p>
        {onDone && (
          <div className="mt-8">
            <Button variant={stillWaiting ? "default" : "outline"} onClick={onDone}>
              Done
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
