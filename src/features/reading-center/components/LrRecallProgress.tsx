import { useCallback, useMemo, type CSSProperties } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import type { SectionGradeStub } from "@/features/activity-centre/api/types";
import { SectionProgress } from "@/features/activity-centre/components/SectionProgress";
import { usePreferences } from "../hooks/useReadingCenterData";
import { useRecallDashboard } from "../hooks/useRecallDashboard";
import { RC_RRC_PATH } from "../lib/routes";

// SectionProgress also lives outside Reading Center. Keep its semantic tokens
// local so a saved dark app theme cannot make its text disappear on white.
const recallTheme = {
  "--foreground": "248 25% 15%", "--muted-foreground": "248 15% 40%",
  "--card": "0 0% 100%", "--primary": "252 35% 42%", "--border": "250 20% 85%",
} as CSSProperties;

const highContrastTheme = {
  "--foreground": "0 0% 100%", "--muted-foreground": "0 0% 100%",
  "--card": "0 0% 0%", "--primary": "0 0% 100%", "--border": "0 0% 100%",
} as CSSProperties;

export function LrRecallProgress() {
  const preferences = usePreferences();
  const { user } = useAuth();
  const recall = useRecallDashboard();
  const navigate = useNavigate();
  const grades = useMemo(() => {
    const owned = new Set((recall.data?.assignments ?? [])
      .filter(a => a.student_id === user?.id && a.mode === "section" && !a.revoked_at).map(a => a.id));
    const unique = new Map<string, SectionGradeStub>();
    for (const grade of recall.data?.grades ?? []) {
      if (!owned.has(grade.assignment_id)) continue;
      const key = `${grade.assignment_id}:${grade.attempt_no}`;
      const previous = unique.get(key);
      if (!previous || Date.parse(grade.graded_at) > Date.parse(previous.graded_at)) unique.set(key, grade);
    }
    return [...unique.values()].sort((a, b) => Date.parse(b.graded_at) - Date.parse(a.graded_at));
  }, [recall.data, user?.id]);
  const loadGrades = useCallback(async () => grades, [grades]);

  if (!user) return <p role="status">Sign in to see your LR Recall history.</p>;
  if (recall.isLoading) return <p role="status">Loading your LR Recall history…</p>;
  if (recall.isError) return <div role="alert" className="rounded-2xl border p-5" style={{ borderColor: "var(--rc-outline-2)" }}>
    <p>Your LR Recall history could not load. Your saved work has not changed.</p>
    <button type="button" className="mt-3 min-h-11 underline" onClick={() => void recall.refetch()}>Try again</button>
  </div>;
  return <section aria-label="LR Recall progress" className="max-w-5xl" style={preferences.data?.theme === "high_contrast" ? highContrastTheme : recallTheme}>
    <p className="mb-4 text-sm leading-6" style={{ color: "var(--rc-text-2)" }}>Recall coverage across your graded runs, followed by your saved reports. Open a section to review its attempts, transcript and feedback.</p>
    <SectionProgress key={`${user.id}:${recall.dataUpdatedAt}`} loadGrades={loadGrades}
      heading="LR Recall history" initiallyExpanded
      emptyMessage="No graded runs yet. Complete an LR Recall section, then return here for your marked reports and progress."
      onOpen={id => navigate(`${RC_RRC_PATH}/attempt/${encodeURIComponent(id)}`)} />
    <Link to={RC_RRC_PATH} className="mt-4 inline-flex min-h-11 items-center text-sm font-medium underline underline-offset-4">Practise LR Recall</Link>
  </section>;
}
