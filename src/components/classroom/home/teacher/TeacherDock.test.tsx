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

describe("TeacherDock", () => {
  it("Assign work routes to the assignment library", () => {
    const onOpen = renderDock();
    fireEvent.click(screen.getByRole("button", { name: "Assign work" }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/library/assignments");
  });

  it("opens one panel at a time and Escape returns focus to its opener", () => {
    renderDock();
    const messages = screen.getByRole("button", { name: /^Messages/ });
    fireEvent.click(messages);
    const dialog = screen.getByRole("dialog", { name: "Messages" });
    expect(within(dialog).getByRole("button", { name: /Celia Moreno/ })).toBeInTheDocument();
    expect(messages).toHaveAttribute("aria-expanded", "true");
    fireEvent.click(screen.getByRole("button", { name: "Calendar" }));
    expect(screen.getByRole("dialog", { name: "Calendar" })).toBeInTheDocument();
    expect(messages).toHaveAttribute("aria-expanded", "false");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("searches the real roster and opens the match", () => {
    const onOpen = renderDock();
    const inputs = screen.getAllByLabelText("Search students");
    fireEvent.change(inputs[0], { target: { value: "lyd" } });
    const list = screen.getByRole("list", { name: "Matching students" });
    fireEvent.click(within(list).getByRole("button", { name: /Lydia Park/ }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/students/s1");
  });

  it("says when nothing matches", () => {
    renderDock();
    fireEvent.change(screen.getAllByLabelText("Search students")[0], { target: { value: "zzz" } });
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
