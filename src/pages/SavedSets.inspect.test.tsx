import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SavedSets from "./SavedSets";

const state = vi.hoisted(() => ({
  userId: "student-1",
  recordExposures: vi.fn(),
  mutate: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: state.userId } }),
}));
vi.mock("@/contexts/QuestionBankContext", () => ({
  useQuestionBank: () => ({ isLoading: false, error: null }),
}));
vi.mock("@/hooks/useSavedSets", () => ({
  useSavedSets: () => ({
    sets: [{
      id: "set-1",
      user_id: "student-1",
      name: "Causal reasoning",
      question_ids: ["PT70-S1-Q1", "PT70-S1-Q2"],
      created_at: "2026-09-28T00:00:00Z",
    }],
    isLoading: false,
    remove: { mutateAsync: state.mutate },
    duplicate: { mutateAsync: state.mutate },
    rename: { mutateAsync: state.mutate },
  }),
}));
vi.mock("@/lib/questionLoader", () => ({
  questionBank: {
    getQuestion: (qid: string) => qid === "PT70-S1-Q1" ? {
      qid,
      pt: 70,
      section: 1,
      qnum: 1,
      qtype: "Strengthen",
      stimulus: "The city planted trees near every school.",
      questionStem: "Which choice most strengthens the claim?",
      answerChoices: {
        A: "Trees can cool a schoolyard.",
        B: "The schools have libraries.",
        C: "The city opened a park.",
        D: "Some trees are old.",
        E: "Teachers use the schoolyard.",
      },
    } : undefined,
  },
}));
vi.mock("@/lib/questionExposure", () => ({ recordExposures: state.recordExposures }));

function Location() {
  const { pathname } = useLocation();
  return <output data-testid="location">{pathname}</output>;
}

describe("Saved Sets Inspect", () => {
  beforeEach(() => {
    state.userId = "student-1";
    state.recordExposures.mockClear();
    state.mutate.mockClear();
  });

  it("shows the stored questions in order without launching or writing practice data", () => {
    render(<MemoryRouter initialEntries={["/practice/sets"]}><SavedSets /><Location /></MemoryRouter>);

    fireEvent.click(screen.getByRole("button", { name: "Inspect" }));
    const dialog = screen.getByRole("dialog", { name: "Inspect Causal reasoning" });
    expect(within(dialog).getByText(/1\. PT70 · S1 · Q1/)).toBeInTheDocument();
    expect(within(dialog).getByText(/2\. PT70-S1-Q2 · unavailable/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByText(/1\. PT70 · S1 · Q1/));
    expect(within(dialog).getByText("The city planted trees near every school.")).toBeInTheDocument();
    expect(within(dialog).getByText("Trees can cool a schoolyard.")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/practice/sets");
    expect(state.recordExposures).not.toHaveBeenCalled();
    expect(state.mutate).not.toHaveBeenCalled();
  });

  it("keeps Inspect unavailable for a set owned by another account", () => {
    state.userId = "student-2";
    render(<MemoryRouter><SavedSets /></MemoryRouter>);
    expect(screen.getByRole("button", { name: "Inspect" })).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
