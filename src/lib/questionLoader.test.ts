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
