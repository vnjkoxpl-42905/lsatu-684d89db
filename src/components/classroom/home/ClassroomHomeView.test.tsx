import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
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

/* Home never mounts outside a router, and since the address row navigates on
   pick it now says so: `useNavigate` throws without one. Every render here goes
   through the same wrapper so no test can drift back to a bare mount. */
const render = (ui: React.ReactElement) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>);

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
  messages: [],
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
  messages: [
    {
      id: "m",
      from: "Joshua",
      initial: "J",
      timeLabel: "7:52 a.m.",
      body: "Do the twelve before we meet.",
      unread: true,
      route: "/inbox",
    },
  ],
  unreadMessages: 1,
  session: {
    startsAt: "2026-08-07T16:00:00",
    durationMin: 60,
    label: "Friday, August 7 · 4:00 p.m.",
    meta: "60 minutes with Joshua · in four days",
  },
};

describe("ClassroomHomeView", () => {
  describe("a timed section", () => {
    const BRIEFING = {
      minutes: 53,
      sectionName: "Logical Reasoning",
      href: "/drill?mode=full-section&pt=155&section=1&minutes=53&sealed=1",
      sealed: true,
    };
    const sectionRow = {
      ...FULL.rows[0],
      key: "sec",
      title: "Logical Reasoning · Timed Section",
      kind: "homework" as const,
      tone: "drill" as const,
      route: "/classroom/item/abc",
      briefing: BRIEFING,
    };
    const model = {
      ...FULL,
      rows: [sectionRow],
      hero: { ...FULL.hero!, primaryLabel: "Open the set", row: sectionRow },
    };

    it("raises the instructions over Home instead of navigating away", () => {
      const onOpen = vi.fn();
      render(
        <ClassroomHomeView model={model} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Open the set" }));

      expect(onOpen).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog", { name: "Logical Reasoning" })).toBeTruthy();
      expect(screen.getByText(/53 minutes, one sitting/)).toBeTruthy();
    });

    it("starts the section on Enter, at the clock the assignment named", () => {
      const onOpen = vi.fn();
      render(
        <ClassroomHomeView model={model} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Open the set" }));
      fireEvent.click(screen.getByRole("button", { name: "Enter" }));

      expect(onOpen).toHaveBeenCalledWith(BRIEFING.href);
    });

    it("puts Home back untouched when the student declines", () => {
      const onOpen = vi.fn();
      render(
        <ClassroomHomeView model={model} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Open the set" }));
      fireEvent.click(screen.getByRole("button", { name: "Not now" }));

      expect(screen.queryByRole("dialog")).toBeNull();
      expect(onOpen).not.toHaveBeenCalled();
    });

    it("still navigates for work that is not a timed section", () => {
      const onOpen = vi.fn();
      render(
        <ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Start the activity" }));

      expect(onOpen).toHaveBeenCalledWith("/activities/a");
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

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

  it("opens the day's own work rather than the schedule", () => {
    const onOpen = vi.fn();
    const dates = weekDates(new Date(2026, 7, 3));
    const model: ClassroomHomeModel = {
      ...FULL,
      week: buildWeek(
        dates,
        [{ iso: dates[1], label: "Read, Recall, Colour", route: "/activities/abc" }],
        new Date(2026, 7, 3),
      ),
    };
    render(
      <ClassroomHomeView model={model} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: /open Read, Recall, Colour/i }));
    expect(onOpen).toHaveBeenCalledWith("/activities/abc");
  });

  it("still opens a routeless day onto the schedule", () => {
    const onOpen = vi.fn();
    const { container } = render(
      <ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
    );
    const cells = container.querySelectorAll("button.classroom-home-day");
    expect(cells).toHaveLength(7);
    fireEvent.click(cells[0] as HTMLElement);
    expect(onOpen).toHaveBeenCalledWith("/schedule");
  });

  it("does not tell staff a message is from themselves", () => {
    const admin: ClassroomHomeModel = { ...FULL, isAdmin: true, message: null };
    render(
      <ClassroomHomeView model={admin} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );
    expect(screen.getByText("MESSAGES")).toBeInTheDocument();
    expect(screen.queryByText("FROM JOSHUA")).not.toBeInTheDocument();
  });

  it("lets a student reveal, cancel, and confirm clearing the message card", async () => {
    const onClearMessage = vi.fn();
    const model: ClassroomHomeModel = {
      ...FULL,
      message: { ...FULL.message!, from: "Celia", initial: "C" },
    };
    render(
      <ClassroomHomeView
        model={model}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
        onClearMessage={onClearMessage}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show clear actions for message from Celia",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", {
        name: "Cancel clearing message from Celia",
      }),
    );
    expect(onClearMessage).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Show clear actions for message from Celia",
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Clear message from Celia" }),
    );
    await waitFor(() => expect(onClearMessage).toHaveBeenCalledWith("m"));
  });

  it("leaves the card unswipeable when the page cannot clear a message", () => {
    render(
      <ClassroomHomeView
        model={FULL}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /clear actions/i })).toBeNull();
  });

  /* Home used to guard against exactly this: the question picker rode onto the
     page in an Aug-22 checkpoint commit that was never a decision, and the
     guard sent finding a question back to Drill. Joshua reversed it on
     2026-09-02, asking for LSAT Lab's Find A Question at the top of Home,
     where a student who arrives holding one question starts. What the old
     guard was really protecting is still protected and tested below: the
     picker is not wedged between the greeting and the hero, and the three
     selectors stay inside the panel rather than spilling onto the page. */
  it("puts one Find a question trigger at the top of Home", () => {
    render(
      <ClassroomHomeView
        model={FULL}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Find a question" })).toBeInTheDocument();
    // Closed until asked: the selectors live in the panel, not on the page.
    expect(screen.queryByRole("combobox", { name: /test/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /section/i })).toBeNull();
    expect(screen.queryByRole("combobox", { name: /question/i })).toBeNull();
  });

  // The masthead runs straight into the hero, the way it did before the
  // picker was inserted between them.
  it("puts the hero directly under the greeting", () => {
    render(
      <ClassroomHomeView
        model={FULL}
        loading={false}
        onOpen={vi.fn()}
        onSeeAllWork={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.getByLabelText("Pick up where you left off"),
    ).toBeInTheDocument();
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

  it("rolls the strip forward from today rather than from Monday", () => {
    // 2026-08-06 is a Thursday.
    const dates = weekDates(new Date(2026, 7, 6));
    expect(dates[0]).toBe("2026-08-06");
    expect(dates[6]).toBe("2026-08-12");
  });

  it("keeps tomorrow on the strip when today is Sunday", () => {
    // The case a Monday-first week hid: Sunday sat in the last cell, so work
    // due Monday night was not on the strip at all.
    const dates = weekDates(new Date(2026, 7, 30));
    expect(dates[0]).toBe("2026-08-30");
    expect(dates[1]).toBe("2026-08-31");
  });

  it("reads an evening deadline as its local day, not its UTC day", () => {
    // 23:59 on the 30th in New York is 03:59 on the 31st in UTC. Slicing the
    // stored timestamp called that tomorrow and cost the row its "due today"
    // rank, so the hero opened the wrong section.
    const now = new Date(2026, 7, 30, 9, 0, 0);
    expect(dueLabel("2026-08-31T03:59:00+00:00", now)).toBe("due today");
    expect(dueLabel("2026-09-01T03:59:00+00:00", now)).toBe("due tomorrow");
  });

  it("still reads a bare calendar date as itself", () => {
    const now = new Date(2026, 7, 30, 9, 0, 0);
    expect(dueLabel("2026-08-30", now)).toBe("due today");
    expect(dueLabel("2026-08-31", now)).toBe("due tomorrow");
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

  it("dates work by due, then unlock, then the day it was assigned", async () => {
    const { itemDayFor } = await import("./useClassroomHome");
    const base = {
      due_at: null as string | null,
      unlock_at: null as string | null,
      created_at: "2026-08-01T12:00:00.000Z",
    };
    // A deadline wins.
    expect(
      itemDayFor({ ...base, type: "activity", due_at: "2026-08-05T00:00:00.000Z",
        unlock_at: "2026-08-03T00:00:00.000Z" } as never),
    ).toBe("2026-08-05T00:00:00.000Z");
    // Then the morning it opens — the case an assigned Activity always hits.
    expect(
      itemDayFor({ ...base, type: "activity", unlock_at: "2026-08-03T00:00:00.000Z" } as never),
    ).toBe("2026-08-03T00:00:00.000Z");
    // Undated but doable: the day it was handed over.
    expect(itemDayFor({ ...base, type: "activity" } as never)).toBe("2026-08-01T12:00:00.000Z");
    // Undated and not doable: it stays off the band entirely.
    expect(itemDayFor({ ...base, type: "announcement" } as never)).toBeNull();
    expect(itemDayFor({ ...base, type: "note" } as never)).toBeNull();
  });

  it("carries the first entry's route onto the day, and only its own", () => {
    const dates = weekDates(new Date(2026, 7, 3));
    const week = buildWeek(
      dates,
      [
        { iso: "2026-08-04", label: "Read, Recall, Colour", route: "/activities/abc" },
        { iso: "2026-08-04", label: "Session, 4:00 p.m.", route: "/schedule" },
        { iso: "2026-08-05", label: "Weekly plan task" },
      ],
      new Date(2026, 7, 3),
    );
    expect(week[1].route).toBe("/activities/abc");
    // The cell reads the first thing, so it must not open the second.
    expect(week[1].label).toBe("Read, Recall, Colour +1");
    // A plan item has nothing to open; the day stays routeless.
    expect(week[2].route).toBeNull();
    expect(week[0].route).toBeNull();
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
        tone: "recap",
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
    render(
      <ClassroomHomeView
        model={withNote(true)}
        loading={false}
        onOpen={() => {}}
        onSeeAllWork={() => {}}
      />,
    );
    expect(screen.getByText("Causation, Part 1: the argument")).toBeInTheDocument();
    expect(screen.getByText("1 NEW")).toBeInTheDocument();
    expect(screen.getAllByText("Read").length).toBeGreaterThan(0);
  });

  it("drops the new badge once the note has been opened", () => {
    render(
      <ClassroomHomeView
        model={withNote(false)}
        loading={false}
        onOpen={() => {}}
        onSeeAllWork={() => {}}
      />,
    );
    expect(screen.getByText("Causation, Part 1: the argument")).toBeInTheDocument();
    expect(screen.queryByText("1 NEW")).not.toBeInTheDocument();
  });

  it("opens the note at its own route", () => {
    const onOpen = vi.fn();
    render(
      <ClassroomHomeView
        model={withNote(true)}
        loading={false}
        onOpen={onOpen}
        onSeeAllWork={() => {}}
      />,
    );
    fireEvent.click(screen.getAllByText("Read")[0]);
    expect(onOpen).toHaveBeenCalledWith("/classroom/item/n1");
  });
});
