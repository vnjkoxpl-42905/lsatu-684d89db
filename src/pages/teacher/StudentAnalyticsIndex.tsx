import * as React from "react";
import { Link } from "react-router-dom";
import { ChevronRight, Search } from "lucide-react";
import { useHubStudents } from "@/hooks/useHubStudents";

/**
 * The sidebar's Student Analytics: pick a student, land on their analytics.
 * Admin-only (it sits under the /teacher route, which requires admin).
 */
export default function StudentAnalyticsIndex() {
  const { rows, loading: isLoading } = useHubStudents();
  const [search, setSearch] = React.useState("");
  const students = (rows ?? [])
    .filter((r) => r.role !== "admin")
    .filter((r) => !search.trim() || `${r.display_name ?? ""} ${r.email ?? ""}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => (b.last_seen_at ?? "").localeCompare(a.last_seen_at ?? ""));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 p-6">
      <header>
        <h1 className="font-serif text-4xl font-semibold text-slate-800">Student Analytics</h1>
        <p className="mt-2 text-sm text-slate-600">Pick a student to see their performance, tag priorities and every sitting they've done.</p>
      </header>
      <label className="relative block">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" aria-hidden />
        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a student" aria-label="Find a student"
          className="w-full rounded-xl border-2 border-black/10 bg-white py-2.5 pl-9 pr-3 text-sm" />
      </label>
      {isLoading ? <p role="status" className="text-sm text-slate-500">Loading students…</p> : (
        <ul className="overflow-hidden rounded-[20px] border-2 border-black/10 bg-white">
          {students.length === 0 && <li className="px-6 py-10 text-center text-sm text-slate-500">No students match.</li>}
          {students.map((s) => (
            <li key={s.class_id} className="border-b border-black/10 last:border-0">
              <Link to={`/teacher/students/${s.class_id}/analytics`} className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-slate-50">
                <span>
                  <span className="font-semibold text-slate-800">{s.display_name || s.email || "Unnamed student"}</span>
                  {s.email && s.display_name && <span className="block text-sm text-slate-500">{s.email}</span>}
                </span>
                <span className="flex items-center gap-3 text-sm text-slate-500">
                  {s.last_seen_at ? `Seen ${new Date(s.last_seen_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}` : "Not seen yet"}
                  <ChevronRight className="h-4 w-4" />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
