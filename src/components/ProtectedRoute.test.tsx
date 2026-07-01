import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
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

  it("redirects anonymous users on admin routes to auth with returnTo preserved", () => {
    mockUseAuth.mockReturnValue({ user: null });
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
    mockUseAuth.mockReturnValue({ user: { id: "user-1" } });
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

    expect(screen.getByText("Premium Content Locked")).toBeInTheDocument();
  });

  it("renders core student routes for signed-in users even when the legacy flag is false", () => {
    mockUseAuth.mockReturnValue({ user: { id: "student-1" } });
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
    mockUseAuth.mockReturnValue({ user: { id: "admin-1" } });
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
});
