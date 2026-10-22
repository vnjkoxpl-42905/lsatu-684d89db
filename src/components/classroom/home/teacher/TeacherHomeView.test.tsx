import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
  { id: "s1", name: "Lydia Park", activityLabel: "Active today", route: "/teacher/students/s1" },
  { id: "s2", name: "Celia Moreno", activityLabel: "Active today", route: "/teacher/students/s2" },
  { id: "s3", name: "Zoë Adams", activityLabel: "Active yesterday", route: "/teacher/students/s3" },
  { id: "s4", name: "Dakota Reyes", activityLabel: "Last active Oct 17", route: "/teacher/students/s4" },
  { id: "s5", name: "Ivory Chen", activityLabel: "Last active Oct 15", route: "/teacher/students/s5" },
  // Not among the five recent rows; the filter must still find her.
  { id: "s6", name: "Fernande Charleus", activityLabel: "Last active Sep 8", route: "/teacher/students/s6" },
];

const READY: TeacherHomeModel = {
  greeting: "Good afternoon",
  displayName: "Joshua",
  dateline: "Thursday · October 22 · 2026",
  unread: {
    state: "ready",
    total: 2,
    rows: [
      { id: "c1", name: "Celia", initial: "C", snippet: "Can we move Friday?", timeLabel: "1:40 pm", receivedAt: "2026-10-22T13:40:00", hasAttachments: false, route: "/teacher/inbox/platform:c1" },
      { id: "c2", name: "Ivory", initial: "I", snippet: "Here is the PDF", timeLabel: "Yesterday", receivedAt: "2026-10-21T09:00:00", hasAttachments: true, route: "/teacher/inbox/platform:c2" },
    ],
  },
  roster: { state: "ready", total: STUDENTS.length, recent: STUDENTS.slice(0, 5), all: STUDENTS },
  sessions: {
    state: "ready",
    rows: [{ id: "x1", name: "Dakota", dayLabel: "Tomorrow", timeLabel: "7:15 pm", durationLabel: "60 min", route: "/teacher/students/d1/schedule" }],
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
  expect(screen.queryByLabelText("Next seven days")).toBeNull();
}

describe("TeacherHomeView", () => {
  it("leads with one assign action that goes to the real assignments room", () => {
    const onOpen = vi.fn();
    render(<TeacherHomeView model={READY} onOpen={onOpen} />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Good afternoon, Joshua.");
    expect(screen.getByText("Teaching desk")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open assignments" }));
    expect(onOpen).toHaveBeenLastCalledWith("/teacher/library/assignments");
    fireEvent.click(screen.getByRole("button", { name: "Open students" }));
    expect(onOpen).toHaveBeenLastCalledWith("/teacher/students");
  });

  it("lists unread conversations with the canonical total and opens each thread", () => {
    const onOpen = vi.fn();
    render(<TeacherHomeView model={READY} onOpen={onOpen} />);
    expect(screen.getByText("Two conversations are unread.")).toBeInTheDocument();
    expect(screen.getByLabelText("2 unread")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Unread conversations" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    expect(within(list).queryByText(/^You:/)).toBeNull();
    fireEvent.click(within(list).getByRole("button", { name: /Celia/ }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/inbox/platform:c1");
    // Unread, not "needs reply": opening a thread is not answering it.
    expect(screen.queryByText(/needs reply/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Open the inbox" }));
    expect(onOpen).toHaveBeenLastCalledWith("/teacher/inbox");
  });

  it("says how many more are unread when the list is capped", () => {
    render(<TeacherHomeView model={{ ...READY, unread: { ...READY.unread, total: 9 } }} onOpen={vi.fn()} />);
    expect(screen.getByRole("button", { name: /Open the inbox, 7 more unread/ })).toBeInTheDocument();
  });

  it("links sessions to the student's schedule, never /teacher/schedule", () => {
    const onOpen = vi.fn();
    render(<TeacherHomeView model={READY} onOpen={onOpen} />);
    fireEvent.click(screen.getByRole("button", { name: /Dakota Tomorrow|Tomorrow.*Dakota/ }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/students/d1/schedule");
    expect(onOpen).not.toHaveBeenCalledWith("/teacher/schedule");
  });

  it("separates unknown from zero: loading and failure never read as nothing unread", () => {
    const { rerender } = render(<TeacherHomeView model={LOADING} onOpen={vi.fn()} />);
    expect(screen.getByText("Checking your inbox.")).toBeInTheDocument();
    expect(screen.queryByText(/Nothing unread/)).toBeNull();
    expect(screen.queryByText("No student accounts yet.")).toBeNull();
    expect(screen.queryByLabelText("Find a student")).toBeNull();
    expectNoStudentContent();

    const retryInbox = vi.fn();
    const retryRoster = vi.fn();
    const retrySessions = vi.fn();
    rerender(
      <TeacherHomeView
        model={FAILED}
        onOpen={vi.fn()}
        onRetryInbox={retryInbox}
        onRetryRoster={retryRoster}
        onRetrySessions={retrySessions}
      />,
    );
    expect(screen.queryByText(/Nothing unread/)).toBeNull();
    expect(screen.queryByText("No sessions scheduled on the platform.")).toBeNull();
    expect(screen.getAllByRole("alert")).toHaveLength(3);
    screen.getAllByRole("button", { name: "Try again" }).forEach((button) => fireEvent.click(button));
    expect(retryInbox).toHaveBeenCalledOnce();
    expect(retryRoster).toHaveBeenCalledOnce();
    expect(retrySessions).toHaveBeenCalledOnce();
    expectNoStudentContent();
  });

  it("keeps a cached empty answer but qualifies it when the refresh fails", () => {
    const retryInbox = vi.fn();
    const retrySessions = vi.fn();
    render(
      <TeacherHomeView
        model={{
          ...EMPTY,
          unread: { state: "ready", total: 0, rows: [], refreshFailed: true },
          sessions: { state: "ready", rows: [], refreshFailed: true },
        }}
        onOpen={vi.fn()}
        onRetryInbox={retryInbox}
        onRetrySessions={retrySessions}
      />,
    );
    // No unqualified, present-tense claims from a stale read.
    expect(screen.queryByText("Every conversation is read.")).toBeNull();
    expect(screen.queryByText(/^Nothing unread/)).toBeNull();
    expect(screen.queryByText("No sessions scheduled on the platform.")).toBeNull();
    expect(screen.getAllByText("Nothing was unread when your inbox last loaded.")).toHaveLength(2);
    expect(screen.getByText("No sessions were scheduled when this last loaded.")).toBeInTheDocument();
    const notices = screen.getAllByRole("status").filter((node) => node.textContent?.includes("Could not refresh"));
    expect(notices).toHaveLength(2);
    within(notices[0]).getByRole("button", { name: "Try again" }).click();
    within(notices[1]).getByRole("button", { name: "Try again" }).click();
    expect(retryInbox).toHaveBeenCalledOnce();
    expect(retrySessions).toHaveBeenCalledOnce();
  });

  it("keeps cached unread rows on screen with a refresh notice", () => {
    render(<TeacherHomeView model={{ ...READY, unread: { ...READY.unread, refreshFailed: true } }} onOpen={vi.fn()} />);
    expect(screen.getByRole("list", { name: "Unread conversations" })).toBeInTheDocument();
    expect(screen.getByText("Two conversations were unread when your inbox last loaded.")).toBeInTheDocument();
    expect(screen.getByText("Could not refresh. Showing what loaded last.")).toBeInTheDocument();
  });

  it("states real empties plainly", () => {
    render(<TeacherHomeView model={EMPTY} onOpen={vi.fn()} />);
    expect(screen.getByText("Every conversation is read.")).toBeInTheDocument();
    expect(screen.getByText(/Nothing unread/)).toBeInTheDocument();
    expect(screen.getByText("No sessions scheduled on the platform.")).toBeInTheDocument();
    expect(screen.getByText("No student accounts yet.")).toBeInTheDocument();
    expectNoStudentContent();
  });

  it("never shows student Home content in the ready state either", () => {
    render(<TeacherHomeView model={READY} onOpen={vi.fn()} />);
    expectNoStudentContent();
  });

  describe("Find a student", () => {
    it("searches every fetched student, not only the recent five, and opens the existing route", () => {
      const onOpen = vi.fn();
      render(<TeacherHomeView model={READY} onOpen={onOpen} />);
      expect(screen.getByRole("list", { name: "Recently active students" })).toBeInTheDocument();
      fireEvent.change(screen.getByLabelText("Find a student"), { target: { value: "fern" } });
      const matches = screen.getByRole("list", { name: "Matching students" });
      expect(within(matches).getAllByRole("listitem")).toHaveLength(1);
      fireEvent.click(within(matches).getByRole("button", { name: /Fernande Charleus/ }));
      expect(onOpen).toHaveBeenCalledWith("/teacher/students/s6");
    });

    it("says so when nothing matches, and Clear restores the recent list", () => {
      render(<TeacherHomeView model={READY} onOpen={vi.fn()} />);
      fireEvent.change(screen.getByLabelText("Find a student"), { target: { value: "nobody" } });
      expect(screen.getByText("No student matches “nobody”.")).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Clear student search" }));
      expect(screen.getByRole("list", { name: "Recently active students" })).toBeInTheDocument();
      expect(screen.getByLabelText("Find a student")).toHaveValue("");
    });

    it("opens the first match on Enter", () => {
      const onOpen = vi.fn();
      render(<TeacherHomeView model={READY} onOpen={onOpen} />);
      const input = screen.getByLabelText("Find a student");
      fireEvent.change(input, { target: { value: "zoe" } });
      fireEvent.keyDown(input, { key: "Enter" });
      expect(onOpen).toHaveBeenCalledWith("/teacher/students/s3");
    });
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
      { id: "p1", conversation_id: "c1", user_id: "joshua", last_read_at: "", is_admin: true, display_name: "Joshua" },
      { id: "p2", conversation_id: "c1", user_id: "celia", last_read_at: "", is_admin: false, display_name: "Celia" },
    ],
    last_message: { body: "Can we move Friday?", created_at: "2026-10-22T13:40:00", sender_id: "celia" },
    latest_unread_message: { body: "Can we move Friday?", created_at: "2026-10-22T13:40:00", sender_id: "celia" },
    latest_unread_at: "2026-10-22T13:40:00",
    unread: true,
    home_cleared_at: null,
    hasAttachments: false,
    ...patch,
  });

  it("keeps only unread threads, names the student and routes to the teacher inbox", () => {
    const rows = buildUnreadThreads([thread({}), thread({ id: "c2", unread: false })], "joshua", NOW);
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Celia", snippet: "Can we move Friday?", timeLabel: "1:40 pm", route: "/teacher/inbox/platform:c1" });
  });

  it("shows the waiting student message even after the teacher replied, and orders by it", () => {
    const replied = thread({
      id: "c1",
      // Celia wrote on the 20th; Joshua replied this morning without opening past it.
      latest_unread_message: { body: "Is 14 a flaw question?", created_at: "2026-10-20T09:00:00", sender_id: "celia" },
      latest_unread_at: "2026-10-20T09:00:00",
      last_message: { body: "Hi Celia, here is your booking link", created_at: "2026-10-22T09:00:00", sender_id: "joshua" },
      last_message_at: "2026-10-22T09:00:00",
    });
    const fresher = thread({
      id: "c2",
      latest_unread_message: { body: "Done with the set", created_at: "2026-10-21T18:00:00", sender_id: "celia" },
      latest_unread_at: "2026-10-21T18:00:00",
      last_message: { body: "Done with the set", created_at: "2026-10-21T18:00:00", sender_id: "celia" },
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
        { class_id: "a", display_name: "Joshua", last_seen_at: "2026-10-22T10:00:00", role: "admin" },
        { class_id: "b", display_name: "Lydia", last_seen_at: "2026-10-20T10:00:00", role: "student" },
        { class_id: "c", display_name: "Celia", last_seen_at: "2026-10-22T09:00:00", role: "student" },
        { class_id: "d", display_name: null, last_seen_at: null, role: "student" },
      ],
      NOW,
    );
    expect(roster.total).toBe(3);
    expect(roster.recent.map((row) => row.name)).toEqual(["Celia", "Lydia", "Unnamed student"]);
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
      [{ id: "x", student_id: "zz", scheduled_at: new Date(2026, 9, 23, 19, 15).toISOString(), duration_minutes: 60 }],
      new Map(),
      NOW,
    );
    expect(rows[0]).toMatchObject({ name: "Student", dayLabel: "Tomorrow", timeLabel: "7:15 pm", durationLabel: "60 min" });
  });

  it("writes the lede only from what loaded", () => {
    expect(teacherLede({ state: "loading", total: null, rows: [] })).toBe("Checking your inbox.");
    expect(teacherLede({ state: "error", total: null, rows: [] })).toMatch(/did not load/);
    expect(teacherLede({ state: "ready", total: 0, rows: [] })).toBe("Every conversation is read.");
    expect(teacherLede({ state: "ready", total: 1, rows: [] })).toBe("One conversation is unread.");
    expect(teacherLede({ state: "ready", total: 0, rows: [], refreshFailed: true })).toBe(
      "Nothing was unread when your inbox last loaded.",
    );
  });
});
