import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import QuestionFinder from "./QuestionFinder";

const navigate = vi.fn();
vi.mock('@/lib/questionLoader', async importOriginal => ({ ...(await importOriginal<typeof import('@/lib/questionLoader')>()), questionBank: { getQuestion: (qid: string) => ({ qid, pt:90, section:1, qnum:12, stimulus:'The ecologist considers drought.', questionStem:'Which is a flaw?', answerChoices:{A:'One',B:'Two',C:'Three',D:'Four',E:'Five'}, correctAnswer:'B' }) } }));
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
vi.mock("./useFinderAddressIndex", () => ({
  useFinderAddressIndex: () => ({ tests: [{ pt: 88, sections: [{ section: 3, lr: [], rc: [{ id: 4021, position: 2, title: "Sam Gilliam and the draped canvas", questions: [{ id: 503, number: 3 }] }] }] }, { pt: 90, sections: [{ section: 1, lr: [12], rc: [] }] }, { pt: 140, sections: [{ section: 4, lr: [], rc: [
    { id: 14, position: 1, title: "Sam Gilliam", questions: Array.from({ length: 6 }, (_, i) => ({ id: 1588 + i, number: i + 1 })) },
    { id: 15, position: 2, title: "Online Game Currencies", questions: Array.from({ length: 7 }, (_, i) => ({ id: 1594 + i, number: i + 7 })) },
    { id: 16, position: 3, title: "The Origins of Superior Performance", questions: Array.from({ length: 6 }, (_, i) => ({ id: 1601 + i, number: i + 14 })) },
    { id: 18, position: 4, title: "Explaining Mirror Images", questions: Array.from({ length: 8 }, (_, i) => ({ id: 1607 + i, number: i + 20 })) },
  ] }] }], loading: false, failed: false, retry: vi.fn() }),
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

  it('does not open or load while disabled, including keyboard shortcuts', () => {
    const view = render(<MemoryRouter><QuestionFinder returnTo='/classroom' enabled={false} actorId='a' /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Find a question' })).toBeNull();
    fireEvent.keyDown(window, { key: '/', ctrlKey: false });
    expect(screen.queryByRole('dialog')).toBeNull();
    view.rerender(<MemoryRouter><QuestionFinder returnTo='/classroom' enabled actorId='a' /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Find a question' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    view.rerender(<MemoryRouter><QuestionFinder returnTo='/classroom' enabled actorId='b' /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('closes the finder on actor change', () => {
    const view = render(<MemoryRouter><QuestionFinder returnTo='/classroom' actorId='a' /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: 'Find a question' }));
    const dialog = screen.getByRole('dialog'); type(dialog, 'PT90 S1 Q12');
    fireEvent.click(within(dialog).getByRole('button', { name: /PT 90/ }));
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/drill\?drill=questions/));
    view.rerender(<MemoryRouter><QuestionFinder returnTo='/classroom' actorId='b' /></MemoryRouter>);
    expect(screen.queryByRole('dialog')).toBeNull();
  });
  it('can hide the trigger while retaining the imperative launcher', () => {
    render(<MemoryRouter><QuestionFinder returnTo='/classroom' hideTrigger /></MemoryRouter>);
    expect(screen.queryByRole('button', { name: 'Find a question' })).toBeNull();
  });
  it("shows the address format before anything is typed, rather than an empty panel", () => {
    const dialog = openFinder();
    expect(within(dialog).getByText("PT90 S1 Q12")).toBeInTheDocument();
  });

  it("opens an LR hit in the regular LR runner", async () => {
    const dialog = openFinder(); type(dialog, "flaw in the reasoning");
    fireEvent.click(await within(dialog).findByRole("button", { name: /PT 90/ }));
    expect(screen.queryByRole('dialog', { name: 'Find a question' })).toBeNull();
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/drill\?drill=questions/));
  });
  it("opens an RC hit directly using validated identity", async () => {
    const dialog = openFinder(); type(dialog, "stretcher frame");
    fireEvent.click(await within(dialog).findByRole("button", { name: /PT 88/ }));
    expect(navigate).toHaveBeenCalledWith('/rc/preview?passage=4021&q=503&returnTo=%2Fclassroom', { replace: false, state: { finderPreviewHistory: 'push' } });
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
    const dialog = openFinder(); type(dialog, "PT90 S1 Q12");
    fireEvent.keyDown(within(dialog).getByRole('textbox'), { key: 'Enter' });
    expect(navigate).toHaveBeenCalledWith(expect.stringMatching(/^\/drill\?drill=questions/));
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
      within(dialog).getByText("PT 90 · S1 · Q99 is unavailable in the loaded bank. Some sections may still be unavailable."),
    ).toBeInTheDocument();
  });

  it("does not offer unrelated set building", () => {
    const dialog = openFinder(); expect(within(dialog).queryByRole('button', { name: /build a set/i })).toBeNull();
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
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Question" }));
    expect(screen.getByText("Question 3")).toBeInTheDocument();
    expect(within(dialog).queryByRole("option", { name: "PT 90" })).toBeNull();
  });

  it("auto-selects PT140's sole RC section and groups all 27 official questions", async () => {
    const dialog = openFinder("rc");
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "140" } });
    await waitFor(() => expect(within(dialog).getByLabelText(/^section$/i)).toHaveValue("4"));
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Question" }));
    const groups = screen.getAllByRole("group").filter((group) => group.textContent?.includes("Passage"));
    expect(groups.map((group) => within(group).getByText(/^Passage/).textContent)).toEqual([
      "Passage 1 · Questions 1–6",
      "Passage 2 · Questions 7–13",
      "Passage 3 · Questions 14–19",
      "Passage 4 · Questions 20–27",
    ]);
    expect(screen.getAllByText(/^Question \d+$/)).toHaveLength(27);
    expect(screen.getByText("Question 3")).toBeInTheDocument();
    expect(screen.getByText("Question 17")).toBeInTheDocument();
  });

  it("keeps Open preview unavailable without an exact RC address", () => {
    const dialog = openFinder();
    const go = within(dialog).getByRole("button", { name: /^open preview$/i });
    expect(go).toBeDisabled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("opens only an explicit exact RC question as a read-only preview", async () => {
    const dialog = openFinder("rc");
    type(dialog, "PT88 S3 Q3");
    const open = within(dialog).getByRole("button", { name: "Open preview" });
    await waitFor(() => expect(open).toBeEnabled());
    expect(navigate).not.toHaveBeenCalled();
    fireEvent.click(open);
    expect(navigate).toHaveBeenCalledWith("/rc/preview?passage=4021&q=503&returnTo=%2Fclassroom", { replace: false, state: { finderPreviewHistory: 'push' } });
  });
  it("keeps the opening origin when its host route changes while lookup remains open", () => {
    const view = render(<MemoryRouter><QuestionFinder returnTo="/practice/drills?section=rc" bank="rc" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Find a question" }));
    const dialog = screen.getByRole("dialog", { name: "Find a question" });
    type(dialog, "PT140 S4 Q17");
    view.rerender(<MemoryRouter><QuestionFinder returnTo="/rc/preview?passage=16&q=1604" bank="rc" /></MemoryRouter>);
    fireEvent.click(within(dialog).getByRole("button", { name: "Open preview" }));
    expect(navigate).toHaveBeenCalledWith("/rc/preview?passage=16&q=1604&returnTo=%2Fpractice%2Fdrills%3Fsection%3Drc", { replace: false, state: { finderPreviewHistory: 'push' } });
  });

  it("enables a validated LR preview", () => {
    const dialog = openFinder("lr"); type(dialog, "PT90 S1 Q12");
    expect(within(dialog).getByRole("button", { name: "Open preview" })).toBeEnabled();
  });

  it("clears an incompatible RC address when switching to LR, including after reopening", async () => {
    const dialog = openFinder("rc");
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "140" } });
    await waitFor(() => expect(within(dialog).getByLabelText(/^section$/i)).toHaveValue("4"));
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Question" }));
    fireEvent.click(screen.getByText("Question 3"));
    expect(within(dialog).getByRole("textbox")).toHaveValue("PT140 S4 Q3");

    fireEvent.click(within(dialog).getByRole("button", { name: "LR" }));
    expect(within(dialog).getByRole("textbox")).toHaveValue("");
    expect(within(dialog).getByLabelText(/^test$/i)).toHaveValue("");
    expect(within(dialog).getByLabelText(/^section$/i)).toHaveValue("");
    expect(within(dialog).getByRole("combobox", { name: "Question" })).toBeDisabled();

    fireEvent.click(within(dialog).getByRole("button", { name: /close the question finder/i }));
    fireEvent.click(screen.getByRole("button", { name: /find a question/i }));
    const reopened = screen.getByRole("dialog", { name: /find a question/i });
    expect(within(reopened).getByRole("textbox")).toHaveValue("");
    expect(within(reopened).getByLabelText(/^test$/i)).toHaveValue("");
    expect(within(reopened).getByLabelText(/^section$/i)).toHaveValue("");
    expect(within(reopened).getByRole("combobox", { name: "Question" })).toBeDisabled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("leaves native Test and Section keyboard events to their own controls", async () => {
    const dialog = openFinder();
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "90" } });
    fireEvent.change(within(dialog).getByLabelText(/^section$/i), { target: { value: "1" } });
    type(dialog, "flaw in the reasoning");
    await within(dialog).findByRole("button", { name: /PT 90/ });
    for (const control of [within(dialog).getByLabelText(/^test$/i), within(dialog).getByLabelText(/^section$/i)]) {
      for (const key of ["ArrowDown", "ArrowUp", "Enter"]) {
        const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
        fireEvent(control, event);
        expect(event.defaultPrevented, `${control.tagName} ${key} must not be intercepted by search`).toBe(false);
        expect(within(dialog).getByRole("textbox")).toHaveValue("flaw in the reasoning");
      }
    }
    expect(navigate).not.toHaveBeenCalled();
  });

  it("does not auto-select a stale test when changing from All to RC", async () => {
    const dialog = openFinder();
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "140" } });
    expect(within(dialog).getByRole("textbox")).toHaveValue("PT140");
    fireEvent.click(within(dialog).getByRole("button", { name: "RC" }));
    await waitFor(() => {
      expect(within(dialog).getByRole("textbox")).toHaveValue("");
      expect(within(dialog).getByLabelText(/^test$/i)).toHaveValue("");
      expect(within(dialog).getByLabelText(/^section$/i)).toHaveValue("");
    });
    expect(within(dialog).getByRole("combobox", { name: "Question" })).toBeDisabled();
    expect(navigate).not.toHaveBeenCalled();
  });

  it("keeps the dark finder token scope on the portaled passage menu", async () => {
    render(<MemoryRouter><QuestionFinder returnTo="/classroom" bank="rc" tone="dark" /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /find a question/i }));
    const dialog = screen.getByRole("dialog", { name: /find a question/i });
    fireEvent.change(within(dialog).getByLabelText(/^test$/i), { target: { value: "140" } });
    await waitFor(() => expect(within(dialog).getByLabelText(/^section$/i)).toHaveValue("4"));
    fireEvent.click(within(dialog).getByRole("combobox", { name: "Question" }));
    const passageHeading = screen.getByText("Passage 1 · Questions 1–6");
    expect(dialog.contains(passageHeading)).toBe(false);
    expect(passageHeading.closest('.qf[data-tone="dark"]')).not.toBeNull();
  });

  it("crosses to the other bank from the switch, rather than only following its host", async () => {
    const dialog = openFinder("lr");
    type(dialog, "stretcher frame");
    expect(within(dialog).queryByText(/reading comprehension/i)).toBeNull();
    fireEvent.click(within(dialog).getByRole("button", { name: "RC" }));
    expect(await within(dialog).findByText(/reading comprehension/i)).toBeInTheDocument();
  });
});
