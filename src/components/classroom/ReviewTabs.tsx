import { useLocation, useNavigate } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";

export type ReviewSection = "journal" | "flagged";

export function reviewDefaultPath(permissions: {
  loading?: boolean;
  is_admin: boolean;
  has_journal_access: boolean;
  has_flagged_access: boolean;
}) {
  const canOpenJournal =
    permissions.loading ||
    permissions.is_admin ||
    permissions.has_journal_access;
  return canOpenJournal ? "/journal" : "/flagged";
}

export function ReviewTabs() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const permissions = useUserPermissions();
  const active: ReviewSection = pathname.startsWith("/flagged")
    ? "flagged"
    : "journal";
  const canOpenJournal =
    permissions.loading ||
    permissions.is_admin ||
    permissions.has_journal_access;
  const canOpenFlagged =
    permissions.loading || permissions.is_admin || permissions.has_flagged_access;

  return (
    <div className="classroom-account-heading classroom-review-heading">
      <h1 className="classroom-title">Review</h1>
      <div
        className="classroom-account-tabs"
        role="tablist"
        aria-label="Review sections"
      >
        {canOpenJournal ? (
          <button
            type="button"
            role="tab"
            aria-selected={active === "journal"}
            className={active === "journal" ? "classroom-account-tab-active" : ""}
            onClick={() => navigate("/journal")}
          >
            Wrong answers
          </button>
        ) : null}
        {canOpenFlagged ? (
          <button
            type="button"
            role="tab"
            aria-selected={active === "flagged"}
            className={active === "flagged" ? "classroom-account-tab-active" : ""}
            onClick={() => navigate("/flagged")}
          >
            Flagged
          </button>
        ) : null}
      </div>
    </div>
  );
}