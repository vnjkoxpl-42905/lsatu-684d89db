import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { BOOKING_A, STUDENT, item, link } from "@/test/sessionChainFixtures";

/**
 * Exercises the real useStudentSessionChain state logic. Only the two source
 * hooks underneath it are replaced, so loading, failure, stale and account
 * changes reach the Notes section exactly as the app derives them.
 */
const src = vi.hoisted(() => ({
  user: { id: "aaaaaaaa-0000-4000-8000-000000000001" } as { id: string } | null,
  booking: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
  items: { data: undefined as unknown, isLoading: false, isError: false, refetch: vi.fn() },
}));

vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: src.user }) }));
vi.mock("@/components/classroom/ClassroomRouteViews", () => ({ ClassroomRecapsView: () => null }));
vi.mock("@/lib/journalService", () => ({ listPages: vi.fn(async () => []), createPage: vi.fn(), updateMyNotePage: vi.fn() }));
vi.mock("@/hooks/useStudentBooking", () => ({ useStudentBooking: () => src.booking }));
vi.mock("@/hooks/useClassroomItems", () => ({ useClassroomItems: () => src.items }));

import MyWorkNotesPage from "./MyWorkNotesPage";

const recap = item({ title: "Oct 5 recap", type: "session_recap", metadata_json: { session_chain: link({ phase: "recap" }) } });
const rawBooking = { source: "redemption", id: BOOKING_A, start_at: "2026-10-05T15:00:00Z", end_at: "2026-10-05T16:10:00Z", status: "booked", meet_url: null };

function page() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}><MemoryRouter><MyWorkNotesPage /></MemoryRouter></QueryClientProvider>;
}

beforeEach(() => {
  src.user = { id: STUDENT };
  src.booking = { data: { pass: null, bookings: [rawBooking] }, isLoading: false, isError: false, refetch: vi.fn() };
  src.items = { data: [recap], isLoading: false, isError: false, refetch: vi.fn() };
});

describe("My Work Notes session links", () => {
  it("shows an item-source failure with retry instead of hiding the section", () => {
    src.items = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    render(page());
    expect(screen.getByRole("alert")).toHaveTextContent("Your notes and recaps could not be loaded, so session links for your notes are unknown.");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(src.items.refetch).toHaveBeenCalled();
  });

  it("names a booking-source failure separately", () => {
    src.booking = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    render(page());
    expect(screen.getByRole("alert")).toHaveTextContent("Your sessions could not be loaded");
    expect(screen.queryByText("Oct 5 recap")).not.toBeInTheDocument();
  });

  it("keeps cached links during a failed refresh and offers retry", () => {
    src.items = { data: [recap], isLoading: false, isError: true, refetch: vi.fn() };
    render(page());
    expect(screen.getByText("Oct 5 recap")).toBeInTheDocument();
    expect(screen.getByText("Could not refresh. Showing what loaded earlier.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(src.items.refetch).toHaveBeenCalled();
  });

  it("shows the links after a successful retry", () => {
    src.items = { data: undefined, isLoading: false, isError: true, refetch: vi.fn() };
    const view = render(page());
    expect(screen.queryByText("Oct 5 recap")).not.toBeInTheDocument();
    src.items = { data: [recap], isLoading: false, isError: false, refetch: vi.fn() };
    view.rerender(page());
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByText("Oct 5 recap")).toBeInTheDocument();
  });

  it("does not show the previous account's links while the next account's reads are pending", () => {
    const view = render(page());
    expect(screen.getByText("Oct 5 recap")).toBeInTheDocument();
    src.user = { id: "aaaaaaaa-0000-4000-8000-000000000009" };
    // Bookings for the new account are still loading; the item cache still
    // holds the previous account's rows.
    src.booking = { data: undefined, isLoading: true, isError: false, refetch: vi.fn() };
    view.rerender(page());
    expect(screen.queryByText("Oct 5 recap")).not.toBeInTheDocument();
    expect(screen.getByText("Checking which notes belong to your sessions…")).toBeInTheDocument();
    // Even once the new account's bookings arrive, the old rows do not project.
    src.booking = { data: { pass: null, bookings: [rawBooking] }, isLoading: false, isError: false, refetch: vi.fn() };
    view.rerender(page());
    expect(screen.queryByText("Oct 5 recap")).not.toBeInTheDocument();
  });
});
