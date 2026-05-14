import { Link } from "react-router-dom";
import { Flame } from "lucide-react";
import type { BootcampTopicDef } from "./topicRegistry";
import type { TopicAggregate } from "./hooks/useBootcampMetrics";

interface Props {
  topic: BootcampTopicDef;
  metrics?: TopicAggregate;
  loading?: boolean;
}

function pct(n: number | undefined): string {
  return typeof n === "number" ? `${n}%` : "·";
}

export function BootcampCard({ topic, metrics, loading }: Props) {
  return (
    <Link
      to={`/teacher/bootcamps/${topic.id}`}
      className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/40 p-5 transition-colors hover:border-amber-500/40 hover:bg-zinc-900/60"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-amber-300">
            <Flame className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Topic bootcamp
            </span>
          </div>
          <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-zinc-100">
            {topic.name}
          </h3>
          <p className="mt-1 text-sm text-zinc-400 line-clamp-2">{topic.blurb}</p>
        </div>
        <span className="rounded-full border border-zinc-800 px-2 py-0.5 text-[10px] uppercase tracking-wider text-zinc-400">
          {loading ? "loading" : "live"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
            Enrolled · Active
          </dt>
          <dd className="mt-0.5 font-semibold text-zinc-100">
            {loading
              ? "·"
              : `${metrics?.studentsEnrolled ?? 0} · ${metrics?.studentsActive ?? 0}`}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
            Avg completion
          </dt>
          <dd className="mt-0.5 font-semibold text-zinc-100">
            {loading ? "·" : pct(metrics?.avgChapterCompletionPct)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
            Drill accuracy
          </dt>
          <dd className="mt-0.5 font-semibold text-zinc-100">
            {loading ? "·" : pct(metrics?.avgDrillAccuracyPct)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-zinc-500">
            Flashcards reviewed
          </dt>
          <dd className="mt-0.5 font-semibold text-zinc-100">
            {loading
              ? "·"
              : `${metrics?.flashcardsReviewed ?? 0} / ${
                  topic.flashcardTotal
                } per student`}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-wider text-zinc-500 transition-colors group-hover:text-amber-300">
        <span>Open detail</span>
        <span aria-hidden>→</span>
      </div>
    </Link>
  );
}
