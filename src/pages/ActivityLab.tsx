import { useEffect, useMemo, useState } from "react";
import { SEED_ACTIVITIES } from "@/features/activity-centre/content";
import { ActivityProgress } from "@/features/activity-centre/components/ActivityProgress";
import { RELATIONSHIP_ANSWER_PROMPT } from "@/features/activity-centre/relationshipPresentation";
import { SectionStage } from "@/features/activity-centre/recall/SectionStage";
import { SectionReportCard } from "@/features/activity-centre/components/SectionReportCard";
import { SectionRunHistory } from "@/features/activity-centre/components/SectionRunHistory";
import type { SectionGrade, SectionStimulusGrade } from "@/features/activity-centre/api/types";
import sectionInstructions from "@/features/activity-centre/content/read-recall-colour-section.instructions.json";
import { SectionLibraryPanel } from "@/features/activity-centre/components/SectionLibraryPanel";
import {
  advanceCursor,
  buildSectionRun,
  startCursor,
  type SectionCursor,
} from "@/features/activity-centre/recall/section";
import "@/features/activity-centre/recall/section.css";
import {
  SwitchyardStage,
  type Milepost,
  type YardPhase,
} from "@/features/activity-centre/worlds/switchyard/SwitchyardStage";
import { SwitchyardEntrance } from "@/features/activity-centre/worlds/switchyard/SwitchyardEntrance";
import { SortingYard } from "@/features/activity-centre/worlds/switchyard/wings/SortingYard";
import { TriggerGallery } from "@/features/activity-centre/worlds/switchyard/wings/TriggerGallery";
import {
  buildGallery,
  buildSortingRound,
} from "@/features/activity-centre/worlds/switchyard/wings/rounds";
import {
  diagnose,
  indicatorOf,
  parseRouting,
  type Routing,
} from "@/features/activity-centre/worlds/switchyard/routing";
import {
  SpecimenLabStage,
  type BenchPhase,
  type Slide,
} from "@/features/activity-centre/worlds/specimen-lab/SpecimenLabStage";
import { SpecimenLabEntrance } from "@/features/activity-centre/worlds/specimen-lab/SpecimenLabEntrance";
import { BoundaryRoom } from "@/features/activity-centre/worlds/specimen-lab/wings/BoundaryRoom";
import { ChargeRound } from "@/features/activity-centre/worlds/specimen-lab/wings/ChargeRound";
import {
  buildBoundaryRound,
  buildChargeRound,
} from "@/features/activity-centre/worlds/specimen-lab/wings/rounds";
import { parseSpecimen, readExamination } from "@/features/activity-centre/worlds/specimen-lab/specimen";
import {
  PressStage,
  type PressPhase,
  type SpikeSlug,
} from "@/features/activity-centre/worlds/press/PressStage";
import { PressEntrance } from "@/features/activity-centre/worlds/press/PressEntrance";
import { IdeaCensus } from "@/features/activity-centre/worlds/press/wings/IdeaCensus";
import { SlugJudge } from "@/features/activity-centre/worlds/press/wings/SlugJudge";
import {
  buildIdeaCensus,
  buildSlugJudge,
} from "@/features/activity-centre/worlds/press/wings/rounds";
import { parsePress, readStroke } from "@/features/activity-centre/worlds/press/press";
import {
  AtelierStage,
  type AtelierPhase,
  type Plaque,
} from "@/features/activity-centre/worlds/atelier/AtelierStage";
import { AtelierEntrance } from "@/features/activity-centre/worlds/atelier/AtelierEntrance";
import { RoleCall } from "@/features/activity-centre/worlds/atelier/wings/RoleCall";
import { LightTable } from "@/features/activity-centre/worlds/atelier/wings/LightTable";
import {
  buildLightTable,
  buildRoleCall,
} from "@/features/activity-centre/worlds/atelier/wings/rounds";
import { parseArgument, readBuild } from "@/features/activity-centre/worlds/atelier/atelier";
import {
  ChamberStage,
  type ChamberPhase,
  type Nameplate,
} from "@/features/activity-centre/worlds/chamber/ChamberStage";
import { ChamberEntrance } from "@/features/activity-centre/worlds/chamber/ChamberEntrance";
import { StrengthMatch } from "@/features/activity-centre/worlds/chamber/wings/StrengthMatch";
import { TrapAutopsy } from "@/features/activity-centre/worlds/chamber/wings/TrapAutopsy";
import {
  buildStrengthMatch,
  buildTrapAutopsy,
} from "@/features/activity-centre/worlds/chamber/wings/rounds";
import { parseRebuttal, readResolution } from "@/features/activity-centre/worlds/chamber/chamber";
import type { SkyPhase } from "@/features/activity-centre/worlds/observatory/ObservatoryStage";
import { ObservatoryEntrance } from "@/features/activity-centre/worlds/observatory/ObservatoryEntrance";
import { SpeedRound } from "@/features/activity-centre/worlds/observatory/wings/SpeedRound";
import { ForgeStatement } from "@/features/activity-centre/worlds/observatory/wings/ForgeStatement";
import {
  buildForgeTasks,
  buildSpeedRound,
} from "@/features/activity-centre/worlds/observatory/wings/rounds";
import {
  parseSignal,
  readAnswer,
} from "@/features/activity-centre/worlds/observatory/observatory";
import {
  LoomStage,
  type LoomPhase,
  type WovenThread,
} from "@/features/activity-centre/worlds/loom/LoomStage";
import { LoomEntrance } from "@/features/activity-centre/worlds/loom/LoomEntrance";
import { ReverseLoom } from "@/features/activity-centre/worlds/loom/wings/ReverseLoom";
import { DecodeBench } from "@/features/activity-centre/worlds/loom/wings/DecodeBench";
import {
  buildDecodeBench,
  buildReverseLoom,
} from "@/features/activity-centre/worlds/loom/wings/rounds";
import { parseCallback, readThrow } from "@/features/activity-centre/worlds/loom/loom";
import {
  PolarityStage,
  type ChamberPhase as PolarityPhase,
  type Chip,
} from "@/features/activity-centre/worlds/polarity/PolarityStage";
import { PolarityEntrance } from "@/features/activity-centre/worlds/polarity/PolarityEntrance";
import { Assay } from "@/features/activity-centre/worlds/polarity/wings/Assay";
import { buildAssay } from "@/features/activity-centre/worlds/polarity/wings/rounds";
import { NEGATION_ITEMS, PLATES, readPush } from "@/features/activity-centre/worlds/polarity/polarity";
import "@/features/activity-centre/activity-centre.css";
import { ActivityIntro } from "@/features/activity-centre/components/ActivityIntro";
import { MAX_ATTEMPTS } from "@/features/activity-centre/api/types";
import type { ActivityAssignmentSummary } from "@/features/activity-centre/api/types";
import { ActivityCard } from "@/features/activity-centre/components/ActivityCard";
import { CompletionSummary } from "@/features/activity-centre/components/CompletionSummary";
import { scoreFor } from "@/features/activity-centre/progress";
import { IndicatorLedgerReport } from "@/features/activity-centre/components/StudentIndicatorLedger";
import {
  buildIndicatorLedger,
  familiesAcrossRuns,
  type AssignmentLedger,
} from "@/features/activity-centre/ledger";
import type { Verdict } from "@/features/activity-centre/api/types";
import { ActivityQuestionStack } from "@/features/activity-centre/components/ActivityQuestionStack";
import { worldForTitle } from "@/features/activity-centre/worlds/registry";
import { librarySortIndex } from "@/features/activity-centre/content";
import "@/features/activity-centre/activities-home.css";

/**
 * Dev-only harness for the Activity Centre worlds.
 *
 * The Activity Centre and its runner are behind ProtectedRoute plus a feature
 * flag, so a world cannot be looked at without a signed-in student who has an
 * assignment. That makes the visual-verification gate impossible to satisfy
 * while building. This page renders a world directly against the real seeded
 * content, with no auth and no database, so the build can actually be seen.
 *
 * It is registered only when import.meta.env.DEV, so it never exists in a
 * production bundle.
 */

const WORLDS = [
  { key: "list", label: "Activity Centre list" },
  { key: "intro", label: "Activity intro" },
  { key: "door", label: "RRC door (pick a section)" },
  { key: "section", label: "RRC section (whole section)" },
  { key: "report", label: "RRC Report Card" },
  { key: "runs", label: "RRC run history" },
  { key: "shell", label: "Runner shell" },
  { key: "switchyard", label: "The Switchyard" },
  { key: "specimen-lab", label: "The Specimen Lab" },
  { key: "press", label: "The Press" },
  { key: "atelier", label: "The Argument Atelier" },
  { key: "chamber", label: "The Debate Chamber" },
  { key: "observatory", label: "The Signal Observatory" },
  { key: "loom", label: "The Loom" },
  { key: "polarity", label: "The Polarity Chamber" },
  { key: "completion", label: "Completion + indicator ledger" },
] as const;
type World = (typeof WORLDS)[number]["key"];

function Tabs<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: readonly T[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="flex flex-wrap gap-1" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          data-testid={`${label.toLowerCase().replace(/\s+/g, "-")}-${o}`}
          className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
            value === o
              ? "bg-[hsl(var(--ac-emerald))] text-white"
              : "border border-border bg-card text-foreground hover:bg-muted"
          }`}
        >
          {o.replace(/-/g, " ")}
        </button>
      ))}
    </div>
  );
}

export default function ActivityLab() {
  const [world, setWorld] = useState<World>("switchyard");
  if (new URLSearchParams(window.location.search).get("preview") === "relationship") return <ShellPanel relationshipOnly />;

  return (
    <div className="activity-centre min-h-screen">
      <header className="flex flex-wrap items-center gap-4 overflow-hidden border-b border-border px-6 py-4">
        <div className="mr-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Activity Lab · dev only
          </p>
          <h1 className="ac-display text-xl text-foreground">
            {WORLDS.find((w) => w.key === world)!.label}
          </h1>
        </div>
        <Tabs
          options={WORLDS.map((w) => w.key)}
          value={world}
          onChange={(v) => setWorld(v)}
          label="World"
        />
      </header>

      {world === "list" ? <ListPanel /> : null}
      {world === "intro" ? <IntroPanel /> : null}
      {world === "door" ? <DoorPanel /> : null}
      {world === "section" ? <SectionPanel /> : null}
      {world === "report" ? <ReportPanel /> : null}
      {world === "runs" ? <RunsPanel /> : null}
      {world === "shell" ? <ShellPanel /> : null}
      {world === "switchyard" ? <SwitchyardPanel /> : null}
      {world === "specimen-lab" ? <SpecimenLabPanel /> : null}
      {world === "press" ? <PressPanel /> : null}
      {world === "atelier" ? <AtelierPanel /> : null}
      {world === "chamber" ? <ChamberPanel /> : null}
      {world === "observatory" ? <ObservatoryPanel /> : null}
      {world === "loom" ? <LoomPanel /> : null}
      {world === "polarity" ? <PolarityPanel /> : null}
      {world === "completion" ? <CompletionPanel /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The Activity Centre list
 * ------------------------------------------------------------------ */

/**
 * The eight Activities a student can actually be assigned.
 *
 * SEED_ACTIVITIES is only seven: Negation Station predates the content pipeline
 * and is deliberately never re-seeded, so it has no file in content/. That is
 * correct for the pipeline and wrong for the lab, which was left unable to draw
 * the one Activity every student meets first -- its card art and its running
 * shell had never been looked at once. Its items come from the world's own
 * verbatim extract of the seed migration; the rest of the row is that same
 * migration's copy, kept here only so the lab can render it.
 */
const NEGATION_STATION_LAB_ROW = {
  slug: "negation-station",
  title: "Negation Station",
  subtitle: "Write the weakest statement that contradicts the original",
  item_format: "free-text" as const,
  instructions: {
    // No `coach`: Negation Station is the one Activity that relies on the edge
    // function's default rubric, which is its own. See the pipeline README.
    tagline: "Practice the Negation Test using the weakest statement that contradicts the original.",
    answer_label: "Your negation",
    answer_placeholder: "Write the weakest statement that contradicts the original…",
  },
  items: NEGATION_ITEMS,
};

const LAB_ACTIVITIES = [...SEED_ACTIVITIES, NEGATION_STATION_LAB_ROW as (typeof SEED_ACTIVITIES)[number]];

/**
 * The list is behind auth and a feature flag like everything else here, so its
 * layout could not be looked at while building. Rendered from the seed content
 * in the same teaching order the page sorts by.
 */
function ListPanel() {
  const rows = [...LAB_ACTIVITIES]
    .sort((a, b) => librarySortIndex(a.slug) - librarySortIndex(b.slug))
    // A list row, which is what the card takes: the count, never the questions.
    .map((a, i): ActivityAssignmentSummary => ({
      id: a.slug,
      activity_id: null,
      student_id: "lab",
      title: a.title,
      subtitle: a.subtitle,
      instructions: a.instructions,
      status: i === 0 ? "in_progress" : i === 1 ? "completed" : "assigned",
      score: i === 1 ? 80 : null,
      created_at: "2026-08-01T00:00:00.000Z",
      started_at: null,
      completed_at: null,
      item_count: a.items.length,
    }));
  return (
    <div className="activity-centre">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <h1 className="ac-display text-4xl text-foreground">Activities</h1>
          <p className="mt-2 text-base leading-relaxed text-muted-foreground">
            Coach-led skill exercises, ordered by how much text each one works on: a single word
            first, a whole passage last.
          </p>
        </header>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {rows.map((a, i) => (
            <ActivityCard key={a.id} assignment={a} position={i + 1} onOpen={() => {}} />
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The runner shell (the split view a student works inside)
 * ------------------------------------------------------------------ */

/**
 * The running screen is the last surface auth keeps invisible: the world fills
 * the left column and the answer column stands on the world's own ground via
 * its `data-world` shell. Composed here from the same pieces the real runner
 * mounts (world stage + ActivityQuestionStack) so the per-world shell can be
 * seen without a login. Exact answers use the real local check; no progress is saved.
 */
function ShellPanel({ relationshipOnly = false }: { relationshipOnly?: boolean }) {
  const [slug, setSlug] = useState<string>(relationshipOnly ? "spot-the-relationship" : LAB_ACTIVITIES[0].slug);
  const activity = LAB_ACTIVITIES.find((a) => a.slug === slug) ?? LAB_ACTIVITIES[0];
  const world = worldForTitle(activity.title);
  const [position, setPosition] = useState(0);
  const [previewRun, setPreviewRun] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<number, "correct" | "partial" | "incorrect" | null>>({});
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const item = activity.items[position] ?? activity.items[0];
  const spot = slug === "spot-the-relationship";
  const stage = world?.render({ item, response: answers[item.order], answered: Object.prototype.hasOwnProperty.call(outcomes, item.order), verdict: outcomes[item.order], revealed: Object.prototype.hasOwnProperty.call(outcomes, item.order) && outcomes[item.order] !== "correct", completedItems: activity.items.filter(i => outcomes[i.order] === "correct") });
  // Mirrors the runner's phone band. The shell is only useful as a proxy for a
  // screen auth makes unreachable if it carries the same container decisions.
  const [bandExpanded, setBandExpanded] = useState(false);

  return (
    <div>
      {!relationshipOnly && <div className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-3">
        <Tabs
          options={LAB_ACTIVITIES.map((a) => a.slug)}
          value={slug}
          onChange={(value) => { setSlug(value); setPosition(0); setOutcomes({}); setAnswers({}); }}
          label="Shell"
        />
      </div>}

      <div className={`activity-centre${spot ? " relationship-run" : ""}`} data-world={world?.slug}>
        {spot && <header className="relationship-run-header"><button type="button" onClick={() => { setPreviewRun(prev => prev + 1); setPosition(0); setOutcomes({}); setAnswers({}); }}>Reset preview</button><span className="relationship-run-title">Spot the Relationship</span><ActivityProgress variant="relationship" completed={Object.keys(outcomes).length} total={activity.items.length} /></header>}
        <div className="grid min-h-[720px] grid-cols-1 md:grid-cols-[minmax(320px,42%)_1fr]">
          <aside
            className="ac-yard-band relative flex min-h-[200px] flex-col md:min-h-[560px]"
            data-expanded={bandExpanded ? "true" : "false"}
          >
            <div className="min-h-0 flex-1">{stage}</div>
            <button
              type="button"
              className="ac-band-toggle md:hidden"
              onClick={() => setBandExpanded((open) => !open)}
              aria-expanded={bandExpanded}
            >
              {bandExpanded ? "Collapse" : "Expand"}
            </button>
          </aside>
          <main className="bg-[hsl(var(--aw-page,var(--background)))]">
            <ActivityQuestionStack
              key={`${slug}:${previewRun}`}
              items={activity.items}
              format={activity.item_format}
              coach={activity.instructions?.coach}
              answerLabel={activity.instructions?.answer_label}
              answerPlaceholder={spot ? RELATIONSHIP_ANSWER_PROMPT : activity.instructions?.answer_placeholder}
              promptInWorld={Boolean(stage && world?.carriesPrompt)}
              activeIndex={position}
              fastPath={world?.fastPath}
              onResolved={(order, verdict) => setOutcomes(prev => ({ ...prev, [order]: verdict }))}
              onRecord={async ({ itemOrder, responseText }) => { setAnswers(prev => ({ ...prev, [itemOrder]: responseText })); }}
              onNext={() => setPosition(prev => Math.min(activity.items.length - 1, prev + 1))}
            />
          </main>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The Activity intro (the screen a student lands on before drilling)
 * ------------------------------------------------------------------ */

/**
 * The intro is the other half of the runner that auth makes impossible to look
 * at, and the exit control lives on it. Rendered here against real seeded
 * content so its placement and affordance can be checked without a login.
 */
function IntroPanel() {
  // Every Activity, because the intro's failure modes are content-shaped: the
  // worked example that is a whole paragraph is the one that breaks the orbs.
  //
  // This used to filter to `instructions.worked_example`, which quietly excluded
  // the content shape that broke hardest. An Activity with a task and NO worked
  // example renders no orbs at all, so the hero has nothing to give it height
  // and the absolutely-positioned brief lands on top of the title. Read, Recall,
  // Colour and Dumb it Down are both that shape, and both shipped broken because
  // the one harness meant to catch content-shaped failures could not draw them.
  const shapes = SEED_ACTIVITIES;
  const [slug, setSlug] = useState(shapes[0].slug);
  const a = shapes.find((x) => x.slug === slug)!;
  /*
   * A section's own JSON carries `instructions: {}` on purpose -- they are
   * authored once and filled in at seed time -- which left the one intro whose
   * copy is most easily wrong as the one intro this harness could not draw. It
   * is filled from the same file the seed builder reads, so what the lab shows
   * is what the database gets.
   */
  const instructions =
    a.mode === "section"
      ? (sectionInstructions as unknown as typeof a.instructions)
      : a.instructions;
  return (
    <div>
      <div className="border-b border-border px-6 py-3">
        <Tabs
          options={shapes.map((x) => x.slug)}
          value={slug}
          onChange={setSlug}
          label="Activity"
        />
      </div>
      {/* Mirrors the runner's intro wrapper, which carries the same attribute. */}
      <div className="activity-centre act-home" data-world={worldForTitle(a.title)?.slug}>
        <ActivityIntro
          key={a.slug}
          preview
          title={a.title}
          subtitle={a.subtitle}
          instructions={instructions}
          itemCount={a.items.length}
          maxAttempts={MAX_ATTEMPTS}
          format={a.item_format}
          mode={a.mode}
          onStart={() => {}}
          onExit={() => {}}
        />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The door
 * ------------------------------------------------------------------ */

/**
 * The section-library door, against real data.
 *
 * It reads her assignments and the section list from the live backend rather
 * than a fixture, because the door's whole content is that list -- a preview of
 * it with three invented rows would be a preview of nothing. The harness at
 * `/src/dev/section-launch-preview.html?state=library` is the fixture version,
 * for looking at the layout without a session.
 */
function DoorPanel() {
  return <SectionLibraryPanel />;
}

/* ------------------------------------------------------------------ *
 * The Switchyard
 * ------------------------------------------------------------------ */

const PHASES: YardPhase[] = ["arrival", "routed", "flipped"];
const YARD_VIEWS = ["yard", "entrance", "sorting", "gallery"] as const;
const FAULT_DEMOS = ["none", "reversal", "dropped-negation", "trimmed-condition"] as const;
type FaultDemo = (typeof FAULT_DEMOS)[number];

/**
 * Build a plausible student routing for each named partial so the real
 * `diagnose` is what decides the choreography, rather than the lab asserting a
 * fault the production path might never derive.
 */
function studentRoutingFor(demo: FaultDemo, credited: Routing): Routing | null {
  if (demo === "none") return null;
  if (demo === "reversal") {
    return { ifClause: credited.thenClause, thenClause: credited.ifClause };
  }
  if (demo === "dropped-negation") {
    const side = credited.ifClause.negated ? "ifClause" : "thenClause";
    return {
      ...credited,
      [side]: { ...credited[side], negated: !credited[side].negated },
    } as Routing;
  }
  const words = credited.thenClause.text.split(/\s+/);
  if (words.length < 5) return null;
  return {
    ...credited,
    thenClause: { ...credited.thenClause, text: words.slice(0, Math.ceil(words.length / 2)).join(" ") },
  };
}

function SwitchyardPanel() {
  const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;
  const [view, setView] = useState<(typeof YARD_VIEWS)[number]>("yard");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<YardPhase>("arrival");
  const [faultDemo, setFaultDemo] = useState<FaultDemo>("none");
  const [entranceRun, setEntranceRun] = useState(0);

  const item = conditional.items[index];
  const routing = useMemo(() => parseRouting(item.credited_answers[0]), [item]);
  const studentRouting = useMemo(
    () => (routing ? studentRoutingFor(faultDemo, routing) : null),
    [faultDemo, routing],
  );
  const fault = useMemo(
    () => (routing ? diagnose(routing, studentRouting) : null),
    [routing, studentRouting],
  );

  // Lab-only sample progress: everything before the current item counts as
  // answered. The production yard is passed real verdicts.
  const mileposts: Milepost[] = useMemo(
    () =>
      conditional.items.map((it, i) => ({
        order: it.order,
        outcome: i < index ? (i % 5 === 3 ? "partial" : "correct") : null,
      })),
    [conditional.items, index],
  );

  const round = useMemo(() => buildSortingRound(conditional.items, 10, index), [conditional.items, index]);
  const levers = useMemo(() => buildGallery(conditional.items), [conditional.items]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={YARD_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="View"
        />

        {view === "yard" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Item
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("arrival");
                }}
              >
                {conditional.items.map((it, i) => (
                  <option key={it.order} value={i}>
                    {it.order}. {it.prompt.slice(0, 52)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Fault
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={faultDemo}
                onChange={(e) => setFaultDemo(e.target.value as FaultDemo)}
              >
                {FAULT_DEMOS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              diagnose(): <code>{fault ? `${fault.kind} · ${fault.side}` : "null"}</code>
            </span>

            <div className="ml-auto">
              <Tabs options={PHASES} value={phase} onChange={(v) => setPhase(v)} label="Phase" />
            </div>
          </>
        ) : null}
      </div>

      {view === "yard" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            {routing ? (
              <SwitchyardStage
                statement={item.prompt}
                routing={routing}
                contrapositive={item.credited_answers[1] ?? ""}
                indicator={indicatorOf(item.explanation)}
                phase={phase}
                studentRouting={studentRouting}
                fault={fault}
                mileposts={mileposts}
                currentOrder={item.order}
              />
            ) : (
              <div className="p-10 text-sm text-muted-foreground">
                This item's credited answer is not in if-then form, so the yard has nothing to route.
              </div>
            )}
          </div>
          <SignalBox
            level={item.category}
            rows={[["Indicator", indicatorOf(item.explanation) ?? "none"]]}
            note={item.explanation}
            title="Signal box"
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <SwitchyardEntrance key={entranceRun} onDone={() => setView("yard")} />
      ) : null}
      {view === "sorting" ? <SortingYard key={index} round={round} /> : null}
      {view === "gallery" ? <TriggerGallery levers={levers} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The Specimen Lab
 * ------------------------------------------------------------------ */

const LAB_VIEWS = ["bench", "entrance", "charge", "boundary"] as const;
const BENCH_PHASES: BenchPhase[] = ["collection", "read"];

/** Stand-in student examinations, so the real reader decides what lights. */
const EXAMINATIONS = [
  { key: "credited", label: "the credited answer" },
  { key: "valence", label: "valence only" },
  { key: "bare", label: "a bare guess" },
] as const;
type ExamKey = (typeof EXAMINATIONS)[number]["key"];

function SpecimenLabPanel() {
  const vocab = SEED_ACTIVITIES.find((a) => a.slug === "vocab-rehab")!;
  const [view, setView] = useState<(typeof LAB_VIEWS)[number]>("bench");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<BenchPhase>("collection");
  const [exam, setExam] = useState<ExamKey>("credited");
  const [entranceRun, setEntranceRun] = useState(0);

  const item = vocab.items[index];
  const specimen = useMemo(() => parseSpecimen(item), [item]);

  const response =
    exam === "credited"
      ? item.credited_answers[0]
      : exam === "valence"
        ? "I think it is negative."
        : "no idea, maybe something else";

  const reading = useMemo(
    () => (specimen ? readExamination(response, specimen) : null),
    [response, specimen],
  );

  // Lab-only sample drawer. The production bench is passed real verdicts.
  const drawer: Slide[] = useMemo(
    () =>
      vocab.items.map((it, i) => ({
        order: it.order,
        word: parseSpecimen(it)?.word ?? "",
        outcome: i < index ? (i % 4 === 2 ? "partial" : "correct") : null,
      })),
    [vocab.items, index],
  );

  const boundary = useMemo(() => buildBoundaryRound(vocab.items), [vocab.items]);
  const charge = useMemo(() => buildChargeRound(vocab.items), [vocab.items]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={LAB_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="Lab view"
        />

        {view === "bench" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Specimen
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("collection");
                }}
              >
                {vocab.items.map((it, i) => (
                  <option key={it.order} value={i}>
                    {it.order}. {parseSpecimen(it)?.word ?? it.prompt.slice(0, 30)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Examination
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={exam}
                onChange={(e) => setExam(e.target.value as ExamKey)}
              >
                {EXAMINATIONS.map((x) => (
                  <option key={x.key} value={x.key}>
                    {x.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              lit: <code>{reading?.lit.length ? reading.lit.join(" · ") : "none"}</code>
            </span>

            <div className="ml-auto">
              <Tabs options={BENCH_PHASES} value={phase} onChange={(v) => setPhase(v)} label="Bench" />
            </div>
          </>
        ) : null}
      </div>

      {view === "bench" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            {specimen ? (
              <SpecimenLabStage
                specimen={specimen}
                phase={phase}
                reading={reading}
                drawer={drawer}
              />
            ) : (
              <div className="p-10 text-sm text-muted-foreground">
                This item has no marked word, so there is no specimen to examine.
              </div>
            )}
          </div>
          <SignalBox
            title="Examination log"
            level={item.category}
            rows={[
              ["Charge authored", specimen?.charge ?? "none"],
              ["Boundary", specimen?.trap ?? "none"],
            ]}
            note={item.explanation}
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <SpecimenLabEntrance key={entranceRun} onDone={() => setView("bench")} />
      ) : null}
      {view === "charge" ? <ChargeRound round={charge} /> : null}
      {view === "boundary" ? <BoundaryRoom round={boundary} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The Press
 * ------------------------------------------------------------------ */

const PRESS_VIEWS = ["bed", "entrance", "census", "judge"] as const;
const PRESS_PHASES: PressPhase[] = ["arrival", "struck", "refused"];

/**
 * Stand-in strokes. Each is authored text or an obvious construction from it,
 * so the real `readStroke` decides the staging rather than the lab asserting a
 * trap the production path might never derive.
 */
const STROKES = [
  { key: "credited", label: "the credited slug" },
  { key: "narrow", label: "the too-narrow trap" },
  { key: "topic", label: "the topic-only trap" },
  { key: "sprawl", label: "two sentences" },
] as const;
type StrokeKey = (typeof STROKES)[number]["key"];

/** Coverage comes from the Coach, so the lab has to be able to fake both states. */
const COVERAGE = [
  { key: "unjudged", label: "not judged (no Coach)" },
  { key: "all", label: "all ideas kept" },
  { key: "some", label: "first idea only" },
  { key: "none", label: "none kept" },
] as const;
type CoverageKey = (typeof COVERAGE)[number]["key"];

function PressPanel() {
  const dumb = SEED_ACTIVITIES.find((a) => a.slug === "dumb-it-down")!;
  const [view, setView] = useState<(typeof PRESS_VIEWS)[number]>("bed");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<PressPhase>("arrival");
  const [strokeKey, setStrokeKey] = useState<StrokeKey>("credited");
  const [coverageKey, setCoverageKey] = useState<CoverageKey>("unjudged");
  const [entranceRun, setEntranceRun] = useState(0);

  const item = dumb.items[index];
  const press = useMemo(() => parsePress(item), [item]);

  const response = useMemo(() => {
    if (!press) return "";
    if (strokeKey === "narrow") return press.traps.narrow ?? press.slug;
    if (strokeKey === "topic") return press.traps.topic ?? press.slug;
    if (strokeKey === "sprawl") return `${press.slug} It also matters for other reasons.`;
    return press.slug;
  }, [press, strokeKey]);

  const covered = useMemo(() => {
    if (!press || coverageKey === "unjudged") return undefined;
    if (coverageKey === "all") return press.ideas.map((i) => i.n);
    if (coverageKey === "some") return press.ideas.slice(0, 1).map((i) => i.n);
    return [];
  }, [press, coverageKey]);

  const stroke = useMemo(
    () => (press ? readStroke(response, press, covered) : null),
    [response, press, covered],
  );

  // Lab-only spike file: every item before this one counts as finished, printed
  // with its own credited slug. The production spike is passed real answers.
  const spike: SpikeSlug[] = useMemo(
    () =>
      dumb.items
        .slice(0, index)
        .map((it) => ({ order: it.order, slug: it.credited_answers[0] }))
        .filter((s) => s.slug),
    [dumb.items, index],
  );

  const census = useMemo(() => buildIdeaCensus(dumb.items), [dumb.items]);
  const judge = useMemo(() => buildSlugJudge(dumb.items), [dumb.items]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={PRESS_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="Press view"
        />

        {view === "bed" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Paragraph
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("arrival");
                }}
              >
                {dumb.items.map((it, i) => (
                  <option key={it.order} value={i}>
                    {it.order}. {it.prompt.slice(0, 44)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Stroke
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={strokeKey}
                onChange={(e) => setStrokeKey(e.target.value as StrokeKey)}
              >
                {STROKES.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Coverage
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={coverageKey}
                onChange={(e) => setCoverageKey(e.target.value as CoverageKey)}
              >
                {COVERAGE.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              readStroke(): <code>{stroke ? `${stroke.trap ?? "no trap"} · ${stroke.wordCount}w` : "null"}</code>
            </span>

            <div className="ml-auto">
              <Tabs options={PRESS_PHASES} value={phase} onChange={(v) => setPhase(v)} label="Press" />
            </div>
          </>
        ) : null}
      </div>

      {view === "bed" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            {press ? (
              <PressStage
                press={press}
                phase={phase}
                response={response}
                stroke={stroke}
                spike={spike}
              />
            ) : (
              <div className="p-10 text-sm text-muted-foreground">
                This item has no authored checklist, so the press has nothing to compress towards.
              </div>
            )}
          </div>
          <SignalBox
            title="Composing desk"
            level={item.category}
            rows={[
              ["Ideas authored", String(press?.ideas.length ?? 0)],
              ["Target length", press ? `${press.targetWords} words` : "none"],
              ["Coverage", covered ? `${covered.length} of ${press?.ideas.length ?? 0}` : "not judged"],
            ]}
            note={item.explanation}
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <PressEntrance key={entranceRun} onDone={() => setView("bed")} />
      ) : null}
      {view === "census" ? <IdeaCensus pages={census} /> : null}
      {view === "judge" ? <SlugJudge calls={judge} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The Argument Atelier
 * ------------------------------------------------------------------ */

const ATELIER_VIEWS = ["table", "entrance", "role-call", "light-table"] as const;
const ATELIER_PHASES: AtelierPhase[] = ["table", "built"];

/** Stand-in answers, so the real reader decides where the marker lands. */
const ANSWERS = [
  { key: "credited", label: "the credited conclusion" },
  { key: "premise", label: "a premise" },
  { key: "vague", label: "a vague answer" },
  { key: "none", label: "nothing yet" },
] as const;
type AnswerKey = (typeof ANSWERS)[number]["key"];

function AtelierPanel() {
  const ftc = SEED_ACTIVITIES.find((a) => a.slug === "find-the-conclusion")!;
  const [view, setView] = useState<(typeof ATELIER_VIEWS)[number]>("table");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<AtelierPhase>("table");
  const [answerKey, setAnswerKey] = useState<AnswerKey>("credited");
  const [entranceRun, setEntranceRun] = useState(0);

  const item = ftc.items[index];
  const argument = useMemo(() => parseArgument(item), [item]);

  const response = useMemo(() => {
    if (!argument) return undefined;
    if (answerKey === "none") return undefined;
    if (answerKey === "vague") return "not sure, something in the middle";
    if (answerKey === "premise") {
      const support = argument.claims.find((c) => c.n !== argument.crown);
      return support?.text ?? argument.conclusion;
    }
    return argument.conclusion;
  }, [argument, answerKey]);

  const build = useMemo(
    () => (argument ? readBuild(argument, response) : null),
    [argument, response],
  );

  // Lab-only sample strip: everything before the current item counts as done.
  const plaques: Plaque[] = useMemo(
    () =>
      ftc.items.map((it, i) => ({
        order: it.order,
        outcome: i < index ? (i % 4 === 2 ? "partial" : "correct") : null,
      })),
    [ftc.items, index],
  );

  const roleRound = useMemo(() => buildRoleCall(ftc.items), [ftc.items]);
  const lightPages = useMemo(() => buildLightTable(ftc.items), [ftc.items]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={ATELIER_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="Atelier view"
        />

        {view === "table" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Argument
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("table");
                }}
              >
                {ftc.items.map((it, i) => (
                  <option key={it.order} value={i}>
                    {it.order}. {it.prompt.slice(0, 44)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Answer
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={answerKey}
                onChange={(e) => setAnswerKey(e.target.value as AnswerKey)}
              >
                {ANSWERS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              crown:{" "}
              <code>{argument?.crown === null ? "unstated" : String(argument?.crown)}</code> ·
              placement: <code>{build?.placement ?? "none"}</code>
            </span>

            <div className="ml-auto">
              <Tabs
                options={ATELIER_PHASES}
                value={phase}
                onChange={(v) => setPhase(v)}
                label="Atelier"
              />
            </div>
          </>
        ) : null}
      </div>

      {view === "table" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            {argument ? (
              <AtelierStage
                argument={argument}
                phase={phase}
                build={build}
                plaques={plaques}
              />
            ) : (
              <div className="p-10 text-sm text-muted-foreground">
                This item has no credited conclusion, so there is nothing to build.
              </div>
            )}
          </div>
          <SignalBox
            title="Drafting notes"
            level={item.category}
            rows={[
              ["Claims", String(argument?.claims.length ?? 0)],
              ["Conclusion on the table", argument?.crown === null ? "no, unstated" : "yes"],
              ["Indicator", argument?.indicator ?? "none"],
            ]}
            note={item.explanation}
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <AtelierEntrance key={entranceRun} onDone={() => setView("table")} />
      ) : null}
      {view === "role-call" ? <RoleCall round={roleRound} /> : null}
      {view === "light-table" ? <LightTable pages={lightPages} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The Debate Chamber
 * ------------------------------------------------------------------ */

const CHAMBER_VIEWS = ["floor", "entrance", "match", "autopsy"] as const;
const CHAMBER_PHASES: ChamberPhase[] = ["unresolved", "resolved"];

/** Stand-in answers, so the real reader decides which trap the chamber names. */
const ATTEMPTS = [
  { key: "credited", label: "the credited claim" },
  { key: "overshoot", label: "the authored overshoot" },
  { key: "referential", label: "a referential non-answer" },
  { key: "none", label: "nothing yet" },
] as const;
type AttemptKey = (typeof ATTEMPTS)[number]["key"];

function ChamberPanel() {
  const rr = SEED_ACTIVITIES.find((a) => a.slug === "rebuttal-rephrase")!;
  const [view, setView] = useState<(typeof CHAMBER_VIEWS)[number]>("floor");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<ChamberPhase>("unresolved");
  const [attemptKey, setAttemptKey] = useState<AttemptKey>("credited");
  const [entranceRun, setEntranceRun] = useState(0);

  const item = rr.items[index];
  const rebuttal = useMemo(() => parseRebuttal(item), [item]);

  const response = useMemo(() => {
    if (!rebuttal || attemptKey === "none") return undefined;
    if (attemptKey === "overshoot") return rebuttal.overshoot ?? rebuttal.credited;
    if (attemptKey === "referential") return "they are wrong about this, it is not so";
    return rebuttal.credited;
  }, [rebuttal, attemptKey]);

  const resolution = useMemo(
    () => (rebuttal && response ? readResolution(rebuttal, response) : null),
    [rebuttal, response],
  );

  // Lab-only sample rail. The production chamber is passed real verdicts.
  const rail: Nameplate[] = useMemo(
    () =>
      rr.items.map((it, i) => ({
        order: it.order,
        outcome: i < index ? (i % 3 === 1 ? "partial" : "correct") : null,
      })),
    [rr.items, index],
  );

  const matchRound = useMemo(() => buildStrengthMatch(rr.items), [rr.items]);
  const autopsyRound = useMemo(() => buildTrapAutopsy(rr.items), [rr.items]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={CHAMBER_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="Chamber view"
        />

        {view === "floor" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Rebuttal
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("unresolved");
                }}
              >
                {rr.items.map((it, i) => (
                  <option key={it.order} value={i}>
                    {it.order}. {it.prompt.slice(0, 44)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Attempt
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={attemptKey}
                onChange={(e) => setAttemptKey(e.target.value as AttemptKey)}
              >
                {ATTEMPTS.map((a) => (
                  <option key={a.key} value={a.key}>
                    {a.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              arc: <code>{rebuttal?.attributedStrength ?? "dark"}</code> →{" "}
              <code>{rebuttal?.creditedStrength ?? "dark"}</code> · trap:{" "}
              <code>{resolution?.trap ?? "none"}</code>
            </span>

            <div className="ml-auto">
              <Tabs
                options={CHAMBER_PHASES}
                value={phase}
                onChange={(v) => setPhase(v)}
                label="Chamber"
              />
            </div>
          </>
        ) : null}
      </div>

      {view === "floor" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            {rebuttal ? (
              <ChamberStage
                rebuttal={rebuttal}
                phase={phase}
                response={response}
                resolution={resolution}
                rail={rail}
              />
            ) : (
              <div className="p-10 text-sm text-muted-foreground">
                This item has no credited claim, so there is nothing to put on the plinth.
              </div>
            )}
          </div>
          <SignalBox
            title="Moderator's bench"
            level={item.category}
            rows={[
              ["Their claim isolated", rebuttal?.attributed ? "yes" : "no"],
              ["Authored overshoot", rebuttal?.overshoot ?? "none"],
              ["Qualifiers", rebuttal?.qualifiers.join(", ") || "none"],
            ]}
            note={item.explanation}
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <ChamberEntrance key={entranceRun} onDone={() => setView("floor")} />
      ) : null}
      {view === "match" ? <StrengthMatch round={matchRound} /> : null}
      {view === "autopsy" ? <TrapAutopsy round={autopsyRound} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The Signal Observatory
 * ------------------------------------------------------------------ */

const SKY_VIEWS = ["field", "entrance", "speed", "forge"] as const;
const SKY_PHASES: SkyPhase[] = ["arrival", "drawn"];

/** Stand-in answers, so the real reader decides which figures draw. */
const CALLS = [
  { key: "credited", label: "the credited answer" },
  { key: "type-only", label: "the type, no indicator" },
  { key: "partial", label: "one of several" },
  { key: "invented", label: "a relationship that is not there" },
  { key: "none", label: "nothing yet" },
] as const;
type CallKey = (typeof CALLS)[number]["key"];

function ObservatoryPanel() {
  const str = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-relationship")!;
  const [view, setView] = useState<(typeof SKY_VIEWS)[number]>("field");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<SkyPhase>("arrival");
  const [callKey, setCallKey] = useState<CallKey>("credited");
  const [entranceRun, setEntranceRun] = useState(0);

  const item = str.items[index];
  const signal = useMemo(() => parseSignal(item), [item]);

  const response = useMemo(() => {
    if (!signal || callKey === "none") return undefined;
    if (callKey === "type-only") return signal.relations[0].kind;
    if (callKey === "partial") {
      const r = signal.relations[0];
      return `${r.kind}, "${r.indicators[0]}"`;
    }
    if (callKey === "invented") {
      const absent = (["conditional", "causal", "comparative"] as const).find(
        (k) => !signal.relations.some((r) => r.kind === k),
      );
      return absent ?? item.credited_answers[0];
    }
    return item.credited_answers[0];
  }, [signal, callKey, item]);

  const reading = useMemo(
    () => (signal && response ? readAnswer(signal, response) : null),
    [signal, response],
  );

  // Exercise the production binding rather than supplying pretend dial state.
  const observatoryWorld = worldForTitle(str.title)!;

  const speedRound = useMemo(() => buildSpeedRound(str.items), [str.items]);
  const forgeTasks = useMemo(() => buildForgeTasks(str.items), [str.items]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={SKY_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="Sky view"
        />

        {view === "field" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Statement
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("arrival");
                }}
              >
                {str.items.map((it, i) => (
                  <option key={it.order} value={i}>
                    {it.order}. {it.prompt.slice(0, 44)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Call
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={callKey}
                onChange={(e) => setCallKey(e.target.value as CallKey)}
              >
                {CALLS.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              drawn: <code>{reading?.drawn.join(", ") || "none"}</code> · missed:{" "}
              <code>{reading?.missed.join(", ") || "none"}</code>
            </span>

            <div className="ml-auto">
              <Tabs options={SKY_PHASES} value={phase} onChange={(v) => setPhase(v)} label="Sky" />
            </div>
          </>
        ) : null}
      </div>

      {view === "field" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            {signal ? (
              observatoryWorld.render({
                item,
                response,
                answered: phase === "drawn",
                verdict: phase === "drawn" && response && observatoryWorld.fastPath?.(item, response) ? "correct" : "partial",
              })
            ) : (
              <div className="p-10 text-sm text-muted-foreground">
                This item names no relationship, so there is no figure to draw.
              </div>
            )}
          </div>
          <SignalBox
            title="Observation log"
            level={item.category}
            rows={[
              ["Relationships", String(signal?.relations.length ?? 0)],
              ["Declared", signal?.declared === null ? "none" : String(signal?.declared)],
              [
                "Indicators",
                signal?.relations.flatMap((r) => r.indicators).join(", ") || "none",
              ],
            ]}
            note={item.explanation}
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <ObservatoryEntrance key={entranceRun} onDone={() => setView("field")} />
      ) : null}
      {view === "speed" ? <SpeedRound round={speedRound} /> : null}
      {view === "forge" ? <ForgeStatement tasks={forgeTasks} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The Loom
 * ------------------------------------------------------------------ */

const LOOM_VIEWS = ["archive", "entrance", "reverse", "decode"] as const;
const LOOM_PHASES: LoomPhase[] = ["call", "thrown"];

/** Stand-in answers, so the real reader decides how the thread behaves. */
const THROWS = [
  { key: "credited", label: "the credited translation" },
  { key: "location", label: "a location, no content" },
  { key: "near-miss", label: "the planted near-miss" },
  { key: "lost", label: "an unrelated answer" },
  { key: "none", label: "nothing yet" },
] as const;
type ThrowKey = (typeof THROWS)[number]["key"];

function LoomPanel() {
  const stc = SEED_ACTIVITIES.find((a) => a.slug === "spot-the-callback")!;
  const [view, setView] = useState<(typeof LOOM_VIEWS)[number]>("archive");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<LoomPhase>("call");
  const [throwKey, setThrowKey] = useState<ThrowKey>("credited");
  const [entranceRun, setEntranceRun] = useState(0);

  const item = stc.items[index];
  const callback = useMemo(() => parseCallback(item), [item]);

  const response = useMemo(() => {
    if (!callback || throwKey === "none") return undefined;
    if (throwKey === "location") return "the thing in the first paragraph about it";
    if (throwKey === "near-miss") return callback.nearMiss ?? "no idea at all";
    if (throwKey === "lost") return "something about the weather";
    return callback.credited;
  }, [callback, throwKey]);

  const result = useMemo(
    () => (callback && response ? readThrow(callback, response) : null),
    [callback, response],
  );

  // Lab-only fabric: everything before the current item counts as thrown.
  const woven: WovenThread[] = useMemo(
    () =>
      stc.items.slice(0, index + 1).map((it, i) => ({
        order: it.order,
        phrase: parseCallback(it)?.phrase ?? "",
        kind: i < index ? (i % 4 === 2 ? "taut" : "thread") : (result?.kind ?? "thread"),
      })),
    [stc.items, index, result],
  );

  const reverseRound = useMemo(() => buildReverseLoom(stc.items), [stc.items]);
  const decodeCards = useMemo(() => buildDecodeBench(stc.items), [stc.items]);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={LOOM_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="Loom view"
        />

        {view === "archive" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Passage
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("call");
                }}
              >
                {stc.items.map((it, i) => (
                  <option key={it.order} value={i}>
                    {it.order}. {parseCallback(it)?.phrase ?? it.prompt.slice(0, 30)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Throw
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={throwKey}
                onChange={(e) => setThrowKey(e.target.value as ThrowKey)}
              >
                {THROWS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              thread: <code>{result?.kind ?? "none"}</code> · lands:{" "}
              <code>{callback?.landing ? "yes" : "no"}</code>
            </span>

            <div className="ml-auto">
              <Tabs options={LOOM_PHASES} value={phase} onChange={(v) => setPhase(v)} label="Loom" />
            </div>
          </>
        ) : null}
      </div>

      {view === "archive" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            {callback ? (
              <LoomStage
                callback={callback}
                phase={phase}
                result={result}
                woven={woven}
              />
            ) : (
              <div className="p-10 text-sm text-muted-foreground">
                This item has no marked phrase, so there is no callback to weave.
              </div>
            )}
          </div>
          <SignalBox
            title="Weaver's log"
            level={item.category}
            rows={[
              ["Topic", callback?.topic ?? "none"],
              ["Lands on", callback?.landing?.text.slice(0, 60) ?? "nothing"],
              ["Near-miss", callback?.nearMiss ?? "none planted"],
            ]}
            note={item.explanation}
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <LoomEntrance key={entranceRun} onDone={() => setView("archive")} />
      ) : null}
      {view === "reverse" ? <ReverseLoom round={reverseRound} /> : null}
      {view === "decode" ? <DecodeBench cards={decodeCards} /> : null}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * The Polarity Chamber
 * ------------------------------------------------------------------ */

const POLARITY_VIEWS = ["chamber", "entrance", "assay"] as const;
const POLARITY_PHASES: PolarityPhase[] = ["statement", "inverted", "refused"];

/** Stand-in answers, so the real reader decides how hard the push reads. */
const PUSHES = [
  { key: "credited", label: "the credited negation" },
  { key: "polar", label: "the polar opposite" },
  { key: "short", label: "not far enough" },
  { key: "none", label: "nothing yet" },
] as const;
type PushKey = (typeof PUSHES)[number]["key"];

/**
 * Negation Station is not in SEED_ACTIVITIES: it predates the content pipeline
 * and is deliberately never re-seeded, so its plates come from the world's own
 * verbatim extract of the seed migration.
 */
function PolarityPanel() {
  const [view, setView] = useState<(typeof POLARITY_VIEWS)[number]>("chamber");
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<PolarityPhase>("statement");
  const [pushKey, setPushKey] = useState<PushKey>("credited");
  const [entranceRun, setEntranceRun] = useState(0);

  const plate = PLATES[index];

  const response = useMemo(() => {
    if (!plate || pushKey === "none") return undefined;
    if (pushKey === "polar") return "No such case ever holds.";
    if (pushKey === "short") return "Most such cases still hold.";
    return plate.negation;
  }, [plate, pushKey]);

  const reading = useMemo(
    () => (plate && response ? readPush(plate, response) : null),
    [plate, response],
  );

  // Lab-only floor. The production chamber is passed real verdicts.
  const chips: Chip[] = useMemo(
    () =>
      PLATES.map((p, i) => ({
        order: p.order,
        level: i < index ? (i % 4 === 1 ? "half" : "full") : null,
      })),
    [index],
  );

  const assayRound = useMemo(() => buildAssay(PLATES), []);

  return (
    <>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={POLARITY_VIEWS}
          value={view}
          onChange={(v) => {
            setView(v);
            if (v === "entrance") setEntranceRun((r) => r + 1);
          }}
          label="Chamber view"
        />

        {view === "chamber" ? (
          <>
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Statement
              <select
                className="w-44 max-w-[50vw] truncate rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={index}
                onChange={(e) => {
                  setIndex(Number(e.target.value));
                  setPhase("statement");
                }}
              >
                {PLATES.map((p, i) => (
                  <option key={p.order} value={i}>
                    {p.order}. {p.statement.slice(0, 44)}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              Push
              <select
                className="rounded-md border border-border bg-card px-2 py-1 text-foreground"
                value={pushKey}
                onChange={(e) => setPushKey(e.target.value as PushKey)}
              >
                {PUSHES.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.label}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-xs text-muted-foreground">
              beam: <code>{plate?.measurable ? "measures" : "stamps"}</code> · push:{" "}
              <code>{reading?.push ?? "none"}</code>
            </span>

            <div className="ml-auto">
              <Tabs
                options={POLARITY_PHASES}
                value={phase}
                onChange={(v) => setPhase(v)}
                label="Plate"
              />
            </div>
          </>
        ) : null}
      </div>

      {view === "chamber" ? (
        <div className="grid gap-0 lg:grid-cols-[62fr_38fr]">
          <div>
            <PolarityStage plate={plate} phase={phase} reading={reading} chips={chips} />
          </div>
          <SignalBox
            title="Coach rail"
            level={plate.kind}
            rows={[
              ["Statement level", plate.statementLevel ?? "not on the scale"],
              ["Credited level", plate.negationLevel ?? "not on the scale"],
              ["Beam", plate.measurable ? "measures this item" : "stamps this item"],
            ]}
            note={plate.why}
          />
        </div>
      ) : null}

      {view === "entrance" ? (
        <PolarityEntrance key={entranceRun} onDone={() => setView("chamber")} />
      ) : null}
      {view === "assay" ? <Assay round={assayRound} /> : null}
    </>
  );
}

/**
 * The Coach's column. It stays on the module's warm surface in every world:
 * the Coach is the constant, the room changes. The real chat mounts here.
 */
function SignalBox({
  title,
  level,
  rows,
  note,
}: {
  title: string;
  level: string;
  rows: [string, string][];
  note: string;
}) {
  return (
    <aside className="border-l border-border bg-card px-7 py-8">
      <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
        {title}
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        The Coach chat mounts here. Shown for layout only in the lab.
      </p>

      <dl className="mt-8 space-y-4 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Question type</dt>
          <dd className="mt-1 text-foreground">{level}</dd>
        </div>
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">{k}</dt>
            <dd className="mt-1 text-foreground">{v}</dd>
          </div>
        ))}
        <div>
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Teaching note</dt>
          <dd className="mt-1 leading-relaxed text-muted-foreground">{note}</dd>
        </div>
      </dl>
    </aside>
  );
}

/* ------------------------------------------------------------------ *
 * The completion screen, and the indicator ledger on it
 * ------------------------------------------------------------------ */

const RUN_OUTCOMES = ["mixed", "clean", "outage"] as const;
type RunOutcome = (typeof RUN_OUTCOMES)[number];

/**
 * The last screen of a run, and the hardest one to reach: it needs an account,
 * an assignment and a finished attempt log, which is three things the lab
 * deliberately has none of.
 *
 * The verdicts here are a deterministic stand-in for a real run, not a
 * simulation of one. They exist so the ledger's arithmetic, grouping and copy
 * can be looked at across the three shapes a finished run actually takes: some
 * missed, none missed, and some never judged because the Coach was unreachable.
 */
function CompletionPanel() {
  const [slug, setSlug] = useState<string>("conditional-rephrase");
  const [outcome, setOutcome] = useState<RunOutcome>("mixed");
  const activity = LAB_ACTIVITIES.find((a) => a.slug === slug) ?? LAB_ACTIVITIES[0];
  const items = useMemo(
    () => [...activity.items].sort((a, b) => a.order - b.order),
    [activity],
  );

  const verdicts = useMemo(() => {
    const v: Record<number, Verdict | null> = {};
    items.forEach((item, i) => {
      if (outcome === "clean") {
        v[item.order] = "correct";
        return;
      }
      // The outage shape: a handful of items the Coach never answered. They must
      // read as "not checked" on the score line and be absent from the ledger
      // entirely, because a dropped connection is not evidence about a word.
      if (outcome === "outage" && i % 9 === 4) {
        v[item.order] = null;
        return;
      }
      v[item.order] = i % 4 === 0 ? "incorrect" : i % 6 === 1 ? "partial" : "correct";
    });
    return v;
  }, [items, outcome]);

  const score = scoreFor(verdicts, items.length);

  /**
   * The teacher's view of the same run. One "assignment", built here rather than
   * read, because the lab has no database and the point is the presentation.
   */
  const teacherRuns = useMemo((): AssignmentLedger[] => {
    const ledger = buildIndicatorLedger(activity.title, items, verdicts);
    if (!ledger) return [];
    return [
      {
        assignmentId: "lab",
        title: activity.title,
        status: "completed",
        startedAt: "2026-08-20T00:00:00.000Z",
        completedAt: "2026-08-21T00:00:00.000Z",
        resolved: Object.keys(verdicts).length,
        total: items.length,
        ledger,
      },
    ];
  }, [activity.title, items, verdicts]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-3">
        <Tabs
          options={LAB_ACTIVITIES.map((a) => a.slug)}
          value={slug}
          onChange={setSlug}
          label="Completion"
        />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">Run</span>
          <Tabs<RunOutcome>
            options={RUN_OUTCOMES}
            value={outcome}
            onChange={setOutcome}
            label="Outcome"
          />
        </div>
      </div>
      <div className="activity-centre px-4 py-8 md:px-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          <CompletionSummary
            title={activity.title}
            items={items}
            verdicts={verdicts}
            responses={{}}
            score={score}
            onPractice={() => {}}
            onRedrill={() => {}}
          />
        </div>
      </div>

      {/* The same ledger, as the teacher meets it on a student's dossier. That
          surface is behind admin auth AND needs a student who has done the work,
          so it is two gates away from being looked at; this is the only place it
          can be seen while it is being built. Presentation only -- the real panel
          reads the student's own attempt log. */}
      <div className="border-t border-border bg-[#f2efe9] px-4 py-8 md:px-8">
        <div className="mx-auto max-w-2xl">
          <p className="mb-3 text-xs uppercase tracking-[0.2em] text-black/45">
            On the student dossier
          </p>
          {teacherRuns.length > 0 ? (
            <IndicatorLedgerReport runs={teacherRuns} families={familiesAcrossRuns(teacherRuns)} />
          ) : (
            <p className="text-sm text-black/60">
              Nothing to show: this Activity has no family map, so the dossier renders no block.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * Read, Recall, Colour: a whole SECTION
 * ------------------------------------------------------------------ */

/**
 * The section screen, driven by the real cursor.
 *
 * `SectionRunner` needs a signed-in student and an assignment row carrying the
 * snapshot, so the screen she spends a whole 20-minute drill on could not be
 * looked at once while it was built -- the same gap that hid the v1 recall
 * screen until this lab existed. This panel runs the real machine from
 * `section.ts` against the real seeded content and skips only the persistence,
 * which is the one part that needs a database.
 */
/**
 * The Report Card, against the trial run's own numbers.
 *
 * The card is only reachable behind a signed-in student who has finished a
 * twenty-five minute recorded section and waited for the grader, which made it
 * the least-looked-at screen in the product and is how it shipped printing a
 * raw percentage as its hero directly under a docstring forbidding exactly
 * that. The fixture below is the PT102.S3 trial run: 91% mean Coverage, 17 of
 * 22 at the standard, one deliberate recite, one stimulus with seven seconds of
 * dead air, four uncoloured.
 *
 * The Clip button appears and does nothing here on purpose. There is no
 * recording behind a fixture, and a lab that faked one would be the one place
 * a broken player could hide.
 */
function ReportPanel() {
  const [attempt, setAttempt] = useState<"clean" | "faults" | "partial">("faults");

  const grade = useMemo(() => makeLabGrade(attempt), [attempt]);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={["clean", "faults", "partial"] as const}
          value={attempt}
          onChange={(v) => setAttempt(v)}
          label="Run"
        />
        <p className="text-xs text-muted-foreground">
          clean: everything at the standard · faults: the trial run · partial: stimuli we could not
          mark
        </p>
      </div>
      <div className="px-4 py-10">
        <SectionReportCard
          grade={grade}
          /*
           * The lab has no database, so the model runs are named rather than
           * looked up. The player button appears and does nothing, which is the
           * point: a lab that faked a working player would be the one place a
           * broken one could hide.
           *
           * The walkthrough is different, and is real text rather than a stub.
           * It is the part a student actually reads, it is the part most likely
           * to look wrong at some width or some length, and a lab that showed
           * the buttons but not the document would be checking the half that
           * matters least.
           */
          loadModelRuns={async () =>
            Object.fromEntries(
              grade.stimuli.map((st) => [
                st.slug,
                {
                  audio: { bucket: "model-runs", path: `${st.slug}.mp3` },
                  walkthrough:
                    "> Ace Manufacturing's consultant proposes that we reassign staff so " +
                    "that all employees are doing both what they like to do and what they " +
                    "do well.\n\n" +
                    "So a management consultant is telling us how to run the company, and " +
                    "the idea is to move people around so they are doing the things they " +
                    "like and the things they are good at. Think about McKinsey walking " +
                    "into Amazon and saying, put the people who like driving on the " +
                    "delivery routes.\n\n" +
                    "> This, she says, will \"increase productivity by fully exploiting " +
                    "our available resources.\"\n\n" +
                    "So her claim is that productivity goes up because you are getting the " +
                    "absolute most out of everybody. Well, what if exploit is doing two " +
                    "jobs in this argument? Getting the most out of something, and taking " +
                    "advantage of someone, are not the same word twice.",
                },
              ]),
            )
          }
        />
      </div>
    </div>
  );
}

/**
 * A fortnight of runs, which is the first thing in the product that is about
 * her rather than about one sitting.
 *
 * Drawn here because it needs a pile of Report Cards to mean anything, and a
 * pile only exists after two weeks of real use. Without a lab panel the first
 * look at it would be the first student who reached it.
 */
function RunsPanel() {
  const grades = useMemo(() => {
    const sections = ["PT102.S3", "PT105.S2", "PT134.S3"];
    // Climbing, the way a fortnight of this is supposed to look, with the odd
    // bad night in it.
    const coverage = [62, 71, 68, 77, 74, 83, 86, 79, 88, 91];
    return coverage.map((mean, i) => {
      const base = makeLabGrade(i % 3 === 2 ? "clean" : "faults");
      return {
        ...base,
        assignment_id: `run-${i}`,
        attempt_no: i % 4 === 3 ? 2 : 1,
        source_section: sections[i % 3],
        graded_at: new Date(Date.UTC(2026, 7, 21 + i, 19, 0, 0)).toISOString(),
        section: {
          ...base.section,
          mean_coverage: mean,
          total_seconds: 1900 - i * 60,
          within_goal: mean > 80,
          read_matched_count: Math.max(0, Math.round((mean / 100) * 6) - 1),
          stimuli_graded: 6,
        },
      };
    });
  }, []);

  return (
    <div className="px-6 py-10">
      <div className="mx-auto max-w-3xl">
        <SectionRunHistory grades={grades} heading="How it has been going" />
      </div>
    </div>
  );
}

/** The trial run's own shape, with the two other states worth looking at. */
function makeLabGrade(kind: "clean" | "faults" | "partial"): SectionGrade {
  // `over.slug` is the stimulus NUMBER, not the slug. Spread last it would
  // overwrite the slug it was meant to build, and the run history would then
  // look up Details for a stimulus called "7" and find none.
  const stim = ({ slug: n, ...over }: Partial<SectionStimulusGrade>): SectionStimulusGrade => ({
    slug: `PT102_S3_Q${n ?? "1"}`,
    carried: 20,
    total: 21,
    percent: 95,
    band: "at-the-standard",
    missed: [],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    readGiven: true,
    readMatches: true,
    dead_air_seconds: 0.4,
    spoken:
      "so the director says their consultant wants people moved around so everyone is doing what they like and what they are good at",
    recall_window_ms: { start: 12000, end: 48000 },
    stimulus_text:
      "Ace Manufacturing's consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well. This, she says, will \"increase productivity by fully exploiting our available resources.\"",
    the_read: "What if exploit is doing two jobs in this argument?",
    readReason: "She said the consultant may be assuming everyone wants to move, which is a different move from the one the argument turns on.",
    nextTime:
      "Say the quantifier on purpose as you read: all employees, not the staff. It is the one word this argument leans on.",
    ...over,
  });

  const stimuli: SectionStimulusGrade[] =
    kind === "clean"
      ? Array.from({ length: 6 }, (_, i) => stim({ slug: String(i + 1) }))
      : [
          stim({
            slug: "1",
            carried: 20,
            total: 21,
            percent: 95,
            missed: ["This applies to all employees."],
            readMatches: false,
            lines: [
              {
                n: 1,
                text: "Ace Manufacturing's consultant proposes that we reassign staff so that all employees are doing both what they like to do and what they do well.",
                spoken: "so the director says their consultant wants people moved around so everyone is doing what they like and what they are good at",
                startMs: 12000,
                endMs: 26000,
                verdict: "partial",
                note: "Dropped that it applies to all employees; you said everyone, which is close, but the staff being reassigned was every employee.",
                carried: ["A consultant is proposing this.", "Staff would be reassigned.", "People would do what they like and what they do well."],
                dropped: ["This applies to all employees."],
              },
              {
                n: 2,
                text: "This, she says, will \"increase productivity by fully exploiting our available resources.\"",
                spoken: "and she thinks that makes the place more productive because you get the most out of everyone",
                startMs: 26000,
                endMs: 40000,
                verdict: "strong",
                note: "",
                carried: ["This is the conclusion.", "Productivity would increase.", "The reason is fully exploiting resources."],
                dropped: [],
              },
            ],
            recall: { verdict: "partial", note: "The recall kept the proposal and the claim, and lost the quantifier again." },
            bigMisses: ["all employees"],
          }),
          stim({ slug: "2", nextTime: "", missed: [], carried: 21, percent: 100 }),
          stim({
            slug: "7",
            carried: 14,
            total: 19,
            percent: 74,
            band: "nearly-there",
            coloured: false,
            readGiven: false,
            readMatches: false,
            missed: ["The figure is an average.", "This is a contrast."],
          }),
          stim({
            slug: "13",
            carried: 21,
            total: 21,
            percent: 100,
            reciting: true,
            spoken: "the director of ace manufacturing company says our management consultant proposes that we reassign staff",
          }),
          stim({
            slug: "15",
            carried: 12,
            total: 21,
            percent: 57,
            band: "thin",
            dead_air_seconds: 7,
            missed: ["The study ran for four years.", "The nurses were in Sweden."],
            readGiven: true,
            readMatches: false,
          }),
          stim({
            slug: "19",
            carried: 15,
            total: 20,
            percent: 75,
            band: "nearly-there",
            listing: true,
            colourSpecific: false,
            missed: ["This is the reason given."],
          }),
        ];

  const ungraded =
    kind === "partial"
      ? [stim({ slug: "22", carried: 0, total: 18, percent: 0, band: "lost-it", ungraded: "judge timed out", spoken: "" })]
      : [];

  const graded = stimuli.length;
  return {
    assignment_id: "lab",
    attempt_no: kind === "partial" ? 2 : 1,
    student_id: "lab",
    source_section: "PT102.S3",
    transcript_engine: "deepgram/nova-3",
    transcript_text: "",
    grader_version: 1,
    graded_at: new Date().toISOString(),
    stimuli: [...stimuli, ...ungraded],
    section: {
      accommodation: "standard",
      audio_bucket: "drill-recordings",
      audio_path: "lab/lab.webm",
      goal_minutes: 25,
      total_seconds: kind === "clean" ? 1294 : 1294,
      within_time: true,
      within_goal: kind === "clean",
      mean_coverage: kind === "clean" ? 95 : 83,
      stimuli_graded: graded,
      reciting_count: kind === "clean" ? 0 : 1,
      listing_count: kind === "clean" ? 0 : 1,
      uncoloured_count: kind === "clean" ? 0 : 1,
      read_given_count: kind === "clean" ? graded : graded - 1,
      read_matched_count: kind === "clean" ? graded : graded - 2,
      no_read_count: kind === "clean" ? 0 : 1,
      read_aloud_words: kind === "clean" ? 0 : 214,
      chunks_read_aloud: kind === "clean" ? 0 : 3,
      ungraded_count: ungraded.length,
      complete: ungraded.length === 0,
      worst_dead_air_seconds: kind === "clean" ? 1.1 : 7,
      dead_air_threshold_seconds: 4,
      decoy_failures: kind === "clean" ? 0 : 1,
      clock: {},
    },
  };
}

function SectionPanel() {
  const [slug, setSlug] = useState("read-recall-colour-pt105-s2");
  const row = SEED_ACTIVITIES.find((a) => a.slug === slug);
  const run = useMemo(
    () => (row ? buildSectionRun(row.items, row.source_section, row.time_goal_minutes) : null),
    [row],
  );
  const [cursor, setCursor] = useState<SectionCursor>(() => startCursor());
  /*
   * The rail's four children, the ready beat and the confirmation, all drawn
   * here on purpose.
   *
   * The header declared three grid columns and had four children from the day
   * the clock shipped, so "Leave" wrapped to a second row and the rail grew
   * from 46px to 96px. It was live for days on the drill's only screen, because
   * the lab rendered the stage without a clock or a way out and nobody ever saw
   * the version a student sees.
   */
  const [moment, setMoment] = useState<"running" | "ready beat" | "paused" | "finishing">(
    "running",
  );
  const beat = moment === "ready beat";
  /*
   * The break, which is a whole screen a student can reach and nobody would
   * otherwise look at. The lab exists because the version she sees went days
   * without being seen; a moment left out of this list is a moment back in that
   * position.
   */
  const paused = moment === "paused";
  const [confirming, setConfirming] = useState(false);

  useEffect(() => setCursor(startCursor()), [slug]);

  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== "Space") return;
      e.preventDefault();
      setCursor((at) => advanceCursor(run, at) ?? at);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run]);

  if (!run) {
    return <p className="px-6 py-8 text-sm text-zinc-500">No section Activity in the seed content.</p>;
  }
  const stimulus = run.stimuli[Math.min(cursor.item, run.stimuli.length - 1)];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
        <Tabs
          options={SEED_ACTIVITIES.filter((a) => a.mode === "section").map((a) => a.slug)}
          value={slug}
          onChange={(v) => setSlug(v)}
          label="Section"
        />
        <Tabs
          options={run.stimuli.map((_, i) => String(i + 1))}
          value={String(cursor.item + 1)}
          onChange={(v) => setCursor({ item: Number(v) - 1, phase: "working" })}
          label="Stimulus"
        />
        <Tabs
          options={["running", "ready beat", "paused", "finishing"] as const}
          value={moment}
          onChange={(v) => setMoment(v)}
          label="Moment"
        />
        <span className="text-xs text-zinc-500">
          {cursor.phase} · press space
        </span>
      </div>
      {moment === "finishing" ? (
        /*
         * The handover, which is a nine hundred millisecond CSS transition and
         * therefore the single hardest thing in this feature to look at: it
         * happens once, at the end of a twenty-five minute run, and then the
         * Report Card replaces it.
         */
        <div className="ac-section is-finishing">
          <main className="ac-section-field">
            <div className="ac-section-paper">
              <div className="ac-section-body">
                <p className="ac-section-finished">
                  Section finished.
                  <span>{run.stimuli.length} stimuli, end to end. Your Report Card comes next.</span>
                </p>
              </div>
            </div>
          </main>
        </div>
      ) : (
      <SectionStage
        stimulus={stimulus}
        phase={cursor.phase}
        stimulusNumber={cursor.item + 1}
        totalStimuli={run.stimuli.length}
        elapsedSeconds={beat ? 0 : 754}
        /* The real run passes both, and the lab exists to be looked at: without
           them the heading and the goal beside the clock are the two things on
           this surface nobody can see here. */
        sectionName={run.sourceSection ?? undefined}
        goalSeconds={run.timeGoalMinutes.standard * 60}
        countdown={beat ? 3 : null}
        paused={paused}
        onPause={beat ? undefined : () => setMoment("paused")}
        onResume={() => setMoment("running")}
        // No microphone in the lab, so the bar mounts and stays flat. That is
        // exactly what a student with a dead input sees, which is the reason
        // the indicator exists and the one state worth being able to look at.
        getStream={() => null}
        onExit={() => setConfirming(true)}
        confirmingExit={confirming}
        onConfirmExit={() => setConfirming(false)}
        onCancelExit={() => setConfirming(false)}
        /* The same act as the Space handler above. Without it the stage never
           draws the on-screen button, so the phone's only way to advance was
           the one control in the drill nobody could look at. */
        onAdvance={() => setCursor((at) => advanceCursor(run, at) ?? at)}
      />
      )}
    </div>
  );
}

