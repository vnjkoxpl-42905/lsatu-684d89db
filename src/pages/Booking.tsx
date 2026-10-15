import { Navigate } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import BookingView from "@/components/booking/BookingView";

// Keep existing booking links working while giving tutoring its own rail entry.
export default function Booking() {
  const { is_admin, loading } = useUserPermissions();
  if (loading) return <div className="min-h-screen bg-background" />;
  if (is_admin) return <Navigate to="/teacher/students" replace />;
  return (
    <div className="pb-20">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">Tutoring</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">Use your session credits to book time with Joshua.</p>
      </header>
      <BookingView />
    </div>
  );
}
