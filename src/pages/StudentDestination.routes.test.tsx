import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const { auth, permissions, assignment } = vi.hoisted(() => ({
  auth: { user: null as null | { id: string }, authReady: true },
  permissions: {} as Record<string, boolean>,
  assignment: { owned: true, requestedOwner: "" },
}));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => auth }));
vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: () => permissions }));
vi.mock('@/hooks/useReadingCenterAccess', () => ({ useReadingCenterAccess: () => ({ allowed: false, isPending: false }) }));
vi.mock('@/hooks/useClassroomMotion', () => ({ useClassroomMotion: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => {
    const query = {
      select: () => query,
      eq: (column: string, value: string) => { if (column === "student_id") assignment.requestedOwner = value; return query; },
      neq: () => query,
      limit: async () => ({ data: assignment.owned ? [{ id: "owned-assignment" }] : [], error: null }),
    };
    return query;
  } },
}));
import { TestingCentreGate } from "@/components/AssignmentGate";
import ProtectedRoute from "@/components/ProtectedRoute";
import { REVIEW_HUB_ROUTES as HUB, REVIEW_HUB_ALIASES, REVIEW_HISTORY_ALIAS } from '@/lib/reviewHubRoutes';
import { preserveRedirectLocation, redirectLegacyHistoryLocation } from '@/lib/preserveRedirectLocation';
import { DestinationIndex, StudentDestination } from "./StudentDestination";

const NONE = {
  loading: false, is_admin: false, has_bootcamp_access: false, has_classroom_access: false,
  has_analytics_access: false, has_schedule_access: false, has_practice_access: false,
  has_drill_access: false, has_waj_access: false, has_journal_access: false,
  has_flagged_access: false, has_chat_access: false, has_export_access: false,
  has_ta_access: false, has_activity_access: false,
};

function Where() {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
}

/** The /review/progress and /library branches exactly as App.tsx composes them. */
function LegacyReviewRedirect({to, history = false}: {to: string; history?: boolean}) {
  const {search,hash} = useLocation();
  return <Navigate replace to={history ? redirectLegacyHistoryLocation(search,hash) : preserveRedirectLocation(to,search,hash)} />;
}
function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={HUB.root.path} element={<ProtectedRoute allowSignedIn={HUB.root.allowSignedIn}><StudentDestination destination="review" /></ProtectedRoute>}>
          <Route index element={<DestinationIndex destination="review" />} />
          <Route path={HUB.queue.path} element={<ProtectedRoute allowSignedIn={HUB.queue.allowSignedIn}><div>review queue content</div></ProtectedRoute>} />
          <Route path={HUB.journal.path} element={<ProtectedRoute flag={HUB.journal.flag}><div>journal content</div></ProtectedRoute>} />
          <Route path={HUB.flagged.path} element={<ProtectedRoute flag={HUB.flagged.flag}><div>flagged content</div></ProtectedRoute>} />
          <Route path={HUB.imported.path} element={<ProtectedRoute flag={[...HUB.imported.flags]}><div>imported content</div></ProtectedRoute>} />
          <Route path={HUB.progress.path} element={<ProtectedRoute flag={HUB.analyticsFlag}><div>progress overview content</div></ProtectedRoute>} />
          <Route path={HUB.history.path} element={<ProtectedRoute flag={HUB.analyticsFlag}><div>history content</div></ProtectedRoute>} />
        </Route>
        <Route path="/library" element={<ProtectedRoute allowSignedIn><StudentDestination destination="library" /></ProtectedRoute>}>
          <Route index element={<DestinationIndex destination="library" />} />
          <Route path="lessons" element={<ProtectedRoute flag={["has_activity_access", "has_bootcamp_access", "has_drill_access", "has_analytics_access"]}><div>lessons content</div></ProtectedRoute>} />
          <Route path="activities" element={<ProtectedRoute flag="has_classroom_access"><div>activities content</div></ProtectedRoute>} />
          <Route path="admissions" element={<ProtectedRoute requireAdmin><div>admissions content</div></ProtectedRoute>} />
        </Route>
        <Route path="/practice" element={<ProtectedRoute allowSignedIn><StudentDestination destination="practice" /></ProtectedRoute>}>
          <Route index element={<DestinationIndex destination="practice" />} />
          <Route path="exams" element={<TestingCentreGate><div>assigned exams overview</div></TestingCentreGate>} />
          <Route path="exams/attempts" element={<ProtectedRoute allowSignedIn><div>own exam attempts</div></ProtectedRoute>} />
          <Route path="exams/:examId" element={<TestingCentreGate><div>assigned exam detail</div></TestingCentreGate>} />
        </Route>
        {REVIEW_HUB_ALIASES.map(({path,to}) => <Route key={path} path={path} element={<LegacyReviewRedirect to={to} />} />)}
        <Route path={REVIEW_HISTORY_ALIAS} element={<LegacyReviewRedirect to="/review/history" history />} />
        <Route path="/auth" element={<Where />} />
      </Routes>
    </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auth.user = { id: "student" };
  auth.authReady = true;
  Object.assign(permissions, NONE);
  assignment.owned = true;
  assignment.requestedOwner = "";
});
afterEach(() => { cleanup(); vi.unstubAllEnvs(); });

describe("destination routes across auth and permission states", () => {
  it("renders nothing protected while auth is still resolving", () => {
    auth.user = null;
    auth.authReady = false;
    renderAt("/review/history?range=30d");
    expect(screen.queryByText("history content")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Review" })).toBeNull();
    expect(screen.queryByTestId("where")).toBeNull();
  });

  it("sends a signed-out deep link to sign-in with its full return path", () => {
    auth.user = null;
    renderAt("/review/history?range=30d");
    expect(screen.getByTestId("where")).toHaveTextContent("/auth?returnTo=%2Freview%2Fhistory%3Frange%3D30d");
  });

  it("renders no destination or content while permissions are unresolved", () => {
    permissions.loading = true;
    renderAt("/library/admissions");
    expect(screen.queryByText("admissions content")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Library" })).toBeNull();
  });

  it("denies a locked direct URL and explains why, inside the destination", () => {
    permissions.has_classroom_access = true;
    renderAt("/review/history");
    expect(screen.queryByText("history content")).toBeNull();
    expect(screen.getByRole("heading", { name: "Review" })).toBeInTheDocument();
    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    expect(screen.getByText(/Sections with a lock aren't available/)).toBeInTheDocument();
  });

  it("opens an entitled direct URL on reload", () => {
    permissions.has_analytics_access = true;
    renderAt("/review/history");
    expect(screen.getByText("history content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("aria-current", "page");
  });

  it("denies Admissions to a student with every library flag", () => {
    Object.assign(permissions, { has_classroom_access: true, has_activity_access: true, has_bootcamp_access: true, has_drill_access: true });
    renderAt("/library/admissions");
    expect(screen.queryByText("admissions content")).toBeNull();
    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    expect(screen.getByText("This section is available to Joshua and administrators only.")).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("heading", { level: 1, name: "Library" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Not open yet" })).toBeInTheDocument();
    expect(screen.queryByText(/isn.t in your plan/)).toBeNull();
  });

  it("opens Admissions for Joshua and admins", () => {
    permissions.is_admin = true;
    renderAt("/library/admissions");
    expect(screen.getByText("admissions content")).toBeInTheDocument();
  });

  it("lands a bare /library on the first open tab for a Classroom-only account", () => {
    permissions.has_classroom_access = true;
    renderAt("/library");
    expect(screen.getByText("activities content")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Activities" })).toHaveAttribute("aria-current", "page");
  });

  it("explains unavailable access without guessing it was paused", () => {
    renderAt("/review/progress");
    expect(screen.queryByText("Your access is paused")).toBeNull();
    expect(screen.getByText(/isn.t available to your account/)).toBeInTheDocument();
  });
  it("does not tell a practice-only Tier 3 student Joshua paused their Classroom access", () => {
    permissions.has_practice_access = true;
    permissions.has_drill_access = true;
    renderAt("/review/progress");
    expect(screen.queryByText("Your access is paused")).toBeNull();
    expect(screen.getByText(/isn.t available to your account/)).toBeInTheDocument();
    expect(screen.queryByText("history content")).toBeNull();
  });

  it("opens the real assignment gate inside the shell without general exam access", async () => {
    permissions.has_classroom_access = true;
    renderAt("/practice/exams/pt101");
    expect(await screen.findByText("assigned exam detail")).toBeInTheDocument();
    expect(assignment.requestedOwner).toBe("student");
    expect(screen.getByRole("link", { name: "All Exams" })).toHaveAttribute("href", "/practice/exams/all");
  });
  it("lands an assigned student on the overview instead of diverting them to Attempts", async () => {
    permissions.has_classroom_access = true;
    renderAt("/practice");
    expect(await screen.findByText("assigned exams overview")).toBeInTheDocument();
    expect(assignment.requestedOwner).toBe("student");
  });
  it("lets the real gate deny exam content when the student owns no assignment", async () => {
    permissions.has_classroom_access = true;
    assignment.owned = false;
    renderAt("/practice/exams/pt101");
    expect(await screen.findByText("Not open yet")).toBeInTheDocument();
    expect(screen.queryByText("assigned exam detail")).toBeNull();
    expect(assignment.requestedOwner).toBe("student");
  });
  it("preserves opt-in local development access through the real nested gate", () => {
    vi.stubEnv("VITE_DEV_BYPASS_GATES", "1");
    renderAt("/review/history");
    expect(screen.getByText("history content")).toBeInTheDocument();
  });

  it("lands a chat/schedule-only student on Attempts without an impossible assignment check", () => {
    permissions.has_chat_access = true;
    permissions.has_schedule_access = true;
    renderAt("/practice");
    expect(screen.getByText("own exam attempts")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Practice Exams" })).toHaveAttribute("href", "/practice/exams/attempts");
    expect(screen.getByText("Overview")).toHaveAttribute("aria-disabled", "true");
    expect(assignment.requestedOwner).toBe("");
  });

});

describe('actual hub metadata route grants and aliases', () => {
  it.each([0,1,2,3,4,5,6,7])('retains queue entry for every entitlement combination %s', (mask) => {
    permissions.has_analytics_access = !!(mask&4); permissions.has_journal_access = !!(mask&2); permissions.has_flagged_access = !!(mask&1);
    renderAt('/review/to-review');
    expect(screen.getByText('review queue content')).toBeInTheDocument();
    expect(!!screen.queryByRole('link',{name:'Progress'})).toBe(!!(mask&4));
    expect(!!screen.queryByRole('link',{name:'Wrong-answer journal'})).toBe(!!(mask&2));
    expect(!!screen.queryByRole('link',{name:'Flagged'})).toBe(!!(mask&1));
  });
  it.each(REVIEW_HUB_ALIASES.map(alias => [alias.path,alias.to]))('preserves period and anchor through canonical alias %s', (path,to) => {
    permissions.has_analytics_access = true;
    renderAt(`${path}?window=14#saved-answer-history-title`);
    const target = to.startsWith('/review/history') ? 'history content' : 'progress overview content';
    expect(screen.getByText(target)).toBeInTheDocument();
    expect(screen.getByRole('link',{name:to.startsWith('/review/history')?'History':'Progress'})).toHaveAttribute('aria-current','page');
  });
  it('keeps the old History area filter through its metadata-backed alias', () => {
    permissions.has_analytics_access = true; renderAt(`${REVIEW_HISTORY_ALIAS}?area=rc&window=7`);
    expect(screen.getByText('history content')).toBeInTheDocument();
  });
  it.each([[HUB.progress.path,'progress overview content'],[HUB.history.path,'history content'],[HUB.journal.path,'journal content'],[HUB.flagged.path,'flagged content'],[HUB.imported.path,'imported content']])('denies protected child %s without its grant', (path,label) => {
    renderAt(`${HUB.root.path}/${path}`); expect(screen.queryByText(label)).toBeNull(); expect(screen.getByText('Not open yet')).toBeInTheDocument();
  });
});
