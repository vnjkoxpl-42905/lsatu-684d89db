import { fireEvent, render, screen, within } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { StudentAnalyticsView } from "./DossierAnalytics";

const attempt = (qid: string, extra: Record<string, unknown> = {}) => ({
  qid, pt: 100, section: 1, qnum: 1, qtype: "Flaw", level: 3, mode: "adaptive",
  selected_answer: "B", correct: true, time_ms: 60000, timestamp_iso: "2026-10-27T12:00:00Z",
  br_answer: null, br_outcome: null, ...extra,
});

vi.mock("@/lib/studentAnalytics", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/studentAnalytics")>()),
  loadStudentPractice: async () => ({
    sections: [], practiceTests: [], drills: [],
    attempts: [
      attempt("q1", { qnum: 1, qtype: "Flaw" }),
      attempt("q2", { qnum: 2, qtype: "Necessary Assumption", selected_answer: "C", correct: false }),
      attempt("q3", { qnum: 3, qtype: "Flaw" }),
      attempt("rc:77", { kind: "rc", label: "PT101.S2.Q4", tags: [["Main Point", "x"]], qtype: "Main Point", mode: "rc" }),
      attempt("rc:78", { kind: "rc", label: "PT101.S2.Q5", tags: [["Main Point", "x"]], qtype: "Main Point", mode: "rc" }),
    ],
  }),
}));

vi.mock("@/lib/questionLoader", () => {
  const bank: Record<string, { pt: number; section: number; qnum: number; qtype: string; difficulty: number; correctAnswer: string; questionFeatures: string[] }> = {
    q1: { pt: 100, section: 1, qnum: 1, qtype: "Flaw", difficulty: 3, correctAnswer: "B", questionFeatures: ["Famous Flaws"] },
    q2: { pt: 100, section: 1, qnum: 2, qtype: "Necessary Assumption", difficulty: 3, correctAnswer: "D", questionFeatures: [] },
    q3: { pt: 100, section: 1, qnum: 3, qtype: "Flaw", difficulty: 2, correctAnswer: "B", questionFeatures: [] },
  };
  return { questionBank: { getQuestion: (qid: string) => bank[qid] ?? null } };
});

vi.mock("@/contexts/QuestionBankContext", () => ({ useQuestionBank: () => ({ isLoading: false }) }));
vi.mock("./StudentDossier", () => ({ useDossier: () => ({ studentId: "s1", studentName: "Alex" }) }));
vi.mock("./AnalyticsInsights", () => ({ default: () => null }));
vi.mock("./PracticeRatingCard", () => ({ default: () => null }));

const answer = (key: string, selected: string, extra: Record<string, unknown> = {}) => ({
  attemptId: `a:${key}`, questionKey: key, area: key.startsWith("RC") ? "RC" : "LR", source: "lr_attempts", mode: "adaptive",
  correct: true, gradedAt: "2026-10-27T12:00:00Z", selectedAnswer: selected, ...extra,
});
vi.mock("@/hooks/useFirstAnswerProgress", () => ({
  useFirstAnswerProgress: () => ({
    loading: false,
    ledger: {
      answers: [
        answer("LR:q1", "B"),
        answer("LR:q2", "C", { correct: null, resultVisibility: "withheld" }),
        answer("RC:77", "D", { area: "RC", source: "rc_attempts", provenance: { kind: "rc-session", ownerId: "s1", sessionId: "x", questionId: 77, passageId: 9 } }),
      ],
    },
  }),
}));

vi.mock("./AnalyticsQuestionReview", () => ({
  default: ({ target, onClose }: { target: { label: string; kind: string; selectedAnswer: string | null }; onClose: () => void }) => (
    <div role="dialog" aria-label={`Review ${target.label}`}>
      <span>{target.kind} first answer {target.selectedAnswer}</span>
      <button type="button" onClick={onClose}>Back to analytics</button>
    </div>
  ),
}));

async function openQuestions(audience: "teacher" | "student" = "teacher") {
  const user = {
    click: async (el: Element) => { fireEvent.click(el); },
    type: async (el: Element, text: string) => { fireEvent.change(el, { target: { value: text } }); },
    clear: async (el: Element) => { fireEvent.change(el, { target: { value: "" } }); },
  };
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <StudentAnalyticsView studentId="s1" studentName="Alex" runHref={() => "/x"} audience={audience} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  await user.click(await screen.findByRole("button", { name: "Questions & explanations" }));
  return user;
}

describe("Analytics question review", () => {
  it("opens the saved first answer for an LR and an RC question, and returns to the table with filters kept", async () => {
    const user = await openQuestions();
    await user.type(screen.getByLabelText("Find a question"), "PT101");
    expect(screen.queryByRole("button", { name: "Review PT100.S1.Q1" })).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Find a question"));
    await user.type(screen.getByLabelText("Find a question"), "PT100");

    await user.click(screen.getByRole("button", { name: "Review PT100.S1.Q1" }));
    expect(await screen.findByRole("dialog", { name: "Review PT100.S1.Q1" })).toHaveTextContent("lr first answer B");
    await user.click(screen.getByRole("button", { name: "Back to analytics" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Find a question")).toHaveValue("PT100");

    await user.clear(screen.getByLabelText("Find a question"));
    await user.click(screen.getByRole("button", { name: "Review PT101.S2.Q4" }));
    expect(await screen.findByRole("dialog")).toHaveTextContent("rc first answer D");
  });

  it("gives no review link, and shows no answer, where the result is withheld or no released answer is saved", async () => {
    await openQuestions();
    expect(screen.queryByRole("button", { name: "Review PT100.S1.Q2" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Review PT101.S2.Q5" })).not.toBeInTheDocument();
    const withheld = screen.getByText("PT100.S1.Q2").closest("tr")!;
    expect(withheld).not.toHaveTextContent(/→/);
    expect(within(withheld).getAllByText("–").length).toBeGreaterThan(0);
  });

  it("filters by a tag chip, toggles it off, and keeps the question type the largest chip", async () => {
    const user = await openQuestions();
    expect(screen.getByText("5 questions")).toBeInTheDocument();
    const flawChip = within(screen.getByText("PT100.S1.Q1").closest("tr")!).getByRole("button", { name: "Flaw" });
    expect(flawChip).toHaveAttribute("aria-pressed", "false");
    expect(flawChip.className).toContain("text-sm");
    expect(within(screen.getByText("PT100.S1.Q1").closest("tr")!).getByRole("button", { name: "Famous Flaws" }).className).toContain("text-xs");

    await user.click(flawChip);
    expect(screen.getByText("2 questions")).toBeInTheDocument();
    expect(screen.queryByText("PT100.S1.Q2")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Clear tag · Flaw/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Clear tag/ }));
    expect(screen.getByText("5 questions")).toBeInTheDocument();
  });
});
