import { type ReactNode } from "react";
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

export default function ProtectedRoute({ flag, requireAdmin, children }: ProtectedRouteProps) {
  const permissions = useUserPermissions();

  if (permissions.loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
      </div>
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
