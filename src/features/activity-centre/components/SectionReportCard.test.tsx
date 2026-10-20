import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { SectionReportCard } from "./SectionReportCard";

/** No database behind a test. A section nobody has finished has none of these. */
const noModelRuns = () => Promise.resolve({});
import type { SectionGrade, SectionStimulusGrade } from "../api/types";
import { beforeEach, vi } from "vitest";

/*
 * The write itself is proved in `recall/disputes.test.ts`. What matters here is
 * that the card passes the RIGHT stimulus and sitting, and that it never
 * reports a success the write did not have.
 */
const raised: { stimulusSlug: string; attemptNo: number }[] = [];
let disputeResult: unknown = { ok: true, alreadyRaised: false };

vi.mock("../recall/disputes", () => ({
  raiseDispute: (input: { stimulusSlug: string; attemptNo: number }) => {
    raised.push(input);
    return Promise.resolve(disputeResult);
  },
}));

beforeEach(() => {
  raised.length = 0;
  disputeResult = { ok: true, alreadyRaised: false };
});

// The Report Card is the only thing a student ever sees of the grader, so the
// rules asserted here are the ones that would embarrass us quietly: an internal
// identifier on screen, a raw score presented as a verdict, or an em-dash in
// copy Joshua would never type.

function stimulus(over: Partial<SectionStimulusGrade> = {}): SectionStimulusGrade {
  return {
    slug: "PT105_S2_Q1",
    carried: 18,
    total: 21,
    percent: 86,
    band: "at-the-standard",
    missed: ["This applies to all employees."],
    decoysCarried: [],
    unjudged: [],
    reciting: false,
    listing: false,
    coloured: true,
    colourSpecific: true,
    dead_air_seconds: 0,
    ...over,
  };
}

const grade: SectionGrade = {
  assignment_id: "a1",
  attempt_no: 1,
  student_id: "s1",
  source_section: "PT105.S2",
  transcript_engine: "deepgram/nova-3",
  transcript_text: "…",
  grader_version: 1,
  graded_at: "2026-09-02T00:00:00Z",
  stimuli: [
    stimulus(),
    stimulus({ slug: "PT105_S2_Q2", percent: 100, carried: 12, total: 12, missed: [] }),
    stimulus({ slug: "PT105_S2_Q3", percent: 64, carried: 7, total: 11, band: "thin" }),
    // Kept apart from the thin one on purpose: a recital is not a worse score.
    // It carried everything, and that is exactly what makes it a failure.
    stimulus({ slug: "PT105_S2_Q4", percent: 100, carried: 12, total: 12, missed: [], reciting: true }),
  ],
  section: {
    accommodation: "standard",
    goal_minutes: 25,
    total_seconds: 1380,
    within_goal: true,
    mean_coverage: 79,
    stimuli_graded: 4,
    reciting_count: 1,
    listing_count: 0,
    uncoloured_count: 0,
    worst_dead_air_seconds: 1.2,
    dead_air_threshold_seconds: 4,
    decoy_failures: 1,
    clock: {},
  },
};

describe("meaning scores and detail coverage", () => {
  it("shows preserved meaning without hiding omitted incidental details", () => {
    const updated: SectionGrade = {
      ...grade,
      grader_version: 3,
      section: { ...grade.section, mean_coverage: 64, mean_meaning: 100, decoy_failures: 0,
        stimuli_graded: 1, stimuli_in_section: 2 },
      stimuli: [stimulus({ percent: 64, band: "thin", meaning_percent: 100,
        meaning_carried: 10, meaning_total: 10,
        missed: ["The office walls were blue."],
        incidental_misses: ["The office walls were blue."] })],
    };
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={updated} />);
    expect(screen.getAllByText("Meaning preserved").length).toBeGreaterThan(0);
    expect(screen.getByText("100% meaning preserved.")).toBeInTheDocument();
    expect(screen.getAllByText(/Detail coverage: 64%/).length).toBeGreaterThan(0);
    expect(screen.getByText("The office walls were blue. (not deducted from meaning)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Stimulus 1, Meaning preserved/ })).toBeInTheDocument();
  });

  it("does not invent meaning scores for historical grades", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={grade} />);
    expect(screen.queryByText("Meaning preserved")).not.toBeInTheDocument();
    expect(screen.getByText("86% held.")).toBeInTheDocument();
    expect(screen.queryByText(/not deducted from meaning/)).not.toBeInTheDocument();
  });
});

/**
 * One tick in the ledger, by its position.
 *
 * The accessible name carries the band and the open state as well as the
 * number, because a ledger of twenty-two identical "Stimulus N" buttons told a
 * screen reader nothing about the shape of the run. Tests reach a tick by role
 * and leading number so the rest of that name is free to improve.
 */
const tick = (n: number) =>
  screen.getByRole("button", { name: new RegExp("^Stimulus " + n + ",") });

describe("the card's structure", () => {
  it("has a heading outline, where it used to have none", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    const levels = [...document.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) =>
      Number(h.tagName[1]),
    );
    // Every section label was a `p`, so a screen reader's heading list was
    // empty on a surface with eight sections and a ledger of twenty-two.
    expect(levels.length).toBeGreaterThan(4);
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i += 1) {
      expect(levels[i], `heading ${i} skips a level`).toBeLessThanOrEqual(levels[i - 1] + 1);
    }
  });

  it("names itself and its band in one heading", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1.textContent).toContain("Report Card");
    // The band is the display line inside the same heading, so the heading
    // reads as "Report Card, Nearly there" rather than as a bare label.
    const band = h1.querySelector(".rc__display")?.textContent ?? "";
    expect(band).toBe("Nearly there");
  });

  it("carries no side stripe, which DESIGN.md bans", () => {
    const { container } = render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    // It was `border-l-2` in `--rc-signal`, the colour the brief reserves for
    // sound, on the one sentence that asks her to do something.
    expect(container.querySelector('[class*="border-l-2"]')).toBeNull();
  });
});

describe("the ledger as one control", () => {
  it("is a single tab stop, not twenty-two", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    const ticks = [...document.querySelectorAll(".rc__tick")];
    const reachable = ticks.filter((t) => t.getAttribute("tabindex") === "0");
    expect(ticks.length).toBeGreaterThan(1);
    // Tab lands on whichever stimulus is open; the arrows do the rest.
    expect(reachable).toHaveLength(1);
    expect(reachable[0].getAttribute("aria-current")).toBe("true");
  });

  it("moves with the arrows, and focus follows the selection", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    const ledger = document.querySelector(".rc__ledger") as HTMLElement;
    fireEvent.keyDown(ledger, { key: "ArrowRight" });
    expect(tick(2).getAttribute("aria-current")).toBe("true");
    expect(document.activeElement).toBe(tick(2));

    fireEvent.keyDown(ledger, { key: "End" });
    expect(tick(grade.stimuli.length).getAttribute("aria-current")).toBe("true");
    fireEvent.keyDown(ledger, { key: "Home" });
    expect(tick(1).getAttribute("aria-current")).toBe("true");
  });

  it("does not run off either end", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    const ledger = document.querySelector(".rc__ledger") as HTMLElement;
    fireEvent.keyDown(ledger, { key: "ArrowLeft" });
    expect(tick(1).getAttribute("aria-current")).toBe("true");
  });
});

describe("the focus set", () => {
  /*
   * Authored positions that are NOT the array index, which is the only shape
   * that tells the two readings apart. A section's weakest four can sit at
   * positions 11 to 14 as easily as at 1 to 4.
   */
  const weak: SectionGrade = {
    ...grade,
    stimuli: [
      stimulus({ slug: "PT105_S2_Q11", item_order: 11, percent: 95 }),
      stimulus({ slug: "PT105_S2_Q12", item_order: 12, percent: 100 }),
      stimulus({ slug: "PT105_S2_Q13", item_order: 13, percent: 41, band: "lost-it" }),
      stimulus({ slug: "PT105_S2_Q14", item_order: 14, percent: 52, band: "thin" }),
    ],
  };

  const chipText = () =>
    [...document.querySelectorAll(".rc__chip--dropped")].map((c) => c.textContent ?? "");

  it("names the stimulus it actually means", () => {
    /*
     * `item_order` is the authored position and 1-based, which is how the
     * ledger, the open stimulus and its heading all read it. The chips read it
     * as `(item_order ?? i) + 1`, so every one named the stimulus after the one
     * it meant: she was sent to run stimulus 15 again over a fault in 14, and
     * the ledger beside it disagreed.
     */
    render(
      <SectionReportCard grade={weak} loadModelRuns={noModelRuns} onStartFocusSet={vi.fn()} />,
    );
    // The set pads to its minimum, so all four are offered; the numbering is
    // what is under test.
    expect(chipText().map((t) => t.split(" · ")[0])).toEqual([
      "Stimulus 11",
      "Stimulus 12",
      "Stimulus 13",
      "Stimulus 14",
    ]);
  });

  it("falls back to array position on a grade written before positions were stored", () => {
    const older: SectionGrade = {
      ...weak,
      stimuli: weak.stimuli.map((s) => ({ ...s, item_order: undefined })),
    };
    render(
      <SectionReportCard grade={older} loadModelRuns={noModelRuns} onStartFocusSet={vi.fn()} />,
    );
    // `i` is an array index and 0-based, so the fallback keeps its + 1.
    expect(chipText().map((t) => t.split(" · ")[0])).toEqual([
      "Stimulus 1",
      "Stimulus 2",
      "Stimulus 3",
      "Stimulus 4",
    ]);
  });
});

describe("the move, which she has to be told the meaning of", () => {
  /** A grade with The Read measured, which is what puts the word on screen. */
  const withReads: SectionGrade = {
    ...grade,
    section: {
      ...grade.section,
      read_given_count: 3,
      read_matched_count: 2,
      no_read_count: 1,
    },
  };

  it("says what a move is before it says whether she found one", () => {
    const { container } = render(
      <SectionReportCard grade={withReads} loadModelRuns={noModelRuns} />,
    );
    const text = container.textContent ?? "";
    const defined = text.indexOf("The move is what an argument runs on");
    const used = text.indexOf("found the move");
    expect(defined, "the move is never defined for her").toBeGreaterThan(-1);
    expect(used, "the word is not on the card at all").toBeGreaterThan(-1);
    expect(defined, "she is told she found the move before being told what one is")
      .toBeLessThan(used);
  });

  it("keeps The Recall and The Read apart, because they fail differently", () => {
    render(<SectionReportCard grade={withReads} loadModelRuns={noModelRuns} />);
    // ADR 0025. Coverage is the memory half, The Read is the reasoning half.
    // Collapsing the card's "Your Read" into "The Recall" would erase the
    // distinction the second number exists to make.
    expect(screen.getByText(/Holding a stimulus is Coverage/)).toBeInTheDocument();
  });
});

describe("what the student sees", () => {
  it("leads with a band, not a raw verdict", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    // The headline band, plus the band of whichever stimulus is open. The
    // ledger draws a mark per stimulus rather than repeating four labels
    // twenty-two times, so the other bands are reached by opening them.
    expect(screen.getByText("At the standard")).toBeInTheDocument();
    fireEvent.click(tick(3));
    expect(screen.getByText("Thin")).toBeInTheDocument();
  });

  it("says how she did against her own time goal", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    expect(screen.getByText("23:00")).toBeInTheDocument();
    expect(screen.getByText("against a 25 minute goal")).toBeInTheDocument();
  });

  it("names the stimuli by position, never by the capture's identifier", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    expect(tick(1)).toBeInTheDocument();
    // The slug is the source bank's own id and means nothing to her.
    expect(document.body.textContent).not.toMatch(/PT105_S2_Q/);
  });

  it("shows what slipped, and says so plainly when nothing did", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    fireEvent.click(tick(1));
    expect(screen.getByText("This applies to all employees.")).toBeInTheDocument();

    fireEvent.click(tick(2));
    expect(screen.getByText("Nothing slipped on this one. You kept the whole thing.")).toBeInTheDocument();
  });

  it("tells her when she recited rather than retold", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    fireEvent.click(tick(4));
    // Scoped to the tip, not the summary line, which also mentions it.
    expect(
      screen.getByText(/Say it in your own words instead/),
    ).toBeInTheDocument();
  });

  it("never shows the grader's own machinery", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    for (const s of grade.stimuli) fireEvent.click(tick(grade.stimuli.indexOf(s) + 1));
    const text = document.body.textContent ?? "";
    // Decoys, grader versions and engine names are ours. A student reading
    // "decoy" would reasonably wonder what else we are not telling her.
    for (const leak of ["decoy", "grader", "nova-3", "deepgram", "unjudged", "colourSpecific"]) {
      expect(text.toLowerCase()).not.toContain(leak);
    }
  });

  it("contains no em-dash anywhere on screen", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    // Joshua never types one, and a stray em-dash reads as machine-written.
    expect(document.body.textContent ?? "").not.toMatch(/[—–]/);
  });
});

/*
 * A recital that carried everything.
 *
 * In the audit's run, stimulus 3 was read out verbatim during The Recall, was
 * correctly flagged, and still wore "At the standard, 20 of 20" in green. ADR
 * 0018 says coverage reached by reciting is a failure, and the row said the
 * opposite -- with the recital sentence buried inside the expanded half, which
 * is the half she has to go looking for.
 */
describe("a stimulus she said back word for word", () => {
  const recited: SectionGrade = {
    ...grade,
    stimuli: [
      stimulus({ slug: "PT105_S2_Q1", percent: 100, carried: 20, total: 20, missed: [], reciting: true }),
    ],
  };

  it("does not call it a success on the row she reads", () => {
    render(<SectionReportCard grade={recited} loadModelRuns={noModelRuns} />);
    expect(screen.queryByText("At the standard")).toBeNull();
  });

  it("wears no success colour", () => {
    const { container } = render(<SectionReportCard grade={recited} loadModelRuns={noModelRuns} />);
    const mark = container.querySelector(".rc__mark");
    expect(mark?.className).toContain("rc__mark--recited");
    expect(mark?.className).not.toContain("rc__mark--at-the-standard");
  });

  it("names the recital on the collapsed row, not only inside it", () => {
    const { container } = render(<SectionReportCard grade={recited} loadModelRuns={noModelRuns} />);
    // Present before anything is expanded. Scoped past the ledger, whose ticks
    // now carry the same phrase in their accessible names: a recited stimulus
    // was a mark and a number to a screen reader and nothing else.
    const outsideLedger = [...container.querySelectorAll("*")].filter(
      (el) => !el.closest(".rc__ledger") && el.children.length === 0,
    );
    expect(
      outsideLedger.some((el) => /said back word for word/i.test(el.textContent ?? "")),
    ).toBe(true);
  });

  it("still shows what it carried, because that reading is true", () => {
    render(<SectionReportCard grade={recited} loadModelRuns={noModelRuns} />);
    // The figure and the sentence, in that order. A Detail is our unit and she
    // never sees one enumerated; the percentage is the same statistic the
    // console leads with, under the same word, so one number is not a figure in
    // one place and a phrase in another.
    expect(screen.getByText("All of it came back.")).toBeInTheDocument();
    // The same statistic the console leads with, under the same word, so one
    // number is not a figure in one place and a phrase in another.
    expect(screen.getByText("100% held.")).toBeInTheDocument();
  });

  it("does not congratulate it inside the row either", () => {
    render(<SectionReportCard grade={recited} loadModelRuns={noModelRuns} />);
    fireEvent.click(tick(1));
    expect(screen.queryByText("You carried every detail in this one.")).toBeNull();
    expect(screen.getByText(/which is what saying it back word for word does/i)).toBeInTheDocument();
  });

  it("leaves an honest stimulus with its band", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    expect(screen.getAllByText("At the standard").length).toBeGreaterThan(0);
  });
});

describe("a grade with missing response rows", () => {
  const orders = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 14, 15, 16, 17, 19, 20, 21, 22, 24, 25, 26];
  const positioned = orders.map((itemOrder) =>
    stimulus({
      slug: `PT134_S3_Q${itemOrder}`,
      item_order: itemOrder,
    } as Partial<SectionStimulusGrade> & { item_order: number }),
  );
  const partial = {
    ...grade,
    source_section: "PT134.S3",
    stimuli: positioned,
    section: {
      ...grade.section,
      stimuli_graded: positioned.length,
      stimuli_in_section: 26,
    },
  } as SectionGrade;

  it("keeps each saved row's true stimulus number after a gap", () => {
    render(<SectionReportCard grade={partial} loadModelRuns={noModelRuns} />);
    expect(tick(9)).toBeInTheDocument();
    expect(screen.queryByText("Stimulus 8")).not.toBeInTheDocument();
  });

  it("names the four rows that did not save and what the headline counts", () => {
    render(<SectionReportCard grade={partial} loadModelRuns={noModelRuns} />);
    expect(screen.getByText(/4 of the 26 did not save/)).toBeInTheDocument();
    expect(
      screen.getByText("said back in your own words, across the 22 of 26 that saved"),
    ).toBeInTheDocument();
  });

  it("shows no missing-row notice for a complete section", () => {
    const complete = {
      ...partial,
      stimuli: Array.from({ length: 26 }, (_, i) =>
        stimulus({
          slug: `PT134_S3_Q${i + 1}`,
          item_order: i + 1,
        } as Partial<SectionStimulusGrade> & { item_order: number }),
      ),
      section: { ...partial.section, stimuli_graded: 26 },
    } as SectionGrade;
    render(<SectionReportCard grade={complete} loadModelRuns={noModelRuns} />);
    expect(screen.queryByText(/did not save/)).not.toBeInTheDocument();
  });

  it("falls back to array order without inventing a missing-row notice for a legacy grade", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    expect(tick(1)).toBeInTheDocument();
    expect(tick(2)).toBeInTheDocument();
    expect(tick(3)).toBeInTheDocument();
    expect(screen.queryByText(/did not save/)).not.toBeInTheDocument();
  });
});

/**
 * What the grader measured and the card used to throw away.
 *
 * Every field asserted below was computed on the trial run, stored in
 * `activity_section_grades`, and rendered nowhere. A number a student cannot
 * interrogate is a number she has to take on faith, and two of these are not
 * even about her: a stimulus the judge never answered for is counted as
 * missed, which scores her for our outage, and she was the only person in a
 * position to notice the total looked wrong.
 */
describe("the evidence behind the number", () => {
  const withSection = (over: Partial<SectionGrade["section"]>, stimuliOver?: SectionStimulusGrade[]) =>
    ({ ...grade, section: { ...grade.section, ...over }, stimuli: stimuliOver ?? grade.stimuli }) as SectionGrade;

  it("leads with the run's own band, not the percentage", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ mean_coverage: 91 })} />);
    // 91 is at the standard. The card used to print "91%" in 48px type with no
    // band at all, which is the exact thing its own docstring forbade.
    const hero = document.querySelector(".rc__display");
    expect(hero?.textContent).toBe("At the standard");
    expect(hero?.textContent).not.toMatch(/%/);
  });

  it("still says what she actually got, underneath", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ mean_coverage: 91 })} />);
    expect(screen.getByText("Held")).toBeInTheDocument();
    expect(screen.getByText("91%")).toBeInTheDocument();
  });

  it("shows The Read beside Coverage", () => {
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns} grade={withSection({ read_given_count: 3, read_matched_count: 2, no_read_count: 0 })}
      />,
    );
    expect(screen.getByText("Understood")).toBeInTheDocument();
    // Against every stimulus graded, not against the ones she gave a Read on.
    expect(screen.getByText("2 of 4")).toBeInTheDocument();
  });

  it("says the goal was missed on its condition, not on the clock", () => {
    // The spec's own rule: the goal counts only with every stimulus recalled,
    // coloured and given a Read. Finishing early with four skipped was being
    // reported as making the goal.
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ within_time: true, within_goal: false })} />);
    expect(screen.getByText(/Inside the time, but the goal only counts/)).toBeInTheDocument();
  });

  it("still answers the clock for a run graded before the flag existed", () => {
    // `within_time` is optional. A row written before it matched neither
    // branch, so a student got a time, a goal, and no verdict between them.
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={withSection({ within_time: undefined, within_goal: false, total_seconds: 2772 })}
      />,
    );
    expect(screen.getByText(/Over the goal/)).toBeInTheDocument();
  });

  it("does not let a stored flag outvote the time printed above it", () => {
    // 2772 seconds is 46:12 against a twenty-five minute goal. This is the
    // shape the audit caught in the harness: "28:32" over "Inside the time".
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={withSection({ within_time: true, within_goal: false, total_seconds: 2772 })}
      />,
    );
    expect(screen.getByText(/Over the goal/)).toBeInTheDocument();
    expect(screen.queryByText(/Inside the time/)).toBeNull();
  });

  it("says plainly when we could not mark part of the run", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ ungraded_count: 2 })} />);
    expect(screen.getByText(/2 stimuli could not be marked/)).toBeInTheDocument();
    expect(screen.getByText(/ours, not yours/)).toBeInTheDocument();
  });

  it("warns when its own check on the marking came back unhappy", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ decoy_failures: 1 })} />);
    expect(screen.getByText(/treat the number on one or two of these lightly/)).toBeInTheDocument();
  });

  it("shows a reaction that would have fitted any stimulus", () => {
    // Measured on 18 of 22 in the trial and shown on none. It is the one
    // standard the whole method turns on.
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns} grade={withSection({}, [stimulus({ coloured: true, colourSpecific: false })])}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.getByText(/would have fitted any stimulus/)).toBeInTheDocument();
  });

  it("shows where she froze inside a recall", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({}, [stimulus({ dead_air_seconds: 7 })])} />);
    fireEvent.click(tick(1));
    expect(screen.getByText(/quiet for 7s/)).toBeInTheDocument();
  });

  it("shows what the machine heard", () => {
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns} grade={withSection({}, [stimulus({ spoken: "so the director thinks exploiting is bad" })])}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.getByText("What you said")).toBeInTheDocument();
    expect(screen.getByText(/so the director thinks exploiting is bad/)).toBeInTheDocument();
  });

  it("offers a Clip when the recording is reachable, and none when it is not", () => {
    const one = [stimulus({ spoken: "x", recall_window_ms: { start: 1000, end: 4000 } })];
    const { unmount } = render(
      <SectionReportCard
        loadModelRuns={noModelRuns} grade={withSection({ audio_bucket: "drill-recordings", audio_path: "s1/a1.webm" }, one)}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.getByRole("button", { name: /hear it back/i })).toBeInTheDocument();
    unmount();

    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ audio_path: null }, one)} />);
    fireEvent.click(tick(1));
    expect(screen.queryByRole("button", { name: /hear it back/i })).not.toBeInTheDocument();
  });

  it("names the Attempt only when there has been more than one", () => {
    const { unmount } = render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    expect(document.body.textContent).not.toMatch(/Attempt/);
    unmount();
    render(<SectionReportCard grade={{ ...grade, attempt_no: 2 }} loadModelRuns={noModelRuns} />);
    expect(screen.getByText(/Attempt 2/)).toBeInTheDocument();
  });

  it("does not show a stimulus it could not mark as a score she earned", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({}, [stimulus({ ungraded: "judge timed out", carried: 0, percent: 0, band: "lost-it" })])} />);
    fireEvent.click(tick(1));
    expect(screen.getByText(/could not be marked/)).toBeInTheDocument();
    // And not the reason, which is ours.
    expect(document.body.textContent).not.toMatch(/timed out/);
  });
});

/**
 * The drill done properly, in Joshua's own voice.
 *
 * 714 recordings across 109 sections sat in the bucket as the grader's
 * calibration set and never reached a student, and every stimulus of all three
 * live sections has one. The pair is the lesson: one recording is a correction
 * and two is a demonstration.
 *
 * The database will only return them for a section she has already been graded
 * on, so a student cannot listen to a correct recall of a section she has not
 * sat and then "recall" it. That rule lives in RLS; what is asserted here is
 * that the card asks, and offers nothing when the answer is nothing.
 */
describe("would she know what to do tomorrow", () => {
  const withSection = (over: Partial<SectionGrade["section"]>, stimuliOver?: SectionStimulusGrade[]) =>
    ({ ...grade, section: { ...grade.section, ...over }, stimuli: stimuliOver ?? grade.stimuli }) as SectionGrade;

  it("gives one sentence when the run says something clearly", () => {
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={withSection({ no_read_count: 3, read_given_count: 1, read_matched_count: 1 })}
      />,
    );
    expect(screen.getByText(/no Read at all on 3 of them/i)).toBeInTheDocument();
  });

  it("gives none at all when nothing is strong enough, rather than an encouragement", () => {
    // A card that always says something is a card whose advice she skips.
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ reciting_count: 0 })} />);
    expect(document.body.textContent).not.toMatch(/no Read at all/i);
    expect(document.body.textContent).not.toMatch(/Say one thing you think/i);
  });

  it("never gives two", () => {
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={withSection({ no_read_count: 4, reciting_count: 4, uncoloured_count: 4 })}
      />,
    );
    expect(screen.getByText(/no Read at all on 4 of them/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Cover the text and put it in your own words/i);
  });
});

describe("the clock, when she went over", () => {
  const withSection = (over: Partial<SectionGrade["section"]>) =>
    ({ ...grade, section: { ...grade.section, ...over } }) as SectionGrade;

  it("says something about a run over the goal, which used to get nothing", () => {
    // The case most in need of a word rendered as plain uncoloured text.
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={withSection({ within_time: false, within_goal: false, total_seconds: 2772 })}
      />,
    );
    expect(screen.getByText("46:12")).toBeInTheDocument();
    expect(screen.getByText("against a 25 minute goal")).toBeInTheDocument();
    expect(screen.getByText(/early runs are meant to be/i)).toBeInTheDocument();
  });

  it("leaves the inside-the-time qualifier exactly as it was", () => {
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={withSection({ within_time: true, within_goal: false })}
      />,
    );
    expect(screen.getByText(/Inside the time, but the goal only counts/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/early runs are meant to be/i);
  });

  it("says nothing about the clock on a run that made the goal", () => {
    render(<SectionReportCard loadModelRuns={noModelRuns} grade={withSection({ within_goal: true })} />);
    expect(document.body.textContent).not.toMatch(/early runs are meant to be/i);
  });
});

describe("a verdict that rests on a mis-hearing", () => {
  it("says what the marking was done from, wherever the words are shown", () => {
    // The v1 spec named transcription error as the top risk and showing her the
    // transcript as the mitigation. Nothing said what the transcript was FOR,
    // so a dropped prefix read as a verdict about her.
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={{ ...grade, stimuli: [stimulus({ spoken: "clearly moral characters" })] } as SectionGrade}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Stimulus 1/i }));
    expect(screen.getByText(/If they are not what you said, the marking is wrong, not you/i)).toBeInTheDocument();
  });

  it("does not say it where there are no words to doubt", () => {
    // The block still opens -- there is a Clip to play -- so this is tied to
    // there being a transcript rather than to the section being on screen.
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={{
          ...grade,
          section: { ...grade.section, audio_bucket: "drill-recordings", audio_path: "s1/a1.webm" },
          stimuli: [stimulus({ spoken: "", window_ms: { start: 0, end: 1000 } })],
        } as SectionGrade}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Stimulus 1/i }));
    expect(screen.getByText(/Nothing was picked up here/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/the marking is wrong, not you/i);
  });

  /*
   * The sentence shipped on 2026-09-04 and the control did not, because where a
   * dispute lands was Joshua's call and he had not made it. He chose its own
   * table on 2026-09-04, so the other half of W7 is here.
   */
  it("gives her a way to say so, against the stimulus she is looking at", async () => {
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={{ ...grade, stimuli: [stimulus({ spoken: "clearly moral characters" })] } as SectionGrade}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Stimulus 1/i }));

    const control = screen.getByRole("button", { name: /This is not what I said/i });
    fireEvent.click(control);

    expect(raised).toHaveLength(1);
    expect(raised[0].stimulusSlug).toBe("PT105_S2_Q1");
    expect(raised[0].attemptNo).toBe(grade.attempt_no);
    expect(await screen.findByText(/Noted\. Joshua will see this/i)).toBeInTheDocument();
  });

  it("does not tell her it was noted when it was not stored", async () => {
    // The table arrives with its own migration. Reporting success against a
    // database that has not had it applied would be a lie told on the one
    // screen whose subject is the app getting her wrong.
    disputeResult = { ok: false, reason: "not-configured" };
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={{ ...grade, stimuli: [stimulus({ spoken: "clearly moral characters" })] } as SectionGrade}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Stimulus 1/i }));
    fireEvent.click(screen.getByRole("button", { name: /This is not what I said/i }));

    expect(await screen.findByText(/That did not save/i)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/Noted\./i);
  });

  it("offers nothing to dispute where there are no words", () => {
    render(
      <SectionReportCard
        loadModelRuns={noModelRuns}
        grade={{
          ...grade,
          section: { ...grade.section, audio_bucket: "drill-recordings", audio_path: "s1/a1.webm" },
          stimuli: [stimulus({ spoken: "", window_ms: { start: 0, end: 1000 } })],
        } as SectionGrade}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Stimulus 1/i }));
    expect(screen.queryByRole("button", { name: /This is not what I said/i })).toBeNull();
  });
});

describe("hearing it done right", () => {
  const WALKTHROUGH =
    "> The allowable blood alcohol level should be cut in half.\n\n" +
    "So he wants the limit halved, and the reason is social drinkers.";
  const model = () =>
    Promise.resolve({
      PT105_S2_Q1: {
        walkthrough: WALKTHROUGH,
        audio: { bucket: "model-runs", path: "PT105_S2_Q1.mp3" },
      },
    });
  /** The nine authored references: written, and never recorded. */
  const writtenOnly = () =>
    Promise.resolve({ PT105_S2_Q1: { walkthrough: WALKTHROUGH, audio: null } });

  it("offers the model run beside her own recording", async () => {
    render(
      <SectionReportCard
        grade={{
          ...grade,
          section: { ...grade.section, audio_bucket: "drill-recordings", audio_path: "s1/a1.webm" },
          stimuli: [stimulus({ spoken: "x", recall_window_ms: { start: 0, end: 1000 } })],
        }}
        loadModelRuns={model}
      />,
    );
    fireEvent.click(tick(1));
    expect(await screen.findByRole("button", { name: /hear it done right/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /hear it back/i })).toBeInTheDocument();
  });

  it("offers nothing when the section has no model run she can reach", async () => {
    render(
      <SectionReportCard
        grade={{ ...grade, stimuli: [stimulus({ spoken: "x" })] }}
        loadModelRuns={noModelRuns}
      />,
    );
    fireEvent.click(tick(1));
    // Waited for, so the empty answer has landed before the absence is asserted.
    expect(await screen.findByText("What you said")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hear it done right/i })).not.toBeInTheDocument();
  });

  it("still offers the model run when her own recording never arrived", async () => {
    // A failed upload costs her the Clip of herself. It must not also cost her
    // the one recording that was never hers to lose.
    render(
      <SectionReportCard
        grade={{
          ...grade,
          section: { ...grade.section, audio_path: null },
          stimuli: [stimulus({ spoken: "" })],
        }}
        loadModelRuns={model}
      />,
    );
    fireEvent.click(tick(1));
    expect(await screen.findByRole("button", { name: /hear it done right/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hear it back/i })).not.toBeInTheDocument();
  });

  /*
   * Written first, and this is the half that matters most.
   *
   * The recording was the deliverable for exactly as long as it took to watch
   * somebody try to learn from one. She cannot skim it, search it, or sit with
   * one line while she works out where her own recall lost a quantifier. The
   * walkthrough is open on the card by default and the recording is the option.
   */
  it("shows the walkthrough without being asked, under her own words", async () => {
    render(
      <SectionReportCard
        grade={{ ...grade, stimuli: [stimulus({ spoken: "x" })] }}
        loadModelRuns={model}
      />,
    );
    fireEvent.click(tick(1));
    expect(
      await screen.findByText(/So he wants the limit halved/),
    ).toBeInTheDocument();
    // The verbatim read is rendered as its own line, with the marker stripped.
    expect(
      screen.getByText("The allowable blood alcohol level should be cut in half."),
    ).toBeInTheDocument();
  });

  it("still teaches when the stimulus was never recorded", async () => {
    // Nine of the built stimuli have no recording and never will. Under the old
    // shape the card dropped any run without audio, so those nine could offer
    // her nothing at all.
    render(
      <SectionReportCard
        grade={{ ...grade, stimuli: [stimulus({ spoken: "x" })] }}
        loadModelRuns={writtenOnly}
      />,
    );
    fireEvent.click(tick(1));
    expect(await screen.findByText(/So he wants the limit halved/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /hear it done right/i })).not.toBeInTheDocument();
  });
});

/*
 * The row that tells her what to change, and the standard beside her words.
 *
 * Every number on the card was a description. These are the three things a
 * student can act on: what to do next time, what the Read should have named,
 * and what the standard says for the very line she was rephrasing.
 */
describe("what to do next time", () => {
  it("shows the judge's advice on a stimulus with something to fix", () => {
    render(
      <SectionReportCard
        grade={{ ...grade, stimuli: [stimulus({ nextTime: "Say the quantifier out loud: all, not some." })] }}
        loadModelRuns={noModelRuns}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.getByText("Next time")).toBeInTheDocument();
    expect(screen.getByText("Say the quantifier out loud: all, not some.")).toBeInTheDocument();
  });

  it("says every cylinder when there is nothing to fix, and gives no advice", () => {
    render(
      <SectionReportCard
        grade={{
          ...grade,
          stimuli: [
            stimulus({
              percent: 100,
              carried: 12,
              total: 12,
              missed: [],
              readGiven: true,
              readMatches: true,
              nextTime: "",
            }),
          ],
        }}
        loadModelRuns={noModelRuns}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.getByText(/Every cylinder on this one/)).toBeInTheDocument();
    expect(screen.queryByText("Next time")).toBeNull();
  });

  it("does not call a recital every cylinder, whatever it carried", () => {
    render(
      <SectionReportCard
        grade={{
          ...grade,
          stimuli: [
            stimulus({ percent: 100, missed: [], readGiven: true, readMatches: true, reciting: true, nextTime: "" }),
          ],
        }}
        loadModelRuns={noModelRuns}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.queryByText(/Every cylinder/)).toBeNull();
  });

  it("stays quiet on a grade written before advice existed", () => {
    render(<SectionReportCard grade={grade} loadModelRuns={noModelRuns} />);
    fireEvent.click(tick(1));
    expect(screen.queryByText("Next time")).toBeNull();
    expect(screen.queryByText(/Every cylinder/)).toBeNull();
  });
});

describe("the standard beside her words", () => {
  it("names the Read the key turns on, and the judge's reason", () => {
    render(
      <SectionReportCard
        grade={{
          ...grade,
          stimuli: [
            stimulus({
              readGiven: true,
              readMatches: false,
              readReason: "She named the flaw as sampling rather than causation.",
              the_read: "What if sugar creates an inhospitable environment for bacteria?",
            }),
          ],
        }}
        loadModelRuns={noModelRuns}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.getByText(/The Read this one turns on: What if sugar/)).toBeInTheDocument();
    expect(screen.getByText("She named the flaw as sampling rather than causation.")).toBeInTheDocument();
  });

  it("shows the passage, folded, when the grade carries it", () => {
    render(
      <SectionReportCard
        grade={{ ...grade, stimuli: [stimulus({ stimulus_text: "It is difficult to keep deep wounds free of bacteria." })] }}
        loadModelRuns={noModelRuns}
      />,
    );
    fireEvent.click(tick(1));
    expect(screen.getByText("The passage")).toBeInTheDocument();
    expect(screen.getByText("It is difficult to keep deep wounds free of bacteria.")).toBeInTheDocument();
  });

  it("puts the standard's recall of a line under her own line, and shows what she held", async () => {
    const md =
      "> It is difficult to keep deep wounds free of bacteria.\n\nSo deep wounds are hard to keep clean.\n\n" +
      "> Even strong antibiotics fail.\n\nEven the strong drugs do not manage it.";
    render(
      <SectionReportCard
        grade={{
          ...grade,
          stimuli: [
            stimulus({
              spoken: "x",
              lines: [
                {
                  n: 1,
                  text: "It is difficult to keep deep wounds free of bacteria.",
                  spoken: "deep wounds are hard to keep clean",
                  verdict: "strong",
                  note: "",
                  carried: ["The wounds are deep."],
                  dropped: [],
                },
                {
                  n: 2,
                  text: "Even strong antibiotics fail.",
                  spoken: "antibiotics struggle",
                  verdict: "partial",
                  note: "Dropped that even the strong ones fail.",
                  carried: [],
                  dropped: ["Even the strong ones fail."],
                },
              ],
            }),
          ],
        }}
        loadModelRuns={() => Promise.resolve({ PT105_S2_Q1: { walkthrough: md, audio: null } })}
      />,
    );
    fireEvent.click(tick(1));
    expect(await screen.findByText(/So deep wounds are hard to keep clean/)).toBeInTheDocument();
    expect(screen.getByText(/Even the strong drugs do not manage it/)).toBeInTheDocument();
    expect(screen.getByText("The wounds are deep.")).toBeInTheDocument();
    // Paired under the lines, so the whole-run block is not repeated beneath.
    expect(screen.queryByText("Done right", { selector: "p" })).toBeNull();
  });
});
