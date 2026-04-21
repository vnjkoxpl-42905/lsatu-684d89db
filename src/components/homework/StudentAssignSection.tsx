import * as React from "react";
import { toast } from "sonner";
import { Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { useAdminAssignments } from "@/hooks/useAdminAssignments";
import type { HomeworkSet } from "@/hooks/useHomeworkSets";

interface Student {
  class_id: string;
  user_id: string | null;
  display_name: string | null;
}

interface StudentAssignSectionProps {
  set: HomeworkSet;
}

export default function StudentAssignSection({ set }: StudentAssignSectionProps) {
  const [students, setStudents] = React.useState<Student[]>([]);
  const [loadingStudents, setLoadingStudents] = React.useState(true);
  const [selected, setSelected] = React.useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = React.useState(false);

  const { assignments, assignToStudents, refresh: refreshAssignments } =
    useAdminAssignments({ setId: set.id });

  React.useEffect(() => {
    const loadStudents = async () => {
      setLoadingStudents(true);
      // TODO: drop `as any` after next supabase type regen
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("class_id, display_name")
        .order("display_name", { ascending: true });
      if (error) {
        console.error("[homework:students:list] failed", { error });
        setStudents([]);
      } else {
        // profiles.class_id is the student's class_id. profiles keys to user via class_id=user_id invariant.
        setStudents(
          (data || []).map((r: { class_id: string; display_name: string | null }) => ({
            class_id: r.class_id,
            user_id: r.class_id, // class_id = user_id invariant (F1.10 territory)
            display_name: r.display_name,
          })),
        );
      }
      setLoadingStudents(false);
    };
    void loadStudents();
  }, []);

  // Map student_id -> active assignment status (for "already assigned" badge)
  const activeAssignments = React.useMemo(() => {
    const map = new Map<string, "assigned" | "in_progress" | "completed">();
    for (const a of assignments) {
      const prev = map.get(a.student_id);
      // prefer non-completed if both exist
      if (!prev || (prev === "completed" && a.status !== "completed")) {
        map.set(a.student_id, a.status);
      }
    }
    return map;
  }, [assignments]);

  const toggleStudent = (userId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const handleAssign = async () => {
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    const studentIds = Array.from(selected);
    const { inserted, duplicates, error } = await assignToStudents(set, studentIds);
    setSubmitting(false);

    if (error) {
      toast.error(`Couldn't assign: ${error}`);
      return;
    }
    if (inserted > 0) {
      toast.success(
        `Assigned to ${inserted} student${inserted === 1 ? "" : "s"}${
          duplicates > 0
            ? ` (${duplicates} already had an active assignment, skipped)`
            : ""
        }.`,
      );
    } else if (duplicates > 0) {
      toast.info(
        `No new assignments — ${duplicates} student${
          duplicates === 1 ? "" : "s"
        } already had an active assignment for this set.`,
      );
    }
    setSelected(new Set());
    void refreshAssignments();
  };

  return (
    <section className="border border-zinc-800 rounded-lg p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Users className="w-4 h-4 text-zinc-500" />
        <h2 className="text-sm font-medium text-zinc-300">Assign to students</h2>
      </div>

      {loadingStudents ? (
        <p className="text-sm text-zinc-500">Loading students...</p>
      ) : students.length === 0 ? (
        <p className="text-sm text-zinc-500">No students found.</p>
      ) : (
        <>
          <ul className="divide-y divide-zinc-800 border border-zinc-800 rounded-md">
            {students.map((s) => {
              const status = s.user_id ? activeAssignments.get(s.user_id) : undefined;
              const alreadyAssigned = status === "assigned" || status === "in_progress";
              const isChecked = !!s.user_id && selected.has(s.user_id);
              return (
                <li
                  key={s.user_id ?? s.class_id}
                  className="flex items-center justify-between px-4 py-2.5"
                >
                  <label className="flex items-center gap-3 flex-1 cursor-pointer">
                    <Checkbox
                      checked={isChecked}
                      disabled={alreadyAssigned || !s.user_id}
                      onCheckedChange={() => s.user_id && toggleStudent(s.user_id)}
                    />
                    <span className="text-sm text-zinc-100">
                      {s.display_name || s.class_id || "—"}
                    </span>
                  </label>
                  {status === "completed" && (
                    <span className="text-xs text-emerald-400">Completed</span>
                  )}
                  {status === "in_progress" && (
                    <span className="text-xs text-amber-400">In progress</span>
                  )}
                  {status === "assigned" && (
                    <span className="text-xs text-zinc-400">Already assigned</span>
                  )}
                </li>
              );
            })}
          </ul>

          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">
              {selected.size} selected
            </span>
            <Button onClick={handleAssign} disabled={selected.size === 0 || submitting}>
              {submitting ? "Assigning..." : `Assign${selected.size > 0 ? ` (${selected.size})` : ""}`}
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
