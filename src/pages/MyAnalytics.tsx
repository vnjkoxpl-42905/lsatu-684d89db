import { useAuth } from "@/contexts/AuthContext";
import { StudentAnalyticsView } from "@/pages/teacher/students/DossierAnalytics";

/**
 * A student's own Analytics, under Review: the same page their teacher sees,
 * reading only their own rows. Drills open in the student's own review.
 */
export default function MyAnalytics() {
  const { user } = useAuth();
  if (!user) return null;
  const name = (user.user_metadata as { display_name?: string; full_name?: string } | null)?.display_name
    ?? (user.user_metadata as { full_name?: string } | null)?.full_name ?? null;
  return (
    <StudentAnalyticsView
      studentId={user.id}
      studentName={name}
      audience="student"
      runHref={(id) => `/practice/drills/runs/${id}?view=review`}
    />
  );
}
