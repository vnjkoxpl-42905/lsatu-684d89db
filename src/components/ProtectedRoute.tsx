import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import { authUrlWithReturnTo } from "@/lib/authRedirect";
import LockedModule from "@/components/LockedModule";

interface ProtectedRouteProps {
  /**
   * Optional feature flag, or a list of acceptable feature flags. Ignored when
   * `requireAdmin` is true.
   */
  flag?: PermissionFlag | readonly PermissionFlag[];
  /**
   * Allow any signed-in user through even when the feature flag is false.
   * Useful for core student workspace pages that should stay reachable while
   * their contents are still constrained by row-level data access.
   *
   * "Signed in is enough" — never "nobody needs to be signed in". A route that
   * should be public is not wrapped in this component at all.
   */
  allowSignedIn?: boolean;
  /**
   * When true, only admin users may render the children. Non-admin
   * users, regardless of feature flags, see LockedModule.
   */
  requireAdmin?: boolean;
  children: ReactNode;
}

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

/**
 * Opt-in only. A plain `npm run dev` now exercises the real permission path, so
 * a gating regression is visible locally instead of surfacing after deploy.
 * Set VITE_DEV_BYPASS_GATES=1 in .env.local to walk gated routes without the
 * matching flags.
 *
 * It relaxes *flags*, never authentication — the caller applies it only after
 * the signed-in check, so no configuration can make this component render to an
 * anonymous visitor.
 */
function isLocalDevAccessAllowed() {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_BYPASS_GATES === "1" &&
    LOCAL_DEV_HOSTS.has(window.location.hostname)
  );
}

export default function ProtectedRoute({ flag, requireAdmin, allowSignedIn, children }: ProtectedRouteProps) {
  const { user, authReady } = useAuth();
  const permissions = useUserPermissions();
  const location = useLocation();

  // Auth first, and nothing before it. `useUserPermissions` reports
  // `loading: authReady && !!user && isPending`, which is *false* while auth is
  // still resolving — so a check on `!user` alone read "not yet known" as
  // "signed out" and bounced every cold deep link to /auth. Holding here until
  // auth is definitively resolved is what makes an assignment link survive.
  if (!authReady) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  // Authentication is intrinsic to this component: every shape of it requires a
  // user. The check used to run only for `requireAdmin` or flagged routes, so a
  // wrapper with `allowSignedIn` and no flag fell through to the unconditional
  // render at the bottom and served protected content to anonymous visitors.
  if (!user) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={authUrlWithReturnTo(returnTo)} replace />;
  }

  // After the auth checks, never before: the dev bypass opens locked features
  // on a local machine, not the front door.
  if (isLocalDevAccessAllowed()) {
    return <>{children}</>;
  }

  // Only a true cold read blocks; cached reads and background refetches keep
  // this false, so gated navigations do not flash.
  if (permissions.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (requireAdmin) {
    return permissions.is_admin ? <>{children}</> : <LockedModule staffOnly />;
  }

  if (allowSignedIn) {
    return <>{children}</>;
  }

  const flags = Array.isArray(flag) ? flag : flag ? [flag] : [];
  if (flags.length > 0) {
    if (permissions.is_admin || flags.some((f) => permissions[f])) {
      return <>{children}</>;
    }
    return <LockedModule />;
  }

  return <>{children}</>;
}
