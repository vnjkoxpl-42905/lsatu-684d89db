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

const PHASES: YardPhase[] = ["arrival", "routed", "flipped"];
const VIEWS = ["yard", "entrance", "sorting", "gallery"] as const;
type View = (typeof VIEWS)[number];

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
  // Trimmed: the student's clause keeps the opening and loses the qualifier.
  const words = credited.thenClause.text.split(/\s+/);
  if (words.length < 5) return null;
  return {
    ...credited,
    thenClause: { ...credited.thenClause, text: words.slice(0, Math.ceil(words.length / 2)).join(" ") },
  };
}

export default function ActivityLab() {
  const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;
  const [view, setView] = useState<View>("yard");
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
    <div className="activity-centre min-h-screen">
      <header className="flex flex-wrap items-center gap-4 overflow-hidden border-b border-border px-6 py-4">
        <div className="mr-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Activity Lab · dev only
          </p>
          <h1 className="ac-display text-xl text-foreground">The Switchyard</h1>
        </div>

        <div className="flex gap-1" role="group" aria-label="View">
          {VIEWS.map((v) => (
            <button
              key={v}
              onClick={() => {
                setView(v);
                if (v === "entrance") setEntranceRun((r) => r + 1);
              }}
              data-testid={`view-${v}`}
              className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                view === v
                  ? "bg-[hsl(var(--ac-emerald))] text-white"
                  : "border border-border bg-card text-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </header>

      {view === "yard" ? (
        <>
          <div className="flex flex-wrap items-center gap-4 border-b border-border px-6 py-3">
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

            <div className="ml-auto flex gap-1" role="group" aria-label="Yard phase">
              {PHASES.map((p) => (
                <button
                  key={p}
                  onClick={() => setPhase(p)}
                  data-testid={`phase-${p}`}
                  className={`rounded-md px-3 py-1.5 text-sm capitalize transition-colors ${
                    phase === p
                      ? "bg-[hsl(var(--ac-emerald))] text-white"
                      : "border border-border bg-card text-foreground hover:bg-muted"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

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
                  This item's credited answer is not in if-then form, so the yard has nothing to
                  route.
                </div>
              )}
            </div>

            {/* The signal box stays on the module's warm surface: the Coach is the
                constant, the room changes. The real Coach chat mounts here. */}
            <aside className="border-l border-border bg-card px-7 py-8">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Signal box
              </p>
              <p className="mt-3 text-sm text-muted-foreground">
                The Coach chat mounts here. Shown for layout only in the lab.
              </p>

              <dl className="mt-8 space-y-4 text-sm">
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">Level</dt>
                  <dd className="mt-1 text-foreground">{item.category}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Indicator
                  </dt>
                  <dd className="mt-1 text-foreground">{indicatorOf(item.explanation) ?? "none"}</dd>
                </div>
                <div>
                  <dt className="text-xs uppercase tracking-wider text-muted-foreground">
                    Teaching note
                  </dt>
                  <dd className="mt-1 leading-relaxed text-muted-foreground">{item.explanation}</dd>
                </div>
              </dl>
            </aside>
          </div>
        </>
      ) : null}

      {view === "entrance" ? (
        <SwitchyardEntrance key={entranceRun} onDone={() => setView("yard")} />
      ) : null}

      {view === "sorting" ? <SortingYard key={index} round={round} /> : null}

      {view === "gallery" ? <TriggerGallery levers={levers} /> : null}
    </div>
  );
}
