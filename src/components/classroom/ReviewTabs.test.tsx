import * as React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ReviewTabs, reviewDefaultPath } from "@/components/classroom/ReviewTabs";

const permissionState = vi.hoisted(() => ({
  is_admin: false,
  has_journal_access: true,
  has_waj_access: false,
  has_flagged_access: true,
}));

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => permissionState,
}));

function LocationProbe() {
  const location = useLocation();
  return <output aria-label="Current path">{location.pathname}</output>;
}

function renderTabs(path = "/journal") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <ReviewTabs />
      <LocationProbe />
    </MemoryRouter>,
  );
}

describe("ReviewTabs", () => {
  beforeEach(() => {
    Object.assign(permissionState, {
      is_admin: false,
      has_journal_access: true,
      has_waj_access: false,
      has_flagged_access: true,
    });
  });

  it("reflects deep links and switches the URL", () => {
    renderTabs("/journal/PT-1-S1-Q1");

    expect(screen.getByRole("tab", { name: "Wrong answers" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    fireEvent.click(screen.getByRole("tab", { name: "Flagged" }));
    expect(screen.getByLabelText("Current path")).toHaveTextContent("/flagged");
  });

  it("does not expose a review feature the student cannot access", () => {
    permissionState.has_journal_access = false;
    permissionState.has_flagged_access = true;

    renderTabs("/flagged/PT-1-S1-Q1");

    expect(screen.queryByRole("tab", { name: "Wrong answers" })).not.toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Flagged" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });
});

describe("reviewDefaultPath", () => {
  it("opens Wrong answers when authorized and otherwise falls back to Flagged", () => {
    expect(
      reviewDefaultPath({
        is_admin: false,
        has_journal_access: true,
        has_flagged_access: true,
      }),
    ).toBe("/journal");
    expect(
      reviewDefaultPath({
        ...permissionState,
        has_journal_access: false,
        has_flagged_access: true,
      }),
    ).toBe("/flagged");
  });
});