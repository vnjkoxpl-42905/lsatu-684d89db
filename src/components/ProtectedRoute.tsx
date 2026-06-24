import { type ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPermissions, type PermissionFlag } from "@/hooks/useUserPermissions";
import LockedModule from "@/components/LockedModule";

interface ProtectedRouteProps {
  /**
   * Optional feature flag. Ignored when `requireAdmin` is true.
   */
  flag?: PermissionFlag;
  /**
   * When true, only admin users may render the children. Non-admin
   * users, regardless of feature flags, see LockedModule.
   */
  requireAdmin?: boolean;
  children: ReactNode;
}

const LOCAL_DEV_HOSTS = new Set(["localhost", "127.0.0.1", "::1"]);

function isLocalDevAccessAllowed() {
  return import.meta.env.DEV && LOCAL_DEV_HOSTS.has(window.location.hostname);
}

export default function ProtectedRoute({ flag, requireAdmin, children }: ProtectedRouteProps) {
  const { user } = useAuth();
  const permissions = useUserPermissions();
  const location = useLocation();

  if (permissions.loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  if (isLocalDevAccessAllowed()) {
    return <>{children}</>;
  }

  if (!user && (requireAdmin || flag)) {
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

  if (flag) {
    if (permissions.is_admin || permissions[flag]) {
      return <>{children}</>;
    }
    return <LockedModule />;
  }

  return <>{children}</>;
}
