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
              { id: 1188, position: 1, title: "Risk Communication" },
              { id: 1190, position: 2, title: null },
            ],
          },
        ],
      },
    ],
  }),
}));

function mount() {
  return render(
    <MemoryRouter>
      <QuestionJump returnTo="/classroom" />
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

  it("opens the whole passage on an RC section, and says Passage rather than Question", async () => {
    mount();
    fireEvent.change(testSelect(), { target: { value: "90" } });
    fireEvent.change(sectionSelect(), { target: { value: "2" } });

    const third = screen.getByRole("combobox", { name: /^passage$/i });
    expect(screen.queryByRole("combobox", { name: /^question$/i })).toBeNull();
    // An untitled passage still has to be pickable, by position.
    expect(screen.getByRole("option", { name: "Passage 2" })).toBeInTheDocument();

    fireEvent.change(third, { target: { value: "1188" } });
    await waitFor(() => expect(navigate).toHaveBeenCalledWith("/rc/drill?passage=1188"));
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
