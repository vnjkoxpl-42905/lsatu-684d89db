import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { NextUp } from "./NextUp";
import type { AgendaEvent } from "./teachingDeskModel";

const now = new Date("2026-11-03T14:00:00Z");
const events: AgendaEvent[] = Array.from({ length: 5 }, (_, i) => ({
  id: `event-${i}`,
  title: `Student ${i}`,
  starts_at: new Date(now.getTime() + (i + 1) * 3600000).toISOString(),
  ends_at: new Date(now.getTime() + (i + 2) * 3600000).toISOString(),
  status: "confirmed",
  calendar_url: null,
  student_id: `student-${i}`,
  student_name: `Student ${i}`,
}));

afterEach(() => vi.unstubAllGlobals());

describe("NextUp interactions", () => {
  it("keeps the compact upcoming list short while retaining access to all four upcoming rows", () => {
    vi.stubGlobal("ResizeObserver", class {
      constructor(private callback: (entries: unknown[]) => void) {}
      observe() { this.callback([{ contentRect: { width: 300 } }]); }
      disconnect() {}
    });
    const onOpen = vi.fn();
    render(<NextUp events={events} now={now} timeZone="America/Toronto" onOpen={onOpen} onClassifyError={vi.fn()} />);
    const list = screen.getByRole("list", { name: "Coming up" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Show 2 more events" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    fireEvent.click(within(list).getByRole("button", { name: /Prepare for Student 4/ }));
    expect(onOpen).toHaveBeenCalledWith("/teacher/students/student-4");
    fireEvent.click(screen.getByRole("button", { name: "Show fewer events" }));
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("opens a day and returns to the week with Escape", () => {
    render(<NextUp events={events} now={now} timeZone="America/Toronto" onOpen={vi.fn()} onClassifyError={vi.fn()} />);
    const today = screen.getByRole("button", { name: /Today, Tuesday, November 3/ });
    fireEvent.click(today);
    expect(today).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Show upcoming" })).toBeInTheDocument();
    fireEvent.keyDown(today, { key: "Escape" });
    expect(today).toHaveAttribute("aria-pressed", "false");
    expect(today).toHaveFocus();
  });
});
