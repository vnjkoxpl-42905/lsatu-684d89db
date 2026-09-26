import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import QuestionJump from "./QuestionJump";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

/* One PrepTest, one LR section and one RC section: enough to prove the third
   dropdown changes both its contents and its destination with the section's
   bank, which is the only rule in this component worth defending. */
vi.mock("./useFinderAddressIndex", () => ({
  useFinderAddressIndex: () => ({
    loading: false,
    failed: false,
    tests: [
      {
        pt: 90,
        sections: [
          { section: 1, lr: [1, 2, 12], rc: [] },
          {
            section: 2,
            lr: [],
            rc: [
              {
                id: 1188,
                position: 1,
                title: "Risk Communication",
                questions: [{ id: 701, number: 1 }, { id: 702, number: 2 }],
              },
              {
                id: 1190,
                position: 2,
                title: null,
                questions: [{ id: 708, number: 8 }],
              },
            ],
          },
        ],
      },
      { pt: 91, sections: [{ section: 3, lr: [4], rc: [] }] },
    ],
  }),
}));

function mount(bank?: "lr" | "rc") {
  return render(
    <MemoryRouter>
      <QuestionJump returnTo="/classroom" bank={bank} />
    </MemoryRouter>,
  );
}

const testSelect = () => screen.getByRole("combobox", { name: /^preptest$/i });
const sectionSelect = () => screen.getByRole("combobox", { name: /^section$/i });
const questionSelect = () => screen.getByRole("combobox", { name: /^question number$/i });
const choose = (select: HTMLElement, option: string) => {
  fireEvent.click(select);
  fireEvent.click(screen.getByRole("option", { name: option }));
};

describe("QuestionJump", () => {
  beforeEach(() => navigate.mockReset());

  it("shows all three addresses without anything being opened first", () => {
    mount();
    expect(testSelect()).toBeInTheDocument();
    expect(sectionSelect()).toBeInTheDocument();
    expect(questionSelect()).toBeInTheDocument();
  });

  it("opens one LR question in the drill runner, and returns where it started", async () => {
    mount();
    choose(testSelect(), "PT 90");
    choose(sectionSelect(), "Section 1 · LR");
    choose(questionSelect(), "Question 12");

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const href = navigate.mock.calls[0][0] as string;
    expect(href).toContain("/drill?");
    expect(href).toContain("qids=PT90-S1-Q12");
    expect(href).toContain("returnTo=%2Fclassroom");
  });

  it("opens the RC passage at the official question selected", async () => {
    mount("rc");
    choose(testSelect(), "PT 90");
    choose(sectionSelect(), "Section 2 · RC");

    const third = questionSelect();
    fireEvent.click(third);
    expect(screen.getByRole("option", { name: "Question 8 · Passage 2" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("option", { name: "Question 8 · Passage 2" }));
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/rc/drill?passage=1190&q=708"));
  });

  it("shows only sections belonging to the active bank", () => {
    mount("lr");
    choose(testSelect(), "PT 90");
    fireEvent.click(sectionSelect());
    expect(screen.getByRole("option", { name: "Section 1 · LR" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Section 2 · RC" })).toBeNull();
  });

  it("clears the section when the test changes, so a stale address cannot be opened", () => {
    mount();
    choose(testSelect(), "PT 90");
    choose(sectionSelect(), "Section 1 · LR");
    expect(sectionSelect()).toHaveTextContent("Section 1 · LR");

    // A new PrepTest clears the dependent section; the user cannot open a
    // question under a stale section from another test.
    choose(testSelect(), "PT 91");
    expect(sectionSelect()).toHaveTextContent("Section");
    expect(questionSelect()).toBeDisabled();
    expect(navigate).not.toHaveBeenCalled();
  });
});
