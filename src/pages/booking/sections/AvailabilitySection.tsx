import WeeklyHoursEditor from "@/components/teacher/schedule/WeeklyHoursEditor";
import { SectionHeader } from "../BookingWorkspace";

export default function AvailabilitySection() {
  return (
    <div>
      <SectionHeader title="Availability" subtitle="The weekly hours students can book from. Applies to every pass." />
      <div className="px-8 py-6">
        <div className="booking-shadow max-w-3xl rounded-2xl border border-border bg-card p-6">
          <WeeklyHoursEditor />
        </div>
      </div>
    </div>
  );
}
