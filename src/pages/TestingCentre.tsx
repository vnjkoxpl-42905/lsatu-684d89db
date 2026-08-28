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
 * Neither door owns a question runner. The section door hands off to the
 * launcher the drill hub already uses; the practice-test door hands off to the
 * same two runners, one leg at a time.
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
  practiceTestRaw,
  type PracticeTestBlueprint,
  type PracticeTestPaceId,
  type PracticeTestRun,
} from "@/lib/practiceTest";
import { practiceTestPath } from "@/lib/practiceTestRunner";
import "./testing-centre.css";

type Door = null | "section" | "test";

/** RC sections load once and are shared by both doors. */
function useRcSections() {
  const [sections, setSections] = React.useState<RcSection[] | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
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
  }, []);

  return { sections, error };
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

  const chosen = tests.find((t) => t.pt === pt) ?? null;
  const clock = formatPracticeTestClock(pace);

  if (tests.length === 0) {
    return (
      <div className="testing-panel">
        <p className="testing-note" style={{ marginTop: 0 }}>
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
        <label htmlFor="testing-pt">PrepTest</label>
        <Select value={pt ? String(pt) : ""} onValueChange={(v) => setPt(Number(v))}>
          <SelectTrigger id="testing-pt">
            <SelectValue placeholder="Choose a PrepTest" />
          </SelectTrigger>
          <SelectContent>
            {tests.map((t) => (
              <SelectItem key={t.pt} value={String(t.pt)}>
                PrepTest {t.pt} · {t.questionCount} questions
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="testing-field">
        <label htmlFor="testing-pace">Timing</label>
        <Select value={pace} onValueChange={(v) => setPace(v as PracticeTestPaceId)}>
          <SelectTrigger id="testing-pace">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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
          <p className="testing-note" style={{ marginTop: 0 }}>
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
  if (runs.length === 0) return null;
  return (
    <div className="testing-resume">
      <h3>Unfinished sittings</h3>
      <div className="testing-shape">
        {runs.map((run) => {
          const { correct, total } = practiceTestRaw(run);
          return (
            <div className="testing-shape-row" key={run.id}>
              <b>PT {run.pt}</b>
              <span>
                Section {Math.min(run.currentLeg + 1, run.legs.length)} of{" "}
                {run.legs.length}
                {correct > 0 ? ` · ${correct}/${total} so far` : ""}
              </span>
              <em style={{ display: "flex", gap: 8 }}>
                <Button size="sm" variant="outline" onClick={() => onResume(run)}>
                  Resume
                </Button>
                <Button size="sm" variant="ghost" onClick={() => onDiscard(run)}>
                  Discard
                </Button>
              </em>
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
  const { sections: rcSections, error: rcError } = useRcSections();
  const [door, setDoor] = React.useState<Door>(null);
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
        Official LSAT material, administered under standard timing and exam
        conditions.
      </p>

      <ResumeList
        runs={runs}
        onResume={(run) => navigate(practiceTestPath(run.id))}
        onDiscard={discard}
      />

      <div className="testing-doors">
        <button
          type="button"
          className="testing-door"
          aria-pressed={door === "section"}
          onClick={() => setDoor(door === "section" ? null : "section")}
        >
          <h2>Take a section</h2>
          <p>
            One official Logical Reasoning or Reading Comprehension section,
            administered under standard 35-minute timing.
          </p>
          <span className="testing-door-meta">One section · 35 minutes</span>
        </button>

        <button
          type="button"
          className="testing-door"
          aria-pressed={door === "test"}
          onClick={() => setDoor(door === "test" ? null : "test")}
        >
          <h2>Take a practice test</h2>
          <p>
            Three scored sections from a single PrepTest, administered in
            published order with a scheduled break.
          </p>
          <span className="testing-door-meta">Three sections · about 2 hours</span>
        </button>
      </div>

      <div ref={panelRef}>
      {door === "section" && (
        <div className="testing-panel">
          {isLoading && (
            <div className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading questions…
            </div>
          )}
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
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Working out which PrepTests can be sat end to end…
              </div>
            </div>
          )}
          {!isLoading && (error || rcError) && (
            <div className="testing-panel">
              <p className="testing-note" style={{ marginTop: 0 }}>
                {error || rcError}
              </p>
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
