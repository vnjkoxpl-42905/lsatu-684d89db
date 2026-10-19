import { Link, useLocation } from "react-router-dom";

export function reviewReturnTo(search: string): string | null {
  const target = new URLSearchParams(search).get("returnTo");
  if (!target || !/^\/review\/to-review(?:\?|$)/.test(target) || target.startsWith("//")) return null;
  return target;
}

export function ReviewReturnLink() {
  const { search } = useLocation();
  const target = reviewReturnTo(search);
  return target ? <Link className="review-queue-return" to={target}>← Back to review queue</Link> : null;
}
