/**
 * What the section launcher tells a student before they commit.
 *
 * Two pieces of copy are load-bearing here. "Fresh" is our word for a section
 * with no attempts against it, and on its own it is a filter nobody can read.
 * And every field on this panel states a choice while none of them says what
 * happens once the choice is made — a student pressing Start is committing to
 * the whole section under a clock, and should know that before they press it.
 *
 * The commitment line has to be conditional in two directions: it cannot quote
 * a question count before a section is chosen, and it cannot promise a clock
 * that Unlimited does not start.
 */
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SectionSelector } from './SectionSelector';
import type { SectionFreshness } from '@/lib/sectionFreshness';

const rcTestState = vi.hoisted(() => ({
  passages: [] as unknown[],
  freshness: new Map<string, SectionFreshness>(),
  manualEnabled: false,
  coverage: true,
}));

vi.mock('@/contexts/UserSettingsContext', () => ({
  useUserSettings: () => ({ settings: { defaultTimingMode: '35' } }),
}));

vi.mock('@/hooks/useClassId', () => ({
  useClassId: () => ({ classId: 'class-1', loading: false }),
}));

/** Nothing answered, so every section reads fresh and both filters keep them. */
vi.mock('@/lib/sectionFreshness', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/sectionFreshness')>('@/lib/sectionFreshness');
  return { ...actual, fetchAnsweredQids: () => Promise.resolve(new Set<string>()) };
});

/** Section 1 is 25 questions, section 3 is 26. The count on screen is this one. */
vi.mock('@/lib/questionLoader', () => ({
  questionBank: {
    getSection: (_pt: number, section: number) =>
      Array.from({ length: section === 1 ? 25 : 26 }, (_, i) => ({ qid: `q${section}-${i}` })),
  },
}));

vi.mock('@/features/rc/lib/rcBank', () => ({
  loadAllIndexPassages: () => Promise.resolve(rcTestState.passages),
}));

vi.mock('@/features/rc/lib/rcSections', async () => {
  const actual =
    await vi.importActual<typeof import('@/features/rc/lib/rcSections')>('@/features/rc/lib/rcSections');
  return {
    ...actual,
    fetchRcSectionFreshness: () => Promise.resolve(rcTestState.freshness),
  };
});

vi.mock('@/lib/timedSectionAdoption', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/timedSectionAdoption')>('@/lib/timedSectionAdoption');
  return {
    ...actual,
    manualSectionsEnabled: () => Promise.resolve(rcTestState.manualEnabled),
    manualSectionCoverage: () => rcTestState.coverage,
  };
});

/** Two PrepTests, deliberately listed oldest-first so the ordering is earned. */
const manifest = {
  sections: [
    { pt: 130, section: 1, count: 25, filename: 'PT130-S1-LR.json' },
    { pt: 130, section: 3, count: 26, filename: 'PT130-S3-LR.json' },
    { pt: 131, section: 1, count: 25, filename: 'PT131-S1-LR.json' },
  ],
} as unknown as Parameters<typeof SectionSelector>[0]['manifest'];

function buildRcPassageFixtures(pt: number, section: number) {
  return [1, 2, 3, 4].map((setNumber) => ({
    preptest: pt,
    section,
    setNumber,
    passageId: pt * 100 + section * 10 + setNumber,
    title: `PT${pt} S${section} P${setNumber}`,
    topic: 'Science',
    format: 'Standard (Non-Comparative)',
    frameworks: [],
    difficulty: 3,
    questionCount: 7,
    explainedCount: 7,
    questionIds: [pt * 1000 + section * 100 + setNumber],
    firstWords: 'Opening words',
  }));
}

/** Radix Select drives its trigger through pointer-capture APIs jsdom lacks. */
beforeAll(() => {
  const proto = window.HTMLElement.prototype as unknown as Record<string, unknown>;
  proto.hasPointerCapture = () => false;
  proto.setPointerCapture = () => undefined;
  proto.releasePointerCapture = () => undefined;
  proto.scrollIntoView = () => undefined;
});

beforeEach(() => {
  rcTestState.passages = [];
  rcTestState.freshness = new Map();
  rcTestState.manualEnabled = false;
  rcTestState.coverage = true;
});

/** Routed: the timing popover carries the accommodations note, which links out. */
const renderSelector = (props?: Partial<Parameters<typeof SectionSelector>[0]>) =>
  render(
    <MemoryRouter>
      <SectionSelector
        manifest={manifest}
        onStartSection={vi.fn()}
        onCancel={vi.fn()}
        {...props}
      />
    </MemoryRouter>,
  );

/**
 * Each trigger is found through the text it is currently showing, and opened by
 * keyboard: Radix's pointer path needs layout and capture APIs jsdom does not
 * provide, and the keyboard path is the same open.
 */
const openSelectShowing = async (text: RegExp) => {
  const trigger = (await screen.findByText(text)).closest('[role="combobox"]') as HTMLElement;
  trigger.focus();
  fireEvent.keyDown(trigger, { key: 'Enter', code: 'Enter' });
};

/**
 * The PrepTest field is a Popover, not a Select, so it opens on click rather
 * than on the Select keyboard path above. Both doors of the Testing Centre now
 * share this one control; it used to be a 54-row scroll here and a searchable
 * combobox on the other door, for the same decision.
 */
const openPrepTests = async () => {
  fireEvent.click(await screen.findByRole('combobox', { name: /PrepTest/ }));
};

const searchPrepTests = async (query: string) => {
  fireEvent.change(await screen.findByPlaceholderText(/Search by number/), {
    target: { value: query },
  });
};

const pickSection = async () => {
  await openPrepTests();
  fireEvent.click(await screen.findByText(/^PrepTest 130$/));
  await openSelectShowing(/Select a section/);
  fireEvent.click(await screen.findByText(/^Section 3$/));
};

describe('SectionSelector', () => {
  it('names every field for a screen reader', async () => {
    renderSelector();
    await screen.findByText(/Select a PrepTest/);

    // <label for> does not name a <button>, and every trigger here is one, so
    // all three comboboxes used to announce a value and never a field.
    expect(screen.getByRole('combobox', { name: /Status/ })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /PrepTest/ })).toBeTruthy();
    expect(screen.getByRole('combobox', { name: /Section/ })).toBeTruthy();
  });

  it('says what each Status filter actually filters to', async () => {
    renderSelector();

    // The default is already legible on the closed trigger. "Any" carries no
    // gloss on purpose: it is the absence of the filter, not a second rule.
    await openSelectShowing(/Fresh · never attempted/);
    expect(await screen.findByText(/^Any$/)).toBeTruthy();
  });

  it("offers the PrepTests newest first, then that test's own sections", async () => {
    renderSelector();
    await openPrepTests();

    await screen.findByText(/^PrepTest 131$/);
    const tests = screen
      .getAllByRole('option')
      .map((el) => el.textContent)
      .filter((t): t is string => Boolean(t?.startsWith('PrepTest')));
    expect(tests).toEqual(['PrepTest 131', 'PrepTest 130']);

    fireEvent.click(await screen.findByText(/^PrepTest 130$/));
    await openSelectShowing(/Select a section/);
    const sections = screen
      .getAllByRole('option')
      .map((el) => el.textContent)
      .filter((t): t is string => Boolean(t?.startsWith('Section')));
    expect(sections).toEqual(['Section 1', 'Section 3']);
  });

  it('promises nothing before a section is chosen', async () => {
    renderSelector();
    await screen.findByText(/Select a PrepTest/);

    expect(screen.queryByText(/in their published order/)).toBeNull();
  });

  it('states the real question count and the clock once a section is chosen', async () => {
    renderSelector();
    await pickSection();

    // 26, from the bank the runner reads, not the manifest's own count.
    const line = await screen.findByText(/All 26 questions, in their published order\./);
    expect(line.textContent).toMatch(/The clock starts straight away\./);
    expect(line.textContent).toMatch(/blind review comes after/);
  });

  it('filters the PrepTests by substring, not by fuzzy score', async () => {
    renderSelector();
    await openPrepTests();
    await screen.findByText(/^PrepTest 131$/);

    // commandScore keeps "PrepTest 130" alive for the query 131, because the
    // characters are all present in order. A PrepTest number is an identifier.
    await searchPrepTests('131');
    await waitFor(() =>
      expect(screen.getAllByRole('option').map((el) => el.textContent)).toEqual([
        'PrepTest 131',
      ]),
    );
  });

  it('announces how many PrepTests a search left', async () => {
    renderSelector();
    await openPrepTests();
    await screen.findByText(/^PrepTest 131$/);

    // Filtering is a status change with no other signal for a screen reader:
    // the list collapsing is a visual event only.
    // Several live regions share this panel now (the freshness line is one),
    // so the count is found by what it says rather than as the only status.
    await searchPrepTests('130');
    await waitFor(() =>
      expect(screen.getAllByRole('status').map((el) => el.textContent)).toContain('1 PrepTest'),
    );
  });

  it('puts the freshness line in a live region that exists before it has anything to say', async () => {
    renderSelector();

    // The loading text is inside a region that was already in the tree, so
    // the change from "checking" to nothing (or to an error) is announced.
    // Added-with-its-text regions are skipped by most screen readers.
    const live = screen
      .getAllByRole('status')
      .find((el) => /Checking what you have worked/.test(el.textContent ?? ''));
    expect(live).toBeTruthy();
    expect(live!.getAttribute('aria-live')).toBe('polite');

    await waitFor(() => expect(live!.textContent).toBe(''));
    // Still there, still a status, with nothing to say.
    expect(live!.isConnected).toBe(true);
    expect(live!.getAttribute('role')).toBe('status');
  });

  it('says the timing trigger opens a dialog holding a listbox, because it does', async () => {
    renderSelector();
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());

    // The popup holds the pace rows and, under them, two steppers and a
    // link. A listbox may contain only options, so the whole popup cannot
    // be one: the rows are the listbox, the surface around them is a dialog.
    const trigger = screen.getByRole('combobox', { name: /Timing/i });
    expect(trigger.getAttribute('aria-haspopup')).toBe('dialog');
    expect(trigger.getAttribute('aria-labelledby')).toBeTruthy();
    expect(trigger.textContent).toMatch(/Standard/);

    fireEvent.click(trigger);
    const list = await screen.findByRole('listbox', { name: /Pace/ });
    expect(list.closest('[role="dialog"]')).toBeTruthy();
    // This door restricts the picker to three paces, so there are no
    // steppers here; the picker's own test checks they sit outside the list.
  });

  it('does not promise a clock that Unlimited never starts', async () => {
    renderSelector();

    // Let the freshness read settle before opening the popover. The picker
    // defines its option rows inside its own render, so any re-render swaps
    // them for fresh nodes and a row captured beforehand is left detached;
    // clicking it then does nothing. A student clicks whatever is on screen
    // and never meets this; a test holding a reference across a render does.
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());

    // Named by its visible text now, so the name carries the current value
    // rather than only the field. It was aria-label="Section timing", which
    // announced the field and dropped "Standard / 35:00".
    fireEvent.click(screen.getByRole('combobox', { name: /Timing/i }));
    fireEvent.click(await screen.findByRole('option', { name: /Unlimited/ }));
    await pickSection();

    const line = await screen.findByText(
      (_, el) => el?.tagName === 'P' && /No clock, so take as long as you want\./.test(el.textContent ?? ''),
    );
    expect(line.textContent).toMatch(/All 26 questions, in their published order\./);
    expect(line.textContent).not.toMatch(/The clock begins only after you press Start section/);
  });

  it('shows the Status filter for RC sections and filters out attempted RC sections under Fresh', async () => {
    rcTestState.passages = [
      ...buildRcPassageFixtures(140, 4),
      ...buildRcPassageFixtures(141, 1),
    ];
    rcTestState.freshness = new Map([
      ['140-4', { pt: 140, section: 4, total: 28, unseen: 21, percentFresh: 75, isFresh: false }],
      ['141-1', { pt: 141, section: 1, total: 28, unseen: 28, percentFresh: 100, isFresh: true }],
    ]);

    renderSelector({ initialKind: 'rc' });
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());

    expect(screen.getByRole('combobox', { name: /Status/ })).toBeTruthy();

    await openPrepTests();
    await screen.findByText(/^PrepTest 141$/);
    const freshTests = screen
      .getAllByRole('option')
      .map((el) => el.textContent)
      .filter((t): t is string => Boolean(t?.startsWith('PrepTest')));
    expect(freshTests).toEqual(['PrepTest 141']);

    await openSelectShowing(/Fresh · never attempted/);
    fireEvent.click(await screen.findByText(/^Any$/));

    await openPrepTests();
    await screen.findByText(/^PrepTest 140$/);
    const allTests = screen
      .getAllByRole('option')
      .map((el) => el.textContent)
      .filter((t): t is string => Boolean(t?.startsWith('PrepTest')));
    expect(allTests).toEqual(['PrepTest 141', 'PrepTest 140']);
  });

  it('launches an RC section directly to newManualSectionHref when manualSectionsEnabled is true and pace is mapped', async () => {
    rcTestState.passages = buildRcPassageFixtures(141, 1);
    rcTestState.freshness = new Map([
      ['141-1', { pt: 141, section: 1, total: 28, unseen: 28, percentFresh: 100, isFresh: true }],
    ]);
    rcTestState.manualEnabled = true;

    const onStartRcSection = vi.fn();
    renderSelector({ initialKind: 'rc', onStartRcSection });
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());

    await openPrepTests();
    fireEvent.click(await screen.findByText(/^PrepTest 141$/));
    await openSelectShowing(/Select a section/);
    fireEvent.click(await screen.findByText(/^Section 1$/));

    fireEvent.click(screen.getByRole('button', { name: /Start Section/i }));
    await waitFor(() => expect(onStartRcSection).toHaveBeenCalledTimes(1));
    expect(onStartRcSection.mock.calls[0][0]).toMatch(
      /^\/testing\/sections\/[0-9a-f-]+\?kind=rc&pt=141&section=1&pace=standard$/,
    );
  });

  it('falls back to rcSectionHref when manualSectionsEnabled is false', async () => {
    rcTestState.passages = buildRcPassageFixtures(141, 1);
    rcTestState.freshness = new Map([
      ['141-1', { pt: 141, section: 1, total: 28, unseen: 28, percentFresh: 100, isFresh: true }],
    ]);
    rcTestState.manualEnabled = false;

    const onStartRcSection = vi.fn();
    renderSelector({ initialKind: 'rc', onStartRcSection });
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());

    await openPrepTests();
    fireEvent.click(await screen.findByText(/^PrepTest 141$/));
    await openSelectShowing(/Select a section/);
    fireEvent.click(await screen.findByText(/^Section 1$/));

    fireEvent.click(screen.getByRole('button', { name: /Start Section/i }));
    await waitFor(() => expect(onStartRcSection).toHaveBeenCalledTimes(1));
    expect(onStartRcSection.mock.calls[0][0]).toBe(
      '/rc?passages=14111%2C14112%2C14113%2C14114&reveal=end_of_set&timing=standard&start=1&timedSection=manual-canonical',
    );
  });

  it.each([
    [true, /The clock begins only after you press Start section\./],
    [false, /The clock starts straight away\./],
  ])('words the RC clock truthfully when manualSectionsEnabled is %s', async (enabled, expected) => {
    rcTestState.passages = buildRcPassageFixtures(141, 1);
    rcTestState.freshness = new Map([
      ['141-1', { pt: 141, section: 1, total: 28, unseen: 28, percentFresh: 100, isFresh: true }],
    ]);
    rcTestState.manualEnabled = enabled;
    rcTestState.coverage = true;

    renderSelector({ initialKind: 'rc', onStartRcSection: vi.fn() });
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());
    await openPrepTests();
    fireEvent.click(await screen.findByText(/^PrepTest 141$/));
    await openSelectShowing(/Select a section/);
    fireEvent.click(await screen.findByText(/^Section 1$/));

    const line = await screen.findByText(/in their published order/);
    await waitFor(() => expect(line.textContent).toMatch(expected));
  });

  it('starts an RC section only once when Start is clicked twice quickly', async () => {
    rcTestState.passages = buildRcPassageFixtures(141, 1);
    rcTestState.freshness = new Map([
      ['141-1', { pt: 141, section: 1, total: 28, unseen: 28, percentFresh: 100, isFresh: true }],
    ]);
    rcTestState.manualEnabled = true;
    rcTestState.coverage = true;

    const onStartRcSection = vi.fn();
    renderSelector({ initialKind: 'rc', onStartRcSection });
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());
    await openPrepTests();
    fireEvent.click(await screen.findByText(/^PrepTest 141$/));
    await openSelectShowing(/Select a section/);
    fireEvent.click(await screen.findByText(/^Section 1$/));

    const start = screen.getByRole('button', { name: /Start Section/i });
    fireEvent.click(start);
    fireEvent.click(start);
    await waitFor(() => expect(onStartRcSection).toHaveBeenCalledTimes(1));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onStartRcSection).toHaveBeenCalledTimes(1);
  });

  it('falls back to rcSectionHref when the timing pace does not map to a protected pace', async () => {
    rcTestState.passages = buildRcPassageFixtures(141, 1);
    rcTestState.freshness = new Map([
      ['141-1', { pt: 141, section: 1, total: 28, unseen: 28, percentFresh: 100, isFresh: true }],
    ]);
    rcTestState.manualEnabled = true;

    const onStartRcSection = vi.fn();
    renderSelector({
      initialKind: 'rc',
      initialTiming: { mode: 'timed', percent: 125 },
      onStartRcSection,
    });
    await waitFor(() => expect(screen.queryByText(/Checking what you have worked/)).toBeNull());

    await openPrepTests();
    fireEvent.click(await screen.findByText(/^PrepTest 141$/));
    await openSelectShowing(/Select a section/);
    fireEvent.click(await screen.findByText(/^Section 1$/));

    fireEvent.click(screen.getByRole('button', { name: /Start Section/i }));
    await waitFor(() => expect(onStartRcSection).toHaveBeenCalledTimes(1));
    expect(onStartRcSection.mock.calls[0][0]).toBe(
      '/rc?passages=14111%2C14112%2C14113%2C14114&reveal=end_of_set&timing=standard&start=1&timedSection=manual-canonical',
    );
  });
});

