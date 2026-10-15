import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { BOOTCAMP_TOPICS, findTopic } from "./topicRegistry";
import { useStudentTopicDetail } from "./hooks/useBootcampMetrics";
import { supabase } from "@/integrations/supabase/client";
import { formatRelativeShort } from "@/lib/time";
import { QueryErrorCard } from "./QueryErrorCard";

// Tab 3: Student Detail (per student, per topic). AC #4.
// One tab per topic the student has any progress on. The user lands on the
// topic they clicked through from BootcampDetail, but can switch to any
// other topic without leaving the page.

interface StudentMeta {
  userId: string;
  classId: string | null;
  displayName: string;
}

function useStudentMeta(userId: string | undefined) {
  const [meta, setMeta] = useState<StudentMeta | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      const studentRes = await supabase
        .from("students")
        .select("user_id, class_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (studentRes.error) {
        setError(studentRes.error.message);
        return;
      }
      const classId = studentRes.data?.class_id ?? null;
      let displayName = "Student";
      if (classId) {
        const profileRes = await supabase
          .from("profiles")
          .select("display_name")
          .eq("class_id", classId)
          .maybeSingle();
        if (cancelled) return;
        if (profileRes.data?.display_name) {
          displayName = profileRes.data.display_name;
        }
      }
      setMeta({ userId, classId, displayName });
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { meta, error };
}

export function StudentBootcampDetail() {
  const { topicId, studentId } = useParams<{
    topicId: string;
    studentId: string;
  }>();
  const initialTopic = findTopic(topicId);
  const [activeTopicId, setActiveTopicId] = useState(initialTopic?.id ?? "");
  const activeTopic = useMemo(() => findTopic(activeTopicId), [activeTopicId]);

  const { meta } = useStudentMeta(studentId);
  const detailQ = useStudentTopicDetail(studentId, activeTopic);

  if (!initialTopic) {
    return (
      <div className="px-6 py-6">
        <Link
          to="/teacher/bootcamps"
          className="inline-flex items-center gap-1 text-sm text-black/55 hover:text-black"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all bootcamps
        </Link>
        <p className="mt-3 text-sm text-black/55">Unknown topic.</p>
      </div>
    );
  }

  // Null, not 0, when there is nothing real to compute from: a missing number
  // renders as "not available", never as a fabricated zero.
  const overallPct = (() => {
    const d = detailQ.data;
    if (!d || !activeTopic) return null;
    const chapterPct =
      (d.sectionsViewed.length / Math.max(activeTopic.chapterSectionCount, 1)) *
      100;
    const drillPct = d.drillStats.length
      ? d.drillStats.reduce((sum, r) => sum + r.accuracyPct, 0) /
        d.drillStats.length
      : 0;
    const flashPct = d.flashcardStats.total
      ? (d.flashcardStats.reviewed / d.flashcardStats.total) * 100
      : 0;
    return Math.round((chapterPct + drillPct + flashPct) / 3);
  })();

  return (
    <div className="px-6 py-6 max-w-5xl mx-auto space-y-6">
      <Link
        to={`/teacher/bootcamps/${initialTopic.id}`}
        className="inline-flex items-center gap-1 text-xs text-black/55 hover:text-black"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to {initialTopic.name}
      </Link>

      <header className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          {meta?.displayName ?? "Student"}
        </h2>
        <p className="text-sm text-black/55">
          Topic progress across every bootcamp this student has touched.
        </p>
      </header>

      <nav
        className="flex flex-wrap gap-2 border-b border-black/12"
        aria-label="Topic tabs"
      >
        {BOOTCAMP_TOPICS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setActiveTopicId(t.id)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm transition-colors ${
              activeTopicId === t.id
                ? "border-teacher-accent text-teacher-accent-strong"
                : "border-transparent text-black/55 hover:text-black"
            }`}
          >
            {t.name}
          </button>
        ))}
      </nav>

      {!activeTopic ? null : (
        <div className="space-y-6">
          {detailQ.isError ? (
            <QueryErrorCard onRetry={() => detailQ.refetch()} />
          ) : (
            <section className="rounded-xl border border-black/12 bg-white/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-black/55">
                  Overall {activeTopic.name} progress
                </h3>
                <span className="text-2xl font-semibold text-[#11181c]">
                  {overallPct === null ? "·" : `${overallPct}%`}
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/40">
                <div
                  className="h-full bg-teacher-accent transition-all"
                  style={{ width: `${overallPct ?? 0}%` }}
                  aria-label={
                    overallPct === null
                      ? "Overall progress not available"
                      : `Overall progress ${overallPct} percent`
                  }
                />
              </div>
              <p className="mt-2 text-xs text-black/45">
                Last active:{" "}
                {!detailQ.data
                  ? "·"
                  : detailQ.data.lastActivityIso
                    ? formatRelativeShort(detailQ.data.lastActivityIso)
                    : "never"}
              </p>
            </section>
          )}

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black/55">
              Chapter
            </h3>
            {detailQ.isLoading ? (
              <p className="text-sm text-black/45">Loading.</p>
            ) : detailQ.isError ? (
              <QueryErrorCard onRetry={() => detailQ.refetch()} />
            ) : detailQ.data && detailQ.data.sectionsViewed.length === 0 ? (
              <p className="text-sm text-black/45">No sections opened yet.</p>
            ) : (
              <ul className="space-y-1.5">
                {activeTopic.chapterSections.map((section) => {
                  const view = detailQ.data?.sectionsViewed.find(
                    (s) => s.section_id === section.id,
                  );
                  return (
                    <li
                      key={section.id}
                      className="flex items-center justify-between rounded-md border border-black/12 bg-white/30 px-3 py-2 text-sm"
                    >
                      <span className="text-[#11181c]">{section.title}</span>
                      <span className="text-xs text-black/55">
                        {view
                          ? `viewed ${formatRelativeShort(view.last_viewed_at)}`
                          : "not yet"}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black/55">
              Drills
            </h3>
            {detailQ.isLoading ? (
              <p className="text-sm text-black/45">Loading.</p>
            ) : detailQ.isError ? (
              <QueryErrorCard onRetry={() => detailQ.refetch()} />
            ) : detailQ.data &&
              detailQ.data.drillStats.every((d) => d.attempts === 0) ? (
              <p className="text-sm text-black/45">
                No drill attempts recorded.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-black/12">
                <table className="w-full text-sm">
                  <thead className="bg-white/35 text-left text-[11px] uppercase tracking-wider text-black/55">
                    <tr>
                      <th className="px-3 py-2 font-medium">Drill</th>
                      <th className="px-3 py-2 font-medium">Attempts</th>
                      <th className="px-3 py-2 font-medium">Correct</th>
                      <th className="px-3 py-2 font-medium">Accuracy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detailQ.data?.drillStats.map((row) => (
                      <tr
                        key={row.attemptMode}
                        className="border-t border-black/12"
                      >
                        <td className="px-3 py-2 text-[#11181c]">{row.label}</td>
                        <td className="px-3 py-2 text-black/60">
                          {row.attempts}
                        </td>
                        <td className="px-3 py-2 text-black/60">
                          {row.correct}
                        </td>
                        <td className="px-3 py-2 text-black/60">
                          {row.attempts ? `${row.accuracyPct}%` : "No graded attempts"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black/55">
              Flashcards
            </h3>
            {detailQ.isLoading ? (
              <p className="text-sm text-black/45">Loading.</p>
            ) : detailQ.isError ? (
              <QueryErrorCard onRetry={() => detailQ.refetch()} />
            ) : detailQ.data && detailQ.data.flashcardStats.reviewed === 0 ? (
              <p className="text-sm text-black/45">No reviews recorded.</p>
            ) : (
              <dl className="grid gap-3 sm:grid-cols-4 text-sm">
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-black/45">
                    Reviewed
                  </dt>
                  <dd className="mt-0.5 font-semibold text-[#11181c]">
                    {detailQ.data
                      ? `${detailQ.data.flashcardStats.reviewed} / ${detailQ.data.flashcardStats.total}`
                      : "·"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-black/45">
                    Mastery
                  </dt>
                  <dd className="mt-0.5 font-semibold text-[#11181c]">
                    {detailQ.data ? `${detailQ.data.flashcardStats.masteryPct}%` : "·"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-black/45">
                    Due now
                  </dt>
                  <dd className="mt-0.5 font-semibold text-[#11181c]">
                    {detailQ.data ? detailQ.data.flashcardStats.dueCount : "·"}
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] uppercase tracking-wider text-black/45">
                    Avg interval
                  </dt>
                  <dd className="mt-0.5 font-semibold text-[#11181c]">
                    {detailQ.data
                      ? `${detailQ.data.flashcardStats.avgIntervalDays}d`
                      : "·"}
                  </dd>
                </div>
              </dl>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-black/55">
              Playground
            </h3>
            <p className="text-sm text-black/45">
              Playground is ungraded. Session-count tracking lands when the
              playground_sessions table is added.
            </p>
          </section>
        </div>
      )}
    </div>
  );
}
