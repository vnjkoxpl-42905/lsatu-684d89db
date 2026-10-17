import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ProfilePage from "./ProfilePage";
vi.mock("../components/AppShell", () => ({ TopBar: () => <div>Reading Center navigation</div> }));
vi.mock("../components/LrRecallProgress", () => ({ LrRecallProgress: () => <p>Detailed LR history</p> }));
vi.mock("../components/RcTrainingProgress", () => ({ RcTrainingProgress: () => <p>Detailed RC history</p> }));
vi.mock("../hooks/useReadingCenterData", () => ({
  usePreferences: () => ({ data: undefined, isLoading: false }),
  useSavePreferences: () => ({ mutate: vi.fn() }),
  useReadingProfile: () => ({ data: "Celia", isLoading: false }),
  useSessions: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
  usePassages: () => ({ data: [] }),
}));
function Location() { return <output data-testid="url">{useLocation().search}</output>; }
const setup = (path = "/reading-center/profile") => render(<MemoryRouter initialEntries={[path]}><ProfilePage /><Location /></MemoryRouter>);
describe("Reading Progress activity selection", () => {
  it("opens LR history by default and switches to the preserved Speed Reading charts", () => {
    setup();
    expect(screen.getByRole("tab", { name: "LR Recall" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Detailed LR history")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Speed Reading" }));
    expect(screen.getByRole("button", { name: "Overview" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Charts" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Options/ })).toBeInTheDocument();
    expect(screen.queryByText("Detailed LR history")).not.toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("activity=speed-reading");
  });
  it("includes RC Training between LR Recall and Speed Reading, without mixing in LR grading", () => {
    setup();
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["LR Recall", "RC Training", "Speed Reading"]);
    fireEvent.click(screen.getByRole("tab", { name: "RC Training" }));
    expect(screen.getByText("Detailed RC history")).toBeInTheDocument();
    expect(screen.queryByText("Detailed LR history")).not.toBeInTheDocument();
    expect(screen.getByTestId("url")).toHaveTextContent("activity=rc-training");
  });
  it("honours direct links and supports arrow, home and end tab navigation", () => {
    setup("/reading-center/profile?activity=speed-reading&from=dashboard");
    const lr = screen.getByRole("tab", { name: "LR Recall" });
    const rc = screen.getByRole("tab", { name: "RC Training" });
    const speed = screen.getByRole("tab", { name: "Speed Reading" });
    expect(speed).toHaveAttribute("tabindex", "0");
    fireEvent.keyDown(speed, { key: "ArrowLeft" });
    expect(rc).toHaveFocus();
    expect(rc).toHaveAttribute("aria-selected", "true");
    expect(screen.getByTestId("url")).toHaveTextContent("from=dashboard");
    fireEvent.keyDown(rc, { key: "End" });
    expect(speed).toHaveFocus();
    expect(speed).toHaveAttribute("aria-selected", "true");
    fireEvent.keyDown(speed, { key: "Home" });
    expect(lr).toHaveFocus();
    fireEvent.keyDown(lr, { key: "ArrowRight" });
    expect(rc).toHaveFocus();
  });
});
