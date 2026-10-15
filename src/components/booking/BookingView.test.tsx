import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import BookingView from "./BookingView";

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
vi.mock("@/lib/waitForSession", () => ({ waitForAccessToken: vi.fn().mockResolvedValue("test-token") }));

const offers = [
  { id: "single-session-native", label: "Single session", provider: "native", url: "/book/session", credits: 0 },
  { id: "package-5", label: "5-hour package", provider: "stripe", url: "https://example.com/five", credits: 5 },
  { id: "package-10", label: "10-hour package", provider: "stripe", url: "https://example.com/ten", credits: 10 },
];
const mount = (pass: unknown, availableOffers = offers) => {
  invoke.mockImplementation(async (_name, { body }) => ({ data: body.action === "slots" ? { pass, slots: [] } : { pass, offers: availableOffers, bookings: [] }, error: null }));
  render(<MemoryRouter><QueryClientProvider client={new QueryClient()}><BookingView /></QueryClientProvider></MemoryRouter>);
};
const expectPurchaseLinks = () => {
  expect(screen.getByRole("link", { name: "Book and pay for one session" })).toHaveAttribute("href", "/book/session");
  expect(screen.getByRole("link", { name: "Buy 5-hour package" })).toHaveAttribute("href", "https://example.com/five");
  expect(screen.getByRole("link", { name: "Buy 10-hour package" })).toHaveAttribute("href", "https://example.com/ten");
  expect(screen.getByText("Use your LSAT U account email at checkout so we can match your payment.")).toBeInTheDocument();
};

describe("BookingView purchase access", () => {
  beforeEach(() => { invoke.mockReset(); });

  it("leads with all three payment links when the student has no pass", async () => {
    mount(null);
    const emptyState = await screen.findByText("No sessions available.");
    expectPurchaseLinks();
    const hub = screen.getByRole("region", { name: "Choose how you want to book" });
    expect(hub.compareDocumentPosition(emptyState) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.getByText(/package above to get started/)).toBeInTheDocument();
  });

  it("keeps all purchase links available for an exhausted pass", async () => {
    mount({ credits_remaining: 0, total_credits: 5, session_length_minutes: 60, status: "active" });
    await screen.findByText(/buy a package above to keep going/);
    expectPurchaseLinks();
    expect(invoke.mock.calls.some(([, { body }]) => body.action === "slots")).toBe(false);
  });

  it("still offers more sessions below the booking card when credits remain", async () => {
    mount({ credits_remaining: 1, total_credits: 5, session_length_minutes: 60, status: "active" });
    const balance = await screen.findByText("session available to book");
    expectPurchaseLinks();
    const hub = screen.getByRole("region", { name: "Need more sessions?" });
    expect(balance.compareDocumentPosition(hub) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("does not send students to nonexistent offers when the registry returns none", async () => {
    mount(null, []);
    await screen.findByText(/No booking offers are available/);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();
    expect(screen.getByText("Message Joshua if you need help getting more sessions.")).toBeInTheDocument();
    expect(screen.queryByText(/package above/)).not.toBeInTheDocument();
  });
});
