import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import OfficialQuestionPane from "./OfficialQuestionPane";
import StudyAidsControls from "./StudyAidsControls";
import { useQuestionHighlights } from "@/hooks/useQuestionHighlights";
import type { Highlight } from "@/lib/highlightUtils";
import * as React from "react";
import DrillActorScope from "@/components/drill/DrillActorScope";
import { useQuestionStudyTools } from "@/hooks/useQuestionStudyTools";
import {
  eliminationsFor,
  loadStudyTools,
  setEliminations,
  setHighlights,
  type StudyStorage,
} from "@/lib/questionStudyTools";

const question = {
  qid: "PT156-S2-Q1",
  qnum: 1,
  stimulus: "Stimulus text.",
  questionStem: "Which one of the following?",
  answerChoices: { A: "Alpha choice.", B: "Bravo choice.", C: "Charlie choice." },
};

function pane(props: Partial<React.ComponentProps<typeof OfficialQuestionPane>> = {}) {
  const onAnswerSelect = vi.fn();
  const onEliminate = vi.fn();
  render(
    <OfficialQuestionPane
      question={question}
      displayNumber={1}
      selectedAnswer="B"
      eliminatedAnswers={new Set(["C"])}
      isFlagged={false}
      highlights={[]}
      highlightMode="none"
      onAnswerSelect={onAnswerSelect}
      onEliminate={onEliminate}
      onToggleFlag={vi.fn()}
      onTextSelection={vi.fn()}
      onHighlightClick={vi.fn()}
      {...props}
    />,
  );
  return { onAnswerSelect, onEliminate };
}

describe("cross-outs never change the answer", () => {
  it("a saved cross-out cannot hide or lock the currently selected answer", () => {
    const { onEliminate, onAnswerSelect } = pane({ selectedAnswer: "A", eliminatedAnswers: new Set(["A"]) });
    const text = screen.getByText("Alpha choice.");
    expect(text).toBeVisible();
    expect(text.closest("li")).not.toHaveClass("opacity-55");
    const selectedChoice = screen.getByRole("button", { name: "A" });
    expect(selectedChoice).toBeEnabled();
    const crossOut = screen.getByRole("button", { name: "Choice A is your answer and cannot be crossed out" });
    expect(crossOut).toBeDisabled();
    fireEvent.click(crossOut);
    expect(onEliminate).not.toHaveBeenCalled();
    expect(onAnswerSelect).not.toHaveBeenCalled();
    fireEvent.click(selectedChoice);
    expect(onAnswerSelect).toHaveBeenCalledWith("A");
  });
  it("the chosen letter cannot be crossed out, and says why", () => {
    const { onEliminate, onAnswerSelect } = pane();
    const blocked = screen.getByRole("button", { name: "Choice B is your answer and cannot be crossed out" });
    expect(blocked).toBeDisabled();
    fireEvent.click(blocked);
    expect(onEliminate).not.toHaveBeenCalled();
    expect(onAnswerSelect).not.toHaveBeenCalled();
  });

  it("another letter crosses out and restores without picking anything", () => {
    const { onEliminate, onAnswerSelect } = pane();
    fireEvent.click(screen.getByRole("button", { name: "Cross out choice A" }));
    fireEvent.click(screen.getByRole("button", { name: "Restore choice C" }));
    expect(onEliminate.mock.calls).toEqual([["A"], ["C"]]);
    expect(onAnswerSelect).not.toHaveBeenCalled();
  });
});

describe("study aids controls", () => {
  const base = {
    bookmarked: false,
    onToggleBookmark: vi.fn(),
    bookmarks: [],
    onRemoveBookmark: vi.fn(),
    hasMarks: false,
    deviceSaved: true,
  };

  it("bookmark toggle is a labelled pressed-state button", () => {
    const onToggleBookmark = vi.fn();
    const { rerender } = render(<StudyAidsControls {...base} onToggleBookmark={onToggleBookmark} />);
    const toggle = screen.getByRole("button", { name: "Bookmark question" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(toggle);
    expect(onToggleBookmark).toHaveBeenCalledTimes(1);
    rerender(<StudyAidsControls {...base} bookmarked />);
    expect(screen.getByRole("button", { name: "Remove bookmark" })).toHaveAttribute("aria-pressed", "true");
  });

  it("says plainly when the device could not save", () => {
    render(<StudyAidsControls {...base} deviceSaved={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Marks not saved");
  });

  it("RC clear names only cross-outs and invokes only its explicit callback", () => {
    const clear = vi.fn();
    render(<StudyAidsControls {...base} hasMarks onClearMarks={clear} clearMarksLabel="Clear cross-outs on this question" bookmarkNavigationNotice="Bookmarks open a new practice session in another tab." />);
    fireEvent.click(screen.getByRole("button", { name: "Bookmarks and study marks" }));
    fireEvent.click(screen.getByRole("button", { name: "Clear cross-outs on this question" }));
    expect(clear).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("button", { name: /Clear cross-outs and highlights/ })).not.toBeInTheDocument();
    expect(screen.getByText("Bookmarks open a new practice session in another tab.")).toBeInTheDocument();
  });
});

describe("switching account inside a mounted runner", () => {
  // Stands in for DrillContent: in-memory cross-outs and highlights with undo,
  // plus the per-actor store, exactly the state the runner holds.
  function Runner({ actorId, storage }: { actorId: string; storage: StudyStorage }) {
    const tools = useQuestionStudyTools(actorId, storage);
    const [crossed, setCrossed] = React.useState<string[]>([]);
    const marks = useQuestionHighlights({
      onChange: (qid, next) => tools.update((s) => setHighlights(s, { family: "lr", id: qid }, next)),
    });
    return (
      <div>
        <span data-testid="crossed">{crossed.join(",")}</span>
        <span data-testid="marks">{marks.highlightsFor("q1").length}</span>
        <span data-testid="undo">{String(marks.canUndo)}</span>
        <button
          onClick={() => {
            setCrossed(["A"]);
            tools.update((s) => setEliminations(s, { family: "lr", id: "q1" }, ["A"]));
            marks.seed("q1", [{ id: "h", start: 0, end: 1, text: "S", color: "pink", section: "stimulus" }]);
          }}
        >
          mark
        </button>
      </div>
    );
  }

  it("drops account A's marks and undo before account B can see or save them", () => {
    const data: Record<string, string> = {};
    const storage: StudyStorage = { getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
    const view = (actor: string) => (
      <DrillActorScope actorId={actor}>
        <Runner actorId={actor} storage={storage} />
      </DrillActorScope>
    );
    const { rerender } = render(view("student-a"));
    fireEvent.click(screen.getByText("mark"));
    expect(screen.getByTestId("crossed")).toHaveTextContent("A");
    expect(screen.getByTestId("marks")).toHaveTextContent("1");

    rerender(view("teacher-b"));
    expect(screen.getByTestId("crossed")).toHaveTextContent("");
    expect(screen.getByTestId("marks")).toHaveTextContent("0");
    expect(screen.getByTestId("undo")).toHaveTextContent("false");
    expect(eliminationsFor(loadStudyTools("teacher-b", storage).state, { family: "lr", id: "q1" })).toEqual([]);
    expect(eliminationsFor(loadStudyTools("student-a", storage).state, { family: "lr", id: "q1" })).toEqual(["A"]);
  });
});

describe("useQuestionHighlights persistence hooks", () => {
  const saved: Highlight = { id: "s1", start: 0, end: 4, text: "Stim", color: "yellow", section: "stimulus" };

  it("seeding restores without reporting a change or adding undo history", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useQuestionHighlights({ onChange }));
    act(() => result.current.seed("q1", [saved]));
    expect(result.current.highlightsFor("q1")).toEqual([saved]);
    expect(result.current.canUndo).toBe(false);
    expect(onChange).not.toHaveBeenCalled();
  });

  it("clearing one question reports only that question, and undo brings it back", () => {
    const onChange = vi.fn();
    const { result } = renderHook(() => useQuestionHighlights({ onChange }));
    act(() => {
      result.current.seed("q1", [saved]);
      result.current.seed("q2", [{ ...saved, id: "s2" }]);
    });
    act(() => result.current.clearQuestion("q1"));
    expect(onChange.mock.calls).toEqual([["q1", []]]);
    expect(result.current.highlightsFor("q2")).toHaveLength(1);
    act(() => result.current.undo());
    expect(onChange).toHaveBeenLastCalledWith("q1", [saved]);
    expect(result.current.highlightsFor("q1")).toEqual([saved]);
  });
});
