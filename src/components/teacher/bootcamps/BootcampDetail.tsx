import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { findTopic } from "./topicRegistry";
import {
  useBootcampStudents,
  useDrillBreakdown,
  type BootcampStudentRow,
} from "./hooks/useBootcampMetrics";
import { formatRelativeShort } from "@/lib/time";

type SortKey = "completion" | "accuracy" | "last_active";

function sortRows(rows: BootcampStudentRow[], by: SortKey): BootcampStudentRow[] {
  const copy = [...rows];
  switch (by) {
    case "completion":
      copy.sort((a, b) => b.completionPct - a.completionPct);
      break;
    case "accuracy":
      copy.sort((a, b) => b.drillAccuracyPct - a.drillAccuracyPct);
      break;
    case "last_active":
      copy.sort((a, b) => {
        const aT = a.lastActivityIso ?? "";
        const bT = b.lastActivityIso ?? "";
        return bT.localeCompare(aT);
      });
      break;
  }
  return copy;
}

// Tab 2: Bootcamp Detail (per topic). AC #3.
export function BootcampDetail() {
  const params = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const topic = findTopic(params.topicId);
  const [sortBy, setSortBy] = useState<SortKey>("last_active");

  const studentsQ = useBootcampStudents(topic);
  const breakdownQ = useDrillBreakdown(topic);

  const sortedStudents = useMemo(
    () => sortRows(studentsQ.data ?? [], sortBy),
    [studentsQ.data, sortBy],
  );

  if (!topic) {
    return (
      <div className="px-6 py-6">
        <Link
          to="/teacher/bootcamps"
          className="inline-flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all bootcamps
        </Link>
        <p className="mt-3 text-sm text-zinc-400">Unknown topic.</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <Link
          to="/teacher/bootcamps"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-100"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> All bootcamps
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              {topic.name}
            </h2>
            <p className="mt-1 text-sm text-zinc-400 max-w-2xl">{topic.blurb}</p>
          </div>
          <Link
            to={topic.topicPath}
            className="inline-flex items-center gap-1.5 rounded-md border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
          >
            Open student topic <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Drill breakdown
        </h3>
        {breakdownQ.isLoading ? (
          <p className="text-sm text-zinc-500">Loading drill stats.</p>
        ) : (breakdownQ.data ?? []).every((r) => r.attempts === 0) ? (
          <p className="text-sm text-zinc-500">No drill attempts recorded.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 text-left text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Drill</th>
                  <th className="px-3 py-2 font-medium">Attempts</th>
                  <th className="px-3 py-2 font-medium">Correct</th>
                  <th className="px-3 py-2 font-medium">Accuracy</th>
                </tr>
              </thead>
              <tbody>
                {(breakdownQ.data ?? []).map((row) => (
                  <tr
                    key={row.attemptMode}
                    className="border-t border-zinc-800/70 hover:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-100">
                      {row.label}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">{row.attempts}</td>
                    <td className="px-3 py-2 text-zinc-300">{row.correct}</td>
                    <td className="px-3 py-2 text-zinc-300">
                      {row.accuracyPct}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
            Students
          </h3>
          <label className="flex items-center gap-1.5 text-xs text-zinc-400">
            <span>Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortKey)}
              className="rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-100"
            >
              <option value="last_active">Last active</option>
              <option value="completion">Completion</option>
              <option value="accuracy">Accuracy</option>
            </select>
          </label>
        </div>
        {studentsQ.isLoading ? (
          <p className="text-sm text-zinc-500">Loading students.</p>
        ) : sortedStudents.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No student activity on {topic.name} yet.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-zinc-800">
            <table className="w-full text-sm">
              <thead className="bg-zinc-900/50 text-left text-[11px] uppercase tracking-wider text-zinc-400">
                <tr>
                  <th className="px-3 py-2 font-medium">Student</th>
                  <th className="px-3 py-2 font-medium">Completion</th>
                  <th className="px-3 py-2 font-medium">Drill accuracy</th>
                  <th className="px-3 py-2 font-medium">Attempts</th>
                  <th className="px-3 py-2 font-medium">Cards reviewed</th>
                  <th className="px-3 py-2 font-medium">Last active</th>
                </tr>
              </thead>
              <tbody>
                {sortedStudents.map((s) => (
                  <tr
                    key={s.userId}
                    onClick={() =>
                      navigate(
                        `/teacher/bootcamps/${topic.id}/students/${s.userId}`,
                      )
                    }
                    className="cursor-pointer border-t border-zinc-800/70 hover:bg-zinc-900/40"
                  >
                    <td className="px-3 py-2 font-medium text-zinc-100">
                      {s.displayName}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {s.completionPct}%
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {s.drillAccuracyPct}%
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {s.attemptsCount}
                    </td>
                    <td className="px-3 py-2 text-zinc-300">
                      {s.flashcardsReviewed}
                    </td>
                    <td className="px-3 py-2 text-zinc-400">
                      {s.lastActivityIso
                        ? formatRelativeShort(s.lastActivityIso)
                        : "never"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
