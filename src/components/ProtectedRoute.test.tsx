import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import ProtectedRoute from "./ProtectedRoute";

const { mockUseAuth, mockUseUserPermissions } = vi.hoisted(() => ({
  mockUseAuth: vi.fn(),
  mockUseUserPermissions: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => mockUseUserPermissions(),
}));

function AuthLocationProbe() {
  const location = useLocation();
  return <div data-testid="auth-location">{`${location.pathname}${location.search}`}</div>;
}

function renderProtected(initialEntry = "/teacher/session-ingest?foo=1") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/teacher/session-ingest"
          element={(
            <ProtectedRoute requireAdmin>
              <div>secret admin content</div>
            </ProtectedRoute>
          )}
        />
        <Route path="/auth" element={<AuthLocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderAdmissionsRoute() {
  return render(
    <MemoryRouter initialEntries={["/classroom/admissions"]}>
      <Routes>
        <Route
          path="/classroom/admissions"
          element={(
            <ProtectedRoute requireAdmin>
              <div>admissions content</div>
            </ProtectedRoute>
          )}
        />
      </Routes>
    </MemoryRouter>,
  );
}

const NO_FLAGS = {
  loading: false,
  is_admin: false,
  has_bootcamp_access: false,
  has_classroom_access: false,
  has_analytics_access: false,
  has_schedule_access: false,
  has_practice_access: false,
  has_drill_access: false,
  has_waj_access: false,
  has_journal_access: false,
  has_flagged_access: false,
  has_chat_access: false,
  has_export_access: false,
  has_ta_access: false,
  has_activity_access: false,
};

/** `/booking` shape: allowSignedIn with NO flag — the anonymous-render hole. */
function renderFlaglessRoute(initialEntry = "/booking") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/booking"
          element={(
            <ProtectedRoute allowSignedIn>
              <div>booking content</div>
            </ProtectedRoute>
          )}
        />
        <Route path="/auth" element={<AuthLocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderGatedRoute(initialEntry = "/rc/drill?passage=1188") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/rc/drill"
          element={(
            <ProtectedRoute flag="has_drill_access">
              <div>rc player</div>
            </ProtectedRoute>
          )}
        />
        <Route path="/auth" element={<AuthLocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderLockedExam() {
  return render(
    <MemoryRouter initialEntries={["/practice/exams"]}>
      <Routes>
        <Route path="/practice/exams" element={<ProtectedRoute flag="has_practice_access"><div>exam overview</div></ProtectedRoute>} />
        <Route path="/practice/exams/attempts" element={<ProtectedRoute allowSignedIn><div>exam attempts</div></ProtectedRoute>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderStudentCoreRoute(initialEntry = "/classroom") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/classroom"
          element={(
            <ProtectedRoute flag="has_classroom_access" allowSignedIn>
              <div>student classroom content</div>
            </ProtectedRoute>
          )}
        />
        <Route path="/auth" element={<AuthLocationProbe />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderDestinationChild(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/review" element={<ProtectedRoute allowSignedIn><Outlet /></ProtectedRoute>}>
          <Route path="to-review" element={<ProtectedRoute flag={["has_journal_access", "has_flagged_access", "has_drill_access"]}><div>review queue</div></ProtectedRoute>} />
        </Route>
        <Route path="/practice" element={<ProtectedRoute allowSignedIn><Outlet /></ProtectedRoute>}>
          <Route path="drills" element={<ProtectedRoute flag="has_drill_access"><div>drills page</div></ProtectedRoute>} />
        </Route>
        <Route path="/library" element={<ProtectedRoute allowSignedIn><Outlet /></ProtectedRoute>}>
          <Route path="admissions" element={<ProtectedRoute requireAdmin><div>admissions page</div></ProtectedRoute>} />
          <Route path="bootcamps" element={<ProtectedRoute flag="has_bootcamp_access"><div>bootcamps page</div></ProtectedRoute>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  const originalLocation = window.location;

  beforeEach(() => {
    mockUseAuth.mockReset();
    mockUseUserPermissions.mockReset();
    Object.defineProperty(window, "location", {
      configurable: true,
      value: new URL("https://lsatprep.study/teacher/session-ingest?foo=1"),
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("guards a directly opened Review child when neither source is available", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_classroom_access: true });
    renderDestinationChild("/review/to-review");
    expect(screen.queryByText("review queue")).not.toBeInTheDocument();
    expect(screen.getByText("Not open yet")).toBeInTheDocument();
  });

  it("opens the combined Review child when either source is available", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_flagged_access: true });
    renderDestinationChild("/review/to-review");
    expect(screen.getByText("review queue")).toBeInTheDocument();
  });

  it("opens the combined Review child for an RC-only drill account", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_drill_access: true });
    renderDestinationChild("/review/to-review");
    expect(screen.getByText("review queue")).toBeInTheDocument();
  });

  it("guards a directly opened Admissions child for non-admin users", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_classroom_access: true, has_activity_access: true, has_bootcamp_access: true });
    renderDestinationChild("/library/admissions");
    expect(screen.queryByText("admissions page")).not.toBeInTheDocument();
    expect(screen.getByText("This section is available to Joshua and administrators only.")).toBeInTheDocument();
    expect(screen.getByText("Not open yet")).toBeInTheDocument();
  });

  it.each([
    ["/practice/drills", "drills page"],
    ["/library/bootcamps", "bootcamps page"],
  ])("guards directly opened paid child %s", (path, content) => {
    mockUseAuth.mockReturnValue({ user: { id: "student" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_classroom_access: true });
    renderDestinationChild(path);
    expect(screen.queryByText(content)).not.toBeInTheDocument();
    expect(screen.getByText("Not open yet")).toBeInTheDocument();
  });

  it("redirects anonymous users on admin routes to auth with returnTo preserved", () => {
    mockUseAuth.mockReturnValue({ user: null, authReady: true });
    mockUseUserPermissions.mockReturnValue({
      loading: false,
      is_admin: false,
      has_bootcamp_access: false,
      has_classroom_access: false,
      has_analytics_access: false,
      has_schedule_access: false,
      has_practice_access: false,
      has_drill_access: false,
      has_waj_access: false,
      has_journal_access: false,
      has_flagged_access: false,
      has_chat_access: false,
      has_export_access: false,
      has_ta_access: false,
      has_activity_access: false,
    });

    renderProtected();

    expect(screen.getByTestId("auth-location").textContent).toBe(
      "/auth?returnTo=%2Fteacher%2Fsession-ingest%3Ffoo%3D1",
    );
  });

  it("shows locked access for signed-in non-admin users", () => {
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, authReady: true });
    // One locked door on an otherwise live account: the student still has a
    // classroom to be sent back to, so this is the "Not open yet" state.
    mockUseUserPermissions.mockReturnValue({
      loading: false,
      is_admin: false,
      has_bootcamp_access: false,
      has_classroom_access: true,
      has_analytics_access: false,
      has_schedule_access: false,
      has_practice_access: false,
      has_drill_access: false,
      has_waj_access: false,
      has_journal_access: false,
      has_flagged_access: false,
      has_chat_access: false,
      has_export_access: false,
      has_ta_access: false,
      has_activity_access: false,
    });

    renderProtected();

    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    // The locked state is stage content, not a viewport takeover: both shells
    // mount it inside their <Outlet/>, so it must not paint over the frame.
    expect(document.querySelector(".min-h-screen")).toBeNull();
  });

  it("offers Messages as the next step only when the student can reach it", () => {
    const flags = {
      loading: false,
      is_admin: false,
      has_bootcamp_access: false,
      has_classroom_access: false,
      has_analytics_access: false,
      has_schedule_access: false,
      has_practice_access: false,
      has_drill_access: false,
      has_waj_access: false,
      has_journal_access: false,
      has_flagged_access: false,
      has_chat_access: false,
      has_export_access: false,
      has_ta_access: false,
      has_activity_access: false,
    };
    mockUseAuth.mockReturnValue({ user: { id: "user-1" }, authReady: true });

    mockUseUserPermissions.mockReturnValue(flags);
    const { unmount } = renderProtected();
    // Without chat access the only next step we could offer is another locked
    // door, so it is not offered at all.
    expect(screen.queryByText("Message Joshua")).not.toBeInTheDocument();
    unmount();

    mockUseUserPermissions.mockReturnValue({ ...flags, has_chat_access: true });
    renderProtected();
    expect(screen.getByText("Message Joshua")).toBeInTheDocument();
  });

  it("renders core student routes for signed-in users even when the legacy flag is false", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student-1" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({
      loading: false,
      is_admin: false,
      has_bootcamp_access: false,
      has_classroom_access: false,
      has_analytics_access: false,
      has_schedule_access: false,
      has_practice_access: false,
      has_drill_access: false,
      has_waj_access: false,
      has_journal_access: false,
      has_flagged_access: false,
      has_chat_access: false,
      has_export_access: false,
      has_ta_access: false,
      has_activity_access: false,
    });

    renderStudentCoreRoute();

    expect(screen.getByText("student classroom content")).toBeInTheDocument();
    expect(screen.queryByText("Premium Content Locked")).not.toBeInTheDocument();
  });

  it("renders children for admins", () => {
    mockUseAuth.mockReturnValue({ user: { id: "admin-1" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({
      loading: false,
      is_admin: true,
      has_bootcamp_access: false,
      has_classroom_access: false,
      has_analytics_access: false,
      has_schedule_access: false,
      has_practice_access: false,
      has_drill_access: false,
      has_waj_access: false,
      has_journal_access: false,
      has_flagged_access: false,
      has_chat_access: false,
      has_export_access: false,
      has_ta_access: false,
      has_activity_access: false,
    });

    renderProtected();

    expect(screen.getByText("secret admin content")).toBeInTheDocument();
  });

  it("locks the Admissions direct URL for a signed-in student, even with classroom access", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student-1" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_classroom_access: true });

    renderAdmissionsRoute();

    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    expect(screen.queryByText("admissions content")).not.toBeInTheDocument();
  });

  it("opens the Admissions direct URL for an admin", () => {
    mockUseAuth.mockReturnValue({ user: { id: "admin-1" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, is_admin: true });

    renderAdmissionsRoute();

    expect(screen.getByText("admissions content")).toBeInTheDocument();
  });

  // ── Phase 0: authentication is intrinsic ──────────────────────────────────

  it("never renders a flagless allowSignedIn route to an anonymous visitor", () => {
    mockUseAuth.mockReturnValue({ user: null, authReady: true });
    mockUseUserPermissions.mockReturnValue(NO_FLAGS);

    renderFlaglessRoute();

    expect(screen.queryByText("booking content")).not.toBeInTheDocument();
    expect(screen.getByTestId("auth-location").textContent).toBe(
      "/auth?returnTo=%2Fbooking",
    );
  });

  it("redirects anonymous visitors off a flagged route, preserving the query", () => {
    mockUseAuth.mockReturnValue({ user: null, authReady: true });
    mockUseUserPermissions.mockReturnValue(NO_FLAGS);

    renderGatedRoute();

    expect(screen.getByTestId("auth-location").textContent).toBe(
      "/auth?returnTo=%2Frc%2Fdrill%3Fpassage%3D1188",
    );
  });

  // ── Phase 1: the cold deep link that used to bounce ───────────────────────

  it("holds instead of bouncing while auth is still resolving", () => {
    // The regression this whole phase exists for: useUserPermissions reports
    // loading=false before auth resolves, so a !user check alone read
    // "not yet known" as "signed out" and sent every cold deep link to /auth.
    mockUseAuth.mockReturnValue({ user: null, authReady: false });
    mockUseUserPermissions.mockReturnValue(NO_FLAGS);

    renderGatedRoute();

    expect(screen.queryByTestId("auth-location")).not.toBeInTheDocument();
    expect(screen.queryByText("rc player")).not.toBeInTheDocument();
  });

  it("renders a gated route for an entitled user without passing through /auth", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student-1" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_drill_access: true });

    renderGatedRoute();

    expect(screen.getByText("rc player")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-location")).not.toBeInTheDocument();
  });

  it("shows the locked state, not a redirect, for a signed-in user without the flag", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student-1" }, authReady: true });
    mockUseUserPermissions.mockReturnValue({ ...NO_FLAGS, has_classroom_access: true });

    renderGatedRoute();

    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    expect(screen.queryByTestId("auth-location")).not.toBeInTheDocument();
  });

  it("does not infer a pause from missing feature flags", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student-1" }, authReady: true });
    mockUseUserPermissions.mockReturnValue(NO_FLAGS);

    renderGatedRoute();

    expect(screen.getByText("Not open yet")).toBeInTheDocument();
    expect(screen.queryByText(/paused/i)).not.toBeInTheDocument();
    // "Back to your classroom" would land them on this same screen, because
    // Revoke All Access turns the classroom flag off too.
    expect(screen.queryByText("Back to your classroom")).not.toBeInTheDocument();
  });

  it("offers an accessible Attempts route when an exam gate denies access", async () => {
    mockUseAuth.mockReturnValue({ user: { id: "student" }, authReady: true });
    mockUseUserPermissions.mockReturnValue(NO_FLAGS);
    renderLockedExam();
    expect(screen.queryByText("exam overview")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "View exam attempts" }));
    expect(await screen.findByText("exam attempts")).toBeInTheDocument();
  });
});
