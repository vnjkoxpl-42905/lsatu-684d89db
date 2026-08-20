import { useMemo, useState } from "react";
import { SEED_ACTIVITIES } from "@/features/activity-centre/content";
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
import {
  ObservatoryStage,
  type SkyPhase,
} from "@/features/activity-centre/worlds/observatory/ObservatoryStage";
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
import { PLATES, readPush } from "@/features/activity-centre/worlds/polarity/polarity";
import "@/features/activity-centre/activity-centre.css";
import { ActivityIntro } from "@/features/activity-centre/components/ActivityIntro";
import { ActivityCard } from "@/features/activity-centre/components/ActivityCard";
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
  { key: "switchyard", label: "The Switchyard" },
  { key: "specimen-lab", label: "The Specimen Lab" },
  { key: "press", label: "The Press" },
  { key: "atelier", label: "The Argument Atelier" },
  { key: "chamber", label: "The Debate Chamber" },
  { key: "observatory", label: "The Signal Observatory" },
  { key: "loom", label: "The Loom" },
  { key: "polarity", label: "The Polarity Chamber" },
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
      {world === "switchyard" ? <SwitchyardPanel /> : null}
      {world === "specimen-lab" ? <SpecimenLabPanel /> : null}
      {world === "press" ? <PressPanel /> : null}
      {world === "atelier" ? <AtelierPanel /> : null}
      {world === "chamber" ? <ChamberPanel /> : null}
      {world === "observatory" ? <ObservatoryPanel /> : null}
      {world === "loom" ? <LoomPanel /> : null}
      {world === "polarity" ? <PolarityPanel /> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ *
 * The Activity Centre list
 * ------------------------------------------------------------------ */

/**
 * The list is behind auth and a feature flag like everything else here, so its
 * layout could not be looked at while building. Rendered from the seed content
 * in the same teaching order the page sorts by.
 */
function ListPanel() {
  const rows = [...SEED_ACTIVITIES]
    .sort((a, b) => librarySortIndex(a.slug) - librarySortIndex(b.slug))
    .map((a, i) => ({
      id: a.slug,
      title: a.title,
      subtitle: a.subtitle,
      items: a.items,
      status: i === 0 ? "in_progress" : i === 1 ? "completed" : "assigned",
      score: i === 1 ? 80 : null,
    }));
  return (
    <div className="activity-centre">
      <div className="mx-auto max-w-5xl">
        <header className="max-w-2xl">
          <h1 className="ac-display text-4xl text-foreground">Activities</h1>
          <p className="mt-2 text-[15px] text-muted-foreground">
            Coach-led skill exercises, ordered by how much text each one works on: a single word
            first, a whole passage last.
          </p>
        </header>
        <div className="mt-8 grid gap-3 md:grid-cols-2">
          {rows.map((a, i) => (
            <ActivityCard key={a.id} assignment={a as never} position={i + 1} onOpen={() => {}} />
          ))}
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
  const withExample = SEED_ACTIVITIES.filter((a) => a.instructions.worked_example);
  const [slug, setSlug] = useState(withExample[0].slug);
  const a = withExample.find((x) => x.slug === slug)!;
  return (
    <div>
      <div className="border-b border-border px-6 py-3">
        <Tabs
          options={withExample.map((x) => x.slug)}
          value={slug}
          onChange={setSlug}
          label="Activity"
        />
      </div>
      <div className="act-home">
        <ActivityIntro
          key={a.slug}
          title={a.title}
          subtitle={a.subtitle}
          instructions={a.instructions}
          onStart={() => {}}
          onExit={() => {}}
        />
      </div>
    </div>
  );
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

  // Lab-only seals: lit by which types this item's own relations cover.
  const seals = useMemo(
    () => ({
      conditional: !!reading?.drawn.includes("conditional"),
      causal: !!reading?.drawn.includes("causal"),
      comparative: !!reading?.drawn.includes("comparative"),
    }),
    [reading],
  );

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
              <ObservatoryStage
                signal={signal}
                phase={phase}
                reading={reading}
                seals={seals}
              />
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
          <dt className="text-xs uppercase tracking-wider text-muted-foreground">Level</dt>
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
