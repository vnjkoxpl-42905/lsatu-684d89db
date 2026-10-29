import { describe, it, expect, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { PostSessionWork } from "./PostSessionWork";
import { MyList, AllTasksSheet } from "./TeacherTasks";
import { AccessSheet, BookingSheet } from "./TeacherAccessBooking";
import {
  paymentNeedsAction,
  safeGoogleLink,
  EMPTY_DESK,
  type TeachingDesk,
  type ManualTask,
} from "./teachingDeskModel";
import { ALL_FLAG_KEYS, type ManagedUser } from "@/lib/adminUsers";
import type { PostSessionTask } from "./postSessionModel";
const task: PostSessionTask = {
  id: "one",
  revision: 2,
  student_id: "student",
  student_name: "Ada",
  source_title: "Session",
  starts_at: "2026-10-28T15:00:00Z",
  ends_at: "2026-10-28T16:00:00Z",
  source_state: "ended",
  match_state: "matched",
  transcript_doc_id: null,
  transcript_source: null,
  transcript_status: "waiting",
  drive_folder_url: null,
  local_slug: null,
  recap_done: false,
  recap_posted: false,
  notes_done: false,
  work_assigned: false,
  handled_at: null,
};
const settings = {
  enabled: true,
  activation_cutoff: "2026-10-28T00:00:00Z",
  last_success_at: new Date().toISOString(),
  last_error: null,
  drive_root_url: null,
  catching_up: false,
};
const manual: ManualTask = {
  id: "manual",
  revision: 3,
  title: "Prepare the next set",
  student_id: null,
  student_name: null,
  blocker: null,
  kind: "manual",
  handled_at: null,
  created_at: new Date().toISOString(),
};
const person = {
  ...Object.fromEntries(ALL_FLAG_KEYS.map((k) => [k, true])),
  class_id: "student",
  display_name: "Ada",
  email: "ada@example.invalid",
  role: "student",
  access_tier: null,
  archived_at: null,
  archived_reason: null,
  last_seen_at: null,
} as ManagedUser;
const desk: TeachingDesk = {
  ...EMPTY_DESK,
  manual: {
    state: "ready",
    data: { items: [manual], total: 8, next_cursor: "next" },
  },
  actorId: "owner",
  mutateManual: vi.fn().mockResolvedValue(undefined),
};
describe("Teaching desk interactions", () => {
  it("shows a truthful reload fallback instead of a dead retry button and distinguishes setup", () => {
    const props = { open: true, person: null, students: [], onSelect: vi.fn(), onSaved: vi.fn(), onClose: vi.fn() };
    const { rerender } = render(<AccessSheet {...props} rosterState="error" />);
    expect(screen.queryByRole("button", { name: "Retry accounts" })).toBeNull();
    expect(screen.getByRole("alert")).toHaveTextContent("Reload Home to check again.");
    rerender(<AccessSheet {...props} rosterState="setup" />);
    expect(screen.getByRole("alert")).toHaveTextContent("Account controls are not set up yet.");
    const retry = vi.fn();
    rerender(<AccessSheet {...props} rosterState="error" onRetryRoster={retry} />);
    fireEvent.click(screen.getByRole("button", { name: "Retry accounts" }));
    expect(retry).toHaveBeenCalledOnce();
  });
  const bookingPass = { id: "pass", student_id: "student", credits_remaining: 2, total_credits: 2, used_credits: 0, status: "active", booking_url: "https://example.invalid/private", session_length_minutes: 70, expires_at: null };
  function bookingActions(pass: any = bookingPass) {
    return { getPendingHomeTopUp: () => null, loadHomeBooking: vi.fn().mockResolvedValue(pass), prepareHomeTopUp: vi.fn().mockReturnValue({ operationKey: "one", amount: 1 }), addHomeBookingCredits: vi.fn().mockResolvedValue({ pass: { ...bookingPass, credits_remaining: 3 }, receipt: {} }), createHomeBooking: vi.fn(), revokeHomeBooking: vi.fn(), saveHomeAccess: vi.fn() } as any;
  }
  it("explains invalid creation settings before starting any request", async () => {
    const actions = bookingActions(null);
    render(<BookingSheet open mode="link" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText(/No active booking link/);
    fireEvent.click(screen.getByRole("button", { name: "Create link with initial sessions" }));
    fireEvent.change(screen.getByLabelText("Session minutes"), { target: { value: "15.5" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a whole session length between 15 and 480 minutes.");
    expect(screen.getByRole("button", { name: "Confirm create link with initial sessions" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Session minutes"), { target: { value: "70" } });
    fireEvent.change(screen.getByLabelText("Expiry (optional)"), { target: { value: "2000-01-01" } });
    expect(screen.getByRole("alert")).toHaveTextContent("Choose a future expiry date, or leave expiry blank.");
    expect(screen.getByRole("button", { name: "Confirm create link with initial sessions" })).toBeDisabled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Expiry (optional)"), { target: { value: "" } });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("button", { name: "Confirm create link with initial sessions" })).toBeEnabled();
  });
  it("reuses an individual link without presenting a credit grant or mutating the account", async () => {
    const actions = bookingActions();
    render(<BookingSheet open mode="link" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText("2 sessions remaining · active");
    expect(screen.getByRole("link", { name: /Open private booking link/ })).toHaveAttribute("href", bookingPass.booking_url);
    expect(screen.queryByLabelText("Sessions to add")).not.toBeInTheDocument();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
  });
  it("defaults a missed-credit correction to one and rejects fractional custom amounts", async () => {
    const actions = bookingActions();
    render(<BookingSheet open mode="credits" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText("2 sessions remaining · active");
    expect(screen.getByLabelText("Sessions to add")).toHaveValue("1");
    expect(screen.getByText("Add 1 session for Ada. Balance: 2 → 3 sessions remaining.")).toBeInTheDocument();
    expect(screen.queryByText("Revoke this private link")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Open private booking link/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Copy private link" })).not.toBeInTheDocument();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Sessions to add"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Custom number"), { target: { value: "1.5" } });
    expect(screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Custom number"), { target: { value: "2" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ }));
    await waitFor(() => expect(actions.addHomeBookingCredits).toHaveBeenCalledOnce());
    expect(actions.prepareHomeTopUp).toHaveBeenCalledWith("owner", "student", "pass", 2);
  });
  it("adds initial credits with one explicit click and disarms a lost creation response", async () => {
    const actions = bookingActions(null);
    actions.createHomeBooking.mockRejectedValue(new Error("network"));
    actions.loadHomeBooking.mockResolvedValueOnce(null).mockResolvedValue(bookingPass);
    render(<BookingSheet open mode="credits" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText(/No active booking link/);
    expect(screen.queryByRole("button", { name: "Create link with initial sessions" })).toBeNull();
    expect(screen.getByLabelText("Initial sessions")).toHaveValue("1");
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Add 1 session" }));
    await screen.findByText(/Creation outcome is unknown. Review the current balance/);
    expect(actions.createHomeBooking).toHaveBeenCalledExactlyOnceWith("student", 1, { sessionMinutes: 70, expiresAt: null });
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Add 1 session" })).toBeNull();
    expect(screen.queryByText(/No sessions were added/)).toBeNull();
  });
  it("requires a separate explicit initial-link flow when an account has no pass", async () => {
    const actions = bookingActions(null);
    actions.createHomeBooking.mockResolvedValue({ ...bookingPass, credits_remaining: 1, total_credits: 1 });
    render(<BookingSheet open mode="link" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText(/No active booking link/);
    expect(screen.queryByLabelText("Initial sessions")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create link with initial sessions" }));
    expect(screen.getByLabelText("Initial sessions")).toHaveValue("1");
    expect(screen.getByRole("button", { name: "Confirm create link with initial sessions" })).toBeEnabled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Confirm create link with initial sessions" }));
    await waitFor(() => expect(actions.createHomeBooking).toHaveBeenCalledExactlyOnceWith("student", 1, { sessionMinutes: 70, expiresAt: null }));
    expect(await screen.findByText("1 session remaining · active")).toBeInTheDocument();
    expect(screen.queryByLabelText("Initial sessions")).not.toBeInTheDocument();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
  });
  it("adds exactly one default correction and resets an unrelated intent when reopened", async () => {
    const actions = bookingActions();
    const props = { mode: "credits" as const, students: [person], actorId: "owner", actions, onClose: vi.fn() };
    const { rerender } = render(<BookingSheet {...props} open />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText("2 sessions remaining · active");
    fireEvent.click(screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ }));
    await waitFor(() => expect(actions.prepareHomeTopUp).toHaveBeenCalledExactlyOnceWith("owner", "student", "pass", 1));
    expect(actions.addHomeBookingCredits).toHaveBeenCalledOnce();
    expect(await screen.findByText("3 sessions remaining · active")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Add [\d.]+ sessions?$/ })).toBeNull();
    expect(screen.queryByLabelText("Sessions to add")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add more sessions" }));
    expect(screen.getByLabelText("Sessions to add")).toHaveValue("1");
    expect(actions.addHomeBookingCredits).toHaveBeenCalledOnce();
    fireEvent.change(screen.getByLabelText("Sessions to add"), { target: { value: "10" } });
    rerender(<BookingSheet {...props} open={false} />);
    rerender(<BookingSheet {...props} open />);
    expect(screen.getByLabelText("Student")).toHaveValue("");
    expect(screen.queryByLabelText("Sessions to add")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText("2 sessions remaining · active");
    expect(screen.getByLabelText("Sessions to add")).toHaveValue("1");
    expect(actions.addHomeBookingCredits).toHaveBeenCalledOnce();
  });
  it("keeps a verified addition disarmed until an explicit new addition is confirmed", async () => {
    const actions = bookingActions();
    render(<BookingSheet open mode="credits" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText("2 sessions remaining · active");
    fireEvent.change(screen.getByLabelText("Sessions to add"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Custom number"), { target: { value: "3" } });
    fireEvent.click(screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ }));
    await screen.findByText("Session addition verified.");
    expect(screen.queryByRole("button", { name: /^Add [\d.]+ sessions?$/ })).toBeNull();
    expect(actions.addHomeBookingCredits).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: "Add more sessions" }));
    expect(screen.getByLabelText("Sessions to add")).toHaveValue("1");
    expect(screen.queryByLabelText("Custom number")).toBeNull();
    expect(actions.addHomeBookingCredits).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ }));
    await waitFor(() => expect(actions.addHomeBookingCredits).toHaveBeenCalledTimes(2));
    expect(actions.prepareHomeTopUp).toHaveBeenLastCalledWith("owner", "student", "pass", 1);
  });
  it("resets custom initial-link settings on a new opening without creating anything", async () => {
    const actions = bookingActions(null);
    const props = { mode: "link" as const, students: [person], actorId: "owner", actions, onClose: vi.fn() };
    const { rerender } = render(<BookingSheet {...props} open />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText(/No active booking link/);
    fireEvent.click(screen.getByRole("button", { name: "Create link with initial sessions" }));
    fireEvent.change(screen.getByLabelText("Initial sessions"), { target: { value: "0" } });
    fireEvent.change(screen.getByLabelText("Custom number"), { target: { value: "3" } });
    fireEvent.change(screen.getByLabelText("Session minutes"), { target: { value: "90" } });
    fireEvent.change(screen.getByLabelText("Expiry (optional)"), { target: { value: "2027-10-28" } });
    rerender(<BookingSheet {...props} open={false} />);
    rerender(<BookingSheet {...props} open />);
    expect(screen.getByLabelText("Student")).toHaveValue("");
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText(/No active booking link/);
    expect(screen.queryByLabelText("Initial sessions")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Create link with initial sessions" }));
    expect(screen.getByLabelText("Initial sessions")).toHaveValue("1");
    expect(screen.queryByLabelText("Custom number")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Session minutes")).toHaveValue(70);
    expect(screen.getByLabelText("Expiry (optional)")).toHaveValue("");
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
  });
  it("uses the verified saved account as the baseline for a second access change", async () => {
    const verified = { ...person, access_tier: "tier_3" as const, access_drills: false };
    const save = vi.fn().mockResolvedValue(verified);
    render(<AccessSheet person={person} save={save} onSaved={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Access choice"), { target: { value: "tier_3" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm access change" }));
    await screen.findByText("Saved and verified for Ada.");
    fireEvent.change(screen.getByLabelText("Access choice"), { target: { value: "tier_1" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm access change" }));
    await waitFor(() => expect(save).toHaveBeenLastCalledWith(verified, "tier_1", undefined));
  });
  it("keeps revoked passes ineligible for credits and hides their unusable link", async () => {
    const actions = bookingActions({ ...bookingPass, status: "revoked" });
    render(<BookingSheet open mode="credits" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText("2 sessions remaining · revoked");
    expect(screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ })).toBeDisabled();
    expect(screen.queryByRole("link", { name: /Open private booking link/ })).toBeNull();
    expect(screen.queryByRole("button", { name: "Create link with initial sessions" })).toBeNull();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
  });
  it("offers all eligible named accounts without writing access on selection", () => {
    const select = vi.fn(), save = vi.fn();
    render(<AccessSheet open person={null} students={[person, { ...person, class_id: "other", display_name: "Bea", email: "bea@example.invalid" }, { ...person, class_id: "admin", role: "admin" }, { ...person, class_id: "archived", archived_at: "2026-10-01" }]} onSelect={select} save={save} onSaved={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getAllByRole("option")).toHaveLength(3);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "other" } });
    expect(select).toHaveBeenCalledWith(expect.objectContaining({ email: "bea@example.invalid" }));
    expect(save).not.toHaveBeenCalled();
    expect(screen.getByRole("option", { name: /Ada/ })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /Bea/ })).toBeInTheDocument();
  });
  it("keeps exact pending recovery available when the roster cannot supply an eligible account", async () => {
    const pending = { actorId: "owner", studentId: "missing-account", passId: "pass", amount: 3, operationKey: "exact-request" };
    const actions = bookingActions();
    actions.getPendingHomeTopUp = () => pending;
    actions.resolvePendingHomeTopUp = vi.fn().mockResolvedValue({ pass: bookingPass, receipt: {} });
    render(<BookingSheet open mode="link" students={[]} rosterState="error" actorId="owner" actions={actions} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByRole("button", { name: "Check pending add" })).toBeEnabled());
    expect(screen.getByText(/Pending account: missing-account/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Retry pending addition" })).toBeEnabled();
    expect(screen.queryByLabelText("Initial sessions")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Check pending add" }));
    await waitFor(() => expect(actions.resolvePendingHomeTopUp).toHaveBeenCalledWith(pending));
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
  });
  it("never discards unreadable protection using a free account ID when the roster is unavailable", async () => {
    const actions = bookingActions();
    actions.getPendingHomeTopUp = () => { throw new Error("Unreadable"); };
    actions.discardUnreadableHomeTopUp = vi.fn().mockResolvedValue(bookingPass);
    render(<BookingSheet open students={[]} rosterState="error" actorId="owner" actions={actions} onClose={vi.fn()} />);
    expect(screen.queryByLabelText("Recovery account ID")).toBeNull();
    expect(screen.getByText(/Recovery requires a selected eligible account/)).toHaveTextContent("Retry loading accounts before continuing.");
    expect(screen.getByRole("checkbox", { name: /I have reviewed/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Confirm recovery for selected account" })).toBeDisabled();
    expect(actions.discardUnreadableHomeTopUp).not.toHaveBeenCalled();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
  });
  it("recovers unreadable protection only after loading and confirming an eligible named balance", async () => {
    const actions = bookingActions();
    actions.getPendingHomeTopUp = () => { throw new Error("Unreadable"); };
    actions.discardUnreadableHomeTopUp = vi.fn().mockResolvedValue(bookingPass);
    render(<BookingSheet open students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText("2 sessions remaining · active");
    expect(screen.getByRole("button", { name: "Confirm recovery for Ada" })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: /I have reviewed/ }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm recovery for Ada" }));
    await waitFor(() => expect(actions.discardUnreadableHomeTopUp).toHaveBeenCalledExactlyOnceWith("owner", "student", true));
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
  });
  it("loads an existing link after a creation race and gives mode-specific guidance without granting credits", async () => {
    const actions = bookingActions();
    actions.loadHomeBooking.mockResolvedValueOnce(null).mockResolvedValue(bookingPass);
    actions.createHomeBooking.mockRejectedValue(new Error("pass_exists: Existing"));
    render(<BookingSheet open mode="link" students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Student"), { target: { value: "student" } });
    await screen.findByText(/No active booking link/);
    fireEvent.click(screen.getByRole("button", { name: "Create link with initial sessions" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm create link with initial sessions" }));
    expect(await screen.findByText(/A booking pass already exists; review the balance/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Add [\d.]+ sessions?$/ })).toBeNull();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
  });
  it("drops the former actor’s pending intent when the actor changes", async () => {
    const pending = { actorId: "owner", studentId: "student", passId: "pass", amount: 5, operationKey: "old-owner-request" };
    const actions = bookingActions();
    actions.getPendingHomeTopUp = (actor: string) => actor === "owner" ? pending : null;
    const { rerender } = render(<BookingSheet open students={[person]} actorId="owner" actions={actions} onClose={vi.fn()} />);
    await screen.findByText(/Pending account: ada@example.invalid/);
    rerender(<BookingSheet open students={[person]} actorId="new-owner" actions={actions} onClose={vi.fn()} />);
    await waitFor(() => expect(screen.getByLabelText("Student")).toBeEnabled());
    expect(screen.getByLabelText("Student")).toHaveValue("");
    expect(screen.queryByRole("button", { name: "Retry pending addition" })).toBeNull();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
  });
  it("caps Home at two sessions using the true total and preserves unsaved input across disclosure", () => {
    render(
      <PostSessionWork
        work={{
          state: "ready",
          data: {
            settings,
            tasks: [
              task,
              { ...task, id: "two", student_name: "Bea" },
              { ...task, id: "three" },
            ],
            handled: [],
            total: 12,
          },
          update: vi.fn(),
        }}
        students={[]}
        onOpen={vi.fn()}
        onAll={vi.fn()}
      />,
    );
    expect(screen.getByText("12")).toBeInTheDocument();
    expect(
      screen.getAllByRole("button", { name: "Open follow-up" }),
    ).toHaveLength(2);
    fireEvent.click(
      screen.getAllByRole("button", { name: "Open follow-up" })[0],
    );
    fireEvent.click(screen.getAllByText("Add transcript link")[0]);
    const input = screen.getAllByLabelText("Google Docs transcript URL")[0];
    fireEvent.change(input, {
      target: {
        value: "https://docs.google.com/document/d/unsaved_document_123/edit",
      },
    });
    fireEvent.click(screen.getByRole("button", { name: "Close follow-up" }));
    fireEvent.click(
      screen.getAllByRole("button", { name: "Open follow-up" })[0],
    );
    expect(input).toHaveValue(
      "https://docs.google.com/document/d/unsaved_document_123/edit",
    );
  });
  it("tracks preparation and confirmed posting as separate persisted actions", () => {
    const update = vi.fn();
    render(
      <PostSessionWork
        work={{
          state: "ready",
          data: { settings, tasks: [task], handled: [] },
          update,
        }}
        students={[]}
        onOpen={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Open follow-up" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Recap prepared" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Recap posted" }));
    expect(update).toHaveBeenCalledWith(task, {
      action: "checklist",
      field: "recap_done",
      value: true,
    });
    expect(update).toHaveBeenCalledWith(task, {
      action: "recap_posted",
      field: undefined,
      value: true,
    });
    expect(
      screen.getByRole("checkbox", { name: "Recap posted" }),
    ).not.toBeChecked();
  });
  it("shows manual add errors without losing the task draft", async () => {
    const mutateManual = vi.fn().mockRejectedValue(new Error("offline"));
    render(
      <MyList desk={{ ...desk, mutateManual }} students={[]} onAll={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add task +" }));
    fireEvent.change(screen.getByLabelText("Task"), {
      target: { value: "Call after session" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Add private task" }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent("Could not add"),
    );
    expect(screen.getByLabelText("Task")).toHaveValue("Call after session");
    expect(mutateManual).toHaveBeenCalledWith(null, {
      action: "create",
      title: "Call after session",
      studentId: null,
    });
  });
  it("loads filtered history pages and reopens through the revisioned manual writer", async () => {
    const loadManual = vi.fn().mockImplementation(async (_handled, cursor) => ({
      items: [
        {
          ...manual,
          id: cursor ? "manual-page2" : manual.id,
          title: cursor ? "Review the next transcript" : manual.title,
          handled_at: "2026-10-28T10:00:00Z",
        },
      ],
      total: 21,
      next_cursor: cursor ? null : "page2",
    }));
    const mutateManual = vi.fn().mockResolvedValue(undefined);
    render(
      <AllTasksSheet
        open
        onClose={vi.fn()}
        desk={{
          ...desk,
          loadManual,
          mutateManual,
          loadSessions: vi
            .fn()
            .mockResolvedValue({ items: [], total: 0, next_cursor: null }),
        }}
        students={[]}
        onOpen={vi.fn()}
      />,
    );
    fireEvent.change(screen.getByLabelText("Type"), {
      target: { value: "manual" },
    });
    fireEvent.change(screen.getByLabelText("Status"), {
      target: { value: "handled" },
    });
    await waitFor(() =>
      expect(loadManual).toHaveBeenLastCalledWith(true, null, null, null),
    );
    fireEvent.click(await screen.findByRole("button", { name: "Load more" }));
    await waitFor(() =>
      expect(loadManual).toHaveBeenLastCalledWith(true, "page2", null, null),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Reopen Prepare the next set" }),
    );
    await waitFor(() =>
      expect(mutateManual).toHaveBeenCalledWith(
        expect.objectContaining({ id: "manual", revision: 3 }),
        expect.objectContaining({ action: "reopen" }),
      ),
    );
  });
  it("never changes access on opening, choosing or cancelling, then confirms the named target", async () => {
    const save = vi.fn().mockResolvedValue(person);
    const onClose = vi.fn();
    render(
      <AccessSheet
        person={person}
        onClose={onClose}
        onSaved={vi.fn()}
        save={save}
      />,
    );
    expect(save).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Access choice"), {
      target: { value: "tier_3" },
    });
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalled();
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm access change" }),
    );
    await waitFor(() =>
      expect(save).toHaveBeenCalledWith(person, "tier_3", undefined),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Saved and verified for Ada",
    );
  });
  it("recovers the same pending top-up in link mode and keeps target and quantity locked", async () => {
    const pending = {
      actorId: "owner",
      studentId: "student",
      passId: "pass",
      amount: 5,
      operationKey: "same-request",
    };
    const pass = {
      id: "pass",
      student_id: "student",
      credits_remaining: 2,
      total_credits: 2,
      used_credits: 0,
      status: "active",
      booking_url: null,
      session_length_minutes: 70,
      expires_at: null,
    };
    const actions = {
      getPendingHomeTopUp: () => pending,
      loadHomeBooking: vi.fn().mockResolvedValue(pass),
      addHomeBookingCredits: vi.fn().mockResolvedValue({
        pass: { ...pass, credits_remaining: 7, total_credits: 7 },
        receipt: {},
      }),
      prepareHomeTopUp: vi.fn(),
      createHomeBooking: vi.fn(),
      revokeHomeBooking: vi.fn(),
      saveHomeAccess: vi.fn(),
    } as any;
    render(
      <BookingSheet
        open
        mode="link"
        onClose={vi.fn()}
        actorId="owner"
        students={[person]}
        actions={actions}
      />,
    );
    await screen.findByText("2 sessions remaining · active");
    expect(screen.getByLabelText("Student")).toBeDisabled();
    expect(screen.queryByLabelText("Sessions to add")).not.toBeInTheDocument();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
    expect(actions.createHomeBooking).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole("button", { name: "Retry pending addition" }),
    );
    await waitFor(() =>
      expect(actions.addHomeBookingCredits).toHaveBeenCalledWith(pending),
    );
    expect(actions.prepareHomeTopUp).not.toHaveBeenCalled();
    expect(
      await screen.findByText("7 sessions remaining · active"),
    ).toBeInTheDocument();
  });
  it("keeps a consultation source change visible until manually handled", () => {
    render(
      <MyList
        desk={{
          ...desk,
          manual: {
            state: "ready",
            data: {
              items: [
                { ...manual, kind: "consultation", source_state: "cancelled" },
              ],
              total: 1,
              next_cursor: null,
            },
          },
        }}
        students={[]}
        onAll={vi.fn()}
      />,
    );
    expect(screen.getByText("Consultation cancelled")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Handle Prepare the next set" }),
    ).toBeEnabled();
  });
  it("keeps ignored, already granted and imported payments out of decisions", () => {
    const p = {
      match_state: "unmatched",
      grant_state: "none",
      status: "succeeded",
      source: "webhook",
    } as any;
    expect(paymentNeedsAction(p)).toBe(true);
    for (const patch of [
      { grant_state: "granted" },
      { grant_state: "dismissed" },
      { match_state: "ignored" },
      { source: "backfill" },
      { status: "refunded" },
    ])
      expect(paymentNeedsAction({ ...p, ...patch })).toBe(false);
    expect(
      safeGoogleLink("https://mail.google.com/mail/u/0/#inbox", "email"),
    ).toBeTruthy();
    expect(
      safeGoogleLink("https://mail.google.com.evil.invalid", "email"),
    ).toBeNull();
    expect(safeGoogleLink("javascript:alert(1)", "calendar")).toBeNull();
  });
  it("keeps a changed draft while the original unknown task request is confirmed", async () => {
    const retryManualCreate = vi.fn().mockResolvedValue(undefined);
    const mutateManual = vi.fn();
    const { rerender } = render(
      <MyList
        desk={{
          ...desk,
          pendingManual: { action: "create", title: "Original request" },
          retryManualCreate,
          mutateManual,
        }}
        students={[]}
        onAll={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Add task +" }));
    fireEvent.change(screen.getByLabelText("Task"), {
      target: { value: "Edited draft" },
    });
    expect(
      screen.getByRole("button", { name: "Add private task" }),
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm original task" }),
    );
    await waitFor(() => expect(retryManualCreate).toHaveBeenCalledOnce());
    expect(mutateManual).not.toHaveBeenCalled();
    rerender(
      <MyList desk={{ ...desk, mutateManual }} students={[]} onAll={vi.fn()} />,
    );
    expect(screen.getByLabelText("Task")).toHaveValue("Edited draft");
    expect(
      screen.getByRole("button", { name: "Add private task" }),
    ).toBeEnabled();
  });
  it("reactivates an expired link only after explicit confirmation and never adds sessions automatically", async () => {
    const expired = {
      id: "pass",
      student_id: "student",
      credits_remaining: 2,
      total_credits: 5,
      used_credits: 3,
      status: "expired",
      booking_url: null,
      session_length_minutes: 70,
      expires_at: "2020-01-01T00:00:00Z",
    };
    const actions = {
      getPendingHomeTopUp: () => null,
      loadHomeBooking: vi.fn().mockResolvedValue(expired),
      reactivateHomeBooking: vi
        .fn()
        .mockResolvedValue({ ...expired, status: "active", expires_at: null }),
      addHomeBookingCredits: vi.fn(),
      prepareHomeTopUp: vi.fn(),
      createHomeBooking: vi.fn(),
      revokeHomeBooking: vi.fn(),
      saveHomeAccess: vi.fn(),
    } as any;
    render(
      <BookingSheet
        open
        onClose={vi.fn()}
        actorId="owner"
        students={[person]}
        actions={actions}
      />,
    );
    fireEvent.change(screen.getByLabelText("Student"), {
      target: { value: "student" },
    });
    await screen.findByText("2 sessions remaining · expired");
    expect(
      screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ }),
    ).toBeDisabled();
    expect(actions.reactivateHomeBooking).not.toHaveBeenCalled();
    fireEvent.click(screen.getByText("Extend this expired booking link"));
    fireEvent.click(
      screen.getByRole("button", { name: "Confirm reactivate existing link" }),
    );
    await waitFor(() =>
      expect(actions.reactivateHomeBooking).toHaveBeenCalledWith(
        "student",
        "pass",
        true,
      ),
    );
    await screen.findByText("2 sessions remaining · active");
    expect(
      screen.getByRole("button", { name: /^Add [\d.]+ sessions?$/ }),
    ).toBeEnabled();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
  });
});
