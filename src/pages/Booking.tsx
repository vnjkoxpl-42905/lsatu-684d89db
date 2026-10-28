import { Navigate } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import Schedule from "@/pages/Schedule";

// `/booking` is no longer a destination of its own. Seeing your calendar and
// adding to it are one errand, so both routes mount the same Schedule shell and
// differ only in which stage tab opens (2026-08-13 decision). Keeping the route
// means every existing link, email, and Classroom pill still lands correctly.
//
// Teacher booking controls live on each student's in-shell dossier; the former
// /booking/admin destination mounted a separate app shell and broke the
// Classroom frame the rail is meant to preserve.
export default function Booking() {
  const { is_admin, loading } = useUserPermissions();

  if (loading) return <div className="min-h-screen bg-background" />;
  if (is_admin) return <Navigate to="/teacher/students" replace />;

  return <Schedule initialTab="book" />;
}
