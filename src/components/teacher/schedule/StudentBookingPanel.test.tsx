import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StudentBookingPanel from "./StudentBookingPanel";

const mocks = vi.hoisted(() => ({ invoke: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke: mocks.invoke } } }));
vi.mock("sonner", () => ({ toast: { success: mocks.success, error: mocks.error, message: vi.fn() } }));
const props = { studentId: "tester", studentName: "Tester", studentEmail: "tester@example.com" };
const pass = { id: "original-pass", credits_remaining: 0, total_credits: 4, used_credits: 4, session_length_minutes: 70, status: "exhausted", expires_at: null, booking_url: "https://lsatprep.study/book/original" };

beforeEach(() => { vi.clearAllMocks(); });
describe("StudentBookingPanel credits", () => {
  it("adds one atomically to the existing exhausted pass without replacing its link", async () => {
    mocks.invoke.mockResolvedValue({ data: { pass }, error: null });
    render(<StudentBookingPanel {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Add 1 session" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("booking-pass-admin", { body: { action: "add_credits", pass_id: "original-pass", credits: 1 } }));
    expect(mocks.invoke.mock.calls.some(([, args]) => args.body.action === "create")).toBe(false);
  });
  it("grants the selected number instead of a hidden five-session default", async () => {
    mocks.invoke.mockResolvedValue({ data: { pass: null }, error: null });
    render(<StudentBookingPanel {...props} />);
    fireEvent.change(await screen.findByRole("spinbutton", { name: "Sessions to grant" }), { target: { value: "4" } });
    fireEvent.click(screen.getByRole("button", { name: "Grant booking access" }));
    await waitFor(() => expect(mocks.invoke).toHaveBeenCalledWith("booking-pass-admin", { body: { action: "create", student_id: "tester", student_name: "Tester", student_email: "tester@example.com", total_credits: 4, session_length_minutes: 70, expires_at: null } }));
  });
  it("reports a failed credit addition without claiming it succeeded", async () => {
    mocks.invoke.mockImplementation((_name, { body }) => Promise.resolve(body.action === "add_credits"
      ? { data: null, error: new Error("Credit service unavailable") }
      : { data: { pass }, error: null }));
    render(<StudentBookingPanel {...props} />);
    fireEvent.click(await screen.findByRole("button", { name: "Add 1 session" }));
    await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Credit service unavailable"));
    expect(mocks.success).not.toHaveBeenCalled();
  });
  it("does not offer a new pass when the existing-pass lookup fails", async () => {
    mocks.invoke.mockResolvedValue({ data: null, error: new Error("Lookup failed") });
    render(<StudentBookingPanel {...props} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("Lookup failed");
    expect(screen.queryByRole("button", { name: "Grant booking access" })).not.toBeInTheDocument();
  });
});
