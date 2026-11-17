import { useSearchParams } from "react-router-dom";
import { ClassroomHomeView } from "@/components/classroom/home/ClassroomHomeView";
import { HomeRatingCardView } from "@/components/classroom/home/HomeRatingCard";
import { buildWeek, weekDates, type ClassroomHomeModel } from "@/components/classroom/home/homeModel";
import "@/components/classroom/home/home.css";
import "@/components/classroom/classroom.css";

const today = new Date(2026, 10, 17);
const row = {
  key: "sample-drill", title: "Conditional reasoning", kind: "guided", tone: "activity",
  meta: "Guided drill | 6 questions", route: "/practice/drills", actionLabel: "Open",
  emphasis: true, isNew: true, dueToday: true, overdue: false,
} as const;
const model: ClassroomHomeModel = {
  greeting: "Good morning", displayName: "Alex", isAdmin: false,
  access: { messages: true, schedule: true, activities: true, drill: true },
  dateline: "Tuesday, November 17, 2026", subtitle: "One assignment is due today.",
  daysToTest: 42, dueTodayCount: 1, continueRow: null,
  hero: { row, eyebrow: "Due today", kindLabel: "Guided drill", meta: "6 questions",
    prose: "Translate each conditional and check the direction of the inference.",
    primaryLabel: "Open guided drill", progress: { completed: 3, total: 6, unit: "questions", estimateMinutes: null } },
  rows: [row, { ...row, key: "sample-section", title: "PrepTest 148, Section 2", meta: "Timed section · 25 questions", dueToday: false },
    { ...row, key: "sample-recap", title: "Review your conditional translations", kind: "recap", tone: "recap", meta: "Session recap · November 16", dueToday: false, isNew: false, actionLabel: "Read", route: "/my-work/notes" }],
  newCount: 1, message: { id: "sample-message", from: "Joshua", initial: "J", timeLabel: "Nov 17", body: "Before our session, revisit the questions you flagged. Bring one example where the direction of the conditional was unclear.", unread: true, route: "/inbox" }, messages: [], unreadMessages: 1,
  homeBooking: { state: "booked", startsAt: "2026-11-19T16:00:00" },
  week: buildWeek(weekDates(today), [], today).map((day, index) => ({ ...day,
    label: index === 0 ? "Drill due" : index === 2 ? "Session · 4 pm" : null,
  })), weekLabel: "November 17 to 23",
};

export default function StudentHomePreview() {
  const [params] = useSearchParams();
  const open = (route: string) => window.location.assign(route);
  const rating = { rating: 1463, count: 48 };
  const state = params.get("state");
  const previewModel = state === "empty" ? { ...model, hero: null, rows: [], message: null, unreadMessages: 0, newCount: 0, subtitle: "Your next step is up to you.", homeBooking: { state: "none" as const }, daysToTest: null, week: buildWeek(weekDates(today), [], today) }
    : state === "error" ? { ...model, hero: null, rows: [], workFailed: true, subtitle: "Your assigned work could not load." } : model;
  return <div className="classroom-root classroom-root-home">
    <aside className="classroom-sidebar" aria-label="Classroom navigation">
      <div className="m-2 rounded-xl border border-[#d5cbbd] bg-[#f4eee5] p-5 text-[#282824]">
        <strong>LSAT U</strong>
        <nav className="mt-6 grid gap-2">
          {[["Home", "/dev/student-home-preview?variant=focus"], ["My Work", "/my-work/to-do"], ["Practice", "/practice/drills"],
            ["Testing Centre", "/practice/exams"], ["Review", "/review"], ["Library", "/library"], ["Schedule", "/schedule"]]
            .map(([label, href]) => <a key={label} href={href} className={`rounded-md px-3 py-2 text-sm ${label === "Home" ? "bg-[#252725] text-[#f8f4eb]" : "hover:bg-[#e7ded0]"}`}>{label}</a>)}
        </nav>
      </div>
    </aside>
    <main className="classroom-stage">
      <div className="classroom-column">
        <p className="student-home-preview-notice">Design preview · Sample student data · <a href="?variant=focus">Focus</a> / <a href="?variant=score">Scoreboard</a> / <a href="?variant=agenda">Agenda</a></p>
        <ClassroomHomeView model={previewModel} loading={state === "loading"} onRetryWork={() => window.location.assign("?variant=focus")} onOpen={open} previewMetrics={state === "empty" || state === "loading" ? undefined : <>
          <section className="classroom-home-region student-preview-exam">
            <h2>Practice exam score</h2>
            <p className="student-preview-score"><strong>158</strong> <span>estimated LSAT score</span></p>
            <p>PrepTest 148 &middot; 56 of 77 correct</p>
          </section>
          <HomeRatingCardView onOpen={open} result={{ profile: { overall: rating, LR: rating, RC: rating,
            bySkill: new Map(), eligibleCount: 48, calibration: { count: 48, expectedCorrect: 30, actualCorrect: 32 } },
            loading: false, error: null, refresh: () => undefined }} />
        </>} />
        { !params.has("variant") && <a href="?variant=focus">Open Home design previews</a> }
      </div>
    </main>
  </div>;
}
