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
import "@/features/activity-centre/activity-centre.css";

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
  { key: "switchyard", label: "The Switchyard" },
  { key: "specimen-lab", label: "The Specimen Lab" },
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

      {world === "switchyard" ? <SwitchyardPanel /> : <SpecimenLabPanel />}
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
