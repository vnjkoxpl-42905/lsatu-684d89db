import React from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
const permissions = vi.hoisted(() => ({ loading: false, is_admin: false, has_classroom_access: false, has_analytics_access: false }));
vi.mock("@/hooks/useUserPermissions", () => ({ useUserPermissions: () => permissions }));
import { StudentDestination } from "./StudentDestination";
afterEach(cleanup);
describe("visible locked destination sections", () => {
  it.each([
    ["my-work", "/my-work/to-do", "My Work sections", ["To do", "Completed", "Notes & recaps"]],
    ["progress", "/progress/overview", "Progress sections", ["Overview", "History", "Topics"]],
  ] as const)("keeps %s sections visible while access is locked", (destination, path, label, tabs) => {
    render(<MemoryRouter initialEntries={[path]}><Routes><Route path="/*" element={<StudentDestination destination={destination} />} /></Routes></MemoryRouter>);
    const nav = screen.getByRole("navigation", { name: label });
    for (const tab of tabs) {
      const item = screen.getByText(tab);
      expect(nav).toContainElement(item);
      expect(item).toHaveAttribute("aria-disabled", "true");
    }
    expect(screen.queryByRole("link")).toBeNull();
  });
  it("distinguishes checking access from a confirmed lock", () => {
    permissions.loading = true;
    render(<MemoryRouter initialEntries={["/progress/overview"]}><StudentDestination destination="progress" /></MemoryRouter>);
    expect(screen.getByRole("navigation")).toHaveAttribute("aria-busy", "true");
    expect(screen.getByText("Overview")).toHaveAttribute("title", "Checking access");
    permissions.loading = false;
  });
  it("restores real links for an authorized account", () => {
    permissions.has_analytics_access = true;
    render(<MemoryRouter initialEntries={["/progress/overview"]}><StudentDestination destination="progress" /></MemoryRouter>);
    expect(screen.getByRole("link", { name: "Overview" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "History" })).toHaveAttribute("href", "/progress/history");
    permissions.has_analytics_access = false;
  });
});
