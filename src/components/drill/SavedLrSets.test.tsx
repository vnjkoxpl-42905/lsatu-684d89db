import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SavedLrSets } from "./SavedLrSets";

const state = vi.hoisted(() => ({
  userId: "student-1",
  sets: [] as Array<{ id: string; user_id: string; name: string; question_ids: string[]; created_at: string }>,
  recordExposures: vi.fn(),
  rename: vi.fn(),
  duplicate: vi.fn(),
  remove: vi.fn(),
}));

vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: { id: state.userId } }) }));
vi.mock("@/contexts/QuestionBankContext", () => ({ useQuestionBank: () => ({ isLoading: false, error: null }) }));
vi.mock("@/hooks/useSavedSets", () => ({
  useSavedSets: () => ({
    sets: state.sets,
    isLoading: false,
    remove: { mutateAsync: state.remove },
    duplicate: { mutateAsync: state.duplicate },
    rename: { mutateAsync: state.rename },
  }),
}));
vi.mock("@/lib/questionLoader", () => ({
  questionBank: {
    getQuestion: (qid: string) => qid === "PT70-S1-Q1" ? {
      qid, pt: 70, section: 1, qnum: 1, qtype: "Strengthen",
      stimulus: "The city planted trees near every school.",
      questionStem: "Which choice most strengthens the claim?",
      answerChoices: { A: "Trees can cool a schoolyard.", B: "The schools have libraries.", C: "The city opened a park.", D: "Some trees are old.", E: "Teachers use the schoolyard." },
    } : undefined,
  },
}));
vi.mock("@/lib/questionExposure", () => ({ recordExposures: state.recordExposures }));

function Location() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

const oneSet = () => [{ id: "set-1", user_id: "student-1", name: "Causal reasoning", question_ids: ["PT70-S1-Q1", "PT70-S1-Q2"], created_at: "2026-09-28T12:00:00Z" }];
const mount = (initial = "/practice/drills?view=saved") => render(<MemoryRouter initialEntries={[initial]}><SavedLrSets /><Location /></MemoryRouter>);
const openMenu = (name: string) => fireEvent.click(screen.getByRole("button", { name: `More actions for ${name}` }));

describe("Saved LR sets", () => {
  beforeEach(() => {
    state.userId = "student-1";
    state.sets = oneSet();
    for (const fn of [state.recordExposures, state.rename, state.duplicate, state.remove]) { fn.mockReset(); fn.mockResolvedValue(undefined); }
  });

  it("shows a set as a name, a type, a detail line and one main button", () => {
    mount();
    const row = screen.getByText("Causal reasoning").closest("li")!;
    expect(within(row).getByText("Exact questions")).toBeInTheDocument();
    expect(within(row).getByText("2 questions")).toBeInTheDocument();
    expect(within(row).getByRole("button", { name: "Start drill Causal reasoning" })).toBeInTheDocument();
    expect(screen.getByText("1 saved set")).toBeInTheDocument();
    // Rename, Duplicate and Delete stay out of sight until the menu is opened.
    expect(screen.queryByRole("button", { name: "Rename Causal reasoning" })).not.toBeInTheDocument();
  });

  it("shows the stored questions in order without launching or writing practice data", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "View questions in Causal reasoning" }));
    const dialog = screen.getByRole("dialog", { name: "Causal reasoning" });
    expect(within(dialog).getByText("PT 70 · Section 1 · Question 1")).toBeInTheDocument();
    expect(within(dialog).getByText("Question 2 · Unavailable")).toBeInTheDocument();
    expect(within(dialog).queryByText(/PT70-S1-Q2/)).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByText("Question 1 · Strengthen"));
    expect(within(dialog).getByText("The city planted trees near every school.")).toBeInTheDocument();
    expect(within(dialog).getByText("Trees can cool a schoolyard.")).toBeInTheDocument();
    expect(screen.getByTestId("location")).toHaveTextContent("/practice/drills?view=saved");
    expect(state.recordExposures).not.toHaveBeenCalled();
    expect(state.rename).not.toHaveBeenCalled();
  });

  it("keeps the question preview unavailable for a set owned by another account", () => {
    state.userId = "student-2";
    mount();
    expect(screen.getByRole("button", { name: "View questions in Causal reasoning" })).toBeDisabled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("starts the drill from the set's id", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: "Start drill Causal reasoning" }));
    expect(state.recordExposures).toHaveBeenCalledWith("student-1", ["PT70-S1-Q1", "PT70-S1-Q2"]);
    expect(screen.getByTestId("location")).toHaveTextContent("/drill?");
  });

  it("renames from the row's menu, and Escape closes the menu", async () => {
    mount();
    openMenu("Causal reasoning");
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    openMenu("Causal reasoning");
    fireEvent.click(screen.getByRole("menuitem", { name: "Rename Causal reasoning" }));
    fireEvent.change(screen.getByRole("textbox", { name: "New name for Causal reasoning" }), { target: { value: "Flaw sets" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(state.rename).toHaveBeenCalledWith({ setId: "set-1", newName: "Flaw sets" }));
  });

  it("duplicates from the menu and asks before deleting", async () => {
    mount();
    openMenu("Causal reasoning");
    fireEvent.click(screen.getByRole("menuitem", { name: "Duplicate Causal reasoning" }));
    await waitFor(() => expect(state.duplicate).toHaveBeenCalledWith("set-1"));
    openMenu("Causal reasoning");
    fireEvent.click(screen.getByRole("menuitem", { name: "Delete Causal reasoning" }));
    expect(state.remove).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    await waitFor(() => expect(state.remove).toHaveBeenCalledWith("set-1"));
  });

  it("says so, and points at building a drill, when nothing is saved", () => {
    state.sets = [];
    mount();
    expect(screen.getByText("No saved LR sets yet")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Build a drill" }));
    expect(screen.getByTestId("location")).toHaveTextContent("/practice/drills?view=create&section=lr");
  });
});
