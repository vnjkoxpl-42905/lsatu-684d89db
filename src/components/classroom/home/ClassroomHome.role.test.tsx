import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { buildWeek, weekDates, type ClassroomHomeModel } from "./homeModel";
import type { TeacherHomeModel } from "./teacher/teacherHomeModel";

const perms = vi.hoisted(() => ({
  current: {} as Record<string, unknown>,
}));
const studentHook = vi.hoisted(() => vi.fn());
const teacherHook = vi.hoisted(() => vi.fn());

vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: () => perms.current }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "actor-1" } }) }));
vi.mock("@/components/classroom/shell/classroomLayoutContext", () => ({
  useClassroomLayout: () => ({ openSection: vi.fn(), displayName: "Joshua" }),
}));
vi.mock("@/components/questionfinder/useQuestionFinderBanks", () => ({
  useQuestionFinderBanks: () => ({ lr: [], rcPassages: [], rcQuestions: [], loading: false, error: null, lrFailed: false, rcFailed: false }),
}));
vi.mock("./useHomeFreshness", () => ({ useHomeFreshness: () => ({ refresh: vi.fn(), refreshing: false }) }));

const STUDENT_MODEL: ClassroomHomeModel = {
  greeting: "Good morning",
  displayName: "Ada",
  isAdmin: false,
  access: { messages: true, schedule: true, activities: true, drill: true },
  dateline: "Thursday · October 22 · 2026",
  subtitle: "One assignment is due today.",
  daysToTest: null,
  dueTodayCount: 1,
  hero: null,
  rows: [
    {
      key: "hw:1",
      title: "Conditional Indicators Refresher",
      kind: "homework",
      tone: "drill",
      meta: "Homework · due today",
      route: "/conditional-indicators-refresher",
      actionLabel: "Open",
      emphasis: true,
      isNew: true,
      dueToday: true,
      overdue: false,
    },
  ],
  newCount: 1,
  message: null,
  messages: [],
  unreadMessages: 0,
  homeBooking: { state: "none" },
  week: buildWeek(weekDates(new Date(2026, 9, 22)), [], new Date(2026, 9, 22)),
  weekLabel: "October 22 to 28",
};

const TEACHER_MODEL: TeacherHomeModel = {
  greeting: "Good afternoon",
  displayName: "Joshua",
  dateline: "Thursday · October 22 · 2026",
  unread: { state: "ready", total: 0, rows: [] },
  roster: { state: "ready", total: 3, recent: [] },
  sessions: { state: "ready", rows: [] },
};

vi.mock("./useClassroomHome", () => ({
  useClassroomHome: () => {
    studentHook();
    return { model: STUDENT_MODEL, loading: false, markDone: vi.fn(), clearMessage: vi.fn(), completingKey: null, retryWork: vi.fn() };
  },
}));
vi.mock("./teacher/useTeacherHome", () => ({
  useTeacherHome: () => {
    teacherHook();
    return { model: TEACHER_MODEL, retryInbox: vi.fn(), retryRoster: vi.fn(), retrySessions: vi.fn() };
  },
}));

import ClassroomHome from "./ClassroomHome";

const renderHome = () => render(<ClassroomHome />, { wrapper: MemoryRouter });

function setPermissions(patch: Record<string, unknown>) {
  perms.current = {
    is_admin: false,
    loading: false,
    resolved: true,
    resolvedFor: "actor-1",
    isError: false,
    error: null,
    retry: vi.fn(),
    ...patch,
  };
}

/** Anything a student Home would put on the screen. */
function expectNoStudentContent() {
  expect(screen.queryByLabelText("Assigned to you")).toBeNull();
  expect(screen.queryByText("Conditional Indicators Refresher")).toBeNull();
  expect(screen.queryByRole("button", { name: "Smart Drill" })).toBeNull();

  expect(screen.queryByText(/assigned to you/i)).toBeNull();
}

beforeEach(() => {
  studentHook.mockClear();
  teacherHook.mockClear();
});

describe("ClassroomHome role dispatch", () => {
  it("mounts neither Home while the role is still loading", () => {
    setPermissions({ resolved: false, resolvedFor: null, loading: true });
    renderHome();
    expect(screen.getByLabelText("Loading Home")).toBeInTheDocument();
    expect(studentHook).not.toHaveBeenCalled();
    expect(teacherHook).not.toHaveBeenCalled();
    expectNoStudentContent();
  });

  it("offers a retry on a cold failure instead of falling back to the student Home", () => {
    const retry = vi.fn();
    setPermissions({ resolved: false, resolvedFor: null, isError: true, retry });
    renderHome();
    expect(screen.getByRole("alert")).toHaveTextContent("Home did not load");
    expect(studentHook).not.toHaveBeenCalled();
    expect(teacherHook).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("shows the teaching desk to an admin and never the admin's own assigned work", () => {
    setPermissions({ is_admin: true });
    renderHome();
    expect(screen.getByRole("heading", { name: "Good afternoon, Joshua." })).toBeInTheDocument();
    expect(teacherHook).toHaveBeenCalled();
    expect(studentHook).not.toHaveBeenCalled();
    expectNoStudentContent();
  });

  it("keeps the teaching desk mounted through a background refresh failure", () => {
    const retry = vi.fn();
    setPermissions({ is_admin: true });
    const { rerender } = renderHome();
    const desk = screen.getByRole("heading", { name: "Good afternoon, Joshua." });
    setPermissions({ is_admin: true, isError: true, retry });
    rerender(<ClassroomHome />);
    // Same node: the desk was not torn down and rebuilt.
    expect(screen.getByRole("heading", { name: "Good afternoon, Joshua." })).toBe(desk);
    expect(screen.getByRole("status")).toHaveTextContent("did not refresh");
    expect(studentHook).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("clears the notice once a retry succeeds", () => {
    setPermissions({ is_admin: true, isError: true });
    const { rerender } = renderHome();
    expect(screen.getByRole("status")).toBeInTheDocument();
    setPermissions({ is_admin: true, isError: false });
    rerender(<ClassroomHome />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows a student their assigned work", () => {
    setPermissions({ is_admin: false });
    renderHome();
    expect(screen.getByLabelText("Assigned to you")).toBeInTheDocument();
    expect(screen.getByText("Conditional Indicators Refresher")).toBeInTheDocument();
    expect(teacherHook).not.toHaveBeenCalled();
  });

  it("switches Home when a successful refresh changes the role", () => {
    setPermissions({ is_admin: false });
    const { rerender } = renderHome();
    expect(screen.getByLabelText("Assigned to you")).toBeInTheDocument();
    studentHook.mockClear();
    setPermissions({ is_admin: true });
    rerender(<ClassroomHome />);
    expect(screen.getByRole("heading", { name: "Good afternoon, Joshua." })).toBeInTheDocument();
    expectNoStudentContent();
    expect(studentHook).not.toHaveBeenCalled();
  });

  it("remounts for a different account rather than reusing the previous Home", () => {
    setPermissions({ is_admin: true, resolvedFor: "actor-1" });
    const { rerender } = renderHome();
    const first = screen.getByRole("heading", { name: "Good afternoon, Joshua." });
    setPermissions({ is_admin: true, resolvedFor: "actor-2" });
    rerender(<ClassroomHome />);
    expect(screen.getByRole("heading", { name: "Good afternoon, Joshua." })).not.toBe(first);
  });
});
