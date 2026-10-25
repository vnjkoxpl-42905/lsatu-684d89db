import { describe, expect, it } from "vitest";
import { reviewReturnTo } from "./ReviewReturnLink";

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
