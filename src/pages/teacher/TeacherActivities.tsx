import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { BarChart3, ChevronDown, Play, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { useAdminActivities, useAssignActivity, ActivityResults } from "@/features/activity-centre";
import type { Activity } from "@/features/activity-centre";

interface StudentRow {
  user_id: string;
  display_name: string | null;
}

/** Admin: the Activity definition library + per-student assign. */
export default function TeacherActivities() {
  const { activities, loading, error } = useAdminActivities();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data, error: err } = await supabase
        .from("profiles")
        .select("class_id, display_name")
        .order("display_name", { ascending: true });
      if (err) {
        // Don't silently show an empty roster: the teacher could try to assign
        // to nobody. Surface it so they refresh instead.
        console.error("[activity:students:list] failed", err);
        setStudents([]);
        toast.error("Could not load the student list. Refresh before assigning.");
        return;
      }
      // profiles.class_id = user_id invariant.
      setStudents((data || []).map((r: { class_id: string; display_name: string | null }) => ({
        user_id: r.class_id,
        display_name: r.display_name,
      })));
    };
    void load();
  }, []);

  return (
    <div className="bg-zinc-950 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-300" />
          <h1 className="text-lg font-semibold text-zinc-100">Activities</h1>
        </div>
        <p className="mt-1 text-sm text-zinc-400">
          Coach-led skill exercises. Assign one to a student and they work it with immediate feedback.
        </p>

        {loading && <p className="mt-8 text-sm text-zinc-500">Loading activities…</p>}
        {error && <p className="mt-8 text-sm text-rose-400">Could not load activities: {error}</p>}
        {!loading && !error && activities.length === 0 && (
          <p className="mt-8 text-sm text-zinc-500">
            No activities yet. The Negation Station seed appears here once the database migration is applied.
          </p>
        )}

        <div className="mt-6 space-y-3">
          {activities.map((a) => (
            <ActivityCard
              key={a.id}
              activity={a}
              students={students}
              open={openId === a.id}
              onToggle={() => setOpenId((cur) => (cur === a.id ? null : a.id))}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  students,
  open,
  onToggle,
}: {
  activity: Activity;
  students: StudentRow[];
  open: boolean;
  onToggle: () => void;
}) {
  const navigate = useNavigate();
  const { assign, assigning } = useAssignActivity();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tab, setTab] = useState<"assign" | "results">("assign");
  const [resultsKey, setResultsKey] = useState(0);

  const nameFor = (studentId: string) =>
    students.find((s) => s.user_id === studentId)?.display_name || "Unnamed student";

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const selectedIds = useMemo(() => [...selected], [selected]);

  const handleAssign = async () => {
    if (selectedIds.length === 0) return;
    let ok = 0;
    let emailFailures = 0;
    for (const studentId of selectedIds) {
      const res = await assign(activity, studentId, { notify: true });
      if (res.ok) {
        ok += 1;
        if (res.emailOk === false) emailFailures += 1;
      } else {
        toast.error(res.error || "Assign failed");
      }
    }
    if (ok > 0) {
      const base = `Assigned ${activity.title} to ${ok} student${ok === 1 ? "" : "s"}`;
      if (emailFailures > 0) {
        toast.warning(`${base}, but email failed for ${emailFailures}. Classroom + alert still landed.`);
      } else {
        toast.success(`${base} — notified by email, classroom, and alert.`);
      }
      setSelected(new Set());
      setResultsKey((k) => k + 1);
    }
  };

  // Preview runs off the activity definition and writes nothing. It used to
  // assign to the teacher's own account, which put every activity he looked at
  // on his own Classroom's "Assigned to you" list and left it there.
  const handleTryIt = () => {
    navigate(`/activities/preview/${activity.id}`);
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50">
      <div className="flex items-center gap-2 p-4">
        <button type="button" onClick={onToggle} className="flex flex-1 items-center justify-between gap-4 text-left">
          <div>
            <p className="font-medium text-zinc-100">{activity.title}</p>
            <p className="text-xs text-zinc-500">
              {activity.subtitle} · {activity.items.length} items · {activity.item_format}
            </p>
          </div>
          <ChevronDown className={cn("h-4 w-4 text-zinc-500 transition-transform", open && "rotate-180")} />
        </button>
        <button
          type="button"
          onClick={handleTryIt}
          disabled={assigning}
          className="flex shrink-0 items-center gap-1.5 rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-medium text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"
        >
          <Play className="h-3 w-3" />
          Try it
        </button>
      </div>

      {open && (
        <div className="border-t border-zinc-800 p-4">
          <div className="mb-4 flex gap-1 rounded-lg bg-zinc-900 p-1 text-xs font-medium">
            <button
              type="button"
              onClick={() => setTab("assign")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                tab === "assign" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <Users className="h-3.5 w-3.5" /> Assign
            </button>
            <button
              type="button"
              onClick={() => setTab("results")}
              className={cn(
                "flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-1.5 transition-colors",
                tab === "results" ? "bg-zinc-800 text-zinc-100" : "text-zinc-400 hover:text-zinc-200",
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" /> Results
            </button>
          </div>

          {tab === "assign" ? (
            <>
              {students.length === 0 ? (
                <p className="text-xs text-zinc-500">No students found.</p>
              ) : (
                <div className="max-h-56 space-y-1 overflow-y-auto pr-1">
                  {students.map((s) => (
                    <label
                      key={s.user_id}
                      className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-zinc-800/50"
                    >
                      <Checkbox checked={selected.has(s.user_id)} onCheckedChange={() => toggle(s.user_id)} />
                      <span className="text-sm text-zinc-200">{s.display_name || "Unnamed student"}</span>
                    </label>
                  ))}
                </div>
              )}
              <Button
                onClick={handleAssign}
                disabled={assigning || selectedIds.length === 0}
                className="mt-4 bg-emerald-600 text-white hover:bg-emerald-500"
              >
                {assigning ? "Assigning…" : `Assign${selectedIds.length ? ` (${selectedIds.length})` : ""}`}
              </Button>
            </>
          ) : (
            <ActivityResults activityId={activity.id} nameFor={nameFor} reloadKey={resultsKey} />
          )}
        </div>
      )}
    </div>
  );
}
