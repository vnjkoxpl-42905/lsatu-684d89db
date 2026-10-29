import { Link, useLocation } from "react-router-dom";
import { reviewHubReturnTo } from '@/lib/reviewHubReturn';

export function reviewReturnTo(search: string): string | null {
  return reviewHubReturnTo(search);
}

export function ReviewReturnLink() {
  const { search } = useLocation();
  const target = reviewReturnTo(search);
  return target ? <Link className="review-queue-return" to={target}>← Back to Review</Link> : null;
}
