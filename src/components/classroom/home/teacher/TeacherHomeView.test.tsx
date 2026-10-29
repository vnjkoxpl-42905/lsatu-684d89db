import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within, waitFor } from "@testing-library/react";
import { TeacherHomeView } from "./TeacherHomeView";
import {
  buildRoster,
  buildSessions,
  buildUnreadThreads,
  filterStudents,
  teacherLede,
  type TeacherHomeModel,
} from "./teacherHomeModel";
import { EMPTY_DESK } from "./teachingDeskModel";
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
  expect(screen.queryByRole("button", { name: /^Book (a |your )?session/i })).toBeNull();
}

describe("TeacherHomeView", () => {
  it("keeps direct access editing open after a blank selection and returns focus to its own row", async () => {
    const account = { class_id: "s1", display_name: "Lydia Park", email: "lydia@example.invalid", role: "student", access_tier: "tier_2", archived_at: null } as any;
    const save = vi.fn().mockResolvedValue({ ...account, access_tier: "tier_3" });
    render(<TeacherHomeView model={{ ...READY, desk: { ...EMPTY_DESK, access: { state: "ready", data: [account] }, actions: { saveHomeAccess: save } as any } }} onOpen={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Find a student"), { target: { value: "Lydia" } });
    const trigger = screen.getByRole("button", { name: "Edit access" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", { name: "Student access" });
    fireEvent.change(within(dialog).getByLabelText("Student"), { target: { value: "" } });
    expect(screen.getByRole("dialog", { name: "Student access" })).toBeInTheDocument();
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(within(dialog).getByLabelText("Student"), { target: { value: "s1" } });
    fireEvent.change(within(dialog).getByLabelText("Access choice"), { target: { value: "tier_3" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirm access change" }));
    await waitFor(() => expect(save).toHaveBeenCalledWith(account, "tier_3", undefined));
    fireEvent.click(within(dialog).getAllByRole("button", { name: "Close" })[0]);
    await waitFor(() => expect(trigger).toHaveFocus());
  });
  it("makes account operations discoverable and opens access selection without an account write", async () => {
    render(<TeacherHomeView model={READY} onOpen={vi.fn()} />);
    const accounts = screen.getByRole("group", { name: "Student accounts" });
    expect(accounts).toHaveAttribute("data-account-controls", "student-credits-scheduling-20261028");
    expect(within(accounts).getByRole("button", { name: "Schedule a session" })).toBeInTheDocument();
    expect(within(accounts).getByRole("button", { name: "Add session credits" })).toBeInTheDocument();
    expect(within(accounts).getByRole("button", { name: "Individual booking links" })).toBeInTheDocument();
    fireEvent.click(within(accounts).getByRole("button", { name: "Account access" }));
    expect(await screen.findByRole("dialog", { name: "Student access" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Confirm access change" })).toBeNull();
  });

  it("keeps the masthead truthful when a saved empty queue cannot refresh", () => {
    const { container } = render(
      <TeacherHomeView
        model={{
          ...EMPTY,
          postSession: {
            state: "ready",
            refreshFailed: true,
            data: {
              tasks: [],
              handled: [],
              total: 0,
              settings: {
                enabled: true,
                activation_cutoff: "2026-10-28T12:00:00Z",
                last_success_at: new Date().toISOString(),
                last_error: null,
                catching_up: false,
                drive_root_url: null,
              },
            },
          },
        }}
        onOpen={vi.fn()}
      />,
    );
    expect(
      within(
        container.querySelector(".home-desk-masthead") as HTMLElement,
      ).getByText("0 sessions were waiting when your work list last loaded."),
    ).toBeInTheDocument();
    expect(container.querySelector('[data-work-state="quiet"]')).toBeNull();
  });
  it("keeps Assign work in the header without a student assignment promotion", () => {
    const onOpen = vi.fn();
    render(<TeacherHomeView model={READY} onOpen={onOpen} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Good afternoon, Joshua.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Assign work" }));
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
      screen.getByText(/student and enquiry email is not connected yet/),
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
