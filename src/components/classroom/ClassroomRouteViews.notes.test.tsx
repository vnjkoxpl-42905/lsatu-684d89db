vi.mock('@/hooks/useStudentWorkState',()=>({useLoadedStudentWorkAcknowledgment:acknowledge}));
import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const { markRead, acknowledge, fixture } = vi.hoisted(() => ({ acknowledge: vi.fn(), markRead: vi.fn(), fixture: { item: { id: "one", student_id: "reader", metadata_json: {}, status: "assigned", type: "note", title: "Stored note", created_at: "2026-10-01T12:00:00Z", content_html: "<p>Full note</p>", content_markdown: null, description: null } } }));
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
beforeEach(() => { acknowledge.mockReset(); markRead.mockReset(); markRead.mockResolvedValue(undefined); fixture.item.student_id = "reader"; fixture.item.status = "assigned"; fixture.item.metadata_json = {}; delete (fixture.item as Record<string, unknown>).source_table; delete (fixture.item as Record<string, unknown>).source_id; delete (fixture.item as Record<string, unknown>).workIdentity; fixture.item.type = "note"; fixture.item.content_html = "<p>Full note</p>"; });
afterEach(cleanup);
describe("note detail return links", () => {
  it('registers an interactive note as a ready locally owned reader without changing its iframe contract', () => {
    fixture.item.content_html = '<meta name="lsatu-interactive-lesson"><p>Lesson</p>';
    const view = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    const reader = view.container.querySelector('[data-note-reader="one"]');
    expect(reader).toHaveClass('classroom-motion-local');
    expect(reader?.querySelectorAll('[data-note-reader-block]')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Back to notes' })).toHaveAttribute('data-note-reader-block');
    const iframe = screen.getByTitle('Stored note interactive lesson');
    expect(iframe).toHaveAttribute('data-note-reader-block');
    expect(iframe).toHaveAttribute('sandbox', 'allow-scripts allow-forms');
    expect(iframe).toHaveAttribute('srcDoc', fixture.item.content_html);
  });
  it.each(['note', 'session_recap'])('labels the %s reader date as shared and preserves separate entrance blocks', (type) => {
    fixture.item.type = type;
    const view = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    const dateline = view.container.querySelector('.classroom-dateline time');
    expect(dateline).toHaveTextContent(/^Shared /);
    expect(dateline).toHaveAttribute('dateTime', fixture.item.created_at);
    const wrapper = view.container.querySelector('.classroom-note-reader')!;
    expect(wrapper.tagName).toBe('DIV');
    expect(wrapper.querySelector(':scope > .classroom-dateline')).toBeInTheDocument();
    expect(wrapper.querySelector(':scope > .classroom-title')).toBeInTheDocument();
    expect(wrapper.querySelector(':scope > .classroom-prose')).toBeInTheDocument();
    expect(wrapper).not.toHaveAttribute('data-motion-item');
  });
  it('keeps non-note item datelines unprefixed and unwrapped', () => {
    fixture.item.type = 'homework';
    const view = render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(view.container.querySelector('.classroom-dateline time')).not.toHaveTextContent('Shared');
    expect(view.container.querySelector('.classroom-note-reader')).toBeNull();
    expect(view.container.querySelector('[data-note-reader-block]')).toBeNull();
  });
  it.each([false, true])("restores archive state for interactive=%s", async interactive => {
    fixture.item.content_html = interactive ? '<meta name="lsatu-interactive-lesson"><p>Lesson</p>' : "<p>Full note</p>";
    const returnTo = "/my-work/notes?q=conditionals&filter=unread&shown=24";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[{ pathname: "/classroom/item/one", search: `?${new URLSearchParams({ returnTo })}`, state: { notesArchiveOrigin: { id: "one", returnTo } } }]}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter></QueryClientProvider>);
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
  it('passes successful loaded owned content to the shared acknowledgement hook', () => {
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(acknowledge).toHaveBeenCalledWith({sourceTable:'classroom_items',sourceId:'one',studentId:'reader',ready:true});
    expect(markRead).not.toHaveBeenCalled();
  });
  it('does not mark a teacher preview of someone elses note read', () => {
    fixture.item.student_id = 'someone-else';
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(markRead).not.toHaveBeenCalled();
  });

  it('waits for interactive content load before acknowledging it', () => {
    fixture.item.content_html='<meta name="lsatu-interactive-lesson"><p>Lesson</p>';
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one']}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /></Routes></MemoryRouter></QueryClientProvider>);
    expect(acknowledge).toHaveBeenLastCalledWith(expect.objectContaining({ready:false}));
    fireEvent.load(screen.getByTitle('Stored note interactive lesson'));
    expect(acknowledge).toHaveBeenLastCalledWith(expect.objectContaining({ready:true}));
  });

  it.each([
    ['', '2'],
    ['?workSource=activity_assignments&workId=11111111-1111-4111-8111-111111111111&workIssuance=1', '1'],
    ['?workSource=activity_assignments&workId=11111111-1111-4111-8111-111111111111&workIssuance=invalid', 'invalid'],
  ])('preserves explicit issuance through a source-backed redirect: %s', async (search, issuance) => {
    Object.assign(fixture.item, {type:'activity', source_table:'activity_assignments', source_id:'11111111-1111-4111-8111-111111111111', content_html:null, workIdentity:{sourceTable:'activity_assignments',sourceId:'11111111-1111-4111-8111-111111111111',issuance:2}});
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={['/classroom/item/one'+search]}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter></QueryClientProvider>);
    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent('/activities/11111111-1111-4111-8111-111111111111?'));
    expect(new URL(screen.getByRole('status').textContent!, 'https://lsatprep.study').searchParams.get('workIssuance')).toBe(issuance);
  });
});
