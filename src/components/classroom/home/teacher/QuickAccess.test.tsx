import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { QuickAccess } from "./QuickAccess";

const mocks = vi.hoisted(() => {
  const lr = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
  return {
    index: {
      tests: [
        {
          pt: 151,
          sections: [
            { section: 1, lr: lr(25), rc: [] },
            { section: 4, lr: lr(26), rc: [] },
          ],
        },
      ],
      loading: false,
      failed: false,
      retry: () => {},
    },
    banks: {
      lr: [
        {
          qid: "PT151-S4-Q10",
          pt: 151,
          section: 4,
          qnum: 10,
          qtype: "Necessary Assumption",
          stimulus: "The council claimed that cheaper permits would raise revenue.",
          questionStem: "Which one of the following is an assumption required by the argument?",
        },
      ],
      rcPassages: [],
      rcQuestions: [],
      loading: false,
      error: null,
      lrFailed: false,
      rcFailed: false,
      retry: () => {},
    },
  };
});
vi.mock("@/components/questionfinder/useFinderAddressIndex", () => ({
  useFinderAddressIndex: () => mocks.index,
}));
vi.mock("@/components/questionfinder/useQuestionFinderBanks", () => ({
  useQuestionFinderBanks: () => mocks.banks,
}));

const STUDENTS = [
  { id: "s1", name: "Lydia Park", activityLabel: "Active today", route: "/teacher/students/s1" },
];

function setup() {
  const onOpen = vi.fn();
  render(<QuickAccess students={STUDENTS} rosterReady onOpen={onOpen} />);
  const input = screen.getByLabelText(/Find a student/) as HTMLInputElement;
  return { onOpen, input };
}

describe("QuickAccess", () => {
  beforeEach(() => localStorage.clear());

  it("walks PrepTest, then section, then question without leaving the field", () => {
    const { onOpen, input } = setup();
    fireEvent.change(input, { target: { value: "151" } });
    const sections = screen.getByRole("region", { name: "Sections in PT151" });
    expect(within(sections).getByRole("button", { name: /S1\s*LR · 25/ })).toBeInTheDocument();
    fireEvent.click(within(sections).getByRole("button", { name: /S4\s*LR · 26/ }));
    expect(input.value).toBe("PT151 S4 ");
    expect(input).toHaveFocus();

    const questions = screen.getByRole("region", { name: "Questions in PT151 Section 4" });
    expect(within(questions).getAllByRole("button")).toHaveLength(26);
    fireEvent.change(input, { target: { value: "PT151 S4 2" } });
    expect(
      within(screen.getByRole("region", { name: "Questions in PT151 Section 4" }))
        .getAllByRole("button")
        .map((b) => b.textContent),
    ).toEqual(["2", "20", "21", "22", "23", "24", "25", "26"]);
    fireEvent.click(screen.getByRole("button", { name: "Question 24" }));
    expect(onOpen).toHaveBeenCalledWith("/question/lr/151/4/24");
    expect(input.value).toBe("");
  });

  it("resolves a full address to its question, shows the stem, and opens it on Enter", () => {
    const { onOpen, input } = setup();
    fireEvent.change(input, { target: { value: "151 4 10" } });
    const row = screen.getByRole("button", { name: /PT151 · S4 · Q10/ });
    expect(row).toHaveTextContent("Necessary Assumption");
    expect(row).toHaveTextContent("assumption required by the argument");
    expect(row).toHaveAttribute("data-default");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/question/lr/151/4/10");
  });

  it("remembers opened questions and offers them when the field is empty", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "151 4 10" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.focus(input);
    const recent = screen.getByRole("region", { name: "Recent questions" });
    expect(within(recent).getByRole("button", { name: /PT151 · S4 · Q10/ })).toBeInTheDocument();
  });

  it("says why an address cannot resolve and offers the real sections instead", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "pt151 s3" } });
    expect(screen.getByRole("status")).toHaveTextContent("PT151 has no section 3");
    expect(screen.getByRole("region", { name: "Sections in PT151" })).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "pt151 s4 q99" } });
    expect(screen.getByRole("status")).toHaveTextContent("questions 1–26");
  });

  it("searches question text and opens the best match on Enter", () => {
    const { onOpen, input } = setup();
    fireEvent.change(input, { target: { value: "assumption required" } });
    const questions = screen.getByRole("region", { name: "Questions" });
    const hit = within(questions).getByRole("button", { name: /PT151 · S4 · Q10/ });
    expect(hit).toHaveAttribute("data-default");
    expect(hit.querySelector("mark")).toHaveTextContent(/assumption required/i);
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/question/lr/151/4/10");
  });

  it("ranks a student above question text and tells a miss plainly", () => {
    const { onOpen, input } = setup();
    fireEvent.change(input, { target: { value: "lydia" } });
    expect(screen.getByRole("button", { name: /Lydia Park/ })).toHaveAttribute("data-default");
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onOpen).toHaveBeenCalledWith("/teacher/students/s1");
    fireEvent.change(input, { target: { value: "zzzz nothing" } });
    expect(screen.getByRole("status")).toHaveTextContent("Nothing matches");
  });

  it("moves through results with the arrows and returns to the field when typing", () => {
    const { input } = setup();
    fireEvent.change(input, { target: { value: "151" } });
    fireEvent.keyDown(input, { key: "ArrowDown" });
    const first = screen.getByRole("button", { name: /S1\s*LR · 25/ });
    expect(first).toHaveFocus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("button", { name: /S4\s*LR · 26/ })).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: /S4\s*LR · 26/ }), { key: "x" });
    expect(input).toHaveFocus();
    fireEvent.keyDown(screen.getByRole("button", { name: /S1\s*LR · 25/ }), { key: "ArrowUp" });
    expect(input).toHaveFocus();
  });

  it("opens from anywhere with slash or Ctrl+K", () => {
    const { input } = setup();
    fireEvent.keyDown(document.body, { key: "/" });
    expect(input).toHaveFocus();
    input.blur();
    fireEvent.keyDown(document.body, { key: "k", ctrlKey: true });
    expect(input).toHaveFocus();
  });
});
