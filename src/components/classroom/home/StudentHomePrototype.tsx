import type { HomeBooking } from "./homeModel";
import { CalendarDays, Search, Zap } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listSavedAccountPracticeTestRuns } from "@/lib/practiceTestStore";
import { practiceTestRaw, practiceTestScaled } from "@/lib/practiceTest";
import { practiceTestPath } from "@/lib/practiceTestRunner";
import "./student-home-prototype.css";

const options = [
  ["focus", "Focus"],
  ["score", "Scoreboard"],
  ["agenda", "Agenda"],
] as const;

export function HomePrototypeSwitcher({ current, onChange }: {
  current: string;
  onChange: (value: string) => void;
}) {
  return <nav className="student-preview-switcher" aria-label="Student Home design previews">
    <span>Home preview</span>
    {options.map(([value, label]) => <button key={value} type="button" aria-pressed={current === value}
      onClick={() => onChange(value)}>{label}</button>)}
  </nav>;
}

export { StudentOrbit as StudentEclipse } from "./StudentOrbit";

export function StudentPreviewDock({ onOpen, onSearch, drill, schedule, booking, messages }: {
  onOpen: (route: string) => void;
  onSearch: () => void;
  drill: boolean;
  schedule: boolean;
  booking?: HomeBooking;
  messages?: React.ReactNode;
}) {
  const canBook = booking?.state === "credits" || booking?.state === "payPerSession" || booking?.state === "booked";
  const openBooking = () => {
    if (booking?.state === "credits" || booking?.state === "booked") onOpen("/booking");
    if (booking?.state === "payPerSession") {
      if (booking.external) window.open(booking.href, "_blank", "noopener,noreferrer");
      else onOpen(booking.href);
    }
  };

  return <nav className="student-preview-dock" aria-label="Home dock">
    {drill && <button className="student-preview-dock-primary" type="button" onClick={() => onOpen("/practice/drills")}><Zap size={17} /> Practice</button>}
    {canBook ? (
      <button type="button" aria-label="Booking" title="Booking" onClick={openBooking}><CalendarDays size={19} /><span>Booking</span></button>
    ) : schedule && (
      <button type="button" aria-label="Schedule" title="Schedule" onClick={() => onOpen("/schedule")}><CalendarDays size={19} /><span>Schedule</span></button>
    )}
    {messages}
    {drill && <button type="button" aria-label="Search questions" title="Find a question" onClick={onSearch}><Search size={19} /></button>}
  </nav>;
}

export function SavedExamScore({ actorId }: { actorId?: string | null }) {
  if (!actorId) return null;
  return <AccountExamScore actorId={actorId} />;
}

function AccountExamScore({ actorId }: { actorId: string }) {
  const exam = useQuery({
    queryKey: ["home-preview", "saved-exam-score", actorId],
    enabled: Boolean(actorId),
    queryFn: async () => {
      const runs = await listSavedAccountPracticeTestRuns(actorId!);
      return runs.find((run) => run.status === "complete" && run.legs.length > 0
        && run.legs.every((leg) => leg.correct != null)) ?? null;
    },
  });
  const run = exam.data;
  const raw = run && practiceTestRaw(run);
  return <section className="classroom-home-region student-preview-exam" aria-label="Latest practice exam score">
    <h2>Practice exam score</h2>
    {run && raw ? <>
      <p className="student-preview-score"><strong>{practiceTestScaled(run)}</strong> <span>estimated LSAT score</span></p>
      <p>PrepTest {run.pt} &middot; {raw.correct} of {raw.total} correct</p>
      <Link to={practiceTestPath(run.id)}>View results <span aria-hidden="true">&rarr;</span></Link>
    </> : <>
      <p>{actorId && exam.isPending ? "Loading exam history" : exam.isError ? "Exam history unavailable" : "No scored full exams yet"}</p>
      <Link to="/practice/exams">Open Testing Centre <span aria-hidden="true">&rarr;</span></Link>
    </>}
  </section>;
}
