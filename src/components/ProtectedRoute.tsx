import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
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
 */
function isLocalDevAccessAllowed() {
  return (
    import.meta.env.DEV &&
    import.meta.env.VITE_DEV_BYPASS_GATES === "1" &&
    LOCAL_DEV_HOSTS.has(window.location.hostname)
  );
}

export default function ProtectedRoute({ flag, requireAdmin, allowSignedIn, children }: ProtectedRouteProps) {
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const location = useLocation();

  // `loading` is only true on the true cold load (no cached permissions yet);
  // cached reads on subsequent navigations return false, so this no longer
  // flashes on every gated navigation. Use a neutral surface, not pure black.
  if (permissions.loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-muted border-t-foreground rounded-full animate-spin" />
      </div>
    );
  }

  if (isLocalDevAccessAllowed()) {
    return <>{children}</>;
  }

  const flags = Array.isArray(flag) ? flag : flag ? [flag] : [];

  if (!user && (requireAdmin || flags.length > 0)) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return (
      <Navigate
        to={`/auth?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }

  if (requireAdmin) {
    return permissions.is_admin ? <>{children}</> : <LockedModule />;
  }

  if (allowSignedIn && user) {
    return <>{children}</>;
  }

  if (flags.length > 0) {
    if (permissions.is_admin || flags.some((f) => permissions[f])) {
      return <>{children}</>;
    }
    return <LockedModule />;
  }

  return <>{children}</>;
}
