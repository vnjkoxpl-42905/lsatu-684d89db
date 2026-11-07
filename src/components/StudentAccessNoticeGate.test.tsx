import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { StudentAccessNoticeGate } from "./StudentAccessNoticeGate";

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { rpc } }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student" } }) }));

function mount(path: string) {
  return render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <StudentAccessNoticeGate><p>Route content</p></StudentAccessNoticeGate>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("student access notice", () => {
  beforeEach(() => rpc.mockReset());

  it("shows the one-day notice and saves acknowledgment", async () => {
    const notice = {
      kind: "expiration", revision: "r1", message: "Custom note",
      pause_at: "2026-11-04T20:00:00Z", acknowledged_at: null,
    };
    rpc.mockImplementation(async (name) => ({
      data: name === "acknowledge_student_access_notice" ? true : {
        paused: false, server_time: "2026-11-03T20:00:00Z", notice,
      },
    }));
    mount("/classroom");
    expect(await screen.findByRole("alertdialog")).toBeTruthy();
    expect(screen.getByText(/you have 1 day left/i)).toBeTruthy();
    expect(screen.getByText(/Custom note/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Got it" }));
    await waitFor(() => expect(screen.queryByRole("alertdialog")).toBeNull());
    expect(rpc).toHaveBeenCalledWith("acknowledge_student_access_notice", { notice_revision: "r1" });
  });

  it.each(["/classroom/item/saved", "/practice/drills"])("pauses a direct visit to %s", async (path) => {
    rpc.mockResolvedValue({ data: { paused: true, notice: null } });
    mount(path);
    expect(await screen.findByText("Your LSAT U access is paused")).toBeTruthy();
    expect(screen.queryByText("Route content")).toBeNull();
    expect(screen.getByRole("link", { name: "Messages" }).getAttribute("href")).toBe("/inbox");
    expect(screen.getByRole("link", { name: "Book a session" }).getAttribute("href")).toBe("/booking");
  });

  it("shows a retry screen when access cannot be verified", async () => {
    rpc.mockResolvedValue({ error: new Error("Offline") });
    mount("/practice/drills");
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn’t check your access");
    expect(screen.queryByText("Route content")).toBeNull();
    expect(screen.getByRole("button", { name: "Try again" })).toBeTruthy();
  });
  it.each([
    "/inbox/thread", "/booking", "/schedule",
    "/book/session", "/book/consultation", "/book/x/one-off-slug", "/book/student-bearer-slug",
  ])("leaves %s reachable during a pause", async (path) => {
    rpc.mockResolvedValue({ data: { paused: true, notice: null } });
    mount(path);
    expect(await screen.findByText("Route content")).toBeTruthy();
  });

  it.each(["/book", "/bookshelf", "/booking-admin", "/classroom"])(
    "does not widen the pause exemption to %s", async (path) => {
      rpc.mockResolvedValue({ data: { paused: true, notice: null } });
      mount(path);
      expect(await screen.findByText("Your LSAT U access is paused")).toBeTruthy();
      expect(screen.queryByText("Route content")).toBeNull();
    },
  );
});
