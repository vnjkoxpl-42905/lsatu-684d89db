import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DrillHistoryRow } from "./DrillHistoryRow";
import type { StandaloneDrillHistoryItem } from "@/lib/standaloneDrillHistory";

const base: StandaloneDrillHistoryItem = {
  key: "lr:1", section: "lr", title: "Custom drill", detail: "10 of 10 answered", date: "2026-10-17T12:00:00.000Z",
  status: "completed", continueTo: "/c", resultsTo: "/r", reviewTo: "/v",
};

const renderRow = (run: StandaloneDrillHistoryItem, completed: boolean) =>
  render(<ul><DrillHistoryRow run={run} completed={completed}><button>Act</button></DrillHistoryRow></ul>);

describe("DrillHistoryRow", () => {
  it("shows a finished drill with misses as needing review, with its accuracy", () => {
    renderRow({ ...base, score: { correct: 7, total: 10 } }, true);
    expect(screen.getByText("Completed")).toBeInTheDocument();
    expect(screen.getByText("3 to review")).toBeInTheDocument();
    expect(screen.getByText("7 of 10 correct")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "70 percent correct, 7 of 10" })).toBeInTheDocument();
  });

  it("shows a clean finished drill as having nothing to review", () => {
    renderRow({ ...base, score: { correct: 10, total: 10 } }, true);
    expect(screen.getByText("Nothing to review")).toBeInTheDocument();
    expect(screen.queryByText(/^\d+ to review$/)).not.toBeInTheDocument();
  });

  it("does not claim a score or a review state for an RC drill whose results are hidden", () => {
    renderRow({ ...base, section: "rc", detail: "Completed · results hidden until you reveal them" }, true);
    expect(screen.getByText("Results stay hidden until you reveal them")).toBeInTheDocument();
    expect(screen.getByText("Reveal results to see what to review")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("marks an open drill as in progress, with no score and no review state", () => {
    const { container } = renderRow({ ...base, status: "in_progress", detail: "3 of 10 answered", score: { correct: 1, total: 3 } }, false);
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("3 of 10 answered")).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
    expect(screen.queryByText(/review/i)).not.toBeInTheDocument();
    expect(container.querySelector(".dh-pulse")).not.toBeNull();
  });
});
