vi.mock('@/components/notifications/NotificationBell', () => ({ default: () => <button aria-label="Notifications">Notifications</button> }));
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React from "react";
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { permissions, readingCenter, railPrefs, unreadFeed } = vi.hoisted(() => ({
  unreadFeed: { rows: [] as any[], loading: false, failed: false },
  permissions: {} as Record<string, boolean>, readingCenter: { allowed: false, isPending: false },
  railPrefs: { order: { classroom: [] as string[] }, hidden: [] as string[] },
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student", email: "s@example.com" }, authReady: true, signOut: vi.fn() }) }));
vi.mock("@/contexts/ThemeContext", () => ({ useTheme: () => ({ theme: "light", setTheme: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { display_name: "Sam" } }) }) }) }) },
}));
vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: () => permissions }));
vi.mock("@/hooks/useRailPrefs", () => ({ useRailPrefs: () => ({ prefs: railPrefs }) }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => readingCenter }));
vi.mock("@/hooks/useUnreadMessageCount", () => ({ useUnreadMessageCount: () => 0 }));
vi.mock("@/hooks/useNotifications", () => ({ useNotifications: () => ({ notifications: [], markSignupNotificationsRead: vi.fn() }) }));
vi.mock("@/hooks/useClassroomItems", () => ({ useClassroomItems: () => ({ items: [], loading: false }) }));
vi.mock("@/hooks/useFlagged", () => ({ useFlagged: () => ({ flagged: [], loading: false }) }));
vi.mock("@/hooks/useJournalEntries", () => ({ useJournalEntries: () => ({ entries: [], loading: false }) }));
vi.mock("@/hooks/useStudentAssignments", () => ({ useStudentAssignments: () => ({ data: [] }), useStudentTAAssignments: () => ({ data: [] }) }));
vi.mock("@/hooks/useAssignedTodoFeed", () => ({ useAssignedTodoFeed: () => unreadFeed, routeWithReturnTo: (route: string) => route }));
vi.mock("@/lib/routePreload", () => ({ preloadDrillHub: vi.fn() }));

import ClassroomLayout from "./ClassroomLayout";
import { useClassroomLayout, useOptionalClassroomLayout } from "./classroomLayoutContext";
import { useOrientation } from "../OrientationCard";

const NONE = {
  loading: false, is_admin: false, has_bootcamp_access: false, has_classroom_access: false,
  has_analytics_access: false, has_schedule_access: false, has_practice_access: false,
  has_drill_access: false, has_waj_access: false, has_journal_access: false,
  has_flagged_access: false, has_chat_access: false, has_export_access: false,
  has_ta_access: false, has_activity_access: false,
};

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{pathname}{search}</output>;
}

async function renderShell(path: string) {
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route element={<ClassroomLayout />}>
          <Route path="*" element={<Where />} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  await screen.findByTestId("where");
}

const rail = () => screen.getAllByRole("navigation", { name: "Classroom navigation" })[0];
const railButton = (name: RegExp) => Array.from(rail().querySelectorAll("button")).find((b) => name.test(b.textContent ?? ""))!;

beforeEach(() => {
  Object.assign(permissions, NONE, { has_chat_access: true, has_schedule_access: true });
  readingCenter.allowed = false; readingCenter.isPending = false;
  railPrefs.order.classroom = []; railPrefs.hidden = [];
  window.matchMedia = window.matchMedia ?? ((() => ({ matches: false, addEventListener() {}, removeEventListener() {} })) as never);
});
afterEach(cleanup);
// Registering ScrollTrigger starts an app-lifetime polling interval. JSDOM
// ends after this suite, so stop that plugin service after component cleanup.
afterAll(() => ScrollTrigger.disable());

it("shares the shell context with the real orientation hook across layout remounts", async () => {
  const snapshots: Array<{ name: string; shared: boolean }> = [];
  function OrientationProbe() {
    const layout = useClassroomLayout();
    const optionalLayout = useOptionalClassroomLayout();
    const orientation = useOrientation();
    if (orientation.loaded) {
      snapshots.push({ name: orientation.name, shared: layout === optionalLayout });
    }
    return orientation.loaded ? <Where /> : null;
  }
  for (let mount = 0; mount < 2; mount += 1) {
    render(<MemoryRouter initialEntries={["/classroom"]}>
      <Routes><Route element={<ClassroomLayout />}>
        <Route path="/classroom" element={<OrientationProbe />} />
      </Route></Routes>
    </MemoryRouter>);
    await screen.findByTestId("where");
    expect(snapshots.at(-1)).toEqual({ name: "Sam", shared: true });
    cleanup();
  }
});

describe("classroom rail access", () => {
  it('places an assigned Reading Center directly after My Work with no broad Classroom flag', async () => {
    readingCenter.allowed = true;
    await renderShell('/classroom');
    const myWork = railButton(/^My Work/);
    expect(myWork).not.toHaveTextContent('(locked)');
    expect(myWork.nextElementSibling).toHaveTextContent('Reading Center');
    fireEvent.click(myWork);
    expect(screen.getByTestId('where')).toHaveTextContent('/my-work/to-do');
    fireEvent.click(railButton(/^Reading Center$/));
    expect(screen.getByTestId('where')).toHaveTextContent('/reading-center');
  });
  it('restores only hidden My Work for an assigned tool while retaining other custom navigation', async () => {
    railPrefs.order.classroom = ['progress', 'home', 'practice', 'my-work'];
    railPrefs.hidden = ['my-work', 'review']; readingCenter.allowed = true;
    await renderShell('/classroom');
    const group = railButton(/^My Work/).parentElement!;
    const labels = Array.from(group.querySelectorAll('button')).map((button) => button.textContent);
    expect(labels[0]).toMatch(/^Review/);
    expect(railButton(/^Progress/)).toBeUndefined();
    expect(railButton(/^My Work/).nextElementSibling).toHaveTextContent('Reading Center');
    expect(railPrefs.hidden).toEqual(['my-work', 'review']);
  });
  it('preserves hidden My Work when the tool is unassigned or revoked', async () => {
    railPrefs.hidden = ['my-work']; await renderShell('/classroom');
    expect(railButton(/^My Work/)).toBeUndefined();
    expect(railButton(/^Reading Center$/)).toBeUndefined();
  });
  it('keeps student access assignment-based and gives teachers a direct Reading Center launcher', async () => {
    permissions.has_classroom_access = true; await renderShell('/classroom');
    expect(railButton(/^Reading Center$/)).toBeUndefined();
    cleanup(); permissions.is_admin = true;
    await renderShell('/teacher/students');
    expect(railButton(/^Reading Center$/)).toBeInTheDocument();
    expect(railButton(/^Teacher Workspace/)).toBeInTheDocument();
    fireEvent.click(railButton(/^Reading Center$/));
    expect(screen.getByTestId('where')).toHaveTextContent('/reading-center');
  });
  it('holds the Reading Center link while assignment access is unknown', async () => {
    readingCenter.isPending = true; await renderShell('/classroom');
    expect(railButton(/^Reading Center$/)).toBeUndefined();
    expect(railButton(/^My Work/)).not.toHaveTextContent('(locked)');
  });
  it("keeps a fully locked destination reachable so its page can explain the lock", async () => {
    await renderShell("/classroom");
    const library = railButton(/^Library/);
    expect(library).not.toBeDisabled();
    expect(library).toHaveTextContent("(locked)");
    expect(library).toHaveAttribute("title", "Library is locked for your account");
    fireEvent.click(library);
    expect(screen.getByTestId("where")).toHaveTextContent("/library/lessons");
  });

  it("opens a partly locked destination on a tab the account can use", async () => {
    permissions.has_classroom_access = true;
    await renderShell("/classroom");
    const library = railButton(/^Library/);
    expect(library).not.toHaveTextContent("(locked)");
    fireEvent.click(library);
    expect(screen.getByTestId("where")).toHaveTextContent("/library/activities");
  });

  it("draws no padlock while permissions are still loading", async () => {
    Object.assign(permissions, { loading: true });
    await renderShell("/classroom");
    expect(rail()).not.toHaveTextContent("(locked)");
  });

  it("marks the current destination for assistive tech", async () => {
    permissions.has_analytics_access = true;
    await renderShell("/progress/history");
    expect(railButton(/^Review/)).toHaveAttribute("aria-current", "page");
    expect(railButton(/^Progress/)).toBeUndefined();
  });

  it("keeps the student Schedule destination out of the teacher rail", async () => {
    permissions.is_admin = true;
    await renderShell("/teacher/students");
    expect(railButton(/^Schedule/)).toBeUndefined();
    expect(railButton(/^Students/)).toBeInTheDocument();
  });

  it("keeps Schedule in the student rail", async () => {
    await renderShell("/classroom");
    fireEvent.click(railButton(/^Schedule/));
    expect(screen.getByTestId("where")).toHaveTextContent("/schedule");
  });

  it("keeps a locked shortcut focusable with its explanation, but inert", async () => {
    permissions.has_chat_access = false;
    await renderShell("/classroom");
    const messages = railButton(/^Messages/);
    expect(railButton(/^Find a question/)).toBeUndefined();
    for (const shortcut of [messages]) {
      expect(shortcut).not.toBeDisabled();
      expect(shortcut).toHaveAttribute("aria-disabled", "true");
      expect(shortcut).toHaveTextContent("locked for your account");
    }
    expect(screen.getByText(/Locked shortcuts aren.t available/)).not.toHaveTextContent(/message Joshua/i);
    messages.focus();
    expect(messages).toHaveFocus();
    fireEvent.click(messages);
    expect(screen.getByTestId("where")).toHaveTextContent("/classroom");
  });

  it("suggests messaging about a locked shortcut only when Messages is available", async () => {
    await renderShell("/classroom");
    expect(screen.getByText(/Locked shortcuts aren.t available/)).toHaveTextContent("Message Joshua about access.");
  });

  it("keeps Messages available and removes question lookup from the entitled rail", async () => {
    permissions.has_drill_access = true;
    await renderShell("/classroom");
    expect(railButton(/^Find a question/)).toBeUndefined();
    fireEvent.click(railButton(/^Messages/));
    expect(screen.getByTestId("where")).toHaveTextContent("/inbox");
  });

  it("removes question lookup from the teacher rail too", async () => {
    permissions.is_admin = true;
    await renderShell("/progress/history?view=completed");
    expect(railButton(/^Find a question/)).toBeUndefined();
  });
});

describe("mobile menu", () => {
  it("dismisses on Escape and returns focus to the menu button", async () => {
    await renderShell("/classroom");
    const trigger = screen.getByRole("button", { name: "Open classroom menu" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(await screen.findByRole("dialog", { name: "Classroom menu" })).toBeInTheDocument();
    await act(async () => { fireEvent.keyDown(document, { key: "Escape" }); });
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Classroom menu" })).toBeNull());
    expect(trigger).toHaveFocus();
  });

  it("closes after a rail navigation", async () => {
    await renderShell("/classroom");
    fireEvent.click(screen.getByRole("button", { name: "Open classroom menu" }));
    const dialog = await screen.findByRole("dialog", { name: "Classroom menu" });
    const review = Array.from(dialog.querySelectorAll("button")).find((b) => /^Review/.test(b.textContent ?? ""))!;
    fireEvent.click(review);
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Classroom menu" })).toBeNull());
    expect(screen.getByTestId("where")).toHaveTextContent("/review/to-review");
  });
});

it('counts unread work without treating incomplete work as unread', async () => {
 Object.assign(permissions, NONE, {has_classroom_access:true});
 unreadFeed.rows=[{status:'assigned',isUnread:true,sourceTable:'homework_assignments'}, {status:'in_progress',isUnread:false,sourceTable:'guided_drill_assignments'}, {status:'completed',isUnread:true,sourceTable:'activity_assignments'}];
 try {await renderShell('/my-work/to-do');expect(within(rail()).getByRole('button',{name:/My Work.*1.*unread notes and assignments/})).toBeInTheDocument();}
 finally {unreadFeed.rows=[];}
});

describe("practice rail dropdowns", () => {
  const sub = (name: RegExp) => railButton(name);
  it("shows Practice Exams and Drilling as separate rows with no sub-items until you are inside one", async () => {
    await renderShell("/classroom");
    expect(railButton(/^Practice$/)).toBeUndefined();
    expect(railButton(/^Practice Exams$/)).toBeInTheDocument();
    expect(railButton(/^Drilling$/)).toBeInTheDocument();
    expect(sub(/^Attempts$/)).toBeUndefined();
    expect(sub(/^My Drills$/)).toBeUndefined();
  });
  it("opens Practice Exams in one click with Attempts and All Exams, and closes Drilling", async () => {
    await renderShell("/classroom");
    fireEvent.click(railButton(/^Practice Exams$/));
    expect(screen.getByTestId("where")).toHaveTextContent("/practice/exams");
    expect(sub(/^Attempts$/)).toBeInTheDocument();
    expect(sub(/^All Exams$/)).toBeInTheDocument();
    expect(sub(/^My Drills$/)).toBeUndefined();
  });
  it("opens Drilling in one click with My Drills and History, and moves between them", async () => {
    await renderShell("/classroom");
    fireEvent.click(railButton(/^Drilling$/));
    expect(screen.getByTestId("where")).toHaveTextContent("/practice/drills");
    expect(sub(/^Attempts$/)).toBeUndefined();
    fireEvent.click(sub(/^My Drills$/));
    expect(screen.getByTestId("where")).toHaveTextContent("/practice/drills?view=saved");
    expect(sub(/^My Drills$/)).toHaveAttribute("aria-current", "page");
    expect(railButton(/^Drilling$/)).not.toHaveAttribute("aria-current");
    fireEvent.click(sub(/^History$/));
    expect(screen.getByTestId("where")).toHaveTextContent("/progress/history");
    expect(sub(/^History$/)).toHaveAttribute("aria-current", "page");
  });
});
