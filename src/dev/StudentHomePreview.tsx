import { useState } from "react";
import { Menu, Send } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { ClassroomHomeView } from "@/components/classroom/home/ClassroomHomeView";
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
  homeBooking: { state: "credits", creditsRemaining: 3 },
  week: buildWeek(weekDates(today), [], today).map((day, index) => ({ ...day,
    label: index === 0 ? "Drill due" : index === 2 ? "Session · 4 pm" : null,
  })), weekLabel: "November 17 to 23",
};

function SampleDockChat() {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<string[]>([]);

  return <div className="msgs-scope flex h-full flex-col bg-[var(--msg-page)]">
    <div className="flex-1 overflow-y-auto space-y-3 p-4 text-sm" aria-live="polite">
      <p className="text-xs text-[var(--msg-meta)]">Preview conversation · Sample data</p>
      <p className="max-w-[85%] rounded-xl rounded-bl-sm bg-[var(--msg-bubble-paper)] p-3 text-[var(--msg-ink)]">
        {model.message.body}
      </p>
      {messages.map((message, index) => (
        <p key={index} className="ml-auto w-fit max-w-[85%] whitespace-pre-wrap break-words rounded-xl rounded-br-sm bg-[var(--msg-bubble-ink)] p-3 text-[var(--msg-bubble-ink-text)]">{message}</p>
      ))}
    </div>
    <form className="flex items-end gap-2 border-t border-[var(--msg-line)] bg-[var(--msg-panel)] p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const body = draft.trim();
        if (!body) return;
        setMessages((items) => [...items, body]);
        setDraft("");
      }}>
      <input aria-label="Message Joshua" placeholder="Message Joshua" value={draft} onChange={(event) => setDraft(event.target.value)}
        className="min-w-0 flex-1 rounded-lg border border-[var(--msg-line)] bg-[var(--msg-page)] px-3 py-2.5 text-sm" />
      <button type="submit" aria-label="Send sample message" disabled={!draft.trim()}
        className="grid h-10 w-10 place-items-center rounded-lg bg-[#303736] text-white disabled:opacity-50">
        <Send size={17} aria-hidden="true" />
      </button>
    </form>
  </div>;
}

export default function StudentHomePreview() {
  const [params] = useSearchParams();
  const [menuOpen, setMenuOpen] = useState(false);
  const open = (route: string) => window.location.assign(route);
  const rating = { rating: 1463, count: 48 };
  const state = params.get("state");
  const previewRating = {
    profile: {
      overall: rating, LR: rating, RC: rating, bySkill: new Map(), eligibleCount: 48,
      calibration: { count: 48, expectedCorrect: 30, actualCorrect: 32 },
    },
    loading: state === "loading", error: null, refresh: () => undefined,
  };
  const previewModel = state === "empty" ? { ...model, hero: null, rows: [], message: null, unreadMessages: 0, newCount: 0, subtitle: "Your next step is up to you.", homeBooking: { state: "none" as const }, daysToTest: null, week: buildWeek(weekDates(today), [], today) }
    : state === "error" ? { ...model, hero: null, rows: [], workFailed: true, subtitle: "Your assigned work could not load." } : model;
  return <div className={`classroom-root classroom-root-home${menuOpen ? " classroom-root-nav-open" : ""}`}>
    <div className="classroom-mobile-bar">
      <button type="button" className="classroom-mobile-menu-button" aria-label="Classroom menu"
        aria-controls="classroom-navigation-rail" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        <Menu size={19} />
      </button>
      <span className="classroom-mobile-bar-label">Home</span>
    </div>
    <aside id="classroom-navigation-rail" className="classroom-sidebar" aria-label="Classroom navigation">
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
        <ClassroomHomeView model={previewModel} loading={state === "loading"} onRetryWork={() => window.location.assign("?variant=focus")} onOpen={open} previewRating={previewRating} previewChat={<SampleDockChat />} />
        { !params.has("variant") && <a href="?variant=focus">Open Home design previews</a> }
      </div>
    </main>
  </div>;
}
