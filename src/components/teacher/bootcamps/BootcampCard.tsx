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
      className="group rounded-2xl border border-black/12 bg-white/30 p-5 transition-colors hover:border-teacher-accent/40 hover:bg-white/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 text-teacher-accent-strong">
            <Flame className="h-4 w-4" />
            <span className="text-[11px] uppercase tracking-wider font-semibold">
              Topic bootcamp
            </span>
          </div>
          <h3 className="mt-1.5 text-xl font-semibold tracking-tight text-[#11181c]">
            {topic.name}
          </h3>
          <p className="mt-1 text-sm text-black/55 line-clamp-2">{topic.blurb}</p>
        </div>
        <span className="rounded-full border border-black/12 px-2 py-0.5 text-[10px] uppercase tracking-wider text-black/55">
          {loading ? "loading" : "live"}
        </span>
      </div>

      <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-black/45">
            Enrolled · Active
          </dt>
          <dd className="mt-0.5 font-semibold text-[#11181c]">
            {loading
              ? "·"
              : `${metrics?.studentsEnrolled ?? 0} · ${metrics?.studentsActive ?? 0}`}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-black/45">
            Avg completion
          </dt>
          <dd className="mt-0.5 font-semibold text-[#11181c]">
            {loading ? "·" : pct(metrics?.avgChapterCompletionPct)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-black/45">
            Drill accuracy
          </dt>
          <dd className="mt-0.5 font-semibold text-[#11181c]">
            {loading ? "·" : pct(metrics?.avgDrillAccuracyPct)}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] uppercase tracking-wider text-black/45">
            Flashcards reviewed
          </dt>
          <dd className="mt-0.5 font-semibold text-[#11181c]">
            {loading
              ? "·"
              : `${metrics?.flashcardsReviewed ?? 0} / ${
                  topic.flashcardTotal
                } per student`}
          </dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between text-[11px] uppercase tracking-wider text-black/45 transition-colors group-hover:text-teacher-accent-strong">
        <span>Open detail</span>
        <span aria-hidden>→</span>
      </div>
    </Link>
  );
}
