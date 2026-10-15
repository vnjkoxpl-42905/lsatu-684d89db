import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import CalendlyBookingCard, { type BookingApi } from "./CalendlyBookingCard";

vi.mock("./BookingConfirmDialog", () => ({
  default: ({ onBooked }: { onBooked: (slot: string) => Promise<unknown> }) => (
    <button onClick={() => void onBooked("2099-10-01T13:00:00.000Z")}>Complete test booking</button>
  ),
}));

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
  it("refreshes an assigned credit on focus and on request without reloading availability", async () => {
    const pass = { credits_remaining: 1, session_length_minutes: 70, status: "active" };
    const loadInfo = vi.fn().mockResolvedValue({ pass, bookings: [] });
    const api: BookingApi = { loadInfo, loadSlots: vi.fn().mockResolvedValue({ pass, slots: [] }), book: vi.fn() };
    render(<CalendlyBookingCard api={api} />);
    await screen.findByText("session available to book");
    await waitFor(() => expect(api.loadSlots).toHaveBeenCalledTimes(1));
    fireEvent.focus(window);
    await waitFor(() => expect(loadInfo).toHaveBeenCalledTimes(2));
    expect(api.loadSlots).toHaveBeenCalledTimes(1);
    loadInfo.mockResolvedValue({ pass: { ...pass, credits_remaining: 2 }, bookings: [] });
    fireEvent.click(screen.getByRole("button", { name: "Refresh credits" }));
    const balanceLabel = await screen.findByText("sessions available to book");
    expect(balanceLabel.previousElementSibling).toHaveTextContent("2");
  });

  it("keeps the post-booking balance and session when an older background refresh finishes late", async () => {
    const pass = { credits_remaining: 2, session_length_minutes: 70, status: "active" };
    let finishBackground!: (value: { pass: typeof pass; bookings: [] }) => void;
    const pendingBackground = new Promise<{ pass: typeof pass; bookings: [] }>((resolve) => { finishBackground = resolve; });
    const loadInfo = vi.fn()
      .mockResolvedValueOnce({ pass, bookings: [] })
      .mockReturnValueOnce(pendingBackground)
      .mockResolvedValueOnce({
        pass: { ...pass, credits_remaining: 1 },
        bookings: [{ source: "redemption", id: "confirmed", start_at: "2099-10-01T13:00:00.000Z", status: "booked", meet_url: "https://meet.google.com/test" }],
      });
    const api: BookingApi = { loadInfo, loadSlots: vi.fn().mockResolvedValue({ pass, slots: [] }), book: vi.fn() };
    render(<CalendlyBookingCard api={api} />);
    await screen.findByText("sessions available to book");
    fireEvent.focus(window);
    await waitFor(() => expect(loadInfo).toHaveBeenCalledTimes(2));
    fireEvent.click(screen.getByRole("button", { name: "Complete test booking" }));
    await screen.findByText("session available to book");
    expect(screen.getByRole("link", { name: "Join" })).toHaveAttribute("href", "https://meet.google.com/test");
    await act(async () => { finishBackground({ pass, bookings: [] }); await pendingBackground; });
    expect(screen.getByText("session available to book").previousElementSibling).toHaveTextContent("1");
    expect(screen.getByRole("link", { name: "Join" })).toBeInTheDocument();
  });

});
