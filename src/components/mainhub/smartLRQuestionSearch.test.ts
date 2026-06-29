import { describe, expect, it } from "vitest";
import {
  buildSmartLRSearchSnippet,
  filterSmartLRQuestionMatches,
  getSmartLRQuestionSearchText,
  type SmartLRSearchQuestion,
} from "@/components/mainhub/smartLRQuestionSearch";

const questions: SmartLRSearchQuestion[] = [
  {
    qid: "PT151-S2-Q8",
    pt: 151,
    section: 2,
    qnum: 8,
    qtype: "Strengthen",
    difficulty: 3,
    stimulus:
      "Recent ads for Ebsen's campaign were sent to too few households to influence popular opinion.",
    questionStem: "Which one of the following most strengthens the argument?",
  },
  {
    qid: "PT151-S3-Q8",
    pt: 151,
    section: 3,
    qnum: 8,
    qtype: "Main Conclusion",
    difficulty: 2,
    stimulus: "The museum board published new attendance figures.",
    questionStem: "The main conclusion of the argument is that attendance has stabilized.",
  },
  {
    qid: "PT152-S2-Q9",
    pt: 152,
    section: 2,
    qnum: 9,
    qtype: "Flaw",
    difficulty: 5,
    stimulus: "A restaurant's weekday revenue increased after the schedule changed.",
    questionStem: "The reasoning in the argument is most vulnerable to criticism because it...",
  },
];

describe("smart LR question search", () => {
  it("searches qid, stimulus, and stem text", () => {
    expect(getSmartLRQuestionSearchText(questions[0])).toContain("PT151-S2-Q8");

    const byStimulus = filterSmartLRQuestionMatches(questions, "ebsen");
    expect(byStimulus.map((match) => match.question.qid)).toEqual(["PT151-S2-Q8"]);
    expect(byStimulus[0].snippet.match).toBe("Ebsen");
    expect(byStimulus[0].snippet.before).toContain("Recent ads for ");
    expect(byStimulus[0].snippet.before).not.toContain("PT151-S2-Q8");

    const byStem = filterSmartLRQuestionMatches(questions, "main conclusion");
    expect(byStem.map((match) => match.question.qid)).toEqual(["PT151-S3-Q8"]);

    const byQid = filterSmartLRQuestionMatches(questions, "pt152-s2-q9");
    expect(byQid.map((match) => match.question.qid)).toEqual(["PT152-S2-Q9"]);
  });

  it("combines text search with selector filters", () => {
    const matches = filterSmartLRQuestionMatches(questions, "q8", {
      pt: 151,
      section: 2,
    });

    expect(matches.map((match) => match.question.qid)).toEqual(["PT151-S2-Q8"]);
  });

  it("filters by difficulty and question type", () => {
    const matches = filterSmartLRQuestionMatches(questions, "", {
      difficulties: [5],
      qtypes: ["Flaw"],
    });

    expect(matches.map((match) => match.question.qid)).toEqual(["PT152-S2-Q9"]);
    expect(matches[0].snippet).toEqual({
      before: "",
      match: "PT152-S2-Q9",
      after: "",
    });
  });

  it("combines PT, section, and text filters", () => {
    const matches = filterSmartLRQuestionMatches(questions, "attendance", {
      pts: [151],
      sections: [3],
    });

    expect(matches.map((match) => match.question.qid)).toEqual(["PT151-S3-Q8"]);
  });

  it("returns no matches for incompatible filters", () => {
    const matches = filterSmartLRQuestionMatches(questions, "attendance", {
      difficulties: [5],
    });

    expect(matches).toEqual([]);
  });

  it("returns a compact highlighted snippet around the first match", () => {
    const snippet = buildSmartLRSearchSnippet(
      "One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen",
      "twelve",
    );

    expect(snippet).not.toBeNull();
    expect(snippet?.match).toBe("twelve");
    expect(`${snippet?.before}${snippet?.match}${snippet?.after}`).toContain("twelve");
  });

  it("keeps qid-only matches compact", () => {
    const byQid = filterSmartLRQuestionMatches(questions, "pt152-s2-q9");

    expect(byQid[0].snippet).toEqual({
      before: "",
      match: "PT152-S2-Q9",
      after: "",
    });
  });
});
