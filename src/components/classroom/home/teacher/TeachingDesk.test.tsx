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
  it("recovers the same pending top-up and keeps target and quantity locked", async () => {
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
        onClose={vi.fn()}
        actorId="owner"
        students={[person]}
        actions={actions}
      />,
    );
    await screen.findByText("2 sessions remaining · active");
    expect(screen.getByLabelText("Student")).toBeDisabled();
    expect(screen.getByLabelText("Sessions to add")).toBeDisabled();
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
      screen.getByRole("button", { name: "Confirm add sessions" }),
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
      screen.getByRole("button", { name: "Confirm add sessions" }),
    ).toBeEnabled();
    expect(actions.addHomeBookingCredits).not.toHaveBeenCalled();
  });
});
