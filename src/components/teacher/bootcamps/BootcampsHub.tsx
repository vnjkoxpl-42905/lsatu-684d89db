import { Flame } from "lucide-react";
import { BOOTCAMP_TOPICS } from "./topicRegistry";
import { useTopicAggregate } from "./hooks/useBootcampMetrics";
import { BootcampCard } from "./BootcampCard";

// Tab 1: All Bootcamps. Grid of cards. AC #2.
export function BootcampsHub() {
  const sorted = [...BOOTCAMP_TOPICS].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const { data, isLoading, error } = useTopicAggregate(sorted);

  if (sorted.length === 0) {
    return (
      <div className="px-6 py-6">
        <h2 className="text-2xl font-semibold tracking-tight">Bootcamps</h2>
        <p className="mt-1 text-sm text-zinc-400">
          No bootcamps shipped yet. Topics show up here as they go live.
        </p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-5">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2 text-zinc-400">
          <Flame className="w-4 h-4" />
          <span className="text-[11px] uppercase tracking-wider font-semibold">
            Topic analytics
          </span>
        </div>
        <h2 className="text-2xl font-semibold tracking-tight">Bootcamps</h2>
        <p className="text-sm text-zinc-400">
          One row per shipped topic. Click a card to see per-student
          completion, drill accuracy, and flashcard review status.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-500/40 bg-rose-500/5 p-4 text-sm text-rose-200">
          Could not load bootcamp metrics. Try again in a moment.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {sorted.map((topic) => {
          const row = data?.find((d) => d.topicId === topic.id);
          return (
            <BootcampCard
              key={topic.id}
              topic={topic}
              metrics={row}
              loading={isLoading}
            />
          );
        })}
      </div>
    </div>
  );
}
