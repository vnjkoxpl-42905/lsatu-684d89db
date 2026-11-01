import * as React from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import LrQuestionPage from "./LrQuestionPage";

vi.mock("@/hooks/useLrExplanation", () => ({
  useLrExplanation: (_query: unknown, enabled = true) => ({
    data: enabled ? { styles: [{ notesByLetter: { B: "Why B is supported." } }], choices: [] } : undefined,
  }),
}));

function bankFile(name: string): unknown {
  return JSON.parse(readFileSync(resolve(__dirname, "../../public/data", name), "utf8"));
}

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/question/lr/:pt/:section/:qnum" element={<LrQuestionPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("LrQuestionPage", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockImplementation(async (url: string) => {
      const match = /\/data\/(PT\d+-S\d+-LR\.json)$/.exec(url);
      if (!match) return { ok: false, status: 404, json: async () => null };
      try {
        const body = bankFile(match[1]);
        return { ok: true, status: 200, json: async () => body };
      } catch {
        return { ok: false, status: 404, json: async () => null };
      }
    });
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("shows the question named by the address, from its own section file only", async () => {
    renderAt("/question/lr/151/4/10");
    expect(await screen.findByRole("heading", { name: "PT151 Section 4 Question 10" })).toBeTruthy();
    expect(screen.getByText(/Overhearing only one side of a cell-phone conversation/)).toBeTruthy();
    expect(screen.getByText(/most strongly\s+support which one of the following/)).toBeTruthy();
    for (const letter of ["A", "B", "C", "D", "E"]) {
      expect(screen.getByRole("button", { name: letter })).toBeTruthy();
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe("/data/PT151-S4-LR.json");
  });

  it("checks the answer, marks the credited one and opens its note on request", async () => {
    renderAt("/question/lr/151/4/10");
    await screen.findByRole("heading", { name: "PT151 Section 4 Question 10" });
    const check = screen.getByRole("button", { name: "Check answer" }) as HTMLButtonElement;
    expect(check.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: "D" }));
    expect(check.disabled).toBe(false);
    fireEvent.click(check);

    expect(screen.getByRole("img", { name: "Correct answer" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Your answer, incorrect" })).toBeTruthy();
    expect(screen.getByText("Incorrect, the answer is B")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Show explanation for B" }));
    expect(screen.getByText("Why B is supported.")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.queryByRole("img", { name: "Correct answer" })).toBeNull();
  });

  it("says so when the question is not in the bank", async () => {
    renderAt("/question/lr/151/4/99");
    expect(await screen.findByText("PT151 Section 4 Question 99 is not in the question bank.")).toBeTruthy();
  });

  it("says so when the section file does not exist", async () => {
    renderAt("/question/lr/999/1/1");
    expect(await screen.findByText("PT999 Section 1 Question 1 is not in the question bank.")).toBeTruthy();
  });

  it("rejects an invalid address without fetching", async () => {
    renderAt("/question/lr/151/4/abc");
    expect(await screen.findByText("This question link is not valid.")).toBeTruthy();
    await waitFor(() => expect(fetchMock).not.toHaveBeenCalled());
  });

  it("reports a failed load", async () => {
    fetchMock.mockImplementation(async () => {
      throw new Error("offline");
    });
    renderAt("/question/lr/151/4/10");
    expect(await screen.findByRole("alert")).toBeTruthy();
  });
});
