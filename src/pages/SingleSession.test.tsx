import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SingleSession, { type SingleSessionApi } from "./SingleSession";
import { readFileSync } from "node:fs";

const bookingTheme = readFileSync("src/pages/booking/booking-theme.css", "utf8");

const slot = { start_at: "2026-08-18T17:00:00.000Z", end_at: "2026-08-18T18:10:00.000Z" };

function api(overrides: Partial<SingleSessionApi> = {}): SingleSessionApi {
  return {
    info: vi.fn().mockResolvedValue({ host: { name: "Joshua", title: "LSAT Session" }, duration_minutes: 70, amount_cents: 4500, currency: "usd" }),
    slots: vi.fn().mockResolvedValue({ slots: [slot] }),
    hold: vi.fn().mockResolvedValue({ checkout_url: "https://checkout.stripe.test/session", booking_token: "book-token", checkout_session_id: "cs_test" }),
    status: vi.fn().mockResolvedValue({ status: "checkout_open", start_at: slot.start_at, end_at: slot.end_at }),
    abandon: vi.fn().mockResolvedValue({ status: "abandoned" }),
    cancel: vi.fn().mockResolvedValue({ status: "cancelled", start_at: slot.start_at, end_at: slot.end_at }),
    getTurnstileToken: vi.fn().mockResolvedValue("turnstile-token"),
    redirectToCheckout: vi.fn(),
    ...overrides,
  };
}

function renderPage(client = api(), entry = "/book/session", event = "single-session") {
  render(<MemoryRouter initialEntries={[entry]}><SingleSession api={client} event={event} /></MemoryRouter>);
  return client;
}

async function chooseSlotAndFillForm() {
  await screen.findByRole("button", { name: /Tuesday, August 18/i });
  fireEvent.click(screen.getAllByRole("button", { name: /1:00/i })[0]);
  fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: "Booker Name" } });
  fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "BOOKER@example.com" } });
}

describe("SingleSession", () => {
  beforeEach(() => sessionStorage.clear());

  it("reuses one idempotency key and one Hold when Pay to book is double-submitted", async () => {
    const client = renderPage();
    await chooseSlotAndFillForm();
    const submit = screen.getByRole("button", { name: /Pay to book/i });
    fireEvent.click(submit);
    fireEvent.click(submit);

    await waitFor(() => expect(client.hold).toHaveBeenCalledTimes(1));
    expect(client.hold).toHaveBeenCalledWith(expect.objectContaining({
      start_at: slot.start_at,
      email: "booker@example.com",
      turnstile_token: "turnstile-token",
      client_idempotency_key: expect.any(String),
    }));
    expect(client.redirectToCheckout).toHaveBeenCalledWith("https://checkout.stripe.test/session");
  });

  it("confirms a free consultation without sending anyone to checkout", async () => {
    // The free path finishes inside hold: no checkout_url comes back, and the
    // booking is already booked. Redirecting here would land on a Stripe page
    // that was never created.
    const client = api({
      info: vi.fn().mockResolvedValue({
        host: { name: "Joshua", title: "Consultation" },
        duration_minutes: 30, amount_cents: 0, currency: "usd", requires_payment: false,
      }),
      hold: vi.fn().mockResolvedValue({
        checkout_url: null,
        checkout_session_id: null,
        booking_token: "book-token",
        booking: {
          id: "booking-free",
          status: "booked",
          start_at: slot.start_at,
          end_at: slot.end_at,
          attendee_name: "Booker Name",
          event_label: "Free Consultation",
          duration_minutes: 30,
          timezone: "America/Toronto",
          calendar_pending: true,
        },
      }),
    });
    renderPage(client, "/book/consultation", "consultation");

    await screen.findAllByText("Free");
    await chooseSlotAndFillForm();
    expect(screen.getByText("No payment is required.")).toBeInTheDocument();
    expect(screen.queryByText(/finish payment securely on Stripe/i)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Confirm booking/i }));

    await screen.findByRole("heading", { name: /You are scheduled/i });
    expect(screen.getByText("Free Consultation")).toBeInTheDocument();
    expect(screen.getByText("Booker Name")).toBeInTheDocument();
    expect(client.redirectToCheckout).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("lsatu.single-session.pending.consultation")).toBeNull();
  });

  it("announces a stale Slot and returns focus to refreshed availability", async () => {
    const client = api({ hold: vi.fn().mockRejectedValue(new Error("slot_unavailable")) });
    renderPage(client);
    await chooseSlotAndFillForm();
    fireEvent.click(screen.getByRole("button", { name: /Pay to book/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/time was just taken/i);
    await waitFor(() => expect(client.slots).toHaveBeenCalledTimes(2));
    expect(screen.queryAllByRole("button", { name: /1:00/i })).toHaveLength(0);
    expect(screen.getByRole("heading", { name: /Select a time/i })).toHaveFocus();
  });

  it("reports an unavailable security check without removing an available slot", async () => {
    const client = api({
      getTurnstileToken: vi.fn().mockRejectedValue(new Error("security_check_unavailable")),
    });
    renderPage(client);
    await chooseSlotAndFillForm();
    fireEvent.click(screen.getByRole("button", { name: /Pay to book/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(/security check could not load/i);
    expect(client.hold).not.toHaveBeenCalled();
    expect(client.slots).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole("button", { name: /Back to times/i }));
    expect(screen.getAllByRole("button", { name: /1:00/i })).not.toHaveLength(0);
  });

  it.each([
    ["security_check_expired", /security check expired/i],
    ["verification_failed", /security check did not pass/i],
  ])("renders %s as a truthful security error", async (reason, expected) => {
    const client = reason === "verification_failed"
      ? api({ hold: vi.fn().mockRejectedValue(new Error(reason)) })
      : api({ getTurnstileToken: vi.fn().mockRejectedValue(new Error(reason)) });
    renderPage(client);
    await chooseSlotAndFillForm();
    fireEvent.click(screen.getByRole("button", { name: /Pay to book/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(expected);
    expect(client.slots).toHaveBeenCalledTimes(1);
  });

  it("resumes an open checkout after returning from Stripe", async () => {
    sessionStorage.setItem("lsatu.single-session.pending", JSON.stringify({
      booking_token: "book-token", checkout_session_id: "cs_test", checkout_url: "https://checkout.stripe.test/session",
    }));
    const client = renderPage(api(), "/book/session?booking_token=book-token");

    expect(await screen.findByRole("heading", { name: /Finish your payment/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Return to secure checkout/i }));
    expect(client.redirectToCheckout).toHaveBeenCalledWith("https://checkout.stripe.test/session");
  });

  it("shows a complete burgundy confirmation while the calendar invitation is being prepared", async () => {
    const client = api({ status: vi.fn().mockResolvedValue({
      status: "booked",
      start_at: slot.start_at,
      end_at: slot.end_at,
      attendee_name: "Booker Name",
      event_label: "LSAT U Session",
      duration_minutes: 70,
      timezone: "America/Toronto",
      calendar_pending: true,
      calendar_ready: false,
      calendar_url: null,
    }) });
    renderPage(client, "/book/session?checkout_session_id=cs_test&booking_token=book-token");

    expect(await screen.findByRole("heading", { name: /You are scheduled/i })).toBeInTheDocument();
    expect(screen.getByText(/preparing your calendar invitation now/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Preparing invitation/i })).toBeDisabled();
    expect(screen.getByText("Booker Name")).toBeInTheDocument();
    expect(screen.getByText("LSAT U Session")).toBeInTheDocument();
    expect(screen.getByText("America/Toronto")).toBeInTheDocument();
    expect(screen.getByText(/70 minutes/i)).toBeInTheDocument();
    expect(screen.getByText(/Powered by LSAT U/i)).toHaveClass("text-white");
    expect(client.status).toHaveBeenCalledWith({ checkout_session_id: "cs_test" }, "book-token");
  });

  it("opens only the calendar invitation once calendar promotion is ready", async () => {
    const client = api({ status: vi.fn().mockResolvedValue({
      status: "booked",
      start_at: slot.start_at,
      end_at: slot.end_at,
      attendee_name: "Booker Name",
      event_label: "LSAT U Session",
      duration_minutes: 70,
      timezone: "America/Toronto",
      calendar_ready: true,
      calendar_pending: false,
      calendar_url: "https://calendar.google.test/event",
      meet_url: "https://meet.google.test/secret",
    }) });
    renderPage(client, "/book/session?checkout_session_id=cs_test&booking_token=book-token");

    const invitation = await screen.findByRole("link", { name: /Open Invitation/i });
    expect(invitation).toHaveAttribute("href", "https://calendar.google.test/event");
    expect(screen.getByText(/calendar invitation has been sent/i)).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Google Meet/i })).not.toBeInTheDocument();
  });

  it("keeps polling when a calendar URL exists but readiness is not confirmed", async () => {
    vi.useFakeTimers();
    try {
      const pending = {
        status: "booked" as const,
        start_at: slot.start_at,
        end_at: slot.end_at,
        calendar_ready: false,
        calendar_pending: true,
        calendar_url: "https://calendar.google.test/event",
      };
      const status = vi.fn()
        .mockResolvedValueOnce(pending)
        .mockResolvedValueOnce({ ...pending, calendar_ready: true, calendar_pending: false });

      renderPage(api({ status }), "/book/session?checkout_session_id=cs_test&booking_token=book-token");
      await act(async () => { await Promise.resolve(); });

      expect(screen.queryByRole("link", { name: /Open Invitation/i })).not.toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Preparing invitation/i })).toBeDisabled();

      await act(async () => { await vi.advanceTimersByTimeAsync(1_500); });

      expect(screen.getByRole("link", { name: /Open Invitation/i })).toHaveAttribute(
        "href",
        pending.calendar_url,
      );
      expect(status).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("loads and polls a free booking by booking id and capability token", async () => {
    const status = vi.fn().mockResolvedValue({
      status: "booked",
      start_at: slot.start_at,
      end_at: slot.end_at,
      event_label: "Free Consultation",
      calendar_ready: true,
      calendar_url: "https://calendar.google.test/free-event",
    });
    renderPage(api({ status }), "/book/consultation?booking_id=booking-free&booking_token=book-token", "consultation");

    expect(await screen.findByRole("link", { name: /Open Invitation/i })).toBeInTheDocument();
    expect(status).toHaveBeenCalledWith({ booking_id: "booking-free" }, "book-token");
  });

  it("stops calendar polling at the bound and shows a truthful delayed state", async () => {
    vi.useFakeTimers();
    try {
      const status = vi.fn().mockResolvedValue({
        status: "booked",
        start_at: slot.start_at,
        end_at: slot.end_at,
        calendar_ready: false,
        calendar_pending: true,
        calendar_url: null,
      });
      renderPage(api({ status }), "/book/session?checkout_session_id=cs_test&booking_token=book-token");

      await act(async () => { await Promise.resolve(); });
      expect(screen.getByRole("heading", { name: /You are scheduled/i })).toBeInTheDocument();
      await act(async () => { await vi.advanceTimersByTimeAsync(30_000); });

      expect(screen.getByText(/taking a little longer to prepare/i)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Invitation pending/i })).toBeDisabled();
      expect(status).toHaveBeenCalledTimes(21);
    } finally {
      vi.useRealTimers();
    }
  });

  it("previews cancellation before committing it and then confirms the cancelled state", async () => {
    const cancel = vi.fn()
      .mockResolvedValueOnce({ status: "booked", start_at: slot.start_at, end_at: slot.end_at, meet_url: null })
      .mockResolvedValueOnce({ status: "cancelled", start_at: slot.start_at, end_at: slot.end_at, meet_url: null });
    renderPage(api({ cancel }), "/book/session?cancel_token=cancel-token");

    expect(await screen.findByRole("heading", { name: /Cancel this session/i })).toBeInTheDocument();
    expect(screen.getByText(/does not automatically issue a refund/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Cancel session$/i }));

    expect(await screen.findByRole("heading", { name: /Your session is cancelled/i })).toBeInTheDocument();
    expect(cancel).toHaveBeenNthCalledWith(1, "cancel-token", false);
    expect(cancel).toHaveBeenNthCalledWith(2, "cancel-token", true);
  });

  it("shows an expired stale return without offering the old checkout again", async () => {
    const client = api({ status: vi.fn().mockResolvedValue({ status: "expired", start_at: slot.start_at, end_at: slot.end_at }) });
    renderPage(client, "/book/session?checkout_session_id=cs_test&booking_token=book-token");

    expect(await screen.findByRole("heading", { name: /This hold expired/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Return to secure checkout/i })).not.toBeInTheDocument();
  });

  it("moves focus into the details form and keeps errors in an assertive live region", async () => {
    renderPage(api({ hold: vi.fn().mockRejectedValue(new Error("slot_conflict")) }));
    const day = await screen.findByRole("button", { name: /Tuesday, August 18/i });
    day.focus();
    fireEvent.keyDown(day, { key: "Enter" });
    fireEvent.click(screen.getAllByRole("button", { name: /1:00/i })[0]);
    await waitFor(() => expect(screen.getByLabelText(/Your name/i)).toHaveFocus());
    fireEvent.change(screen.getByLabelText(/Your name/i), { target: { value: "Booker" } });
    fireEvent.change(screen.getByLabelText(/Email address/i), { target: { value: "booker@example.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Pay to book/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(/time was just taken/i);
  });

  it("uses one selected-day calendar layout at every width plus a reduced-motion contract", async () => {
    renderPage();
    await screen.findByRole("heading", { name: /Select a time/i });
    expect(screen.getByTestId("single-session-selected-day-slots")).toBeVisible();
    expect(screen.queryByTestId("single-session-desktop-week")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tuesday, August 18/i })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /1:00/i })).toBeVisible();
    expect(bookingTheme).toContain("@media (prefers-reduced-motion: reduce)");
    expect(bookingTheme).toContain(".single-session-page *");
  });
});
