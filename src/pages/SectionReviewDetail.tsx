import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { safeReviewHubReturn } from "@/lib/reviewHubReturn";

/**
 * Legacy per-question section review link (`/review/section/:historyId/:qid`).
 * Redirects to the unified section report with the review walk opened at that
 * question (plan Phase 4.4).
 */
export default function SectionReviewDetail() {
  const { historyId, qid } = useParams<{ historyId: string; qid: string }>();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get("returnTo");
  const safeReturn = safeReviewHubReturn(requestedReturn);

  if (!historyId || !qid) {
    return <Navigate to={safeReturn ?? "/review/to-review"} replace />;
  }

  const params = new URLSearchParams({ walk: "1", qid });
  if (safeReturn) params.set("returnTo", safeReturn);

  return (
    <Navigate
      to={`/review/section/${encodeURIComponent(historyId)}?${params.toString()}`}
      replace
    />
  );
}
