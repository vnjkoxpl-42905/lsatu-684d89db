import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NotificationsList } from "./NotificationsList";
import type { Notification } from "@/hooks/useNotifications";

const pendingSignup: Notification = {
  id: "n1",
  user_id: "admin-1",
  type: "signup",
  title: "New signup",
  body: "Priyanka Nambiar just signed up and is waiting for access.",
  link: "/admin",
  read: false,
  created_at: new Date().toISOString(),
  subject_class_id: "class-9",
  status: "pending",
};

const handledSignup: Notification = {
  ...pendingSignup,
  id: "n2",
  read: true,
  status: "approved",
};

const plainMessage: Notification = {
  id: "n3",
  user_id: "admin-1",
  type: "message",
  title: "New message",
  body: "Lexi sent you a message.",
  link: "/inbox",
  read: false,
  created_at: new Date().toISOString(),
};

function renderList(
  notifications: Notification[],
  overrides: Partial<React.ComponentProps<typeof NotificationsList>> = {}
) {
  const onApproveSignup = vi.fn();
  const onDismissSignup = vi.fn();
  const onNotificationClick = vi.fn();
  render(
    <NotificationsList
      notifications={notifications}
      unreadCount={notifications.filter((n) => !n.read).length}
      onNotificationClick={onNotificationClick}
      onApproveSignup={onApproveSignup}
      onDismissSignup={onDismissSignup}
      {...overrides}
    />
  );
  return { onApproveSignup, onDismissSignup, onNotificationClick };
}

describe("NotificationsList signup approval", () => {
  it("labels the approve and dismiss controls with the person's name", () => {
    renderList([pendingSignup]);
    expect(
      screen.getByRole("button", { name: "Approve access for Priyanka Nambiar" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Dismiss the signup from Priyanka Nambiar" })
    ).toBeInTheDocument();
  });

  it("calls approve with the notification, without triggering the row navigation", () => {
    const { onApproveSignup, onNotificationClick } = renderList([pendingSignup]);
    fireEvent.click(
      screen.getByRole("button", { name: "Approve access for Priyanka Nambiar" })
    );
    expect(onApproveSignup).toHaveBeenCalledWith(pendingSignup);
    expect(onNotificationClick).not.toHaveBeenCalled();
  });

  it("calls dismiss with the notification", () => {
    const { onDismissSignup } = renderList([pendingSignup]);
    fireEvent.click(
      screen.getByRole("button", { name: "Dismiss the signup from Priyanka Nambiar" })
    );
    expect(onDismissSignup).toHaveBeenCalledWith(pendingSignup);
  });

  it("shows no controls once the signup has been handled", () => {
    renderList([handledSignup]);
    expect(screen.queryByRole("button", { name: /Approve access/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Dismiss the signup/ })).toBeNull();
  });

  it("shows no controls on non-signup notifications", () => {
    renderList([plainMessage]);
    expect(screen.queryByRole("button", { name: /Approve access/ })).toBeNull();
  });

  // A student gets no approve/dismiss handlers, which is what keeps the
  // privilege escalation off their screen entirely.
  it("shows no controls when the viewer is not an admin", () => {
    renderList([pendingSignup], {
      onApproveSignup: undefined,
      onDismissSignup: undefined,
    });
    expect(screen.queryByRole("button", { name: /Approve access/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Dismiss the signup/ })).toBeNull();
  });

  it("disables both controls while an action is in flight", () => {
    renderList([pendingSignup], { busySignupId: "n1" });
    expect(
      screen.getByRole("button", { name: "Approve access for Priyanka Nambiar" })
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Dismiss the signup from Priyanka Nambiar" })
    ).toBeDisabled();
  });
});
