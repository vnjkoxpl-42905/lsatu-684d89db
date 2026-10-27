import * as React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render as rtlRender, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ClassroomHomeView } from "./ClassroomHomeView";
import {
  pickContinueWork,
  buildWeek,
  datelineFor,
  dueLabel,
  homeBookingFor,
  stripKind,
  subtitleFor,
  weekDates,
  type ClassroomHomeModel,
} from "./homeModel";

vi.mock("@/components/questionfinder/useQuestionFinderBanks", () => ({
  useQuestionFinderBanks: () => ({ lr: [], rcPassages: [], rcQuestions: [], loading: false, error: null, lrFailed: false, rcFailed: false }),
}));

/* Home never mounts outside a router, and since the address row navigates on
   pick it now says so: `useNavigate` throws without one. Every render here goes
   through the same wrapper so no test can drift back to a bare mount. */
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: MemoryRouter });

const EMPTY: ClassroomHomeModel = {
  greeting: "Good morning",
  displayName: "Ada",
  isAdmin: false,
  access: { messages: true, schedule: true, activities: true, drill: true },
  dateline: "Monday · August 3 · 2026",
  subtitle: "Nothing is due today. Drill whatever you feel like.",
  daysToTest: null,
  dueTodayCount: 0,
  hero: null,
  rows: [],
  newCount: 0,
  message: null,
  messages: [],
  unreadMessages: 0,
  homeBooking: { state: "none" },
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
  homeBooking: { state: "booked", startsAt: "2026-08-07T16:00:00" },
};

// Continue is pinned off so the hero is not folded into it (the view drops a
// hero that repeats the Continue card's work).
const HERO_ONLY: ClassroomHomeModel = { ...FULL, continueRow: null };

describe("ClassroomHomeView", () => {
  it("shows the saved-work summary and explains the next assignment", () => {
    render(<ClassroomHomeView model={{
      ...FULL,
      workSummary: { open: 3, inProgress: 1 },
      continueRow: { ...FULL.rows[0], workStatus: 'in_progress' },
    }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByText('3 open assignments · 1 with saved work')).toBeInTheDocument();
    expect(screen.getByText('Due today')).toBeInTheDocument();
    expect(screen.getByText('Continue')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Continue assigned work' })).toBeInTheDocument();
  });

  it("does not claim an empty work list when an assignment source fails", () => {
    const retry = vi.fn();
    render(<ClassroomHomeView model={{
      ...EMPTY,
      workFailed: true,
      subtitle: 'Could not load all assigned work. Try again.',
    }} loading={false} onOpen={vi.fn()} onRetryWork={retry} />);
    expect(screen.queryByText('Nothing assigned right now.')).not.toBeInTheDocument();
    expect(screen.getByText('Some assigned work could not load. Retry above.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry assigned work' }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("opens the assigned work and adaptive Smart Drill from the action cards", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Start assigned work" }));
    expect(onOpen).toHaveBeenLastCalledWith("/activities/a");
    fireEvent.click(screen.getByRole("button", { name: "Smart Drill" }));
    expect(onOpen).toHaveBeenLastCalledWith("/drill?drill=smart-drill&returnTo=%2Fclassroom");
    expect(screen.getByLabelText("Next seven days")).toBeInTheDocument();
  });

  it("keeps one finder and sends Timed section to Testing", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} />);
    expect(screen.getAllByRole("button", { name: "Find a question" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Timed section" }));
    expect(onOpen).toHaveBeenCalledWith("/testing");
    const trigger = screen.getByRole("button", { name: "Find a question" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.keyDown(window, { key: "k", ctrlKey: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  // Since 2026-10-22 the booked session is supporting context, not a header
  // block: it sits in the compact context list after the work.
  it("shows a slim booked-session line in the context list and opens booking management", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} />);
    const nextSession = screen.getByRole("button", { name: /Next session: Friday/ });
    expect(nextSession).toBeInTheDocument();
    expect(nextSession.closest(".classroom-home-context")).toBeInTheDocument();
    expect(nextSession.closest(".classroom-home-top")).toBeNull();
    fireEvent.click(nextSession);
    expect(onOpen).toHaveBeenCalledWith("/booking");
    expect(screen.queryByLabelText("Next session card")).not.toBeInTheDocument();
  });

  it("shows the remaining credits as a booking pill", () => {
    const onOpen = vi.fn();
    const model = {
      ...EMPTY,
      homeBooking: { state: "credits", creditsRemaining: 3 } as const,
    };
    render(<ClassroomHomeView model={model} loading={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Book · 3 left" }));
    expect(onOpen).toHaveBeenCalledWith("/booking");
  });

  it("uses the single-session offer route for the pay-per-session pill", () => {
    const onOpen = vi.fn();
    const homeBooking = homeBookingFor({
      isAdmin: false,
      isLoading: false,
      isError: false,
      nextBookingStartAt: null,
      pass: { status: "expired", credits_remaining: 0 },
      offers: [
        { id: "package-renewal", url: "/renew" },
        { id: "single-session-native", url: "/single-session" },
      ],
    });
    expect(homeBooking).toEqual({
      state: "payPerSession",
      href: "/single-session",
      external: false,
    });
    const model = { ...EMPTY, homeBooking };
    render(<ClassroomHomeView model={model} loading={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Book a session" }));
    expect(onOpen).toHaveBeenCalledWith("/single-session");
    expect(onOpen).not.toHaveBeenCalledWith("/renew");
  });

  it("opens an external single-session offer in a safe new tab", () => {
    const open = vi.spyOn(window, "open").mockImplementation(() => null);
    const homeBooking = homeBookingFor({
      isAdmin: false,
      isLoading: false,
      isError: false,
      nextBookingStartAt: null,
      pass: null,
      offers: [{ id: "single-session", url: "https://booking.example/session" }],
    });
    render(
      <ClassroomHomeView
        model={{ ...EMPTY, homeBooking }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Book a session" }));
    expect(open).toHaveBeenCalledWith(
      "https://booking.example/session",
      "_blank",
      "noopener,noreferrer",
    );
    open.mockRestore();
  });

  it("renders no booking action for none, loading, error, or admin", () => {
    const payPerSession = {
      state: "payPerSession" as const,
      href: "/single-session",
      external: false,
    };
    const { rerender } = render(
      <ClassroomHomeView model={EMPTY} loading={false} onOpen={vi.fn()} />,
    );
    for (const state of ["none", "loading", "error"] as const) {
      const model = { ...EMPTY, homeBooking: { state } };
      rerender(<ClassroomHomeView model={model} loading={false} onOpen={vi.fn()} />);
      expect(screen.queryByRole("button", { name: "Book a session" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Book ·/ })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Next session:/ })).not.toBeInTheDocument();
    }
    rerender(
      <ClassroomHomeView
        model={{ ...EMPTY, isAdmin: true, homeBooking: payPerSession }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Book a session" })).not.toBeInTheDocument();
  });

  it("does not show a default RRC tile, while assigned RRC work keeps its action", () => {
    const onOpen = vi.fn();
    const assignedRrc = {
      key: "rrc:section-1",
      title: "Read, Recall, Colour: Section 1",
      kind: "activity" as const,
      tone: "activity" as const,
      meta: "Read, Recall, Colour · assigned today",
      route: "/activities/sections/section-1",
      actionLabel: "Open",
      emphasis: true,
      isNew: true,
      dueToday: false,
      overdue: false,
    };
    const model = { ...EMPTY, rows: [assignedRrc], newCount: 1 };
    render(<ClassroomHomeView model={model} loading={false} onOpen={onOpen} />);
    expect(screen.queryByLabelText("Read, Recall, Colour")).not.toBeInTheDocument();
    // The only assignment is the featured next action. Since 2026-10-22 it is
    // not repeated as a row in Up next, so it appears exactly once.
    expect(screen.getAllByText(assignedRrc.title)).toHaveLength(1);
    expect(screen.queryByText(assignedRrc.title, { selector: ".classroom-home-row-title" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Start assigned work" }));
    expect(onOpen).toHaveBeenCalledWith(assignedRrc.route);
  });

  it("keeps the From Joshua card out of Home when there is no message", () => {
    render(<ClassroomHomeView model={EMPTY} loading={false} onOpen={vi.fn()} />);
    expect(screen.queryByLabelText("From Joshua")).not.toBeInTheDocument();
  });

  it("shows days to test day only for a future date", () => {
    const { rerender } = render(
      <ClassroomHomeView
        model={{ ...FULL, daysToTest: 38 }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByLabelText("38 days to test day")).toBeInTheDocument();
    rerender(
      <ClassroomHomeView
        model={{ ...FULL, daysToTest: null }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByText("days to test day")).not.toBeInTheDocument();
  });

  it("hides Timed section without drill access", () => {
    render(
      <ClassroomHomeView
        model={{ ...FULL, access: { ...FULL.access, drill: false } }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: "Timed section" })).not.toBeInTheDocument();
  });

  it("hides Continue when no eligible assigned work remains", () => {
    render(
      <ClassroomHomeView
        model={{ ...EMPTY, rows: [{ ...FULL.rows[0], key: "report:a:1" }] }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByRole("button", { name: /assigned work$/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Smart Drill" })).toBeInTheDocument();
  });

  it("keeps hidden practice and messages features hidden", () => {
    render(
      <ClassroomHomeView
        model={{
          ...FULL,
          access: { ...FULL.access, drill: false, activities: false, messages: false },
        }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    for (const name of ["Start assigned work", "Smart Drill", "Timed section"]) {
      expect(screen.queryByRole("button", { name })).toBeNull();
    }
    // The finder was never gated on Home; the redesign keeps it that way.
    expect(screen.getByRole("button", { name: "Find a question" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Inbox,/ })).toBeNull();
    expect(screen.getByLabelText("Next seven days")).toBeInTheDocument();
  });

  // The student view is pure: it draws the model it is given. Since 2026-10-22
  // an admin never receives it at all; ClassroomHome.role.test proves the
  // dispatcher mounts the teaching desk instead and never these rows.
  it("draws the work in whatever model it is given, flag or no flag", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeView model={{ ...FULL, isAdmin: true, workSummary: { open: 1, inProgress: 0 } }} loading={false} onOpen={onOpen} />);
    expect(screen.getByText('1 open assignment · 0 with saved work')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start assigned work" }));
    expect(onOpen).toHaveBeenCalledWith('/activities/a');
  });

  it("uses the existing unread count and inbox route", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Inbox, 1 unread" }));
    expect(onOpen).toHaveBeenCalledWith("/inbox");
  });

  it("continues a section outside the four visible rows through its briefing", () => {
    const onOpen = vi.fn();
    const continueRow = {
      ...FULL.rows[0],
      key: "earliest",
      route: "/classroom/item/earliest",
      briefing: {
        minutes: 35,
        sectionName: "Logical Reasoning",
        href: "/drill?section=1",
        sealed: true,
      },
    };
    render(<ClassroomHomeView model={{ ...FULL, continueRow }} loading={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Start assigned work" }));
    expect(screen.getByRole("dialog", { name: "Logical Reasoning" })).toBeInTheDocument();
    expect(onOpen).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Enter" }));
    expect(onOpen).toHaveBeenCalledWith(continueRow.briefing.href);
  });

  it("selects the earliest actual deadline and leaves undated work last", () => {
    const later = { ...FULL.rows[0], key: "later", dueAt: "2026-09-25T17:00:00Z" };
    const earlier = { ...later, key: "earlier", dueAt: "2026-09-24T18:00:00Z" };
    const earliest = { ...later, key: "earliest", dueAt: "2026-09-24T12:00:00Z" };
    expect(pickContinueWork([FULL.rows[0], later, earlier, earliest], FULL.access, false)?.key).toBe("earliest");
    expect(pickContinueWork([{ ...earliest, kind: "recap" }, later], FULL.access, false)?.key).toBe("later");
    expect(pickContinueWork([{ ...earliest, kind: "plan" }], FULL.access, false)?.key).toBe("earliest");
    expect(pickContinueWork([], FULL.access, false)).toBeNull();
  });

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
      continueRow: null,
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
        <ClassroomHomeView model={HERO_ONLY} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Start the activity" }));

      expect(onOpen).toHaveBeenCalledWith("/activities/a");
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("offers a Mark done control for a manual teacher task and reports its key", () => {
    const onMarkDone = vi.fn();
    const task = { ...FULL.rows[0], key: 'ta-1', title: 'Read Joshua’s feedback', kind: 'ta' as const, canComplete: true };
    const model = {
      ...FULL,
      rows: [task],
      hero: { ...FULL.hero!, row: task },
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

    fireEvent.click(screen.getByLabelText("Mark Read Joshua’s feedback as done"));
    expect(onMarkDone).toHaveBeenCalledWith("ta-1");
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
      <ClassroomHomeView model={HERO_ONLY} loading={false} onOpen={onOpen} onSeeAllWork={vi.fn()} />,
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
      <ClassroomHomeView model={HERO_ONLY} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );
    expect(container.querySelectorAll(".classroom-home-tick")).toHaveLength(12);
    expect(container.querySelectorAll(".classroom-home-tick-done")).toHaveLength(1);
  });

  it("states the empty case rather than inventing one", () => {
    render(
      <ClassroomHomeView model={EMPTY} loading={false} onOpen={vi.fn()} onSeeAllWork={vi.fn()} />,
    );

    expect(screen.getByText("Nothing assigned right now.")).toBeInTheDocument();
    expect(screen.queryByText("No messages yet.")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Next session")).not.toBeInTheDocument();
    expect(screen.queryByText("Nothing booked")).not.toBeInTheDocument();
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

  it("routes the Inbox pill to the inbox and uses the existing unread count", () => {
    const onOpen = vi.fn();
    render(<ClassroomHomeView model={FULL} loading={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "Inbox, 1 unread" }));
    expect(onOpen).toHaveBeenCalledWith("/inbox");
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
    expect(screen.queryByLabelText("From Joshua")).not.toBeInTheDocument();
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
    expect(screen.queryByText("MESSAGES")).not.toBeInTheDocument();
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
  it("drops the hero when the Continue card already offers the same work", () => {
    render(<ClassroomHomeView model={FULL} loading={false} onOpen={vi.fn()} />);

    expect(screen.getByRole("button", { name: "Start assigned work" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Pick up where you left off" })).toBeNull();
  });

  it("puts the hero directly under the greeting", () => {
    render(
      <ClassroomHomeView
        model={HERO_ONLY}
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
  it("derives all Home booking states from the existing booking data", () => {
    const base = {
      isAdmin: false,
      isLoading: false,
      isError: false,
      nextBookingStartAt: null,
      pass: null,
      offers: [],
    };
    expect(homeBookingFor({ ...base, isLoading: true })).toEqual({ state: "loading" });
    expect(homeBookingFor({ ...base, isError: true })).toEqual({ state: "error" });
    expect(homeBookingFor({ ...base, isAdmin: true })).toEqual({ state: "none" });
    expect(homeBookingFor(base)).toEqual({ state: "none" });
    expect(
      homeBookingFor({
        ...base,
        nextBookingStartAt: "2026-08-07T16:00:00",
        pass: { status: "active", credits_remaining: 3 },
      }),
    ).toEqual({ state: "booked", startsAt: "2026-08-07T16:00:00" });
    expect(
      homeBookingFor({
        ...base,
        pass: { status: "active", credits_remaining: 3 },
      }),
    ).toEqual({ state: "credits", creditsRemaining: 3 });
  });

  it("returns none when the only offer is a renewal", () => {
    expect(
      homeBookingFor({
        isAdmin: false,
        isLoading: false,
        isError: false,
        nextBookingStartAt: null,
        pass: { status: "expired", credits_remaining: 0 },
        offers: [{ id: "package-renewal", url: "/renew" }],
      }),
    ).toEqual({ state: "none" });
  });

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
    // Counted in conversations, the one unit every badge uses.
    expect(subtitleFor(0, 0, 2)).toContain("Two unread conversations.");
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
    // Sentence case since the 2026-10-22 redesign.
    expect(screen.getByText("1 new")).toBeInTheDocument();
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
    expect(screen.queryByText("1 new")).not.toBeInTheDocument();
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


it('shows a named partial-work warning and retry while suppressing unverified summary counts', () => {
  const retry = vi.fn();
  render(<ClassroomHomeView model={{ ...EMPTY, workFailed: true, workSummary: null,
    subtitle: 'Could not confirm saved guided sittings. Available saved work is still shown.',
  }} loading={false} onOpen={vi.fn()} onRetryWork={retry} />);
  expect(screen.getByRole('alert').textContent).toContain('saved guided sittings');
  fireEvent.click(screen.getByRole('button', { name: 'Retry assigned work' }));
  expect(retry).toHaveBeenCalledOnce();
  expect(screen.queryByText(/0 with saved work/)).toBeNull();
  expect(screen.queryByText('Nothing assigned right now.')).toBeNull();
});

describe("featured work and Up next", () => {
  const second = { ...FULL.rows[0], key: "b", title: "Flaw drill", route: "/guided/b", isNew: false, dueToday: false };
  // A repeated assignment: same title, a different instance key.
  const repeat = { ...FULL.rows[0], key: "a-2", route: "/activities/a?instance=2", dueToday: false };

  it("shows the featured assignment once and lists only the others, by exact key", () => {
    render(
      <ClassroomHomeView
        model={{ ...FULL, rows: [FULL.rows[0], second, repeat], continueRow: FULL.rows[0], workSummary: { open: 3, inProgress: 0 } }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    const upNext = screen.getByRole("region", { name: "Up next" });
    const listed = Array.from(upNext.querySelectorAll(".classroom-home-row-title")).map((node) => node.textContent);
    // The featured key "a" is gone from the list; its repeat "a-2" stays.
    expect(listed).toEqual(["Flaw drill", "Negation Station"]);
    expect(screen.getByRole("region", { name: "Next assignment" })).toHaveTextContent("Negation Station");
    // The total is stated in full, not reduced by the featured row.
    expect(screen.getByText("3 open assignments · 0 with saved work")).toBeInTheDocument();
  });

  it("keeps the featured hero's progress on the one featured block", () => {
    const { container } = render(
      <ClassroomHomeView model={{ ...FULL, continueRow: FULL.rows[0] }} loading={false} onOpen={vi.fn()} />,
    );
    expect(container.querySelectorAll(".classroom-home-tick")).toHaveLength(12);
    expect(screen.queryByRole("region", { name: "Pick up where you left off" })).toBeNull();
    expect(screen.getByText("Nothing else is assigned right now.")).toBeInTheDocument();
  });

  it("does not say Nothing assigned while loading or after a failed read", () => {
    const { rerender } = render(<ClassroomHomeView model={EMPTY} loading onOpen={vi.fn()} />);
    expect(screen.getByLabelText("Loading your work")).toBeInTheDocument();
    expect(screen.queryByText("Nothing assigned right now.")).toBeNull();
    rerender(<ClassroomHomeView model={{ ...EMPTY, workFailed: true }} loading={false} onOpen={vi.fn()} />);
    expect(screen.queryByText("Nothing assigned right now.")).toBeNull();
    expect(screen.queryByText(/caught up/i)).toBeNull();
  });

  it("drops the decorative Open and Rest labels from empty days", () => {
    render(<ClassroomHomeView model={EMPTY} loading={false} onOpen={vi.fn()} />);
    const week = screen.getByLabelText("Next seven days");
    expect(week).not.toHaveTextContent(/\bOpen\b/);
    expect(week).not.toHaveTextContent(/\bRest\b/);
  });

  it("puts the featured assignment straight after the greeting, before tools and context, in DOM order", () => {
    const { container } = render(
      <ClassroomHomeView
        model={{ ...FULL, continueRow: FULL.rows[0], workSummary: { open: 1, inProgress: 0 }, daysToTest: 12 }}
        loading={false}
        onOpen={vi.fn()}
      />,
    );
    const order = (node: Element | null) => {
      expect(node).not.toBeNull();
      return Array.from(container.querySelectorAll("*")).indexOf(node!);
    };
    const greeting = order(screen.getByRole("heading", { level: 1 }));
    const featured = order(screen.getByRole("button", { name: "Start assigned work" }));
    const finder = order(screen.getByRole("button", { name: "Find a question" }));
    const drill = order(screen.getByRole("button", { name: "Smart Drill" }));
    const session = order(screen.getByRole("button", { name: /Next session/ }));
    const testDay = order(screen.getByLabelText("12 days to test day"));
    expect(greeting).toBeLessThan(featured);
    for (const later of [finder, drill, session, testDay]) expect(featured).toBeLessThan(later);
    // Tab order follows: the featured action is the first control after the greeting.
    const buttons = screen.getAllByRole("button");
    expect(buttons[0]).toHaveAccessibleName("Start assigned work");
  });

  it("does not show a New count over work that failed to load", () => {
    render(<ClassroomHomeView model={{ ...FULL, workFailed: true, newCount: 3 }} loading={false} onOpen={vi.fn()} />);
    expect(screen.queryByText("3 new")).toBeNull();
  });

  it("offers a manual refresh of assigned work", () => {
    const onRefresh = vi.fn();
    render(<ClassroomHomeView model={FULL} loading={false} onOpen={vi.fn()} onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: "Refresh" }));
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it("offers the full assignment list only when its route is verified open", () => {
    const onOpen = vi.fn();
    const { rerender } = render(<ClassroomHomeView model={{ ...FULL, assignedWorkRoute: "/my-work/to-do" }} loading={false} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: "View all assigned work" }));
    expect(onOpen).toHaveBeenCalledWith("/my-work/to-do");
    rerender(<ClassroomHomeView model={{ ...FULL, assignedWorkRoute: null }} loading={false} onOpen={onOpen} />);
    expect(screen.queryByRole("button", { name: "View all assigned work" })).toBeNull();
  });

  it("reconciles the featured key, remaining new badge and totals after refresh", () => {
    const first = FULL.rows[0];
    const second = { ...first, key: "second", title: "Flaw drill", route: "/guided/second", isNew: true, workStatus: "in_progress" as const };
    const { rerender } = render(<ClassroomHomeView model={{ ...FULL, continueRow: first, rows: [first, second], workSummary: { open: 2, inProgress: 1 } }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Up next" })).toHaveTextContent("Flaw drill");
    expect(screen.getByRole("region", { name: "Up next" })).toHaveTextContent("1 new");
    expect(screen.getByText("2 open assignments · 1 with saved work")).toBeInTheDocument();
    rerender(<ClassroomHomeView model={{ ...FULL, hero: null, continueRow: second, rows: [second], newCount: 1, workSummary: { open: 1, inProgress: 1 } }} loading={false} onOpen={vi.fn()} />);
    expect(screen.getByRole("region", { name: "Next assignment" })).toHaveTextContent("Flaw drill");
    expect(screen.getByRole("region", { name: "Up next" })).not.toHaveTextContent("Flaw drill");
    expect(screen.queryByText("1 new")).toBeNull();
    expect(screen.getByText("1 open assignment · 1 with saved work")).toBeInTheDocument();
  });
});
