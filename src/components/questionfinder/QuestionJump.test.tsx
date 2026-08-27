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

const testSelect = () => screen.getByRole("combobox", { name: /^test$/i });
const sectionSelect = () => screen.getByRole("combobox", { name: /^section$/i });

describe("QuestionJump", () => {
  beforeEach(() => navigate.mockReset());

  it("shows all three addresses without anything being opened first", () => {
    mount();
    expect(testSelect()).toBeInTheDocument();
    expect(sectionSelect()).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: /^question$/i })).toBeInTheDocument();
  });

  it("opens one LR question in the drill runner, and returns where it started", async () => {
    mount();
    fireEvent.change(testSelect(), { target: { value: "90" } });
    fireEvent.change(sectionSelect(), { target: { value: "1" } });
    fireEvent.change(screen.getByRole("combobox", { name: /^question$/i }), {
      target: { value: "12" },
    });

    await waitFor(() => expect(navigate).toHaveBeenCalledTimes(1));
    const href = navigate.mock.calls[0][0] as string;
    expect(href).toContain("/drill?");
    expect(href).toContain("qids=PT90-S1-Q12");
    expect(href).toContain("returnTo=%2Fclassroom");
  });

  it("opens the RC passage at the official question selected", async () => {
    mount("rc");
    fireEvent.change(testSelect(), { target: { value: "90" } });
    fireEvent.change(sectionSelect(), { target: { value: "2" } });

    const third = screen.getByRole("combobox", { name: /^question$/i });
    expect(screen.getByRole("option", { name: "Question 8 · Passage 2" })).toBeInTheDocument();

    fireEvent.change(third, { target: { value: "1190:708" } });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/rc/drill?passage=1190&q=708"));
  });

  it("shows only sections belonging to the active bank", () => {
    mount("lr");
    fireEvent.change(testSelect(), { target: { value: "90" } });
    expect(screen.getByRole("option", { name: "Section 1 · LR" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Section 2 · RC" })).toBeNull();
  });

  it("clears the section when the test changes, so a stale address cannot be opened", () => {
    mount();
    fireEvent.change(testSelect(), { target: { value: "90" } });
    fireEvent.change(sectionSelect(), { target: { value: "1" } });
    expect((sectionSelect() as HTMLSelectElement).value).toBe("1");

    fireEvent.change(testSelect(), { target: { value: "" } });
    expect((sectionSelect() as HTMLSelectElement).value).toBe("");
    expect(navigate).not.toHaveBeenCalled();
  });
});
