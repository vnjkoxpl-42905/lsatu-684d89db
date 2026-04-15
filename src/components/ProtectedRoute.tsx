import { type ReactNode } from "react";
import { useUserPermissions, type UserPermissions } from "@/hooks/useUserPermissions";
import LockedModule from "@/components/LockedModule";

type PermissionFlag = keyof Omit<UserPermissions, "is_admin" | "loading">;

interface ProtectedRouteProps {
  flag: PermissionFlag;
  children: ReactNode;
}

export default function ProtectedRoute({ flag, children }: ProtectedRouteProps) {
  const permissions = useUserPermissions();

  if (permissions.loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
      </div>
    );
  }

  // Admins bypass all gates
  if (permissions.is_admin || permissions[flag]) {
    return <>{children}</>;
  }

  return <LockedModule />;
}
