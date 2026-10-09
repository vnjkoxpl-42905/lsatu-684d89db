import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendlyBookingCard, { type BookingApi } from "./CalendlyBookingCard";

describe("CalendlyBookingCard", () => {
  it("keeps the next month open so a student can select its available dates", async () => {
    const pass = { credits_remaining: 10, session_length_minutes: 70, status: "active" };
    const api: BookingApi = {
      loadInfo: vi.fn().mockResolvedValue({ pass, bookings: [] }),
      loadSlots: vi.fn().mockResolvedValue({
        pass,
        slots: [
          { start_at: new Date(2026, 8, 29, 13).toISOString(), end_at: new Date(2026, 8, 29, 14, 10).toISOString() },
          { start_at: new Date(2026, 9, 1, 13).toISOString(), end_at: new Date(2026, 9, 1, 14, 10).toISOString() },
        ],
      }),
      book: vi.fn(),
    };

    render(<CalendlyBookingCard api={api} />);
    expect(await screen.findByRole("group", { name: "September 2026 availability calendar" })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Tuesday, September 29, 2026" })).toHaveAttribute("aria-pressed", "true"));

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByRole("group", { name: "October 2026 availability calendar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Thursday, October 1, 2026" }));
    expect(screen.getByText("Thursday, October 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /1:00/ })).toBeInTheDocument();
  });
});
