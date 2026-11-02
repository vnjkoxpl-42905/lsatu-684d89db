import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { motionValue } from "framer-motion";
import NotificationBell from "./NotificationBell";

vi.mock("@/hooks/useNotifications", () => ({
  useNotifications: () => ({
    notifications: [],
    unreadCount: 1,
    markRead: vi.fn(),
    markAllRead: vi.fn(),
    approveSignup: vi.fn(),
    dismissSignup: vi.fn(),
  }),
}));
vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({ is_admin: false }),
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));

describe("NotificationBell", () => {
  it("does not take focus back after the panel closes", async () => {
    render(
      <MemoryRouter>
        <NotificationBell mouseX={motionValue(0)} quiet />
      </MemoryRouter>
    );
    const bell = screen.getByRole("button", { name: /notifications/i });
    fireEvent.click(bell);
    await screen.findByText("No notifications yet");

    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByText("No notifications yet")).not.toBeInTheDocument()
    );
    expect(bell).not.toHaveFocus();
  });
});
