import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UnlessDrill, buildRound } from "./UnlessDrill";
import UnlessDrillPage from "@/pages/UnlessDrillPage";

// Mock useAuth and useBootcampProgress to avoid external query client requirements in component test
vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "test-user-id" }, authReady: true }),
}));

vi.mock("@/hooks/useBootcampProgress", () => ({
  useBootcampProgress: vi.fn(),
}));

afterEach(cleanup);

describe("UnlessDrill", () => {
  it("buildRound returns 3 rounds with patterns and letters", () => {
    const rounds = buildRound();
    expect(rounds).toHaveLength(3);
    for (const r of rounds) {
      expect([1, 2, 3, 4]).toContain(r.pattern);
      expect(r.x).toBeDefined();
      expect(r.y).toBeDefined();
    }
  });

  it("renders idle phase with instructions and start button", () => {
    render(<UnlessDrill />);
    expect(
      screen.getByText("Three unless statements. Five seconds each, no stopping.")
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "The arrow is fixed. You only choose which idea goes left and which goes right. Feedback comes after all three."
      )
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start round" })).toBeInTheDocument();
  });

  it("transitions to running phase on clicking start", () => {
    render(<UnlessDrill />);
    fireEvent.click(screen.getByRole("button", { name: "Start round" }));

    expect(screen.getByText(/Statement 1 of 3/)).toBeInTheDocument();
    expect(screen.getByText("GO")).toBeInTheDocument();

    // Verify left and right option buttons are present
    const leftButtons = screen.getAllByRole("button", { name: /^Left:/ });
    const rightButtons = screen.getAllByRole("button", { name: /^Right:/ });
    expect(leftButtons.length).toBeGreaterThan(0);
    expect(rightButtons.length).toBeGreaterThan(0);
  });
});

describe("UnlessDrillPage", () => {
  it("renders standalone page with heading, badge, back link, and drill", () => {
    render(
      <MemoryRouter initialEntries={["/unless-drill?returnTo=/classroom"]}>
        <UnlessDrillPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { level: 1, name: "Unless drill" })).toBeInTheDocument();
    expect(screen.getByText("Group 3 · Negate Sufficient")).toBeInTheDocument();
    expect(screen.getByText("Back to classroom")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Start round" })).toBeInTheDocument();
  });
});
