import { describe, expect, it } from "vitest";
import { drillRunReturnTo, reviewReturnTo } from "./ReviewReturnLink";

describe("reviewReturnTo", () => {
  it("preserves the review queue filters and visible count", () => {
    expect(reviewReturnTo("?returnTo=%2Freview%2Fto-review%3Freason%3Dflagged%26show%3D60"))
      .toBe("/review/to-review?reason=flagged&show=60");
  });

  it("rejects external and unrelated destinations", () => {
    expect(reviewReturnTo("?returnTo=https%3A%2F%2Fexample.com")).toBeNull();
    expect(reviewReturnTo("?returnTo=%2F%2Fevil.example")).toBeNull();
    expect(reviewReturnTo("?returnTo=%2Fteacher")).toBeNull();
  });
});

describe("drillRunReturnTo", () => {
  it("builds the way back to a drill review from a run id and question number", () => {
    expect(drillRunReturnTo("?fromRun=f97265ab-4dc4&fromQ=3")).toBe("/practice/drills/runs/f97265ab-4dc4?q=3");
    expect(drillRunReturnTo("?fromRun=abc&fromQ=x1")).toBe("/practice/drills/runs/abc");
  });
  it("refuses anything that isn't a plain run id", () => {
    expect(drillRunReturnTo("?fromRun=../../admin")).toBeNull();
    expect(drillRunReturnTo("?fromRun=https://evil.example")).toBeNull();
    expect(drillRunReturnTo("")).toBeNull();
  });
});
