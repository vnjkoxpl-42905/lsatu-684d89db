import * as React from "react";
import { Link, NavLink, useParams } from "react-router-dom";
import { ArrowUpRight, BarChart3, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useHubStudents } from "@/hooks/useHubStudents";
import { StudentAnalyticsView } from "./students/DossierAnalytics";
import { StudentRunView } from "./students/DossierAnalyticsRun";

/**
 * Student Analytics, its own page in the classroom shell (admin-only).
 * A rail of students on the left; the chosen student's analytics fill the
 * rest. The student is in the address (/student-analytics/:studentId), so a
 * view can be reopened or shared with another admin.
 */
/** "Active 4h ago", the way the rail and the header say when a student was last here. */
export function lastActive(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return "Not active yet";
  const mins = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (mins < 2) return "Active now";
  if (mins < 60) return `Active ${mins}m ago`;
  const hours = Math.round(mins / 60);
  if (hours < 24) return `Active ${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `Active ${days}d ago`;
  return `Active ${new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}`;
}

export default function StudentAnalyticsPage() {
  const { studentId, runId } = useParams<{ studentId?: string; runId?: string }>();
  const { rows, loading } = useHubStudents();
  const [search, setSearch] = React.useState("");
  const students = (rows ?? [])
    // Active students only: an archived student keeps their records but leaves the list.
    .filter((r) => r.role !== "admin" && !r.archived_at)
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));
  const shown = students.filter((r) => !search.trim() || `${r.display_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()));
  const current = students.find((s) => s.class_id === studentId);
  const name = current?.display_name || current?.email || null;

  return (
    <div className="flex w-full items-start">
      <aside aria-label="Students" className="sticky top-0 flex h-[calc(100dvh-4rem)] w-64 shrink-0 flex-col border-r border-black/10 bg-white/60 lg:w-72">
        <div className="border-b border-black/10 p-4">
          <h1 className="font-serif text-2xl font-semibold text-slate-800">Students</h1>
          <label className="relative mt-3 block">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a student" aria-label="Find a student"
              className="w-full rounded-xl border-2 border-black/10 bg-white py-2 pl-9 pr-3 text-sm" />
          </label>
        </div>
        <nav className="flex-1 overflow-y-auto p-2" aria-label="Student list">
          {loading ? <p role="status" className="p-3 text-sm text-slate-500">Loading students…</p>
            : shown.length === 0 ? <p className="p-3 text-sm text-slate-500">No students match.</p>
            : shown.map((s) => (
              <NavLink key={s.class_id} to={`/student-analytics/${s.class_id}`}
                className={({ isActive }) => cn("mb-1 block rounded-xl px-3 py-2.5 transition-colors",
                  isActive || s.class_id === studentId ? "bg-slate-900 text-white" : "text-slate-800 hover:bg-black/5")}>
                <span className="block truncate text-sm font-semibold">{s.display_name || s.email || "Unnamed student"}</span>
                <span className={cn("block truncate text-xs", s.class_id === studentId ? "text-white/70" : "text-slate-500")}>
                  {lastActive(s.last_seen_at)}
                </span>
              </NavLink>
            ))}
        </nav>
      </aside>
      <main className="min-w-0 flex-1">
        {!studentId ? (
          <div className="flex flex-col items-center px-10 py-32 text-center text-slate-500">
            <BarChart3 className="mb-3 h-10 w-10" aria-hidden />
            <p className="text-lg font-semibold text-slate-700">Pick a student</p>
            <p className="mt-1 max-w-sm text-sm">Their performance, tag priorities and every sitting they've done open here.</p>
          </div>
        ) : runId ? (
          <StudentRunView studentId={studentId} studentName={name} runId={runId} backHref={`/student-analytics/${studentId}`} />
        ) : (
          <>
          <header className="mx-auto flex w-full max-w-6xl flex-wrap items-end justify-between gap-4 px-5 pt-6">
            <div>
              <h1 className="font-serif text-4xl font-semibold text-slate-900">{name || "Student"}</h1>
              {current?.email && current.display_name && <p className="mt-1 text-sm text-slate-500">{current.email}</p>}
              <p className="mt-2 text-sm font-medium text-slate-700">
                {lastActive(current?.last_seen_at)}
                {current?.last_seen_at && <span className="text-slate-500"> · {new Date(current.last_seen_at).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>}
              </p>
            </div>
            <Link to={`/teacher/students/${studentId}/overview`} className="inline-flex items-center gap-1.5 rounded-xl border-2 border-black/10 bg-white px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50">
              Open in workspace<ArrowUpRight className="h-4 w-4" />
            </Link>
          </header>
          <StudentAnalyticsView key={studentId} studentId={studentId} studentName={name} runHref={(id) => `/student-analytics/${studentId}/runs/${id}`} />
          </>
        )}
      </main>
    </div>
  );
}
