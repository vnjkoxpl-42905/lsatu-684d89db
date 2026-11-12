import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeRatingCardView } from "./HomeRatingCard";

const track = (rating: number, count: number) => ({ rating, count });
const profile = (count: number) => ({ LR: track(1424, count) }) as never;

describe("HomeRatingCard", () => {
  it("shows the LR rating and launches Smart Drill", () => {
    const onOpen = vi.fn();
    render(<HomeRatingCardView result={{ profile: profile(40), loading: false, error: null, refresh: vi.fn() }} onOpen={onOpen} />);
    expect(screen.getByText("1424")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Start Smart Drill" }));
    expect(onOpen).toHaveBeenCalledWith(expect.stringContaining("smart-drill"));
  });
  it("counts down before the rating exists", () => {
    render(<HomeRatingCardView result={{ profile: profile(3), loading: false, error: null, refresh: vi.fn() }} onOpen={vi.fn()} />);
    expect(screen.getByText(/more questions/)).toBeInTheDocument();
    expect(screen.queryByText("1424")).toBeNull();
  });
});
