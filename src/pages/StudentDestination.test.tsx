import React from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Link, MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const BASE = { loading: false, is_admin: false, has_classroom_access: false, has_analytics_access: false, has_drill_access: false, has_practice_access: false, has_journal_access: false, has_flagged_access: false, has_activity_access: false, has_bootcamp_access: false, has_chat_access: false };
const permissions = vi.hoisted(() => ({ loading: false, is_admin: false, has_classroom_access: false, has_analytics_access: false, has_drill_access: false, has_practice_access: false, has_journal_access: false, has_flagged_access: false, has_activity_access: false, has_bootcamp_access: false, has_chat_access: false }));
const readingCenter = vi.hoisted(() => ({ allowed: false, isPending: false }));
const headingMotion = vi.hoisted(() => vi.fn());
vi.mock('@/hooks/useClassroomMotion', () => ({ useClassroomMotion: headingMotion }));
const auth = vi.hoisted(() => ({user: {id: "student"}}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: () => permissions }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => readingCenter }));
import { DestinationIndex, StudentDestination } from "./StudentDestination";
import { ReviewViewMemoryProvider } from '@/contexts/ReviewViewMemoryContext';
import { ReviewReturnLink } from '@/components/review/ReviewReturnLink';
afterEach(() => {
  cleanup();
  auth.user = {id: "student"};
  Object.assign(permissions, BASE);
  readingCenter.allowed = false; readingCenter.isPending = false;
  headingMotion.mockClear();
});

function Where() {
  const { pathname, search, hash } = useLocation();
  return <output data-testid="where">{`${pathname}${search}${hash}`}</output>;
}

describe("visible locked destination sections", () => {
  it('gives My Work content a list-only policy without changing its separate heading owner', () => {
    permissions.has_classroom_access = true;
    render(<MemoryRouter initialEntries={['/my-work/notes']}><StudentDestination destination="my-work" /></MemoryRouter>);
    const content = document.querySelector('.student-destination-content');
    expect(content).toHaveAttribute('data-motion-policy', 'list-only');
    expect(content).not.toHaveAttribute('data-motion-enter');
    expect(screen.getByRole('heading', { name: 'My Work' }).closest('header')).toHaveAttribute('data-motion-enter');
  });
  it('preserves the generic entrance for other destination content', () => {
    render(<MemoryRouter initialEntries={['/library/lessons']}><StudentDestination destination="library" /></MemoryRouter>);
    const content = document.querySelector('.student-destination-content');
    expect(content).toHaveAttribute('data-motion-enter');
    expect(content).not.toHaveAttribute('data-motion-policy');
  });
  it('keeps the persistent heading under one destination motion owner across tab changes', () => {
    permissions.has_analytics_access = true;
    render(<MemoryRouter initialEntries={['/review/progress']}><Routes><Route path="/review/*" element={<StudentDestination destination="review" />} /></Routes></MemoryRouter>);
    const heading = screen.getByRole('heading', { name: 'Review', level: 1 });
    expect(heading.closest('header')).toHaveClass('classroom-motion-local');
    fireEvent.click(screen.getByRole('link', { name: 'History' }));
    expect(screen.getByRole('heading', { name: 'Review', level: 1 })).toBe(heading);
    expect(headingMotion.mock.calls.every(([, key]) => key === 'destination:review')).toBe(true);
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
    render(<MemoryRouter initialEntries={["/review/progress"]}><StudentDestination destination="review" /></MemoryRouter>);
    expect(screen.getByRole("navigation", {name: "Review sections"})).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Progress")).toHaveAttribute("title", "Checking access");
    // Unknown is not denied: no padlock and no plan explanation yet.
    expect(screen.queryByText(/Sections with a lock aren't available/)).toBeNull();
    expect(screen.queryByText("(locked)")).toBeNull();
  });
  it("restores real links for an authorized account", () => {
    permissions.has_analytics_access = true;
    render(<MemoryRouter initialEntries={["/review/progress"]}><StudentDestination destination="review" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Progress" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/review/history");
    expect(screen.queryByText(/Sections with a lock aren't available/)).toBeNull();
  });
  it("keeps a first visit to another view at its independent default", () => {
    permissions.has_analytics_access = true;
    render(<MemoryRouter initialEntries={["/review/progress?window=14&historyResult=missed&junk=1"]}><StudentDestination destination="review" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/review/history");
    cleanup();
    render(<MemoryRouter initialEntries={["/review/progress?window=banana"]}><StudentDestination destination="review" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/review/history");
  });
  it("does not add a window to other destinations' tab links", () => {
    permissions.has_classroom_access = true;
    render(<MemoryRouter initialEntries={["/my-work/notes?window=14"]}><StudentDestination destination="my-work" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Completed" })).toHaveAttribute("href", "/my-work/completed");
  });
  it("explains a locked section in visible text tied to the tab", () => {
    permissions.has_chat_access = true;
    render(<MemoryRouter initialEntries={["/review/progress"]}><StudentDestination destination="review" /></MemoryRouter>);
    const note = screen.getByText(/Sections with a lock aren't available/);
    expect(note).toHaveTextContent("message Joshua");
    expect(screen.getByText("History")).toHaveAttribute("aria-describedby", note.id);
    // The open-but-locked current tab still reads as the current page.
    expect(screen.getByText("Progress")).toHaveAttribute("aria-current", "page");
  });
  it("does not suggest an inaccessible messaging shortcut or infer a plan cause", () => {
    render(<MemoryRouter initialEntries={["/review/progress"]}><StudentDestination destination="review" /></MemoryRouter>);
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

describe('review view URLs', () => {
  it('keeps queue filters across a hub unmount for exact detail and clears prior-view memory on actor switch', () => {
    permissions.has_analytics_access = true;
    const returnTo = '/review/progress?window=all&progressType=Main+Conclusion&progressAnswer=lr%3Aanswer';
    const tree = () => <MemoryRouter initialEntries={['/review/to-review?reason=missed&area=lr#queue']}>
      <ReviewViewMemoryProvider>
        <Routes>
          <Route path="/review" element={<StudentDestination destination="review" />}>
            <Route path="to-review" element={<p>Queue content</p>} />
            <Route path="progress" element={<Link to={`/journal/q?returnTo=${encodeURIComponent(returnTo)}`}>Open exact detail</Link>} />
          </Route>
          <Route path="/journal/:qid" element={<><p>Exact journal detail</p><ReviewReturnLink /></>} />
        </Routes>
        <Where />
      </ReviewViewMemoryProvider>
    </MemoryRouter>;
    const rendered = render(tree());
    fireEvent.click(screen.getByRole('link', {name: 'Progress'}));
    fireEvent.click(screen.getByRole('link', {name: 'Open exact detail'}));
    expect(screen.queryByRole('heading', {name: 'Review'})).toBeNull();
    fireEvent.click(screen.getByRole('link', {name: /Back to Review/}));
    expect(screen.getByTestId('where')).toHaveTextContent(returnTo);
    expect(screen.getByRole('link', {name: 'To review'})).toHaveAttribute('href', '/review/to-review?reason=missed&area=lr#queue');
    fireEvent.click(screen.getByRole('link', {name: 'Open exact detail'}));
    auth.user = {id: 'other'};
    rendered.rerender(tree());
    fireEvent.click(screen.getByRole('link', {name: /Back to Review/}));
    expect(screen.getByTestId('where')).toHaveTextContent(returnTo);
    expect(screen.getByRole('link', {name: 'To review'})).toHaveAttribute('href', '/review/to-review');
  });
  it('restores each view independently and resets remembered contexts when actor changes', () => {
    permissions.has_analytics_access = true;
    const tree = () => <MemoryRouter initialEntries={['/review/progress?window=14&progressType=Flaw']}><Routes><Route path="/review/*" element={<StudentDestination destination="review" />} /></Routes><Where /></MemoryRouter>;
    const rendered = render(tree());
    expect(screen.getByRole('link', {name: 'History'})).toHaveAttribute('href', '/review/history');
    fireEvent.click(screen.getByRole('link', {name: 'History'}));
    expect(screen.getByRole('link', {name: 'Progress'})).toHaveAttribute('href', '/review/progress?window=14&progressType=Flaw');
    expect(screen.getByRole('link', {name: 'To review'})).toHaveAttribute('href', '/review/to-review');
    auth.user = {id: 'other'};
    rendered.rerender(tree());
    expect(screen.getByRole('link', {name: 'Progress'})).toHaveAttribute('href', '/review/progress');
  });
  it.each([0,1,2,3,4,5,6,7])('gates all eight analytics/journal/flag combinations %s', (mask) => {
    permissions.has_analytics_access = !!(mask & 4);
    permissions.has_journal_access = !!(mask & 2);
    permissions.has_flagged_access = !!(mask & 1);
    render(<MemoryRouter initialEntries={['/review/to-review']}><StudentDestination destination="review" /></MemoryRouter>);
    expect(screen.getByRole('link', {name: 'To review'})).toHaveAttribute('href', '/review/to-review');
    expect(!!screen.queryByRole('link', {name: 'Progress'})).toBe(!!(mask & 4));
    expect(!!screen.queryByRole('link', {name: 'History'})).toBe(!!(mask & 4));
    expect(!!screen.queryByRole('link', {name: 'Wrong-answer journal'})).toBe(!!(mask & 2));
    expect(!!screen.queryByRole('link', {name: 'Flagged'})).toBe(!!(mask & 1));
  });
});
