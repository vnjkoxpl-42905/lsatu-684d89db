import fs from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QuestionBank } from "./questionLoader";

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
