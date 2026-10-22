import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionBank, inferTypeFromStem } from "./questionLoader";

describe("inferTypeFromStem", () => {
  it("classifies a main conclusion stem", () => {
    expect(
      inferTypeFromStem(
        "Which one of the following most accurately expresses the main conclusion of the argument?",
      ),
    ).toBe("Main Conclusion");
  });

  it("classifies a main point stem", () => {
    expect(
      inferTypeFromStem("Which one of the following is the main point of the passage?"),
    ).toBe("Main Conclusion");
  });

  it("classifies a most strongly supported stem", () => {
    expect(
      inferTypeFromStem(
        "The statements above, if true, most strongly support which one of the following?",
      ),
    ).toBe("Most Strongly Supported");
  });

  it("does not let Strengthen swallow a most-strongly-supported stem", () => {
    expect(inferTypeFromStem("most strongly supported")).not.toBe("Strengthen");
  });

  it("classifies a point at issue stem via the regex (no 'disagree' literal)", () => {
    expect(
      inferTypeFromStem(
        "The point at issue between Aisha and Bruno is whether the policy will succeed.",
      ),
    ).toBe("Agree/Disagree");
  });

  it("still classifies a plain strengthen stem", () => {
    expect(
      inferTypeFromStem("Which one of the following, if true, most strengthens the argument?"),
    ).toBe("Strengthen");
  });
});

describe("QuestionBank shared-passage loading", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reuses the shared stimulus for later questions in the same passage set", async () => {
    const pt118Section3Path = path.resolve(
      process.cwd(),
      "public/data/PT118-S3-LR.json",
    );
    const pt118Section3 = JSON.parse(await fs.readFile(pt118Section3Path, "utf8"));

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === "/data/PT118-S3-LR.json") {
          return {
            ok: true,
            json: async () => pt118Section3,
          } satisfies Pick<Response, "ok" | "json">;
        }

        return {
          ok: false,
          json: async () => {
            throw new Error(`unexpected json() for ${url}`);
          },
        } satisfies Pick<Response, "ok" | "json">;
      }),
    );

    const bank = new QuestionBank();
    await bank.load();

    const questions = bank.getSection(118, 3);
    const question7 = questions.find((question) => question.qnum === 7);
    const question8 = questions.find((question) => question.qnum === 8);

    expect(question7?.stimulus).toBeTruthy();
    expect(question8?.stimulus).toBe(question7?.stimulus);
    expect(question7?.stimulus).not.toMatch(/^The following passage is used/i);
    expect(question7?.stimulus).not.toMatch(/\s7\.$/);
    expect(question7?.stimulus).toContain(
      "them.\n\nFigorian Development Commission:",
    );

    // The mid-argument clause that ends with a colon must NOT be promoted to its
    // own dialogue turn (regression: PT118 S3 Q7-8 rendered three bold speakers).
    expect(question7?.stimulus).not.toMatch(
      /\n\nTo protect wildlife we must regulate such development in Figoria:/,
    );
    expect(question7?.stimulus?.split("\n\n")).toHaveLength(2);
  });
});

describe("QuestionBank removed official positions", () => {
  afterEach(() => vi.restoreAllMocks());

  it("retains a removed position without making it answerable or shifting later qids", async () => {
    const section = JSON.parse(await fs.readFile(
      path.resolve(process.cwd(), "public/data/PT118-S1-LR.json"),
      "utf8",
    ));
    vi.stubGlobal("fetch", vi.fn(async (input: string | URL) => ({
      ok: String(input) === "/data/PT118-S1-LR.json",
      json: async () => section,
    })));

    const bank = new QuestionBank();
    await bank.load();

    expect(bank.getQuestion("PT118-S1-Q5")).toBeUndefined();
    expect(bank.getSection(118, 1)).toHaveLength(25);
    expect(bank.getQuestion("PT118-S1-Q6")?.stimulus).toMatch(/^Maria:/);
    expect(bank.getQuestion("PT118-S1-Q22")?.correctAnswer).toBe("E");
    expect(bank.getManifest().sections.find((s) => s.pt === 118 && s.section === 1))
      .toMatchObject({ count: 25, removedPositions: [5] });
  });
});

describe("QuestionBank text formatting normalization", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("removes PDF hard-wrap newlines from rendered question text", async () => {
    const pt157Section2Path = path.resolve(
      process.cwd(),
      "public/data/PT157-S2-LR.json",
    );
    const pt157Section2 = JSON.parse(await fs.readFile(pt157Section2Path, "utf8"));
    const question11 = pt157Section2.find(
      (question: { questionNumber: number }) => question.questionNumber === 11,
    );
    if (!question11) throw new Error("Missing PT157 S2 Q11 fixture");
    question11.answerChoices.A =
      "Wounds that have simply been cleaned with soap and\n water and not otherwise treated heal faster.";

    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === "/data/PT157-S2-LR.json") {
          return {
            ok: true,
            json: async () => pt157Section2,
          } satisfies Pick<Response, "ok" | "json">;
        }

        return {
          ok: false,
          json: async () => {
            throw new Error(`unexpected json() for ${url}`);
          },
        } satisfies Pick<Response, "ok" | "json">;
      }),
    );

    const bank = new QuestionBank();
    await bank.load();

    const question = bank.getQuestion("PT157-S2-Q11");

    expect(question?.stimulus).toContain("because the break in the skin allows");
    expect(question?.stimulus).toContain("Often bacteria-killing ointment is applied");
    expect(question?.stimulus).not.toMatch(/[^\n]\n[^\n]/);
    expect(question?.questionStem).toBe(
      "Which one of the following, if true, most helps to resolve the apparent discrepancy between the results of the study and the stated facts about wounds, bacteria, infection, and healing?",
    );
    expect(question?.answerChoices.A).toContain("soap and water and not");
    expect(question?.answerChoices.A).not.toMatch(/[^\n]\n[^\n]/);
  });
});

describe("QuestionBank Build a Set filters", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("combines PT, section, and question number for exact lookup", async () => {
    vi.stubGlobal("fetch", buildQuestionBankFetchStub());

    const bank = new QuestionBank();
    await bank.load();

    expect(
      bank.getQuestionsByFilter({
        pts: [120],
        sections: [3],
        questionNumber: 14,
      }).map((question) => question.qid),
    ).toEqual(["PT120-S3-Q14"]);
  });

  it("combines PrepTest, question type, and difficulty", async () => {
    vi.stubGlobal("fetch", buildQuestionBankFetchStub());

    const bank = new QuestionBank();
    await bank.load();

    expect(
      bank.getQuestionsByFilter({
        pts: [120],
        qtypes: ["Flaw"],
        difficulties: [4],
      }).map((question) => question.qid),
    ).toEqual(["PT120-S3-Q14"]);
  });

  it("combines reasoning type, question type, and difficulty", async () => {
    vi.stubGlobal("fetch", buildQuestionBankFetchStub());

    const bank = new QuestionBank();
    await bank.load();

    expect(
      bank.getQuestionsByFilter({
        reasoningTypes: ["Conditional Reasoning"],
        qtypes: ["Necessary Assumption"],
        difficulties: [3],
      }).map((question) => question.qid),
    ).toEqual(["PT121-S1-Q7"]);
  });

  it("filters question features using questionFeatures metadata", async () => {
    vi.stubGlobal("fetch", buildQuestionBankFetchStub());

    const bank = new QuestionBank();
    await bank.load();

    expect(
      bank.getQuestionsByFilter({
        questionFeatures: ["Conditional Diagramming"],
      }).map((question) => question.qid),
    ).toEqual(["PT120-S3-Q14", "PT121-S1-Q7"]);
  });

  it("filters search query across question text and metadata", async () => {
    vi.stubGlobal("fetch", buildQuestionBankFetchStub());

    const bank = new QuestionBank();
    await bank.load();

    expect(
      bank.getQuestionsByFilter({
        searchQuery: "city council",
      }).map((question) => question.qid),
    ).toEqual(["PT120-S3-Q14"]);
  });
});

function buildQuestionBankFetchStub() {
  const section120 = [
    {
      questionNumber: 14,
      questionType: "Flaw",
      reasoningType: ["Conditional Reasoning"],
      questionFeatures: ["Conditional Diagramming", "Mistaken Reversal"],
      questionDifficulty: 4,
      stimulus: "If the city council approves the plan, the park will expand.",
      questionStem: "The argument is most vulnerable to criticism on which one of the following grounds?",
      answerChoices: {
        A: "It mistakes a sufficient condition for a necessary one.",
        B: "It overlooks a possible compromise.",
        C: "It cites a survey without a sample size.",
        D: "It treats correlation as causation.",
        E: "It assumes public support is unanimous.",
      },
      correctAnswer: "A",
    },
    {
      questionNumber: 15,
      questionType: "Strengthen",
      reasoningType: ["Causation"],
      questionFeatures: ["Alternative Cause"],
      questionDifficulty: 4,
      stimulus: "The new lights were installed before accidents declined.",
      questionStem: "Which one of the following most strengthens the argument?",
      answerChoices: {
        A: "Nearby streets did not receive new lights.",
        B: "The lights are inexpensive.",
        C: "Drivers prefer brighter roads.",
        D: "The city delayed other work.",
        E: "Accidents are rare.",
      },
      correctAnswer: "A",
    },
  ];
  const section121 = [
    {
      questionNumber: 7,
      questionType: "Necessary Assumption",
      reasoningType: ["Conditional Reasoning"],
      questionFeatures: ["Conditional Diagramming"],
      questionDifficulty: 3,
      stimulus: "Only certified inspectors can approve the building.",
      questionStem: "Which one of the following is an assumption required by the argument?",
      answerChoices: {
        A: "The inspector who approved it was certified.",
        B: "The building is old.",
        C: "Certification is difficult.",
        D: "Most inspectors are careful.",
        E: "Approval takes several days.",
      },
      correctAnswer: "A",
    },
  ];

  return vi.fn(async (input: string | URL) => {
    const url = String(input);
    if (url === "/data/PT120-S3-LR.json") {
      return {
        ok: true,
        json: async () => section120,
      } satisfies Pick<Response, "ok" | "json">;
    }
    if (url === "/data/PT121-S1-LR.json") {
      return {
        ok: true,
        json: async () => section121,
      } satisfies Pick<Response, "ok" | "json">;
    }

    return {
      ok: false,
      json: async () => {
        throw new Error(`unexpected json() for ${url}`);
      },
    } satisfies Pick<Response, "ok" | "json">;
  });
}
