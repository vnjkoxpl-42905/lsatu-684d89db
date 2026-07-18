import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import BookSessionPanel from "@/components/schedule/BookSessionPanel";
import { useStudentBooking } from "@/hooks/useStudentBooking";

/**
 * Dedicated "Booking" page (its own sidebar tab). Hosts the student booking
 * widget. If the student has no active pass, BookSessionPanel renders nothing,
 * so we show a friendly empty state here instead.
 */
export default function Booking() {
  const navigate = useNavigate();
  const { data: info, isLoading } = useStudentBooking();
  const hasAccess = !!info?.pass;

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/mainhub")} aria-label="Back">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Book a session</h1>
          <p className="text-sm text-muted-foreground">Schedule 1:1 time with Joshua.</p>
        </div>
      </div>

      <BookSessionPanel />

      {!isLoading && !hasAccess && (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm font-medium">Booking isn't enabled for you yet.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Message Joshua to have 1:1 session booking turned on for your account.
          </p>
        </div>
      )}
    </div>
  );
}
