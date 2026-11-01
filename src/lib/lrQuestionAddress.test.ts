import { describe, expect, it } from "vitest";
import { lrAddressLabel, lrQuestionPath, lrSectionFile, parseLrAddress } from "./lrQuestionAddress";

describe("lrQuestionAddress", () => {
  it("reads a plain address", () => {
    expect(parseLrAddress({ pt: "151", section: "4", qnum: "10" })).toEqual({ pt: 151, section: 4, qnum: 10 });
  });

  it("rejects anything that is not a positive whole number", () => {
    for (const bad of ["", "0", "-1", "4.5", "4a", "../4", " 4", "1000"]) {
      expect(parseLrAddress({ pt: "151", section: bad, qnum: "10" })).toBeNull();
    }
    expect(parseLrAddress({ pt: "151", section: "4" })).toBeNull();
  });

  it("builds the route, the section file and the label from one address", () => {
    const address = { pt: 151, section: 4, qnum: 16 };
    expect(lrQuestionPath(address)).toBe("/question/lr/151/4/16");
    expect(lrSectionFile(address)).toBe("/data/PT151-S4-LR.json");
    expect(lrAddressLabel(address)).toBe("PT151 Section 4 Question 16");
  });

  it("round-trips a path it built", () => {
    const address = { pt: 139, section: 2, qnum: 7 };
    const [, , , pt, section, qnum] = lrQuestionPath(address).split("/");
    expect(parseLrAddress({ pt, section, qnum })).toEqual(address);
  });
});
