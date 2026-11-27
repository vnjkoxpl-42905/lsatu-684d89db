import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { TeacherDock } from "./TeacherDock";
import { MessageFaces } from "./ObservatoryWidgets";

const students = [
  { id: "s1", name: "Lydia Park", activityLabel: "Active today", route: "/teacher/students/s1" },
  { id: "s2", name: "Celia Moreno", activityLabel: "Active yesterday", route: "/teacher/students/s2" },
];
const unread = [
  {
    id: "t1", name: "Celia Moreno", initial: "C", snippet: "Can we move Friday to 5?",
    timeLabel: "9:12 am", receivedAt: "2026-11-18T09:12:00", hasAttachments: false,
    route: "/teacher/inbox/platform:t1",
  },
];

function renderDock(onOpen = vi.fn()) {
  render(
    <TeacherDock
      students={students}
      rosterReady
      unread={unread}
      unreadTotal={1}
      events={[]}
      onOpen={onOpen}
    />,
  );
  return onOpen;
}

function openQuickActions() {
  const launcher = screen.getByRole("button", { name: "Open quick actions" });
  fireEvent.click(launcher);
  return launcher;
}

describe("TeacherDock", () => {
  it("starts with one launcher and returns focus when quick actions close", () => {
    renderDock();
    const dock = screen.getByRole("navigation", { name: "Teacher dock" });
    expect(within(dock).getAllByRole("button")).toHaveLength(1);

    const launcher = openQuickActions();
    const actions = screen.getByRole("group", { name: "Quick actions" });
    expect(launcher).toHaveAccessibleName("Close quick actions");
    expect(launcher).toHaveAttribute("aria-expanded", "true");
    expect(within(actions).getAllByRole("button")).toHaveLength(5);
    expect(within(actions).getByRole("button", { name: "Messages" })).toHaveAccessibleDescription("1 unread");

    within(actions).getByRole("button", { name: "Messages" }).focus();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("group", { name: "Quick actions" })).toBeNull();
    expect(launcher).toHaveFocus();
  });

  it("Assign work closes quick actions and routes to the assignment library", () => {
    const onOpen = renderDock();
    const launcher = openQuickActions();
    fireEvent.click(screen.getByRole("button", { name: "Assign work" }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/library/assignments");
    expect(launcher).toHaveAttribute("aria-expanded", "false");
  });

  it("opens one panel at a time and restores launcher focus after dismissal", () => {
    renderDock();
    const launcher = openQuickActions();
    fireEvent.click(screen.getByRole("button", { name: "Messages" }));
    const messages = screen.getByRole("dialog", { name: "Messages" });
    const unread = within(messages).getByRole("button", { name: /Celia Moreno/ });
    expect(unread).toHaveFocus();
    expect(launcher).toHaveAttribute("aria-expanded", "false");

    openQuickActions();
    expect(screen.queryByRole("dialog")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("dialog", { name: "Calendar" })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(launcher).toHaveFocus();
  });

  it("focuses the search field, searches the real roster, and opens the match", () => {
    const onOpen = renderDock();
    openQuickActions();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    const input = screen.getByRole("searchbox", { name: "Search students" });
    expect(input).toHaveFocus();
    fireEvent.change(input, { target: { value: "lyd" } });
    const list = screen.getByRole("list", { name: "Matching students" });
    const match = within(list).getByRole("button", { name: /Lydia Park/ });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    expect(match).toHaveFocus();
    fireEvent.keyDown(match, { key: "ArrowUp" });
    expect(input).toHaveFocus();
    fireEvent.click(match);
    expect(onOpen).toHaveBeenCalledWith("/teacher/students/s1");
  });

  it("says when nothing matches", () => {
    renderDock();
    openQuickActions();
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Search students" }), { target: { value: "zzz" } });
    expect(screen.getByText("No match for “zzz”")).toBeInTheDocument();
  });
});

describe("MessageFaces", () => {
  it("shows a face, preview and time for each unread thread", () => {
    const onOpen = vi.fn();
    render(<MessageFaces unread={{ state: "ready", total: 1, rows: unread }} onOpen={onOpen} />);
    const list = screen.getByRole("list", { name: "Unread message previews" });
    fireEvent.click(within(list).getByRole("button", { name: /Celia Moreno.*Can we move Friday to 5\?.*9:12 am/ }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/inbox/platform:t1");
  });

  it("never shows an empty inbox while loading or failed", () => {
    const { rerender } = render(<MessageFaces unread={{ state: "loading", total: null, rows: [] }} onOpen={vi.fn()} />);
    expect(screen.queryByText("No unread conversations.")).toBeNull();
    rerender(<MessageFaces unread={{ state: "error", total: null, rows: [] }} onOpen={vi.fn()} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Messages could not be checked.");
  });
});
