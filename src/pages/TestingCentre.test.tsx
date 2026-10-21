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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, beforeAll, describe, expect, it, vi } from "vitest";
import TestingCentre from "./TestingCentre";
import { listPracticeTestRuns } from "@/lib/practiceTest";


const officialEntry = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock('@/lib/timedPracticeTestEntry', () => ({ prepareOfficialPracticeTest: officialEntry.prepare }));
vi.mock('@/lib/practiceTestStore', async () => {
  const actual = await vi.importActual<typeof import('@/lib/practiceTestStore')>('@/lib/practiceTestStore');
  return { ...actual, listAccountPracticeTestRuns: async () => listPracticeTestRuns(), abandonAccountPracticeTestRun: async (_owner: string, run: { id: string }) => {
    const key = `lsatu:practice-test:${run.id}`;
    const saved = JSON.parse(localStorage.getItem(key)!);
    localStorage.setItem(key, JSON.stringify({ ...saved, status: 'abandoned' }));
  } };
});
vi.mock('@/lib/practiceSectionAttempts', () => ({ listPracticeSectionAttempts: async () => [] }));
beforeEach(() => { officialEntry.prepare.mockReset(); officialEntry.prepare.mockResolvedValue('new-protected-run'); });

const navigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigate };
});

/**
 * The practice-test door reads the student's standing timing mode, because its
 * paces are percentages of that rather than of a flat 35:00. Mutable so a test
 * can sit an accommodated student down.
 */
const settingsMock: { defaultTimingMode: "35" | "52.5" | "70" | "unlimited" } = {
  defaultTimingMode: "35",
};
const profileTimingMock = { status: 'saved' };
// Who is looking. Most tests are a student with the Practice tests switch, who
// sees the whole bank; the assigned-only tests flip it off.
const access = vi.hoisted(() => ({
  permissions: { loading: false, is_admin: false, has_practice_access: true },
  assignedPts: [] as number[],
}));

vi.mock("@/contexts/AuthContext", () => ({
  useAuth: () => ({ user: { id: "student-1" }, authReady: true }),
}));

vi.mock("@/hooks/useUserPermissions", () => ({
  useUserPermissions: () => access.permissions,
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => {
      const chain = {
        select: () => chain,
        eq: () => chain,
        neq: () => Promise.resolve({ data: access.assignedPts.map((pt) => ({ pt })), error: null }),
      };
      return chain;
    },
  },
}));

vi.mock("@/contexts/UserSettingsContext", () => ({
  useUserSettings: () => ({ settings: settingsMock, profileTimingStatus: profileTimingMock.status }),
}));

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
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <TestingCentre />
      </MemoryRouter>
    </QueryClientProvider>,
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
  /**
   * "Begin practice test" before a PrepTest is chosen. It was a bare
   * `disabled`, which Tab skips, so a keyboard user never met the button and
   * was never told why the door would not open; sighted students saw a
   * button half a shade lighter and pressed it.
   */
  describe("the Begin button before a PrepTest is chosen", () => {
    it("stays reachable, says it is unavailable, and names what is missing", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      const begin = await screen.findByRole("button", { name: /Begin practice test/ });

      expect(begin.hasAttribute("disabled")).toBe(false);
      expect(begin.getAttribute("aria-disabled")).toBe("true");
      const hint = document.getElementById(begin.getAttribute("aria-describedby")!)!;
      expect(hint.textContent).toBe("Choose a PrepTest above to begin.");
      expect(hint.getAttribute("role")).toBe("status");
    });

    it("sends a press to the PrepTest field instead of starting nothing", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      fireEvent.click(await screen.findByRole("button", { name: /Begin practice test/ }));

      expect(document.activeElement).toBe(screen.getByRole("combobox", { name: /PREPTEST/i }));
      expect(listPracticeTestRuns()).toHaveLength(0);
      expect(navigate).not.toHaveBeenCalled();
    });

    it("clears the hint once a PrepTest is chosen", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      const begin = await screen.findByRole("button", { name: /Begin practice test/ });
      openPrepTests();
      fireEvent.click(await screen.findByRole("option", { name: /PrepTest 131/ }));

      expect(begin.getAttribute("aria-disabled")).toBe("false");
      expect(begin.hasAttribute("aria-describedby")).toBe(false);
      expect(screen.queryByText(/Choose a PrepTest above to begin/)).toBeNull();
    });
  });

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

  /**
   * Opening a door used to scroll the panel itself to the top of the viewport.
   * The panel is taller than the viewport, so the page ran to its own scroll
   * maximum and took the room's name and the door that was just pressed with
   * it: measured at 1280x900, the title landed at -234px and 78% of the door
   * row was gone. The anchor is the door row now.
   *
   * jsdom has no layout, so every rect is zero and the effect's "already
   * visible" guard would always win. The panel's rect is stubbed off screen so
   * the branch that actually moves the page is the one under test.
   */
  /**
   * Stubs go on the element instances, not on Element.prototype. An own
   * property always shadows the prototype, which a prototype patch does not
   * reliably do here, and there is nothing to restore afterwards.
   */
  const stubScrollTargets = () => {
    const panel = document.getElementById("testing-door-panel") as HTMLElement;
    const doors = document.querySelector(".testing-doors") as HTMLElement;
    const onPanel = vi.fn();
    const onDoors = vi.fn();
    panel.scrollIntoView = onPanel;
    doors.scrollIntoView = onDoors;
    return { panel, doors, onPanel, onDoors };
  };

  it("scrolls the door row, not the panel, when it brings an opened panel into view", async () => {
    renderPage();
    const { panel, onPanel, onDoors } = stubScrollTargets();
    // jsdom has no layout, so every rect is zero and the effect's "already
    // visible" guard would always win. Put the panel off screen so the branch
    // that actually moves the page is the one under test.
    panel.getBoundingClientRect = () => ({ top: 5000, bottom: 6000, height: 1000 }) as DOMRect;

    fireEvent.click(screen.getByRole("button", { name: /Take a section/ }));

    // The effect lands after this tick, so the assertion has to wait for it.
    await waitFor(() => expect(onDoors).toHaveBeenCalledTimes(1));
    expect(onPanel).not.toHaveBeenCalled();
    expect(onDoors.mock.calls[0][0]).toMatchObject({ block: "start" });
  });

  /** The other half: a panel already on screen must not move the page at all. */
  it("leaves the page alone when the panel is already in view", async () => {
    renderPage();
    // jsdom's zero rects put the panel at top 0, which is "already visible", so
    // the real rect is left in place here on purpose.
    const { onPanel, onDoors } = stubScrollTargets();

    fireEvent.click(screen.getByRole("button", { name: /Take a section/ }));

    // Wait for the panel so the effect has certainly run, then assert it chose
    // to do nothing.
    await waitFor(() => expect(screen.getByTestId("section-selector")).toBeTruthy());
    expect(onDoors).not.toHaveBeenCalled();
    expect(onPanel).not.toHaveBeenCalled();
  });

  /**
   * Discard deletes a sitting that can be ninety minutes into a two-hour clock.
   * It used to do that on one click, and below 560px the control sits exactly
   * where a thumb lands. These two tests exist so the confirm cannot be
   * refactored away without a failure: the first pins that one click is not
   * enough, the second pins that two clicks still work.
   */
  const RUN_KEY = "lsatu:practice-test:test-run";
  const seedSitting = () =>
    localStorage.setItem(
      RUN_KEY,
      JSON.stringify({
        id: "test-run",
        pt: 159,
        pace: "standard",
        legs: [{ section: 1 }, { section: 2 }, { section: 3 }],
        currentLeg: 1,
        breakAfterLeg: 2,
        breakTaken: false,
        status: "in-progress",
        createdAt: "2026-09-09T05:00:00.000Z",
      }),
    );

  afterEach(() => localStorage.removeItem(RUN_KEY));

  it("does not delete a sitting on a single click of Discard", async () => {
    seedSitting();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Discard the unfinished PrepTest 159 exam/ }));

    // The sitting survives, and the room asks before it destroys anything.
    expect(localStorage.getItem(RUN_KEY)).toBeTruthy();
    expect(screen.getByText(/Discard this exam\?/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Keep the unfinished PrepTest 159 exam/ })).toBeTruthy();
  });

  it("keeps saved data and ends the sitting only on a confirmed Discard", async () => {
    seedSitting();
    renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /Discard the unfinished PrepTest 159 exam/ }));
    fireEvent.click(screen.getByRole("button", { name: /Keep the unfinished PrepTest 159 exam/ }));

    expect(localStorage.getItem(RUN_KEY)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Resume PrepTest 159/ })).toBeTruthy();

    fireEvent.click(await screen.findByRole("button", { name: /Discard the unfinished PrepTest 159 exam/ }));
    fireEvent.click(screen.getByRole("button", { name: /Yes, discard the unfinished PrepTest 159 exam/ }));

    await waitFor(() => expect(JSON.parse(localStorage.getItem(RUN_KEY)!).status).toBe("abandoned"));
    expect(localStorage.getItem(RUN_KEY)).toBeTruthy();
  });
  /**
   * The practice-test door's paces are percentages of the student's own clock.
   * They were absolute before, so a student carrying extra time who chose
   * "Standard" was handed a 35-minute section on every leg of a two-hour
   * sitting: less time than they are entitled to, in the room that exists to
   * rehearse test day.
   */
  describe("accommodated timing", () => {
    afterEach(() => {
      settingsMock.defaultTimingMode = "35";
      profileTimingMock.status = 'saved';
      // The test localStorage keeps its store in a closure, so Object.keys on
      // it returns method names. clear() is the only reliable sweep.
      localStorage.clear();
    });

    const beginPracticeTest = async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
      openPrepTests();
      fireEvent.click(await screen.findByRole("option", { name: /PrepTest 131/ }));
      fireEvent.click(screen.getByRole("button", { name: /Begin practice test/ }));
      // Read through the library's own reader: it walks localStorage.key(i),
      // which the test store supports, unlike Object.keys.
      await waitFor(() => expect(officialEntry.prepare).toHaveBeenCalled());
      const [, , pace, sectionSeconds] = officialEntry.prepare.mock.calls[0];
      return { pace, sectionSeconds };
    };

    it("shows an inactive capability error and creates no legacy sitting", async () => {
      officialEntry.prepare.mockRejectedValue(new Error('Protected sittings are not enabled'));
      await beginPracticeTest();
      expect(await screen.findByText('Protected sittings are not enabled')).toBeTruthy();
      expect(listPracticeTestRuns()).toHaveLength(0);
    });

    it("starts an unaccommodated sitting on the ordinary 35 minute clock", async () => {
      const run = await beginPracticeTest();
      expect(run.pace).toBe("standard");
      expect(run.sectionSeconds).toBe(35 * 60);
    });

    it("starts an accommodated sitting on the student's own clock, not on 35 minutes", async () => {
      settingsMock.defaultTimingMode = "52.5";
      const run = await beginPracticeTest();
      expect(run.pace).toBe("standard");
      expect(run.sectionSeconds).toBe(52.5 * 60);
    });

    it("uses the profile's untimed default for a new sitting", async () => {
      settingsMock.defaultTimingMode = "unlimited";
      const run = await beginPracticeTest();
      expect(run.pace).toBe("untimed");
      expect(run.sectionSeconds).toBeNull();
    });

    it("waits for profile timing before starting with an untouched default", async () => {
      profileTimingMock.status = 'loading';
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
      openPrepTests();
      fireEvent.click(await screen.findByRole("option", { name: /PrepTest 131/ }));
      const begin = screen.getByRole("button", { name: /Begin practice test/ });
      expect(begin.getAttribute('aria-disabled')).toBe('true');
      fireEvent.click(begin);
      expect(officialEntry.prepare).not.toHaveBeenCalled();
      expect(screen.getByText('Checking your profile timing…')).toBeTruthy();
    });

    it("allows an explicitly chosen clock while the default is still loading", async () => {
      profileTimingMock.status = 'loading';
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
      openPrepTests();
      fireEvent.click(await screen.findByRole("option", { name: /PrepTest 131/ }));
      fireEvent.click(screen.getByRole("combobox", { name: /Timing/i }));
      fireEvent.click(await screen.findByRole("option", { name: /Untimed/ }));
      fireEvent.click(screen.getByRole("button", { name: /Begin practice test/ }));
      await waitFor(() => expect(officialEntry.prepare).toHaveBeenCalled());
      expect(officialEntry.prepare.mock.calls[0].slice(2)).toEqual(['untimed', null]);
    });

    /**
     * The short-RC caveat printed "the clock is the real 35:00" as a literal.
     * That stopped being true the moment this door started honouring the
     * student's own timing mode: the control above it said 52:30 and the
     * paragraph under it said 35:00.
     */
    it("states the real clock in the short-RC caveat, not a hard-coded 35:00", async () => {
      settingsMock.defaultTimingMode = "52.5";
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
      openPrepTests();
      // PT 130 is the mocked PrepTest whose RC section is short.
      fireEvent.click(await screen.findByRole("option", { name: /PrepTest 130/ }));

      const caveat = await screen.findByText(
        (_, el) => el?.tagName === "P" && /runs a few questions short/.test(el.textContent ?? ""),
      );
      expect(caveat.textContent).toContain("the clock is the real 52:30");
      expect(caveat.textContent).not.toContain("35:00");
    });

    it("drops the clock clause entirely when the sitting is untimed", async () => {
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
      openPrepTests();
      fireEvent.click(await screen.findByRole("option", { name: /PrepTest 130/ }));

      fireEvent.click(screen.getByRole("combobox", { name: /Timing/i }));
      fireEvent.click(await screen.findByRole("option", { name: /Untimed/ }));

      const caveat = await screen.findByText(
        (_, el) => el?.tagName === "P" && /runs a few questions short/.test(el.textContent ?? ""),
      );
      // No clock, so no assertion about one. The sentence still reads.
      expect(caveat.textContent).not.toContain("the clock is the real");
      expect(caveat.textContent).toContain("All four passages are there, so the");
    });

    it("states the clock the accommodated student will actually get", async () => {
      settingsMock.defaultTimingMode = "70";
      renderPage();
      fireEvent.click(screen.getByRole("button", { name: /Take a practice test/ }));
      await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
      // The note that tells them the standing setting is in play at all.
      expect(screen.getByText(/You have double time\./)).toBeTruthy();
    });
  });
});

describe("Testing Centre for a student with assigned practice tests only", () => {
  afterEach(() => {
    access.permissions = { loading: false, is_admin: false, has_practice_access: true };
    access.assignedPts = [];
  });

  it("offers only the assigned PrepTest, and no section door", async () => {
    access.permissions = { loading: false, is_admin: false, has_practice_access: false };
    access.assignedPts = [131];
    renderPage();

    expect(screen.queryByRole("button", { name: /Take a section/ })).toBeNull();
    await waitFor(() => screen.getByRole("combobox", { name: /PREPTEST/i }));
    openPrepTests();

    expect(await screen.findByRole("option", { name: /PrepTest 131/ })).toBeTruthy();
    expect(screen.queryByRole("option", { name: /PrepTest 130/ })).toBeNull();
  });

  it("says plainly when nothing has been assigned yet", async () => {
    access.permissions = { loading: false, is_admin: false, has_practice_access: false };
    access.assignedPts = [];
    renderPage();

    expect(await screen.findByText(/No practice test has been assigned to you yet/)).toBeTruthy();
  });
});
