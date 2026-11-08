import { Link, useLocation } from "react-router-dom";
import { reviewHubReturnTo } from '@/lib/reviewHubReturn';

/**
 * Back to a finished drill's review. Built from a run id and a question
 * number, never from a URL the page was handed, so it can't be pointed
 * anywhere else.
 */
export function drillRunReturnTo(search: string): string | null {
  const params = new URLSearchParams(search);
  const run = params.get("fromRun");
  const q = params.get("fromQ");
  if (!run || !/^[A-Za-z0-9-]{1,64}$/.test(run)) return null;
  const n = q && /^\d{1,4}$/.test(q) ? Number(q) : null;
  return `/practice/drills/runs/${run}${n ? `?q=${n}` : ""}`;
}

export function reviewReturnTo(search: string): string | null {
  return reviewHubReturnTo(search) ?? drillRunReturnTo(search);
}

export function ReviewReturnLink() {
  const { search } = useLocation();
  const hub = reviewHubReturnTo(search);
  const drill = hub ? null : drillRunReturnTo(search);
  const target = hub ?? drill;
  return target ? <Link className="review-queue-return" to={target}>{drill ? "← Back to drill review" : "← Back to Review"}</Link> : null;
}
