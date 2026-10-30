import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { ViewManager } from "./index";

const state = vi.hoisted(() => ({ currentView: "module", currentModuleId: "m2", openModule: vi.fn() }));
vi.mock("./store/AppContext", () => ({ useApp: () => state, AppProvider: ({ children }: any) => children }));
vi.mock("./components/views/ModuleView", async () => {
  const { useState } = await import("react");
  return { default: () => {
    const [question, setQuestion] = useState(0);
    const count = state.currentModuleId === "m2" ? 4 : 2;
    if (question >= count) throw new Error("Question index exceeded the new module's questions");
    return <button onClick={() => setQuestion(question + 1)}>Question {question + 1} of {count}</button>;
  } };
});
vi.mock("./components/layout/AppShell", () => ({ default: ({ children }: any) => children }));
vi.mock("./components/views/Dashboard", () => ({ default: () => null }));
vi.mock("./components/views/LessonReader", () => ({ default: () => null }));
vi.mock("./components/views/DrillRunner", () => ({ default: () => null }));
vi.mock("./components/views/Flashcards", () => ({ Flashcards: () => null }));
vi.mock("./components/views/MethodsLibrary", () => ({ MethodsLibrary: () => null }));
vi.mock("./components/views/TimedFinalSet", () => ({ default: () => null }));
vi.mock("./components/views/CompletionReport", () => ({ default: () => null }));

beforeEach(() => { state.currentView = "module"; state.currentModuleId = "m2"; state.openModule.mockReset(); state.openModule.mockImplementation((id) => { state.currentModuleId = id; state.currentView = "module"; }); });

it("discards the old question index before a shorter module renders", () => {
  const view = render(<ViewManager />);
  fireEvent.click(screen.getByRole("button", { name: "Question 1 of 4" }));
  fireEvent.click(screen.getByRole("button", { name: "Question 2 of 4" }));
  expect(screen.getByRole("button", { name: "Question 3 of 4" })).toBeInTheDocument();
  state.currentModuleId = "m1";
  expect(() => view.rerender(<ViewManager />)).not.toThrow();
  expect(screen.getByRole("button", { name: "Question 1 of 2" })).toBeInTheDocument();
});

it("routes unknown module and final-set state back to the course without rendering stale practice", () => {
  state.currentModuleId = "unknown";
  const view = render(<ViewManager />);
  expect(state.openModule).toHaveBeenCalledWith("m3");
  view.rerender(<ViewManager />);
  expect(screen.getByRole("button", { name: "Question 1 of 2" })).toBeInTheDocument();
  state.currentView = "timed_set";
  view.rerender(<ViewManager />);
  expect(state.openModule).toHaveBeenCalledTimes(2);
  expect(state.currentModuleId).toBe("m3");
});
