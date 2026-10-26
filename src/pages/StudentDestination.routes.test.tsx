import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

/** The /progress and /library branches exactly as App.tsx composes them. */
function renderAt(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/progress" element={<ProtectedRoute allowSignedIn><StudentDestination destination="progress" /></ProtectedRoute>}>
          <Route index element={<DestinationIndex destination="progress" />} />
          <Route path="overview" element={<ProtectedRoute flag="has_analytics_access"><div>progress overview content</div></ProtectedRoute>} />
          <Route path="history" element={<ProtectedRoute flag="has_analytics_access"><div>history content</div></ProtectedRoute>} />
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
    renderAt("/progress/history?range=30d");
    expect(screen.queryByText("history content")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Progress" })).toBeNull();
    expect(screen.queryByTestId("where")).toBeNull();
  });

  it("sends a signed-out deep link to sign-in with its full return path", () => {
    auth.user = null;
    renderAt("/progress/history?range=30d");
    expect(screen.getByTestId("where")).toHaveTextContent("/auth?returnTo=%2Fprogress%2Fhistory%3Frange%3D30d");
  });

  it("renders no destination or content while permissions are unresolved", () => {
    permissions.loading = true;
    renderAt("/library/admissions");
    expect(screen.queryByText("admissions content")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Library" })).toBeNull();
  });

  it("denies a locked direct URL and explains why, inside the destination", () => {
    permissions.has_classroom_access = true;
    renderAt("/progress/history");
    expect(screen.queryByText("history content")).toBeNull();
    expect(screen.getByRole("heading", { name: "Progress" })).toBeInTheDocument();
    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    expect(screen.getByText(/Sections with a lock aren't available/)).toBeInTheDocument();
  });

  it("opens an entitled direct URL on reload", () => {
    permissions.has_analytics_access = true;
    renderAt("/progress/history");
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
    renderAt("/progress");
    expect(screen.queryByText("Your access is paused")).toBeNull();
    expect(screen.getByText(/isn.t available to your account/)).toBeInTheDocument();
  });
  it("does not tell a practice-only Tier 3 student Joshua paused their Classroom access", () => {
    permissions.has_practice_access = true;
    permissions.has_drill_access = true;
    renderAt("/progress");
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
    renderAt("/progress/history");
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
