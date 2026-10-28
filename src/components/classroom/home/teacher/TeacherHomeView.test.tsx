import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor, act } from "@testing-library/react";
import { EMPTY_DESK } from "./teachingDeskModel";
import { TeacherHomeView } from "./TeacherHomeView";
import {
  buildRoster,
  buildSessions,
  buildUnreadThreads,
  filterStudents,
  teacherLede,
  type TeacherHomeModel,
} from "./teacherHomeModel";
import type { Conversation } from "@/hooks/useInbox";

const NOW = new Date(2026, 9, 22, 14, 0);

const STUDENTS = [
  {
    id: "s1",
    name: "Lydia Park",
    activityLabel: "Active today",
    route: "/teacher/students/s1",
  },
  {
    id: "s2",
    name: "Celia Moreno",
    activityLabel: "Active today",
    route: "/teacher/students/s2",
  },
  {
    id: "s3",
    name: "Zoë Adams",
    activityLabel: "Active yesterday",
    route: "/teacher/students/s3",
  },
  {
    id: "s4",
    name: "Dakota Reyes",
    activityLabel: "Last active Oct 17",
    route: "/teacher/students/s4",
  },
  {
    id: "s5",
    name: "Ivory Chen",
    activityLabel: "Last active Oct 15",
    route: "/teacher/students/s5",
  },
  // Not among the five recent rows; the filter must still find her.
  {
    id: "s6",
    name: "Fernande Charleus",
    activityLabel: "Last active Sep 8",
    route: "/teacher/students/s6",
  },
];

const READY: TeacherHomeModel = {
  greeting: "Good afternoon",
  displayName: "Joshua",
  dateline: "Thursday · October 22 · 2026",
  unread: {
    state: "ready",
    total: 2,
    rows: [
      {
        id: "c1",
        name: "Celia",
        initial: "C",
        snippet: "Can we move Friday?",
        timeLabel: "1:40 pm",
        receivedAt: "2026-10-22T13:40:00",
        hasAttachments: false,
        route: "/teacher/inbox/platform:c1",
      },
      {
        id: "c2",
        name: "Ivory",
        initial: "I",
        snippet: "Here is the PDF",
        timeLabel: "Yesterday",
        receivedAt: "2026-10-21T09:00:00",
        hasAttachments: true,
        route: "/teacher/inbox/platform:c2",
      },
    ],
  },
  roster: {
    state: "ready",
    total: STUDENTS.length,
    recent: STUDENTS.slice(0, 5),
    all: STUDENTS,
  },
  sessions: {
    state: "ready",
    rows: [
      {
        id: "x1",
        name: "Dakota",
        dayLabel: "Tomorrow",
        timeLabel: "7:15 pm",
        durationLabel: "60 min",
        route: "/teacher/students/d1/schedule",
      },
    ],
  },
};

const LOADING: TeacherHomeModel = {
  ...READY,
  unread: { state: "loading", total: null, rows: [] },
  roster: { state: "loading", total: null, recent: [] },
  sessions: { state: "loading", rows: [] },
};

const FAILED: TeacherHomeModel = {
  ...READY,
  unread: { state: "error", total: null, rows: [] },
  roster: { state: "error", total: null, recent: [] },
  sessions: { state: "error", rows: [] },
};

const EMPTY: TeacherHomeModel = {
  ...READY,
  unread: { state: "ready", total: 0, rows: [] },
  roster: { state: "ready", total: 0, recent: [], all: [] },
  sessions: { state: "ready", rows: [] },
};

function expectNoStudentContent() {
  expect(screen.queryByText(/assigned to you/i)).toBeNull();
  expect(screen.queryByText(/assignments? (is|are) waiting/i)).toBeNull();
  expect(screen.queryByRole("button", { name: /smart drill/i })).toBeNull();
  expect(screen.queryByRole("button", { name: /book/i })).toBeNull();
}

describe("TeacherHomeView", () => {
  it("uses an accessible More menu that closes on Escape and returns focus", async () => {
    render(<TeacherHomeView model={READY} onOpen={vi.fn()} />);
    const trigger = screen.getByRole("button", { name: "More" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    const menu = await screen.findByRole("menu");
    expect(within(menu).getByRole("menuitem", { name: "Create session link" })).toBeInTheDocument();
    fireEvent.keyDown(menu, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("menu")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it("hands More selection to the booking sheet and returns to an interactive page", async () => {
    const onOpen = vi.fn();
    render(<TeacherHomeView model={READY} onOpen={onOpen} />);
    const trigger = screen.getByRole("button", { name: "More" });
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    fireEvent.click(await screen.findByRole("menuitem", { name: "Create session link" }));
    const sheet = await screen.findByRole("dialog", { name: "Session link" });
    expect(screen.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(sheet.contains(document.activeElement)).toBe(true));
    expect(within(sheet).getByLabelText("Student")).toBeInTheDocument();
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(document.body.style.pointerEvents).not.toBe("none");
    fireEvent.click(screen.getByRole("button", { name: "Assign work ↗" }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/library/assignments");
  });
  it("keeps Assign work in the header without a student assignment promotion", () => {
    const onOpen = vi.fn();
    render(<TeacherHomeView model={READY} onOpen={onOpen} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Good afternoon, Joshua.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Assign work ↗" }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/library/assignments");
    expectNoStudentContent();
  });
  it("shows the canonical unread total while capping previews at two and opens the exact conversation", () => {
    const onOpen = vi.fn();
    render(
      <TeacherHomeView
        model={{ ...READY, unread: { ...READY.unread, total: 9 } }}
        onOpen={onOpen}
      />,
    );
    expect(
      screen.getByRole("heading", { name: "Messages (9)" }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Unread conversations" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(within(list).getByRole("button", { name: /Celia/ }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/inbox/platform:c1");
    expect(screen.queryByText(/needs reply/i)).toBeNull();
  });
  it("does not confuse missing provider setup with an empty healthy queue", () => {
    render(<TeacherHomeView model={READY} onOpen={vi.fn()} />);
    expect(
      screen.getByText(/Automatic session tasks are not connected/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No after-session tasks are waiting."),
    ).toBeNull();
    expect(screen.queryByText("No payment decisions waiting.")).toBeNull();
    expect(screen.getByText(/Test results are not connected yet/)).toBeInTheDocument();
  });
  it("separates unknown inbox and activity from empty data", () => {
    const { rerender } = render(
      <TeacherHomeView model={LOADING} onOpen={vi.fn()} />,
    );
    expect(screen.getByText("Loading messages…")).toBeInTheDocument();
    expect(screen.queryByText("No unread conversations.")).toBeNull();
    expect(screen.getByLabelText("Find a student")).toBeDisabled();
    const retry = vi.fn();
    rerender(
      <TeacherHomeView model={FAILED} onOpen={vi.fn()} onRetryInbox={retry} />,
    );
    fireEvent.click(
      within(screen.getByText(/Unread messages are unknown/)).getByRole(
        "button",
        { name: "Retry" },
      ),
    );
    expect(retry).toHaveBeenCalledOnce();
  });
  it("qualifies a stale empty inbox and retains cached unread rows", () => {
    const { rerender } = render(
      <TeacherHomeView
        model={{ ...EMPTY, unread: { ...EMPTY.unread, refreshFailed: true } }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.queryByText("No unread conversations.")).toBeNull();
    expect(
      screen.getByText(
        "No conversations were unread when the inbox last loaded.",
      ),
    ).toBeInTheDocument();
    rerender(
      <TeacherHomeView
        model={{ ...READY, unread: { ...READY.unread, refreshFailed: true } }}
        onOpen={vi.fn()}
      />,
    );
    expect(
      screen.getByRole("list", { name: "Unread conversations" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(
      "Could not refresh messages",
    );
  });
  it("searches beyond recent students, supports accent-insensitive Enter and Escape", () => {
    const onOpen = vi.fn();
    render(<TeacherHomeView model={READY} onOpen={onOpen} />);
    const input = screen.getByLabelText("Find a student");
    fireEvent.change(input, { target: { value: "fern" } });
    fireEvent.click(
      within(screen.getByRole("list", { name: "Matching students" })).getByRole(
        "button",
        { name: /Fernande/ },
      ),
    );
    expect(onOpen).toHaveBeenCalledWith("/teacher/students/s6");
    fireEvent.change(input, { target: { value: "zoe" } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/teacher/students/s3");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveValue("");
  });
  it("keeps the recent-visit area small and never labels a heartbeat Online now", () => {
    render(<TeacherHomeView model={READY} onOpen={vi.fn()} />);
    expect(
      within(
        screen.getByRole("list", { name: "Recently active students" }),
      ).getAllByRole("listitem"),
    ).toHaveLength(3);
    expect(screen.queryByText("Online now")).toBeNull();
    expectNoStudentContent();
  });
});

describe("Teacher Home provider setup rendering", () => {
  it("keeps the desk rendered when email has the live array-free setup envelope", () => {
    const email = {
      state: "setup" as const,
      data: {
        ok: false,
        setup_required: true,
        error: "student_email_setup_required",
        fetched_at: "2026-10-28T16:21:40.683Z",
      } as any,
    };
    render(
      <TeacherHomeView
        model={{
          ...READY,
          desk: {
            manual: { state: "error" },
            agenda: {
              state: "ready",
              data: {
                events: [],
                next_cursor: null,
                fetched_at: "2026-10-28T16:21:40.683Z",
              },
            },
            email,
            payments: {
              state: "ready",
              data: { recent: [], attention: [], total: 0, attention_total: 0 },
            },
            results: { state: "ready", data: [] },
            access: { state: "ready", data: [] },
          },
        }}
        onOpen={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Joshua",
    );
    expect(
      screen.getByRole("heading", { name: "After-session work" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "My list" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Student and enquiry email is not connected yet/),
    ).toBeInTheDocument();
    expect(
      screen.queryByText("No unread student or enquiry email."),
    ).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Next up" }),
    ).toBeInTheDocument();
  });
});

describe("teacherHomeModel", () => {
  const thread = (patch: Partial<Conversation>): Conversation => ({
    id: "c1",
    subject: null,
    created_by: "joshua",
    created_at: "2026-10-01T00:00:00Z",
    last_message_at: "2026-10-22T13:40:00",
    participants: [
      {
        id: "p1",
        conversation_id: "c1",
        user_id: "joshua",
        last_read_at: "",
        is_admin: true,
        display_name: "Joshua",
      },
      {
        id: "p2",
        conversation_id: "c1",
        user_id: "celia",
        last_read_at: "",
        is_admin: false,
        display_name: "Celia",
      },
    ],
    last_message: {
      body: "Can we move Friday?",
      created_at: "2026-10-22T13:40:00",
      sender_id: "celia",
    },
    latest_unread_message: {
      body: "Can we move Friday?",
      created_at: "2026-10-22T13:40:00",
      sender_id: "celia",
    },
    latest_unread_at: "2026-10-22T13:40:00",
    unread: true,
    home_cleared_at: null,
    hasAttachments: false,
    ...patch,
  });

  it("keeps only unread threads, names the student and routes to the teacher inbox", () => {
    const rows = buildUnreadThreads(
      [thread({}), thread({ id: "c2", unread: false })],
      "joshua",
      NOW,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      name: "Celia",
      snippet: "Can we move Friday?",
      timeLabel: "1:40 pm",
      route: "/teacher/inbox/platform:c1",
    });
  });

  it("shows the waiting student message even after the teacher replied, and orders by it", () => {
    const replied = thread({
      id: "c1",
      // Celia wrote on the 20th; Joshua replied this morning without opening past it.
      latest_unread_message: {
        body: "Is 14 a flaw question?",
        created_at: "2026-10-20T09:00:00",
        sender_id: "celia",
      },
      latest_unread_at: "2026-10-20T09:00:00",
      last_message: {
        body: "Hi Celia, here is your booking link",
        created_at: "2026-10-22T09:00:00",
        sender_id: "joshua",
      },
      last_message_at: "2026-10-22T09:00:00",
    });
    const fresher = thread({
      id: "c2",
      latest_unread_message: {
        body: "Done with the set",
        created_at: "2026-10-21T18:00:00",
        sender_id: "celia",
      },
      latest_unread_at: "2026-10-21T18:00:00",
      last_message: {
        body: "Done with the set",
        created_at: "2026-10-21T18:00:00",
        sender_id: "celia",
      },
      last_message_at: "2026-10-21T18:00:00",
    });
    const rows = buildUnreadThreads([replied, fresher], "joshua", NOW);
    expect(rows.map((row) => row.id)).toEqual(["c2", "c1"]);
    expect(rows[1].snippet).toBe("Is 14 a flaw question?");
    expect(rows[1].snippet).not.toMatch(/booking link/);
    expect(rows[1].timeLabel).toBe("Oct 20");
  });

  it("drops admins from the roster, orders by recent activity and keeps every student for search", () => {
    const roster = buildRoster(
      [
        {
          class_id: "a",
          display_name: "Joshua",
          last_seen_at: "2026-10-22T10:00:00",
          role: "admin",
        },
        {
          class_id: "b",
          display_name: "Lydia",
          last_seen_at: "2026-10-20T10:00:00",
          role: "student",
        },
        {
          class_id: "c",
          display_name: "Celia",
          last_seen_at: "2026-10-22T09:00:00",
          role: "student",
        },
        {
          class_id: "d",
          display_name: null,
          last_seen_at: null,
          role: "student",
        },
      ],
      NOW,
    );
    expect(roster.total).toBe(3);
    expect(roster.recent.map((row) => row.name)).toEqual([
      "Celia",
      "Lydia",
      "Unnamed student",
    ]);
    expect(roster.all).toHaveLength(3);
    expect(roster.recent[0].activityLabel).toBe("Active today");
    expect(roster.recent[2].activityLabel).toBe("No activity recorded");
  });

  it("matches names regardless of case or accents", () => {
    expect(filterStudents(STUDENTS, "ZOE").map((s) => s.id)).toEqual(["s3"]);
    expect(filterStudents(STUDENTS, "  ").length).toBe(STUDENTS.length);
  });

  it("labels sessions by local day and falls back to a neutral name", () => {
    const rows = buildSessions(
      [
        {
          id: "x",
          student_id: "zz",
          scheduled_at: new Date(2026, 9, 23, 19, 15).toISOString(),
          duration_minutes: 60,
        },
      ],
      new Map(),
      NOW,
    );
    expect(rows[0]).toMatchObject({
      name: "Student",
      dayLabel: "Tomorrow",
      timeLabel: "7:15 pm",
      durationLabel: "60 min",
    });
  });

  it("writes the lede only from what loaded", () => {
    expect(teacherLede({ state: "loading", total: null, rows: [] })).toBe(
      "Checking your inbox.",
    );
    expect(teacherLede({ state: "error", total: null, rows: [] })).toMatch(
      /did not load/,
    );
    expect(teacherLede({ state: "ready", total: 0, rows: [] })).toBe(
      "Every conversation is read.",
    );
    expect(teacherLede({ state: "ready", total: 1, rows: [] })).toBe(
      "One conversation is unread.",
    );
    expect(
      teacherLede({ state: "ready", total: 0, rows: [], refreshFailed: true }),
    ).toBe("Nothing was unread when your inbox last loaded.");
  });
});

describe("teacher seven-day calendar", () => {
  it("groups upcoming starts in the connected zone and preserves partial snapshot qualifications", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T22:00:00Z"));
    try {
      const onOpen = vi.fn();
      render(<TeacherHomeView model={{ ...READY, desk: { ...EMPTY_DESK, agenda: {
        state: "ready", stale: true, data: { fetched_at: "2026-10-28T21:00:00Z", time_zone: "America/Toronto", next_cursor: "another-page", events: [
          { id: "late", title: "Late session", starts_at: "2026-10-29T01:00:00Z", ends_at: "2026-10-29T02:00:00Z", status: "confirmed", calendar_url: "", student_id: "s1", student_name: "Lydia" },
          { id: "all-day", title: "All-day event", starts_at: "2026-10-29", ends_at: "2026-10-30", status: "confirmed", calendar_url: "", student_id: null, student_name: null },
        ] }
      } } }} onOpen={onOpen} />);
      const week = screen.getByRole("region", { name: "The next seven days" });
      expect(within(week).getAllByRole("button", { pressed: true })).toHaveLength(1);
      expect(within(week).getByRole("button", { name: /Wednesday, October 28, today, 1 upcoming event shown/ })).toHaveAttribute("aria-pressed", "true");
      expect(within(week).getByText("Late session")).toBeInTheDocument();
      expect(within(week).getByText("9:00 PM")).toBeInTheDocument();
      expect(document.querySelector(".home-desk-agenda-list time")).toHaveTextContent("Oct 28, 9:00 PM");
      fireEvent.click(within(week).getByRole("button", { name: /Thursday, October 29, 1 upcoming event shown/ }));
      expect(within(week).getByText("All-day event")).toBeInTheDocument();
      expect(within(week).getByText("All day")).toBeInTheDocument();
      expect(within(week).queryByText("Late session")).toBeNull();
      expect(screen.getByText("Late session")).toBeInTheDocument(); // Next up stays intact.
      expect(within(week).getByText(/Some events may not be shown/)).toHaveTextContent("Calendar refresh is delayed");
      fireEvent.click(within(week).getByRole("button", { name: /Friday, October 30, No upcoming events shown/ }));
      expect(within(week).getByText(/No upcoming events shown for this day/)).toBeInTheDocument();
      expect(within(week).queryByText("No events")).toBeNull();
    } finally { vi.useRealTimers(); }
  });
  it("moves today at calendar-zone midnight while retaining the snapshot date", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-29T03:59:30Z"));
    try {
      render(<TeacherHomeView model={{ ...READY, desk: { ...EMPTY_DESK, agenda: { state: "ready", data: { fetched_at: "2026-10-29T03:00:00Z", time_zone: "America/Toronto", next_cursor: null, events: [] } } } }} onOpen={vi.fn()} />);
      const week = screen.getByRole("region", { name: "The next seven days" });
      expect(within(week).getByRole("button", { name: /Wednesday, October 28, today/ })).toHaveAttribute("aria-pressed", "true");
      act(() => { vi.advanceTimersByTime(60_000); });
      expect(within(week).getByRole("button", { name: /Thursday, October 29, today/ })).toHaveAttribute("aria-pressed", "true");
      expect(within(week).getByText(/Updated Oct 28/)).toBeInTheDocument();
    } finally { vi.useRealTimers(); }
  });
});

describe("teacher calendar status", () => {
  it("reports one calendar error and one retry for both calendar presentations", () => {
    render(<TeacherHomeView model={{ ...READY, desk: { ...EMPTY_DESK, agenda: { state: "error", retry: vi.fn() } } }} onOpen={vi.fn()} />);
    expect(screen.getAllByText(/Could not load primary calendar/)).toHaveLength(1);
    const calendarError = screen.getByText(/Could not load primary calendar/);
    expect(within(calendarError).getByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByText(/Calendar is unavailable/)).toBeInTheDocument();
  });
});

describe("teacher saved calendar coverage", () => {
  it("removes past timed starts and falls back to today outside an aged snapshot", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-28T22:00:00Z"));
    try {
      render(<TeacherHomeView model={{ ...READY, desk: { ...EMPTY_DESK, agenda: { state: "ready", data: { fetched_at: "2026-10-28T21:59:00Z", time_zone: "America/Toronto", next_cursor: null, events: [
        { id: "past", title: "Earlier session", starts_at: "2026-10-28T20:00:00Z", ends_at: "2026-10-28T21:00:00Z", status: "confirmed", calendar_url: "", student_id: null, student_name: null },
        { id: "future", title: "Upcoming session", starts_at: "2026-10-28T23:00:00Z", ends_at: "2026-10-29T00:00:00Z", status: "confirmed", calendar_url: "", student_id: null, student_name: null },
      ] } } } }} onOpen={vi.fn()} />);
      const week = screen.getByRole("region", { name: "The next seven days" });
      expect(within(week).queryByText("Earlier session")).toBeNull();
      expect(within(week).getByText("Upcoming session")).toBeInTheDocument();
      vi.setSystemTime(new Date("2026-10-28T23:30:00Z"));
      act(() => { vi.advanceTimersByTime(60_000); });
      expect(within(week).queryByText("Upcoming session")).toBeNull();
      expect(within(week).getByText(/Calendar refresh is delayed/)).toBeInTheDocument();
      fireEvent.click(within(week).getByRole("button", { name: /Thursday, October 29/ }));
      vi.setSystemTime(new Date("2026-11-06T18:00:00Z"));
      act(() => { vi.advanceTimersByTime(60_000); });
      expect(within(week).getByRole("button", { name: "Friday, November 6, today, Unknown" })).toHaveAttribute("aria-pressed", "true");
      expect(within(week).getByText(/This day is outside the known calendar snapshot/)).toBeInTheDocument();
      expect(within(week).getAllByRole("button", { name: /Unknown/ })).toHaveLength(7);
      expect(within(week).queryByText("None shown")).toBeNull();
      expect(week.querySelector('[aria-live="polite"]')).toHaveTextContent("Friday, November 6. Calendar coverage unknown for this day.");
    } finally { vi.useRealTimers(); }
  });
  it.each([undefined, "bad-date"])("uses unknown coverage when snapshot time is %s and safely falls back from an invalid zone", fetched_at => {
    render(<TeacherHomeView model={{ ...READY, desk: { ...EMPTY_DESK, agenda: { state: "ready", data: { fetched_at: fetched_at as string, time_zone: "invalid/zone", next_cursor: null, events: [] } } } }} onOpen={vi.fn()} />);
    const week = screen.getByRole("region", { name: "The next seven days" });
    expect(within(week).getAllByRole("button", { name: /Unknown/ })).toHaveLength(7);
    expect(within(week).getByText(/Snapshot time unavailable/)).toHaveTextContent(Intl.DateTimeFormat().resolvedOptions().timeZone);
  });
});

it("compacts the all-confirmed-empty summary but keeps unknown and stale email visible", () => {
  const settings = { enabled: true, activation_cutoff: new Date().toISOString(), last_success_at: new Date().toISOString(), last_error: null, drive_root_url: null, catching_up: false };
  const model: TeacherHomeModel = { ...READY, postSession: { state: "ready", data: { settings, tasks: [], handled: [], total: 0 } }, desk: { ...EMPTY_DESK,
    payments: { state: "ready", data: { attention: [], attention_total: 0, recent: [], total: 0 } },
    access: { state: "ready", data: [] },
    email: { state: "ready", data: { threads: [], count: 0, fetched_at: new Date().toISOString() } },
  } };
  const { rerender } = render(<TeacherHomeView model={model} onOpen={vi.fn()} />);
  expect(screen.queryByRole("navigation", { name: "Jump to work" })).toBeNull();
  expect(screen.getByText("No after-session tasks are waiting.")).toBeInTheDocument();
  rerender(<TeacherHomeView model={{ ...model, desk: { ...model.desk!, email: { state: "setup" } } }} onOpen={vi.fn()} />);
  expect(screen.getByRole("navigation", { name: "Jump to work" })).toBeInTheDocument();
  expect(screen.getByText("Not connected")).toBeInTheDocument();
  rerender(<TeacherHomeView model={{ ...model, desk: { ...model.desk!, email: { ...model.desk!.email, stale: true } } }} onOpen={vi.fn()} />);
  expect(screen.getByRole("navigation", { name: "Jump to work" })).toBeInTheDocument();
});
