import { ArrowLeft, ArrowRight, BookOpen, Gauge, Mic } from "lucide-react";
import { Link } from "react-router-dom";
import { useUserPermissions } from "@/hooks/useUserPermissions";
import { RC_LIBRARY_PATH, RC_RRC_PATH } from "../lib/routes";

const activities = [
  {
    title: "Read, Recall, Colour",
    description: "Read a stimulus, record what you remember, then compare your recall with the original.",
    detail: "Your RRC sections, recordings and results.",
    action: "Open RRC",
    to: RC_RRC_PATH,
    icon: Mic,
  },
  {
    title: "Speed Reading",
    description: "Choose a passage and practise reading at a pace you control.",
    detail: "Your reading library and reading progress.",
    action: "Open Speed Reading",
    to: RC_LIBRARY_PATH,
    icon: Gauge,
  },
];

export default function ReadingCenterHome() {
  const { is_admin } = useUserPermissions();
  return (
    <div className="min-h-screen" style={{ background: "var(--rc-page)", color: "var(--rc-text)" }}>
      <header className="border-b" style={{ borderColor: "var(--rc-outline-2)" }}>
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <BookOpen size={20} aria-hidden="true" /> Reading Center
          </div>
          <Link to={is_admin ? "/teacher/tools" : "/classroom"} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm hover:bg-[var(--rc-nav-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
            <ArrowLeft size={16} aria-hidden="true" />
            {is_admin ? "Teacher Workspace" : "LSAT U Home"}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Choose your reading activity</h1>
        <p className="mt-3 max-w-xl text-base leading-relaxed" style={{ color: "var(--rc-text-2)" }}>
          Practise recall or work on reading pace. Each activity has its own collection and progress.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-2">
          {activities.map(({ title, description, detail, action, to, icon: ActivityIcon }) => (
            <section key={to} aria-label={title} className="flex min-w-0 flex-col rounded-2xl border p-6 sm:p-8" style={{ borderColor: "var(--rc-outline-2)", background: "var(--rc-card)" }}>
              <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: "var(--rc-nav-active-bg)", color: "var(--rc-text)" }}>
                <ActivityIcon size={24} aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
              <p className="mt-3 text-sm leading-7">{description}</p>
              <p className="mt-3 text-xs leading-6" style={{ color: "var(--rc-text-2)" }}>{detail}</p>
              <Link to={to} className="mt-8 inline-flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-semibold hover:bg-[var(--rc-nav-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2" style={{ borderColor: "var(--rc-outline)", background: "var(--rc-surface)" }}>
                {action}<ArrowRight size={18} aria-hidden="true" />
              </Link>
            </section>
          ))}
        </div>
      </main>
    </div>
  );
}
