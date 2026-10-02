import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalPage } from "@/lib/journalService";
import MyWorkNotesPage from "./MyWorkNotesPage";

const mocks = vi.hoisted(() => ({
  listPages: vi.fn(), createPage: vi.fn(), updateMyNotePage: vi.fn(),
  chain: null as null | (() => unknown),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/components/classroom/ClassroomRouteViews", () => ({ ClassroomRecapsView: () => <p>Joshua's session recaps</p> }));
vi.mock("@/hooks/useSessionChain", () => ({
  useStudentSessionChain: () => mocks.chain?.() ?? { bookings: [], projection: { byBooking: new Map(), issues: [] }, bookingsLoading: false, itemsLoading: false, bookingsFailed: false, itemsFailed: false, stale: false, retry: () => {} },
}));
vi.mock("@/lib/journalService", () => ({
  listPages: mocks.listPages,
  createPage: mocks.createPage,
  updateMyNotePage: mocks.updateMyNotePage,
}));

function note(overrides: Partial<JournalPage> = {}): JournalPage {
  return {
    id: "note-1", user_id: "student-1", parent_page_id: null, title: "My first note", icon: null,
    type: "doc", body: { type: "doc", content: [] }, properties: {}, sort_order: 0,
    is_archived: false, created_at: "2026-09-28T00:00:00Z", updated_at: "2026-09-28T00:00:00Z",
    ...overrides,
  };
}

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/my-work/notes"]}><Routes><Route path="/my-work/notes" element={<MyWorkNotesPage />} /></Routes></MemoryRouter></QueryClientProvider>);
}

describe("My Work student notes", () => {
  beforeEach(() => {
    mocks.chain = null;
    mocks.listPages.mockReset();
    mocks.createPage.mockReset();
    mocks.updateMyNotePage.mockReset();
  });

  it("keeps student notes separate from Joshua's recaps and saves a new note", async () => {
    let pages: JournalPage[] = [];
    mocks.listPages.mockImplementation(async () => pages);
    mocks.createPage.mockImplementation(async (input: { title: string; body: JournalPage["body"] }) => {
      const created = note({ title: input.title, body: input.body });
      pages = [created];
      return created;
    });

    renderPage();
    expect(await screen.findByRole("heading", { name: "My notes" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "From Joshua" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New note" }));
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Conditional logic" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "Check the sufficient condition." } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));

    await waitFor(() => expect(mocks.createPage).toHaveBeenCalledWith(expect.objectContaining({ title: "Conditional logic", properties: { origin: "my_work_note" } })));
    expect(await screen.findByText("Saved to your account.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Conditional logic/ })).toBeInTheDocument();
  });

  it("does not show another account's journal pages even if a broad query returns them", async () => {
    mocks.listPages.mockResolvedValue([note({ user_id: "another-student", title: "Private note" }), note()]);
    renderPage();
    expect(await screen.findByRole("button", { name: /My first note/ })).toBeInTheDocument();
    expect(screen.queryByText("Private note")).not.toBeInTheDocument();
  });

  it("edits an existing student note in place", async () => {
    mocks.listPages.mockResolvedValue([note({ body: { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text: "Original" }] }] } })]);
    mocks.updateMyNotePage.mockResolvedValue(note({ title: "Revised note" }));
    renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /My first note/ }));
    expect(screen.getByRole("textbox", { name: "Note" })).toHaveValue("Original");
    fireEvent.change(screen.getByRole("textbox", { name: "Title" }), { target: { value: "Revised note" } });
    fireEvent.change(screen.getByRole("textbox", { name: "Note" }), { target: { value: "Revised reasoning" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    await waitFor(() => expect(mocks.updateMyNotePage).toHaveBeenCalledWith("note-1", "Revised note", expect.objectContaining({ type: "doc" })));
    expect(await screen.findByText("Saved to your account.")).toBeInTheDocument();
  });

  it("links an explicitly session-linked recap to its exact appointment and leaves unlinked notes alone", async () => {
    const { projectSessionChain } = await import("@/lib/sessionChain");
    const { STUDENT, BOOKING_A, booking, item, link } = await import("@/test/sessionChainFixtures");
    const recap = item({ title: "Oct 5 recap", type: "session_recap", metadata_json: { session_chain: link({ phase: "recap" }) } });
    const loose = item({ title: "Loose note", type: "note", due_at: "2026-10-05T15:00:00Z" });
    const hidden = item({ title: "Hidden recap", type: "session_recap", visible_to_student: false, metadata_json: { session_chain: link({ phase: "recap" }) } });
    const bookings = [booking()];
    const projection = projectSessionChain({ items: [recap, loose, hidden], bookings, subjectId: STUDENT, audience: "student" });
    mocks.chain = () => ({ bookings, projection, bookingsLoading: false, itemsLoading: false, bookingsFailed: false, itemsFailed: false, stale: false, retry: () => {} });
    mocks.listPages.mockResolvedValue([]);
    renderPage();
    const section = await screen.findByRole("region", { name: "From your sessions" });
    expect(section).toHaveTextContent("Oct 5 recap");
    expect(section).not.toHaveTextContent("Loose note");
    expect(section).not.toHaveTextContent("Hidden recap");
    const sessionLink = screen.getByRole("link", { name: /^Session / });
    expect(sessionLink).toHaveAttribute("href", `/schedule?session=${encodeURIComponent(`v1.redemption.${BOOKING_A}`)}`);
    expect(screen.getByRole("link", { name: "Open recap: Oct 5 recap" })).toHaveAttribute("href", `/classroom/item/${recap.id}`);
  });

  it("says session links failed instead of hiding them silently", async () => {
    mocks.chain = () => ({ bookings: [], projection: { byBooking: new Map(), issues: [] }, bookingsLoading: false, itemsLoading: false, bookingsFailed: true, itemsFailed: false, stale: false, retry: () => {} });
    mocks.listPages.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText("Session links for your notes could not be loaded.")).toBeInTheDocument();
  });
});
