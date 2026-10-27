import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, describe, expect, it, vi } from "vitest";
const { fixture } = vi.hoisted(() => ({ fixture: { item: { id: "one", type: "note", title: "Stored note", created_at: "2026-10-01T12:00:00Z", content_html: "<p>Full note</p>", content_markdown: null, description: null } } }));
vi.mock("@/hooks/useClassroomItems", () => ({ useClassroomItems: () => ({ data: [fixture.item], isLoading: false, error: null }) }));
vi.mock("@/lib/markNoteRead", () => ({ markNoteRead: () => Promise.resolve() }));
vi.mock("@/hooks/useStudentAssignments", () => ({ useStudentAssignment: vi.fn(), useStudentTAAssignment: vi.fn(), markTAAssignmentCompleted: vi.fn(), markTAAssignmentViewed: vi.fn() }));
vi.mock("@/hooks/useExternalWorkUploads", () => ({ useStudentExternalUploads: vi.fn() }));
vi.mock("@/hooks/useHomeworkSets", () => ({ useHomeworkSet: vi.fn() }));
vi.mock("@/components/classroom/StructuredTAAssignmentWorkspace", () => ({ default: () => null }));
vi.mock("@/components/classroom/ClassroomMarkdown", () => ({ default: () => null }));
vi.mock("@/lib/drillLaunch", () => ({ launchDrill: vi.fn() }));
import { ClassroomItemView } from "./ClassroomRouteViews";
function Where() { const location = useLocation(); return <output>{location.pathname}{location.search}</output>; }
afterEach(cleanup);
describe("note detail return links", () => {
  it.each([false, true])("restores archive state for interactive=%s", async interactive => {
    fixture.item.content_html = interactive ? '<meta name="lsatu-interactive-lesson"><p>Lesson</p>' : "<p>Full note</p>";
    const returnTo = "/my-work/notes?q=conditionals&filter=unread&shown=24";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={[`/classroom/item/one?${new URLSearchParams({ returnTo })}`]}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Back to notes" }));
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent(returnTo));
  });
  it("uses the safe fallback for an external return target", async () => {
    fixture.item.content_html = "<p>Full note</p>";
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/classroom/item/one?returnTo=https%3A%2F%2Fevil.test"]}><Routes><Route path="/classroom/item/:itemId" element={<ClassroomItemView />} /><Route path="*" element={<Where />} /></Routes></MemoryRouter></QueryClientProvider>);
    fireEvent.click(await screen.findByRole("button", { name: "Back to notes" }));
    expect(screen.getByRole("status")).toHaveTextContent("/my-work/notes");
  });
});
