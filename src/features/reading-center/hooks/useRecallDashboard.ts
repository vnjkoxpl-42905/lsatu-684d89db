import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { listStudentAssignments } from "@/features/activity-centre/api/activitiesClient";
import type { SectionGradeStub } from "@/features/activity-centre/api/types";
import { rcDb } from "../lib/db";
import { readingCenterKey } from "../lib/persistence";

export async function loadRecallDashboard(userId: string) {
  const [assignments, grades] = await Promise.all([
    listStudentAssignments(userId),
    (async () => {
      const rows: SectionGradeStub[] = [];
      for (let offset = 0; ; offset += 1000) {
        const { data, error } = await rcDb("activity_section_grades")
          .select("assignment_id,attempt_no,source_section,section,graded_at")
          .eq("student_id", userId).order("graded_at", { ascending: false })
          .order("assignment_id").order("attempt_no").range(offset, offset + 999);
        if (error) throw new Error(error.message);
        rows.push(...(data ?? []));
        if (!data || data.length < 1000) return rows;
      }
    })(),
  ]);
  return { assignments, grades };
}

export function useRecallDashboard() {
  const { user } = useAuth();
  return useQuery({
    queryKey: readingCenterKey(user?.id, "recall-dashboard"), enabled: !!user,
    queryFn: () => loadRecallDashboard(user!.id),
  });
}
