/**
 * The Testing Centre's two doors, and the honesty copy behind the second one.
 *
 * The interesting case is the short Reading Comprehension section. An earlier
 * cut of this feature refused those PrepTests outright, which left 11 of 58
 * sittable and read on screen as "we only have 11 tests". They are offered now,
 * with the shortfall stated — so the test that matters is that the statement
 * appears exactly when it is true and not when it is not.
 */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeAll, describe, expect, it, vi } from "vitest";
import TestingCentre from "./TestingCentre";

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

vi.mock("@/contexts/QuestionBankContext", () => ({
  useQuestionBank: () => ({
    manifest: {
      sections: [
        { pt: 130, section: 1, count: 25, filename: "PT130-S1-LR.json" },
        { pt: 130, section: 3, count: 25, filename: "PT130-S3-LR.json" },
        { pt: 131, section: 1, count: 25, filename: "PT131-S1-LR.json" },
        { pt: 131, section: 3, count: 26, filename: "PT131-S3-LR.json" },
      ],
    },
    isLoading: false,
    error: null,
  }),
}));

/** PT 130 has a short RC section; PT 131 has a full one. */
const passage = (preptest: number, passageId: number, setNumber: number, questionCount: number) => ({
  passageId,
  section: 4,
  setNumber,
  title: `Passage ${setNumber}`,
  topic: "Science",
  format: "Analysis",
  frameworks: [],
  difficulty: 3,
  questionCount,
  explainedCount: questionCount,
  questionIds: Array.from({ length: questionCount }, (_, i) => passageId * 100 + i),
  firstWords: "…",
  preptest,
});

vi.mock("@/features/rc/lib/rcBank", () => ({
  loadAllIndexPassages: () =>
    Promise.resolve([
      passage(130, 1, 1, 5),
      passage(130, 2, 2, 5),
      passage(130, 3, 3, 5),
      passage(130, 4, 4, 4),
      passage(131, 5, 1, 7),
      passage(131, 6, 2, 7),
      passage(131, 7, 3, 7),
      passage(131, 8, 4, 6),
    ]),
}));

vi.mock("@/components/drill/SectionSelector", () => ({
  SectionSelector: () => <div data-testid="section-selector" />,
}));

/**
 * Radix Select drives its trigger through the Pointer Events capture API, which
 * jsdom does not implement. Without these the component throws on open, which
 * is a gap in the environment rather than anything about this page.
 */
beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.scrollIntoView = () => undefined;
});

const renderPage = () =>
  render(
    <MemoryRouter>
      <TestingCentre />
    </MemoryRouter>,
  );

/**
 * The PrepTest field is a searchable combobox: a popover over a command list,
 * opened by clicking its trigger. Queried by accessible name, which is the
 * point of the aria-labelledby on it — <label for> does not name a <button>,
 * so before that this control announced its value and never its field.
 */
const openPrepTests = () =>
  fireEvent.click(screen.getByRole("combobox", { name: /PREPTEST/i }));

/** Typing into the open picker's search box. */
const searchPrepTests = (query: string) =>
  fireEvent.change(screen.getByPlaceholderText(/Search by number/i), {
    target: { value: query },
  });

describe("Testing Centre", () => {
  it("offers exactly two doors", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Take a section/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Take a practice test/ })).toBeTruthy();
  });

  it("opens the section launcher behind the first door", () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Take a section/ }));
    expect(screen.getByTestId("section-selector")).toBeTruthy();
  });

  it("offers a PrepTest whose RC section is short, and says so", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));

    await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
    openPrepTests();

    // Both PrepTests are offered. Under the old rule PT 130 was hidden.
    const short = await screen.findByRole("option", { name: /PrepTest 130/ });
    expect(screen.getByRole("option", { name: /PrepTest 131/ })).toBeTruthy();

    fireEvent.click(short);

    // 25 + 25 LR + 19 RC. The count is stated, not rounded or hidden.
    await screen.findByText((_, el) => el?.tagName === "P" && /69 scored questions/.test(el.textContent ?? ""));
    expect(
      screen.getByText((_, el) => el?.tagName === "P" && /runs a few questions short/.test(el.textContent ?? "")),
    ).toBeTruthy();
  });

  it("puts the newest PrepTest first", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));

    await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
    openPrepTests();

    // 59 of these ship. Ascending order buried every test a student would
    // actually reach for under fifty they would not.
    const offered = (await screen.findAllByRole("option")).map((el) => el.textContent);
    expect(offered[0]).toMatch(/PrepTest 131/);
    expect(offered[1]).toMatch(/PrepTest 130/);
  });

  it("finds a PrepTest by number instead of by scrolling", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));

    await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
    openPrepTests();
    await screen.findByRole("option", { name: /PrepTest 130/ });

    searchPrepTests("131");

    await waitFor(() => {
      expect(screen.queryByRole("option", { name: /PrepTest 130/ })).toBeNull();
    });
    expect(screen.getByRole("option", { name: /PrepTest 131/ })).toBeTruthy();
  });

  it("tells a screen reader which door opened the panel", () => {
    renderPage();
    const door = screen.getByRole("button", { name: /Take a practice test/ });

    // aria-pressed said "this button is on". It is a disclosure: the panel it
    // opens is a separate region below both doors, and aria-controls is the
    // only thing that says which door produced it.
    expect(door.getAttribute("aria-pressed")).toBeNull();
    expect(door.getAttribute("aria-expanded")).toBe("false");

    fireEvent.click(door);
    expect(door.getAttribute("aria-expanded")).toBe("true");
    const panelId = door.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId as string)).toBeTruthy();
  });

  it("stays quiet about length when the RC section is a real one", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));

    await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
    openPrepTests();

    fireEvent.click(await screen.findByRole("option", { name: /PrepTest 131/ }));

    // 25 + 26 LR + 27 RC, a real sitting: the shortfall note must not appear.
    await screen.findByText((_, el) => el?.tagName === "P" && /78 scored questions/.test(el.textContent ?? ""));
    expect(
      screen.queryByText((_, el) => el?.tagName === "P" && /runs a few questions short/.test(el.textContent ?? "")),
    ).toBeNull();
  });
});
