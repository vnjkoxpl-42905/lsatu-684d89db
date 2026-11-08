import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ComponentProps } from "react";
import { describe, expect, it, vi } from "vitest";
import AnalyticsQuestionReview from "./AnalyticsQuestionReview";

// The walk and the RC panes are the real exam screens and have their own tests;
// here we prove Analytics hands them the saved first answer and nothing editable.
vi.mock("@/components/drill/SectionReviewWalk", () => ({
  default: ({ session, initialTab, notepadEnabled, backLabel, onBack, variant }: {
    session: { questionQueue: string[]; attempts: Map<string, { selectedAnswer: string | null }> };
    initialTab: string; notepadEnabled: boolean; backLabel: string; onBack: () => void; variant: string;
  }) => (
    <div data-testid="walk" data-queue={session.questionQueue.join(",")} data-pick={session.attempts.get(session.questionQueue[0])?.selectedAnswer ?? ""}
      data-tab={initialTab} data-notepad={String(notepadEnabled)} data-variant={variant}>
      <button type="button" onClick={onBack}>{backLabel}</button>
    </div>
  ),
}));
const passages = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock("@/features/rc/lib/rcBank", () => ({ loadPassage: passages.load }));
vi.mock("@/features/rc/components/RcExamPane", () => ({
  RcExamPane: ({ passage, question }: { passage: React.ReactNode; question: React.ReactNode }) => <div>{passage}{question}</div>,
  rcTypeStyles: () => ({ passage: {} }),
}));
vi.mock("@/features/rc/components/RcPassagePane", () => ({ RcPassagePane: () => <div>passage pane</div> }));
vi.mock("@/features/rc/components/RcQuestionPane", () => ({
  RcQuestionPane: ({ selected, showTutorPrompt, interactionDisabled }: { selected: string | null; showTutorPrompt?: boolean; interactionDisabled?: boolean }) =>
    <div data-testid="rc-question" data-selected={selected ?? ""} data-tutor={String(showTutorPrompt)} data-locked={String(interactionDisabled)} />,
}));

function renderReview(target: ComponentProps<typeof AnalyticsQuestionReview>["target"], onClose = vi.fn(), returnFocus = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AnalyticsQuestionReview target={target} onClose={onClose} returnFocus={returnFocus} /></QueryClientProvider>);
  return { onClose, returnFocus };
}

describe("Analytics question review", () => {
  it("opens an LR question on the saved first answer, with no notepad and a way back", () => {
    const { onClose } = renderReview({ kind: "lr", qid: "q-1", label: "PT106.S2.Q18", selectedAnswer: "C" });
    const walk = screen.getByTestId("walk");
    expect(walk).toHaveAttribute("data-queue", "q-1");
    expect(walk).toHaveAttribute("data-pick", "C");
    expect(walk).toHaveAttribute("data-tab", "actual");
    expect(walk).toHaveAttribute("data-notepad", "false");
    expect(walk).toHaveAttribute("data-variant", "drill");
    fireEvent.click(screen.getByRole("button", { name: "Back to analytics" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("closes on Escape", () => {
    const { onClose } = renderReview({ kind: "lr", qid: "q-1", label: "PT106.S2.Q18", selectedAnswer: null });
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
  });

  it("opens an RC question locked, on the saved answer, without the tutor prompt", async () => {
    passages.load.mockResolvedValue({ questions: [{ questionId: 5, position: 4 }] });
    renderReview({ kind: "rc", passageId: 9, questionId: 5, label: "PT101.S2.Q4", selectedAnswer: "D" });
    const question = await screen.findByTestId("rc-question");
    expect(question).toHaveAttribute("data-selected", "D");
    expect(question).toHaveAttribute("data-tutor", "false");
    expect(question).toHaveAttribute("data-locked", "true");
  });

  it("says so when an RC passage or question cannot be found, and offers a retry on a failed load", async () => {
    passages.load.mockResolvedValueOnce({ questions: [] });
    renderReview({ kind: "rc", passageId: 9, questionId: 5, label: "PT101.S2.Q4", selectedAnswer: "D" });
    expect(await screen.findByText("This question is unavailable.")).toBeInTheDocument();
  });

  it("shows a retry when the passage fails to load", async () => {
    passages.load.mockRejectedValue(new Error("offline"));
    renderReview({ kind: "rc", passageId: 9, questionId: 6, label: "PT101.S2.Q5", selectedAnswer: null });
    expect(await screen.findByRole("alert")).toHaveTextContent("couldn’t load");
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
