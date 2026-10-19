import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalPage } from "@/lib/journalService";
import MyWorkNotesPage from "./MyWorkNotesPage";

const mocks = vi.hoisted(() => ({
  listPages: vi.fn(), createPage: vi.fn(), updateMyNotePage: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/components/classroom/ClassroomRouteViews", () => ({ ClassroomRecapsView: () => <p>Joshua's session recaps</p> }));
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
});
