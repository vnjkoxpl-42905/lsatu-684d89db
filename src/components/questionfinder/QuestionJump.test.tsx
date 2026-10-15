import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import QuestionJump from "./QuestionJump";

vi.mock("./useQuestionFinderBanks", () => ({
  useQuestionFinderBanks: () => ({ loading: false, error: null, lrFailed: false, rcFailed: false, lr: [], rcPassages: [], rcQuestions: [], retry: vi.fn() }),
}));
vi.mock("./useFinderAddressIndex", () => ({
  useFinderAddressIndex: () => ({ tests: [], loading: false, failed: false, retry: vi.fn() }),
}));

describe("QuestionJump shared finder entry", () => {
  it("opens the same question finder under the compact landing-page label", () => {
    render(<MemoryRouter><QuestionJump returnTo="/classroom" bank="rc" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Open a question" }));
    expect(screen.getByRole("dialog", { name: "Find a question" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Open question" })).toBeDisabled();
  });
});
