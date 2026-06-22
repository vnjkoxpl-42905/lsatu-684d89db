import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import MainhubSidebar from "./MainhubSidebar";

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => ({
    is_admin: false,
    has_classroom_access: true,
    has_bootcamp_access: true,
    has_chat_access: true,
    has_practice_access: true,
    has_activity_access: true,
    has_schedule_access: true,
  }),
}));

vi.mock("@/hooks/useLayoutPrefs", () => ({
  useLayoutPrefs: () => ({
    prefs: {
      sidebar: ["/classroom", "/bootcamps", "/inbox", "/practice", "/activities", "/schedule"],
    },
  }),
}));

describe("MainhubSidebar", () => {
  it("uses the in-page Practice Hub handler when provided", () => {
    const onPracticeHubClick = vi.fn();

    render(
      <MemoryRouter initialEntries={["/mainhub"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <MainhubSidebar onPracticeHubClick={onPracticeHubClick} />
      </MemoryRouter>,
    );

    const practiceHub = screen.getByRole("button", { name: /Practice Hub/i });
    fireEvent.click(practiceHub);

    expect(onPracticeHubClick).toHaveBeenCalledTimes(1);
    expect(practiceHub.closest("a")).toBeNull();
  });

  it("keeps Practice Hub as a normal route link without the in-page handler", () => {
    render(
      <MemoryRouter initialEntries={["/classroom"]} future={{ v7_relativeSplatPath: true, v7_startTransition: true }}>
        <MainhubSidebar />
      </MemoryRouter>,
    );

    expect(screen.getByRole("link", { name: /Practice Hub/i })).toHaveAttribute("href", "/practice");
  });
});
