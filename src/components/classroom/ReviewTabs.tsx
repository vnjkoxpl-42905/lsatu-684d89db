import { Link, useLocation } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { useContext } from "react";
import { DestinationHeadingContext } from "@/contexts/DestinationHeadingContext";

export type ReviewSection = "journal" | "flagged";
export function reviewDefaultPath(_permissions: unknown) { return "/review/to-review"; }

export function ReviewTabs() {
  const { pathname } = useLocation();
  const permissions = useUserPermissions();
  const inDestination = useContext(DestinationHeadingContext);
  if (inDestination) return null;
  const links = [
    { label: "To review", path: "/review/to-review", allowed: true },
    { label: "Progress", path: "/review/progress", allowed: permissions.is_admin || permissions.has_analytics_access },
    { label: "History", path: "/review/history", allowed: permissions.is_admin || permissions.has_analytics_access },
    { label: "Strengths & weaknesses", path: "/review/strengths", allowed: permissions.is_admin || permissions.has_analytics_access },
    { label: "Wrong-answer journal", path: "/review/wrong", allowed: permissions.is_admin || permissions.has_journal_access },
    { label: "Flagged", path: "/review/flagged", allowed: permissions.is_admin || permissions.has_flagged_access },
  ];
  return <nav className="classroom-account-tabs" aria-label="Review sections">{links.filter(link => link.allowed && !permissions.loading).map(link => <Link key={link.path} to={link.path} aria-current={pathname === link.path || (link.path === '/review/wrong' && pathname.startsWith('/journal')) || (link.path === '/review/flagged' && pathname.startsWith('/flagged')) ? 'page' : undefined}>{link.label}</Link>)}</nav>;
}
