import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import QuestionFinder from "./QuestionFinder";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("./useQuestionFinderBanks", () => ({
  useQuestionFinderBanks: () => ({
    loading: false,
    error: null,
    lrFailed: false,
    rcFailed: false,
    lr: [
      {
        qid: "PT90-S1-Q12",
        pt: 90,
        section: 1,
        qnum: 12,
        qtype: "Flaw",
        stimulus: "The ecologist's reasoning ignores the possibility of drought.",
        questionStem: "Which one describes a flaw in the reasoning?",
      },
    ],
    rcPassages: [
      {
        passageId: 4021,
        preptest: 88,
        section: 3,
        setNumber: 2,
        title: "Sam Gilliam and the draped canvas",
        topic: "Arts",
        questionCount: 7,
        firstWords: "For much of the twentieth century the stretcher frame went unquestioned.",
      },
    ],
    rcQuestions: [
      { passageId: 4021, preptest: 88, section: 3, prompt: "The passage suggests the reasoning was..." },
    ],
  }),
}));

const openFinder = () => {
  render(
    <MemoryRouter>
      <QuestionFinder returnTo="/classroom" />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /find a question/i }));
  return screen.getByRole("dialog", { name: /find a question/i });
};

const type = (dialog: HTMLElement, value: string) =>
  fireEvent.change(within(dialog).getByRole("textbox"), { target: { value } });

describe("QuestionFinder", () => {
  beforeEach(() => navigate.mockClear());

  it("shows the address format before anything is typed, rather than an empty panel", () => {
    const dialog = openFinder();
    expect(within(dialog).getByText("PT90 S1 Q12")).toBeInTheDocument();
  });

  it("opens an LR hit as a one-question attempt that returns to where it started", async () => {
    const dialog = openFinder();
    type(dialog, "flaw in the reasoning");
    const row = await within(dialog).findByRole("button", { name: /PT 90/ });
    fireEvent.click(row);
    expect(navigate).toHaveBeenCalledWith(
      "/drill?mode=type-drill&qids=PT90-S1-Q12&present=smart&returnTo=%2Fclassroom",
    );
  });

  it("says an RC hit opens the whole passage before it is clicked", async () => {
    const dialog = openFinder();
    type(dialog, "stretcher frame");
    expect(await within(dialog).findByText(/opens the whole passage/i)).toBeInTheDocument();
    expect(within(dialog).getByText("7 questions")).toBeInTheDocument();
  });

  it("opens an RC hit at its passage, not at the question that matched", async () => {
    const dialog = openFinder();
    type(dialog, "stretcher frame");
    fireEvent.click(await within(dialog).findByRole("button", { name: /PT 88/ }));
    expect(navigate).toHaveBeenCalledWith("/rc/drill?passage=4021");
  });

  it("echoes a recognised address back so the syntax is learned by using it", async () => {
    const dialog = openFinder();
    type(dialog, "PT90 S1 Q12");
    // Scoped to the confirmation chip: the matching row now prints the same
    // shorthand, which is the point — one spelling of an address everywhere.
    await waitFor(() =>
      expect(dialog.querySelector(".qf-address")).toHaveTextContent("PT 90 · S1 · Q12"),
    );
  });

  it("opens the highlighted hit on Enter", async () => {
    const dialog = openFinder();
    type(dialog, "PT90 S1 Q12");
    await within(dialog).findByRole("button", { name: /PT 90/ });
    fireEvent.keyDown(dialog, { key: "Enter" });
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("qids=PT90-S1-Q12"));
  });

  it("clears the query on the first Escape and closes on the second", async () => {
    const dialog = openFinder();
    type(dialog, "drought");
    fireEvent.keyDown(dialog, { key: "Escape" });
    expect(within(dialog).getByRole("textbox")).toHaveValue("");
    fireEvent.keyDown(dialog, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: /find a question/i })).toBeNull(),
    );
  });

  it("says nothing matched rather than showing an empty list", () => {
    const dialog = openFinder();
    type(dialog, "photosynthesis in mangroves");
    expect(within(dialog).getByText(/nothing matched that/i)).toBeInTheDocument();
  });

  it("names the missing question when an address resolves to nothing", () => {
    const dialog = openFinder();
    type(dialog, "PT90 S1 Q99");
    expect(
      within(dialog).getByText("No question at PT 90 · S1 · Q99."),
    ).toBeInTheDocument();
  });

  it("hands set-building to the Drill console instead of doing it here", () => {
    const dialog = openFinder();
    fireEvent.click(within(dialog).getByRole("button", { name: /build a set/i }));
    expect(navigate).toHaveBeenCalledWith("/classroom/drill?stage=type-drill");
  });

  it("offers both banks in Browse by test, not LR alone", () => {
    const dialog = openFinder();
    fireEvent.click(within(dialog).getByRole("button", { name: /browse by test/i }));
    const test = within(dialog).getByLabelText(/^test$/i);
    expect(within(test).getByRole("option", { name: "PT 90" })).toBeInTheDocument();
    expect(within(test).getByRole("option", { name: "PT 88" })).toBeInTheDocument();
  });

  it("turns a browse selection into the same query a student could have typed", () => {
    const dialog = openFinder();
    fireEvent.click(within(dialog).getByRole("button", { name: /browse by test/i }));
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "90" } });
    expect(within(dialog).getByRole("textbox")).toHaveValue("PT90");
  });
});
