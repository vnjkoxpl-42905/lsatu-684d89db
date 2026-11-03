import { beforeEach, describe, expect, it } from "vitest";
import type { FinderAddressTest } from "@/components/questionfinder/useFinderAddressIndex";
import {
  landingFor,
  loadRecents,
  questionOptions,
  readQuery,
  readSpokenAddress,
  rememberQuestion,
  sectionOptions,
} from "./questionLookup";

const lr = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const TESTS: FinderAddressTest[] = [
  {
    pt: 151,
    sections: [
      { section: 1, lr: lr(25), rc: [] },
      {
        section: 2,
        lr: [],
        rc: [
          { id: 900, position: 1, title: "Tides", questions: [{ id: 9001, number: 1 }, { id: 9002, number: 2 }] },
          { id: 901, position: 2, title: "Courts", questions: [{ id: 9011, number: 3 }, { id: 9012, number: 4 }] },
        ],
      },
      { section: 4, lr: lr(26), rc: [] },
    ],
  },
];

describe("readSpokenAddress", () => {
  it.each([
    ["PT151 S4 Q10", { pt: 151, section: 4, qText: "10" }],
    ["151.4.10", { pt: 151, section: 4, qText: "10" }],
    ["151 4 10", { pt: 151, section: 4, qText: "10" }],
    ["pt 151 section 4 question 10", { pt: 151, section: 4, qText: "10" }],
    ["PT151S4Q10", { pt: 151, section: 4, qText: "10" }],
    ["pt151 s4", { pt: 151, section: 4 }],
    ["151", { pt: 151 }],
  ])("reads %s", (text, expected) => {
    expect(readSpokenAddress(text)).toEqual(expected);
  });

  it("keeps the address so far while a marker is still dangling", () => {
    expect(readSpokenAddress("pt151 s")).toEqual({ pt: 151 });
    expect(readSpokenAddress("pt151 s4 q")).toEqual({ pt: 151, section: 4 });
  });

  it("reads an RC passage address", () => {
    expect(readSpokenAddress("pt151 s2 p2 q3")).toEqual({ pt: 151, section: 2, pnum: 2, qText: "3" });
  });

  it("leaves words and loose numbers to the phrase search", () => {
    expect(readSpokenAddress("necessary assumption")).toBeNull();
    expect(readSpokenAddress("question 10")).toBeNull();
    expect(readSpokenAddress("")).toBeNull();
  });
});

describe("readQuery", () => {
  it("shows the real sections of a PrepTest, kind and size included", () => {
    const reading = readQuery("151", TESTS, true);
    expect(reading.kind === "address" && sectionOptions(reading.test!)).toEqual([
      { section: 1, kind: "lr", questions: 25 },
      { section: 2, kind: "rc", questions: 4 },
      { section: 4, kind: "lr", questions: 26 },
    ]);
  });

  it("offers only the numbers that still match what was typed", () => {
    const reading = readQuery("pt151 s4 1", TESTS, true);
    if (reading.kind !== "address") throw new Error("expected an address");
    expect(reading.numbers.map((n) => n.qnum)).toEqual([1, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    expect(reading.landing?.route).toBe("/question/lr/151/4/1");
  });

  it("lands an LR address on the question page", () => {
    const reading = readQuery("151 4 10", TESTS, true);
    expect(reading.kind === "address" && reading.landing).toMatchObject({
      kind: "lr",
      route: "/question/lr/151/4/10",
      label: "PT151 · S4 · Q10",
    });
  });

  it("lands an RC address on its passage and question", () => {
    const reading = readQuery("pt151 s2 q3", TESTS, true);
    expect(reading.kind === "address" && reading.landing).toMatchObject({
      kind: "rc",
      route: "/rc/drill?passage=901&q=9011",
    });
  });

  it("narrows an RC section to one passage when it is named", () => {
    const reading = readQuery("pt151 s2 p1", TESTS, true);
    expect(reading.kind === "address" && reading.numbers.map((n) => n.qnum)).toEqual([1, 2]);
  });

  it("says why an address does not resolve", () => {
    const unknownTest = readQuery("pt999 s1 q1", TESTS, true);
    expect(unknownTest.kind === "address" && unknownTest.problem).toMatch(/PrepTest 999/);
    const unknownSection = readQuery("pt151 s3", TESTS, true);
    expect(unknownSection.kind === "address" && unknownSection.problem).toMatch(/no section 3/);
    const unknownQuestion = readQuery("pt151 s4 q99", TESTS, true);
    expect(unknownQuestion.kind === "address" && unknownQuestion.problem).toMatch(/questions 1–26/);
    expect(unknownQuestion.kind === "address" && unknownQuestion.landing).toBeUndefined();
  });

  it("still opens a full LR address before the index has loaded", () => {
    const reading = readQuery("PT151 S4 Q10", [], false);
    expect(reading.kind === "address" && reading.landing?.route).toBe("/question/lr/151/4/10");
    const partial = readQuery("PT151 S4", [], false);
    expect(partial.kind === "address" && partial.landing).toBeUndefined();
  });

  it("treats words as a phrase and one stray character as nothing", () => {
    expect(readQuery("flaw in the reasoning", TESTS, true)).toEqual({ kind: "phrase", phrase: "flaw in the reasoning" });
    expect(readQuery("a", TESTS, true)).toEqual({ kind: "empty" });
    expect(readQuery("   ", TESTS, true)).toEqual({ kind: "empty" });
  });
});

describe("landingFor and questionOptions", () => {
  it("orders RC questions by their number across passages", () => {
    const options = questionOptions(TESTS[0].sections[1]);
    expect(options.map((o) => o.qnum)).toEqual([1, 2, 3, 4]);
    expect(landingFor(151, 2, options[0]).route).toBe("/rc/drill?passage=900&q=9001");
  });
});

describe("recents", () => {
  beforeEach(() => localStorage.clear());

  it("keeps the newest five without repeating a question", () => {
    for (let i = 1; i <= 7; i++) rememberQuestion({ route: `/question/lr/151/4/${i}`, label: `Q${i}` });
    rememberQuestion({ route: "/question/lr/151/4/5", label: "Q5" });
    expect(loadRecents().map((r) => r.label)).toEqual(["Q5", "Q7", "Q6", "Q4", "Q3"]);
  });

  it("survives broken or blocked storage", () => {
    localStorage.setItem("lsatu.teacher.recentQuestions", "{not json");
    expect(loadRecents()).toEqual([]);
  });
});
