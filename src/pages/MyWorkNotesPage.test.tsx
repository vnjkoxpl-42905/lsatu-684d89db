import { fireEvent, render, screen, waitFor, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { JournalPage } from "@/lib/journalService";
import MyWorkNotesPage from "./MyWorkNotesPage";
const mocks = vi.hoisted(() => ({ listPages: vi.fn(), createPage: vi.fn(), updateMyNotePage: vi.fn(), user: "student-1" }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: mocks.user } }) }));
vi.mock("@/components/my-work/TeachingNotesArchive", () => ({ TeachingNotesArchive: () => <h2>Teaching notes archive</h2> }));
vi.mock("@/lib/journalService", () => ({ listPages: mocks.listPages, createPage: mocks.createPage, updateMyNotePage: mocks.updateMyNotePage }));
function note(overrides: Partial<JournalPage> = {}): JournalPage {
  return { id: "note-1", user_id: "student-1", parent_page_id: null, title: "My first note", icon: null, type: "doc", body: { type: "doc", content: [] }, properties: {}, sort_order: 0, is_archived: false, created_at: "2026-09-28T00:00:00Z", updated_at: "2026-09-28T00:00:00Z", ...overrides };
}
function renderPage(url = "/my-work/notes") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><MyWorkNotesPage /></MemoryRouter></QueryClientProvider>);
}
describe("My Work notebook", () => {
  beforeEach(() => { vi.clearAllMocks(); sessionStorage.clear(); mocks.user = "student-1"; mocks.listPages.mockResolvedValue([note()]); vi.spyOn(window, "confirm").mockReturnValue(true); });
  afterEach(() => { cleanup(); vi.restoreAllMocks(); });
  it("defaults to teaching notes with a secondary personal notebook", async () => {
    renderPage(); expect(screen.getByRole("heading", { name: "Teaching notes archive" })).toBeInTheDocument();
    expect(mocks.listPages).not.toHaveBeenCalled(); fireEvent.click(screen.getByRole("button", { name: "My notes" }));
    expect(await screen.findByRole("button", { name: /My first note/ })).toBeInTheDocument();
  });
  it("preserves owner filtering and supports legacy personal links", async () => {
    mocks.listPages.mockResolvedValue([note(), note({ id: "private", user_id: "other", title: "Private" })]);
    renderPage("/my-work/notes?note=note-1"); expect(await screen.findByRole("textbox", { name: "Title" })).toHaveValue("My first note"); expect(screen.queryByText("Private")).not.toBeInTheDocument();
  });
  it("confirms close and view changes and recovers unsaved drafts after remount", async () => {
    const first = renderPage("/my-work/notes?view=mine&note=note-1");
    fireEvent.change(await screen.findByRole("textbox", { name: "Title" }), { target: { value: "Unsaved reasoning" } });
    vi.mocked(window.confirm).mockReturnValue(false); fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("Unsaved reasoning");
    fireEvent.click(screen.getByRole("button", { name: "Back to teaching notes" })); expect(window.confirm).toHaveBeenCalledTimes(2);
    first.unmount(); renderPage("/my-work/notes?note=note-1");
    expect(await screen.findByRole("textbox", { name: "Title" })).toHaveValue("Unsaved reasoning"); expect(screen.getByText(/Unsaved draft/)).toBeInTheDocument(); expect(screen.queryByText("Saved to your account.")).not.toBeInTheDocument();
  });
  it("retains failed saves and does not expose another user's draft", async () => {
    mocks.updateMyNotePage.mockRejectedValue(new Error("Save failed"));
    const first = renderPage("/my-work/notes?note=note-1"); fireEvent.change(await screen.findByRole("textbox", { name: "Title" }), { target: { value: "Keep this" } });
    fireEvent.click(screen.getByRole("button", { name: "Save note" })); expect(await screen.findByText("Save failed")).toBeInTheDocument();
    expect(sessionStorage.length).toBe(1); first.unmount(); mocks.user = "other"; mocks.listPages.mockResolvedValue([note({ user_id: "other" })]); renderPage("/my-work/notes?note=note-1");
    expect(await screen.findByRole("textbox", { name: "Title" })).toHaveValue("My first note");
  });
  it("requires an explicit choice before replacing a newer account version", async () => {
    mocks.listPages.mockResolvedValueOnce([note()]).mockResolvedValue([note({ updated_at: "2026-10-01T00:00:00Z" })]);
    mocks.updateMyNotePage.mockResolvedValue(note({ title: "Draft", updated_at: "2026-10-02T00:00:00Z" }));
    renderPage("/my-work/notes?note=note-1"); fireEvent.change(await screen.findByRole("textbox", { name: "Title" }), { target: { value: "Draft" } }); fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByText(/A newer account version exists/)).toBeInTheDocument(); expect(mocks.updateMyNotePage).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Replace account version with my draft" }));
    await waitFor(() => expect(mocks.updateMyNotePage).toHaveBeenCalledWith("note-1", "Draft", expect.anything(), "2026-10-01T00:00:00Z"));
    expect(await screen.findByText("Saved to your account.")).toBeInTheDocument(); expect(sessionStorage.length).toBe(0);
  });
  it("clears the new-note draft sentinel after creation", async () => {
    mocks.createPage.mockImplementation(async (input) => note({ title: input.title, body: input.body }));
    renderPage("/my-work/notes?view=mine&note=new"); fireEvent.change(await screen.findByRole("textbox", { name: "Title" }), { target: { value: "New reasoning" } }); fireEvent.click(screen.getByRole("button", { name: "Save note" }));
    expect(await screen.findByText("Saved to your account.")).toBeInTheDocument(); expect(sessionStorage.length).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "New note" })); expect(screen.getByRole("textbox", { name: "Title" })).toHaveValue("");
  });
});
