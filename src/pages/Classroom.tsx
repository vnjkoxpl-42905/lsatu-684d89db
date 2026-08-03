import { useClassroomLayout } from "@/components/classroom/shell/ClassroomLayout";
import OrientationCard from "@/components/classroom/OrientationCard";
import TodayTodoCard from "@/components/classroom/TodayTodoCard";
import ClassroomHomeCards from "@/components/classroom/ClassroomHomeCards";
import AnnouncementBanner from "@/components/classroom/AnnouncementBanner";
import { localDayISO } from "@/lib/localDate";

function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-CA", options ?? {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(typeof value === "string" ? new Date(value) : value);
}

function greeting(now: Date = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function testDateMeta(testDate: string | null) {
  if (!testDate || testDate < localDayISO()) return "Classroom";
  const [year, month, day] = testDate.split("-").map(Number);
  const localTestDate = new Date(year, month - 1, day);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.max(
    0,
    Math.round((localTestDate.getTime() - today.getTime()) / 86_400_000),
  );
  if (days === 0) return "Test day";
  return `${days} day${days === 1 ? "" : "s"} to test`;
}

/**
 * The classroom home. Deliberately one screen: who you are, what day it is, and
 * the single list of what you owe today. Everything else — messages, notes,
 * assigned work, analytics, bootcamps, booking — is one click away in the
 * sidebar and does not get re-stated here.
 */
export default function Classroom() {
  const { displayName, testDate } = useClassroomLayout();

  return (
    <>
      <div className="classroom-dateline">
        <time>
          {formatDate(new Date(), {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric",
          })}
        </time>
        <span>|</span>
        <span>{testDateMeta(testDate)}</span>
      </div>
      <h1 className="classroom-title classroom-greeting">
        {displayName ? `${greeting()}, ${displayName}` : greeting()}
      </h1>

      <OrientationCard />
      <AnnouncementBanner />
      <TodayTodoCard />
      <ClassroomHomeCards />
    </>
  );
}
