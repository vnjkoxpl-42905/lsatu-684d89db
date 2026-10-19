/**
 * The TEST picker label used to read "Loading…" whenever the picker was
 * disabled, and it is disabled after a failed fetch as well as during one.
 * This drives the REAL address-index hook (unlike QuestionFinder.test.tsx,
 * which mocks it) against a fetch that fails and then recovers.
 */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./useQuestionFinderBanks", () => ({
  useQuestionFinderBanks: () => ({
    loading: false,
    error: null,
    lrFailed: false,
    rcFailed: false,
    retry: vi.fn(),
    lr: [],
    rcPassages: [],
    rcQuestions: [],
  }),
}));

const GOOD_INDEX = {
  tests: [{ pt: 140, sections: [{ section: 4, lr: [], rc: [{ id: 14, position: 1, title: "A", questions: [{ id: 1588, number: 1 }] }] }] }],
};

describe("QuestionFinder address index states", () => {
  const realFetch = globalThis.fetch;
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    globalThis.fetch = realFetch;
  });

  it("says it could not load, not Loading, once the fetch has failed, and Retry recovers", async () => {
    // Fresh module so the hook's module-level cache starts empty.
    const { default: Finder } = await import("./QuestionFinder");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503, json: async () => ({}) })
      .mockResolvedValueOnce({ ok: true, status: 200, json: async () => GOOD_INDEX });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    render(
      <MemoryRouter>
        <Finder returnTo="/classroom" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /find a question/i }));
    const dialog = screen.getByRole("dialog", { name: /find a question/i });

    const alert = await within(dialog).findByRole("alert");
    expect(alert).toHaveTextContent(/Question addresses could not be loaded/);

    const testSelect = within(dialog).getByLabelText("Test") as HTMLSelectElement;
    expect(testSelect).toBeDisabled();
    expect(within(dialog).queryByText("Loading…")).toBeNull();
    expect(within(dialog).getByRole("option", { name: "Couldn't load tests" })).toBeInTheDocument();

    fireEvent.click(within(alert).getByRole("button", { name: "Retry" }));

    await waitFor(() => expect(testSelect).not.toBeDisabled());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(within(dialog).queryByRole("alert")).toBeNull();
    expect(within(dialog).getByRole("option", { name: "PT 140" })).toBeInTheDocument();
  });

  it("still says Loading while the request is genuinely in flight", async () => {
    const { default: Finder } = await import("./QuestionFinder");
    let release!: (value: unknown) => void;
    globalThis.fetch = vi.fn(
      () => new Promise((resolve) => { release = resolve; }),
    ) as unknown as typeof fetch;

    render(
      <MemoryRouter>
        <Finder returnTo="/classroom" />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: /find a question/i }));
    const dialog = screen.getByRole("dialog", { name: /find a question/i });

    expect(within(dialog).getByRole("option", { name: "Loading…" })).toBeInTheDocument();
    expect(within(dialog).queryByRole("alert")).toBeNull();

    await waitFor(() => expect(globalThis.fetch).toHaveBeenCalled());
    release({ ok: true, status: 200, json: async () => GOOD_INDEX });
    await waitFor(() => expect(within(dialog).getByLabelText("Test")).not.toBeDisabled());
  });
});
