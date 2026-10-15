import * as React from "react";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { IntroLrAttempt } from "@/components/review/introLrReviewSource";
import IntroLrReviewDetail from "./IntroLrReviewDetail";

const { fetchOwnedIntroLrAttempt, logIntroLrAttempt } = vi.hoisted(() => ({ fetchOwnedIntroLrAttempt: vi.fn(), logIntroLrAttempt: vi.fn() }));
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: "student-1" } }) }));
vi.mock("@/components/review/introLrReviewSource", async (importOriginal) => ({
  ...await importOriginal<typeof import("@/components/review/introLrReviewSource")>(),
  fetchOwnedIntroLrAttempt,
}));
vi.mock("@/bootcamps/main-conclusion/lib/attemptLogger", () => ({ logIntroLrAttempt }));

const row = {
  id: "attempt-1", user_id: "student-1", drill_id: "MC-DRL-3.3", question_id: "D33-S1-Q1",
  mode: "first_sentence_check", selected_answer: "false", correct: false,
  time_ms: null, created_at: "2026-09-28T12:00:00Z",
} as IntroLrAttempt;

function renderDetail() {
  render(<MemoryRouter initialEntries={["/review/intro-lr/attempt-1?returnTo=%2Freview%2Fto-review%3Freason%3Dmissed"]}>
    <Routes><Route path="/review/intro-lr/:attemptId" element={<IntroLrReviewDetail />} /></Routes>
  </MemoryRouter>);
}

beforeEach(() => {
  fetchOwnedIntroLrAttempt.mockReset().mockResolvedValue(row);
  logIntroLrAttempt.mockReset();
});

describe("Intro to LR saved review detail", () => {
  it("renders authored reasoning and this saved answer without logging a new attempt", async () => {
    renderDetail();
    expect(await screen.findByText("No, the conclusion was not the first sentence")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "How to reason through it" })).toBeInTheDocument();
    expect(fetchOwnedIntroLrAttempt).toHaveBeenCalledWith("student-1", "attempt-1");
    expect(logIntroLrAttempt).not.toHaveBeenCalled();
  });

  it("does not display authored answers when the owned attempt is absent", async () => {
    fetchOwnedIntroLrAttempt.mockResolvedValue(null);
    renderDetail();
    expect(await screen.findByText(/not available for review in your account/)).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "How to reason through it" })).not.toBeInTheDocument();
  });
});
