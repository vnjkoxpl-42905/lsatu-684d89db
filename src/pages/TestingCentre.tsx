import { SectionProgressStepper } from "@/components/ui/section-progress-stepper";
import { TimedWorkClient, type TimedObject } from "@/lib/timedWorkClient";
import * as DialogPrimitive from "@radix-ui/react-dialog";
/**
 * The Testing Centre.
 *
 * Two doors, and only two: sit one real section, or sit a full practice test.
 * Both are things you do under a clock with nothing revealed until the end,
 * which is what separates this room from Drill next door — drilling is practice
 * you stop and think inside, and a sitting is not. Keeping them apart is the
 * whole reason this is its own rail entry: nobody should start a 35:00 clock
 * while looking for a ten-question warm-up.
 *
 * Neither door owns a question runner. The section door hands off to
 * SectionSelector, which this page is the only consumer of; the practice-test
 * door hands off to the same two runners, one leg at a time.
 */
import * as React from "react";
import { parseWorkIdentity, withWorkIdentity } from '@/lib/studentWorkIdentity';
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowUpRight, Dice5, Loader2, MousePointer2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { supabase } from "@/integrations/supabase/client";
import { useUserSettings } from "@/contexts/UserSettingsContext";
import { SectionSelector } from "@/components/drill/SectionSelector";
import { AccommodationNote } from "@/components/drill/SectionTimingPicker";
import { PrepTestCombobox } from "@/components/testing/PrepTestCombobox";
import { loadAllIndexPassages } from "@/features/rc/lib/rcBank";
import { buildRcSections, type RcSection } from "@/features/rc/lib/rcSections";
import {
  buildPracticeTests,
  formatPracticeTestClock,
  legLabel,
  practiceTestPaces,
  practiceTestSectionSeconds,
  practiceTestRaw,
  practiceTestScaled,
  type PracticeTestBlueprint,
  type PracticeTestPaceId,
  type PracticeTestRun,
} from "@/lib/practiceTest";
import {
  abandonAccountPracticeTestRun,
  listAccountPracticeTestRuns,
} from "@/lib/practiceTestStore";
import { prepareOfficialPracticeTest } from '@/lib/timedPracticeTestEntry';
import { practiceTestPath } from "@/lib/practiceTestRunner";
import { PracticeExamsNav } from "./PracticeExamsNav";
import { listPracticeSectionAttempts, type PracticeSectionAttempt } from "@/lib/practiceSectionAttempts";
import "./testing-centre.css";

type Door = null | "section" | "test";

/** The panel both doors open into. Named so a door can point at it. */
const PANEL_ID = "testing-door-panel";

/**
 * How much of the panel has to be on screen before opening a door is allowed to
 * move the page. Below this the panel is a sliver at the bottom edge and the
 * click reads as a no-op; above it the student can already see what happened.
 */

/**
 * RC sections, loaded only once something needs them.
 *
 * This used to run on mount, which pulled the whole Reading Comprehension index
 * across the wire to render two buttons. Only the practice-test door needs it —
 * the section door asks SectionSelector for its own — so it waits for `enabled`.
 */
function useRcSections(enabled: boolean) {
  const [sections, setSections] = React.useState<RcSection[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    loadAllIndexPassages()
      .then((passages) => {
        if (!cancelled) setSections(buildRcSections(passages));
      })
      .catch(() => {
        if (!cancelled) setError("Reading Comprehension sections could not be loaded.");
      });
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { sections, error };
}

/**
 * A status line that assistive tech is actually told about.
 *
 * Every wait on this page used to be a plain paragraph that appeared and
 * disappeared in silence: a screen reader user pressed a door and heard
 * nothing until they went looking.
 */
function Working({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-3 py-4 text-sm"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
      {children}
    </div>
  );
}

function PracticeTestSelector({
  tests,
  onBegin,
  assignedOnly = false,
  initialPt = null,
}: {
  tests: PracticeTestBlueprint[];
  assignedOnly?: boolean;
  initialPt?: number | null;
  onBegin: (
    blueprint: PracticeTestBlueprint,
    pace: PracticeTestPaceId,
    sectionSeconds: number | null,
  ) => void;
}) {
  const [pt, setPt] = React.useState<number | null>(initialPt);
  const { settings, profileTimingStatus } = useUserSettings();
  const profileBaseMinutes =
    settings.defaultTimingMode === "52.5" ? 52.5 : settings.defaultTimingMode === "70" ? 70 : 35;
  const [explicitBaseMinutes, setExplicitBaseMinutes] = React.useState<number | null>(null);
  const [pace, setPace] = React.useState<PracticeTestPaceId>(() =>
    settings.defaultTimingMode === "unlimited" ? "untimed" : "standard",
  );
  const paceTouched = React.useRef(false);
  const checkingProfileTiming = profileTimingStatus === "loading" && !paceTouched.current;
  const activePace: PracticeTestPaceId = paceTouched.current
    ? pace
    : settings.defaultTimingMode === "unlimited" ? "untimed" : "standard";

  /**
   * The student's own standard clock, the same reading the section door takes
   * (SectionSelector's baseMinutes). Every pace here is a percentage of this,
   * so "Standard" is their normal section rather than a flat 35 minutes. This
   * door ignored the setting entirely before, which meant the same two words
   * named two different clocks in one room.
   */
  const baseMinutes = explicitBaseMinutes ?? profileBaseMinutes;
  const paces = React.useMemo(() => practiceTestPaces(baseMinutes * 60), [baseMinutes]);
  const sectionSeconds = practiceTestSectionSeconds(activePace, baseMinutes * 60);

  // The combobox orders its own rows newest-first. This page still needs the
  // blueprint behind the chosen number, for the shape table below.
  const ptOptions = React.useMemo(
    () => tests.map((t) => ({ pt: t.pt, detail: `${t.questionCount} questions` })),
    [tests],
  );
  const chosen = tests.find((t) => t.pt === pt) ?? null;
  const clock = formatPracticeTestClock(sectionSeconds);
  const beginHintId = React.useId();

  if (tests.length === 0 && assignedOnly) {
    return (
      <div className="testing-panel">
        <p className="testing-note">
          No practice test has been assigned to you yet. When Joshua assigns
          one, it will be here.
        </p>
      </div>
    );
  }

  if (tests.length === 0) {
    return (
      <div className="testing-panel">
        <p className="testing-note">
          No PrepTest in the bank currently has the two full Logical Reasoning
          sections and the full Reading Comprehension section a sitting needs.
          Single sections are still available through the other door.
        </p>
      </div>
    );
  }

  return (
    <div className="testing-panel">
      <div className="testing-field">
        <label htmlFor="testing-pt" id="testing-pt-label">
          PrepTest
        </label>
        <PrepTestCombobox
          emptyMessage="No PrepTest by that number can be sat end to end."
          id="testing-pt"
          labelId="testing-pt-label"
          onChange={setPt}
          options={ptOptions}
          value={pt}
        />
      </div>

      <div className="testing-field">
        <label htmlFor="testing-pace" id="testing-pace-label">
          Timing
        </label>
        {checkingProfileTiming ? <p className="testing-note" id={beginHintId} role="status">Checking profile timing…</p> : <><Select value={activePace} onValueChange={(v) => {
          paceTouched.current = true;
          setExplicitBaseMinutes(baseMinutes);
          setPace(v as PracticeTestPaceId);
        }}>
          <SelectTrigger
            id="testing-pace"
            aria-labelledby="testing-pace-label testing-pace"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="testing-menu">
            {paces.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
                {p.sectionSeconds === null
                  ? " · no clock"
                  : ` · ${Math.round(p.sectionSeconds / 60)} min a section`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {/* The section door has carried this since its timing control was
            built. Without it this door offered accommodations while saying
            nothing about the standing setting those percentages are taken
            from, on the longer of the two commitments. */}
        <p className="testing-note">
          {explicitBaseMinutes !== null && explicitBaseMinutes !== profileBaseMinutes
            ? 'Your selected timing is kept. New setups use your updated profile timing.'
            : <AccommodationNote baseMinutes={profileBaseMinutes} />}
        </p>
        </>}
      </div>

      {chosen && (
        <>
          <div className="testing-shape">
            {chosen.legs.map((leg, i) => (
              <div className="testing-shape-row" key={`${leg.kind}-${leg.section}`}>
                <b>Section {i + 1}</b>
                <span>{legLabel(leg as never)}</span>
                <em>
                  {leg.questionCount} questions
                  {!checkingProfileTiming && clock ? ` · ${clock}` : ""}
                </em>
              </div>
            ))}
          </div>
          <p className="testing-note">
            {chosen.questionCount} scored questions, with a ten-minute break
            after the second section.
          </p>
          {/* The clock is read from the chosen pace rather than printed as
              35:00. It was hard-coded, which stopped being true the moment this
              door started honouring the student's own timing mode: an
              accommodated student saw 52:30 on the control and "the real 35:00"
              in the paragraph under it. The clause drops out entirely when
              there is no clock, rather than asserting a number for a sitting
              that is not being timed. */}
          {!chosen.rcFullLength && (
            <p className="testing-note">
              The Reading Comprehension section on this PrepTest runs a few
              questions short, because only questions with a published
              explanation can be drilled. All four passages are there
              {!checkingProfileTiming && clock ? ` and the clock is the real ${clock}` : ""}, so the
              reading load is unchanged. Your score is simply out of{" "}
              {chosen.questionCount} rather than the high seventies.
            </p>
          )}
        </>
      )}

      {/* Not `disabled`. A disabled button is skipped by Tab, so a keyboard
          user never meets it and never learns why the door will not open;
          and this room paints it only half a shade lighter, so a sighted
          student pressed it and got nothing. It stays focusable, says it is
          unavailable, and a press on it goes to the field that is missing.
          The line beside it names the missing field for everyone, and is a
          live region so the change is heard when the PrepTest is chosen. */}
      <div className="testing-actions">
        <Button
          aria-disabled={!chosen || checkingProfileTiming}
          aria-describedby={chosen && !checkingProfileTiming ? undefined : beginHintId}
          className="aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
          onClick={() => {
            if (checkingProfileTiming) return;
            if (chosen) {
              onBegin(chosen, activePace, sectionSeconds);
              return;
            }
            document.getElementById("testing-pt")?.focus();
          }}
        >
          Begin practice test
        </Button>
        {!checkingProfileTiming && <p className="testing-note testing-actions-hint" id={beginHintId} role="status">
          {chosen ? null : "Choose a PrepTest above to begin."}
        </p>}
      </div>
    </div>
  );
}

export function ResumeList({
  runs,
  sections,
  onResume,
  onResumeSection,
  onDiscard,
}: {
  runs: PracticeTestRun[];
  sections: PracticeSectionAttempt[];
  onResume: (run: PracticeTestRun) => void;
  onResumeSection: (href: string) => void;
  onDiscard: (run: PracticeTestRun) => void;
}) {
  // Discard marks an exam abandoned while preserving its saved account record,
  // and it did that on one click with no confirm and no undo. Below 560px
  // .testing-shape-actions goes full width, which puts it exactly where a thumb
  // lands. The confirm is inline rather than a dialog: this room has no modal,
  // and a two-option question that belongs to one row does not need one.
  const [confirming, setConfirming] = React.useState<string | null>(null);
  const keepRef = React.useRef<HTMLButtonElement | null>(null);

  // Focus the safe option, never the destructive one. A keyboard user who
  // pressed Enter on Discard would otherwise be a single Enter away from the
  // deletion this confirm exists to prevent. Moving focus is also what
  // announces the state change: the group carries the question as its name, so
  // a screen reader reads what is being asked before it reads the choice.
  React.useEffect(() => {
    if (confirming) keepRef.current?.focus();
  }, [confirming]);

  // A sitting can leave from under an open confirm (resumed in another tab,
  // cleared elsewhere). Without this the row is stuck asking about something
  // that is no longer there.
  React.useEffect(() => {
    if (confirming && !runs.some((run) => run.id === confirming)) {
      setConfirming(null);
    }
  }, [runs, confirming]);

  if (runs.length === 0 && sections.length === 0) return null;
  return (
    <div className="testing-resume">
      <h2>Unfinished exams and sections</h2>
      <div className="testing-shape">
        {runs.map((run) => {
          return (
            <div className="testing-shape-row" key={run.id}>
              <div className="testing-resume-description">
                <strong>PrepTest {run.pt} &middot; Full exam</strong>
                <small>Section {Math.min(run.currentLeg + 1, run.legs.length)} of {run.legs.length}</small>
                <SectionProgressStepper currentIndex={run.currentLeg} steps={run.legs.map((leg, index) => ({
                  label: `Section ${index + 1}`,
                  answered: leg.answered,
                  total: leg.questionCount,
                  submitted: Boolean(leg.completedAt),
                }))} />
                {run.legs[run.currentLeg]?.answered != null && !run.legs[run.currentLeg].completedAt && (
                  <small>{run.legs[run.currentLeg].answered} of {run.legs[run.currentLeg].questionCount} answered in this section</small>
                )}
              </div>
              {/* min-h-[44px] because Button's own sm size stops at 40px, and
                  the 44px floor is a defect gate here, not a preference. Both
                  carry a name saying which sitting they act on: two rows of
                  "Resume / Discard" are indistinguishable to a screen reader
                  reading the controls on their own. */}
              {confirming === run.id ? (
                <div
                  className="testing-shape-actions"
                  role="group"
                  aria-label={`Discard the unfinished PrepTest ${run.pt} exam?`}
                >
                  <span className="testing-confirm">Discard this exam?</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={() => {
                      onDiscard(run);
                      setConfirming(null);
                    }}
                    aria-label={`Yes, discard the unfinished PrepTest ${run.pt} exam`}
                  >
                    Discard
                  </Button>
                  <Button
                    ref={keepRef}
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => setConfirming(null)}
                    aria-label={`Keep the unfinished PrepTest ${run.pt} exam`}
                  >
                    Keep
                  </Button>
                </div>
              ) : (
                <div className="testing-shape-actions">
                  <Button
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => onResume(run)}
                    aria-label={`Resume PrepTest ${run.pt}`}
                  >
                    Resume
                  </Button>
                  {run.timedContractVersion == null && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="min-h-[44px]"
                      onClick={() => setConfirming(run.id)}
                      aria-label={`Discard the unfinished PrepTest ${run.pt} exam`}
                    >
                      Discard
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {sections.map((section) => (
          <div className="testing-shape-row" key={`${section.kind}-${section.id}`}>
            <div className="testing-resume-description">
              <strong>Section {section.section} &middot; {section.kind === "lr-section" ? "Logical Reasoning" : "Reading Comprehension"}</strong>
              <small>PrepTest {section.preptest} &middot; {section.answered} of {section.total} answered</small>
              {section.total > 0 && <progress aria-label={`PrepTest ${section.preptest} section ${section.section} questions answered`}
                value={section.answered} max={section.total} />}
            </div>
            <div className="testing-shape-actions">
              <Button
                size="sm"
                variant="outline"
                className="min-h-[44px]"
                onClick={() => onResumeSection(section.href)}
                aria-label={`Resume PrepTest ${section.preptest} section ${section.section}`}
              >
                Resume
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * The PrepTests this student was assigned. Only read for a student without the
 * Practice tests switch: with it, the whole bank is theirs. Without it, the
 * room holds exactly what Joshua assigned, one sitting per assignment.
 */
function useAssignedPrepTests(enabled: boolean, userId: string | undefined) {
  return useQuery<number[]>({
    queryKey: ["assigned-preptests", userId],
    enabled: enabled && !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("practice_test_assignments" as never)
        .select("pt")
        .eq("student_id", userId!)
        .neq("status", "archived");
      if (error) throw error;
      return ((data ?? []) as Array<{ pt: number }>).map((row) => row.pt);
    },
  });
}

export default function TestingCentre() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const selectedPt = Number(searchParams.get("pt")) || null;
  const { manifest, isLoading, error } = useQuestionBank();
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const assignedOnly = !permissions.loading && !permissions.is_admin && !permissions.has_practice_access;
  const { data: assignedPts } = useAssignedPrepTests(assignedOnly, user?.id);
  // An assigned-only student has one door: the sittings they were given. The
  // section door runs through Drill, which is a switch they do not have.
  const view = searchParams.get("view");
  const requestedDoor: Door = assignedOnly || selectedPt || view === "test" ? "test" : view === "section" ? "section" : null;
  const [door, setDoor] = React.useState<Door>(requestedDoor);
  React.useEffect(() => {
    setDoor(requestedDoor);
  }, [requestedDoor, selectedPt, view]);
  const { sections: rcSections, error: rcError } = useRcSections(door === "test");
  const [actionError, setActionError] = React.useState<string | null>(null);
  const runsQuery = useQuery({
    queryKey: ["practice-exam-runs", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const ownerId = user!.id;
      const savedRuns = await listAccountPracticeTestRuns(ownerId);
      return Promise.all(savedRuns.map(async (run) => {
        if (run.status !== "in-progress" || run.timedContractVersion == null) return run;
        try {
          const { parent, checkpoint } = await new TimedWorkClient(ownerId, run.id).refresh();
          if (!checkpoint || parent.current_leg !== run.currentLeg) return run;
          const record = checkpoint.record as TimedObject | undefined;
          const attempts = checkpoint.kind === "lr" ? record?.attempts : checkpoint.attempts;
          if (!Array.isArray(attempts)) return run;
          const answers = attempts.filter((attempt: TimedObject) => /^[A-E]$/.test(String(attempt.selected_answer ?? attempt.selected)));
          return {
            ...run,
            legs: run.legs.map((leg, index) => index === run.currentLeg && !leg.completedAt
              ? { ...leg, answered: Math.min(answers.length, leg.questionCount) }
              : leg),
          };
        } catch {
          // Saved runs remain resumable even if their checkpoint cannot be read.
          return run;
        }
      }));
    },
  });
  const sectionsQuery = useQuery({
    queryKey: ["practice-section-attempts", user?.id],
    enabled: !!user?.id,
    queryFn: () => listPracticeSectionAttempts(user!.id),
  });
  const runs = (runsQuery.data ?? []).filter((run) =>
    run.status === "in-progress" && (!assignedOnly || !!assignedPts?.includes(run.pt)),
  );
  const canResumeSection = permissions.is_admin || permissions.has_drill_access;
  const sections = canResumeSection
    ? (sectionsQuery.data ?? []).filter((section) => section.status === "in-progress")
    : [];

  const tests = React.useMemo(() => {
    const all = manifest && rcSections ? buildPracticeTests(manifest, rcSections) : [];
    if (!assignedOnly) return all;
    const allowed = new Set(assignedPts ?? []);
    return all.filter((t) => allowed.has(t.pt));
  }, [manifest, rcSections, assignedOnly, assignedPts]);

  const completed = [
    ...(runsQuery.data ?? []).filter((run) => run.status === "complete" && (!assignedOnly || assignedPts?.includes(run.pt))).map((run) => {
      const { correct, total } = practiceTestRaw(run);
      const raw = `${correct} of ${total} correct`;
      return {
        title: `PrepTest ${run.pt} | Full exam`,
        score: run.legs.every((leg) => leg.correct != null) ? `${practiceTestScaled(run)} estimated | ${raw}` : "Score unavailable",
        at: run.createdAt,
        href: practiceTestPath(run.id),
      };
    }),
    ...(sectionsQuery.data ?? []).filter((section) => section.status === "completed" && canResumeSection).map((section) => ({
      title: `PrepTest ${section.preptest} | ${section.kind === "lr-section" ? "LR" : "RC"} section ${section.section}`,
      score: section.correct == null ? "Score unavailable" : `${section.correct} of ${section.total} correct`,
      at: section.startedAt,
      href: section.href,
    })),
  ].sort((a, b) => b.at.localeCompare(a.at));

  const beginTest = async (
    blueprint: PracticeTestBlueprint,
    pace: PracticeTestPaceId,
    sectionSeconds: number | null,
  ) => {
    if (!user) return;
    setActionError(null);
    try {
      const runId = await prepareOfficialPracticeTest(user.id, blueprint.pt, pace, sectionSeconds);
      const identity=parseWorkIdentity(searchParams.toString());
      // Carry the requested assignment only when the student starts that PT.
      navigate(identity && blueprint.pt===selectedPt ? withWorkIdentity(practiceTestPath(runId),identity) : practiceTestPath(runId));
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "This exam is unavailable. Try again before starting.");
    }
  };

  const discard = async (run: PracticeTestRun) => {
    if (!user) return;
    setActionError(null);
    try {
      if (run.timedContractVersion != null) { navigate(practiceTestPath(run.id)); return; }
      await abandonAccountPracticeTestRun(user.id, run);
      await runsQuery.refetch();
    } catch {
      setActionError("This exam could not be discarded. It is still saved to your account.");
    }
  };

  const [selection, setSelection] = React.useState<"specific" | "random" | null>(null);
  const [randomPt, setRandomPt] = React.useState<number | null>(null);
  const [dialogHost, setDialogHost] = React.useState<HTMLDivElement | null>(null);
  const launchButton = React.useRef<HTMLButtonElement | null>(null);
  const openSetup = (next: Door, button: HTMLButtonElement) => {
    launchButton.current = button;
    setActionError(null);
    setSelection(null);
    setRandomPt(null);
    setDoor(next);
  };
  const setupSelected = Boolean(selection || selectedPt || assignedOnly);
  const eligibleTests = tests;

  return (
    <>
      <PracticeExamsNav />
      <h1 className="classroom-title">Practice Exams</h1>

      {/* The doors carry a title and two supporting lines, and those used to be
          an h2 and a p. Neither is legal inside a button — its content model is
          phrasing only — and the h2s put two headings in the outline that a
          screen reader lands on as controls. They are spans that look the same.

          aria-expanded, not aria-pressed: these are not toggle buttons, they
          disclose a panel, and aria-controls is what says which panel. */}
      <div className="testing-doors" data-motion-group>
        {!assignedOnly && (
        <button
          type="button"
          className="testing-door"
          data-motion-item
          aria-expanded={door === "section"}
          aria-controls={PANEL_ID}
          aria-haspopup="dialog"
          onClick={(event) => openSetup("section", event.currentTarget)}
        >
          <svg aria-hidden="true" className="testing-door-icon" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 6 4 10l8 4 8-4-8-4M4 14l8 4 8-4" />
          </svg>
          <span className="testing-door-title">Take a section</span>
          <ArrowUpRight className="testing-door-arrow" size={18} aria-hidden="true" />
        </button>
        )}

        <button
          type="button"
          className="testing-door"
          data-motion-item
          aria-expanded={door === "test"}
          aria-controls={PANEL_ID}
          aria-haspopup="dialog"
          onClick={(event) => openSetup("test", event.currentTarget)}
        >
          <svg aria-hidden="true" className="testing-door-icon" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4 4 8l8 4 8-4-8-4M4 12l8 4 8-4M4 16l8 4 8-4" />
          </svg>
          <span className="testing-door-title">Take a practice test</span>
          <ArrowUpRight className="testing-door-arrow" size={18} aria-hidden="true" />
        </button>
      </div>

      <div ref={setDialogHost} />
      <DialogPrimitive.Root open={Boolean(door)} onOpenChange={(open) => { if (!open) setDoor(null); }}>
        {dialogHost && <DialogPrimitive.Portal container={dialogHost}>
          <DialogPrimitive.Overlay className="testing-setup-overlay" />
          <DialogPrimitive.Content id={PANEL_ID} className="testing-setup-dialog"
            onCloseAutoFocus={(event) => {
              if (!launchButton.current) return;
              event.preventDefault();
              launchButton.current.focus();
            }}>
            <DialogPrimitive.Title>{door === "section" ? "Single section attempt" : "Full exam attempt"}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label="Close setup" className="testing-setup-close"><X size={18} /></DialogPrimitive.Close>
            <DialogPrimitive.Description className={setupSelected ? "sr-only" : "testing-setup-preference"}>
              {setupSelected ? "Review your selection and timing before starting." : "Selection preference"}
            </DialogPrimitive.Description>
            {!setupSelected && (
              <div className="testing-setup-choices">
                <button type="button" onClick={() => setSelection("specific")}>
                  <MousePointer2 size={20} aria-hidden="true" />
                  <strong>Choose specific</strong>
                  <span>Pick a {door === "section" ? "section" : "PrepTest"}.</span>
                </button>
                <button type="button" disabled={door === "test" && !eligibleTests.length}
                  onClick={() => {
                    if (door === "test") setRandomPt(eligibleTests[Math.floor(Math.random() * eligibleTests.length)].pt);
                    setSelection("random");
                  }}>
                  <Dice5 size={20} aria-hidden="true" />
                  <strong>Random</strong>
                  <span>Randomly select a {door === "section" ? "section" : "PrepTest"}.</span>
                </button>
              </div>
            )}
            {setupSelected && <div>
              {door === "section" && (
                <div className="testing-panel">
                  {isLoading && <Working>Loading questions…</Working>}
                  {!isLoading && error && <p className="testing-note">{error}</p>}
                  {!isLoading && !error && manifest && (
                    <SectionSelector
                      manifest={manifest}
                      hideStatus
                      randomizeOnOpen={selection === "random"}
                      onStartSection={(config) =>
                        navigate("/drill", {
                          state: { mode: "full-section", config, returnTo: "/practice/exams" },
                        })
                      }
                      onStartRcSection={(href) => navigate(href)}
                      onCancel={() => setDoor(null)}
                    />
                  )}
                </div>
              )}

              {door === "test" && (
                <>
                  {(isLoading || (!rcSections && !rcError)) && (
                    <div className="testing-panel">
                      <Working>Working out which PrepTests can be sat end to end…</Working>
                    </div>
                  )}
                  {!isLoading && (error || rcError) && (
                    <div className="testing-panel">
                      <p className="testing-note">{error || rcError}</p>
                    </div>
                  )}
                  {!isLoading && !error && !rcError && manifest && rcSections && (
                    <PracticeTestSelector tests={tests} onBegin={beginTest} assignedOnly={assignedOnly} initialPt={randomPt ?? selectedPt} />
                  )}
                </>
              )}
            </div>}
            {actionError && <p className="testing-note" role="alert">{actionError}</p>}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>}
      </DialogPrimitive.Root>

      {(runsQuery.isLoading || sectionsQuery.isLoading) && <Working>Loading your unfinished work…</Working>}
      {runsQuery.isError && <p className="testing-note" role="alert">Your saved exams could not be loaded. Refresh to try again.</p>}
      {sectionsQuery.isError && <p className="testing-note" role="alert">Your saved sections could not be loaded. Refresh to try again.</p>}
      <ResumeList
        runs={runs}
        sections={sections}
        onResume={(run) => navigate(practiceTestPath(run.id))}
        onResumeSection={(href) => navigate(href)}
        onDiscard={discard}
      />
      {completed.length > 0 && (
        <section className="testing-resume" aria-label="Completed attempts">
          <h2>Completed attempts</h2>
          <div className="testing-shape">
            {completed.slice(0, 3).map((entry) => (
              <div className="testing-shape-row" key={entry.href}>
                <div className="testing-resume-description">
                  <strong>{entry.title}</strong>
                  <small>{entry.score}</small>
                </div>
                <Link className="practice-exams-nav-link" to={entry.href}>View results</Link>
              </div>
            ))}
          </div>
          <Link className="practice-exams-nav-link" to="/practice/exams/attempts?status=completed">All completed attempts</Link>
        </section>
      )}
    </>
  );
}
