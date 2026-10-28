import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { markRead, fixture } = vi.hoisted(() => ({ markRead: vi.fn(), fixture: { item: { id: "one", student_id: "reader", metadata_json: {}, status: "assigned", type: "note", title: "Stored note", created_at: "2026-10-01T12:00:00Z", content_html: "<p>Full note</p>", content_markdown: null, description: null } } }));
vi.mock("@/hooks/useClassroomItems", () => ({ useClassroomItems: () => ({ data: [fixture.item], isLoading: false, error: null }) }));
vi.mock("@/lib/markNoteRead", () => ({ markNoteRead: markRead }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "reader" } }) }));
vi.mock("@/hooks/useStudentAssignments", () => ({ useStudentAssignment: vi.fn(), useStudentTAAssignment: vi.fn(), markTAAssignmentCompleted: vi.fn(), markTAAssignmentViewed: vi.fn() }));
vi.mock("@/hooks/useExternalWorkUploads", () => ({ useStudentExternalUploads: vi.fn() }));
vi.mock("@/hooks/useHomeworkSets", () => ({ useHomeworkSet: vi.fn() }));
vi.mock("@/components/classroom/StructuredTAAssignmentWorkspace", () => ({ default: () => null }));
vi.mock("@/components/classroom/ClassroomMarkdown", () => ({ default: () => null }));
vi.mock("@/lib/drillLaunch", () => ({ launchDrill: vi.fn() }));
import { ClassroomItemView } from "./ClassroomRouteViews";
function Where() { const location = useLocation(); return <output data-reader-return={String(location.state?.notesArchiveReturn ?? '')}>{location.pathname}{location.search}</output>; }
beforeEach(() => { markRead.mockReset(); markRead.mockResolvedValue(undefined); fixture.item.student_id = "reader"; fixture.item.status = "assigned"; fixture.item.metadata_json = {}; });
afterEach(cleanup);
describe("note detail return links", () => {
  it.each([false, true])("restores archive state for interactive=%s", async interactive => {
    fixture.item.content_html = interactive ? '<meta name="lsatu-interactive-lesson"><p>Lesson</p>' : "<p>Full note</p>";
    const returnTo = "/my-work/notes?q=conditionals&filter=unread&shown=24";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[`/classroom/item/one?${new URLSearchParams({ returnTo })}`]}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Back to notes" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(returnTo));
    expect(screen.getByRole('status')).toHaveAttribute('data-reader-return', 'one');
  });
  it("uses the safe fallback for an external return target", async () => {
    fixture.item.content_html = "<p>Full note</p>";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/classroom/item/one?returnTo=https%3A%2F%2Fevil.test"]}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Back to notes" }));
    expect(screen.getByRole("status")).toHaveTextContent("/my-work/notes");
  });
  it('reconciles the original account after a quick Back before read persistence completes', async () => {
    let finish!: (value: unknown) => void;
    markRead.mockReturnValue(new Promise(resolve => { finish = resolve; }));
    const client = new QueryClient();
    client.setQueryData(['classroom-items', 'reader'], [fixture.item]);
    client.setQueryData(['classroom-items', 'other'], [{ ...fixture.item, student_id: 'other' }]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(markRead).toHaveBeenCalledWith(fixture.item, 'reader'));
    fireEvent.click(screen.getByRole('button', { name: 'Back to notes' }));
    finish({ ...fixture.item, metadata_json: { read_at: '2026-10-27T12:00:00Z' } });
    await waitFor(() => expect(client.getQueryData<any[]>(['classroom-items', 'reader'])?.[0].metadata_json.read_at).toBe('2026-10-27T12:00:00Z'));
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications', 'reader'] });
    expect(client.getQueryData<any[]>(['classroom-items', 'other'])?.[0].metadata_json.read_at).toBeUndefined();
  });
  it('does not mark a teacher preview of someone elses note read', () => {
    fixture.item.student_id = 'someone-else';
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('does not synthesize undefined read metadata or repeat a completed-note read after refetch', async () => {
    fixture.item.status = 'completed';
    markRead.mockResolvedValue(fixture.item);
    const client = new QueryClient();
    client.setQueryData(['classroom-items', 'reader'], [fixture.item]);
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const view = render(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['notifications-unread-count', 'reader'] }));
    expect(client.getQueryData<any[]>(['classroom-items', 'reader'])?.[0].metadata_json).not.toHaveProperty('read_at');
    fixture.item = { ...fixture.item, metadata_json: {} };
    view.rerender(<QueryClientProvider client={client}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(markRead).toHaveBeenCalledTimes(1);
  });

});
