import * as React from "react";
import { useNavigate } from "react-router-dom";
import { BookOpen, CalendarClock, RotateCcw, Target, type LucideIcon } from "lucide-react";
import { useStudentBooking } from "@/hooks/useStudentBooking";
import { useStudentAnalytics } from "@/hooks/useStudentAnalytics";
import { useClassroomItems } from "@/hooks/useClassroomItems";

export interface HomeCard {
  key: string;
  icon: LucideIcon;
  title: string;
  /** The live line: a date, a count, a call to start. Never a number we cannot prove. */
  stat: string;
  action: string;
  route: string;
}

function formatSession(startAt: string) {
  return new Intl.DateTimeFormat("en-CA", {
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(startAt));
}

export function ClassroomHomeCardsView({
  cards,
  onOpen,
}: {
  cards: HomeCard[];
  onOpen: (route: string) => void;
}) {
  if (!cards.length) return null;
  // Four cards in a three-column grid leaves one stranded on its own row, so
  // the fourth (Bootcamps, when active) switches the row to a 2x2.
  const grid = `classroom-quick-cards${cards.length === 4 ? " classroom-quick-cards-two" : ""}`;
  return (
    <nav className={grid} aria-label="Where to work">
      {cards.map(({ key, icon: Icon, title, stat, action, route }) => (
        <button
          key={key}
          type="button"
          className="classroom-quick-card"
          onClick={() => onOpen(route)}
        >
          <span className="classroom-quick-icon">
            <Icon size={18} />
          </span>
          <span className="classroom-quick-title">{title}</span>
          <span className="classroom-quick-stat">{stat}</span>
          <span className="classroom-quick-copy">{action}</span>
        </button>
      ))}
    </nav>
  );
}

/**
 * The row under the to-do list: Next session, Drilling, Wrong answers, and
 * Bootcamps only while one is actually assigned. Every stat line is read from
 * the same queries the classroom already runs, so nothing here is decorative.
 */
export default function ClassroomHomeCards() {
  const navigate = useNavigate();
  const bookingQuery = useStudentBooking();
  const analyticsQuery = useStudentAnalytics();
  const itemsQuery = useClassroomItems();

  const nextSession = React.useMemo(() => {
    const upcoming = (bookingQuery.data?.redemptions ?? [])
      .filter(
        (redemption) =>
          new Date(redemption.start_at).getTime() > Date.now() &&
          !["cancelled", "canceled"].includes(redemption.status.toLowerCase()),
      )
      .sort(
        (a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime(),
      );
    return upcoming[0] ?? null;
  }, [bookingQuery.data?.redemptions]);

  const analytics = analyticsQuery.analytics;
  const wrongAnswers = analytics?.hasData
    ? analytics.byType.reduce(
        (total, row) => total + row.firstAttempts - row.firstCorrect,
        0,
      )
    : null;

  const activeBootcamps = (itemsQuery.data ?? []).filter(
    (item) =>
      item.type === "bootcamp_module" &&
      !["completed", "archived"].includes(item.status),
  ).length;

  const cards: HomeCard[] = [
    {
      key: "session",
      icon: CalendarClock,
      title: "Next session",
      stat: nextSession ? formatSession(nextSession.start_at) : "None booked",
      action: nextSession ? "View booking" : "Book one",
      route: "/booking",
    },
    {
      key: "drilling",
      icon: Target,
      title: "Drilling",
      stat: "Start a set",
      action: "Timed and untimed question practice",
      route: "/classroom/drill",
    },
    {
      key: "wrong",
      icon: RotateCcw,
      title: "Wrong answers",
      stat:
        wrongAnswers === null
          ? "Nothing yet"
          : `${wrongAnswers} waiting`,
      action:
        wrongAnswers === null
          ? "Fills in as you practise"
          : "Work back through them",
      route: "/journal",
    },
  ];

  if (activeBootcamps > 0) {
    cards.push({
      key: "bootcamps",
      icon: BookOpen,
      title: "Bootcamps",
      stat: `${activeBootcamps} active`,
      action: "Pick up where you left off",
      route: "/bootcamps",
    });
  }

  return <ClassroomHomeCardsView cards={cards} onOpen={(route) => navigate(route)} />;
}
