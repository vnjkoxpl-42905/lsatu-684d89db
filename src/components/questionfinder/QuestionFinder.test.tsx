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
      { questionId: 503, passageId: 4021, preptest: 88, section: 3, qnum: 3, position: 3, prompt: "The passage mentions the stretcher frame." },
    ],
  }),
}));

const openFinder = (bank?: "lr" | "rc") => {
  render(
    <MemoryRouter>
      <QuestionFinder returnTo="/classroom" bank={bank} />
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

  it("says an RC hit opens its matching passage before it is clicked", async () => {
    const dialog = openFinder();
    type(dialog, "stretcher frame");
    expect(await within(dialog).findByText(/opens the matching passage/i)).toBeInTheDocument();
    expect(within(dialog).getByText("7 questions")).toBeInTheDocument();
  });

  it("opens an RC hit at the matching question inside its passage", async () => {
    const dialog = openFinder();
    type(dialog, "stretcher frame");
    fireEvent.click(await within(dialog).findByRole("button", { name: /PT 88/ }));
    expect(navigate).toHaveBeenCalledWith("/rc/drill?passage=4021&q=503");
  });

  it("uses the active RC side and understands a spoken-style full address", async () => {
    const dialog = openFinder("rc");
    type(dialog, "Practice Test 88 section number 3 question number 3");
    expect(await within(dialog).findByRole("button", { name: /PT 88 · S3 · Q3/ })).toBeInTheDocument();
    expect(within(dialog).queryByText("Logical Reasoning")).toBeNull();
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
    expect(navigate).toHaveBeenCalledWith("/classroom/drill?section=lr&stage=type-drill");
  });

  it("offers both banks in the test selector without anything being expanded first", () => {
    const dialog = openFinder();
    const test = within(dialog).getByLabelText(/^test$/i);
    expect(within(test).getByRole("option", { name: "PT 90" })).toBeInTheDocument();
    expect(within(test).getByRole("option", { name: "PT 88" })).toBeInTheDocument();
  });

  it("turns a selector choice into the same query a student could have typed", () => {
    const dialog = openFinder();
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "90" } });
    expect(within(dialog).getByRole("textbox")).toHaveValue("PT90");
  });

  it("keeps the selectors synchronized with the active RC bank", () => {
    const dialog = openFinder("rc");
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "88" } });
    fireEvent.change(within(dialog).getByLabelText(/^section$/i), { target: { value: "3" } });
    expect(within(dialog).getByRole("option", { name: "Question 3" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: "PT 90" })).toBeNull();
  });

  it("keeps the go arrow disabled until the address resolves to something", () => {
    const dialog = openFinder();
    const go = within(dialog).getByRole("button", { name: /open the selected question/i });
    expect(go).toBeDisabled();
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "90" } });
    expect(go).toBeEnabled();
  });

  it("opens the selected question from the go arrow", () => {
    const dialog = openFinder();
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "90" } });
    fireEvent.change(within(dialog).getByLabelText(/^section$/i), { target: { value: "1" } });
    fireEvent.change(within(dialog).getByLabelText(/^question$/i), { target: { value: "12" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /open the selected question/i }));
    expect(navigate).toHaveBeenCalledWith(expect.stringContaining("qids=PT90-S1-Q12"));
  });

  it("crosses to the other bank from the switch, rather than only following its host", async () => {
    const dialog = openFinder("lr");
    type(dialog, "stretcher frame");
    expect(within(dialog).queryByText(/reading comprehension/i)).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "RC" }));
    expect(await within(dialog).findByText(/reading comprehension/i)).toBeInTheDocument();
  });
});
