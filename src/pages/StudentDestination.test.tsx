import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const BASE = { loading: false, is_admin: false, has_classroom_access: false, has_analytics_access: false, has_drill_access: false, has_practice_access: false, has_journal_access: false, has_flagged_access: false, has_activity_access: false, has_bootcamp_access: false, has_chat_access: false };
const permissions = vi.hoisted(() => ({ loading: false, is_admin: false, has_classroom_access: false, has_analytics_access: false, has_drill_access: false, has_practice_access: false, has_journal_access: false, has_flagged_access: false, has_activity_access: false, has_bootcamp_access: false, has_chat_access: false }));
const readingCenter = vi.hoisted(() => ({ allowed: false, isPending: false }));
const headingMotion = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useClassroomMotion', () => ({ useClassroomMotion: headingMotion }));
vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: () => permissions }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => readingCenter }));
import { DestinationIndex, StudentDestination } from "./StudentDestination";
afterEach(() => {
  cleanup();
  Object.assign(permissions, BASE);
  readingCenter.allowed = false; readingCenter.isPending = false;
  headingMotion.mockClear();
});

function Where() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="where">{`${pathname}${search}${hash}`}</output>;
}

describe("visible locked destination sections", () => {
  it('keeps the persistent heading under one destination motion owner across tab changes', () => {
    permissions.has_analytics_access = true;
    render(<MemoryRouter initialEntries={['/progress/overview']}><Routes><Route path="/progress/*" element={<StudentDestination destination="progress" />} /></Routes></MemoryRouter>);
    const heading = screen.getByRole('heading', { name: 'Progress', level: 1 });
    expect(heading.closest('header')).toHaveClass('classroom-motion-local');
    fireEvent.click(screen.getByRole('link', { name: 'History' }));
    expect(screen.getByRole('heading', { name: 'Progress', level: 1 })).toBe(heading);
    expect(headingMotion.mock.calls.every(([, key]) => key === 'destination:progress')).toBe(true);
  });
  it('opens Assigned work and Completed for a specific Reading Center grant while Notes stays locked', () => {
    readingCenter.allowed = true;
    render(<MemoryRouter initialEntries={['/my-work/to-do']}><StudentDestination destination="my-work" /></MemoryRouter>);
    expect(screen.getByRole('link', { name: 'Assigned work' })).toHaveAttribute('href', '/my-work/to-do');
    expect(screen.getByRole('link', { name: 'Completed' })).toHaveAttribute('href', '/my-work/completed');
    expect(screen.queryByRole('link', { name: 'Notes' })).toBeNull();
    expect(screen.getByText('Notes')).toHaveAttribute('aria-disabled', 'true');
  });
  it('holds assignment-aware tabs until the Reading Center grant is verified', () => {
    readingCenter.isPending = true;
    render(<MemoryRouter initialEntries={['/my-work/to-do']}><StudentDestination destination="my-work" /></MemoryRouter>);
    expect(screen.getByRole('navigation')).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByRole('link', { name: 'Assigned work' })).toBeNull();
    expect(screen.getByText('Assigned work')).toHaveAttribute('title', 'Checking access');
  });
  it.each([
    ["my-work", "/my-work/to-do", "My Work sections", ["Notes", "Assigned work", "Completed"]],
    ["progress", "/progress/overview", "Progress sections", ["Overview", "History", "Topics"]],
  ] as const)("keeps %s sections visible while access is locked", (destination, path, label, tabs) => {
    render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/*" element={<StudentDestination destination={destination} />} /></Routes></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: label });
    for (const tab of tabs) {
      const item = screen.getByText(tab);
      expect(nav).toContainElement(item);
      expect(item).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.getByRole("navigation").querySelector("a")).toBeNull();
  });
  it("distinguishes checking access from a confirmed lock", () => {
    permissions.loading = true;
    render(<MemoryRouter initialEntries={["/progress/overview"]}><StudentDestination destination="progress" /></MemoryRouter>);
    expect(screen.getByRole("navigation")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Overview")).toHaveAttribute("title", "Checking access");
    // Unknown is not denied: no padlock and no plan explanation yet.
    expect(screen.queryByText(/Sections with a lock aren't available/)).toBeNull();
    expect(screen.queryByText("(locked)")).toBeNull();
  });
  it("restores real links for an authorized account", () => {
    permissions.has_analytics_access = true;
    render(<MemoryRouter initialEntries={["/progress/overview"]}><StudentDestination destination="progress" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/progress/history");
    expect(screen.queryByText(/Sections with a lock aren't available/)).toBeNull();
  });
  it("carries only a valid Progress window across tab links", () => {
    permissions.has_analytics_access = true;
    render(<MemoryRouter initialEntries={["/progress/overview?window=14&historyResult=missed&junk=1"]}><StudentDestination destination="progress" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/progress/history?window=14");
    expect(screen.getByRole("link", { name: "Topics" })).toHaveAttribute("href", "/progress/topics?window=14");
    cleanup();
    render(<MemoryRouter initialEntries={["/progress/overview?window=banana"]}><StudentDestination destination="progress" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/progress/history");
  });
  it("does not add a window to other destinations' tab links", () => {
    permissions.has_classroom_access = true;
    render(<MemoryRouter initialEntries={["/my-work/notes?window=14"]}><StudentDestination destination="my-work" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Completed" })).toHaveAttribute("href", "/my-work/completed");
  });
  it("explains a locked section in visible text tied to the tab", () => {
    permissions.has_chat_access = true;
    render(<MemoryRouter initialEntries={["/progress/overview"]}><StudentDestination destination="progress" /></MemoryRouter>);
    const note = screen.getByText(/Sections with a lock aren't available/);
    expect(note).toHaveTextContent("message Joshua");
    expect(screen.getByText("History")).toHaveAttribute("aria-describedby", note.id);
    // The open-but-locked current tab still reads as the current page.
    expect(screen.getByText("Overview")).toHaveAttribute("aria-current", "page");
  });
  it("does not suggest an inaccessible messaging shortcut or infer a plan cause", () => {
    render(<MemoryRouter initialEntries={["/progress/overview"]}><StudentDestination destination="progress" /></MemoryRouter>);
    const note = screen.getByText(/Sections with a lock aren't available/);
    expect(note).not.toHaveTextContent(/message Joshua/i);
    expect(note).not.toHaveTextContent(/plan/i);
  });

});

describe("Admissions", () => {
  it("is visible but closed to a fully entitled student, without blaming their plan", () => {
    Object.assign(permissions, { has_classroom_access: true, has_drill_access: true, has_analytics_access: true });
    render(<MemoryRouter initialEntries={["/library/lessons"]}><StudentDestination destination="library" /></MemoryRouter>);
    expect(screen.queryByRole("link", { name: "Admissions" })).toBeNull();
    expect(screen.getByText("Admissions")).toHaveAttribute("title", "Admissions is open to Joshua only");
    expect(screen.queryByText(/Sections with a lock aren't available/)).toBeNull();
  });
  it("opens for Joshua and admins", () => {
    permissions.is_admin = true;
    render(<MemoryRouter initialEntries={["/library/admissions"]}><StudentDestination destination="library" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Admissions" })).toHaveAttribute("aria-current", "page");
  });
});

describe("Practice Exams sub-row", () => {
  it("marks All Exams on an exam detail page and keeps Attempts open without practice access", () => {
    render(<MemoryRouter initialEntries={["/practice/exams/pt101"]}><StudentDestination destination="practice" /></MemoryRouter>);
    const sub = screen.getByRole("navigation", { name: "Practice Exams pages" });
    expect(sub).toHaveTextContent("All Exams");
    expect(screen.getByText("All Exams")).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Attempts" })).toHaveAttribute("href", "/practice/exams/attempts");
  });
});

describe("bare destination URLs", () => {
  const renderIndex = (path: string, destination: "library" | "practice") => render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={`/${destination}`} element={<DestinationIndex destination={destination} />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
  it("open the first tab the account can use, keeping query and hash", () => {
    permissions.has_classroom_access = true;
    renderIndex("/library?from=email#top", "library");
    expect(screen.getByTestId("where")).toHaveTextContent("/library/activities?from=email#top");
  });
  it("let the assignment-aware gate decide access for a practice-free account", () => {
    permissions.has_classroom_access = true;
    renderIndex("/practice", "practice");
    expect(screen.getByTestId("where")).toHaveTextContent("/practice/exams");
  });
  it("hold while permissions are unresolved instead of guessing", () => {
    permissions.loading = true;
    renderIndex("/practice", "practice");
    expect(screen.queryByTestId("where")).toBeNull();
  });
});


describe("Practice Exams primary landing", () => {
  it("keeps the assignment-aware exam gate reachable with Classroom access", () => {
    permissions.has_classroom_access = true;
    render(<MemoryRouter initialEntries={["/practice/drills"]}><StudentDestination destination="practice" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Practice Exams" })).toHaveAttribute("href", "/practice/exams");
  });
  it("keeps Overview for an entitled student", () => {
    permissions.has_practice_access = true;
    render(<MemoryRouter initialEntries={["/practice/drills"]}><StudentDestination destination="practice" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Practice Exams" })).toHaveAttribute("href", "/practice/exams");
  });
  it("keeps Overview for an administrator", () => {
    permissions.is_admin = true;
    render(<MemoryRouter initialEntries={["/practice/drills"]}><StudentDestination destination="practice" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Practice Exams" })).toHaveAttribute("href", "/practice/exams");
  });
});
