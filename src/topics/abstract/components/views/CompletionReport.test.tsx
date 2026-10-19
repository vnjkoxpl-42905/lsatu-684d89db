import { render, screen } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import CompletionReport from "./CompletionReport";
import { ANSWER_CHOICE_ITEMS } from "../../data/answerChoiceDrill";
vi.mock("@/contexts/AuthContext", () => ({ useAuth: () => ({ user: null }) }));
vi.mock("../../store/AppContext", () => ({ useApp: () => ({ setCurrentView: vi.fn(), bootcampState: {
  completedLessons: [], completedDrills: ANSWER_CHOICE_ITEMS.map((i) => i.id), cards: {}, drillsStats: {},
  drillAttempts: ANSWER_CHOICE_ITEMS.map((item) => ({ drillId: item.id, trapTag: "source_breakdown_reviewed", correct: false })),
  translatorAttempts: [], gauntletAttempts: [],
} }) }));
it("reports reviewed breakdowns separately without implying graded errors or written completion", () => {
  localStorage.clear(); render(<CompletionReport />);
  expect(screen.getByText(/No graded drill attempts yet/)).toBeInTheDocument();
  expect(screen.getByText("Breakdowns reviewed")).toBeInTheDocument();
  expect(screen.getByText("15/15")).toBeInTheDocument();
  expect(screen.queryByText(/15 drills logged/)).not.toBeInTheDocument();
  expect(screen.queryByText(/0 correct/)).not.toBeInTheDocument();
});
