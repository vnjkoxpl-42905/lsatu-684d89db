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
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuestionBank } from "@/contexts/QuestionBankContext";
import { SectionSelector } from "@/components/drill/SectionSelector";
import { PrepTestCombobox } from "@/components/testing/PrepTestCombobox";
import { loadAllIndexPassages } from "@/features/rc/lib/rcBank";
import { buildRcSections, type RcSection } from "@/features/rc/lib/rcSections";
import {
  buildPracticeTests,
  createPracticeTestRun,
  deletePracticeTestRun,
  formatPracticeTestClock,
  legLabel,
  listPracticeTestRuns,
  PRACTICE_TEST_PACES,
  type PracticeTestBlueprint,
  type PracticeTestPaceId,
  type PracticeTestRun,
} from "@/lib/practiceTest";
import { practiceTestPath } from "@/lib/practiceTestRunner";
import "./testing-centre.css";

type Door = null | "section" | "test";

/** The panel both doors open into. Named so a door can point at it. */
const PANEL_ID = "testing-door-panel";

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
}: {
  tests: PracticeTestBlueprint[];
  onBegin: (blueprint: PracticeTestBlueprint, pace: PracticeTestPaceId) => void;
}) {
  const [pt, setPt] = React.useState<number | null>(null);
  const [pace, setPace] = React.useState<PracticeTestPaceId>("standard");

  // The combobox orders its own rows newest-first. This page still needs the
  // blueprint behind the chosen number, for the shape table below.
  const ptOptions = React.useMemo(
    () => tests.map((t) => ({ pt: t.pt, detail: `${t.questionCount} questions` })),
    [tests],
  );
  const chosen = tests.find((t) => t.pt === pt) ?? null;
  const clock = formatPracticeTestClock(pace);

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
        <Select value={pace} onValueChange={(v) => setPace(v as PracticeTestPaceId)}>
          <SelectTrigger
            id="testing-pace"
            aria-labelledby="testing-pace-label testing-pace"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="testing-menu">
            {PRACTICE_TEST_PACES.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.label}
                {p.sectionSeconds === null
                  ? " · no clock"
                  : ` · ${Math.round(p.sectionSeconds / 60)} min a section`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
                  {clock ? ` · ${clock}` : ""}
                </em>
              </div>
            ))}
          </div>
          <p className="testing-note">
            {chosen.questionCount} scored questions, with a ten-minute break
            after the second section.
          </p>
          {!chosen.rcFullLength && (
            <p className="testing-note">
              The Reading Comprehension section on this PrepTest runs a few
              questions short, because only questions with a published
              explanation can be drilled. All four passages are there and the
              clock is the real 35:00, so the reading load is unchanged. Your
              score is simply out of {chosen.questionCount} rather than the high
              seventies.
            </p>
          )}
        </>
      )}

      <div className="testing-actions">
        <Button disabled={!chosen} onClick={() => chosen && onBegin(chosen, pace)}>
          Begin practice test
        </Button>
      </div>
    </div>
  );
}

function ResumeList({
  runs,
  onResume,
  onDiscard,
}: {
  runs: PracticeTestRun[];
  onResume: (run: PracticeTestRun) => void;
  onDiscard: (run: PracticeTestRun) => void;
}) {
  // Discard deletes a sitting that can be ninety minutes into a two-hour clock,
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

  if (runs.length === 0) return null;
  return (
    <div className="testing-resume">
      {/* h2, not h3: this is the first section of the page and the only other
          heading is the page title. It sits above the doors because an
          unfinished sitting is the next step, not an afterthought. */}
      <h2>Unfinished sittings</h2>
      <div className="testing-shape">
        {runs.map((run) => {
          return (
            <div className="testing-shape-row" key={run.id}>
              <b>PT {run.pt}</b>
              <span>
                Section {Math.min(run.currentLeg + 1, run.legs.length)} of{" "}
                {run.legs.length}
              </span>
              {/* min-h-[44px] because Button's own sm size stops at 40px, and
                  the 44px floor is a defect gate here, not a preference. Both
                  carry a name saying which sitting they act on: two rows of
                  "Resume / Discard" are indistinguishable to a screen reader
                  reading the controls on their own. */}
              {confirming === run.id ? (
                <div
                  className="testing-shape-actions"
                  role="group"
                  aria-label={`Discard the unfinished PrepTest ${run.pt} sitting?`}
                >
                  <span className="testing-confirm">Discard this sitting?</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={() => {
                      onDiscard(run);
                      setConfirming(null);
                    }}
                    aria-label={`Yes, discard the unfinished PrepTest ${run.pt} sitting`}
                  >
                    Discard
                  </Button>
                  <Button
                    ref={keepRef}
                    size="sm"
                    variant="outline"
                    className="min-h-[44px]"
                    onClick={() => setConfirming(null)}
                    aria-label={`Keep the unfinished PrepTest ${run.pt} sitting`}
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
                  <Button
                    size="sm"
                    variant="ghost"
                    className="min-h-[44px]"
                    onClick={() => setConfirming(run.id)}
                    aria-label={`Discard the unfinished PrepTest ${run.pt} sitting`}
                  >
                    Discard
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function TestingCentre() {
  const navigate = useNavigate();
  const { manifest, isLoading, error } = useQuestionBank();
  const [door, setDoor] = React.useState<Door>(null);
  const { sections: rcSections, error: rcError } = useRcSections(door === "test");
  const [runs, setRuns] = React.useState<PracticeTestRun[]>([]);

  React.useEffect(() => {
    setRuns(listPracticeTestRuns().filter((r) => r.status === "in-progress"));
  }, []);

  const tests = React.useMemo(
    () => (manifest && rcSections ? buildPracticeTests(manifest, rcSections) : []),
    [manifest, rcSections],
  );

  const beginTest = (blueprint: PracticeTestBlueprint, pace: PracticeTestPaceId) => {
    const run = createPracticeTestRun(blueprint, pace);
    navigate(practiceTestPath(run.id));
  };

  const discard = (run: PracticeTestRun) => {
    deletePracticeTestRun(run.id);
    setRuns((current) => current.filter((r) => r.id !== run.id));
  };

  // A door's panel renders below the two door buttons, which on a laptop puts it
  // under the fold: the click looks like it did nothing, and the section type
  // picker (Logical Reasoning / Reading Comprehension) is never seen, so the door
  // reads as LR-only. Bring the panel to the student when it opens.
  const panelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!door) return;
    const prefersReducedMotion = window.matchMedia?.(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    panelRef.current?.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
  }, [door]);

  return (
    <>
      <h1 className="classroom-title">Testing Centre</h1>
      <p className="testing-lede">
        Official LSAT material, timed like test day.
      </p>

      <ResumeList
        runs={runs}
        onResume={(run) => navigate(practiceTestPath(run.id))}
        onDiscard={discard}
      />

      {/* The doors carry a title and two supporting lines, and those used to be
          an h2 and a p. Neither is legal inside a button — its content model is
          phrasing only — and the h2s put two headings in the outline that a
          screen reader lands on as controls. They are spans that look the same.

          aria-expanded, not aria-pressed: these are not toggle buttons, they
          disclose a panel, and aria-controls is what says which panel. */}
      <div className="testing-doors">
        <button
          type="button"
          className="testing-door"
          aria-expanded={door === "section"}
          aria-controls={PANEL_ID}
          onClick={() => setDoor(door === "section" ? null : "section")}
        >
          <span className="testing-door-title">Take a section</span>
          {/* No clock here: the meta line below already carries it. */}
          <span className="testing-door-body">
            One real LR or RC section from an official PrepTest.
          </span>
          <span className="testing-door-meta">One section · 35 minutes</span>
        </button>

        <button
          type="button"
          className="testing-door"
          aria-expanded={door === "test"}
          aria-controls={PANEL_ID}
          onClick={() => setDoor(door === "test" ? null : "test")}
        >
          <span className="testing-door-title">Take a practice test</span>
          <span className="testing-door-body">
            Three scored sections from one PrepTest, in order, with a break.
          </span>
          <span className="testing-door-meta">Three sections · about 2 hours</span>
        </button>
      </div>

      <div id={PANEL_ID} ref={panelRef}>
        {door === "section" && (
          <div className="testing-panel">
            {isLoading && <Working>Loading questions…</Working>}
            {!isLoading && error && <p className="testing-note">{error}</p>}
            {!isLoading && !error && manifest && (
              <SectionSelector
                manifest={manifest}
                onStartSection={(config) =>
                  navigate("/drill", {
                    state: { mode: "full-section", config, returnTo: "/testing" },
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
              <PracticeTestSelector tests={tests} onBegin={beginTest} />
            )}
          </>
        )}
      </div>
    </>
  );
}
