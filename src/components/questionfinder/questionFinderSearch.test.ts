import { describe, expect, it } from "vitest";
import {
  formatQuestionAddress,
  lrHitHref,
  parseQuestionAddress,
  rcHitHref,
  runFinderSearch,
  type FinderLrSource,
  type FinderRcPassageSource,
  type FinderRcQuestionSource,
} from "@/components/questionfinder/questionFinderSearch";
import { parseDrillLaunch, type DrillLaunch } from "@/lib/drillLaunch";
import { drillRunSpecFromLaunch } from "@/lib/drillRunSpec";

const lr: FinderLrSource[] = [
  {
    qid: "PT90-S1-Q12",
    pt: 90,
    section: 1,
    qnum: 12,
    qtype: "Flaw",
    stimulus: "The ecologist's reasoning is vulnerable to criticism because it ignores the possibility of drought.",
    questionStem: "Which one of the following describes a flaw in the reasoning?",
  },
  {
    qid: "PT90-S1-Q13",
    pt: 90,
    section: 1,
    qnum: 13,
    qtype: "Strengthen",
    stimulus: "Sales of the new fertilizer rose sharply after the drought ended.",
    questionStem: "Which one of the following most strengthens the argument?",
  },
  {
    qid: "PT84-S3-Q7",
    pt: 84,
    section: 3,
    qnum: 7,
    qtype: "Flaw",
    stimulus: "The council commits a flaw in the reasoning by treating a necessary condition as sufficient.",
    questionStem: "The argument is most vulnerable to criticism on which ground?",
  },
];

const rcPassages: FinderRcPassageSource[] = [
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
  {
    passageId: 4022,
    preptest: 88,
    section: 3,
    setNumber: 3,
    title: null,
    topic: "Science",
    questionCount: 6,
    firstWords: "Drought conditions in the basin have been recorded since 1890.",
  },
];

const rcQuestions: FinderRcQuestionSource[] = [
  { questionId: 501, passageId: 4021, preptest: 88, section: 3, qnum: 1, position: 1, prompt: "The passage suggests the artist's reasoning was..." },
  { questionId: 502, passageId: 4021, preptest: 88, section: 3, qnum: 2, position: 2, prompt: "Which one of the following best describes the reasoning?" },
  { questionId: 503, passageId: 4021, preptest: 88, section: 3, qnum: 3, position: 3, prompt: "The author mentions the stretcher frame primarily to..." },
  { questionId: 508, passageId: 4022, preptest: 88, section: 3, qnum: 8, position: 1, prompt: "According to the passage, the drought was caused by..." },
];

const search = (query: string, limit?: number) =>
  runFinderSearch({ query, lr, rcPassages, rcQuestions, limit });

describe("parseQuestionAddress", () => {
  it.each([
    ["PT90 S1 Q12", { pt: 90, section: 1, qnum: 12 }],
    ["pt 90 section 1 question 12", { pt: 90, section: 1, qnum: 12 }],
    ["Practice Test 90 section number 1 question number 12", { pt: 90, section: 1, qnum: 12 }],
    ["Practice Test 90, section 1, question 12", { pt: 90, section: 1, qnum: 12 }],
    ["PT90 Q12", { pt: 90, qnum: 12 }],
    ["PT90-S1-Q12", { pt: 90, section: 1, qnum: 12 }],
    ["90.1.12", { pt: 90, section: 1, qnum: 12 }],
    ["90-1-12", { pt: 90, section: 1, qnum: 12 }],
    ["PT90 S1", { pt: 90, section: 1 }],
    ["PT90", { pt: 90 }],
    ["90", { pt: 90 }],
  ])("reads %s as an address", (input, expected) => {
    expect(parseQuestionAddress(input)).toEqual(expected);
  });

  it.each([
    "flaw in the reasoning",
    "drought",
    // Three loose numbers are far more likely a phrase than an address.
    "90 1 12",
    "",
  ])("treats %o as free text, not an address", (input) => {
    expect(parseQuestionAddress(input)).toBeNull();
  });

  it("formats an address the way the finder shows it back", () => {
    expect(formatQuestionAddress({ pt: 90, section: 1, qnum: 12 })).toBe("PT 90 · S1 · Q12");
    expect(formatQuestionAddress({ pt: 90 })).toBe("PT 90");
  });
});

describe("runFinderSearch — free text", () => {
  it("returns hits from both banks, grouped and never interleaved", () => {
    const results = search("reasoning");
    expect(results.lr.every((hit) => hit.bank === "lr")).toBe(true);
    expect(results.rc.every((hit) => hit.bank === "rc")).toBe(true);
    expect(results.lr.length).toBeGreaterThan(0);
    expect(results.rc.length).toBeGreaterThan(0);
  });

  it("returns each matching RC question with its official section number", () => {
    const results = search("reasoning");
    const passage = results.rc.filter((hit) => hit.passageId === 4021);
    expect(passage).toHaveLength(2);
    expect(passage.map((hit) => hit.qnum)).toEqual([1, 2]);
    expect(passage[0].questionCount).toBe(7);
  });

  it("matches a passage on its own title or opening line", () => {
    const results = search("stretcher frame");
    expect(results.rc.map((hit) => hit.passageId)).toEqual([4021]);
    expect(results.rc[0].matchedCount).toBe(1);
  });

  it("carries a snippet with the matched span marked", () => {
    const results = search("flaw in the reasoning");
    const hit = results.lr.find((h) => h.qid === "PT84-S3-Q7");
    expect(hit?.snippet?.match).toBe("flaw in the reasoning");
    expect(hit?.snippet?.before).toContain("commits a");
  });

  it("matches remembered words even when their order is not exact", () => {
    const results = search("drought fertilizer sales");
    expect(results.lr.map((hit) => hit.qid)).toContain("PT90-S1-Q13");
  });

  it("limits each bank independently rather than sharing a budget", () => {
    const results = search("the", 1);
    expect(results.lr).toHaveLength(1);
    expect(results.rc).toHaveLength(1);
  });

  it("finds nothing for a phrase in neither bank", () => {
    const results = search("photosynthesis in mangroves");
    expect(results.lr).toHaveLength(0);
    expect(results.rc).toHaveLength(0);
  });
});

describe("runFinderSearch — addresses", () => {
  it("resolves a full address to one exact LR question", () => {
    const results = search("PT90 S1 Q12");
    expect(results.exact?.qid).toBe("PT90-S1-Q12");
    expect(results.address).toEqual({ pt: 90, section: 1, qnum: 12 });
  });

  it("narrows without resolving when the address is partial", () => {
    const results = search("PT90 S1");
    expect(results.exact).toBeNull();
    expect(results.lr.map((hit) => hit.qid)).toEqual(["PT90-S1-Q12", "PT90-S1-Q13"]);
  });

  it("never searches question text for the address itself", () => {
    // "PT90 S1 Q12" appears in no stimulus; treating it as a phrase would
    // return nothing and make the finder look broken on its own syntax.
    expect(search("PT90 S1 Q12").lr.length).toBeGreaterThan(0);
  });

  it("filters RC by PrepTest and section too", () => {
    const results = search("PT88 S3");
    expect(results.rc.map((hit) => hit.passageId)).toEqual([4021, 4022]);
    expect(results.lr).toHaveLength(0);
  });

  it("resolves an RC PT, section, and question address to one exact question", () => {
    const results = search("PT88 S3 Q2");
    expect(results.rc).toHaveLength(1);
    expect(results.rc[0]).toMatchObject({ questionId: 502, qnum: 2, passageId: 4021 });
  });

  it("returns an unresolved address for a question that does not exist", () => {
    const results = search("PT90 S1 Q99");
    expect(results.address).toEqual({ pt: 90, section: 1, qnum: 99 });
    expect(results.exact).toBeNull();
    expect(results.lr).toHaveLength(0);
  });
});

describe("row content", () => {
  it("carries the stem, so an address hit says which question it is", () => {
    const hit = search("PT90 S1 Q12").exact!;
    expect(hit.snippet).toBeNull();
    expect(hit.stem).toBe("Which one of the following describes a flaw in the reasoning?");
  });
});

describe("landings", () => {
  it("sends an LR hit into a one-question attempt that returns where it came from", () => {
    const hit = search("PT90 S1 Q12").exact!;
    const href = lrHitHref(hit, "/classroom");
    expect(href).toContain("mode=type-drill");
    expect(href).toContain("qids=PT90-S1-Q12");
    expect(href).toContain("present=smart");
    expect(href).toContain("returnTo=%2Fclassroom");
  });

  it("sends an RC question hit to its passage and exact question", () => {
    const hit = search("stretcher frame").rc[0];
    expect(rcHitHref(hit)).toBe("/rc/drill?passage=4021&q=503");
  });
});

/* -------------------------------------------------------------------------
   Contract tests.

   The finder writes a URL; the drill runner reads it. Those are two modules
   that never import each other, so nothing but this file stops one from
   drifting away from the other. The LR href in particular was modelled on an
   implementation deleted in 1d656cf4 — it happens to still be correct, and
   this is what keeps it that way.
   ------------------------------------------------------------------------- */

describe("landing contracts against the runners that consume them", () => {
  it("hands the drill runner exactly the one-question attempt it was told to run", () => {
    const hit = search("PT90 S1 Q12").exact!;
    const url = new URL(lrHitHref(hit, "/classroom"), "http://x");

    const launch = parseDrillLaunch(url.searchParams);
    const state = drillRunSpecFromLaunch(launch as DrillLaunch);

    expect(url.pathname).toBe("/drill");
    expect(state.mode).toBe("type-drill");
    expect((state.config as { selectedQids: string[] }).selectedQids).toEqual(["PT90-S1-Q12"]);
    expect((state.config as { count: number }).count).toBe(1);
    // 'smart' is what makes a hand-picked question look identical to an Auto
    // run — without it the student gets Complete Section chrome on one question.
    expect(state.present).toBe("smart");
    // safeReturnTo rejects anything not starting with a single "/", so a
    // returnTo that silently vanished would strand the student in the runner.
    expect(state.returnTo).toBe("/classroom");
    expect(state.isGuidedDrill).toBe(false);
  });

  it("names the parameter RcPlayer actually boots from", () => {
    const hit = search("stretcher frame").rc[0];
    const url = new URL(rcHitHref(hit), "http://x");

    expect(url.pathname).toBe("/rc/drill");
    expect(url.searchParams.get("passage")).toBe("4021");
    // No subset parameter, deliberately: RcPlayer builds the session from its
    // DEFAULT_CONFIG, which names no question subset, so every question on the
    // passage is asked. That IS the ADR 0008 behaviour, and adding a subset
    // here would quietly revert it.
    expect(url.searchParams.get("q")).toBe("503");
    expect(url.searchParams.get("qids")).toBeNull();
    expect(url.searchParams.get("questions")).toBeNull();
  });
});
