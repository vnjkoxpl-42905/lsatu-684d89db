import { NavLink, Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { CalendarCheck2, CalendarClock, GraduationCap, ArrowLeft, Settings2, Ticket } from "lucide-react";
import { cn } from "@/lib/utils";
import PassesSection from "./sections/PassesSection";
import BookingsSection from "./sections/BookingsSection";
import StudentsSection from "./sections/StudentsSection";
import StudentDetail from "./sections/StudentDetail";
import AvailabilitySection from "./sections/AvailabilitySection";
import SettingsSection from "./sections/SettingsSection";
import "./booking-theme.css";

// Admin "Booking" workspace — Calendly/Cal.com-style shell: brand block,
// left sidebar of sections, content pane. Light base, burgundy holo accent.

const NAV = [
  { to: "", end: true, label: "Passes", Icon: Ticket },
  { to: "bookings", end: false, label: "Bookings", Icon: CalendarCheck2 },
  { to: "students", end: false, label: "Students", Icon: GraduationCap },
  { to: "availability", end: false, label: "Availability", Icon: CalendarClock },
  { to: "settings", end: false, label: "Settings", Icon: Settings2 },
];

export default function BookingWorkspace() {
  const navigate = useNavigate();
  return (
    <div className="booking-holo flex min-h-screen">
      {/* Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-border bg-card md:flex">
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-6">
          <div className="holo-surface flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold">L</div>
          <span className="holo-text text-xl font-bold tracking-tight">Booking</span>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-2">
          {NAV.map(({ to, end, label, Icon }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-accent text-accent-foreground shadow-[inset_2px_0_0_hsl(var(--primary))]"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-border px-3 py-4">
          <button
            onClick={() => navigate("/teacher")}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Exit Booking
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-20 border-b border-border bg-card md:hidden">
        <div className="flex items-center gap-2.5 px-4 pt-3">
          <div className="holo-surface flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-xs font-bold">L</div>
          <span className="holo-text text-lg font-bold tracking-tight">Booking</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 py-2">
          {NAV.map(({ to, end, label }) => (
            <NavLink
              key={label}
              to={to}
              end={end}
              className={({ isActive }) => cn(
                "whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium",
                isActive ? "bg-accent text-accent-foreground" : "text-muted-foreground",
              )}
            >{label}</NavLink>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="min-h-screen flex-1 pt-24 md:ml-60 md:pt-0">
        <Routes>
          <Route index element={<PassesSection />} />
          <Route path="bookings" element={<BookingsSection />} />
          <Route path="students" element={<StudentsSection />} />
          <Route path="students/:passId" element={<StudentDetail />} />
          <Route path="availability" element={<AvailabilitySection />} />
          <Route path="settings" element={<SettingsSection />} />
          <Route path="*" element={<Navigate to="." replace />} />
        </Routes>
      </main>
    </div>
  );
}

export function SectionHeader({ title, subtitle, children }: {
  title: string; subtitle?: string; children?: React.ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-border px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </header>
  );
}
