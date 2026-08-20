import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ClassroomHomeView } from "./ClassroomHomeView";
import {
  buildWeek,
  datelineFor,
  dueLabel,
  stripKind,
  subtitleFor,
  weekDates,
  type ClassroomHomeModel,
} from "./homeModel";

const EMPTY: ClassroomHomeModel = {
  greeting: "Good morning",
  displayName: "Ada",
  isAdmin: false,
  access: { messages: true, schedule: true, activities: true, drill: true },
  dateline: "Monday · August 3 · 2026",
  subtitle: "Nothing is due today. Drill whatever you feel like.",
  dueTodayCount: 0,
  hero: null,
  rows: [],
  newCount: 0,
  message: null,
  unreadMessages: 0,
  session: null,
  booking: { label: "Book one", href: "/booking", external: false, detail: null },
  week: buildWeek(weekDates(new Date(2026, 7, 3)), [], new Date(2026, 7, 3)),
  weekLabel: "August 3 to 9",
};

const FULL: ClassroomHomeModel = {
  ...EMPTY,
  subtitle: "One assignment is due today.",
  dueTodayCount: 1,
  hero: {
    row: {
      key: "a",
      title: "Negation Station",
      kind: "activity",
      tone: "activity",
      meta: "Activity · twelve prompts · due today",
      route: "/activities/a",
      actionLabel: "Open",
      emphasis: true,
      isNew: true,
      dueToday: true,
      overdue: false,
    },
    eyebrow: "START HERE",
    kindLabel: "ACTIVITY",
    meta: "twelve prompts · due today",
    prose: "Negate each statement, then check whether it breaks the argument.",
    primaryLabel: "Start the activity",
    progress: { completed: 1, total: 12, unit: "prompts", estimateMinutes: null },
  },
  rows: [
    {
      key: "a",
      title: "Negation Station",
      kind: "activity",
      tone: "activity",
      meta: "Activity · twelve prompts · due today",
      route: "/activities/a",
      actionLabel: "Open",
      emphasis: true,
      isNew: true,
      dueToday: true,
      overdue: false,
    },
  ],
  newCount: 1,
  message: {
    id: "m",
    from: "Joshua",
    initial: "J",
    timeLabel: "7:52 a.m.",
    body: "Do the twelve before we meet.",
    unread: true,
    route: "/inbox",
  },
  unreadMessages: 1,
  session: {
    startsAt: "2026-08-07T16:00:00",
    durationMin: 60,
    label: "Friday, August 7 · 4:00 p.m.",
    meta: "60 minutes with Joshua · in four days",
  },
};

describe("ClassroomHomeView", () => {
  it("offers a Mark done control on assigned work and reports the row key", () => {
    const onMarkDone = vi.fn();
    const model = {
      ...FULL,
      rows: [{ ...FULL.rows[0], canComplete: true }],
      hero: { ...FULL.hero!, row: { ...FULL.hero!.row, canComplete: true } },
    };
    render(
      <ClassroomHomeView
        model={model}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
        onMarkDone={onMarkDone}
      />,
    );

    fireEvent.click(screen.getByLabelText("Mark Negation Station as done"));
    expect(onMarkDone).toHaveBeenCalledWith("a");
  });

  it("omits Mark done for reading matter", () => {
    const model = { ...FULL, hero: null, rows: [{ ...FULL.rows[0], canComplete: false }] };
    render(
      <ClassroomHomeView
        model={model}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
        onMarkDone={vi.fn()}
      />,
    );
    expect(screen.queryByText("Mark done")).toBeNull();
  });

  it("leads with the hero and opens the assignment it names", () => {
    const onOpen = vi.fn();
    render(
      <ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Good morning, Ada",
    );
    expect(screen.getByText("Negation Station", { selector: "h2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /start the activity/i }));
    expect(onOpen).toHaveBeenCalledWith("/activities/a");
  });

  it("draws one tick per prompt and fills only what was answered", () => {
    const { container } = render(
      <ClassroomHomeView model={FULL} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );
    expect(container.querySelectorAll(".classroom-home-tick")).toHaveLength(12);
    expect(container.querySelectorAll(".classroom-home-tick-done")).toHaveLength(1);
  });

  it("states the empty case rather than inventing one", () => {
    render(
      <ClassroomHomeView model={EMPTY} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );

    expect(screen.getByText("Nothing assigned right now.")).toBeInTheDocument();
    expect(screen.getByText("No messages yet.")).toBeInTheDocument();
    expect(screen.getByText("Nothing booked")).toBeInTheDocument();
    // The booking door stays open in the empty variant.
    expect(screen.getByRole("button", { name: "Book one" })).toBeInTheDocument();
    // No hero, and therefore no progress card to fill with a guess.
    expect(screen.queryByLabelText("Progress")).not.toBeInTheDocument();
    expect(screen.queryByText(/DUE TODAY/)).not.toBeInTheDocument();
  });

  it("renders all seven days, marking today once", () => {
    const { container } = render(
      <ClassroomHomeView model={EMPTY} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );
    expect(container.querySelectorAll(".classroom-home-day")).toHaveLength(7);
    expect(container.querySelectorAll(".classroom-home-day-today")).toHaveLength(1);
  });

  it("drops the message block for a student without chat access", () => {
    const noChat: ClassroomHomeModel = {
      ...FULL,
      access: { ...FULL.access, messages: false },
      message: null,
      unreadMessages: 0,
    };
    render(
      <ClassroomHomeView model={noChat} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );
    // Neither the thread nor the empty shell: the inbox route is locked for them.
    expect(screen.queryByLabelText("From your coach")).not.toBeInTheDocument();
    expect(screen.queryByText("No messages yet.")).not.toBeInTheDocument();
    // The rest of the page is untouched.
    expect(screen.getByLabelText("Assigned to you")).toBeInTheDocument();
  });

  it("leaves the week readable but inert without schedule access", () => {
    const noSchedule: ClassroomHomeModel = {
      ...FULL,
      access: { ...FULL.access, schedule: false },
    };
    const { container } = render(
      <ClassroomHomeView
        model={noSchedule}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
      />,
    );
    expect(container.querySelectorAll(".classroom-home-day")).toHaveLength(7);
    expect(container.querySelectorAll("button.classroom-home-day")).toHaveLength(0);
  });

  it("does not tell staff a message is from themselves", () => {
    const admin: ClassroomHomeModel = { ...FULL, isAdmin: true, message: null };
    render(
      <ClassroomHomeView model={admin} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );
    expect(screen.getByText("MESSAGES")).toBeInTheDocument();
    expect(screen.queryByText("FROM JOSHUA")).not.toBeInTheDocument();
  });

  it("puts the Question finder in the masthead", () => {
    render(
      <ClassroomHomeView
        model={FULL}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Find a question" })).toBeInTheDocument();
  });

  it("shows no finder to a student without drill access", () => {
    // Home is a shortcut into surfaces the rail already gates, so it gates
    // itself the same way: no drill access means nothing to find, and a field
    // that dead-ends on a locked route is worse than no field.
    render(
      <ClassroomHomeView
        model={{ ...FULL, access: { ...FULL.access, drill: false } }}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Find a question" })).toBeNull();
  });

});

describe("homeModel", () => {
  it("keeps the date whole in the dateline", () => {
    expect(datelineFor(new Date(2026, 7, 3))).toBe("Monday · August 3 · 2026");
  });

  it("names the due day in the student's own local terms", () => {
    const now = new Date(2026, 7, 3);
    expect(dueLabel("2026-08-03", now)).toBe("due today");
    expect(dueLabel("2026-08-04", now)).toBe("due tomorrow");
    expect(dueLabel("2026-08-02", now)).toBe("one day overdue");
    expect(dueLabel(null, now)).toBeNull();
  });

  it("drops the kind from the hero meta, and only when it leads", () => {
    expect(stripKind("Activity · twelve prompts", "activity")).toBe("twelve prompts");
    expect(stripKind("twelve prompts · due today", "activity")).toBe(
      "twelve prompts · due today",
    );
  });

  it("builds a subtitle from counts, and stays honest at zero", () => {
    expect(subtitleFor(1, 3, 0)).toBe(
      "One assignment is due today. Two more are waiting.",
    );
    expect(subtitleFor(0, 0, 0)).toBe(
      "Nothing is due today. Drill whatever you feel like.",
    );
    expect(subtitleFor(0, 0, 2)).toContain("Two unread messages.");
  });

  it("starts the week on Monday and ends it on Sunday", () => {
    // 2026-08-06 is a Thursday.
    const dates = weekDates(new Date(2026, 7, 6));
    expect(dates[0]).toBe("2026-08-03");
    expect(dates[6]).toBe("2026-08-09");
  });

  it("folds several items onto one day without stretching the cell", () => {
    const dates = weekDates(new Date(2026, 7, 3));
    const week = buildWeek(
      dates,
      [
        { iso: "2026-08-03", label: "Negation Station" },
        { iso: "2026-08-03", label: "Session, 4:00 p.m." },
      ],
      new Date(2026, 7, 3),
    );
    expect(week[0].label).toBe("Negation Station +1");
    expect(week[0].isToday).toBe(true);
    expect(week[1].label).toBeNull();
    expect(week[5].isWeekend).toBe(true);
  });
});

describe("unread notes on Home", () => {
  const withNote = (isNew: boolean): ClassroomHomeModel => ({
    ...EMPTY,
    rows: [
      {
        key: "item:n1",
        title: "Causation, Part 1: the argument",
        kind: "recap",
        tone: "muted",
        meta: "Note · posted 19 Aug",
        route: "/classroom/item/n1",
        actionLabel: "Read",
        emphasis: true,
        isNew,
        dueToday: false,
        overdue: false,
      },
    ],
    newCount: isNew ? 1 : 0,
  });

  it("shows an unread note on Home with a Read action, and counts it as new", () => {
    render(<ClassroomHomeView model={withNote(true)} onOpen={() => {}} />);
    expect(screen.getByText("Causation, Part 1: the argument")).toBeInTheDocument();
    expect(screen.getByText("1 NEW")).toBeInTheDocument();
    expect(screen.getAllByText("Read").length).toBeGreaterThan(0);
  });

  it("drops the new badge once the note has been opened", () => {
    render(<ClassroomHomeView model={withNote(false)} onOpen={() => {}} />);
    expect(screen.getByText("Causation, Part 1: the argument")).toBeInTheDocument();
    expect(screen.queryByText("1 NEW")).not.toBeInTheDocument();
  });

  it("opens the note at its own route", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeView model={withNote(true)} onOpen={onOpen} />);
    fireEvent.click(screen.getAllByText("Read")[0]);
    expect(onOpen).toHaveBeenCalledWith("/classroom/item/n1");
  });
});
