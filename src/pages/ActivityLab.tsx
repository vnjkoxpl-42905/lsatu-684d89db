import { useMemo, useState } from "react";
import { SEED_ACTIVITIES } from "@/features/activity-centre/content";
import { SwitchyardStage, type YardPhase } from "@/features/activity-centre/worlds/switchyard/SwitchyardStage";
import { indicatorOf, parseRouting } from "@/features/activity-centre/worlds/switchyard/routing";
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

export default function ActivityLab() {
  const conditional = SEED_ACTIVITIES.find((a) => a.slug === "conditional-rephrase")!;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<YardPhase>("arrival");

  const item = conditional.items[index];
  const routing = useMemo(() => parseRouting(item.credited_answers[0]), [item]);

  return (
    <div className="activity-centre min-h-screen">
      <header className="flex flex-wrap items-center gap-4 overflow-hidden border-b border-border px-6 py-4">
        <div className="mr-auto">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Activity Lab · dev only
          </p>
          <h1 className="ac-display text-xl text-foreground">The Switchyard</h1>
        </div>

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

        <div className="flex gap-1" role="group" aria-label="Yard phase">
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
      </header>

      <div className="grid min-h-[calc(100vh-81px)] gap-0 lg:grid-cols-[62fr_38fr]">
        <div>
          {routing ? (
            <SwitchyardStage
              statement={item.prompt}
              routing={routing}
              contrapositive={item.credited_answers[1] ?? ""}
              indicator={indicatorOf(item.explanation)}
              phase={phase}
            />
          ) : (
            <div className="p-10 text-sm text-muted-foreground">
              This item's credited answer is not in if-then form, so the yard has nothing to route.
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
              <dt className="text-xs uppercase tracking-wider text-muted-foreground">Indicator</dt>
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
    </div>
  );
}
