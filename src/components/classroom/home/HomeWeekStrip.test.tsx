import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeWeekStrip } from "./HomeWeekStrip";
import { buildWeek, weekDates, weekLabelFor } from "./homeModel";

describe("HomeWeekStrip", () => {
  const now = new Date(2026, 9, 22, 12);
  const dates = weekDates(now);
  const days = buildWeek(dates, [], now);
  it("keeps seven visible dates with one current day and keyboard scrolling for static teacher cards", () => {
    const { container } = render(<HomeWeekStrip days={days} range={weekLabelFor(dates)} emptyLabel="No sessions shown" />);
    const strip = screen.getByLabelText("Next seven days");
    expect(within(strip).getAllByRole("listitem")).toHaveLength(7);
    expect(within(strip).queryByRole("button")).toBeNull();
    expect(container.querySelectorAll('[aria-current="date"]')).toHaveLength(1);
    expect(screen.getByRole("group")).toHaveAttribute("tabindex", "0");
    expect(strip).not.toHaveTextContent("No sessions scheduled");
  });
  it("preserves the student schedule action when supplied", () => {
    const onOpen = vi.fn();
    render(<HomeWeekStrip days={days} range={weekLabelFor(dates)} onDayOpen={onOpen} />);
    screen.getAllByRole("button")[0].click();
    expect(onOpen).toHaveBeenCalledOnce();
  });
});
