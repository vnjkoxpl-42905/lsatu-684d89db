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

it("offers only server days in local date order and confirms the selected student's identity", async () => {
  const pass = { credits_remaining: 2, session_length_minutes: 70, status: "active" };
  const later = new Date(2026, 11, 11, 13).toISOString();
  const earlier = new Date(2026, 11, 2, 14).toISOString();
  const api: BookingApi = { loadInfo: vi.fn().mockResolvedValue({ pass, bookings: [] }), loadSlots: vi.fn().mockResolvedValue({ pass, slots: [{ start_at: later, end_at: later }, { start_at: earlier, end_at: earlier }] }), book: vi.fn().mockResolvedValue(undefined) };
  const lock = vi.fn();
  const committed = vi.fn().mockRejectedValue(new Error("refresh unavailable"));
  const view = render(<CalendlyBookingCard api={api} dayPicker="dropdown" bookingFor={{ name: "Fictional Student", email: "fictional@example.test" }} onConfirmationChange={lock} onBookingCommitted={committed} />);
  const picker = await screen.findByRole("combobox", { name: "Available day" });
  await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(3));
  const offered = screen.getAllByRole("option");
  expect(offered[1]).toHaveTextContent("Wednesday, December 2, 2026");
  expect(offered[2]).toHaveTextContent("Friday, December 11, 2026");
  expect(picker).toHaveValue(offered[1].getAttribute("value"));
  expect(screen.getByRole("button", { name: /2:00/ })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Next month" })).not.toBeInTheDocument();
  fireEvent.change(picker, { target: { value: offered[1].getAttribute("value") } });
  fireEvent.click(screen.getByRole("button", { name: /2:00/ }));
  fireEvent.click(screen.getByRole("button", { name: /Book 2:00/ }));
  await waitFor(() => expect(lock).toHaveBeenLastCalledWith(true));
  expect(screen.getByRole("dialog")).toHaveTextContent("Fictional Student");
  expect(screen.getByRole("dialog")).toHaveTextContent("fictional@example.test");
  expect(screen.getByRole("dialog")).toHaveTextContent("Wednesday, December 2, 2026");
  expect(screen.getByRole("dialog")).toHaveTextContent(Intl.DateTimeFormat().resolvedOptions().timeZone);
  expect(screen.getByRole("dialog")).toHaveTextContent("This uses 1 session");
  expect(api.book).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Book it" }));
  expect(await screen.findByText("Session booked")).toBeInTheDocument();
  await waitFor(() => expect(committed).toHaveBeenCalledOnce());
  expect(api.book).toHaveBeenCalledWith(earlier, expect.any(String), undefined);
  view.unmount();
  expect(lock).toHaveBeenLastCalledWith(false);
});
